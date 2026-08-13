import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { setupCanvas, palette, loop, drawRoundRect, drawArrow, easeOut, clamp, lerp } from '../components/canvas-primitives.js';

export function mount(canvas, { markDone }) {
  const shell = createModuleShell({
    tag: 'Module 06 · Package & Promote',
    title: 'Environment Strategy',
    subtitle: 'Artifact v42 travels Dev → Staging → Prod. Gate 2 requires manual approval before production.',
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
  cap.textContent = 'Gate 1 is automated; Gate 2 pauses for a human reviewer before production deploy.';
  animPanel.appendChild(wrap); animPanel.appendChild(ctrl); animPanel.appendChild(cap);

  const ENVS = [
    { label: 'Dev',     icon: '💻', color: '#10B981', checks: 'unit + lint' },
    { label: 'Staging', icon: '🔬', color: '#3B82F6', checks: 'integration + smoke' },
    { label: 'Prod',    icon: '🚀', color: '#8B5CF6', checks: 'canary → full' },
  ];
  const PHASES = [0, 0.18, 0.30, 0.55, 0.67, 0.82, 1.0];

  function runAnim() {
    const { ctx, w, h } = setupCanvas(cvs, 300);
    let prog = 0, done = false;
    const stop = loop((dt) => {
      if (done) return;
      const rate = (prog >= PHASES[4] && prog < PHASES[5]) ? 0.4 : 1.0;
      prog = Math.min(1, prog + dt / 5500 * rate);
      const p = palette();
      ctx.clearRect(0, 0, w, h);

      const boxW = (w - 80) / 3, boxH = 110, boxY = (h - boxH) / 2 - 10, gapX = 40;

      ENVS.forEach((env, i) => {
        const bx = i * (boxW + gapX) + 16;
        let activeAlpha = 0;
        if (i === 0 && prog >= PHASES[0] && prog < PHASES[2]) activeAlpha = easeOut(clamp((prog - PHASES[0]) / 0.15, 0, 1));
        if (i === 1 && prog >= PHASES[2] && prog < PHASES[4]) activeAlpha = easeOut(clamp((prog - PHASES[2]) / 0.15, 0, 1));
        if (i === 2 && prog >= PHASES[5]) activeAlpha = easeOut(clamp((prog - PHASES[5]) / 0.15, 0, 1));
        ctx.fillStyle = env.color + (activeAlpha > 0.3 ? '30' : '18');
        drawRoundRect(ctx, bx, boxY, boxW, boxH, 10); ctx.fill();
        ctx.strokeStyle = env.color; ctx.lineWidth = activeAlpha > 0.1 ? 2.5 : 1;
        drawRoundRect(ctx, bx, boxY, boxW, boxH, 10); ctx.stroke();
        ctx.fillStyle = env.color; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(env.icon + ' ' + env.label, bx + boxW / 2, boxY + 26);
        ctx.fillStyle = p.muted; ctx.font = '11px sans-serif';
        ctx.fillText(env.checks, bx + boxW / 2, boxY + 44);
        const envDone = (i === 0 && prog >= PHASES[1]) || (i === 1 && prog >= PHASES[3]) || (i === 2 && prog >= 0.96);
        if (envDone) { ctx.fillStyle = env.color; ctx.font = '700 12px sans-serif'; ctx.fillText('✅ Deployed', bx + boxW / 2, boxY + 70); }
        ctx.textAlign = 'left';
      });

      // Gate 1 (auto)
      const g1x = boxW + 16 + gapX / 2;
      if (prog >= PHASES[1]) {
        const ga = easeOut(clamp((prog - PHASES[1]) / 0.1, 0, 1));
        ctx.globalAlpha = ga;
        ctx.fillStyle = '#10B98130'; drawRoundRect(ctx, g1x - 14, boxY + boxH / 2 - 16, 28, 32, 6); ctx.fill();
        ctx.strokeStyle = '#10B981'; ctx.lineWidth = 1.5; drawRoundRect(ctx, g1x - 14, boxY + boxH / 2 - 16, 28, 32, 6); ctx.stroke();
        ctx.fillStyle = '#10B981'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('⚙', g1x, boxY + boxH / 2 + 2);
        ctx.font = '9px sans-serif'; ctx.fillText('auto', g1x, boxY + boxH / 2 + 14);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }

      // Gate 2 (manual)
      const g2x = 2 * (boxW + gapX) + 16 - gapX / 2;
      if (prog >= PHASES[3]) {
        const ga2 = easeOut(clamp((prog - PHASES[3]) / 0.1, 0, 1));
        const isWaiting = prog >= PHASES[4] && prog < PHASES[5];
        const gate2Color = isWaiting ? '#F59E0B' : (prog >= PHASES[5] ? '#10B981' : '#3B82F6');
        ctx.globalAlpha = ga2;
        ctx.fillStyle = gate2Color + '30'; drawRoundRect(ctx, g2x - 14, boxY + boxH / 2 - 16, 28, 32, 6); ctx.fill();
        ctx.strokeStyle = gate2Color; ctx.lineWidth = isWaiting ? 2.5 : 1.5;
        drawRoundRect(ctx, g2x - 14, boxY + boxH / 2 - 16, 28, 32, 6); ctx.stroke();
        ctx.fillStyle = gate2Color; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(isWaiting ? '👤' : (prog >= PHASES[5] ? '✅' : '👤'), g2x, boxY + boxH / 2 + 2);
        ctx.font = '9px sans-serif'; ctx.fillText(isWaiting ? 'waiting' : 'manual', g2x, boxY + boxH / 2 + 14);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }

      // Packet
      let packetX;
      if (prog < PHASES[2]) packetX = lerp(28, 28 + boxW - 20, easeOut(clamp(prog / PHASES[2], 0, 1)));
      else if (prog < PHASES[4]) packetX = lerp(28 + boxW + gapX, 28 + 2 * boxW + gapX - 20, easeOut(clamp((prog - PHASES[2]) / (PHASES[4] - PHASES[2]), 0, 1)));
      else if (prog >= PHASES[5]) packetX = lerp(28 + 2 * (boxW + gapX), 28 + 3 * boxW + 2 * gapX - 20, easeOut(clamp((prog - PHASES[5]) / (1 - PHASES[5]), 0, 1)));
      else packetX = 28 + boxW + gapX;

      ctx.fillStyle = '#10B981';
      drawRoundRect(ctx, packetX - 18, boxY + boxH / 2 - 10, 36, 20, 5); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('v42', packetX, boxY + boxH / 2 + 4); ctx.textAlign = 'left';

      if (prog > 0.97) {
        const fa = easeOut(clamp((prog - 0.97) / 0.03, 0, 1));
        ctx.globalAlpha = fa; ctx.fillStyle = '#8B5CF6'; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('🚀 v42 live in Prod — canary at 10%', w / 2, h - 14);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }
      if (prog >= 1 && !done) { done = true; markDone(); }
    });
    replayBtn.onclick = () => { prog = 0; done = false; };
    return stop;
  }

  let stopAnim = null;
  initTabs(shell, (idx) => {
    if (idx === 0) { if (!stopAnim) stopAnim = runAnim(); }
    else if (stopAnim) { stopAnim(); stopAnim = null; }
  });
  stopAnim = runAnim();

  conceptPanel.innerHTML = `<div class="prose">
    <h3>Why multiple environments?</h3>
    <p>Running Priya's fraud-score service directly in production is dangerous. A bug that causes
    false positives could block legitimate Amazon orders. Multiple environments let the team validate
    at every tier before real customers are affected.</p>
    <h3>Dev → Staging → Prod</h3>
    <p><strong>Dev:</strong> Fast feedback — unit tests and linting on every push.</p>
    <p><strong>Staging:</strong> A production-like replica. Integration tests run against real
    downstream services (Kinesis, DynamoDB). Smoke tests verify the API is reachable.</p>
    <p><strong>Prod:</strong> The canary rollout starts at 10% traffic before going full. A manual
    approval gate prevents accidental deploys.</p>
    <h3>Approval gates</h3>
    <p>Gate 1 (Dev→Staging) is automated. Gate 2 (Staging→Prod) requires a human to click
    Approve in the GitHub Actions UI.</p>
  </div>`;

  iqPanel.appendChild(createIQSection([
    { q: 'What is the purpose of a staging environment?', a: 'Staging mirrors production as closely as possible to catch integration bugs, performance issues, and config mismatches before they affect real users or revenue.' },
    { q: 'What is an approval gate in a CI/CD pipeline?', a: 'A pause point that requires explicit human confirmation before the pipeline proceeds. GitHub Actions implements this via environment protection rules.' },
    { q: 'What is environment parity?', a: 'The principle that staging should match production in OS, runtime version, service dependencies, and config shape — so a bug caught in staging is a bug that would have hit prod.' },
    { q: 'How do you promote artifacts between environments without rebuilding?', a: 'Build once, promote the same immutable Docker image tag (e.g. ECR fraud-score:v42) across Dev → Staging → Prod. Never rebuild per environment.' },
    { q: 'What are environment-specific secrets?', a: 'Each environment has its own set of secrets (DB credentials, API keys) injected at runtime — never baked into the image. Staging uses staging DB creds; prod uses prod DB creds.' },
  ]));
  initIQ(shell);

  canvas.replaceWith(shell);
  return () => { if (stopAnim) stopAnim(); };
}
