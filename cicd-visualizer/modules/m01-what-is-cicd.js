import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { setupCanvas, palette, drawNode, drawArrow, drawPacket, drawRoundRect, loop, easeInOut, clamp, lerp } from '../components/canvas-primitives.js';

const STAGES = [
  { icon:'\u{1F4BB}', label:'Code' },
  { icon:'\u{1F528}', label:'Build' },
  { icon:'\u{1F9EA}', label:'Test' },
  { icon:'\u{1F680}', label:'Deploy' },
  { icon:'\u{1F4E1}', label:'Monitor' },
];

export function mount(container, { markDone }){
  const canvasEl = document.createElement('canvas');
  canvasEl.className = 'stage-canvas';

  const anim = document.createElement('div');
  anim.className = 'canvas-wrap';
  anim.appendChild(canvasEl);
  anim.insertAdjacentHTML('beforeend', `
    <div class="canvas-controls">
      <button class="btn" data-act="play">▶ Play the pipeline</button>
      <button class="btn secondary" data-act="reset">Reset</button>
      <span class="ticker" style="font-size:12px;color:var(--text3)"></span>
    </div>
    <div class="caption" id="m01cap">Amazon ships a code change to production roughly every <strong>11 seconds</strong>. Press play to watch one change flow through the five stages of a CI/CD pipeline.</div>`);

  const overview = createModuleShell({
    tag:'Module 01 · Foundation',
    title:'What is CI/CD?',
    subtitle:'CI/CD is an assembly line for software. Instead of one giant risky release, every small change flows automatically through build → test → deploy — fast, and safe.',
    tabs:[
      { label:'Animation', content: anim },
      { label:'The Idea', content:`
        <div class="prose">
          <h3>The old world vs. the new world</h3>
          <p><strong>Before CI/CD:</strong> teams batched up months of changes into one enormous release. Every deploy was a scary, all-hands, weekend event. If something broke, nobody knew which of the 500 changes caused it.</p>
          <p><strong>With CI/CD:</strong> every small change is integrated and delivered continuously. Each change is tiny, so if it breaks, you know exactly what caused it and can roll back in seconds.</p>
          <h3>What the two letters mean</h3>
          <ul>
            <li><strong>CI — Continuous Integration:</strong> every code change is automatically merged, built, and tested. Bugs surface within minutes, not months.</li>
            <li><strong>CD — Continuous Delivery/Deployment:</strong> changes that pass all tests are automatically packaged and shipped to production.</li>
          </ul>
          <h3>Our running example</h3>
          <p>Across these 12 modules we follow <strong>Priya</strong>, a data engineer at Amazon, as she adds a single <code>fraud_score</code> field to the Order Analytics pipeline. We trace that one change from her laptop all the way to production — where Amazon processes about <strong>$1.3M in orders per minute</strong>.</p>
        </div>` },
      { label:'Interview Q&A', content: createIQSection([
        { q:'What problem does CI/CD actually solve?', a:'It shrinks the batch size of change. Small, frequent, automatically-tested releases mean bugs are caught early, blame is easy to assign, and rollback is cheap — versus large, infrequent, manual releases where risk compounds.' },
        { q:'What is the difference between Continuous Delivery and Continuous Deployment?', a:'Continuous <em>Delivery</em> means every passing change is <em>ready</em> to ship, but a human clicks the final button. Continuous <em>Deployment</em> removes that human — every passing change goes live automatically.' },
        { q:'Why do small, frequent deploys reduce risk?', a:'Each deploy contains fewer changes, so the surface area for bugs is smaller and the cause of any failure is obvious. Recovery is a fast rollback of one small change rather than untangling a massive release.' },
      ]) },
    ],
  });

  container.appendChild(overview);
  initTabs(overview);
  initIQ(overview);

  let stop = null;
  let playing = false;
  let t0 = null;
  const cap = anim.querySelector('#m01cap');
  const ticker = anim.querySelector('.ticker');

  function render(progress){
    const { ctx, w, h } = setupCanvas(canvasEl, 300);
    const p = palette();
    ctx.clearRect(0,0,w,h);

    const n = STAGES.length;
    const boxW = Math.min(120, (w - 40) / n - 18);
    const gap = (w - 40 - boxW*n) / (n-1);
    const boxH = 84;
    const y = 70;
    const xs = STAGES.map((_,i) => 20 + i*(boxW+gap));

    for(let i=0;i<n-1;i++){
      const x1 = xs[i]+boxW, x2 = xs[i+1];
      const reached = progress > (i+0.5)/n;
      drawArrow(ctx, x1+4, y+boxH/2, x2-4, y+boxH/2, reached ? p.accent : p.border, 2, 7);
    }

    const activeIdx = clamp(Math.floor(progress * n), 0, n-1);
    STAGES.forEach((s, i) => {
      const done = progress > (i+1)/n;
      const active = i === activeIdx && progress < 1 && progress > 0;
      drawNode(ctx, xs[i], y, boxW, boxH, {
        palette:p,
        fill: done ? 'rgba(16,185,129,0.12)' : p.bg3,
        stroke: active ? p.accent : (done ? p.accent2 : p.border),
        glow: active ? p.accent : null,
        icon: s.icon, iconSize: 26,
        label: s.label, labelColor: done||active ? p.accent2 : p.text2, labelSize: 12.5,
      });
      if(done){
        ctx.fillStyle = p.green;
        ctx.font = '700 13px system-ui';
        ctx.textAlign='center';
        ctx.fillText('✓', xs[i]+boxW-12, y+16);
      }
    });

    if(progress>0 && progress<1){
      const seg = progress * (n-1);
      const i = clamp(Math.floor(seg), 0, n-2);
      const f = easeInOut(seg - i);
      const px = lerp(xs[i]+boxW/2, xs[i+1]+boxW/2, f);
      drawPacket(ctx, px, y+boxH+34, 13, p.accent, 'ƒ');
      ctx.fillStyle = p.text3; ctx.font='11px system-ui'; ctx.textAlign='center';
      ctx.fillText('fraud_score change', px, y+boxH+60);
    }

    ctx.fillStyle = p.text3; ctx.font='11px system-ui'; ctx.textAlign='left';
    ctx.fillText('CONTINUOUS INTEGRATION', 20, 28);
    ctx.fillText('CONTINUOUS DELIVERY', w-160, 28);
  }

  function play(){
    if(playing) return;
    playing = true; t0 = null;
    const dur = 6;
    stop = loop((dt, elapsed) => {
      if(t0===null) t0 = elapsed;
      const prog = clamp((elapsed - t0)/dur, 0, 1);
      render(prog);
      const stageNames = ['committing code','building artifact','running 847 tests','deploying to production','watching live metrics'];
      const idx = clamp(Math.floor(prog*5),0,4);
      cap.innerHTML = prog>=1
        ? 'Done. The <code>fraud_score</code> change is live in production and being monitored — all automatic, no human gates. That is a full CI/CD cycle.'
        : `Stage ${idx+1}/5: <strong>${stageNames[idx]}</strong>…`;
      ticker.textContent = `Amazon deploys: ${Math.floor(prog*4300).toLocaleString()} times today`;
      if(prog>=1){ playing=false; if(stop){stop();stop=null;} markDone(); }
    });
  }

  render(0);
  anim.querySelector('[data-act=play]').addEventListener('click', play);
  anim.querySelector('[data-act=reset]').addEventListener('click', () => {
    if(stop){stop();stop=null;} playing=false; render(0);
    cap.innerHTML = 'Reset. Press play to watch the <code>fraud_score</code> change flow through all five stages again.';
    ticker.textContent='';
  });
  window.addEventListener('resize', () => { if(!playing) render(0); });

  return () => { if(stop) stop(); };
}
