import { MODULES, renderNav, updateProgress } from './components/nav.js';

const DONE_KEY = 'cicd-done';
const THEME_KEY = 'cicd-theme';
const done = new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]'));

const LOADERS = {
  m01: () => import('./modules/m01-what-is-cicd.js'),
  m02: () => import('./modules/m02-source-control-flow.js'),
  m03: () => import('./modules/m03-github-actions-anatomy.js'),
  m04: () => import('./modules/m04-build-and-test.js'),
  m05: () => import('./modules/m05-docker-containerization.js'),
  m06: () => import('./modules/m06-environment-strategy.js'),
  m07: () => import('./modules/m07-secrets-config.js'),
  m08: () => import('./modules/m08-data-pipeline-cicd.js'),
  m09: () => import('./modules/m09-deploy-strategies.js'),
  m10: () => import('./modules/m10-observability-alerts.js'),
  m11: () => import('./modules/m11-infrastructure-as-code.js'),
  m12: () => import('./modules/m12-interview-simulator.js'),
};

const canvas = document.getElementById('module-canvas');
const breadcrumb = document.getElementById('breadcrumb');
let activeId = null;
let activeCleanup = null;

function saveDone(){ localStorage.setItem(DONE_KEY, JSON.stringify([...done])); }

function markDone(id){
  if(!done.has(id)){
    done.add(id);
    saveDone();
    updateProgress(done);
    renderNav(activeId, done, selectModule);
  }
}

async function selectModule(id){
  if(!LOADERS[id]) return;
  if(typeof activeCleanup === 'function'){ try{ activeCleanup(); }catch(e){} activeCleanup=null; }
  activeId = id;
  renderNav(activeId, done, selectModule);
  const mod = MODULES.find(m => m.id === id);
  breadcrumb.innerHTML = `<span class="crumb-icon">${mod.icon}</span><span class="crumb-title">${mod.label}</span>`;
  canvas.innerHTML = `<div class="module"><div class="module-tag">Loading…</div></div>`;
  canvas.scrollTop = 0;
  try{
    const m = await LOADERS[id]();
    canvas.innerHTML = '';
    activeCleanup = m.mount(canvas, { markDone: () => markDone(id) }) || null;
  }catch(err){
    canvas.innerHTML = `<div class="module"><div class="module-tag">Error</div><p class="prose">This module hasn't been built yet.<br><br><code>${String(err.message||err)}</code></p></div>`;
  }
  location.hash = id;
}

const themeToggle = document.getElementById('theme-toggle');
function applyTheme(t){ document.documentElement.setAttribute('data-theme', t); localStorage.setItem(THEME_KEY, t); }
applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});

document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});

renderNav(activeId, done, selectModule);
updateProgress(done);
const start = (location.hash || '').replace('#','');
selectModule(LOADERS[start] ? start : 'm01');
