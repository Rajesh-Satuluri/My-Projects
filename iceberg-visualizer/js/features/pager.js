/* ============================================================
   Prev / Next pager — appended to the foot of each screen,
   derived from the sidebar nav order. Wired via app:navigate.
   ============================================================ */
(function () {
  'use strict';
  const IV = (window.IcebergViz = window.IcebergViz || {});

  function order() { return IV.getScreens ? IV.getScreens() : []; }

  function build(id) {
    const container = document.getElementById('module-container');
    if (!container) return;
    container.querySelector('.iv-pager')?.remove();

    // Module roots (.page-enter / .home-page) are height:100% with their own
    // scroll, so the pager must live INSIDE the root to appear at the page end.
    const host = container.firstElementChild || container;

    const list = order();
    const i = list.findIndex(s => s.id === id);
    if (i === -1) return;
    const prev = list[i - 1], next = list[i + 1];
    if (!prev && !next) return;

    const nav = document.createElement('nav');
    nav.className = 'iv-pager';
    nav.setAttribute('aria-label', 'Previous and next topic');
    nav.innerHTML = `
      ${prev ? `<button class="iv-pager__btn iv-pager__prev" data-nav="${prev.id}">
        <span class="iv-pager__dir">← Previous</span><span class="iv-pager__name">${prev.label}</span></button>` : `<span></span>`}
      ${next ? `<button class="iv-pager__btn iv-pager__next" data-nav="${next.id}">
        <span class="iv-pager__dir">Next →</span><span class="iv-pager__name">${next.label}</span></button>` : `<span></span>`}`;
    // The app already delegates [data-nav] clicks to navigate().
    host.appendChild(nav);
  }

  function init() {
    document.addEventListener('app:navigate', (e) => build(e.detail && e.detail.id));
    if (IV.currentScreenId && IV.currentScreenId()) build(IV.currentScreenId());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
