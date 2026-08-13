import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { setupCanvas, palette, drawNode, drawArrow, drawPacket, drawRoundRect, loop, clamp, lerp, easeOut } from '../components/canvas-primitives.js';

const LAYERS = [
  { label:'Unit Tests', count:600, time:'12s', color:'#10B981', y:200 },
  { label:'Integration', count:200, time:'45s', color:'#3B82F6', y:140 },
  { label:'E2E', count:47, time:'3m', color:'#8B5CF6', y:80 },
];

export function mount(container, { markDone }){
  const canvasEl=document.createElement('canvas'); canvasEl.className='stage-canvas';
  const anim=document.createElement('div'); anim.className='canvas-wrap'; anim.appendChild(canvasEl);
  anim.insertAdjacentHTML('beforeend', `
    <div class="canvas-controls">
      <button class="btn" data-act="play">▶ Run 847 tests</button>
      <button class="btn" data-act="fail" style="background:var(--red);border-color:var(--red)">⚠ Inject a failure</button>
      <button class="btn secondary" data-act="reset">Reset</button>
    </div>
    <div class="caption" id="m04cap">Before any code ships, <strong>847 automated tests</strong> must pass. They are organised into a pyramid: many fast unit tests at the bottom, fewer slow E2E tests at the top. Press <em>Run</em> to watch them all go green — or inject a failure to see what happens.</div>`);

  const overview = createModuleShell({
    tag:'Module 04 · Foundation',
    title:'Build & Test Stage',
    subtitle:'The test suite is the safety net. If even one test fails the pipeline stops — the change never ships. Fast feedback means Priya fixes bugs in minutes, not after they reach customers.',
    tabs:[
      { label:'Animation', content: anim },
      { label:'The Idea', content:`
        <div class="prose">
          <h3>The test pyramid</h3>
          <p>Tests are arranged in a pyramid for a reason: the wider the base, the cheaper the tests. You want <em>many</em> cheap tests and <em>few</em> expensive ones.</p>
          <ul>
            <li><strong>Unit tests (bottom, 600 tests, 12s):</strong> test a single function in isolation — fast, cheap, no network. The first line of defence.</li>
            <li><strong>Integration tests (middle, 200 tests, 45s):</strong> test two or more components together. Slower, but catch things unit tests miss.</li>
            <li><strong>E2E tests (top, 47 tests, 3m):</strong> simulate a real user placing an order end-to-end. Slow but the ultimate proof the system works.</li>
          </ul>
          <h3>What happens on failure?</h3>
          <p>The pipeline stops immediately. Priya gets a Slack notification with the failing test and exact error. No artifact is built, nothing deployed. Cost of fixing here: <strong>minutes</strong>. Cost if it reached production: hours of incident response.</p>
          <h3>The artifact</h3>
          <p>If all 847 tests pass, the runner packages the service into a signed <strong>artifact</strong> with a unique checksum so every downstream stage can verify it was not tampered with.</p>
        </div>` },
      { label:'Interview Q&A', content: createIQSection([
        { q:'Why run unit tests before integration tests?', a:'Unit tests are fast (seconds) and cheap. They give the earliest possible signal. Running the slow integration suite only to fail on a unit assertion would waste 45+ seconds of runner time per commit.' },
        { q:'A test has been flaky for weeks. What do you do?', a:'First quarantine it (mark skip or move to a flaky suite) so it stops blocking real failures. Then fix the root cause — usually timing, external state, or a missing mock. Deleting it is acceptable if it tests nothing unique.' },
        { q:'What should be in CI that is not a unit test?', a:'Linting, static analysis (security scanners, type checkers), dependency vulnerability scans (Dependabot, Snyk), and code coverage gates.' },
      ]) },
    ],
  });
  container.appendChild(overview); initTabs(overview); initIQ(overview);

  let stop=null,playing=false,t0=null;
  const cap=anim.querySelector('#m04cap');

  function render(prog,failed,failLayer){
    const { ctx, w, h }=setupCanvas(canvasEl,320);
    const p=palette();
    ctx.clearRect(0,0,w,h);

    const capX=Math.min(220,w*0.36),capH=70;
    const pX=capX+40,pW=w-pX-30;

    LAYERS.forEach((l,i)=>{
      const baseW=capX*(1.0-i*0.22);
      const bx=(capX-baseW)/2+20;
      const revealed=prog>i*0.25;
      const filling=prog>i*0.25&&prog<(i+1)*0.25+0.5;
      const filled=prog>=(i+1)*0.25+0.5;
      const fail=failed&&failLayer===i;
      const bc=fail?'rgba(239,68,68,0.2)':revealed?l.color+'1a':p.bg3;
      const sc=fail?'#EF4444':revealed?l.color:p.border;
      drawRoundRect(ctx,bx,l.y,baseW,capH,8);
      ctx.fillStyle=bc; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle=sc; ctx.stroke();
      if(revealed){
        ctx.fillStyle=fail?'#EF4444':l.color; ctx.font='600 12px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(l.label,capX/2+20,l.y+28);
        ctx.fillStyle=p.text3; ctx.font='11px system-ui';
        ctx.fillText(`${l.count} tests · ${l.time}`,capX/2+20,l.y+46);
      }
      if(filling||filled){
        const dotCount=Math.min(l.count,24);
        const dots=filled?dotCount:Math.floor(dotCount*(prog-(i*0.25))/(0.5)*2);
        for(let d=0;d<Math.min(dots,dotCount);d++){
          const dx=bx+10+(d%(dotCount/3))*((baseW-20)/8)+4;
          const dy=l.y+10+Math.floor(d/(dotCount/3))*18;
          ctx.fillStyle=fail&&d===dots-1?'#EF4444':l.color;
          ctx.beginPath(); ctx.arc(dx,dy,3.5,0,Math.PI*2); ctx.fill();
        }
      }
    });

    if(prog>0&&pW>100){
      const pY=40;
      const STATUS=[{n:'Build',t:0.05},{n:'Unit',t:0.28},{n:'Integration',t:0.54},{n:'E2E',t:0.80},{n:'Package',t:0.96}];
      STATUS.forEach((s,i)=>{
        const done=prog>=s.t+0.12;
        const active=prog>=s.t&&!done;
        const isFail=failed&&((failLayer===0&&s.n==='Unit')||(failLayer===1&&s.n==='Integration')||(failLayer===2&&s.n==='E2E'));
        const fill=isFail&&done?'rgba(239,68,68,0.15)':done?'rgba(16,185,129,0.1)':active?'rgba(16,185,129,0.05)':p.bg3;
        const stk=isFail&&done?'#EF4444':done?p.green:active?p.accent:p.border;
        drawNode(ctx,pX,pY+i*46,pW,38,{ palette:p,fill,stroke:stk,radius:9 });
        ctx.fillStyle=isFail&&done?'#EF4444':done?p.green:p.text2;
        ctx.font='600 12px system-ui'; ctx.textAlign='left';
        ctx.fillText(isFail&&done?'✗ '+s.n:done?'✓ '+s.n:active?'… '+s.n:'  '+s.n,pX+12,pY+i*46+19);
        if(isFail&&done){ ctx.fillStyle='#EF4444'; ctx.font='700 11px system-ui'; ctx.fillText('STOPPED',pX+pW-68,pY+i*46+19); }
      });
    }

    if(!failed&&prog>=1&&pW>100){
      drawRoundRect(ctx,pX,248,pW,44,10);
      ctx.fillStyle='rgba(16,185,129,0.15)'; ctx.fill(); ctx.strokeStyle=p.accent; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle=p.accent2; ctx.font='700 12px system-ui'; ctx.textAlign='center';
      ctx.fillText('\u{1F4E6} artifact sealed — sha256:a3f9c12…',pX+pW/2,270);
    }
  }

  function play(fail){
    if(playing)return; playing=true; t0=null;
    const dur=fail?3.5:6;
    const failAt=fail?Math.floor(Math.random()*3):null;
    let didFail=false;
    stop=loop((dt,el)=>{
      if(t0===null)t0=el;
      let prog=clamp((el-t0)/dur,0,1);
      const fl=failAt!==null&&prog>0.2?failAt:null;
      if(fail&&prog>=0.38&&!didFail){ didFail=true; if(stop){stop();stop=null;} playing=false; }
      render(prog,didFail,fl);
      if(!didFail){
        if(prog<0.3) cap.innerHTML='<strong>600 unit tests</strong> running — each tests a single function in isolation. Fast, cheap, first line of defence.';
        else if(prog<0.6) cap.innerHTML='<strong>200 integration tests</strong> — checking that the fraud scorer communicates correctly with the database and Kafka.';
        else if(prog<0.88) cap.innerHTML='<strong>47 E2E tests</strong> — simulating a real order from cart to confirmation. Slow but thorough.';
        else cap.innerHTML='All 847 tests passed. The service is <strong>packaged into a signed artifact</strong> ready for deployment.';
      } else {
        cap.innerHTML='<strong style="color:var(--red)">⚠ Pipeline stopped.</strong> One test failed. No artifact is built. No code ships. Priya gets a Slack message with the failing test name and stack trace.';
      }
      if(!didFail&&prog>=1){ playing=false; if(stop){stop();stop=null;} markDone(); }
    });
  }

  render(0,false,null);
  anim.querySelector('[data-act=play]').addEventListener('click',()=>play(false));
  anim.querySelector('[data-act=fail]').addEventListener('click',()=>play(true));
  anim.querySelector('[data-act=reset]').addEventListener('click',()=>{ if(stop){stop();stop=null;} playing=false; render(0,false,null); cap.innerHTML='Reset. Run the suite or inject a failure to see how the pipeline responds.'; });
  window.addEventListener('resize',()=>{ if(!playing) render(0,false,null); });
  return ()=>{ if(stop) stop(); };
}
