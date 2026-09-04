/* ============================================================
   IcebergViz App — Bootstrap, Router, Navigation
   Entry point: runs after all modules are loaded.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Navigation registry ─────────────────────────────────── */
  const NAV_GROUPS = [
    {
      id: 'start',
      label: 'Get Started',
      items: [
        { id: 'home',              label: 'Home',               icon: 'home',     available: true },
        { id: 'why-iceberg',       label: 'Why Iceberg?',       icon: 'shield',   available: true },
        { id: 'architecture',      label: 'Architecture',       icon: 'layers',   available: true },
        { id: 'metadata-explorer', label: 'Metadata Explorer',  icon: 'folder',   available: true },
      ],
    },
    {
      id: 'write-ops',
      label: 'Write Operations',
      items: [
        { id: 'create-table',  label: 'CREATE TABLE',    icon: 'table-plus',  available: true },
        { id: 'insert',        label: 'INSERT',           icon: 'arrow-down',  available: true },
        { id: 'update',        label: 'UPDATE',           icon: 'pencil',      available: true },
        { id: 'delete',        label: 'DELETE',           icon: 'trash',       available: true },
        { id: 'merge',         label: 'MERGE INTO',       icon: 'merge',       available: true },
        { id: 'overwrite',     label: 'INSERT OVERWRITE', icon: 'refresh',     available: true },
        { id: 'append',        label: 'APPEND',           icon: 'plus',        available: true },
      ],
    },
    {
      id: 'read-ops',
      label: 'Read & Query',
      items: [
        { id: 'read-path',     label: 'Read Path',     icon: 'search',   available: true },
        { id: 'write-path',    label: 'Write Path',    icon: 'edit',     available: true },
        { id: 'query-planner', label: 'Query Planner', icon: 'cpu',      available: true },
        { id: 'time-travel',   label: 'Time Travel',   icon: 'clock',    available: true },
      ],
    },
    {
      id: 'metadata',
      label: 'Metadata & Schema',
      items: [
        { id: 'snapshot-explorer',   label: 'Snapshot Explorer',   icon: 'camera',     available: true },
        { id: 'manifest-explorer',   label: 'Manifest Explorer',   icon: 'list',       available: true },
        { id: 'schema-evolution',    label: 'Schema Evolution',    icon: 'columns',    available: true },
        { id: 'hidden-partitioning', label: 'Hidden Partitioning', icon: 'filter',     available: true },
        { id: 'partition-evolution', label: 'Partition Evolution', icon: 'git-branch', available: true },
        { id: 'catalog-explorer',    label: 'Catalog Explorer',    icon: 'book',       available: true },
      ],
    },
    {
      id: 'advanced',
      label: 'Advanced Topics',
      items: [
        { id: 'concurrency',         label: 'Concurrency',          icon: 'users',    available: true },
        { id: 'maintenance',         label: 'Maintenance Ops',      icon: 'tool',     available: true },
        { id: 'performance',         label: 'Performance Sim',      icon: 'zap',      available: true },
        { id: 'engine-integrations', label: 'Engine Integrations',  icon: 'link',     available: true },
      ],
    },
    {
      id: 'learn',
      label: 'Learn & Practice',
      items: [
        { id: 'interview',  label: 'Interview Mode', icon: 'message-square', available: true },
        { id: 'quiz',       label: 'Quiz Mode',      icon: 'check-square',   available: true },
        { id: 'study',      label: 'Study Deck',     icon: 'book',           available: true },
        { id: 'cheatsheet', label: 'Cheat Sheets',   icon: 'file-text',      available: true },
      ],
    },
  ];

  /* ── Icon set (inline SVG path data) ────────────────────── */
  function _navIcon(name) {
    const p = {
      home:          'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
      shield:        'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      layers:        'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
      folder:        'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z',
      'table-plus':  'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18',
      'arrow-down':  'M12 5v14M19 12l-7 7-7-7',
      pencil:        'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
      trash:         'M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6',
      merge:         'M18 21v-4a4 4 0 00-4-4H6M6 3v4a4 4 0 004 4h8 M15 18l3 3 3-3',
      refresh:       'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
      plus:          'M12 5v14M5 12h14',
      search:        'M11 19A8 8 0 1011 3a8 8 0 010 16zM21 21l-4.35-4.35',
      edit:          'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
      cpu:           'M9 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2h-2M9 3v2h6V3M9 3H6M15 3h3M12 12h.01',
      clock:         'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
      camera:        'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z',
      list:          'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
      columns:       'M12 3H3a1 1 0 00-1 1v16a1 1 0 001 1h9M12 3h9a1 1 0 011 1v16a1 1 0 01-1 1h-9M12 3v18',
      filter:        'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
      'git-branch':  'M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9',
      book:          'M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 014 17V5h16v12H6.5A2.5 2.5 0 004 19.5z',
      users:         'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
      tool:          'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
      zap:           'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
      link:          'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
      'message-square': 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
      'check-square': 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
      'file-text':   'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6M16 13H8M16 17H8M10 9H8',
    };
    const d = p[name] || p.home;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="${d}"/></svg>`;
  }

  /* ── Chevron SVG ─────────────────────────────────────────── */
  function _chevronSvg() {
    return `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" width="10" height="10" aria-hidden="true"><path d="M3 4l3 3 3-3"/></svg>`;
  }

  /* ── Collapsed-group persistence ─────────────────────────── */
  const NAV_COLLAPSE_KEY = 'iv-nav-collapsed';
  function _getCollapsedGroups() {
    try { return new Set(JSON.parse(localStorage.getItem(NAV_COLLAPSE_KEY) || '[]')); }
    catch (e) { return new Set(); }
  }
  function _saveCollapsedGroups() {
    const ids = [...document.querySelectorAll('.nav-group.collapsed')].map(s => s.dataset.group);
    _lsSet(NAV_COLLAPSE_KEY, JSON.stringify(ids));
  }
  function _updateCollapseAllBtn() {
    const btn = document.getElementById('nav-collapse-all');
    if (!btn) return;
    const groups = document.querySelectorAll('.nav-group');
    const anyOpen = [...groups].some(g => !g.classList.contains('collapsed'));
    btn.dataset.mode = anyOpen ? 'collapse' : 'expand';
    btn.textContent = anyOpen ? 'Collapse all' : 'Expand all';
  }

  /* ── Build sidebar navigation ────────────────────────────── */
  function _buildNav() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    nav.innerHTML = '';

    const collapsed = _getCollapsedGroups();

    // Collapse-all / Expand-all toolbar
    const tools = document.createElement('div');
    tools.className = 'nav-tools';
    tools.innerHTML = `<button id="nav-collapse-all" class="nav-tools-btn" type="button"></button>`;
    tools.querySelector('button').addEventListener('click', () => {
      const collapseAll = document.getElementById('nav-collapse-all').dataset.mode !== 'expand';
      document.querySelectorAll('.nav-group').forEach(section => {
        section.classList.toggle('collapsed', collapseAll);
        const h = section.querySelector('.nav-group-header');
        if (h) h.setAttribute('aria-expanded', String(!collapseAll));
      });
      _saveCollapsedGroups();
      _updateCollapseAllBtn();
    });
    nav.appendChild(tools);

    NAV_GROUPS.forEach(group => {
      const section = document.createElement('div');
      section.className = 'nav-group' + (collapsed.has(group.id) ? ' collapsed' : '');
      section.dataset.group = group.id;

      // Group header (a real button for a11y)
      const groupHeader = document.createElement('button');
      groupHeader.type = 'button';
      groupHeader.className = 'nav-group-header';
      groupHeader.setAttribute('aria-expanded', String(!collapsed.has(group.id)));
      groupHeader.innerHTML = `
        <span class="nav-group-label">${group.label}</span>
        <span class="nav-group-chevron">${_chevronSvg()}</span>
      `;
      groupHeader.addEventListener('click', () => {
        const isCollapsed = section.classList.toggle('collapsed');
        groupHeader.setAttribute('aria-expanded', String(!isCollapsed));
        _saveCollapsedGroups();
        _updateCollapseAllBtn();
      });
      section.appendChild(groupHeader);

      // Animatable container: grid-rows 1fr↔0fr, items inside an overflow-hidden inner
      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'nav-group-items';
      const inner = document.createElement('div');
      inner.className = 'nav-group-inner';

      group.items.forEach(item => {
        const a = document.createElement('a');
        a.href = item.available ? '#' + item.id : 'javascript:void(0)';
        a.className = 'nav-item' + (item.available ? '' : ' coming-soon');
        a.dataset.navId = item.id;
        a.innerHTML = `
          <span class="nav-icon">${_navIcon(item.icon)}</span>
          <span class="nav-label">${item.label}</span>
          ${!item.available ? '<span class="nav-badge">soon</span>' : ''}
        `;
        if (!item.available) {
          a.addEventListener('click', (e) => {
            e.preventDefault();
            _showComingSoon(item.label);
          });
        }
        inner.appendChild(a);
      });

      itemsContainer.appendChild(inner);
      section.appendChild(itemsContainer);
      nav.appendChild(section);
    });

    _updateCollapseAllBtn();
  }

  /* ── Active nav highlight ────────────────────────────────── */
  function _setActiveNav(id) {
    document.querySelectorAll('a.nav-item[data-nav-id]').forEach(a => {
      a.classList.toggle('active', a.dataset.navId === id);
    });
  }

  /* ── Breadcrumb update ───────────────────────────────────── */
  function _setBreadcrumb(id) {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    let groupLabel = '';
    let itemLabel = '';
    NAV_GROUPS.forEach(g => {
      g.items.forEach(item => {
        if (item.id === id) {
          groupLabel = g.label;
          itemLabel = item.label;
        }
      });
    });
    bc.innerHTML = `
      <span class="bc-root">IcebergViz</span>
      ${groupLabel ? `<span class="bc-sep">›</span><span class="bc-group">${groupLabel}</span>` : ''}
      ${itemLabel ? `<span class="bc-sep">›</span><span class="bc-current">${itemLabel}</span>` : ''}
    `;
  }

  /* ── "Coming soon" toast ─────────────────────────────────── */
  function _showComingSoon(label) {
    const existing = document.querySelector('.coming-soon-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'coming-soon-toast';
    toast.innerHTML = `<strong>${label}</strong> is coming in a future iteration!`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  /* ── Current module tracking ─────────────────────────────── */
  let _currentModuleId = null;
  let _currentModuleInstance = null;

  /* ── localStorage-safe helpers ───────────────────────────── */
  function _lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function _lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ── Hash parsing: #screen or #screen/step ───────────────── */
  function _parseHash() {
    const raw = location.hash.replace(/^#/, '').trim();
    if (!raw) return { id: '', step: null };
    const [id, stepStr] = raw.split('/');
    const step = stepStr != null ? parseInt(stepStr, 10) : null;
    return { id, step: Number.isNaN(step) ? null : step };
  }

  /* ── Seek the active animation engine (deep-link support) ── */
  function _seek(step) {
    if (step == null || step < 0) return;
    const eng = IV.AnimationControls && IV.AnimationControls._engine;
    if (eng && step < eng.totalSteps) eng.goto(step);
  }

  /* ── Mirror the current animation step into the URL ───────── */
  IV._syncStepToUrl = function (i) {
    if (!_currentModuleId) return;
    const base = '#' + _currentModuleId;
    const next = i >= 0 ? base + '/' + i : base;
    // replaceState does not fire hashchange → no navigate loop.
    if (location.hash !== next) history.replaceState(null, '', next);
  };

  /* ── Navigate to a module ────────────────────────────────── */
  function navigate(id, step) {
    id = id || 'home';
    // Same screen, just a different deep-linked step: seek, don't re-render.
    if (id === _currentModuleId) { _seek(step); return; }

    // Destroy previous module
    if (_currentModuleInstance && typeof _currentModuleInstance.destroy === 'function') {
      try { _currentModuleInstance.destroy(); } catch(e) { console.warn('Module destroy error:', e); }
    }
    IV.AnimationControls.hide();

    const container = document.getElementById('module-container');
    if (!container) return;

    const mod = IV.modules[id];
    if (!mod) {
      container.innerHTML = `
        <div class="placeholder-module">
          <div class="placeholder-icon">🧊</div>
          <h2>${id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</h2>
          <p>This module is coming in a future iteration.</p>
          <button class="btn-primary" onclick="location.hash='home'">← Back to Home</button>
        </div>
      `;
      _currentModuleId = id;
      _currentModuleInstance = null;
      _setActiveNav(id);
      _setBreadcrumb(id);
      _lsSet('iv-last-screen', id);
      document.dispatchEvent(new CustomEvent('app:navigate', { detail: { id } }));
      return;
    }

    container.innerHTML = '';
    try {
      mod.render(container);
    } catch(err) {
      console.error('Module render error [' + id + ']:', err);
      container.innerHTML = `
        <div class="error-module">
          <h3>Error rendering module: ${id}</h3>
          <pre>${err.message}\n\n${err.stack || ''}</pre>
        </div>
      `;
    }

    _currentModuleId = id;
    _currentModuleInstance = mod;
    _setActiveNav(id);
    _setBreadcrumb(id);

    container.scrollTop = 0;
    window.scrollTo(0, 0);

    if (_parseHash().id !== id) {
      history.pushState(null, '', '#' + id);
    }

    // Resume + decoupled feature bus (progress, pager, etc. listen here).
    _lsSet('iv-last-screen', id);
    document.dispatchEvent(new CustomEvent('app:navigate', { detail: { id } }));

    // Deep-linked step (#screen/step): seek after the module has rendered
    // and registered its engine. Retry once next frame if not ready yet.
    if (step != null) {
      _seek(step);
      requestAnimationFrame(() => _seek(step));
    }
  }

  /* ── Hash router ─────────────────────────────────────────── */
  function _routeFromHash() {
    const { id, step } = _parseHash();
    if (!id) {
      // First load with no hash: resume last screen, else home.
      navigate(_lsGet('iv-last-screen') || 'home');
      return;
    }
    navigate(id, step);
  }

  /* ── Sidebar search ──────────────────────────────────────── */
  function _initSidebarSearch() {
    const input = document.getElementById('sidebar-search');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      document.querySelectorAll('a.nav-item[data-nav-id]').forEach(a => {
        const label = a.querySelector('.nav-label')?.textContent.toLowerCase() || '';
        a.style.display = !q || label.includes(q) ? '' : 'none';
      });
      if (q) {
        // Auto-expand while searching so matches are never hidden (temporary).
        document.querySelectorAll('.nav-group').forEach(g => {
          g.classList.remove('collapsed');
          g.querySelector('.nav-group-header')?.setAttribute('aria-expanded', 'true');
        });
      } else {
        // Restore the persisted collapse state when the query is cleared.
        const saved = _getCollapsedGroups();
        document.querySelectorAll('.nav-group').forEach(g => {
          const c = saved.has(g.dataset.group);
          g.classList.toggle('collapsed', c);
          g.querySelector('.nav-group-header')?.setAttribute('aria-expanded', String(!c));
        });
      }
      _updateCollapseAllBtn();
    });
  }

  /* ── Sidebar collapse toggle ─────────────────────────────── */
  function _initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (!toggleBtn || !sidebar) return;
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('iv-sidebar-collapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
    });
    if (localStorage.getItem('iv-sidebar-collapsed') === '1') {
      sidebar.classList.add('collapsed');
    }
  }

  /* ── Off-canvas nav drawer (tablet / touch) ──────────────── */
  const _drawerMQ = window.matchMedia('(max-width: 1024px)');

  function _openDrawer() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('nav-backdrop');
    const toggle = document.getElementById('nav-toggle');
    if (!sidebar) return;
    sidebar.classList.add('drawer-open');
    backdrop?.classList.add('visible');
    toggle?.setAttribute('aria-expanded', 'true');
  }

  function _closeDrawer() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('nav-backdrop');
    const toggle = document.getElementById('nav-toggle');
    if (!sidebar) return;
    sidebar.classList.remove('drawer-open');
    backdrop?.classList.remove('visible');
    toggle?.setAttribute('aria-expanded', 'false');
  }

  // Keep desktop "collapsed" rail and drawer mode from colliding:
  // in drawer mode the sidebar is always full-width; leaving drawer
  // mode restores the saved collapse preference.
  function _syncDrawerMode() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (_drawerMQ.matches) {
      sidebar.classList.remove('collapsed');
    } else {
      _closeDrawer();
      if (localStorage.getItem('iv-sidebar-collapsed') === '1') {
        sidebar.classList.add('collapsed');
      }
    }
  }

  function _initDrawer() {
    const toggle = document.getElementById('nav-toggle');
    const backdrop = document.getElementById('nav-backdrop');
    const sidebar = document.getElementById('sidebar');

    toggle?.addEventListener('click', () => {
      if (sidebar?.classList.contains('drawer-open')) _closeDrawer();
      else _openDrawer();
    });
    backdrop?.addEventListener('click', _closeDrawer);

    // Close after choosing a destination while in drawer mode.
    document.getElementById('sidebar-nav')?.addEventListener('click', (e) => {
      if (e.target.closest('a.nav-item') && _drawerMQ.matches) _closeDrawer();
    });

    // Esc closes the drawer.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar?.classList.contains('drawer-open')) _closeDrawer();
    });

    // React to width changes (rotation, window resize).
    const onChange = () => _syncDrawerMode();
    if (_drawerMQ.addEventListener) _drawerMQ.addEventListener('change', onChange);
    else _drawerMQ.addListener(onChange); // older Safari
    _syncDrawerMode();

    IV._closeDrawer = _closeDrawer;
  }

  /* ── Theme toggle ────────────────────────────────────────── */
  function _initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const root = document.documentElement;
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      root.dataset.theme = next;
      localStorage.setItem('iv-theme', next);
    });
    const saved = localStorage.getItem('iv-theme');
    if (saved) document.documentElement.dataset.theme = saved;
  }

  /* ── Keyboard shortcuts modal ────────────────────────────── */
  function _initShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    if (!modal) return;
    const close = () => modal.classList.remove('visible');
    modal.querySelector('.modal-close')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    IV._showShortcutsModal = () => modal.classList.add('visible');
  }

  /* ── Wire [data-nav] click delegation ───────────────────── */
  function _wireNavCards() {
    document.addEventListener('click', (e) => {
      const card = e.target.closest('[data-nav]');
      if (card) {
        const target = card.dataset.nav;
        if (target) { e.preventDefault(); navigate(target); }
      }
    });
  }

  /* ── Bootstrap ───────────────────────────────────────────── */
  function _boot() {
    IV.Tooltip.init();
    IV.AnimationControls.init();
    IV.Keyboard.init(navigate);

    _buildNav();
    _initSidebarSearch();
    _initSidebarToggle();
    _initDrawer();
    _initThemeToggle();
    _initShortcutsModal();
    _wireNavCards();

    window.addEventListener('hashchange', _routeFromHash);
    _routeFromHash();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

  window.IcebergViz.navigate = navigate;

  /* ── Nav registry accessors (used by palette, pager, progress) ── */
  IV.getScreens = () => NAV_GROUPS.flatMap(g =>
    g.items.filter(it => it.available !== false)
           .map(it => ({ id: it.id, label: it.label, icon: it.icon, group: g.label })));
  IV.getNavGroups = () => NAV_GROUPS;
  IV.currentScreenId = () => _currentModuleId;
})();
