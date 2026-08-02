(() => {
  const IV = window.IcebergViz;

  const CSS = `
.cx-wrap { display:flex; flex-direction:column; gap:12px; padding:16px; font-family:'JetBrains Mono',monospace; }
.cx-tag  { display:inline-block; background:var(--delta); color:#fff; font-size:10px; font-weight:700;
           letter-spacing:.08em; padding:2px 8px; border-radius:3px; align-self:flex-start; }
.cx-h1   { font-size:18px; font-weight:700; color:var(--fg,#e2e8f0); margin:0; }
.cx-sub  { font-size:12px; color:var(--muted,#94a3b8); margin:0; }
.cx-body { display:flex; flex-direction:column; gap:10px; }
.cx-card { background:var(--surface2,#1e293b); border:1px solid var(--border,#334155); border-radius:8px; padding:12px 14px; }
.cx-card-h { font-size:12px; font-weight:700; color:var(--delta); margin:0 0 6px; text-transform:uppercase; letter-spacing:.06em; }
.cx-row  { display:flex; gap:10px; }
.cx-row .cx-card { flex:1; }
.cx-txt  { font-size:12px; color:var(--fg,#e2e8f0); line-height:1.55; margin:0; }
.cx-code { font-size:11px; color:#7dd3fc; white-space:pre; line-height:1.5; margin:0; }
.cx-stat { font-size:22px; font-weight:800; color:var(--delta); }
.cx-stat-lbl { font-size:11px; color:var(--muted,#94a3b8); margin-top:2px; }
.cx-tbl  { width:100%; border-collapse:collapse; font-size:11px; }
.cx-tbl th { color:var(--muted,#94a3b8); font-weight:600; text-align:left; padding:4px 8px; border-bottom:1px solid var(--border,#334155); }
.cx-tbl td { color:var(--fg,#e2e8f0); padding:4px 8px; border-bottom:1px solid #1e293b; }
.cx-tbl tr:last-child td { border-bottom:none; }
.cx-ok   { color:#4ade80; }
.cx-warn { color:#fbbf24; }
.cx-bad  { color:#f87171; }
.cx-pill { display:inline-block; font-size:10px; font-weight:700; padding:1px 7px; border-radius:10px;
           background:#1e3a5f; color:#7dd3fc; border:1px solid #2563eb; margin:2px 2px 0 0; }
`;

  const STEPS = [
    {
      title: 'What Are Column Statistics?',
      render(container) {
        container.innerHTML = `
<div class="cx-wrap">
  <span class="cx-tag">READ OPS</span>
  <p class="cx-h1">Column Statistics</p>
  <p class="cx-sub">Per-file metadata that powers data skipping</p>
  <div class="cx-body">
    <div class="cx-card">
      <p class="cx-card-h">Overview</p>
      <p class="cx-txt">Delta Lake records column-level statistics for each data file in the transaction log. These stats allow the query engine to skip entire files without opening them — the core of Delta's data skipping mechanism.</p>
    </div>
    <div class="cx-card">
      <p class="cx-card-h">Three Stats Collected Per Column Per File</p>
      <table class="cx-tbl">
        <tr><th>Stat</th><th>Type</th><th>Use</th></tr>
        <tr><td><code style="color:#7dd3fc">minValues</code></td><td>Any comparable type</td><td>Skip file if query value &lt; min</td></tr>
        <tr><td><code style="color:#7dd3fc">maxValues</code></td><td>Any comparable type</td><td>Skip file if query value &gt; max</td></tr>
        <tr><td><code style="color:#7dd3fc">nullCount</code></td><td>Long</td><td>Skip IS NOT NULL scans on all-null files</td></tr>
      </table>
    </div>
    <div class="cx-row">
      <div class="cx-card">
        <p class="cx-card-h">Also Tracked</p>
        <p class="cx-txt"><code style="color:#7dd3fc">numRecords</code> — total row count per file. Used by the query planner for cost estimation and join strategies.</p>
      </div>
      <div class="cx-card">
        <p class="cx-card-h">Where Stored</p>
        <p class="cx-txt">Inside each <code style="color:#7dd3fc">add</code> action in the transaction log JSON files — not in the Parquet files themselves.</p>
      </div>
    </div>
  </div>
</div>`;
      }
    },
    {
      title: 'How Stats Are Collected',
      render(container) {
        container.innerHTML = `
<div class="cx-wrap">
  <span class="cx-tag">READ OPS</span>
  <p class="cx-h1">Collection at Write Time</p>
  <p class="cx-sub">Automatic per-file sampling during writes</p>
  <div class="cx-body">
    <div class="cx-card">
      <p class="cx-card-h">Write-Time Collection</p>
      <p class="cx-txt">When Spark writes a Delta file, it scans the first <code style="color:#7dd3fc">N</code> columns for stats as it writes rows. This adds minimal overhead since rows are already in memory during the write pass.</p>
    </div>
    <div class="cx-card">
      <p class="cx-card-h">Stats in Transaction Log (add action)</p>
      <pre class="cx-code">{
  "add": {
    "path": "part-0001.snappy.parquet",
    "size": 134217728,
    "stats": {
      "numRecords": 2048000,
      "minValues": {
        "event_ts": "2025-01-01T00:00:00Z",
        "user_id": 1000001,
        "region": "AU"
      },
      "maxValues": {
        "event_ts": "2025-01-01T23:59:59Z",
        "user_id": 1999874,
        "region": "US"
      },
      "nullCount": {
        "event_ts": 0,
        "user_id": 0,
        "region": 142
      }
    }
  }
}</pre>
    </div>
  </div>
</div>`;
      }
    },
    {
      title: 'dataSkippingNumIndexedCols',
      render(container) {
        container.innerHTML = `
<div class="cx-wrap">
  <span class="cx-tag">READ OPS</span>
  <p class="cx-h1">dataSkippingNumIndexedCols</p>
  <p class="cx-sub">How many columns get stats collected</p>
  <div class="cx-body">
    <div class="cx-card">
      <p class="cx-card-h">Default: First 32 Columns</p>
      <p class="cx-txt">Delta only collects stats for the first <code style="color:#7dd3fc">32</code> columns of the schema (by position, not name). Wide tables — 100+ columns — may have critical filter columns beyond position 32 that get no stats.</p>
    </div>
    <div class="cx-card">
      <p class="cx-card-h">Change the Limit</p>
      <pre class="cx-code">-- Per-table: collect stats for first 64 columns
ALTER TABLE silver.user_events
SET TBLPROPERTIES (
  'delta.dataSkippingNumIndexedCols' = '64'
);

-- Or collect stats for ALL columns (-1)
ALTER TABLE gold.content_ratings
SET TBLPROPERTIES (
  'delta.dataSkippingNumIndexedCols' = '-1'
);</pre>
    </div>
    <div class="cx-row">
      <div class="cx-card">
        <p class="cx-card-h">Trade-off</p>
        <p class="cx-txt">More indexed columns = better skipping but slower writes and larger transaction log entries. For wide tables, profile which columns appear in WHERE clauses and tune accordingly.</p>
      </div>
      <div class="cx-card">
        <p class="cx-card-h">Tip: Schema Ordering</p>
        <p class="cx-txt">Put high-filter-selectivity columns first in the schema. <code style="color:#7dd3fc">event_ts</code>, <code style="color:#7dd3fc">region</code>, <code style="color:#7dd3fc">user_id</code> before low-selectivity blobs.</p>
      </div>
    </div>
  </div>
</div>`;
      }
    },
    {
      title: 'Stats in the Transaction Log',
      render(container) {
        container.innerHTML = `
<div class="cx-wrap">
  <span class="cx-tag">READ OPS</span>
  <p class="cx-h1">Stats in the Transaction Log</p>
  <p class="cx-sub">Reading and querying file-level stats directly</p>
  <div class="cx-body">
    <div class="cx-card">
      <p class="cx-card-h">Inspect via delta_log</p>
      <pre class="cx-code">-- Read stats directly from the transaction log
SELECT
  path,
  stats:numRecords    AS rows,
  stats:minValues.event_ts AS min_ts,
  stats:maxValues.event_ts AS max_ts
FROM delta.\`/mnt/delta/silver/user_events/_delta_log\`
WHERE operation = 'add'
LIMIT 20;</pre>
    </div>
    <div class="cx-card">
      <p class="cx-card-h">DESCRIBE DETAIL</p>
      <pre class="cx-code">DESCRIBE DETAIL silver.user_events;
-- Returns: numFiles, sizeInBytes, minReaderVersion, ...

-- Or via Python
from delta.tables import DeltaTable
dt = DeltaTable.forName(spark, "silver.user_events")
dt.detail().show()</pre>
    </div>
    <div class="cx-card">
      <p class="cx-card-h">Backfill Missing Stats</p>
      <pre class="cx-code">-- Stats only exist for files written after
-- dataSkippingNumIndexedCols was set.
-- Backfill by rewriting the table:
OPTIMIZE silver.user_events ZORDER BY (event_ts, region);
-- OPTIMIZE rewrites files and regenerates all stats.</pre>
    </div>
  </div>
</div>`;
      }
    },
    {
      title: 'ANALYZE TABLE',
      render(container) {
        container.innerHTML = `
<div class="cx-wrap">
  <span class="cx-tag">READ OPS</span>
  <p class="cx-h1">ANALYZE TABLE</p>
  <p class="cx-sub">Spark catalog stats vs Delta file stats</p>
  <div class="cx-body">
    <div class="cx-row">
      <div class="cx-card">
        <p class="cx-card-h">Spark Catalog Stats</p>
        <p class="cx-txt">Separate from Delta file stats. Stored in the Hive metastore / Unity Catalog. Used by the Spark query optimizer for join ordering and broadcast decisions.</p>
      </div>
      <div class="cx-card">
        <p class="cx-card-h">Delta File Stats</p>
        <p class="cx-txt">Stored in the <code style="color:#7dd3fc">_delta_log</code>. Used specifically for data skipping — which files to open. Automatically maintained at write time.</p>
      </div>
    </div>
    <div class="cx-card">
      <p class="cx-card-h">Run ANALYZE TABLE</p>
      <pre class="cx-code">-- Collect table-level stats (row count, size)
ANALYZE TABLE silver.user_events COMPUTE STATISTICS;

-- Collect per-column histogram stats
ANALYZE TABLE silver.user_events
COMPUTE STATISTICS FOR COLUMNS user_id, region, event_ts;

-- On Databricks: also enables AQE join reordering
-- Schedule after large writes or OPTIMIZE runs</pre>
    </div>
    <div class="cx-card">
      <p class="cx-card-h">Verify Stats Exist</p>
      <pre class="cx-code">DESCRIBE EXTENDED silver.user_events user_id;
-- Shows: distinctCount, min, max, avgColLen, maxColLen</pre>
    </div>
  </div>
</div>`;
      }
    },
    {
      title: 'MediaStream: Data Skipping Impact',
      render(container) {
        container.innerHTML = `
<div class="cx-wrap">
  <span class="cx-tag">READ OPS</span>
  <p class="cx-h1">MediaStream: Data Skipping Impact</p>
  <p class="cx-sub">Column stats in production at scale</p>
  <div class="cx-body">
    <div class="cx-card">
      <p class="cx-card-h">silver.user_events — 1.2TB table</p>
      <table class="cx-tbl">
        <tr><th>Query Pattern</th><th>Files Before</th><th>Files After Stats</th><th>Skipped</th></tr>
        <tr><td>Single day + region</td><td class="cx-bad">1,200</td><td class="cx-ok">12</td><td class="cx-ok">99%</td></tr>
        <tr><td>User ID range</td><td class="cx-bad">1,200</td><td class="cx-ok">74</td><td class="cx-ok">94%</td></tr>
        <tr><td>Content type filter</td><td class="cx-bad">1,200</td><td class="cx-warn">310</td><td class="cx-warn">74%</td></tr>
        <tr><td>IS NOT NULL check</td><td class="cx-bad">1,200</td><td class="cx-ok">18</td><td class="cx-ok">98.5%</td></tr>
      </table>
    </div>
    <div class="cx-row">
      <div class="cx-card">
        <p class="cx-card-h">Monthly Savings</p>
        <div style="text-align:center;padding:6px 0">
          <div class="cx-stat">$24K</div>
          <div class="cx-stat-lbl">reduced Databricks DBU cost<br>from data skipping alone</div>
        </div>
      </div>
      <div class="cx-card">
        <p class="cx-card-h">Setup Applied</p>
        <pre class="cx-code">-- Schema reordered: filter cols first
-- dataSkippingNumIndexedCols = 48
-- OPTIMIZE + ZORDER monthly
-- ANALYZE after each OPTIMIZE</pre>
      </div>
    </div>
    <div class="cx-card">
      <p class="cx-card-h">Key Lesson</p>
      <p class="cx-txt">Stats are only as good as the write patterns. Unsorted data has wide min/max ranges per file → poor skipping. ZORDER clustering narrows ranges dramatically.</p>
    </div>
  </div>
</div>`;
      }
    },
  ];

  const styleId = 'cx-styles';

  window.IcebergViz.modules['column-stats'] = {
    id: 'column-stats',
    title: 'Column Statistics',
    group: 'Read Operations',
    render(container) {
      if (!document.getElementById(styleId)) {
        const s = document.createElement('style');
        s.id = styleId;
        s.textContent = CSS;
        document.head.appendChild(s);
      }

      const engine = new IV.AnimationEngine({ steps: STEPS });
      engine.setContext({ el: container });

      STEPS.forEach((s, i) => {
        s.render = ((orig, idx) => function(el) {
          orig.call(this, el);
          engine.goto(idx);
        })(s.render, i);
      });

      const firstStep = STEPS[0];
      firstStep.render(container);
      IV.AnimationControls.register(engine);
    },
    destroy() {
      IV.AnimationControls.hide();
    }
  };
})();
