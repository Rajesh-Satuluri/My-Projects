import { MODULES, renderNav, updateProgress } from './components/nav.js';
import { initTabs, initIQ } from './components/module-shell.js';

// ── State ──────────────────────────────────────────────────────────────────
const done = new Set(JSON.parse(localStorage.getItem('databricks-done') || '[]'));
let currentId = null;
let cleanupFn = null;

// ── Module loaders ─────────────────────────────────────────────────────────
const LOADERS = {
  m01: () => import('./modules/m01-why-databricks.js'),
  m02: () => import('./modules/m02-lakehouse-architecture.js'),
  m03: () => import('./modules/m03-delta-lake-internals.js'),
  m04: () => import('./modules/m04-clusters-runtimes.js'),
  m05: () => import('./modules/m05-photon-engine.js'),
  m06: () => import('./modules/m06-structured-streaming.js'),
  m07: () => import('./modules/m07-unity-catalog.js'),
  m08: () => import('./modules/m08-medallion-architecture.js'),
  m09: () => import('./modules/m09-delta-optimizations.js'),
  m10: () => import('./modules/m10-workflows-jobs.js'),
  m11: () => import('./modules/m11-mlflow-model-serving.js'),
  m12: () => import('./modules/m12-cost-performance.js'),
  m13: () => import('./modules/m13-interview.js'),
};

// ── Navigate ───────────────────────────────────────────────────────────────
async function navigate(id) {
  const mod = MODULES.find(m => m.id === id);
  if (!mod) { id = MODULES[0].id; }

  if (currentId === id) return;

  if (cleanupFn) { cleanupFn(); cleanupFn = null; }

  currentId = id;
  renderNav(id, done);

  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) {
    breadcrumb.innerHTML = `${mod.group} &rsaquo; <strong>${mod.label}</strong>`;
  }

  const canvas = document.getElementById('module-canvas');
  canvas.innerHTML = '<div class="coming-soon"><div class="coming-soon-icon">⏳</div><h3>Loading…</h3></div>';
  canvas.scrollTop = 0;

  try {
    const loader = LOADERS[id];
    if (!loader) throw new Error('No loader for ' + id);
    const m = await loader();
    canvas.innerHTML = '';
    cleanupFn = m.mount(canvas) || null;
    initTabs(canvas);
    initIQ(canvas);
    markDone(id);
  } catch (e) {
    console.error('Module load error', e);
    canvas.innerHTML = `
      <div class="coming-soon">
        <div class="coming-soon-icon">🚧</div>
        <h3>Coming Soon</h3>
        <p>${mod.desc}</p>
      </div>`;
  }
}

function markDone(id) {
  done.add(id);
  localStorage.setItem('databricks-done', JSON.stringify([...done]));
  updateProgress(done);
  renderNav(currentId, done);
}

// ── Router ─────────────────────────────────────────────────────────────────
function getHash() {
  const h = location.hash.slice(1);
  return MODULES.find(m => m.id === h) ? h : MODULES[0].id;
}

window.addEventListener('hashchange', () => navigate(getHash()));

document.getElementById('nav-list').addEventListener('click', e => {
  const item = e.target.closest('.nav-item[data-id]');
  if (item) {
    e.preventDefault();
    location.hash = item.dataset.id;
  }
});

// ── Sidebar toggle ─────────────────────────────────────────────────────────
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});

// ── Theme toggle ───────────────────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;
const savedTheme = localStorage.getItem('databricks-theme') || 'dark';
root.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('databricks-theme', next);
});

// ── Tooltip ────────────────────────────────────────────────────────────────
export const tooltip = {
  el: document.getElementById('tooltip'),
  show(text, x, y) {
    this.el.textContent = text;
    this.el.classList.remove('hidden');
    const tw = this.el.offsetWidth, th = this.el.offsetHeight;
    this.el.style.left = Math.min(x + 12, window.innerWidth - tw - 8) + 'px';
    this.el.style.top  = Math.min(y + 12, window.innerHeight - th - 8) + 'px';
  },
  hide() { this.el.classList.add('hidden'); }
};

// ── Boot ───────────────────────────────────────────────────────────────────
renderNav(null, done);
updateProgress(done);
navigate(getHash());
