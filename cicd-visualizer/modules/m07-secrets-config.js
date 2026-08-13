import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { setupCanvas, palette, loop, drawRoundRect, drawArrow, easeOut, clamp } from '../components/canvas-primitives.js';

export function mount(canvas, { markDone }) {
  const shell = createModuleShell({
    tag: 'Module 07 · Package & Promote',
    title: 'Secrets & Config',
    subtitle: 'Follow FRAUD_API_KEY from hardcoded source → vault → runtime injection in Priya\'s container.',
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
  cap.textContent = 'Phase 1: dangerous hardcoded key. Phases 2-3: vault-based approach.';
  animPanel.appendChild(wrap); animPanel.appendChild(ctrl); animPanel.appendChild(cap);

  const PH1 = 0.30, PH2 = 0.65;

  function runAnim() {
    const { ctx, w, h } = setupCanvas(cvs, 310);
    let prog = 0, done = false;
    const stop = loop((dt) => {
      if (done) return;
      prog = Math.min(1, prog + dt / 6000);
      const p = palette();
      ctx.clearRect(0, 0, w, h);

      const phase = prog < PH1 ? 1 : prog < PH2 ? 2 : 3;
      const colW = (w - 48) / 3;
      const cols = [16, 16 + colW + 8, 16 + 2 * (colW + 8)];
      const boxH = 170, boxY = 40;
      const colLabels = ['📄 Source Code', '🔐 Vault', '🐳 Runtime Container'];
      const colColors = ['#EF4444', '#F59E0B', '#10B981'];

      colLabels.forEach((lbl, i) => {
        const active = (i === 0 && phase === 1) || (i === 1 && phase === 2) || (i === 2 && phase === 3);
        ctx.fillStyle = colColors[i] + (active ? '22' : '11');
        drawRoundRect(ctx, cols[i], boxY, colW, boxH, 8); ctx.fill();
        ctx.strokeStyle = colColors[i]; ctx.lineWidth = active ? 2 : 1;
        drawRoundRect(ctx, cols[i], boxY, colW, boxH, 8); ctx.stroke();
        ctx.fillStyle = colColors[i]; ctx.font = '600 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(lbl, cols[i] + colW / 2, boxY - 6); ctx.textAlign = 'left';
      });

      if (phase === 1) {
        const a = easeOut(clamp(prog / PH1, 0, 1)); ctx.globalAlpha = a;
        const lines = ['API_KEY = "sk-abc123"', '# ⚠ DO NOT commit!', 'fraud_score(', '  key=API_KEY', ')'];
        lines.forEach((ln, i) => {
          if (i === 0) { ctx.fillStyle = '#EF444430'; ctx.fillRect(cols[0] + 4, boxY + 18 + i * 18 - 12, colW - 8, 16); }
          ctx.fillStyle = i === 0 ? '#EF4444' : p.muted;
          ctx.font = i === 0 ? '700 10px monospace' : '400 10px monospace';
          ctx.fillText(ln, cols[0] + 8, boxY + 18 + i * 18);
        });
        ctx.fillStyle = '#EF4444'; ctx.font = '700 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('🚨 EXPOSED', cols[0] + colW / 2, boxY + boxH - 12);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }

      if (phase >= 2) {
        const a = easeOut(clamp((prog - PH1) / 0.15, 0, 1)); ctx.globalAlpha = a;
        ['import os', 'API_KEY = os.getenv(', ' "FRAUD_API_KEY")', 'fraud_score(', '  key=API_KEY', ')'].forEach((ln, i) => {
          ctx.fillStyle = i < 3 ? '#10B981' : p.muted; ctx.font = '400 10px monospace';
          ctx.fillText(ln, cols[0] + 8, boxY + 18 + i * 16);
        });
        ctx.fillStyle = '#10B98130'; drawRoundRect(ctx, cols[0] + 4, boxY + boxH - 24, colW - 8, 18, 4); ctx.fill();
        ctx.fillStyle = '#10B981'; ctx.font = '700 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('✅ SCAN CLEAN', cols[0] + colW / 2, boxY + boxH - 11); ctx.textAlign = 'left';
        const vaultA = Math.sin(Date.now() / 400) * 0.15 + 0.25;
        ctx.fillStyle = `rgba(245,158,11,${vaultA})`; drawRoundRect(ctx, cols[1], boxY, colW, boxH, 8); ctx.fill();
        ctx.fillStyle = '#F59E0B'; ctx.font = '28px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('🔐', cols[1] + colW / 2, boxY + 56);
        ctx.font = '600 10px sans-serif'; ctx.fillText('AWS Secrets Manager', cols[1] + colW / 2, boxY + 80);
        ctx.fillStyle = p.muted; ctx.font = '10px monospace'; ctx.fillText('FRAUD_API_KEY', cols[1] + colW / 2, boxY + 96);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }

      if (phase === 3) {
        const a3 = easeOut(clamp((prog - PH2) / 0.18, 0, 1)); ctx.globalAlpha = a3;
        drawArrow(ctx, cols[2] - 8, boxY + boxH / 2, cols[2] + 2, boxY + boxH / 2, '#F59E0B', 2);
        ctx.fillStyle = '#10B981'; ctx.font = '24px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('🐳', cols[2] + colW / 2, boxY + 52);
        ctx.font = '600 10px sans-serif'; ctx.fillText('fraud-score:v42', cols[2] + colW / 2, boxY + 72);
        ctx.fillStyle = '#10B98130'; drawRoundRect(ctx, cols[2] + 6, boxY + 82, colW - 12, 28, 4); ctx.fill();
        ctx.fillStyle = '#10B981'; ctx.font = '700 10px sans-serif'; ctx.fillText('ENV INJECTED ✓', cols[2] + colW / 2, boxY + 94);
        ctx.fillStyle = p.muted; ctx.font = '400 9px monospace'; ctx.fillText('FRAUD_API_KEY=****', cols[2] + colW / 2, boxY + 106);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }

      const phaseTexts = ['Phase 1: Secret in code — DANGEROUS', 'Phase 2: Code uses env var — vault scanned', 'Phase 3: Vault injects secret at runtime ✓'];
      const phaseColors = ['#EF4444', '#F59E0B', '#10B981'];
      ctx.fillStyle = phaseColors[phase - 1] + '22'; drawRoundRect(ctx, 16, boxY + boxH + 12, w - 32, 24, 6); ctx.fill();
      ctx.fillStyle = phaseColors[phase - 1]; ctx.font = '600 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(phaseTexts[phase - 1], w / 2, boxY + boxH + 28); ctx.textAlign = 'left';

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
    <h3>The secret-in-code problem</h3>
    <p>Hardcoding <code>API_KEY = "sk-abc123"</code> in source means every developer, log
    aggregator, and CI runner that clones the repo has the key. A GitHub secret-scanning alert
    fired on Priya's repo within 30 seconds of her accidental commit.</p>
    <h3>The vault pattern</h3>
    <p>AWS Secrets Manager stores secrets encrypted at rest. The application reads
    <code>os.getenv('FRAUD_API_KEY')</code> — it never sees the actual value at build time.
    The CI pipeline uses an IAM role to fetch and inject the secret at container startup.</p>
    <h3>Secret scanning in CI</h3>
    <p>Tools like <strong>gitleaks</strong> and GitHub's built-in secret scanning regex-scan every
    commit. A failed scan blocks the pipeline — the secret never reaches the registry.</p>
  </div>`;

  iqPanel.appendChild(createIQSection([
    { q: 'Why must secrets never be committed to git?', a: 'Git history is permanent. Even a deleted commit can be recovered from reflog or CI logs. The blast radius of a leaked API key is immediate and global.' },
    { q: 'How does AWS Secrets Manager inject a secret into a container?', a: 'An ECS task definition references a secret ARN. At startup, the ECS agent fetches the value using the task\'s IAM role and injects it as an environment variable.' },
    { q: 'What is secret scanning?', a: 'Automated regex-based scanning of commits for patterns that look like API keys or passwords. GitHub runs it on push; tools like gitleaks run it in CI. A match fails the pipeline before the image is built.' },
    { q: 'What is the principle of least privilege for secrets?', a: 'Each service should only have access to the secrets it needs, with the narrowest IAM policy possible — the fraud-score service can read FRAUD_API_KEY but not the payment DB password.' },
    { q: 'How do you rotate secrets without downtime?', a: 'Secrets Manager supports automatic rotation via Lambda. The new value is staged alongside the old; the container picks it up on the next restart. Blue/green deploys make this seamless.' },
  ]));
  initIQ(shell);

  canvas.replaceWith(shell);
  return () => { if (stopAnim) stopAnim(); };
}
