import { MODULES, renderNav, updateProgress } from './components/nav.js';
import { initTabs, initIQ } from './components/module-shell.js';

// ── State ──────────────────────────────────────────────────────────────────
const done = new Set(JSON.parse(localStorage.getItem('kafka-done') || '[]'));
let currentId = null;
let cleanupFn = null;

// ── Module loaders ─────────────────────────────────────────────────────────
const LOADERS = {
  m01: () => import('./modules/m01-intro.js'),
  m02: () => import('./modules/m02-messaging.js'),
  m03: () => import('./modules/m03-architecture.js'),
  m04: () => import('./modules/m04-producer.js'),
  m05: () => import('./modules/m05-broker.js'),
  m06: () => import('./modules/m06-partitions.js'),
  m07: () => import('./modules/m07-replication.js'),
  m08: () => import('./modules/m08-consumer-groups.js'),
  m09: () => import('./modules/m09-offsets.js'),
  m10: () => import('./modules/m10-retention.js'),
  m11: () => import('./modules/m11-delivery.js'),
  m12: () => import('./modules/m12-connect.js'),
  m13: () => import('./modules/m13-streams.js'),
  m14: () => import('./modules/m14-schema-registry.js'),
  m15: () => import('./modules/m15-security.js'),
  m16: () => import('./modules/m16-monitoring.js'),
  m17: () => import('./modules/m17-performance.js'),
  m18: () => import('./modules/m18-failure.js'),
  m19: () => import('./modules/m19-amazon-pipeline.js'),
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
  localStorage.setItem('kafka-done', JSON.stringify([...done]));
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
const savedTheme = localStorage.getItem('kafka-theme') || 'dark';
root.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('kafka-theme', next);
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
