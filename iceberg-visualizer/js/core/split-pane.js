/* ============================================================
   SplitPane — draggable column resizers for grid layouts.

   One shared helper reused by the multi-panel "explorer" screens
   so a cramped side panel (e.g. Metadata Explorer's File Role &
   Context) can be widened by the user. Vanilla Pointer Events —
   no external dependency.

     const handle = IV.SplitPane.attach(gridEl, {
       key: 'iceberg/metadata-explorer',
       disableBelow: 1100,
       tracks: [
         { min: 200, max: 480, def: 280 },  // fixed side
         { flex: true, min: 280 },          // flexible middle
         { min: 240, max: 600, def: 300 },  // fixed side
       ],
     });
     // ... later, in the module's destroy():
     handle.detach();

   Contract & behaviour:
   - Rewrites the grid's `grid-template-columns` live while dragging;
     fixed tracks become `<px>px`, the flexible track `minmax(0,1fr)`
     (which also lets the middle finally shrink, so wide content no
     longer pushes a side panel off-screen).
   - Sizes clamp to each track's [min,max] and never starve the
     flexible track below its own min.
   - Sizes persist per screen in localStorage (guarded) and restore
     on re-entry. Double-click a gutter — or press Home on it — resets
     that track to its default. Arrow keys nudge it ±16px.
   - Gutters are keyboard-focusable separators (role="separator").
   - At/below `disableBelow` viewport width the helper steps aside:
     gutters hide and the inline template is cleared, so each screen's
     own responsive stacking (media queries) takes over untouched.
   - `detach()` removes gutters/listeners and restores the original
     inline styles — call it from the module's destroy().
   ============================================================ */
