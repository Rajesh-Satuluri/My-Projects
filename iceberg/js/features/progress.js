/* ============================================================
   Progress tracking — visited checkmarks in nav + sidebar meter.
   Persisted in localStorage; celebratory toast at 100%.
   ============================================================ */
(function () {
  'use strict';
  const IV = (window.IcebergViz = window.IcebergViz || {});
  const KEY = 'iv-visited';
  const DONE = 'iv-progress-celebrated';

  function load() { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { return new Set(); } }
  function save(set) { try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch (e) {} }

  let visited = load();
  let meterFill, meterLabel;

  function total() { return (IV.getScreens ? IV.getScreens() : []).length || 1; }

  function buildMeter() {
    const search = document.querySelector('.sidebar-search-wrap');
    if (!search || document.getElementById('iv-progress')) return;
    const box = document.createElement('div');
    box.id = 'iv-progress';
    box.className = 'iv-progress';
    box.innerHTML = `
      <div class="iv-progress__row">
        <span class="iv-progress__label">Progress</span>
        <span class="iv-progress__count" id="iv-progress-count">0 / 0</span>
      </div>
      <div class="iv-progress__track"><div class="iv-progress__fill" id="iv-progress-fill"></div></div>`;
    search.insertAdjacentElement('afterend', box);
    meterFill = box.querySelector('#iv-progress-fill');
    meterLabel = box.querySelector('#iv-progress-count');
  }

  function paintNav() {
    document.querySelectorAll('a.nav-item[data-nav-id]').forEach(a => {
      a.classList.toggle('nav-done', visited.has(a.dataset.navId));
    });
  }

  function updateMeter() {
    const n = visited.size, t = total();
    if (meterFill) meterFill.style.width = Math.min(100, (n / t) * 100).toFixed(1) + '%';
    if (meterLabel) meterLabel.textContent = `${n} / ${t}`;
    if (n >= t && !celebrated()) {
      markCelebrated();
      if (IV.toast) IV.toast('You explored every topic. Nice work!', { title: '🎉 All done', duration: 5000 });
    }
  }

  function celebrated() { try { return localStorage.getItem(DONE) === '1'; } catch (e) { return false; } }
  function markCelebrated() { try { localStorage.setItem(DONE, '1'); } catch (e) {} }

  function mark(id) {
    if (!id || visited.has(id)) { paintNav(); return; }
    visited.add(id);
    save(visited);
    paintNav();
    updateMeter();
  }

  function init() {
    buildMeter();
    paintNav();
    updateMeter();
    document.addEventListener('app:navigate', (e) => mark(e.detail && e.detail.id));
    if (IV.currentScreenId && IV.currentScreenId()) mark(IV.currentScreenId());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
