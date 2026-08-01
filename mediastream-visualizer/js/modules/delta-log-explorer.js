/* ============================================================
   Delta Log Explorer — 7-step animated _delta_log internals
   CSS prefix: dl-
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Steps ─────────────────────────────────────────────────── */
  const STEPS = [
    {
      label: '_delta_log/ Directory',
      desc: 'Every Delta table has a _delta_log/ subdirectory containing JSON commit files and Parquet checkpoint files.',
      commit: null,
      fileHighlight: null,
    },
    {
      label: 'First Commit: 00000.json',
      desc: 'The very first write creates 00000000000000000000.json containing the protocol and metadata actions.',
      commit: '00000',
      fileHighlight: '00000',
    },
    {
      label: 'Add Files: 00001.json',
      desc: 'Each subsequent write appends a new JSON file. 00001.json adds the first Parquet data files and their statistics.',
      commit: '00001',
      fileHighlight: '00001',
    },
    {
      label: 'Remove Files: 00002.json',
      desc: 'UPDATE and DELETE operations add "remove" actions to mark old files as invalid (logical delete, not physical).',
      commit: '00002',
      fileHighlight: '00002',
    },
    {
      label: 'Checkpoint: 00010.cp.parquet',
      desc: 'Every 10 commits, Delta writes a Parquet checkpoint that collapses all prior JSON commits into a single file.',
      commit: '00010cp',
      fileHighlight: '00010cp',
    },
    {
      label: 'Reading a Snapshot',
      desc: 'To read version N, Delta reads the latest checkpoint ≤ N plus any JSON commits between checkpoint and N.',
      commit: 'read',
      fileHighlight: null,
    },
    {
      label: 'Transaction Isolation',
      desc: 'Concurrent readers always see a consistent snapshot. Writers use optimistic concurrency with conflict detection.',
      commit: 'isolation',
      fileHighlight: null,
    },
  ];

  const COMMITS = {
    '00000': {
      filename: '00000000000000000000.json',
      badge: 'CREATE TABLE',
      badgeColor: '#58a6ff',
      lines: [
        { key: '"protocol"',       val: '{ "minReaderVersion": 1, "minWriterVersion": 2 }', color: '#58a6ff' },
        { key: '"metaData"',       val: '{',                                                 color: '#a371f7' },
        { key: '  "id"',           val: '"e8a6c88b-4c4d-4b62-8d01-aad1a3f5e3bc"',           color: '#8b949e' },
        { key: '  "name"',         val: '"user_sessions"',                                  color: '#3fb950' },
        { key: '  "format"',       val: '{ "provider": "parquet" }',                        color: '#8b949e' },
        { key: '  "schemaString"', val: '"{\"fields\":[{\"name\":\"session_id\"...}]}"',     color: '#8b949e' },
        { key: '  "partitionColumns"', val: '["date_partition"]',                            color: '#e3b341' },
        { key: '  "configuration"', val: '{ "delta.logRetentionDuration": "30 days" }',     color: '#8b949e' },
        { key: '}', val: '', color: '#a371f7' },
      ],
    },
    '00001': {
      filename: '00000000000000000001.json',
      badge: 'INSERT (streaming)',
      badgeColor: '#3fb950',
      lines: [
        { key: '"commitInfo"', val: '{',                                                      color: '#e3b341' },
        { key: '  "timestamp"', val: '1706140800000',                                        color: '#8b949e' },
        { key: '  "operation"', val: '"STREAMING UPDATE"',                                   color: '#3fb950' },
        { key: '  "operationMetrics"', val: '{ "numAddedFiles": 3, "numAddedRows": 1200000 }', color: '#8b949e' },
        { key: '}', val: '', color: '#e3b341' },
        { key: '"add"', val: '{',                                                             color: '#3fb950' },
        { key: '  "path"', val: '"date_partition=2024-01-25/part-00001-abc.parquet"',        color: '#8b949e' },
        { key: '  "size"', val: '134217728',                                                 color: '#8b949e' },
        { key: '  "stats"', val: '{ "numRecords": 400000, "minValues": {...}, "maxValues": {...}, "nullCount": {...} }', color: '#58a6ff' },
        { key: '  "dataChange"', val: 'true',                                                color: '#8b949e' },
        { key: '}', val: '', color: '#3fb950' },
      ],
    },
    '00002': {
      filename: '00000000000000000002.json',
      badge: 'DELETE / UPDATE',
      badgeColor: '#f85149',
      lines: [
        { key: '"commitInfo"', val: '{ "operation": "DELETE", "operationParameters": { "predicate": "user_id = \'ghost-001\'" } }', color: '#e3b341' },
        { key: '"remove"', val: '{',                                                          color: '#f85149' },
        { key: '  "path"', val: '"date_partition=2024-01-25/part-00001-abc.parquet"',        color: '#8b949e' },
        { key: '  "deletionTimestamp"', val: '1706227200000',                               color: '#8b949e' },
        { key: '  "dataChange"', val: 'true',                                                color: '#8b949e' },
        { key: '}', val: '', color: '#f85149' },
        { key: '"add"', val: '{',                                                             color: '#3fb950' },
        { key: '  "path"', val: '"date_partition=2024-01-25/part-00002-def.parquet"',        color: '#8b949e' },
        { key: '  "stats"', val: '{ "numRecords": 399982, ... }',                           color: '#58a6ff' },
        { key: '}', val: '', color: '#3fb950' },
      ],
    },
    '00010cp': {
      filename: '00000000000000000010.checkpoint.parquet',
      badge: 'CHECKPOINT',
      badgeColor: '#a371f7',
      lines: [
        { key: '// Parquet row schema:', val: '',                                             color: '#6e7681' },
        { key: '"txn"',      val: 'null',                                                    color: '#8b949e' },
        { key: '"add"',      val: '{ all currently-live file paths + stats }',               color: '#3fb950' },
        { key: '"remove"',   val: 'null  // removed from snapshot',                          color: '#f85149' },
        { key: '"metaData"', val: '{ current table schema + config }',                       color: '#a371f7' },
        { key: '"protocol"', val: '{ minReaderVersion: 1, minWriterVersion: 2 }',            color: '#58a6ff' },
        { key: '', val: '', color: '' },
        { key: '// _last_checkpoint:', val: '',                                               color: '#6e7681' },
        { key: '{ "version": 10, "size": 5, "parts": 1 }', val: '',                         color: '#e3b341' },
      ],
    },
    read: null,
    isolation: null,
  };

  let _engine = null;

  /* ── Render ────────────────────────────────────────────────── */
  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'dl-page page-enter';
    page.innerHTML = _buildHTML();
    container.appendChild(page);

    _engine = new IV.AnimationEngine({
      steps: STEPS.map((s, i) => ({
        label: s.label,
        description: s.desc,
        duration: 2200,
        enter(ctx) {
          const si = i;
          const el = ctx.el;
          _updateStep(el, si);
        },
      })),
    });

    _engine.setContext({ el: container });

    container.querySelectorAll('.dl-file-row').forEach(el => {
      el.addEventListener('click', () => {
        const step = parseInt(el.dataset.step, 10);
        if (!isNaN(step)) _engine.goto(step);
      });
    });

    container.querySelectorAll('.dl-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  /* ── Update step ──────────────────────────────────────────── */
  function _updateStep(el, si) {
    el.querySelectorAll('.dl-pill').forEach((pill, idx) => {
      pill.classList.toggle('active', idx === si);
      pill.classList.toggle('visited', idx < si);
    });

    const step = STEPS[si];

    /* Highlight active file in tree */
    el.querySelectorAll('.dl-file-row').forEach(row => {
      row.classList.toggle('active', row.dataset.highlight === step.fileHighlight);
    });

    /* Update info panel */
    const title = el.querySelector('#dl-info-title');
    const body = el.querySelector('#dl-info-body');
    if (title) title.textContent = step.label;
    if (body) body.textContent = step.desc;

    /* Update commit viewer */
    const viewer = el.querySelector('#dl-commit-viewer');
    if (viewer) viewer.innerHTML = _buildCommitView(si, step);
  }

  /* ── Commit viewer content ────────────────────────────────── */
  function _buildCommitView(si, step) {
    if (step.commit && COMMITS[step.commit]) {
      const c = COMMITS[step.commit];
      const lines = c.lines.map(l => `
        <div class="dl-json-line">
          <span class="dl-json-key">${l.key}</span>
          ${l.val ? `<span class="dl-json-sep">: </span><span style="color:${l.color || '#8b949e'}">${l.val}</span>` : ''}
        </div>
      `).join('');
      return `
        <div class="dl-commit-header">
          <span class="dl-commit-filename">${c.filename}</span>
          <span class="dl-commit-badge" style="color:${c.badgeColor};background:${c.badgeColor}22;border:1px solid ${c.badgeColor}44">${c.badge}</span>
        </div>
        <div class="dl-json-body">${lines}</div>
      `;
    }

    if (step.commit === 'read') {
      return `
        <div class="dl-commit-header">
          <span class="dl-commit-filename">Reading snapshot (version 12)</span>
        </div>
        <div class="dl-read-steps">
          ${[
            { n: '1', color: '#a371f7', text: 'Read _last_checkpoint → version 10 checkpoint exists' },
            { n: '2', color: '#58a6ff', text: 'Load 00010.checkpoint.parquet → all live files at v10' },
            { n: '3', color: '#3fb950', text: 'Apply 00011.json → adds 3 files, 400K rows' },
            { n: '4', color: '#3fb950', text: 'Apply 00012.json → removes 1 file (GDPR delete)' },
            { n: '5', color: '#e3b341', text: 'Snapshot at v12 = files from checkpoint + incremental adds - removes' },
          ].map(r => `
            <div class="dl-read-step">
              <div class="dl-read-num" style="background:${r.color}22;color:${r.color}">${r.n}</div>
              <div class="dl-read-text">${r.text}</div>
            </div>
          `).join('')}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:12px">
          Time travel: pass version N to read any historical state
        </div>
      `;
    }

    if (step.commit === 'isolation') {
      return `
        <div class="dl-commit-header">
          <span class="dl-commit-filename">Concurrent Writer Isolation</span>
        </div>
        <div class="dl-iso-grid">
          ${[
            { color: '#58a6ff', label: 'Writer A', steps: ['Reads version 12', 'Writes 3 files', 'Tries to commit 00013.json', 'SUCCESS (no conflict)'] },
            { color: '#f97316', label: 'Writer B', steps: ['Reads version 12', 'Writes 2 files', 'Tries to commit 00013.json', 'CONFLICT → retry at v13'] },
          ].map(w => `
            <div class="dl-iso-writer" style="border-color:${w.color}44">
              <div class="dl-iso-writer-label" style="color:${w.color}">${w.label}</div>
              ${w.steps.map((s, i) => `
                <div class="dl-iso-step">
                  <div class="dl-iso-dot" style="background:${w.color}"></div>
                  <div style="font-size:11px;color:var(--text-secondary)">${s}</div>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:12px">
          Optimistic concurrency: writers retry if another commit landed first
        </div>
      `;
    }

    return `<div style="color:var(--text-muted);font-size:13px;padding:16px">Select a step to view commit details</div>`;
  }

  /* ── HTML Shell ───────────────────────────────────────────── */
  function _buildHTML() {
    const pills = STEPS.map((s, i) => `
      <button class="dl-pill${i === 0 ? ' active' : ''}" data-step="${i}">${i + 1}</button>
    `).join('');

    const files = [
      { name: '00000000000000000000.json', type: 'json', badge: 'CREATE', badgeColor: '#58a6ff', highlight: '00000', step: 1 },
      { name: '00000000000000000001.json', type: 'json', badge: 'INSERT', badgeColor: '#3fb950', highlight: '00001', step: 2 },
      { name: '00000000000000000002.json', type: 'json', badge: 'DELETE', badgeColor: '#f85149', highlight: '00002', step: 3 },
      { name: '…  (00003 – 00009.json)',   type: 'more', badge: '',       badgeColor: '#6e7681', highlight: null,    step: null },
      { name: '00000000000000000010.checkpoint.parquet', type: 'cp', badge: 'CHECKPOINT', badgeColor: '#a371f7', highlight: '00010cp', step: 4 },
      { name: '_last_checkpoint',           type: 'meta', badge: 'META',  badgeColor: '#e3b341', highlight: null,    step: null },
    ];

    const fileRows = files.map(f => `
      <div class="dl-file-row${f.step !== null ? ' clickable' : ''}"
        data-highlight="${f.highlight || ''}"
        data-step="${f.step !== null ? f.step : ''}">
        <span class="dl-file-icon">${f.type === 'json' ? '📄' : f.type === 'cp' ? '📦' : f.type === 'meta' ? '🔖' : '⋯'}</span>
        <span class="dl-file-name">${f.name}</span>
        ${f.badge ? `<span class="dl-file-badge" style="color:${f.badgeColor};background:${f.badgeColor}18">${f.badge}</span>` : ''}
      </div>
    `).join('');

    return `
<style>
.dl-page { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

.dl-header {
  padding: var(--space-4) var(--space-6); background: var(--bg-2);
  border-bottom: 1px solid var(--border-default); flex-shrink: 0;
  display: flex; align-items: center; gap: var(--space-4);
}
.dl-header-text { flex: 1; }
.dl-title { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.dl-subtitle { font-size: var(--text-sm); color: var(--text-muted); margin-top: 2px; }
.dl-pills { display: flex; gap: 6px; }
.dl-pill {
  width: 28px; height: 28px; border-radius: var(--radius-full);
  font-size: var(--text-xs); font-weight: 700;
  background: var(--bg-3); border: 1px solid var(--border-default); color: var(--text-muted);
  cursor: pointer; transition: all var(--ease-base); display: flex; align-items: center; justify-content: center;
}
.dl-pill:hover { border-color: var(--border-muted); color: var(--text-secondary); }
.dl-pill.visited { border-color: var(--border-muted); color: var(--text-secondary); }
.dl-pill.active { background: rgba(255,107,53,.15); border-color: var(--delta); color: var(--delta); }

.dl-body {
  flex: 1; display: grid; grid-template-columns: 260px 1fr 300px;
  min-height: 0; overflow: hidden;
}

/* File tree */
.dl-file-tree {
  border-right: 1px solid var(--border-default); background: var(--bg-1);
  padding: var(--space-4); overflow-y: auto;
}
.dl-tree-label {
  font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
  color: var(--text-muted); margin-bottom: var(--space-3);
}
.dl-tree-path {
  font-family: var(--font-mono); font-size: 11px; color: var(--delta);
  margin-bottom: var(--space-3); line-height: 1.4;
}
.dl-delta-log-label {
  font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary);
  padding: 4px 0; border-bottom: 1px solid var(--border-subtle); margin-bottom: 4px;
}
.dl-file-row {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 8px; border-radius: var(--radius-sm);
  font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);
  margin-bottom: 2px; border: 1px solid transparent;
  transition: background var(--ease-fast), border-color var(--ease-fast);
}
.dl-file-row.clickable { cursor: pointer; }
.dl-file-row.clickable:hover { background: var(--bg-3); color: var(--text-secondary); }
.dl-file-row.active { background: rgba(255,107,53,.08); border-color: rgba(255,107,53,.3); color: var(--text-primary); }
.dl-file-icon { font-size: 12px; flex-shrink: 0; }
.dl-file-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dl-file-badge {
  font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 3px;
  white-space: nowrap; flex-shrink: 0;
}

/* Commit viewer */
.dl-commit-viewer {
  padding: var(--space-4); background: var(--bg-1); overflow-y: auto;
  border-right: 1px solid var(--border-default);
}
.dl-commit-header {
  display: flex; align-items: center; gap: 8px; margin-bottom: var(--space-3);
  padding-bottom: var(--space-3); border-bottom: 1px solid var(--border-default);
  flex-wrap: wrap;
}
.dl-commit-filename {
  font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); flex: 1;
}
.dl-commit-badge {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-full);
  white-space: nowrap;
}
.dl-json-body { font-family: var(--font-mono); font-size: 11px; line-height: 1.7; }
.dl-json-line { display: flex; gap: 4px; flex-wrap: wrap; }
.dl-json-key { color: var(--blue); }
.dl-json-sep { color: var(--text-muted); }

/* Read steps */
.dl-read-steps { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-3); }
.dl-read-step { display: flex; align-items: flex-start; gap: var(--space-2); }
.dl-read-num {
  width: 20px; height: 20px; border-radius: var(--radius-full);
  font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.dl-read-text { font-size: 12px; color: var(--text-secondary); line-height: 1.5; padding-top: 2px; }

/* Isolation grid */
.dl-iso-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-top: var(--space-3); }
.dl-iso-writer { border: 1px solid; border-radius: var(--radius-md); padding: var(--space-3); }
.dl-iso-writer-label { font-size: 12px; font-weight: 700; margin-bottom: var(--space-2); }
.dl-iso-step { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.dl-iso-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

/* Info panel */
.dl-info-panel {
  background: var(--bg-2); padding: var(--space-5);
  display: flex; flex-direction: column; gap: var(--space-4); overflow-y: auto;
}
.dl-info-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.dl-info-body { font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.6; }
.dl-concepts { display: flex; flex-direction: column; gap: var(--space-2); }
.dl-concept { background: var(--bg-3); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: var(--space-3); }
.dl-concept-title { font-size: var(--text-xs); font-weight: 700; color: var(--delta); margin-bottom: 4px; }
.dl-concept-body { font-size: 11px; color: var(--text-muted); line-height: 1.5; }
.dl-nav-hint { font-size: var(--text-xs); color: var(--text-muted); margin-top: auto; }
</style>

<div class="dl-header">
  <div class="dl-header-text">
    <div class="dl-title">Delta Log Explorer</div>
    <div class="dl-subtitle">Inside _delta_log/ — the transaction log that makes Delta Lake work</div>
  </div>
  <div class="dl-pills">${pills}</div>
</div>

<div class="dl-body">
  <!-- File tree -->
  <div class="dl-file-tree">
    <div class="dl-tree-label">S3 File Tree</div>
    <div class="dl-tree-path">s3://ms-datalake/silver/user_sessions/</div>
    <div class="dl-delta-log-label">_delta_log/</div>
    ${fileRows}
    <div style="margin-top:8px;font-size:10px;color:var(--text-muted);font-family:var(--font-mono)">
      part-00001-abc.parquet<br>
      part-00002-def.parquet<br>
      part-00003-ghi.parquet
    </div>
  </div>

  <!-- Commit viewer -->
  <div class="dl-commit-viewer" id="dl-commit-viewer">
    <div style="color:var(--text-muted);font-size:13px;padding:16px">
      Press Play or click a file in the tree to explore commit entries
    </div>
  </div>

  <!-- Info panel -->
  <div class="dl-info-panel">
    <div id="dl-info-title" class="dl-info-title">${STEPS[0].label}</div>
    <div id="dl-info-body" class="dl-info-body">${STEPS[0].desc}</div>
    <div class="dl-concepts">
      <div class="dl-concept">
        <div class="dl-concept-title">Action Types</div>
        <div class="dl-concept-body">
          <b style="color:var(--blue)">add</b> — new file with stats<br>
          <b style="color:var(--red)">remove</b> — soft-delete a file<br>
          <b style="color:var(--purple)">metaData</b> — schema change<br>
          <b style="color:var(--blue)">protocol</b> — reader/writer version<br>
          <b style="color:var(--yellow)">commitInfo</b> — operation audit<br>
          <b style="color:var(--teal)">cdc</b> — change data capture rows
        </div>
      </div>
      <div class="dl-concept">
        <div class="dl-concept-title">Checkpoint Rules</div>
        <div class="dl-concept-body">
          Created every 10 commits by default<br>
          Collapses all JSON into one Parquet<br>
          Only live "add" actions survive<br>
          "remove" actions are dropped
        </div>
      </div>
    </div>
    <div class="dl-nav-hint">Click files in the tree or use animation controls</div>
  </div>
</div>
`;
  }

  /* ── Register ─────────────────────────────────────────────── */
  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['delta-log-explorer'] = {
    id: 'delta-log-explorer',
    title: 'Delta Log Explorer',
    group: 'start',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