(function () {
  'use strict';
  const IV = (window.IcebergViz = window.IcebergViz || {});

  const STYLE_ID = 'iv-splitpane-styles';
  const NUDGE = 16;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .iv-split-gutter {
        position: absolute; top: 0; bottom: 0;
        width: 11px; transform: translateX(-50%);
        z-index: 5; cursor: col-resize;
        display: flex; align-items: center; justify-content: center;
        background: transparent; border: none; padding: 0;
        touch-action: none; -webkit-tap-highlight-color: transparent;
      }
      .iv-split-gutter::before {
        content: ''; width: 2px; height: 100%;
        background: var(--border-default, var(--border, rgba(255,255,255,.14)));
        border-radius: 2px; transition: background .12s, width .12s;
      }
      .iv-split-gutter:hover::before,
      .iv-split-gutter.is-dragging::before {
        background: var(--brand-2, var(--iceberg, #4aaeff)); width: 3px;
      }
      .iv-split-gutter:focus-visible { outline: none; }
      .iv-split-gutter:focus-visible::before {
        background: var(--brand-2, var(--iceberg, #4aaeff)); width: 3px;
        box-shadow: 0 0 0 2px var(--brand-glow, rgba(74,174,255,.35));
      }
      .iv-split-gutter::after {
        content: ''; position: absolute; width: 4px; height: 26px;
        border-radius: 3px; opacity: 0;
        background: var(--brand-2, var(--iceberg, #4aaeff));
        transition: opacity .12s;
      }
      .iv-split-gutter:hover::after,
      .iv-split-gutter.is-dragging::after { opacity: .5; }
      body.iv-split-resizing { cursor: col-resize !important; user-select: none !important; }
      @media (prefers-reduced-motion: reduce) {
        .iv-split-gutter::before, .iv-split-gutter::after { transition: none; }
      }
    `;
    document.head.appendChild(s);
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function readGap(gridEl) {
    const g = parseFloat(getComputedStyle(gridEl).columnGap);
    return isNaN(g) ? 0 : g;
  }

  IV.SplitPane = {
    attach(gridEl, opts) {
      if (!gridEl || !opts || !Array.isArray(opts.tracks)) return null;
      injectStyles();

      const tracks = opts.tracks;
      const key = opts.key ? 'iv:split:' + opts.key : null;
      const disableBelow = opts.disableBelow || 720;
      const panels = tracks.map((t, i) => gridEl.children[i]).filter(Boolean);
      if (panels.length < tracks.length) return null;

      const originalInline = gridEl.style.gridTemplateColumns || '';
      const originalPosition = gridEl.style.position || '';
      if (getComputedStyle(gridEl).position === 'static') gridEl.style.position = 'relative';

      // Flexible panels must be allowed to shrink for the template to hold.
      tracks.forEach((t, i) => { if (t.flex) panels[i].style.minWidth = '0'; });

      // Working sizes: px for fixed tracks, null for flex tracks.
      const sizes = tracks.map((t) => (t.flex ? null : (t.def || 260)));

      // Restore persisted fixed sizes.
      if (key) {
        try {
          const saved = JSON.parse(localStorage.getItem(key) || 'null');
          if (Array.isArray(saved) && saved.length === tracks.length) {
            saved.forEach((v, i) => {
              if (!tracks[i].flex && typeof v === 'number' && isFinite(v)) {
                sizes[i] = clamp(v, tracks[i].min, tracks[i].max || v);
              }
            });
          }
        } catch (e) { /* ignore corrupt/unavailable storage */ }
      }

      const flexIndex = tracks.findIndex((t) => t.flex);
      const flexMin = flexIndex >= 0 ? (tracks[flexIndex].min || 0) : 0;

      function fixedTotal(exceptFlex) {
        let sum = 0;
        tracks.forEach((t, i) => { if (!t.flex) sum += sizes[i]; });
        return sum;
      }

      function flexActual() {
        const gap = readGap(gridEl);
        const totalGap = gap * (tracks.length - 1);
        return gridEl.clientWidth - fixedTotal() - totalGap;
      }

      function applyTemplate() {
        gridEl.style.gridTemplateColumns = tracks
          .map((t, i) => (t.flex ? 'minmax(0, 1fr)' : sizes[i] + 'px'))
          .join(' ');
      }

      // ── Gutters: one per internal boundary, each owning a fixed track. ──
      const gutters = [];
      function makeGutter(boundary) {
        // boundary sits between track `boundary` and `boundary+1`.
        const left = boundary, right = boundary + 1;
        let owned, dir; // dir: +1 => dragging right grows owned track
        if (!tracks[left].flex) { owned = left; dir = 1; }
        else if (!tracks[right].flex) { owned = right; dir = -1; }
        else return null; // flex|flex — nothing sensible to drag
        const track = tracks[owned];

        const g = document.createElement('div');
        g.className = 'iv-split-gutter';
        g.setAttribute('role', 'separator');
        g.setAttribute('aria-orientation', 'vertical');
        g.setAttribute('tabindex', '0');
        g.setAttribute('aria-label', 'Resize panel');
        g.setAttribute('aria-valuemin', String(track.min));
        g.setAttribute('aria-valuemax', String(track.max || Math.round(track.min * 3)));

        function setSize(px) {
          let next = clamp(px, track.min, track.max || px);
          sizes[owned] = next;
          // Never starve the flexible track below its min.
          if (flexIndex >= 0) {
            const deficit = flexMin - flexActual();
            if (deficit > 0) sizes[owned] = clamp(next - deficit, track.min, track.max || next);
          }
          applyTemplate();
          g.setAttribute('aria-valuenow', String(Math.round(sizes[owned])));
          persist();
          layout();
        }

        let startX = 0, startPx = 0;
        function onMove(e) {
          const dx = e.clientX - startX;
          setSize(startPx + dir * dx);
        }
        function onUp(e) {
          g.classList.remove('is-dragging');
          document.body.classList.remove('iv-split-resizing');
          g.releasePointerCapture && g.releasePointerCapture(e.pointerId);
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        }
        g.addEventListener('pointerdown', (e) => {
          if (e.button != null && e.button !== 0) return;
          e.preventDefault();
          startX = e.clientX; startPx = sizes[owned];
          g.classList.add('is-dragging');
          document.body.classList.add('iv-split-resizing');
          try { g.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
        });
        g.addEventListener('dblclick', () => setSize(track.def || track.min));
        g.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); setSize(sizes[owned] - dir * NUDGE); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); setSize(sizes[owned] + dir * NUDGE); }
          else if (e.key === 'Home') { e.preventDefault(); setSize(track.def || track.min); }
        });

        g._boundary = boundary;
        g.style.display = 'none'; // hidden until enable() (correct on first render at narrow widths)
        gridEl.appendChild(g);
        gutters.push(g);
        return g;
      }

      function persist() {
        if (!key) return;
        try { localStorage.setItem(key, JSON.stringify(sizes)); } catch (e) { /* ignore */ }
      }

      // Position each gutter over its boundary (in the column gap).
      function layout() {
        const gap = readGap(gridEl);
        gutters.forEach((g) => {
          const leftPanel = panels[g._boundary];
          if (!leftPanel) return;
          const x = leftPanel.offsetLeft + leftPanel.offsetWidth + gap / 2;
          g.style.left = x + 'px';
        });
      }

      for (let b = 0; b < tracks.length - 1; b++) makeGutter(b);

      // ── Responsive enable/disable ──
      let enabled = false;
      function enable() {
        if (enabled) return;
        enabled = true;
        applyTemplate();
        gutters.forEach((g) => { g.style.display = ''; });
        // sync aria-valuenow
        gutters.forEach((g) => {
          const owned = tracks[g._boundary].flex ? g._boundary + 1 : g._boundary;
          g.setAttribute('aria-valuenow', String(Math.round(sizes[owned])));
        });
        layout();
      }
      function disable() {
        if (!enabled) return;
        enabled = false;
        gutters.forEach((g) => { g.style.display = 'none'; });
        gridEl.style.gridTemplateColumns = originalInline; // let media queries rule
      }
      function sync() {
        if (window.innerWidth <= disableBelow) disable();
        else { enable(); layout(); }
      }

      const mql = window.matchMedia('(max-width: ' + disableBelow + 'px)');
      const onMql = () => sync();
      if (mql.addEventListener) mql.addEventListener('change', onMql);
      else if (mql.addListener) mql.addListener(onMql);

      let ro = null;
      if (window.ResizeObserver) {
        ro = new ResizeObserver(() => { if (enabled) layout(); });
        ro.observe(gridEl);
      }
      const onWinResize = () => sync();
      window.addEventListener('resize', onWinResize);

      sync();

      return {
        layout,
        detach() {
          if (mql.removeEventListener) mql.removeEventListener('change', onMql);
          else if (mql.removeListener) mql.removeListener(onMql);
          window.removeEventListener('resize', onWinResize);
          if (ro) ro.disconnect();
          gutters.forEach((g) => g.remove());
          gutters.length = 0;
          tracks.forEach((t, i) => { if (t.flex && panels[i]) panels[i].style.minWidth = ''; });
          gridEl.style.gridTemplateColumns = originalInline;
          gridEl.style.position = originalPosition;
          document.body.classList.remove('iv-split-resizing');
        },
      };
    },
  };
})();
