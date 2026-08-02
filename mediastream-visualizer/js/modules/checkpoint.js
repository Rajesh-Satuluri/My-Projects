(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'What is it',
      desc: 'Delta checkpoints — Parquet snapshots of table state',
      detail: 'A Delta checkpoint is a Parquet file that captures the complete state of a Delta table at a specific version — all currently active files, their statistics, and table metadata. Without checkpoints, reading a table requires replaying every JSON log entry from version 0, which is prohibitively slow for high-version tables. Checkpoints compress the entire log history into a single Parquet file that can be read in one pass. They are created automatically every 10 commits by default.',
    },
    {
      label: 'Structure',
      desc: 'What a checkpoint file contains',
      detail: 'A checkpoint is stored as a Parquet file (or multi-part Parquet for large tables) at _delta_log/NNNNNNNNNN.checkpoint.parquet. It contains one row per active data file with: path, partitionValues, size, modificationTime, stats (min/max per column), and tags. It also includes protocol and metadata entries. Reading a table at version N means: find the latest checkpoint at version M ≤ N, read it, then replay only the JSON log entries from version M+1 to N.',
    },
    {
      label: 'Trigger',
      desc: 'When checkpoints are created',
      detail: 'Checkpoints are created automatically after every 10 commits (configurable via delta.checkpointInterval property). They are written asynchronously by the writer after the commit completes. The checkpoint is only visible to readers once it\'s fully written — a partially written checkpoint is ignored. You can also trigger a checkpoint manually with DeltaTable.forPath(spark, path).createCheckpoint(). At MediaStream Bronze (100K+ commits/day), this creates 10,000+ checkpoints per day.',
    },
    {
      label: 'Log Reading',
      desc: 'How Delta reads the log efficiently using checkpoints',
      detail: 'When Spark opens a Delta table for reading: Step 1 — scan _delta_log/ for the latest .checkpoint.parquet file (O(1) lookup using _last_checkpoint file). Step 2 — read the checkpoint Parquet to get the full file list at version M. Step 3 — replay only the JSON entries from M+1 to current version N. Without checkpoints, Step 2 would require reading thousands of JSON files. With them, only a handful of JSON files need to be read after the last checkpoint.',
    },
    {
      label: 'At Scale',
      desc: 'Log compaction at MediaStream scale',
      detail: 'MediaStream Bronze table (silver.user_events source): 27,778 rows/sec from 12 Kafka consumers = ~2.4B commits/day at micro-batch granularity. With delta.checkpointInterval=10, this generates ~240M checkpoints/day — that\'s extreme. In practice, MediaStream uses trigger.once() batch processing (not true streaming) for Bronze, producing ~480 commits/day (every 3 minutes), yielding ~48 checkpoints/day per table. The _last_checkpoint file makes finding the latest checkpoint an O(1) metadata read.',
    },
    {
      label: 'Last Checkpoint',
      desc: '_last_checkpoint file — O(1) checkpoint discovery',
      detail: '_delta_log/_last_checkpoint is a tiny JSON file written after each checkpoint: {"version": N, "size": M, "parts": P}. It lets readers find the latest checkpoint without listing all files in _delta_log/. If _last_checkpoint is missing or corrupted, Delta falls back to listing the directory. For tables with logRetentionDuration (90 days at MediaStream), old checkpoints are cleaned up by VACUUM — but _last_checkpoint always points to a retained one. Never manually delete this file.',
    },
  ];

  const DIAGRAMS = [
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Delta Checkpoint: Log Compaction</text>
      <text x="240" y="46" text-anchor="middle" fill="var(--text-muted)" font-size="8.5">Without checkpoints, reading a table replays every JSON entry from v0</text>
      <rect x="14" y="58" width="452" height="110" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="76" fill="var(--text-muted)" font-size="8" font-weight="700">_delta_log/ contents</text>
      <rect x="24" y="84" width="42" height="28" rx="4" fill="rgba(255,107,53,0.15)" stroke="var(--delta)" stroke-width="1"/>
      <text x="45" y="96" text-anchor="middle" fill="var(--delta)" font-size="7">v1.json</text>
      <text x="45" y="107" text-anchor="middle" fill="var(--text-muted)" font-size="6.5">add/rm</text>
      <rect x="72" y="84" width="42" height="28" rx="4" fill="rgba(255,107,53,0.1)"/>
      <text x="93" y="96" text-anchor="middle" fill="var(--text-muted)" font-size="7">v2.json</text>
      <rect x="120" y="84" width="42" height="28" rx="4" fill="rgba(255,107,53,0.1)"/>
      <text x="141" y="96" text-anchor="middle" fill="var(--text-muted)" font-size="7">v3.json</text>
      <text x="175" y="100" text-anchor="middle" fill="var(--text-muted)" font-size="8">…</text>
      <rect x="192" y="84" width="56" height="28" rx="4" fill="rgba(168,85,247,0.2)" stroke="#a855f7" stroke-width="1.5"/>
      <text x="220" y="96" text-anchor="middle" fill="#a855f7" font-size="8" font-weight="700">v10.ckpt</text>
      <text x="220" y="107" text-anchor="middle" fill="var(--text-muted)" font-size="6.5">Parquet snapshot</text>
      <rect x="254" y="84" width="42" height="28" rx="4" fill="rgba(255,107,53,0.1)"/>
      <text x="275" y="96" text-anchor="middle" fill="var(--text-muted)" font-size="7">v11.json</text>
      <rect x="302" y="84" width="42" height="28" rx="4" fill="rgba(255,107,53,0.1)"/>
      <text x="323" y="96" text-anchor="middle" fill="var(--text-muted)" font-size="7">v12.json</text>
      <text x="356" y="100" text-anchor="middle" fill="var(--text-muted)" font-size="8">…</text>
      <rect x="372" y="84" width="56" height="28" rx="4" fill="rgba(168,85,247,0.2)" stroke="#a855f7" stroke-width="1.5"/>
      <text x="400" y="96" text-anchor="middle" fill="#a855f7" font-size="8" font-weight="700">v20.ckpt</text>
      <text x="400" y="107" text-anchor="middle" fill="var(--text-muted)" font-size="6.5">Parquet snapshot</text>
      <text x="240" y="132" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">To read at v23: load v20 checkpoint + replay v21, v22, v23 JSON  (3 files, not 23)</text>
      <text x="240" y="148" text-anchor="middle" fill="var(--delta)" font-size="7.5">Without checkpoint: replay all 23 JSON files — 7× more I/O</text>
      <rect x="14" y="182" width="452" height="90" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="240" y="200" text-anchor="middle" fill="var(--text-muted)" font-size="8.5" font-weight="700">Checkpoint benefit grows with table age</text>
      <text x="30" y="218" fill="var(--text-muted)" font-size="8">v100 table, no checkpoints: read 100 JSON files</text>
      <text x="30" y="234" fill="var(--delta)" font-size="8">v100 table, checkpoint every 10: read 1 Parquet + 0-9 JSON files</text>
      <text x="30" y="250" fill="var(--delta)" font-size="8">MediaStream Bronze: ~48 checkpoints/day · 4 JSON files avg at read time</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Checkpoint File Structure</text>
      <rect x="14" y="38" width="452" height="224" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="58" fill="var(--text-muted)" font-size="8" font-weight="700">Path: _delta_log/0000000000000000010.checkpoint.parquet</text>
      <text x="24" y="74" fill="var(--text-muted)" font-size="8" font-weight="700">Schema (one row per active file at checkpoint version):</text>
      <rect x="24" y="82" width="420" height="130" rx="5" fill="var(--bg-4)"/>
      <text x="34" y="98" fill="var(--delta)" font-size="8">txn:          {appId, version, lastUpdated}</text>
      <text x="34" y="112" fill="var(--delta)" font-size="8">add: {</text>
      <text x="34" y="126" fill="var(--delta)" font-size="8">  path:            "part-00001-abc.parquet"</text>
      <text x="34" y="140" fill="var(--delta)" font-size="8">  partitionValues: {"event_date": "2025-01-15"}</text>
      <text x="34" y="154" fill="var(--delta)" font-size="8">  size:            1073741824  (1 GB)</text>
      <text x="34" y="168" fill="var(--delta)" font-size="8">  stats:           {"numRecords":4M, "minValues":..., "maxValues":...}</text>
      <text x="34" y="182" fill="var(--delta)" font-size="8">  dataChange:      false</text>
      <text x="34" y="196" fill="var(--delta)" font-size="8">}</text>
      <text x="24" y="226" fill="var(--text-muted)" font-size="8">Also includes: protocol (reader/writer version) and metadata (schema, config)</text>
      <text x="24" y="242" fill="var(--text-muted)" font-size="8">For large tables: multi-part checkpoint (.checkpoint.0000N.N.parquet)</text>
      <text x="240" y="276" text-anchor="middle" fill="var(--text-muted)" font-size="8">Checkpoint is Parquet → column stats allow selective reads (e.g. by partition)</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Checkpoint Trigger &amp; Configuration</text>
      <rect x="14" y="38" width="452" height="224" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="58" fill="var(--text-muted)" font-size="8" font-weight="700">-- Default: checkpoint every 10 commits</text>
      <text x="24" y="72" fill="var(--delta)" font-size="8.5">-- Controlled by delta.checkpointInterval table property</text>
      <text x="24" y="88" fill="var(--text-muted)" font-size="8" font-weight="700">-- Change checkpoint interval for high-volume tables</text>
      <text x="24" y="102" fill="var(--delta)" font-size="8.5">ALTER TABLE bronze.raw_events</text>
      <text x="24" y="116" fill="var(--delta)" font-size="8.5">SET TBLPROPERTIES ('delta.checkpointInterval' = '100');</text>
      <text x="24" y="132" fill="var(--text-muted)" font-size="8" font-weight="700">-- Manually trigger a checkpoint (Python)</text>
      <text x="24" y="146" fill="var(--delta)" font-size="8.5">from delta.tables import DeltaTable</text>
      <text x="24" y="160" fill="var(--delta)" font-size="8.5">DeltaTable.forPath(spark, "/path/to/table").createCheckpoint()</text>
      <text x="24" y="176" fill="var(--text-muted)" font-size="8" font-weight="700">-- Checkpoint retention (controlled by logRetentionDuration)</text>
      <text x="24" y="190" fill="var(--delta)" font-size="8.5">ALTER TABLE bronze.raw_events</text>
      <text x="24" y="204" fill="var(--delta)" font-size="8.5">SET TBLPROPERTIES ('delta.logRetentionDuration' = 'interval 90 days');</text>
      <text x="24" y="220" fill="var(--text-muted)" font-size="8" font-weight="700">-- VACUUM cleans old checkpoints beyond logRetentionDuration</text>
      <text x="24" y="234" fill="var(--delta)" font-size="8.5">VACUUM bronze.raw_events;  -- also cleans old .checkpoint files</text>
      <text x="240" y="278" text-anchor="middle" fill="var(--text-muted)" font-size="8">Checkpoint is async — committed first, then checkpoint written in background</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Log Reading with Checkpoints</text>
      <rect x="20" y="42" width="440" height="56" rx="7" fill="rgba(255,107,53,0.08)" stroke="var(--delta)" stroke-width="1.5"/>
      <text x="240" y="60" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">Step 1: Read _last_checkpoint (O(1))</text>
      <text x="240" y="76" text-anchor="middle" fill="var(--text-muted)" font-size="8">{"version": 50, "size": 12480}  → latest checkpoint is at v50</text>
      <defs><marker id="ack" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L7,2.5 z" fill="var(--delta)"/></marker></defs>
      <path d="M240 98 L240 116" stroke="var(--delta)" stroke-width="1.2" marker-end="url(#ack)" fill="none"/>
      <rect x="20" y="116" width="440" height="50" rx="7" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="240" y="134" text-anchor="middle" fill="var(--text-secondary)" font-size="9" font-weight="700">Step 2: Read v50 checkpoint (1 Parquet file)</text>
      <text x="240" y="150" text-anchor="middle" fill="var(--text-muted)" font-size="8">Gets full list of active files + their stats at version 50</text>
      <path d="M240 166 L240 184" stroke="var(--delta)" stroke-width="1.2" marker-end="url(#ack)" fill="none"/>
      <rect x="20" y="184" width="440" height="50" rx="7" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="240" y="202" text-anchor="middle" fill="var(--text-secondary)" font-size="9" font-weight="700">Step 3: Replay v51, v52, v53 JSON (3 files)</text>
      <text x="240" y="218" text-anchor="middle" fill="var(--text-muted)" font-size="8">Apply add/remove actions to get table state at current version 53</text>
      <text x="240" y="252" text-anchor="middle" fill="var(--delta)" font-size="8.5" font-weight="700">Total: 1 Parquet + 3 JSON = 4 files read instead of 53 JSON files</text>
      <text x="240" y="270" text-anchor="middle" fill="var(--text-muted)" font-size="8">Speedup: 13× at v53 · grows linearly with table version</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Checkpoint Scale at MediaStream</text>
      <rect x="14" y="40" width="220" height="220" rx="7" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="124" y="58" text-anchor="middle" fill="var(--text-secondary)" font-size="9" font-weight="700">Bronze Tables</text>
      <text x="124" y="74" text-anchor="middle" fill="var(--text-muted)" font-size="8">12 Kafka consumers</text>
      <text x="124" y="88" text-anchor="middle" fill="var(--text-muted)" font-size="8">trigger.once() every 3 min</text>
      <text x="124" y="104" text-anchor="middle" fill="var(--delta)" font-size="8">~480 commits/day/table</text>
      <text x="124" y="120" text-anchor="middle" fill="var(--delta)" font-size="8">~48 checkpoints/day</text>
      <text x="124" y="140" text-anchor="middle" fill="var(--text-muted)" font-size="8">checkpointInterval: 10</text>
      <text x="124" y="156" text-anchor="middle" fill="var(--text-muted)" font-size="8">logRetention: 30 days</text>
      <text x="124" y="172" text-anchor="middle" fill="var(--text-muted)" font-size="8">Max JSON replay: 9 files</text>
      <text x="124" y="192" text-anchor="middle" fill="var(--delta)" font-size="8" font-weight="700">Read latency: ~12ms</text>
      <text x="124" y="208" text-anchor="middle" fill="var(--text-muted)" font-size="8">for table scan planning</text>
      <rect x="246" y="40" width="220" height="220" rx="7" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="356" y="58" text-anchor="middle" fill="var(--text-secondary)" font-size="9" font-weight="700">Gold Tables</text>
      <text x="356" y="74" text-anchor="middle" fill="var(--text-muted)" font-size="8">Daily rebuild jobs</text>
      <text x="356" y="88" text-anchor="middle" fill="var(--text-muted)" font-size="8">1–3 commits/day/table</text>
      <text x="356" y="104" text-anchor="middle" fill="var(--delta)" font-size="8">~1 checkpoint/10 days</text>
      <text x="356" y="120" text-anchor="middle" fill="var(--delta)" font-size="8">minimal checkpoint overhead</text>
      <text x="356" y="140" text-anchor="middle" fill="var(--text-muted)" font-size="8">checkpointInterval: 10</text>
      <text x="356" y="156" text-anchor="middle" fill="var(--text-muted)" font-size="8">logRetention: 90 days</text>
      <text x="356" y="172" text-anchor="middle" fill="var(--text-muted)" font-size="8">Max JSON replay: 9 files</text>
      <text x="356" y="192" text-anchor="middle" fill="var(--delta)" font-size="8" font-weight="700">Read latency: ~4ms</text>
      <text x="356" y="208" text-anchor="middle" fill="var(--text-muted)" font-size="8">for table scan planning</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">_last_checkpoint File</text>
      <rect x="14" y="38" width="452" height="224" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="58" fill="var(--text-muted)" font-size="8" font-weight="700">Path: _delta_log/_last_checkpoint</text>
      <text x="24" y="72" fill="var(--text-muted)" font-size="8" font-weight="700">Content (tiny JSON — written after each checkpoint):</text>
      <rect x="24" y="80" width="420" height="40" rx="5" fill="var(--bg-4)"/>
      <text x="34" y="96" fill="var(--delta)" font-size="8.5">{"version": 50, "size": 12480, "parts": 1}</text>
      <text x="34" y="112" fill="var(--text-muted)" font-size="7.5">-- size: number of rows in checkpoint (active file count)</text>
      <text x="24" y="132" fill="var(--text-muted)" font-size="8" font-weight="700">Why it matters:</text>
      <text x="24" y="148" fill="var(--text-muted)" font-size="8">Without it: list all files in _delta_log/ to find latest .checkpoint.parquet</text>
      <text x="24" y="162" fill="var(--delta)" font-size="8">With it: O(1) lookup — read one file, go directly to v50 checkpoint</text>
      <text x="24" y="178" fill="var(--text-muted)" font-size="8" font-weight="700">Multi-part checkpoint (large tables):</text>
      <rect x="24" y="186" width="420" height="40" rx="5" fill="var(--bg-4)"/>
      <text x="34" y="202" fill="var(--delta)" font-size="8.5">{"version": 100, "size": 500000, "parts": 5}</text>
      <text x="34" y="216" fill="var(--text-muted)" font-size="7.5">-- 5 Parquet files: 00100.checkpoint.0000001.0000005.parquet, etc.</text>
      <line x1="24" y1="228" x2="452" y2="228" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <text x="24" y="246" fill="var(--delta)" font-size="8">NEVER manually delete _last_checkpoint — Delta falls back to dir listing</text>
      <text x="24" y="260" fill="var(--text-muted)" font-size="8">VACUUM preserves the latest checkpoint even when cleaning old log files</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    el.querySelectorAll('.ck-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.ck-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.ck-info');
    if (info) info.textContent = STEPS[si].detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="ck-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="ck-header module-header">
        <div>
          <div class="module-tag" style="background:var(--delta)">WRITE OPS</div>
          <h2 class="module-title">Checkpoint</h2>
          <p class="module-subtitle">Parquet snapshots of Delta table state that make log reads O(1) — created every 10 commits by default</p>
        </div>
      </div>
      <div class="ck-pills step-pills">${pills}</div>
      <div class="ck-diagram diagram-frame"></div>
      <div class="ck-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'ck-page page-enter';
    page.innerHTML = _buildHTML();
    container.appendChild(page);

    _engine = new IV.AnimationEngine({
      steps: STEPS.map((s, i) => ({
        label: s.label,
        description: s.desc,
        duration: 2000,
        enter(ctx) {
          const si = i;
          const el = ctx.el;
          _updateStep(el, si);
        },
      })),
    });

    _engine.setContext({ el: container });
    container.querySelectorAll('.ck-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['checkpoint'] = {
    id: 'checkpoint', title: 'Checkpoint', group: 'Write Operations',
    render: _render,
    destroy() { if (_engine) { _engine.destroy(); _engine = null; } IV.AnimationControls.hide(); },
  };
})();
