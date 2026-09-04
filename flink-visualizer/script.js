import { MODULES, renderNav, updateProgress } from './components/nav.js';

// ── Module loaders (lazy) ─────────────────────────────────────────────────
const LOADERS = {
  m01: () => import('./modules/m01-intro.js'),
  m02: () => import('./modules/m02-placeholder.js'),
  m03: () => import('./modules/m03-placeholder.js'),
  m04: () => import('./modules/m04-placeholder.js'),
  m05: () => import('./modules/m05-placeholder.js'),
  m06: () => import('./modules/m06-placeholder.js'),
  m07: () => import('./modules/m07-placeholder.js'),
  m08: () => import('./modules/m08-placeholder.js'),
  m09: () => import('./modules/m09-placeholder.js'),
  m10: () => import('./modules/m10-placeholder.js'),
  m11: () => import('./modules/m11-placeholder.js'),
  m12: () => import('./modules/m12-placeholder.js'),
  m13: () => import('./modules/m13-placeholder.js'),
  m14: () => import('./modules/m14-placeholder.js'),
  m15: () => import('./modules/m15-placeholder.js'),
  m16: () => import('./modules/m16-placeholder.js'),
  m17: () => import('./modules/m17-placeholder.js'),
  m18: () => import('./modules/m18-placeholder.js'),
  m19: () => import('./modules/m19-placeholder.js'),
};

// ── State ─────────────────────────────────────────────────────────────────
const done = new Set(JSON.parse(localStorage.getItem('flink_done') || '[]'));
let activeId = null;
let activeCleanup = null;

// ── Router ────────────────────────────────────────────────────────────────
async function navigate(id) {
  if (!LOADERS[id]) { renderWelcome(); return; }
  if (id === activeId) return;

  if (activeCleanup) { try { activeCleanup(); } catch(e) {} }
  activeCleanup = null;
  activeId = id;

  const canvas = document.getElementById('module-canvas');
  canvas.innerHTML = '<div class="welcome-screen"><div class="welcome-logo" style="font-size:48px;animation:glow-pulse 2s infinite">⚡</div></div>';

  const mod = MODULES.find(m => m.id === id);
  updateBreadcrumb(mod);
  renderNav(id, done);

  try {
    const module = await LOADERS[id]();
    if (activeId !== id) return;
    canvas.innerHTML = '';
    activeCleanup = module.mount(canvas) || null;

    // Mark done after 30s of viewing
    if (!done.has(id)) {
      setTimeout(() => {
        if (activeId === id) {
          done.add(id);
          localStorage.setItem('flink_done', JSON.stringify([...done]));
          renderNav(id, done);
          updateProgress(done);
        }
      }, 30000);
    }
    updateProgress(done);
  } catch(err) {
    console.error('Module load error:', err);
    canvas.innerHTML = `<div class="welcome-screen">
      <div style="font-size:48px">🚧</div>
      <div class="welcome-title" style="font-size:28px;margin-top:16px">Coming Soon</div>
      <p class="welcome-sub">This module is being built in the next iteration.</p>
    </div>`;
  }
}

function updateBreadcrumb(mod) {
  const bc = document.getElementById('breadcrumb');
  if (!bc) return;
  if (!mod) { bc.innerHTML = ''; return; }
  bc.innerHTML = `
    <span class="breadcrumb-group">${mod.group}</span>
    <span class="breadcrumb-sep">›</span>
    <span class="breadcrumb-title">${mod.icon} ${mod.title}</span>
  `;
}

function renderWelcome() {
  if (activeCleanup) { try { activeCleanup(); } catch(e) {} activeCleanup = null; }
  activeId = null;
  updateBreadcrumb(null);
  renderNav(null, done);
  document.getElementById('module-canvas').innerHTML = `
    <div class="welcome-screen">
      <div class="welcome-logo">⚡</div>
      <h1 class="welcome-title">Apache Flink Visualizer</h1>
      <p class="welcome-sub">
        An interactive learning platform for Apache Flink, built around Uber's
        real-time data engineering platform. Go from zero to interview-ready.
      </p>
      <div class="welcome-meta">
        <span class="badge badge-orange">19 Modules</span>
        <span class="badge badge-blue">Fully Interactive</span>
        <span class="badge badge-green">Uber Examples</span>
        <span class="badge badge-purple">Interview Ready</span>
      </div>
      <div class="welcome-actions">
        <button class="btn btn-primary" id="start-btn">
          Start Learning <span>→</span>
        </button>
      </div>
    </div>
  `;
  document.getElementById('start-btn')?.addEventListener('click', () => {
    window.location.hash = 'm01';
  });
  updateProgress(done);
}

// ── Hash routing ─────────────────────────────────────────────────────────
function onHashChange() {
  const id = window.location.hash.slice(1) || '';
  if (id && LOADERS[id]) navigate(id);
  else renderWelcome();
}

// ── Sidebar toggle ────────────────────────────────────────────────────────
document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.toggle('collapsed');
});

// ── Theme toggle ──────────────────────────────────────────────────────────
const storedTheme = localStorage.getItem('flink_theme') || 'dark';
document.documentElement.setAttribute('data-theme', storedTheme);

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('flink_theme', next);
});

// ── Tooltip ───────────────────────────────────────────────────────────────
const ttEl = document.getElementById('tooltip');
document.addEventListener('mouseover', e => {
  const target = e.target.closest('[data-tip]');
  if (target && ttEl) {
    ttEl.textContent = target.dataset.tip;
    ttEl.classList.remove('hidden');
  }
});
document.addEventListener('mousemove', e => {
  if (ttEl && !ttEl.classList.contains('hidden')) {
    ttEl.style.left = (e.clientX + 14) + 'px';
    ttEl.style.top  = (e.clientY - 6)  + 'px';
  }
});
document.addEventListener('mouseout', e => {
  if (e.target.closest('[data-tip]') && ttEl) ttEl.classList.add('hidden');
});

// ── Keyboard nav ─────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (!activeId) return;
  const idx = MODULES.findIndex(m => m.id === activeId);
  if (e.key === 'ArrowRight' && idx < MODULES.length - 1) window.location.hash = MODULES[idx+1].id;
  if (e.key === 'ArrowLeft'  && idx > 0)                  window.location.hash = MODULES[idx-1].id;
});

// ── Mobile navigation drawer ───────────────────────────────────────────────
(() => {
  const mq = window.matchMedia('(max-width: 1024px)');
  const openNav  = () => document.body.classList.add('nav-open');
  const closeNav = () => document.body.classList.remove('nav-open');

  document.getElementById('nav-open')?.addEventListener('click', openNav);
  document.getElementById('nav-backdrop')?.addEventListener('click', closeNav);

  // On mobile, the in-drawer hamburger closes the drawer instead of collapsing it.
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    if (mq.matches) closeNav();
  });

  // Close on Escape.
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });

  // Auto-close after choosing a module on mobile.
  document.getElementById('nav-list')?.addEventListener('click', e => {
    if (mq.matches && e.target.closest('.nav-item')) closeNav();
  });

  // If the viewport grows back to desktop, make sure the drawer state is cleared.
  mq.addEventListener('change', ev => { if (!ev.matches) closeNav(); });
})();

// ── Boot ──────────────────────────────────────────────────────────────────
window.addEventListener('hashchange', onHashChange);
renderNav(null, done);
onHashChange();
