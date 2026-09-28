/* ============================================================
   Backup & Restore — portable, recoverable local progress.

   100% client-side. Snapshots every key this app stores in
   localStorage to a single JSON file the user can carry to
   another browser or device, and restores it — with a safe,
   confirmed reset. No backend, no account, no network.

   Additive only: injects one topbar button next to
   #theme-toggle and builds its own modal (cloning the existing
   .modal-backdrop / .modal-box pattern). Touches no existing
   selector, module, router, or animation.

   Data source is localStorage alone. Keys are captured
   generically by this app's prefixes (tv- current, iv- legacy,
   iv: UI prefs), so future keys are backed up automatically.
   ============================================================ */
(function () {
  'use strict';

  var TV = (window.TableViz = window.TableViz || window.IcebergViz || {});
  window.IcebergViz = window.IcebergViz || TV;

  /* ── Constants ─────────────────────────────────────────────── */
  var APP = 'open-table-formats';
  var KIND = 'otf-backup';
  var VERSION = 1;
  var PREFIXES = ['tv-', 'iv-', 'iv:'];       // every family this app writes
  var LAST_EXPORT_KEY = 'iv:backup:last-export';

  /* ── localStorage helpers (all guarded) ────────────────────── */
  function matches(key) {
    if (!key) return false;
    for (var i = 0; i < PREFIXES.length; i++) {
      if (key.indexOf(PREFIXES[i]) === 0) return true;
    }
    return false;
  }

  function storageAvailable() {
    try {
      var t = '__bk_probe__';
      localStorage.setItem(t, '1');
      localStorage.removeItem(t);
      return true;
    } catch (e) {
      return false;
    }
  }

  function collectKeys() {
    var keys = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (matches(k)) keys.push(k);
      }
    } catch (e) { /* private mode / disabled */ }
    return keys;
  }

  function collectData() {
    var data = {};
    var keys = collectKeys();
    for (var i = 0; i < keys.length; i++) {
      try {
        var v = localStorage.getItem(keys[i]);
        if (v !== null) data[keys[i]] = v;      // raw strings, as stored
      } catch (e) { /* skip unreadable key */ }
    }
    return data;
  }

  function clearAppKeys() {
    var keys = collectKeys();
    for (var i = 0; i < keys.length; i++) {
      try { localStorage.removeItem(keys[i]); } catch (e) {}
    }
  }

  function stampExport() {
    try { localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString()); } catch (e) {}
  }

  function lastExportLabel() {
    var iso;
    try { iso = localStorage.getItem(LAST_EXPORT_KEY); } catch (e) { iso = null; }
    if (!iso) return 'No backup yet';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return 'No backup yet';
    return 'Last backup: ' + d.toLocaleString();
  }

  /* ── Backup envelope ───────────────────────────────────────── */
  function buildBackup() {
    return {
      app: APP,
      kind: KIND,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      data: collectData()
    };
  }

  function backupJSON() {
    return JSON.stringify(buildBackup(), null, 2);
  }

  function fileName() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'open-table-formats-backup-' +
      d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '.json';
  }

  /* Validate a parsed object. Throws Error with a friendly message. */
  function validate(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('That file is not a valid backup.');
    if (obj.kind !== KIND) throw new Error('That file is not an Open Table Formats backup.');
    if (!obj.data || typeof obj.data !== 'object') throw new Error('The backup has no data to restore.');
    return obj;
  }

  /* Write a validated backup's data back. mode: 'merge' | 'replace'. */
  function applyBackup(obj, mode) {
    if (mode === 'replace') clearAppKeys();
    var data = obj.data, wrote = 0;
    for (var key in data) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      if (!matches(key)) continue;                 // never write outside our namespace
      try {
        localStorage.setItem(key, String(data[key]));
        wrote++;
      } catch (e) {
        throw new Error('Storage is full — restore stopped. ' + wrote + ' item(s) were written.');
      }
    }
    return wrote;
  }

  /* ── Toast (reuse the shared notifier; degrade to nothing) ──── */
  function toast(msg, type) {
    try {
      if (TV.toast) TV.toast(msg, { type: type || 'success' });
    } catch (e) {}
  }

  /* ── Download ──────────────────────────────────────────────── */
  function download(text, name) {
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ── Modal construction ────────────────────────────────────── */
  var modal = null, lastFocus = null, resetArmed = false;

  function icon(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'width="15" height="15" aria-hidden="true">' + paths + '</svg>';
  }

  function summaryLine() {
    var n = collectKeys().length;
    return n + (n === 1 ? ' item' : ' items') +
      ' · theme, progress, quiz scores, panel sizes & preferences. ' +
      'Nothing is uploaded — everything stays in this browser.';
  }

  function buildModal() {
    var wrap = document.createElement('div');
    wrap.id = 'bk-modal';
    wrap.className = 'modal-backdrop';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'Backup and restore');

    wrap.innerHTML =
      '<div class="modal-box bk-box">' +
        '<div class="modal-title">Backup &amp; Restore</div>' +
        '<button class="modal-close" aria-label="Close backup dialog">✕</button>' +

        // ── Export ──
        '<div class="bk-section">' +
          '<div class="bk-section-title">Export</div>' +
          '<p class="bk-desc">Save all your progress to a file you can move to another browser or device.</p>' +
          '<div class="bk-actions">' +
            '<button class="btn btn-primary" data-bk="download">' +
              icon('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>') +
              'Download backup</button>' +
            '<button class="btn btn-secondary" data-bk="copy">' +
              icon('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>') +
              'Copy to clipboard</button>' +
          '</div>' +
        '</div>' +

        // ── Restore ──
        '<div class="bk-section">' +
          '<div class="bk-section-title">Restore</div>' +
          '<p class="bk-desc">Bring progress back from a backup. <strong>Merge</strong> keeps what you have and overwrites matching items; <strong>Replace</strong> clears everything first.</p>' +
          '<div class="bk-modes" role="radiogroup" aria-label="Restore mode">' +
            '<label class="bk-mode"><input type="radio" name="bk-mode" value="merge" checked /> Merge <span class="bk-mode-hint">(default, safe)</span></label>' +
            '<label class="bk-mode"><input type="radio" name="bk-mode" value="replace" /> Replace <span class="bk-mode-hint">(overwrite all)</span></label>' +
          '</div>' +
          '<div class="bk-actions">' +
            '<button class="btn btn-secondary" data-bk="pick">' +
              icon('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>') +
              'Choose backup file…</button>' +
            '<input type="file" accept="application/json,.json" class="bk-file" hidden aria-hidden="true" tabindex="-1" />' +
          '</div>' +
          '<details class="bk-paste-wrap">' +
            '<summary>Or paste backup text</summary>' +
            '<textarea class="bk-paste" rows="4" spellcheck="false" placeholder="Paste the contents of a backup file here…" aria-label="Paste backup JSON"></textarea>' +
            '<div class="bk-actions"><button class="btn btn-secondary" data-bk="paste">Restore from text</button></div>' +
          '</details>' +
        '</div>' +

        // ── Reset ──
        '<div class="bk-section bk-danger-section">' +
          '<div class="bk-section-title">Reset</div>' +
          '<p class="bk-desc">Clear all saved progress on this browser. This can’t be undone.</p>' +
          '<div class="bk-reset-idle">' +
            '<button class="btn btn-danger" data-bk="reset">' +
              icon('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/>') +
              'Reset all progress</button>' +
          '</div>' +
          '<div class="bk-reset-confirm" hidden>' +
            '<p class="bk-confirm-q">Reset everything? This can’t be undone.</p>' +
            '<div class="bk-actions">' +
              '<button class="btn btn-secondary" data-bk="reset-export">Export a backup first</button>' +
              '<button class="btn btn-danger" data-bk="reset-confirm">Yes, reset everything</button>' +
              '<button class="btn btn-ghost" data-bk="reset-cancel">Cancel</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // ── Footer ──
        '<div class="bk-footer">' +
          '<span class="bk-summary"></span>' +
          '<span class="bk-last badge badge-blue"></span>' +
        '</div>' +
      '</div>';

    document.body.appendChild(wrap);
    wireModal(wrap);
    return wrap;
  }

  function refreshFooter() {
    if (!modal) return;
    var s = modal.querySelector('.bk-summary');
    var l = modal.querySelector('.bk-last');
    if (s) s.textContent = summaryLine();
    if (l) l.textContent = lastExportLabel();
  }

  function armReset(on) {
    resetArmed = on;
    if (!modal) return;
    var idle = modal.querySelector('.bk-reset-idle');
    var conf = modal.querySelector('.bk-reset-confirm');
    if (idle) idle.hidden = on;
    if (conf) conf.hidden = !on;
  }

  function currentMode() {
    var checked = modal && modal.querySelector('input[name="bk-mode"]:checked');
    return checked ? checked.value : 'merge';
  }

  function doRestore(text, mode) {
    var obj;
    try {
      obj = JSON.parse(text);
    } catch (e) {
      toast('That doesn’t look like a valid backup file.', 'error');
      return;
    }
    try {
      validate(obj);
    } catch (e) {
      toast(e.message, 'error');
      return;                                       // existing data untouched
    }
    if (obj.version > VERSION) {
      toast('This backup is from a newer version — restoring what we can.', 'warn');
    }
    var wrote;
    try {
      wrote = applyBackup(obj, mode);
    } catch (e) {
      toast(e.message, 'error');
      return;
    }
    toast('Restored ' + wrote + ' item(s). Reloading…', 'success');
    setTimeout(function () { try { location.reload(); } catch (e) {} }, 700);
  }

  function wireModal(wrap) {
    // Close affordances
    wrap.querySelector('.modal-close').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });

    // Focus trap + Esc
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = focusable();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    var fileInput = wrap.querySelector('.bk-file');
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () { doRestore(String(reader.result || ''), currentMode()); };
      reader.onerror = function () { toast('Couldn’t read that file.', 'error'); };
      reader.readAsText(file);
      fileInput.value = '';                         // allow re-picking same file
    });

    // Action delegation
    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-bk]');
      if (!btn) return;
      var act = btn.getAttribute('data-bk');

      if (act === 'download') {
        try { download(backupJSON(), fileName()); stampExport(); refreshFooter(); toast('Backup downloaded.', 'success'); }
        catch (err) { toast('Couldn’t create the backup file.', 'error'); }

      } else if (act === 'copy') {
        var json = backupJSON();
        var done = function () { stampExport(); refreshFooter(); toast('Backup copied to clipboard.', 'success'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(json).then(done, function () { legacyCopy(json, done); });
        } else { legacyCopy(json, done); }

      } else if (act === 'pick') {
        fileInput.click();

      } else if (act === 'paste') {
        var ta = wrap.querySelector('.bk-paste');
        var text = ta && ta.value.trim();
        if (!text) { toast('Paste a backup first.', 'warn'); return; }
        doRestore(text, currentMode());

      } else if (act === 'reset') {
        armReset(true);

      } else if (act === 'reset-cancel') {
        armReset(false);

      } else if (act === 'reset-export') {
        try { download(backupJSON(), fileName()); stampExport(); refreshFooter(); toast('Backup downloaded — now safe to reset.', 'success'); }
        catch (err) { toast('Couldn’t create the backup file.', 'error'); }

      } else if (act === 'reset-confirm') {
        clearAppKeys();
        armReset(false);
        toast('All progress cleared. Reloading…', 'success');
        setTimeout(function () { try { location.reload(); } catch (e) {} }, 700);
      }
    });
  }

  function legacyCopy(text, done) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch (e) {
      toast('Couldn’t copy — try Download instead.', 'error');
    }
  }

  function focusable() {
    if (!modal) return [];
    var sel = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
    return Array.prototype.filter.call(modal.querySelectorAll(sel), function (el) {
      return el.offsetParent !== null || el === document.activeElement;
    });
  }

  function open() {
    if (!storageAvailable()) {
      toast('Storage isn’t available in this browser (private mode?). Backup can’t run here.', 'error');
      return;
    }
    if (!modal) modal = buildModal();
    lastFocus = document.activeElement;
    armReset(false);
    refreshFooter();
    modal.classList.add('visible');
    var f = focusable();
    if (f.length) f[0].focus();
  }

  function close() {
    if (!modal) return;
    modal.classList.remove('visible');
    armReset(false);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  TV._openBackup = open;

  /* ── Topbar button ─────────────────────────────────────────── */
  function mountButton() {
    var themeBtn = document.getElementById('theme-toggle');
    if (!themeBtn || !themeBtn.parentNode) return;
    if (document.getElementById('bk-open')) return;

    var btn = document.createElement('button');
    btn.id = 'bk-open';
    btn.className = 'btn-icon';
    btn.type = 'button';
    btn.title = 'Backup & restore your progress';
    btn.setAttribute('data-tooltip', 'Backup & restore');
    btn.setAttribute('aria-label', 'Backup and restore your progress');
    btn.innerHTML = icon(
      '<path d="M21 8v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8"/>' +
      '<rect x="1" y="3" width="22" height="5" rx="1"/>' +
      '<line x1="10" y1="12" x2="14" y2="12"/>'
    );
    btn.addEventListener('click', open);
    themeBtn.parentNode.insertBefore(btn, themeBtn);
  }

  function init() { mountButton(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
