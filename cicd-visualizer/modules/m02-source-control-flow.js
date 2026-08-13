import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { setupCanvas, palette, drawArrow, drawPacket, loop, easeInOut, clamp, lerp } from '../components/canvas-primitives.js';

export function mount(container, { markDone }){
  const canvasEl = document.createElement('canvas');
  canvasEl.className = 'stage-canvas';
  const anim = document.createElement('div');
  anim.className = 'canvas-wrap';
  anim.appendChild(canvasEl);
  anim.insertAdjacentHTML('beforeend', `
    <div class="canvas-controls">
      <button class="btn" data-act="play">▶ Priya opens a branch</button>
      <button class="btn secondary" data-act="reset">Reset</button>
    </div>
    <div class="caption" id="m02cap">Priya needs to add the <code>fraud_score</code> field. She never edits <strong>main</strong> directly — she branches off, commits, and merges back through a pull request. Watch the git history build itself.</div>`);

  const overview = createModuleShell({
    tag:'Module 02 · Foundation',
    title:'Source Control Flow',
    subtitle:'Every CI/CD pipeline starts with git. Branches isolate work-in-progress; pull requests are the gate where automation and review happen before code reaches main.',
    tabs:[
      { label:'Animation', content: anim },
      { label:'The Idea', content:`
        <div class="prose">
          <h3>Why not just edit main?</h3>
          <p><code>main</code> is sacred — it is what gets deployed to production. If everyone edited it directly, a half-finished change could ship to customers. So work happens on a <strong>branch</strong>: an isolated copy where Priya can commit freely without affecting anyone.</p>
          <h3>Trunk-based development</h3>
          <p>Amazon teams keep branches <strong>short-lived — under 24 hours</strong>. The longer a branch lives, the more <code>main</code> drifts away from it, and the uglier the merge conflicts. Small branches merge cleanly and often.</p>
          <ul>
            <li><strong>Long-lived branches</strong> → main drifts → painful merge conflicts.</li>
            <li><strong>Trunk-based</strong> → merge daily → conflicts stay tiny.</li>
          </ul>
          <h3>Feature flags</h3>
          <p>Priya's <code>fraud_score</code> code can be merged to main while still <em>disabled</em> behind a <strong>feature flag</strong>. The code ships dark, and the team flips it on only when ready — decoupling deploy from release.</p>
        </div>` },
      { label:'Interview Q&A', content: createIQSection([
        { q:'What is trunk-based development?', a:'A branching model where all developers integrate into a single main branch through very short-lived branches (hours, not weeks). It minimizes merge divergence and keeps the codebase continuously integrable — the CI in CI/CD.' },
        { q:'Why merge through a pull request instead of pushing to main?', a:'The PR is the gate: it triggers automated CI (build + tests), enables code review, and enforces branch protection. Nothing reaches main without passing through it.' },
        { q:'How do feature flags decouple deploy from release?', a:'Code can be deployed to production while dormant behind a flag. Deploy (shipping the binary) becomes a low-risk technical event; release (turning the feature on for users) becomes a separate business decision you can flip — or roll back — instantly.' },
      ]) },
    ],
  });

  container.appendChild(overview);
  initTabs(overview); initIQ(overview);

  let stop=null,playing=false,t0=null;
  const cap=anim.querySelector('#m02cap');

  function render(prog){
    const { ctx, w, h } = setupCanvas(canvasEl, 300);
    const p = palette();
    ctx.clearRect(0,0,w,h);

    const mainY=110, branchY=210;
    const x0=50, x1=w-50, span=x1-x0;

    ctx.fillStyle=p.text3; ctx.font='600 12px system-ui'; ctx.textAlign='left';
    ctx.fillText('main', 12, mainY+4);
    ctx.fillText('feature/', 12, branchY-2);
    ctx.fillText('fraud-score', 12, branchY+12);

    const mainCommits=[0.06,0.20,0.85,0.97];
    const forkX=x0+span*0.20;
    const mergeX=x0+span*0.85;

    ctx.strokeStyle=p.border; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(x0,mainY); ctx.lineTo(x0+span*clamp(prog/0.97,0,1),mainY); ctx.stroke();

    if(prog>0.20){
      const bEnd=lerp(forkX+40,mergeX,clamp((prog-0.20)/0.55,0,1));
      ctx.strokeStyle=p.accent; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(forkX,mainY); ctx.quadraticCurveTo(forkX+20,branchY,forkX+40,branchY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(forkX+40,branchY); ctx.lineTo(Math.min(bEnd,mergeX),branchY); ctx.stroke();
      if(prog>0.80){
        ctx.beginPath(); ctx.moveTo(mergeX-40,branchY); ctx.quadraticCurveTo(mergeX-20,branchY,mergeX,mainY); ctx.stroke();
      }
    }

    function dot(x,y,color){
      ctx.beginPath(); ctx.arc(x,y,7,0,Math.PI*2);
      ctx.fillStyle=p.bg3; ctx.fill();
      ctx.lineWidth=2.5; ctx.strokeStyle=color; ctx.stroke();
    }

    mainCommits.forEach(c=>{ if(prog>=c) dot(x0+span*c,mainY,p.text2); });
    if(prog>0.20){
      const bcs=[0.42,0.60];
      bcs.forEach(c=>{ if(prog>=c){ const bx=lerp(forkX+40,mergeX-40,(c-0.42)/0.18); dot(bx,branchY,p.accent); } });
    }

    if(prog>0.80){
      const a=clamp((prog-0.80)/0.05,0,1);
      ctx.globalAlpha=a;
      ctx.fillStyle=p.accent; ctx.font='700 11px system-ui'; ctx.textAlign='center';
      ctx.fillText('✓ PR MERGED', mergeX, mainY-20);
      ctx.globalAlpha=1;
    }
    if(prog>=0.97){
      ctx.fillStyle=p.amber; ctx.font='600 12px system-ui'; ctx.textAlign='center';
      ctx.fillText('\u{1F6A9} shipped dark behind a feature flag', w/2, 272);
    }
    if(prog>0.22&&prog<0.80){
      const px=lerp(forkX+40,mergeX-40,clamp((prog-0.22)/0.58,0,1));
      drawPacket(ctx,px,branchY-28,9,p.accent2,'');
    }
  }

  function play(){
    if(playing)return; playing=true; t0=null;
    const dur=6;
    stop=loop((dt,el)=>{
      if(t0===null)t0=el;
      const prog=clamp((el-t0)/dur,0,1);
      render(prog);
      if(prog<0.20) cap.innerHTML='Priya branches off <code>main</code> into <code>feature/fraud-score</code> — an isolated copy she can break freely.';
      else if(prog<0.80) cap.innerHTML='She makes <strong>2 commits</strong> on the branch. <code>main</code> keeps moving underneath — but her work is safely isolated.';
      else if(prog<0.97) cap.innerHTML='Her pull request passes CI and review, then <strong>merges back to main</strong>.';
      else cap.innerHTML='Merged — but <strong>dark</strong>. The <code>fraud_score</code> code is in production behind a feature flag, off until the team flips it on.';
      if(prog>=1){ playing=false; if(stop){stop();stop=null;} markDone(); }
    });
  }

  render(0);
  anim.querySelector('[data-act=play]').addEventListener('click',play);
  anim.querySelector('[data-act=reset]').addEventListener('click',()=>{ if(stop){stop();stop=null;} playing=false; render(0); cap.innerHTML='Reset. Press play to replay Priya branching, committing, and merging.'; });
  window.addEventListener('resize',()=>{ if(!playing) render(0); });
  return ()=>{ if(stop) stop(); };
}
