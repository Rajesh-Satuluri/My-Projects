import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { setupCanvas, palette, loop, drawRoundRect, easeOut, clamp, lerp } from '../components/canvas-primitives.js';

export function mount(canvas, { markDone }) {
  const shell = createModuleShell({
    tag: 'Module 10 · Ship & Operate',
    title: 'Observability & Alerts',
    subtitle: 'Error rate spikes → alert fires → auto-rollback → rate recovers. Three pillars: Logs, Metrics, Traces.',
    tabs: [
      { id: 'anim',    label: '▶ Animation' },
      { id: 'concept', label: '📖 Concept' },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ],
  });

  const panels = shell.querySelectorAll('.tab-panel');
  const animPanel    = panels[0];
  const conceptPanel = panels[1];
  const iqPanel      = panels[2];

  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const cvs = document.createElement('canvas'); cvs.className = 'stage-canvas';
  wrap.appendChild(cvs);
  const ctrl = document.createElement('div'); ctrl.className = 'canvas-controls';
  const replayBtn = document.createElement('button');
  replayBtn.className = 'btn'; replayBtn.textContent = '↺ Replay';
  ctrl.appendChild(replayBtn);
  const cap = document.createElement('p'); cap.className = 'caption';
  cap.textContent = 'Watch the error rate climb past the alert threshold, trigger rollback, then recover.';
  animPanel.appendChild(wrap); animPanel.appendChild(ctrl); animPanel.appendChild(cap);

  function errRateAt(prog) {
    if (prog < 0.35) return 0.005 + Math.sin(prog * 40) * 0.001;
    if (prog < 0.55) return lerp(0.005, 0.08, easeOut(clamp((prog - 0.35) / 0.2, 0, 1)));
    if (prog < 0.65) return 0.08;
    return lerp(0.08, 0.004, easeOut(clamp((prog - 0.65) / 0.35, 0, 1)));
  }

  function runAnim() {
    const { ctx, w, h } = setupCanvas(cvs, 320);
    let prog = 0, done = false;
    const history = [];
    const stop = loop((dt) => {
      if (done) return;
      prog = Math.min(1, prog + dt / 8000);
      const p = palette();
      ctx.clearRect(0, 0, w, h);
      const err = errRateAt(prog);
      history.push({ prog, err }); if (history.length > 300) history.shift();

      // Pillars
      const pillars = [
        { label: '📜 Logs',    color: '#3B82F6', detail: 'structured JSON' },
        { label: '📊 Metrics', color: '#F59E0B', detail: 'CloudWatch EMF' },
        { label: '🔗 Traces',  color: '#8B5CF6', detail: 'X-Ray / OTEL' },
      ];
      const pW = (w - 48) / 3, pY = 16, pH = 52;
      pillars.forEach((pl, i) => {
        const px = 16 + i * (pW + 8);
        ctx.fillStyle = pl.color + '18'; drawRoundRect(ctx, px, pY, pW, pH, 7); ctx.fill();
        ctx.strokeStyle = pl.color; ctx.lineWidth = 1.5; drawRoundRect(ctx, px, pY, pW, pH, 7); ctx.stroke();
        ctx.fillStyle = pl.color; ctx.font = '600 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(pl.label, px + pW / 2, pY + 22);
        ctx.fillStyle = p.muted; ctx.font = '10px sans-serif'; ctx.fillText(pl.detail, px + pW / 2, pY + 38);
        ctx.textAlign = 'left';
      });

      // Chart
      const chartX = 20, chartY = 82, chartW = w - 40, chartH = 110;
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; drawRoundRect(ctx, chartX, chartY, chartW, chartH, 6); ctx.fill();
      const THRESH = 0.02;
      const threshY = chartY + chartH - (THRESH / 0.09) * chartH;
      ctx.setLineDash([4, 4]); ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(chartX, threshY); ctx.lineTo(chartX + chartW, threshY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#EF4444'; ctx.font = '9px sans-serif';
      ctx.fillText('2% threshold', chartX + 4, threshY - 3);

      if (history.length > 1) {
        ctx.beginPath();
        history.forEach((pt, i) => {
          const x = chartX + pt.prog * chartW;
          const y = chartY + chartH - clamp(pt.err / 0.09, 0, 1) * chartH;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.strokeStyle = err >= THRESH ? '#EF4444' : '#10B981'; ctx.lineWidth = 2; ctx.stroke();
      }

      ctx.fillStyle = p.muted; ctx.font = '9px sans-serif';
      ctx.save(); ctx.translate(chartX - 12, chartY + chartH / 2); ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center'; ctx.fillText('Error %', 0, 0); ctx.restore();

      if (prog >= 0.55) {
        const aa = easeOut(clamp((prog - 0.55) / 0.06, 0, 1)); ctx.globalAlpha = aa;
        ctx.fillStyle = '#EF444430'; drawRoundRect(ctx, chartX, chartY + chartH + 10, chartW / 2 - 4, 28, 6); ctx.fill();
        ctx.fillStyle = '#EF4444'; ctx.font = '700 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('🚨 ALERT FIRED — err > 2%', chartX + chartW / 4, chartY + chartH + 27);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }
      if (prog >= 0.65) {
        const ra = easeOut(clamp((prog - 0.65) / 0.06, 0, 1)); ctx.globalAlpha = ra;
        ctx.fillStyle = '#F59E0B30'; drawRoundRect(ctx, chartX + chartW / 2 + 4, chartY + chartH + 10, chartW / 2 - 4, 28, 6); ctx.fill();
        ctx.fillStyle = '#F59E0B'; ctx.font = '700 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('↩ Auto-rollback to v41', chartX + chartW * 3 / 4, chartY + chartH + 27);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }

      ctx.fillStyle = err >= THRESH ? '#EF4444' : '#10B981'; ctx.font = '700 13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((err * 100).toFixed(2) + '%', chartX + chartW - 4, chartY + 18);
      ctx.textAlign = 'left';

      if (prog > 0.96) {
        const fa = easeOut(clamp((prog - 0.96) / 0.04, 0, 1)); ctx.globalAlpha = fa;
        ctx.fillStyle = '#10B981'; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('✅ Service recovered — error rate < 0.5%', w / 2, h - 8);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }
      if (prog >= 1 && !done) { done = true; markDone(); }
    });
    replayBtn.onclick = () => { prog = 0; done = false; history.length = 0; };
    return stop;
  }

  let stopAnim = null;
  initTabs(shell, (idx) => {
    if (idx === 0) { if (!stopAnim) stopAnim = runAnim(); }
    else if (stopAnim) { stopAnim(); stopAnim = null; }
  });
  stopAnim = runAnim();

  conceptPanel.innerHTML = `<div class="prose">
    <h3>The three pillars of observability</h3>
    <p><strong>Logs</strong> — timestamped events. Priya's fraud-score API logs every prediction
    with <code>request_id</code>, <code>fraud_score</code>, and latency in structured JSON.</p>
    <p><strong>Metrics</strong> — numeric measurements over time: request count, error count, P99
    latency. Published via CloudWatch Embedded Metric Format (EMF).</p>
    <p><strong>Traces</strong> — the full call graph of a single request across services. AWS X-Ray
    or OpenTelemetry captures the time spent in each downstream call so Priya can see exactly which
    service caused the latency spike.</p>
    <h3>Alerts and auto-rollback</h3>
    <p>A CloudWatch Alarm triggers when the 5-minute error rate exceeds 2%. The alarm calls a Lambda
    that flips the CodeDeploy traffic weight back to v41 — no human required. The on-call engineer
    gets paged via PagerDuty and investigates post-incident.</p>
  </div>`;

  iqPanel.appendChild(createIQSection([
    { q: 'What are the three pillars of observability?', a: 'Logs (discrete events), Metrics (numeric time-series aggregations), and Traces (distributed call graphs). Together they answer: what happened, how often/how slow, and where in the call chain.' },
    { q: 'What is an SLO and an error budget?', a: 'An SLO is a target like "99.9% of requests succeed." An error budget is the allowed failure headroom (0.1%). Burn the budget and you freeze non-critical deploys until it refills.' },
    { q: 'How does CloudWatch auto-rollback work?', a: 'A CloudWatch Alarm monitors the error metric. When it enters ALARM state, a CodeDeploy rollback action (or a Lambda triggered by SNS) automatically shifts traffic back to the previous version.' },
    { q: 'What is distributed tracing?', a: 'Tracking a single request across multiple services. Each service propagates a trace ID in HTTP headers; the tracing system stitches spans into a waterfall diagram showing exactly where time was spent.' },
    { q: 'What is a P99 latency and why not just use average?', a: 'P99 is the 99th percentile — the latency 99% of requests beat. Averages hide the long tail: if 1% of fraud-score calls take 10s, the average looks fine while real users are timing out.' },
  ]));
  initIQ(shell);

  canvas.replaceWith(shell);
  return () => { if (stopAnim) stopAnim(); };
}
