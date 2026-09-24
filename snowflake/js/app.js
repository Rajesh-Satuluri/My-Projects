/* ============================================================
   SnowflakeViz App — router, nav, module loader
   Netflix Snowflake Architecture Handbook
   ============================================================ */

(function () {
  'use strict';

  /* ── Module registry ────────────────────────────────────── */
  const NAV_GROUPS = [
    {
      label: 'Foundation',
      items: [
        { id: 'home',          label: 'Home',             icon: '❄️' },
        { id: 'intro',         label: 'Introduction',     icon: '🎬' },
      ],
    },
    {
      label: 'Architecture',
      items: [
        { id: 'architecture',  label: 'Architecture',     icon: '🏛️' },
        { id: 'cloud-services',label: 'Cloud Services',   icon: '☁️' },
        { id: 'storage',       label: 'Storage Layer',    icon: '🗄️' },
        { id: 'compute',       label: 'Compute Layer',    icon: '⚡' },
      ],
    },
    {
      label: 'Query & Data',
      items: [
        { id: 'query-execution', label: 'Query Execution', icon: '🔍' },
        { id: 'caching',         label: 'Caching',          icon: '💾' },
        { id: 'data-loading',    label: 'Data Loading',     icon: '📥' },
      ],
    },
    {
      label: 'Platform',
      items: [
        { id: 'objects',   label: 'Objects & Hierarchy', icon: '🗂️' },
        { id: 'advanced',  label: 'Advanced Features',   icon: '🚀' },
        { id: 'security',  label: 'Security & Governance',icon: '🔒' },
      ],
    },
    {
      label: 'Capstone',
      items: [
        { id: 'e2e-flow',  label: 'E2E Flow',            icon: '🎯' },
      ],
    },
  ];

  /* ── App state ──────────────────────────────────────────── */
  let _currentModuleId = null;
  let _currentModuleInstance = null;

  /* ── Boot ───────────────────────────────────────────────── */
  function init() {
    _buildNav();
    _bindSearch();
    _bindThemeToggle();

    const viz = window.SnowflakeViz;
    viz.Keyboard.init(navigate);
    viz.Tooltip.init();
    viz.AnimationControls.init();
    _setupShortcutsModal();

    const initial = _hashToId(location.hash) || 'home';
    navigate(initial);

    window.addEventListener('hashchange', () => {
      const id = _hashToId(location.hash);
      if (id && id !== _currentModuleId) navigate(id);
    });
  }

  /* ── Navigation ─────────────────────────────────────────── */
  function navigate(moduleId) {
    const allItems = NAV_GROUPS.flatMap(g => g.items);
    const target = allItems.find(i => i.id === moduleId) || allItems[0];
    if (_currentModuleId === target.id) return;

    _currentModuleId = target.id;

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.module === target.id);
    });

    _updateBreadcrumb(target);

    const viz = window.SnowflakeViz;
    viz.AnimationControls.hide();
    if (_currentModuleInstance && typeof _currentModuleInstance.destroy === 'function') {
      _currentModuleInstance.destroy();
    }
    _currentModuleInstance = null;

    history.replaceState(null, '', '#' + target.id);

    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    canvas.innerHTML = '';
    canvas.classList.add('loading');

    const modKey = _idToModuleKey(target.id);
    const mod = viz.Modules && viz.Modules[modKey];
    if (mod) {
      try {
        _currentModuleInstance = mod.render(canvas, {
          data:     viz.NetflixData,
          concepts: viz.Concepts,
        });
      } catch (err) {
        canvas.innerHTML = `<div class="placeholder-msg"><p>Error loading module: ${err.message}</p></div>`;
      }
    } else {
      canvas.innerHTML = `<div class="placeholder-msg">
        <div class="placeholder-icon">${target.icon}</div>
        <h2>${target.label}</h2>
        <p class="text-muted">Module coming in a future iteration.</p>
      </div>`;
    }
    canvas.classList.remove('loading');
  }

  /* ── Nav builder ─────────────────────────────────────────── */
  function _buildNav() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    nav.innerHTML = '';

    NAV_GROUPS.forEach(group => {
      const grpEl = document.createElement('div');
      grpEl.className = 'nav-group';

      const lbl = document.createElement('div');
      lbl.className = 'nav-group-header';
      lbl.textContent = group.label;
      grpEl.appendChild(lbl);

      group.items.forEach(item => {
        const a = document.createElement('a');
        a.className = 'nav-item';
        a.href = '#' + item.id;
        a.dataset.module = item.id;
        a.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>`;
        a.addEventListener('click', e => {
          e.preventDefault();
          navigate(item.id);
        });
        grpEl.appendChild(a);
      });

      nav.appendChild(grpEl);
    });
  }

  /* ── Search ──────────────────────────────────────────────── */
  function _bindSearch() {
    const input = document.getElementById('sidebar-search');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase();
      document.querySelectorAll('.nav-item').forEach(el => {
        const match = el.dataset.module.includes(q) ||
          el.querySelector('.nav-label')?.textContent.toLowerCase().includes(q);
        el.style.display = q && !match ? 'none' : '';
      });
      document.querySelectorAll('.nav-group').forEach(grp => {
        const visible = [...grp.querySelectorAll('.nav-item')].some(el => el.style.display !== 'none');
        grp.style.display = q && !visible ? 'none' : '';
      });
    });
  }

  /* ── Theme toggle ────────────────────────────────────────── */
  function _bindThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const root = document.documentElement;
    const stored = localStorage.getItem('sviz-theme');
    if (stored) root.setAttribute('data-theme', stored);

    btn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      localStorage.setItem('sviz-theme', next);
    });
  }

  /* ── Breadcrumb ──────────────────────────────────────────── */
  function _updateBreadcrumb(item) {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    const group = NAV_GROUPS.find(g => g.items.some(i => i.id === item.id));
    bc.innerHTML = `<span>SnowflakeViz</span>` +
      (group ? `<span class="bc-sep">›</span><span>${group.label}</span>` : '') +
      `<span class="bc-sep">›</span><span>${item.label}</span>`;
  }

  /* ── Shortcuts modal ─────────────────────────────────────── */
  function _setupShortcutsModal() {
    const modal    = document.getElementById('shortcuts-modal');
    const closeBtn = document.getElementById('shortcuts-close');
    if (!modal) return;

    window.SnowflakeViz._showShortcutsModal = () => {
      _renderShortcuts(modal);
      modal.classList.add('visible');
    };

    closeBtn?.addEventListener('click', () => modal.classList.remove('visible'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('visible'); });
  }

  function _renderShortcuts(modal) {
    const grid = modal.querySelector('.shortcuts-grid');
    if (!grid) return;
    const shortcuts = window.SnowflakeViz.Keyboard.getAll();
    const byGroup = {};
    shortcuts.forEach(s => {
      (byGroup[s.group] = byGroup[s.group] || []).push(s);
    });
    grid.innerHTML = Object.entries(byGroup).map(([grp, items]) => `
      <div class="shortcut-group">
        <div class="shortcut-group-title">${grp}</div>
        ${items.map(s => `
          <div class="shortcut-row">
            <kbd>${_formatKey(s.key)}</kbd>
            <span>${s.description}</span>
          </div>`).join('')}
      </div>`).join('');
  }

  function _formatKey(k) {
    return k.split('+').map(p => {
      const map = { ctrl: '⌃', alt: '⌥', shift: '⇧', arrowleft: '←', arrowright: '→', ' ': 'Space', escape: 'Esc' };
      return map[p] || p.toUpperCase();
    }).join(' ');
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _hashToId(hash) {
    return hash ? hash.replace(/^#/, '') : null;
  }

  function _idToModuleKey(id) {
    return id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }

  /* ── Expose navigate & boot ──────────────────────────────── */
  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.navigate = navigate;
  window.SnowflakeViz.Modules  = window.SnowflakeViz.Modules || {};

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
