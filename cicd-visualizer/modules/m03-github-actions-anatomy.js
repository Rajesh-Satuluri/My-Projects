import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { setupCanvas, palette, drawNode, drawArrow, drawRoundRect, loop, clamp } from '../components/canvas-primitives.js';

const YAML_LINES = [
  { t:'name: OrderFlow Pipeline', k:'name' },
  { t:'on:', k:'on' },
  { t:'  push:', k:'on' },
  { t:'    branches: [main]', k:'on' },
  { t:'jobs:', k:'jobs' },
  { t:'  build:', k:'jobs' },
  { t:'    runs-on: ubuntu-latest', k:'runner' },
  { t:'    steps:', k:'steps' },
  { t:'      - uses: actions/checkout@v4', k:'steps' },
  { t:'      - run: pip install -r req.txt', k:'steps' },
  { t:'      - run: pytest', k:'steps' },
];

export function mount(container, { markDone }){
  const canvasEl=document.createElement('canvas'); canvasEl.className='stage-canvas';
  const anim=document.createElement('div'); anim.className='canvas-wrap'; anim.appendChild(canvasEl);
  anim.insertAdjacentHTML('beforeend', `
    <div class="canvas-controls">
      <button class="btn" data-act="play">▶ Trace one push</button>
      <button class="btn secondary" data-act="reset">Reset</button>
    </div>
    <div class="caption" id="m03cap">The moment Priya's PR merges, a <code>push</code> event fires. GitHub Actions reads the workflow YAML and springs into action — no human presses anything.</div>`);

  const overview = createModuleShell({
    tag:'Module 03 · Foundation',
    title:'GitHub Actions Anatomy',
    subtitle:'A workflow is just a YAML file. It says: on this trigger, run these jobs, each made of steps, on a fresh runner. Learn these four words and you can read any pipeline.',
    tabs:[
      { label:'Animation', content: anim },
      { label:'The Idea', content:`
        <div class="prose">
          <h3>Four words that describe every pipeline</h3>
          <ul>
            <li><strong>Trigger (<code>on:</code>)</strong> — the event that starts the workflow. Here: a <code>push</code> to <code>main</code>. Others: pull requests, schedules, manual dispatch.</li>
            <li><strong>Job</strong> — a group of steps that run together on one machine. Jobs can run in parallel or depend on each other.</li>
            <li><strong>Step</strong> — a single command (<code>run: pytest</code>) or a reusable action (<code>uses: actions/checkout</code>). Steps run in order, top to bottom.</li>
            <li><strong>Runner</strong> — the fresh virtual machine that executes the job. It spins up clean, does the work, and is thrown away — so builds are reproducible.</li>
          </ul>
          <h3>Why a fresh runner every time?</h3>
          <p>A clean machine means works on my laptop can never hide a missing dependency. If the build passes on a blank Ubuntu runner, it will pass anywhere.</p>
        </div>` },
      { label:'Interview Q&A', content: createIQSection([
        { q:'What is the difference between a job and a step?', a:'A job is a unit of execution that runs on its own runner; a step is a single task within a job. Steps in a job share the same filesystem and run sequentially; jobs are isolated and can run in parallel or with dependencies (needs:).' },
        { q:'What does runs-on: ubuntu-latest give you?', a:'A fresh, ephemeral virtual machine provisioned per job. Because it starts clean and is discarded after, builds are reproducible and free of leftover state from previous runs.' },
        { q:'Name three trigger types besides push.', a:'pull_request (validate a PR before merge), schedule (cron — nightly data quality runs), and workflow_dispatch (manual button). Also: tags, releases, and events from other workflows.' },
      ]) },
    ],
  });
  container.appendChild(overview);
  initTabs(overview); initIQ(overview);

  let stop=null,playing=false,t0=null;
  const cap=anim.querySelector('#m03cap');
  const HL={ name:0, on:0.15, jobs:0.4, runner:0.58, steps:0.72 };

  function render(prog){
    const { ctx, w, h }=setupCanvas(canvasEl,360);
    const p=palette();
    ctx.clearRect(0,0,w,h);

    const yx=24,yy=30,yw=Math.min(340,w*0.46),lineH=27;
    drawRoundRect(ctx,yx,yy,yw,YAML_LINES.length*lineH+24,10);
    ctx.fillStyle=p.bg3; ctx.fill(); ctx.strokeStyle=p.border; ctx.lineWidth=1.5; ctx.stroke();
    ctx.textAlign='left'; ctx.textBaseline='middle';
    YAML_LINES.forEach((ln,i)=>{
      if(prog<i*0.03) return;
      const lit=(ln.k==='on'&&prog>=HL.on&&prog<HL.jobs)||(ln.k==='jobs'&&prog>=HL.jobs&&prog<HL.runner)||(ln.k==='runner'&&prog>=HL.runner&&prog<HL.steps)||(ln.k==='steps'&&prog>=HL.steps);
      const ly=yy+18+i*lineH+6;
      if(lit){ ctx.fillStyle=p.accent+'22'; drawRoundRect(ctx,yx+6,ly-11,yw-12,22,5); ctx.fill(); }
      ctx.fillStyle=lit?p.accent2:p.text2;
      ctx.font='13px ui-monospace,monospace';
      ctx.fillText(ln.t,yx+14,ly);
    });

    const rx=yx+yw+40,rw=w-rx-24;
    if(rw<120) return;

    if(prog>=HL.on){
      drawNode(ctx,rx,34,rw,46,{ palette:p, icon:'\u{1F4E5}', iconSize:18,
        fill:prog<HL.jobs?'rgba(16,185,129,0.14)':p.bg3, stroke:prog<HL.jobs?p.accent:p.border,
        glow:prog<HL.jobs?p.accent:null });
      ctx.fillStyle=p.text; ctx.font='600 12px system-ui'; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText('push event → main',rx+44,57);
    }
    if(prog>=HL.jobs){
      drawArrow(ctx,rx+rw/2,80,rx+rw/2,104,p.accent,2,7);
      drawNode(ctx,rx,108,rw,150,{ palette:p, fill:p.bg3,
        stroke:prog>=HL.runner&&prog<HL.steps?p.accent:p.border,
        glow:prog>=HL.runner&&prog<HL.steps?p.accent:null, radius:12 });
      ctx.fillStyle=p.text2; ctx.font='600 11px system-ui'; ctx.textAlign='left';
      ctx.fillText('\u{1F5A5}\u{FE0F} runner: ubuntu-latest',rx+12,126);
      ctx.fillStyle=p.accent2; ctx.font='700 12px system-ui';
      ctx.fillText('job: build',rx+12,146);
      if(prog>=HL.steps){
        ['checkout','pip install','pytest'].forEach((s,i)=>{
          if(prog<HL.steps+i*0.07) return;
          const sy=160+i*30;
          drawRoundRect(ctx,rx+12,sy,rw-24,24,6);
          ctx.fillStyle=p.bg; ctx.fill(); ctx.strokeStyle=p.accent+'55'; ctx.lineWidth=1; ctx.stroke();
          ctx.fillStyle=p.green; ctx.font='700 11px system-ui'; ctx.textAlign='left';
          ctx.fillText('▸',rx+20,sy+12);
          ctx.fillStyle=p.text2; ctx.font='11px ui-monospace,monospace';
          ctx.fillText(s,rx+34,sy+12);
        });
      }
    }
  }

  function play(){
    if(playing)return; playing=true; t0=null;
    const dur=6;
    stop=loop((dt,el)=>{
      if(t0===null)t0=el;
      const prog=clamp((el-t0)/dur,0,1);
      render(prog);
      if(prog<HL.on) cap.innerHTML='The workflow YAML is read top-to-bottom…';
      else if(prog<HL.jobs) cap.innerHTML='<strong>on:</strong> — this is the <strong>trigger</strong>. A push to main starts everything.';
      else if(prog<HL.runner) cap.innerHTML='<strong>jobs:</strong> — one <strong>job</strong> named <code>build</code> is queued.';
      else if(prog<HL.steps) cap.innerHTML='<strong>runs-on:</strong> — a fresh <strong>runner</strong> (clean Ubuntu VM) spins up to execute the job.';
      else cap.innerHTML='<strong>steps:</strong> — commands run in order: checkout → install → test. Each ▸ is one step.';
      if(prog>=1){ playing=false; if(stop){stop();stop=null;} markDone(); }
    });
  }

  render(0);
  anim.querySelector('[data-act=play]').addEventListener('click',play);
  anim.querySelector('[data-act=reset]').addEventListener('click',()=>{ if(stop){stop();stop=null;} playing=false; render(0); cap.innerHTML='Reset. Press play to trace a push through trigger → job → runner → steps.'; });
  window.addEventListener('resize',()=>{ if(!playing) render(0); });
  return ()=>{ if(stop) stop(); };
}
