import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { setupCanvas, palette, loop, drawRoundRect, drawArrow, drawText, easeOut, clamp, lerp } from '../components/canvas-primitives.js';

export function mount(canvas, { markDone }) {
  const shell = createModuleShell({
    tag: 'Module 07 · Package & Promote',
    title: 'Secrets & Config',
    subtitle: 'Follow FRAUD_API_KEY from hardcoded source → vault → runtime injection in Priya\'s container.',
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
  cap.textContent = 'Phase 1 shows the dangerous pattern (hardcoded key). Phases 2-3 show the correct vault-based approach.';
  wrap.appendChild(ctrl); wrap.appendChild(cap);

  const animPanel = shell.querySelector('[data-panel="anim"]');
  animPanel.appendChild(wrap);

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
      const boxH = 170;
      const boxY = 40;

      const colLabels = ['📄 Source Code', '🔐 Vault', '🐳 Runtime Container'];
      const colColors = ['#EF4444', '#F59E0B', '#10B981'];

      colLabels.forEach((lbl, i) => {
        const active = (i === 0 && phase === 1) || (i === 1 && phase === 2) || (i === 2 && phase === 3);
        ctx.fillStyle = colColors[i] + (active ? '22' : '11');
        drawRoundRect(ctx, cols[i], boxY, colW, boxH, 8);
        ctx.fill();
        ctx.strokeStyle = colColors[i];
        ctx.lineWidth = active ? 2 : 1;
        drawRoundRect(ctx, cols[i], boxY, colW, boxH, 8);
        ctx.stroke();

        ctx.fillStyle = colColors[i];
        ctx.font = '600 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(lbl, cols[i] + colW / 2, boxY - 6);
        ctx.textAlign = 'left';
      });

      // Phase 1: hardcoded key in source
      if (phase === 1) {
        const a = easeOut(clamp(prog / PH1, 0, 1));
        ctx.globalAlpha = a;
        ctx.fillStyle = '#EF4444';
        ctx.font = '700 10px monospace';
        const lines = [
          'API_KEY = "sk-abc123"',
          '# ⚠ DO NOT commit!',
          'fraud_score(',
          '  key=API_KEY',
          ')',
        ];
        lines.forEach((ln, i) => {
          const isSecret = i === 0;
          if (isSecret) {
            ctx.fillStyle = '#EF444430';
            ctx.fillRect(cols[0] + 4, boxY + 18 + i * 18 - 12, colW - 8, 16);
          }
          ctx.fillStyle = isSecret ? '#EF4444' : p.muted;
          ctx.font = isSecret ? '700 10px monospace' : '400 10px monospace';
          ctx.fillText(ln, cols[0] + 8, boxY + 18 + i * 18);
        });

        // EXPOSED badge
        ctx.fillStyle = '#EF4444';
        ctx.font = '700 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🚨 EXPOSED', cols[0] + colW / 2, boxY + boxH - 12);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      }

      // Phase 2: vault active, code uses env var
      if (phase >= 2) {
        const a = easeOut(clamp((prog - PH1) / 0.15, 0, 1));
        ctx.globalAlpha = a;

        // Source now shows env var
        const lines2 = [
          'import os',
          'API_KEY = os.getenv(',
          ' "FRAUD_API_KEY")',
          'fraud_score(',
          '  key=API_KEY',
          ')',
        ];
        lines2.forEach((ln, i) => {
          ctx.fillStyle = i < 3 ? '#10B981' : p.muted;
          ctx.font = '400 10px monospace';
          ctx.fillText(ln, cols[0] + 8, boxY + 18 + i * 16);
        });

        // SCAN CLEAN badge
        ctx.fillStyle = '#10B98130';
        drawRoundRect(ctx, cols[0] + 4, boxY + boxH - 24, colW - 8, 18, 4);
        ctx.fill();
        ctx.fillStyle = '#10B981';
        ctx.font = '700 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✅ SCAN CLEAN', cols[0] + colW / 2, boxY + boxH - 11);
        ctx.textAlign = 'left';

        // Vault active glow
        const vaultA = Math.sin(Date.now() / 400) * 0.15 + 0.25;
        ctx.fillStyle = `rgba(245,158,11,${vaultA})`;
        drawRoundRect(ctx, cols[1], boxY, colW, boxH, 8);
        ctx.fill();

        ctx.fillStyle = '#F59E0B';
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔐', cols[1] + colW / 2, boxY + 56);
        ctx.font = '600 10px sans-serif';
        ctx.fillText('AWS Secrets Manager', cols[1] + colW / 2, boxY + 80);
        ctx.fillStyle = p.muted;
        ctx.font = '10px monospace';
        ctx.fillText('FRAUD_API_KEY', cols[1] + colW / 2, boxY + 96);
        ctx.textAlign = 'left';

        ctx.globalAlpha = 1;
      }

      // Phase 3: injection arrow vault→container
      if (phase === 3) {
        const a3 = easeOut(clamp((prog - PH2) / 0.18, 0, 1));
        ctx.globalAlpha = a3;

        // Arrow from vault to container
        const arrowY = boxY + boxH / 2;
        drawArrow(ctx, cols[2] - 8, arrowY, cols[2] + 2, arrowY, '#F59E0B', 2);

        // Container content
        ctx.fillStyle = '#10B981';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🐳', cols[2] + colW / 2, boxY + 52);
        ctx.font = '600 10px sans-serif';
        ctx.fillText('fraud-score:v42', cols[2] + colW / 2, boxY + 72);

        ctx.fillStyle = '#10B98130';
        drawRoundRect(ctx, cols[2] + 6, boxY + 82, colW - 12, 28, 4);
        ctx.fill();
        ctx.fillStyle = '#10B981';
        ctx.font = '700 10px sans-serif';
        ctx.fillText('ENV INJECTED ✓', cols[2] + colW / 2, boxY + 94);
        ctx.font = '400 9px monospace';
        ctx.fillStyle = p.muted;
        ctx.fillText('FRAUD_API_KEY=****', cols[2] + colW / 2, boxY + 106);
        ctx.textAlign = 'left';

        ctx.globalAlpha = 1;
      }

      // Phase label bar
      const phaseTexts = ['Phase 1: Secret in code — DANGEROUS', 'Phase 2: Code uses env var — vault scanned', 'Phase 3: Vault injects secret at runtime ✓'];
      const phaseIdx = phase - 1;
      const phaseColors = ['#EF4444', '#F59E0B', '#10B981'];
      ctx.fillStyle = phaseColors[phaseIdx] + '22';
      drawRoundRect(ctx, 16, boxY + boxH + 12, w - 32, 24, 6);
      ctx.fill();
      ctx.fillStyle = phaseColors[phaseIdx];
      ctx.font = '600 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(phaseTexts[phaseIdx], w / 2, boxY + boxH + 28);
      ctx.textAlign = 'left';

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
      <h3>The secret-in-code problem</h3>
      <p>Hardcoding <code>API_KEY = "sk-abc123"</code> in source means every developer, every log
      aggregator, and every CI runner that clones the repo has the key. A GitHub secret-scanning
      alert fired on Priya's repo within 30 seconds of her accidental commit.</p>
      <h3>The vault pattern</h3>
      <p>AWS Secrets Manager (or HashiCorp Vault) stores secrets encrypted at rest. The application
      reads <code>os.getenv('FRAUD_API_KEY')</code> — it never sees the actual value at build time.
      The CI pipeline uses an IAM role to fetch and inject the secret as an environment variable at
      container startup.</p>
      <h3>Secret scanning in CI</h3>
      <p>Tools like <strong>gitleaks</strong>, <strong>truffleHog</strong>, and GitHub's built-in
      secret scanning regex-scan every commit. A failed scan blocks the pipeline immediately — the
      secret never reaches the registry.</p>
    </div>`;

  const iqPanel = shell.querySelector('[data-panel="iq"]');
  const iq = createIQSection([
    { q: 'Why must secrets never be committed to git?', a: 'Git history is permanent and widely cloned. Even a deleted commit can be recovered from git reflog, GitHub\'s cache, or CI logs. The blast radius of a leaked API key is immediate and global.' },
    { q: 'How does AWS Secrets Manager inject a secret into a container?', a: 'An ECS task definition references a secret ARN. At container startup, the ECS agent fetches the secret value from Secrets Manager using the task\'s IAM role and injects it as an environment variable — the value never appears in the Dockerfile or task definition itself.' },
    { q: 'What is secret scanning?', a: 'Automated regex-based scanning of commits/PRs for patterns that look like API keys, tokens, or passwords. GitHub runs it on push; tools like gitleaks run it in CI. A match fails the pipeline before the image is built.' },
    { q: 'What is the principle of least privilege for secrets?', a: 'Each service should only have access to the secrets it needs, and each secret should have the narrowest IAM policy possible — e.g. the fraud-score service can read FRAUD_API_KEY but not the payment service\'s DB password.' },
    { q: 'How do you rotate secrets without downtime?', a: 'Secrets Manager supports automatic rotation via Lambda. The new value is staged alongside the old one; the consuming service picks up the new env var on the next container restart. Blue/green deploys make this seamless.' },
  ]);
  iqPanel.appendChild(iq);
  initIQ(shell);

  canvas.replaceWith(shell);
  return () => { if (stopAnim) stopAnim(); };
}
