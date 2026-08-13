import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { setupCanvas, palette, loop, drawRoundRect, drawArrow, drawText, easeOut, clamp, lerp } from '../components/canvas-primitives.js';

export function mount(canvas, { markDone }) {
  const shell = createModuleShell({
    tag: 'Module 05 · Package & Promote',
    title: 'Docker & Containers',
    subtitle: 'Priya\'s fraud-score service: from Dockerfile to ECR registry — layer caching in action.',
    tabs: [
      { id: 'anim', label: '▶ Animation' },
      { id: 'concept', label: '📖 Concept' },
      { id: 'iq', label: '🎯 Interview Q&A' },
    ],
  });

  // ── Animation tab ──────────────────────────────────────────────
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
  cap.textContent = 'Watch how Docker layer caching skips the pip-install step on code-only changes.';
  wrap.appendChild(ctrl); wrap.appendChild(cap);

  const animPanel = shell.querySelector('[data-panel="anim"]');
  animPanel.appendChild(wrap);

  const DOCKERFILE = [
    { text: 'FROM python:3.11-slim', layer: true,  cached: false, color: '#3B82F6', label: 'Base OS' },
    { text: 'WORKDIR /app',         layer: false },
    { text: 'COPY requirements.txt .', layer: true, cached: false, color: '#8B5CF6', label: 'Dep manifest' },
    { text: 'RUN pip install -r requirements.txt', layer: true, cached: true,  color: '#F59E0B', label: 'Deps (CACHED)' },
    { text: 'COPY src/ .',          layer: true,  cached: false, color: '#10B981', label: 'App code' },
    { text: 'CMD ["python","main.py"]', layer: false },
  ];
  const LAYERS = DOCKERFILE.filter(l => l.layer);

  function runAnim() {
    const { ctx, w, h } = setupCanvas(cvs, 310);
    let prog = 0, done = false;
    const stop = loop((dt) => {
      if (done) return;
      prog = Math.min(1, prog + dt / 5200);

      const p = palette();
      ctx.clearRect(0, 0, w, h);

      const midX = w * 0.44;
      const leftW = midX - 24;
      const lineH = 22;
      const startY = 24;
      const lineCount = DOCKERFILE.length;
      const totalTextH = lineCount * lineH;
      const textReveal = clamp(prog / 0.65, 0, 1);
      const visibleLines = Math.round(textReveal * lineCount);

      // ── Left: Dockerfile panel ──
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      drawRoundRect(ctx, 12, 12, leftW, h - 24, 8);
      ctx.fill();

      ctx.fillStyle = p.muted;
      ctx.font = '600 11px monospace';
      ctx.fillText('📄 Dockerfile', 24, 32);

      for (let i = 0; i < visibleLines; i++) {
        const d = DOCKERFILE[i];
        const y = startY + 24 + i * lineH;
        if (d.layer) {
          ctx.fillStyle = d.color + '30';
          ctx.fillRect(16, y - 14, leftW - 8, lineH);
        }
        ctx.fillStyle = d.layer ? d.color : p.muted;
        ctx.font = d.layer ? '600 11px monospace' : '400 11px monospace';
        ctx.fillText(d.text, 24, y);
      }

      // ── Right: Layer stack ──
      const stackX = midX + 8;
      const stackW = w - stackX - 12;
      const layerH = 36;
      const stackBottom = h - 48;

      ctx.fillStyle = p.muted;
      ctx.font = '600 11px sans-serif';
      ctx.fillText('🐳 Image layers', stackX + 4, 28);

      const stackReveal = clamp((prog - 0.08) / 0.65, 0, 1);
      const visLayers = Math.round(stackReveal * LAYERS.length);

      for (let i = 0; i < visLayers; i++) {
        const lyr = LAYERS[i];
        const y = stackBottom - (i + 1) * (layerH + 4);
        const alpha = easeOut(clamp((stackReveal * LAYERS.length - i), 0, 1));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = lyr.color + '22';
        drawRoundRect(ctx, stackX, y, stackW, layerH, 6);
        ctx.fill();
        ctx.strokeStyle = lyr.color;
        ctx.lineWidth = 1.5;
        drawRoundRect(ctx, stackX, y, stackW, layerH, 6);
        ctx.stroke();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = lyr.color;
        ctx.font = '600 11px sans-serif';
        ctx.fillText(lyr.label, stackX + 10, y + 14);

        if (lyr.cached) {
          const bx = stackX + stackW - 78;
          ctx.fillStyle = '#F59E0B22';
          drawRoundRect(ctx, bx, y + 4, 68, 20, 4);
          ctx.fill();
          ctx.fillStyle = '#F59E0B';
          ctx.font = '700 10px sans-serif';
          ctx.fillText('⚡ CACHED', bx + 6, y + 17);
        }
        ctx.globalAlpha = 1;
      }

      // ── ECR registry ──
      if (prog > 0.78) {
        const ecra = easeOut(clamp((prog - 0.78) / 0.15, 0, 1));
        const ecrY = stackBottom - LAYERS.length * (layerH + 4) - 40;
        ctx.globalAlpha = ecra;
        ctx.fillStyle = '#10B98120';
        drawRoundRect(ctx, stackX, ecrY, stackW, 30, 6);
        ctx.fill();
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1.5;
        drawRoundRect(ctx, stackX, ecrY, stackW, 30, 6);
        ctx.stroke();
        ctx.fillStyle = '#10B981';
        ctx.font = '700 11px sans-serif';
        ctx.fillText('☁ ECR: fraud-score:v42 ✓', stackX + 10, ecrY + 19);
        ctx.globalAlpha = 1;

        // arrow from stack top to ECR
        drawArrow(ctx, stackX + stackW / 2, ecrY + 32, stackX + stackW / 2, ecrY + 30, p.accent, 2);
      }

      // ECR push label at bottom
      if (prog > 0.85) {
        const a2 = easeOut(clamp((prog - 0.85) / 0.12, 0, 1));
        ctx.globalAlpha = a2;
        ctx.fillStyle = '#10B981';
        ctx.font = '600 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✅ docker push → ECR complete', w / 2, h - 12);
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

  // ── Concept tab ──
  const conceptPanel = shell.querySelector('[data-panel="concept"]');
  conceptPanel.innerHTML = `
    <div class="prose">
      <h3>What is a Docker Image?</h3>
      <p>A Docker image is a read-only blueprint for containers. It's built from a <strong>Dockerfile</strong>
      — a recipe of sequential instructions. Each instruction creates a new <em>layer</em>, and Docker
      caches every layer independently.</p>
      <h3>Layer Caching — Why it Matters in CI/CD</h3>
      <p>When Priya pushes only a Python source change, Docker sees that <code>requirements.txt</code>
      hasn't changed, so it reuses the cached <code>pip install</code> layer — cutting build time
      from ~4 min to ~15 s.</p>
      <p><strong>Rule of thumb:</strong> put things that change rarely (OS, deps) early; things that
      change often (app code) late.</p>
      <h3>Registry (ECR)</h3>
      <p>After a successful build the image is tagged (<code>fraud-score:v42</code>) and pushed to
      Amazon ECR (Elastic Container Registry). Downstream stages pull from ECR — the image is the
      immutable artifact that travels through all environments.</p>
    </div>`;

  // ── IQ tab ──
  const iqPanel = shell.querySelector('[data-panel="iq"]');
  const iq = createIQSection([
    { q: 'What is a Docker layer?', a: 'An immutable, cached filesystem diff created by each Dockerfile instruction. Layers are stacked to form an image and reused across builds when the instruction and its inputs haven\'t changed.' },
    { q: 'How does layer caching speed up CI?', a: 'If a layer\'s content hash matches a cached version, Docker reuses it. Placing infrequently changing instructions (dep installs) before frequently changing ones (app copy) maximises cache hits and cuts build time from minutes to seconds.' },
    { q: 'What is ECR and why use it?', a: 'Amazon Elastic Container Registry is a managed, private Docker registry. It integrates with IAM for access control, stores images close to ECS/EKS clusters, and scans images for vulnerabilities.' },
    { q: 'What\'s the difference between an image and a container?', a: 'An image is a static, read-only template; a container is a running instance of that image with its own writable layer. Many containers can run from the same image simultaneously.' },
    { q: 'How would you reduce Docker image size?', a: 'Use slim/alpine base images, multi-stage builds (compile in one stage, copy binary to a scratch image), and clean up package manager caches in the same RUN instruction to avoid bloating intermediate layers.' },
  ]);
  iqPanel.appendChild(iq);
  initIQ(shell);

  canvas.replaceWith(shell);
  return () => { if (stopAnim) stopAnim(); };
}
