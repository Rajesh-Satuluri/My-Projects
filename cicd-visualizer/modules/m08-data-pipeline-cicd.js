import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { setupCanvas, palette, loop, drawRoundRect, drawArrow, drawText, easeOut, clamp, lerp } from '../components/canvas-primitives.js';

export function mount(canvas, { markDone }) {
  const shell = createModuleShell({
    tag: 'Module 08 · Package & Promote',
    title: 'Data Pipeline CI/CD',
    subtitle: 'Priya adds fraud_score FLOAT to the order schema. Three gating tests must pass before merge.',
    tabs: [
      { id: 'anim', label: '▶ Animation' },
      { id: 'concept', label: '📖 Concept' },
      { id: 'iq', label: '🎯 Interview Q&A' },
    ],
  });

  const wrap = document.createElement('div');
  wrap.className = 'canvas-wrap';
  const cvs = document.createElement('canvas');
  cvs.className = 'stage-canvas';
  wrap.appendChild(cvs);

  const ctrl = document.createElement('div');
  ctrl.className = 'canvas-controls';
  const replayBtn = document.createElement('button');
  replayBtn.className = 'btn'; replayBtn.textContent = '↺ Replay';
  ctrl.appendChild(replayBtn);
  const cap = document.createElement('p');
  cap.className = 'caption';
  cap.textContent = 'Left: schema diff reveals new fields. Right: 3 automated data tests run sequentially.';
  wrap.appendChild(ctrl); wrap.appendChild(cap);

  const animPanel = shell.querySelector('[data-panel="anim"]');
  animPanel.appendChild(wrap);

  const CHECKS = [
    { label: 'dbt schema test',    detail: 'types, not-null, unique',         color: '#F59E0B', t: 0.18 },
    { label: 'Great Expectations', detail: 'value ranges, completeness',       color: '#3B82F6', t: 0.44 },
    { label: 'Backward compat',    detail: 'old readers still parse schema',   color: '#8B5CF6', t: 0.70 },
  ];

  const DIFF_LINES = [
    { text: '  order_id    VARCHAR',     type: 'ctx' },
    { text: '  customer_id VARCHAR',     type: 'ctx' },
    { text: '  amount      DECIMAL',     type: 'ctx' },
    { text: '+ fraud_score FLOAT',       type: 'add' },
    { text: '+ fraud_label STRING',      type: 'add' },
    { text: '  created_at  TIMESTAMP',   type: 'ctx' },
  ];

  function runAnim() {
    const { ctx, w, h } = setupCanvas(cvs, 310);
    let prog = 0, done = false;
    const stop = loop((dt) => {
      if (done) return;
      prog = Math.min(1, prog + dt / 6000);

      const p = palette();
      ctx.clearRect(0, 0, w, h);

      const diffX = 16, diffW = Math.min(220, w * 0.42);
      const checksX = diffX + diffW + 16;
      const checksW = w - checksX - 12;
      const topY = 36;

      // ── Schema diff panel ──
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      drawRoundRect(ctx, diffX, topY, diffW, h - topY - 20, 8);
      ctx.fill();

      ctx.fillStyle = p.muted;
      ctx.font = '600 11px monospace';
      ctx.fillText('Schema diff: orders.sql', diffX + 10, topY - 6);

      const lineReveal = clamp(prog / 0.35, 0, 1);
      const visLines = Math.round(lineReveal * DIFF_LINES.length);
      const lineH = 22;

      DIFF_LINES.slice(0, visLines).forEach((dl, i) => {
        const ly = topY + 18 + i * lineH;
        if (dl.type === 'add') {
          ctx.fillStyle = '#10B98128';
          ctx.fillRect(diffX + 4, ly - 14, diffW - 8, lineH);
          ctx.fillStyle = '#10B981';
        } else {
          ctx.fillStyle = p.muted;
        }
        ctx.font = '600 11px monospace';
        ctx.fillText(dl.text, diffX + 10, ly);
      });

      // ── Checks panel header ──
      ctx.fillStyle = p.muted;
      ctx.font = '600 11px sans-serif';
      ctx.fillText('Data quality gates', checksX, topY - 6);

      // Arrow from diff to checks
      if (prog > 0.10) {
        const checksStartY = topY + 20;
        drawArrow(ctx, checksX - 10, checksStartY + 30, checksX - 2, checksStartY + 30, '#10B981', 2);
      }

      // Draw each check
      const checkH = 56;
      CHECKS.forEach((chk, i) => {
        const cy = topY + 10 + i * (checkH + 8);
        const appeared = prog >= chk.t;
        const runProg = appeared ? clamp((prog - chk.t) / 0.18, 0, 1) : 0;
        const isDone = runProg >= 1;

        ctx.fillStyle = appeared ? chk.color + '18' : p.bg + '40';
        drawRoundRect(ctx, checksX, cy, checksW, checkH, 7);
        ctx.fill();
        ctx.strokeStyle = appeared ? chk.color : p.muted;
        ctx.lineWidth = isDone ? 2 : 1;
        drawRoundRect(ctx, checksX, cy, checksW, checkH, 7);
        ctx.stroke();

        // Running bar
        if (appeared && !isDone) {
          ctx.fillStyle = chk.color + '30';
          drawRoundRect(ctx, checksX, cy, checksW * runProg, checkH, 7);
          ctx.fill();
        }

        ctx.fillStyle = appeared ? chk.color : p.muted;
        ctx.font = '600 11px sans-serif';
        ctx.fillText((isDone ? '✅ ' : (appeared ? '⏳ ' : '⬜ ')) + chk.label, checksX + 10, cy + 20);
        ctx.fillStyle = p.muted;
        ctx.font = '10px sans-serif';
        ctx.fillText(chk.detail, checksX + 10, cy + 38);
      });

      // Final badge
      if (prog > 0.90) {
        const fa = easeOut(clamp((prog - 0.90) / 0.08, 0, 1));
        ctx.globalAlpha = fa;
        ctx.fillStyle = '#10B98130';
        drawRoundRect(ctx, diffX, h - 36, w - diffX * 2, 26, 6);
        ctx.fill();
        ctx.fillStyle = '#10B981';
        ctx.font = '700 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✅ Schema migration approved — merge unblocked', w / 2, h - 18);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      }

      if (prog >= 1 && !done) { done = true; markDone(); }
    });
    replayBtn.onclick = () => { prog = 0; done = false; };
    return stop;
  }

  let stopAnim = null;
  initTabs(shell, (id) => {
    if (id === 'anim') { if (!stopAnim) stopAnim = runAnim(); }
    else if (stopAnim) { stopAnim(); stopAnim = null; }
  });
  stopAnim = runAnim();

  const conceptPanel = shell.querySelector('[data-panel="concept"]');
  conceptPanel.innerHTML = `
    <div class="prose">
      <h3>Why data pipelines need their own CI/CD</h3>
      <p>Priya's ML model outputs <code>fraud_score</code> and <code>fraud_label</code>. Downstream
      consumers — risk dashboards, Kinesis consumers, Redshift queries — all depend on the schema of
      the orders table. A schema change without testing breaks them silently.</p>
      <h3>Three gates for schema changes</h3>
      <p><strong>dbt schema tests</strong> assert column types, not-null constraints, and uniqueness on
      the new fields. They run against a seeded test database in CI.</p>
      <p><strong>Great Expectations</strong> validates value ranges (fraud_score ∈ [0,1]), completeness
      (< 0.1% nulls), and distribution shape against a reference profile.</p>
      <p><strong>Backward compatibility</strong> checks that old Avro/Protobuf readers can still
      deserialise the new schema without errors — critical for Kinesis streams that may run older
      consumer versions.</p>
      <h3>Dead-letter queues</h3>
      <p>If a record fails to parse after a schema deploy, the Kinesis consumer routes it to a DLQ
      (Dead-Letter Queue) rather than crashing. The pipeline alerts the team; no orders are lost.</p>
    </div>`;

  const iqPanel = shell.querySelector('[data-panel="iq"]');
  const iq = createIQSection([
    { q: 'What is a schema migration and why is it risky?', a: 'A schema migration alters the structure of a table or message format. It\'s risky because downstream consumers may not handle the new shape — causing silent data corruption, pipeline crashes, or dropped records.' },
    { q: 'What does dbt test do in CI?', a: 'dbt test runs declarative SQL tests against your warehouse: schema tests (not_null, unique, accepted_values) and custom data tests. In CI it runs against a seeded development schema so failures are caught before production.' },
    { q: 'What is Great Expectations?', a: 'An open-source data validation framework. You define expectations (e.g. fraud_score must be between 0 and 1, completeness > 99%) as code. CI runs them against sample data to catch range violations or unexpected nulls.' },
    { q: 'What is a dead-letter queue?', a: 'A holding queue for messages that failed to process — parsing errors, schema mismatches, downstream timeouts. Instead of crashing the consumer or losing data, bad records are routed there for manual inspection or reprocessing.' },
    { q: 'How do you test backward compatibility for a streaming schema?', a: 'Use a schema registry (e.g. Confluent Schema Registry or AWS Glue Schema Registry) with BACKWARD compatibility mode. It rejects schemas where old readers can\'t deserialise new records, blocking the merge.' },
  ]);
  iqPanel.appendChild(iq);
  initIQ(shell);

  canvas.replaceWith(shell);
  return () => { if (stopAnim) stopAnim(); };
}
