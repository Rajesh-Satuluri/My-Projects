import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { setupCanvas, palette, loop, drawRoundRect, drawArrow, easeOut, clamp, lerp } from '../components/canvas-primitives.js';

export function mount(canvas, { markDone }) {
  const shell = createModuleShell({
    tag: 'Module 09 · Ship & Operate',
    title: 'Deploy Strategies',
    subtitle: 'Canary rollout of fraud-score v42: traffic shifts from old to new while error rate stays green.',
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
  cap.textContent = 'Canary starts at 10% traffic. As health checks pass the split shifts to 50/50, then 100% v42.';
  animPanel.appendChild(wrap); animPanel.appendChild(ctrl); animPanel.appendChild(cap);

  const SPLITS = [
    { old: 1.0, newV: 0.0, t: 0.0 },
    { old: 0.9, newV: 0.1, t: 0.18 },
    { old: 0.5, newV: 0.5, t: 0.50 },
    { old: 0.0, newV: 1.0, t: 0.80 },
  ];

  function currentSplit(prog) {
    for (let i = SPLITS.length - 1; i >= 0; i--) {
      if (prog >= SPLITS[i].t) {
        if (i < SPLITS.length - 1) {
          const frac = easeOut(clamp((prog - SPLITS[i].t) / (SPLITS[i+1].t - SPLITS[i].t), 0, 1));
          return { old: lerp(SPLITS[i].old, SPLITS[i+1].old, frac), newV: lerp(SPLITS[i].newV, SPLITS[i+1].newV, frac) };
        }
        return { old: SPLITS[i].old, newV: SPLITS[i].newV };
      }
    }
    return { old: 1, newV: 0 };
  }

  function runAnim() {
    const { ctx, w, h } = setupCanvas(cvs, 320);
    let prog = 0, done = false;
    const stop = loop((dt) => {
      if (done) return;
      prog = Math.min(1, prog + dt / 7000);
      const p = palette();
      ctx.clearRect(0, 0, w, h);
      const { old: oldFrac, newV: newFrac } = currentSplit(prog);

      // Load balancer
      const lbX = w / 2 - 40, lbY = 20, lbW = 80, lbH = 36;
      ctx.fillStyle = '#10B98120'; drawRoundRect(ctx, lbX, lbY, lbW, lbH, 8); ctx.fill();
      ctx.strokeStyle = '#10B981'; ctx.lineWidth = 1.5; drawRoundRect(ctx, lbX, lbY, lbW, lbH, 8); ctx.stroke();
      ctx.fillStyle = '#10B981'; ctx.font = '700 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('⚖ Load Balancer', lbX + lbW / 2, lbY + 22); ctx.textAlign = 'left';

      const boxW = w * 0.36, boxH = 90, boxY = lbY + lbH + 50;
      const oldX = w * 0.05, newX = w - boxW - w * 0.05;

      // v41 box
      ctx.globalAlpha = oldFrac < 0.01 ? 0.2 : 1;
      ctx.fillStyle = '#EF444418'; drawRoundRect(ctx, oldX, boxY, boxW, boxH, 10); ctx.fill();
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 1.5; drawRoundRect(ctx, oldX, boxY, boxW, boxH, 10); ctx.stroke();
      ctx.fillStyle = '#EF4444'; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🔴 v41 (old)', oldX + boxW / 2, boxY + 26);
      ctx.font = '12px sans-serif'; ctx.fillText(Math.round(oldFrac * 100) + '% traffic', oldX + boxW / 2, boxY + 48);
      ctx.globalAlpha = 1;

      // v42 box
      ctx.fillStyle = '#10B98118'; drawRoundRect(ctx, newX, boxY, boxW, boxH, 10); ctx.fill();
      ctx.strokeStyle = '#10B981'; ctx.lineWidth = newFrac > 0.5 ? 2.5 : 1.5;
      drawRoundRect(ctx, newX, boxY, boxW, boxH, 10); ctx.stroke();
      ctx.fillStyle = '#10B981'; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🟢 v42 (canary)', newX + boxW / 2, boxY + 26);
      ctx.font = '12px sans-serif'; ctx.fillText(Math.round(newFrac * 100) + '% traffic', newX + boxW / 2, boxY + 48);
      ctx.fillStyle = '#10B98130'; drawRoundRect(ctx, newX + boxW / 2 - 36, boxY + 60, 72, 20, 4); ctx.fill();
      ctx.fillStyle = '#10B981'; ctx.font = '700 10px sans-serif'; ctx.fillText('❤ healthy', newX + boxW / 2, boxY + 73);
      ctx.textAlign = 'left';

      // Traffic bar
      const barX = oldX + boxW / 2, barXEnd = newX + boxW / 2, barW = barXEnd - barX, barY = boxY - 30;
      ctx.fillStyle = '#EF4444'; ctx.fillRect(barX, barY, barW * oldFrac, 12);
      ctx.fillStyle = '#10B981'; ctx.fillRect(barX + barW * oldFrac, barY, barW * newFrac, 12);
      ctx.strokeStyle = p.muted + '60'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, 12);

      if (oldFrac > 0.01) drawArrow(ctx, lbX + 10, lbY + lbH, oldX + boxW / 2, boxY, '#EF4444', 1.5);
      drawArrow(ctx, lbX + lbW - 10, lbY + lbH, newX + boxW / 2, boxY, '#10B981', 1.5);

      const errRate = 0.002 + newFrac * 0.001;
      ctx.fillStyle = p.muted; ctx.font = '600 11px sans-serif';
      ctx.fillText('Error rate: ' + (errRate * 100).toFixed(2) + '% ✅', w / 2 - 60, boxY + boxH + 30);

      if (prog > 0.92) {
        const fa = easeOut(clamp((prog - 0.92) / 0.06, 0, 1)); ctx.globalAlpha = fa;
        ctx.fillStyle = '#10B98130'; drawRoundRect(ctx, 20, h - 32, w - 40, 24, 6); ctx.fill();
        ctx.fillStyle = '#10B981'; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('✅ Canary complete — 100% traffic on v42, zero errors', w / 2, h - 14);
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
    <h3>Why not just replace everything at once?</h3>
    <p>A big-bang deploy of the fraud-score service could silently miscategorise millions of Amazon
    orders before anyone notices the error rate climbing. Deploy strategies spread risk by routing
    only a fraction of real traffic to the new version.</p>
    <h3>Canary Deployment</h3>
    <p>Start at 10% — "canary in a coal mine." If the canary survives (error rate, latency, and
    fraud-label distribution stay healthy), the pipeline steps up to 50% then 100%. Each step waits
    for a bake time before advancing.</p>
    <h3>Blue/Green Deployment</h3>
    <p>Two identical environments (Blue = current prod, Green = new version) run side by side.
    Traffic switches atomically at the load balancer. Rollback is equally instant: flip back to Blue.
    Costs double the compute while both are running.</p>
    <h3>Rollback</h3>
    <p>If the canary error rate breaches a threshold, the pipeline auto-reverts: traffic goes back
    to 100% v41 and pages the on-call engineer. No manual git revert needed.</p>
  </div>`;

  iqPanel.appendChild(createIQSection([
    { q: 'What is a canary deployment?', a: 'Routing a small percentage of production traffic to the new version while keeping the majority on the stable version. The canary is monitored; if healthy, traffic shifts incrementally.' },
    { q: 'What is blue/green deployment?', a: 'Running two identical production environments. Traffic switches atomically at the load balancer. Rollback is instant — flip back to blue — but you pay for double compute.' },
    { q: 'What is a feature flag and how does it differ from a canary?', a: 'A feature flag enables/disables behaviour in code at runtime without a new deploy. A canary rolls out a new binary to a subset of servers. Flags are finer-grained; canaries protect against deployment-level failures.' },
    { q: 'What signals do you watch during a canary?', a: 'Error rate, P99 latency, downstream dependency error rates, and business metrics (fraud-label distribution). An anomaly triggers auto-rollback.' },
    { q: 'How does Kubernetes support canary deployments?', a: 'Via traffic-splitting at the Ingress or service mesh layer (Istio / AWS App Mesh). You deploy a new Deployment with a small replica count and configure the mesh to route a matching traffic percentage to it.' },
  ]));
  initIQ(shell);

  canvas.replaceWith(shell);
  return () => { if (stopAnim) stopAnim(); };
}
