(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'What is CDF',
      desc: 'Change Data Feed captures row-level changes',
      detail: 'Change Data Feed (CDF) is a Delta Lake feature that automatically captures every row-level change (insert, update, delete) as it happens, making them available for downstream consumers via the table_changes() function. Without CDF, downstream jobs must reprocess the entire table or partition to find changes. With CDF, only the changed rows are exposed — dramatically reducing downstream compute. Enabled per-table via a table property.',
    },
    {
      label: 'Enable CDF',
      desc: 'Enabling Change Data Feed on a Delta table',
      detail: 'Enable CDF by setting the delta.enableChangeDataFeed table property. Can be set at creation time or added later with ALTER TABLE. Once enabled, Delta writes change records alongside normal data writes — there is a small storage overhead (~5–10% extra) for maintaining the change log. CDF works with streaming and batch writes, MERGE operations, and DELETE/UPDATE commands. APPLY CHANGES INTO (DLT) automatically uses CDF under the hood.',
    },
    {
      label: '_change_type',
      desc: 'Four change types recorded by CDF',
      detail: 'CDF adds a _change_type column to every row: "insert" — new row added via INSERT or MERGE NOT MATCHED. "delete" — row removed via DELETE or MERGE WHEN MATCHED AND DELETE. "update_preimage" — the row state BEFORE an update (old values). "update_postimage" — the row state AFTER an update (new values). Each CDF record also includes _commit_version (Delta version) and _commit_timestamp. Pre/post image pairs share the same _commit_version.',
    },
    {
      label: 'table_changes()',
      desc: 'Reading CDF data with table_changes()',
      detail: 'Use table_changes(tableName, startingVersion) or table_changes(tableName, startingTimestamp) to read changes. Returns all changed rows with the _change_type column. For incremental pipelines: store the last processed version, then call table_changes() with startingVersion = lastVersion + 1. For streaming: use readStream with option("readChangeFeed", "true") and option("startingVersion", N) — Delta handles checkpointing automatically.',
    },
    {
      label: 'Streaming CDF',
      desc: 'Streaming reads of Change Data Feed',
      detail: 'Structured Streaming supports CDF as a source via readChangeFeed option. The stream delivers batches of changed rows — each micro-batch contains only the changes since the last checkpoint. This is the recommended pattern for propagating Silver changes to Gold tables and ML feature stores. At MediaStream, CDF streams reduce Gold table refresh latency from hourly batch to ~5-minute micro-batch, while processing 6× less data per run.',
    },
    {
      label: 'Efficiency',
      desc: '94% less data processed — MediaStream CDF impact',
      detail: 'Before CDF: Gold table refresh re-scans all Silver data for the day (~820GB per run). With CDF: only changed rows are read (~50GB typical, ~5% of daily Silver volume). Impact at MediaStream: 94% reduction in downstream data processed, Gold refresh time from 47min → 4min, ML feature pipeline from 2.8h → 18min. The tradeoff: ~5–10% larger Silver table footprint due to change log storage. ROI is strongly positive for any table with frequent downstream consumers.',
    },
  ];

  const DIAGRAMS = [
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Change Data Feed: Before &amp; After</text>
      <rect x="16" y="42" width="210" height="220" rx="7" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="121" y="60" text-anchor="middle" fill="var(--text-secondary)" font-size="9" font-weight="700">WITHOUT CDF</text>
      <rect x="28" y="70" width="186" height="36" rx="5" fill="rgba(255,107,53,0.15)" stroke="var(--delta)" stroke-width="1"/>
      <text x="121" y="83" text-anchor="middle" fill="var(--delta)" font-size="8">Silver (820GB/day)</text>
      <text x="121" y="97" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Full table scan every refresh</text>
      <path d="M121 106 L121 124" stroke="var(--text-muted)" stroke-width="1.2" stroke-dasharray="4,2" fill="none"/>
      <text x="121" y="140" text-anchor="middle" fill="var(--text-muted)" font-size="8">Downstream reads 820GB</text>
      <text x="121" y="154" text-anchor="middle" fill="var(--text-muted)" font-size="8">to find ~50GB changed</text>
      <rect x="28" y="168" width="186" height="36" rx="5" fill="var(--bg-4)"/>
      <text x="121" y="181" text-anchor="middle" fill="var(--text-muted)" font-size="8">Gold refresh: 47 min</text>
      <text x="121" y="195" text-anchor="middle" fill="var(--text-muted)" font-size="8">ML pipeline: 2.8 hours</text>
      <text x="121" y="225" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">94% wasted compute</text>
      <rect x="254" y="42" width="210" height="220" rx="7" fill="rgba(255,107,53,0.05)" stroke="var(--delta)" stroke-width="1.5"/>
      <text x="359" y="60" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">WITH CDF</text>
      <rect x="266" y="70" width="186" height="36" rx="5" fill="rgba(255,107,53,0.15)" stroke="var(--delta)" stroke-width="1"/>
      <text x="359" y="83" text-anchor="middle" fill="var(--delta)" font-size="8">Silver + CDF log</text>
      <text x="359" y="97" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">table_changes() → only diffs</text>
      <path d="M359 106 L359 124" stroke="var(--delta)" stroke-width="1.2" fill="none" marker-end="url(#acdf)"/>
      <defs><marker id="acdf" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L7,2.5 z" fill="var(--delta)"/></marker></defs>
      <text x="359" y="140" text-anchor="middle" fill="var(--delta)" font-size="8">Downstream reads ~50GB</text>
      <text x="359" y="154" text-anchor="middle" fill="var(--delta)" font-size="8">only the changed rows</text>
      <rect x="266" y="168" width="186" height="36" rx="5" fill="rgba(34,197,94,0.15)" stroke="#22c55e" stroke-width="1"/>
      <text x="359" y="181" text-anchor="middle" fill="#22c55e" font-size="8">Gold refresh: 4 min</text>
      <text x="359" y="195" text-anchor="middle" fill="#22c55e" font-size="8">ML pipeline: 18 min</text>
      <text x="359" y="225" text-anchor="middle" fill="#22c55e" font-size="9" font-weight="700">94% less data processed</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Enable Change Data Feed</text>
      <rect x="14" y="38" width="452" height="224" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="58" fill="var(--text-muted)" font-size="8" font-weight="700">-- Option 1: Enable at table creation</text>
      <text x="24" y="72" fill="var(--delta)" font-size="8.5">CREATE TABLE silver.user_events (user_id STRING, ...)</text>
      <text x="24" y="86" fill="var(--delta)" font-size="8.5">TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');</text>
      <text x="24" y="102" fill="var(--text-muted)" font-size="8" font-weight="700">-- Option 2: Enable on existing table</text>
      <text x="24" y="116" fill="var(--delta)" font-size="8.5">ALTER TABLE silver.user_events</text>
      <text x="24" y="130" fill="var(--delta)" font-size="8.5">SET TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');</text>
      <text x="24" y="146" fill="var(--text-muted)" font-size="8" font-weight="700">-- Enable for all new tables (cluster-wide default)</text>
      <text x="24" y="160" fill="var(--delta)" font-size="8.5">SET spark.databricks.delta.properties.defaults</text>
      <text x="24" y="174" fill="var(--delta)" font-size="8.5">  .enableChangeDataFeed = true;</text>
      <text x="24" y="190" fill="var(--text-muted)" font-size="8" font-weight="700">-- Verify CDF is active</text>
      <text x="24" y="204" fill="var(--delta)" font-size="8.5">SHOW TBLPROPERTIES silver.user_events</text>
      <text x="24" y="218" fill="var(--delta)" font-size="8.5">  ('delta.enableChangeDataFeed');  -- returns 'true'</text>
      <text x="240" y="276" text-anchor="middle" fill="var(--text-muted)" font-size="8">Storage overhead: ~5–10% extra · CDF records are pruned by VACUUM</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">_change_type Values</text>
      <rect x="16" y="42" width="448" height="62" rx="7" fill="rgba(255,107,53,0.08)" stroke="var(--delta)" stroke-width="1.5"/>
      <text x="240" y="58" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">UPDATE user_id='U123' SET watch_count = 42 (was 41)</text>
      <text x="240" y="74" text-anchor="middle" fill="var(--text-muted)" font-size="8">Generates TWO CDF rows with the same _commit_version</text>
      <text x="240" y="88" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">_commit_version = 47  ·  _commit_timestamp = 2025-01-15 14:23:01</text>
      <rect x="16" y="116" width="218" height="90" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="125" y="134" text-anchor="middle" fill="var(--text-muted)" font-size="8" font-weight="700">update_preimage (BEFORE)</text>
      <text x="125" y="150" text-anchor="middle" fill="var(--text-muted)" font-size="8">user_id: U123</text>
      <text x="125" y="164" text-anchor="middle" fill="var(--text-muted)" font-size="8">watch_count: 41</text>
      <text x="125" y="178" text-anchor="middle" fill="var(--delta)" font-size="8">_change_type: update_preimage</text>
      <rect x="246" y="116" width="218" height="90" rx="6" fill="rgba(34,197,94,0.08)" stroke="#22c55e" stroke-width="1.5"/>
      <text x="355" y="134" text-anchor="middle" fill="#22c55e" font-size="8" font-weight="700">update_postimage (AFTER)</text>
      <text x="355" y="150" text-anchor="middle" fill="var(--text-muted)" font-size="8">user_id: U123</text>
      <text x="355" y="164" text-anchor="middle" fill="#22c55e" font-size="8">watch_count: 42</text>
      <text x="355" y="178" text-anchor="middle" fill="var(--delta)" font-size="8">_change_type: update_postimage</text>
      <rect x="16" y="220" width="100" height="50" rx="5" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="66" y="238" text-anchor="middle" fill="var(--text-muted)" font-size="8" font-weight="700">insert</text>
      <text x="66" y="254" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">New row added</text>
      <rect x="130" y="220" width="100" height="50" rx="5" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="180" y="238" text-anchor="middle" fill="var(--text-muted)" font-size="8" font-weight="700">delete</text>
      <text x="180" y="254" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Row removed</text>
      <rect x="244" y="220" width="218" height="50" rx="5" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="353" y="238" text-anchor="middle" fill="var(--delta)" font-size="8" font-weight="700">update_preimage + update_postimage</text>
      <text x="353" y="254" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Always paired · same _commit_version</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Reading CDF with table_changes()</text>
      <rect x="14" y="38" width="452" height="224" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="58" fill="var(--text-muted)" font-size="8" font-weight="700">-- Read changes from version 3 onward (batch)</text>
      <text x="24" y="72" fill="var(--delta)" font-size="8.5">SELECT * FROM table_changes('silver.user_events', 3)</text>
      <text x="24" y="86" fill="var(--delta)" font-size="8.5">WHERE _change_type = 'update_postimage';</text>
      <text x="24" y="102" fill="var(--text-muted)" font-size="8" font-weight="700">-- Read changes between two versions</text>
      <text x="24" y="116" fill="var(--delta)" font-size="8.5">SELECT * FROM table_changes('silver.user_events', 3, 10);</text>
      <text x="24" y="132" fill="var(--text-muted)" font-size="8" font-weight="700">-- Read changes from a timestamp</text>
      <text x="24" y="146" fill="var(--delta)" font-size="8.5">SELECT * FROM table_changes('silver.user_events',</text>
      <text x="24" y="160" fill="var(--delta)" font-size="8.5">  '2025-01-15 00:00:00');</text>
      <text x="24" y="176" fill="var(--text-muted)" font-size="8" font-weight="700">-- Incremental pattern: persist last version, query next batch</text>
      <text x="24" y="190" fill="var(--delta)" font-size="8.5">val lastVersion = spark.read.json("/checkpoints/cdf_state")</text>
      <text x="24" y="204" fill="var(--delta)" font-size="8.5">  .select("lastVersion").first().getLong(0)</text>
      <text x="24" y="218" fill="var(--delta)" font-size="8.5">val changes = spark.read.format("delta")</text>
      <text x="24" y="232" fill="var(--delta)" font-size="8.5">  .option("readChangeFeed", "true")</text>
      <text x="24" y="246" fill="var(--delta)" font-size="8.5">  .option("startingVersion", lastVersion + 1).load(path)</text>
      <text x="240" y="278" text-anchor="middle" fill="var(--text-muted)" font-size="8">Returns: all columns + _change_type, _commit_version, _commit_timestamp</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Streaming CDF</text>
      <rect x="14" y="38" width="452" height="160" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="58" fill="var(--text-muted)" font-size="8" font-weight="700">-- Structured Streaming from CDF source (Python)</text>
      <text x="24" y="72" fill="var(--delta)" font-size="8.5">cdf_stream = (spark.readStream</text>
      <text x="24" y="86" fill="var(--delta)" font-size="8.5">  .format("delta")</text>
      <text x="24" y="100" fill="var(--delta)" font-size="8.5">  .option("readChangeFeed", "true")</text>
      <text x="24" y="114" fill="var(--delta)" font-size="8.5">  .option("startingVersion", 1)</text>
      <text x="24" y="128" fill="var(--delta)" font-size="8.5">  .table("silver.user_events"))</text>
      <text x="24" y="144" fill="var(--text-muted)" font-size="8">-- Process only inserts/updates downstream</text>
      <text x="24" y="158" fill="var(--delta)" font-size="8.5">cdf_stream.filter("_change_type IN ('insert','update_postimage')")</text>
      <rect x="14" y="210" width="215" height="70" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="121" y="228" text-anchor="middle" fill="var(--text-secondary)" font-size="8.5" font-weight="700">Micro-batch mode</text>
      <text x="121" y="244" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Each batch = changes since</text>
      <text x="121" y="257" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">last checkpoint version.</text>
      <text x="121" y="270" text-anchor="middle" fill="var(--delta)" font-size="7.5">Delta tracks position in log.</text>
      <rect x="251" y="210" width="215" height="70" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="358" y="228" text-anchor="middle" fill="var(--text-secondary)" font-size="8.5" font-weight="700">MediaStream impact</text>
      <text x="358" y="244" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Silver → Gold latency:</text>
      <text x="358" y="257" text-anchor="middle" fill="var(--delta)" font-size="7.5">1h batch → 5min micro-batch</text>
      <text x="358" y="270" text-anchor="middle" fill="var(--delta)" font-size="7.5">Processing 6× less data/run</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">CDF Efficiency — MediaStream Impact</text>
      <rect x="20" y="42" width="200" height="130" rx="7" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="120" y="60" text-anchor="middle" fill="var(--text-secondary)" font-size="9" font-weight="700">Before CDF</text>
      <text x="120" y="78" text-anchor="middle" fill="var(--text-muted)" font-size="8">Gold refresh scans 820GB</text>
      <rect x="32" y="86" width="176" height="18" rx="3" fill="rgba(255,107,53,0.5)"/>
      <text x="120" y="99" text-anchor="middle" fill="#fff" font-size="7.5" font-weight="700">820GB scanned / run</text>
      <text x="120" y="120" text-anchor="middle" fill="var(--delta)" font-size="8">Gold: 47 min</text>
      <text x="120" y="134" text-anchor="middle" fill="var(--delta)" font-size="8">ML pipeline: 2.8h</text>
      <text x="120" y="148" text-anchor="middle" fill="var(--delta)" font-size="8">Hourly batch only</text>
      <text x="120" y="162" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Cost: $1,840/day cluster</text>
      <rect x="260" y="42" width="200" height="130" rx="7" fill="rgba(34,197,94,0.08)" stroke="#22c55e" stroke-width="1.5"/>
      <text x="360" y="60" text-anchor="middle" fill="#22c55e" font-size="9" font-weight="700">With CDF</text>
      <text x="360" y="78" text-anchor="middle" fill="var(--text-muted)" font-size="8">Only changed rows: ~50GB</text>
      <rect x="272" y="86" width="12" height="18" rx="3" fill="rgba(34,197,94,0.7)"/>
      <rect x="288" y="86" width="164" height="18" rx="3" fill="var(--bg-4)" opacity="0.4"/>
      <text x="360" y="99" text-anchor="middle" fill="#22c55e" font-size="7.5" font-weight="700">50GB (6%) vs 820GB</text>
      <text x="360" y="120" text-anchor="middle" fill="#22c55e" font-size="8">Gold: 4 min</text>
      <text x="360" y="134" text-anchor="middle" fill="#22c55e" font-size="8">ML pipeline: 18 min</text>
      <text x="360" y="148" text-anchor="middle" fill="#22c55e" font-size="8">5-min micro-batch</text>
      <text x="360" y="162" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Cost: $312/day cluster</text>
      <rect x="20" y="190" width="440" height="78" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="240" y="208" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">Summary</text>
      <text x="30" y="226" fill="var(--text-muted)" font-size="8">Data scanned/run:</text>
      <text x="200" y="226" fill="var(--delta)" font-size="8">820GB → 50GB  (94% reduction)</text>
      <text x="30" y="242" fill="var(--text-muted)" font-size="8">Gold refresh time:</text>
      <text x="200" y="242" fill="var(--delta)" font-size="8">47 min → 4 min  (11× faster)</text>
      <text x="30" y="258" fill="var(--text-muted)" font-size="8">Cluster cost/day:</text>
      <text x="200" y="258" fill="var(--delta)" font-size="8">$1,840 → $312  (83% savings)</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    el.querySelectorAll('.cf-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.cf-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.cf-info');
    if (info) info.textContent = STEPS[si].detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="cf-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="cf-header module-header">
        <div>
          <div class="module-tag" style="background:var(--delta)">DELTA CORE</div>
          <h2 class="module-title">Change Data Feed</h2>
          <p class="module-subtitle">Row-level change capture for incremental downstream propagation — 94% less data at MediaStream</p>
        </div>
      </div>
      <div class="cf-pills step-pills">${pills}</div>
      <div class="cf-diagram diagram-frame"></div>
      <div class="cf-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'cf-page page-enter';
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
    container.querySelectorAll('.cf-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['cdf'] = {
    id: 'cdf', title: 'Change Data Feed', group: 'Delta Lake Core',
    render: _render,
    destroy() { if (_engine) { _engine.destroy(); _engine = null; } IV.AnimationControls.hide(); },
  };
})();
