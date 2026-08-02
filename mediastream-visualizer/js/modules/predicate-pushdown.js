(() => {
  const IV = window.IcebergViz;

  const CSS = `
.pp-wrap { display:flex; flex-direction:column; gap:12px; padding:16px; font-family:'JetBrains Mono',monospace; }
.pp-tag  { display:inline-block; background:var(--delta); color:#fff; font-size:10px; font-weight:700;
           letter-spacing:.08em; padding:2px 8px; border-radius:3px; align-self:flex-start; }
.pp-h1   { font-size:18px; font-weight:700; color:var(--fg,#e2e8f0); margin:0; }
.pp-sub  { font-size:12px; color:var(--muted,#94a3b8); margin:0; }
.pp-body { display:flex; flex-direction:column; gap:10px; }
.pp-card { background:var(--surface2,#1e293b); border:1px solid var(--border,#334155); border-radius:8px; padding:12px 14px; }
.pp-card-h { font-size:12px; font-weight:700; color:var(--delta); margin:0 0 6px; text-transform:uppercase; letter-spacing:.06em; }
.pp-row  { display:flex; gap:10px; }
.pp-row .pp-card { flex:1; }
.pp-txt  { font-size:12px; color:var(--fg,#e2e8f0); line-height:1.55; margin:0; }
.pp-code { font-size:11px; color:#7dd3fc; white-space:pre; line-height:1.5; margin:0; }
.pp-pill { display:inline-block; font-size:10px; font-weight:700; padding:1px 7px; border-radius:10px;
           background:#1e3a5f; color:#7dd3fc; border:1px solid #2563eb; margin:2px 2px 0 0; }
.pp-stat { font-size:22px; font-weight:800; color:var(--delta); }
.pp-stat-lbl { font-size:11px; color:var(--muted,#94a3b8); margin-top:2px; }
.pp-tbl  { width:100%; border-collapse:collapse; font-size:11px; }
.pp-tbl th { color:var(--muted,#94a3b8); font-weight:600; text-align:left; padding:4px 8px; border-bottom:1px solid var(--border,#334155); }
.pp-tbl td { color:var(--fg,#e2e8f0); padding:4px 8px; border-bottom:1px solid #1e293b; }
.pp-tbl tr:last-child td { border-bottom:none; }
.pp-ok   { color:#4ade80; }
.pp-warn { color:#fbbf24; }
.pp-bad  { color:#f87171; }
.pp-flow { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.pp-box  { background:var(--surface2,#1e293b); border:1px solid var(--border,#334155); border-radius:6px;
           padding:6px 10px; font-size:11px; color:var(--fg,#e2e8f0); text-align:center; white-space:nowrap; }
.pp-arr  { color:var(--muted,#94a3b8); font-size:14px; }
`;

  const STEPS = [
    {
      title: 'What Is Predicate Pushdown?',
      render(container) {
        container.innerHTML = `
<div class="pp-wrap">
  <span class="pp-tag">READ OPS</span>
  <p class="pp-h1">Predicate Pushdown</p>
  <p class="pp-sub">Skip data before it ever enters memory</p>
  <div class="pp-body">
    <div class="pp-card">
      <p class="pp-card-h">Core Idea</p>
      <p class="pp-txt">Predicate pushdown moves filter conditions as close to the data as possible — down to the storage layer — so only matching rows are read. Delta Lake leverages file-level, row-group-level, and page-level pruning.</p>
    </div>
    <div class="pp-row">
      <div class="pp-card">
        <p class="pp-card-h">Without Pushdown</p>
        <p class="pp-txt">Read all files → load all rows into Spark → filter in memory.<br><br>
        <span class="pp-bad">Cost: full scan every query</span></p>
      </div>
      <div class="pp-card">
        <p class="pp-card-h">With Pushdown</p>
        <p class="pp-txt">Evaluate stats → skip irrelevant files entirely → read only matching row-groups.<br><br>
        <span class="pp-ok">Cost: fraction of full scan</span></p>
      </div>
    </div>
    <div class="pp-card">
      <p class="pp-card-h">Three Pruning Levels</p>
      <div class="pp-flow">
        <div class="pp-box">File Pruning<br><span style="font-size:10px;color:var(--muted,#94a3b8)">partition + stats</span></div>
        <span class="pp-arr">→</span>
        <div class="pp-box">Row-Group Pruning<br><span style="font-size:10px;color:var(--muted,#94a3b8)">Parquet min/max</span></div>
        <span class="pp-arr">→</span>
        <div class="pp-box">Page-Level Pruning<br><span style="font-size:10px;color:var(--muted,#94a3b8)">Parquet page index</span></div>
        <span class="pp-arr">→</span>
        <div class="pp-box" style="border-color:var(--delta);color:var(--delta)">Rows Returned</div>
      </div>
    </div>
  </div>
</div>`;
      }
    },
    {
      title: 'File-Level Pruning',
      render(container) {
        container.innerHTML = `
<div class="pp-wrap">
  <span class="pp-tag">READ OPS</span>
  <p class="pp-h1">File-Level Pruning</p>
  <p class="pp-sub">Partition elimination + Delta stats</p>
  <div class="pp-body">
    <div class="pp-row">
      <div class="pp-card">
        <p class="pp-card-h">Partition Pruning</p>
        <p class="pp-txt">Partition columns are directory names — Spark resolves the predicate at planning time and lists only matching directories.</p>
        <pre class="pp-code">-- Only reads region=US/ directory
SELECT * FROM events
WHERE region = 'US'
  AND dt = '2025-01-15'</pre>
      </div>
      <div class="pp-card">
        <p class="pp-card-h">Delta Stats Pruning</p>
        <p class="pp-txt">Delta stores min/max per column per file in the transaction log. Any file whose range cannot contain matching rows is skipped entirely.</p>
        <pre class="pp-code">-- File A: user_id min=1, max=5000
-- File B: user_id min=5001, max=9000
-- WHERE user_id = 7500 → skip File A</pre>
      </div>
    </div>
    <div class="pp-card">
      <p class="pp-card-h">Example: Without vs With Stats</p>
      <table class="pp-tbl">
        <tr><th>Scenario</th><th>Files Scanned</th><th>Rows Read</th><th>Time</th></tr>
        <tr><td>No partition + no stats</td><td class="pp-bad">1,200</td><td class="pp-bad">4.2B</td><td class="pp-bad">48s</td></tr>
        <tr><td>Partition only</td><td class="pp-warn">240</td><td class="pp-warn">840M</td><td class="pp-warn">12s</td></tr>
        <tr><td>Partition + Delta stats</td><td class="pp-ok">14</td><td class="pp-ok">49M</td><td class="pp-ok">1.1s</td></tr>
      </table>
    </div>
  </div>
</div>`;
      }
    },
    {
      title: 'Row-Group Pruning',
      render(container) {
        container.innerHTML = `
<div class="pp-wrap">
  <span class="pp-tag">READ OPS</span>
  <p class="pp-h1">Row-Group Pruning</p>
  <p class="pp-sub">Parquet internal column statistics</p>
  <div class="pp-body">
    <div class="pp-card">
      <p class="pp-card-h">How Parquet Stores Stats</p>
      <p class="pp-txt">Each Parquet row group (default 128 MB) stores column-level statistics in its footer: <code style="color:#7dd3fc">min_value</code>, <code style="color:#7dd3fc">max_value</code>, <code style="color:#7dd3fc">null_count</code>. The Parquet reader evaluates predicates against these before reading any actual rows.</p>
    </div>
    <div class="pp-card">
      <p class="pp-card-h">Visual: One Parquet File (3 Row Groups)</p>
      <svg viewBox="0 0 460 140" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:460px">
        <rect x="4" y="8" width="452" height="124" rx="6" fill="#1e293b" stroke="#334155"/>
        <!-- row group boxes -->
        <rect x="16" y="24" width="130" height="72" rx="4" fill="#0f172a" stroke="#475569"/>
        <text x="81" y="42" font-family="'JetBrains Mono',monospace" font-size="9" fill="#94a3b8" text-anchor="middle">Row Group 1</text>
        <text x="81" y="56" font-family="'JetBrains Mono',monospace" font-size="8" fill="#7dd3fc" text-anchor="middle">ts: 2025-01 → 2025-03</text>
        <text x="81" y="68" font-family="'JetBrains Mono',monospace" font-size="8" fill="#7dd3fc" text-anchor="middle">id: 1 → 50000</text>
        <text x="81" y="82" font-family="'JetBrains Mono',monospace" font-size="8" fill="#4ade80" text-anchor="middle">✓ MATCHES</text>

        <rect x="163" y="24" width="130" height="72" rx="4" fill="#0f172a" stroke="#475569"/>
        <text x="228" y="42" font-family="'JetBrains Mono',monospace" font-size="9" fill="#94a3b8" text-anchor="middle">Row Group 2</text>
        <text x="228" y="56" font-family="'JetBrains Mono',monospace" font-size="8" fill="#7dd3fc" text-anchor="middle">ts: 2025-04 → 2025-06</text>
        <text x="228" y="68" font-family="'JetBrains Mono',monospace" font-size="8" fill="#7dd3fc" text-anchor="middle">id: 50001 → 99800</text>
        <text x="228" y="82" font-family="'JetBrains Mono',monospace" font-size="8" fill="#f87171" text-anchor="middle">✗ SKIP</text>

        <rect x="310" y="24" width="130" height="72" rx="4" fill="#0f172a" stroke="#475569"/>
        <text x="375" y="42" font-family="'JetBrains Mono',monospace" font-size="9" fill="#94a3b8" text-anchor="middle">Row Group 3</text>
        <text x="375" y="56" font-family="'JetBrains Mono',monospace" font-size="8" fill="#7dd3fc" text-anchor="middle">ts: 2025-07 → 2025-09</text>
        <text x="375" y="68" font-family="'JetBrains Mono',monospace" font-size="8" fill="#7dd3fc" text-anchor="middle">id: 99801 → 150000</text>
        <text x="375" y="82" font-family="'JetBrains Mono',monospace" font-size="8" fill="#f87171" text-anchor="middle">✗ SKIP</text>

        <text x="230" y="118" font-family="'JetBrains Mono',monospace" font-size="9" fill="#94a3b8" text-anchor="middle">WHERE ts &lt; '2025-04' AND id &lt; 50001 → only Row Group 1 read</text>
      </svg>
    </div>
    <div class="pp-card">
      <p class="pp-card-h">Configuration</p>
      <pre class="pp-code">-- Larger row groups = better pruning for range scans
spark.conf.set("parquet.block.size", "256m")
-- Enable vectorized Parquet reader (default true in Databricks)
spark.conf.set("spark.sql.parquet.enableVectorizedReader", "true")</pre>
    </div>
  </div>
</div>`;
      }
    },
    {
      title: 'Page-Level Pruning',
      render(container) {
        container.innerHTML = `
<div class="pp-wrap">
  <span class="pp-tag">READ OPS</span>
  <p class="pp-h1">Page-Level Pruning</p>
  <p class="pp-sub">Parquet column index — finest-grained skip</p>
  <div class="pp-body">
    <div class="pp-card">
      <p class="pp-card-h">Parquet Column Index (v2 spec)</p>
      <p class="pp-txt">Parquet page-level column indexes store min/max per data page (~1 MB chunks within a row group). Spark 3.x reads these for even finer-grained skipping — useful for high-cardinality columns like <code style="color:#7dd3fc">event_id</code> or <code style="color:#7dd3fc">user_id</code>.</p>
    </div>
    <div class="pp-card">
      <p class="pp-card-h">Enable Page-Level Pruning</p>
      <pre class="pp-code">-- Enable Parquet column index (Spark 3.2+)
spark.conf.set(
  "spark.sql.parquet.filterPushdown.columnIndex",
  "true"
)
-- Also ensure page stats are written at write time
spark.conf.set(
  "parquet.page.write-checksum.enabled",
  "true"
)</pre>
    </div>
    <div class="pp-row">
      <div class="pp-card">
        <p class="pp-card-h">Benefit</p>
        <div style="text-align:center;padding:8px 0">
          <div class="pp-stat">~40%</div>
          <div class="pp-stat-lbl">additional I/O reduction over<br>row-group-only pruning</div>
        </div>
      </div>
      <div class="pp-card">
        <p class="pp-card-h">Best For</p>
        <p class="pp-txt">High-cardinality columns where min/max within a row group is wide, but within individual pages is narrow:</p>
        <span class="pp-pill">user_id</span>
        <span class="pp-pill">event_id</span>
        <span class="pp-pill">session_id</span>
        <span class="pp-pill">device_id</span>
      </div>
    </div>
  </div>
</div>`;
      }
    },
    {
      title: 'Common Pitfalls',
      render(container) {
        container.innerHTML = `
<div class="pp-wrap">
  <span class="pp-tag">READ OPS</span>
  <p class="pp-h1">Common Pitfalls</p>
  <p class="pp-sub">When pushdown silently stops working</p>
  <div class="pp-body">
    <table class="pp-tbl">
      <tr><th>Pitfall</th><th>Why It Breaks Pushdown</th><th>Fix</th></tr>
      <tr>
        <td class="pp-bad">CAST in predicate</td>
        <td>Stats are stored as original type; cast makes comparison ambiguous</td>
        <td class="pp-ok">Cast the literal, not the column</td>
      </tr>
      <tr>
        <td class="pp-bad">UDF on column</td>
        <td>Spark can't push opaque function into Parquet reader</td>
        <td class="pp-ok">Pre-compute, filter before UDF</td>
      </tr>
      <tr>
        <td class="pp-bad">LIKE '%string'</td>
        <td>Leading wildcard requires full scan</td>
        <td class="pp-ok">Use LIKE 'string%' or Bloom filter</td>
      </tr>
      <tr>
        <td class="pp-bad">OR across columns</td>
        <td>Disjunctive predicates can't always be pushed</td>
        <td class="pp-ok">Rewrite as UNION or IN list</td>
      </tr>
      <tr>
        <td class="pp-bad">Implicit type coercion</td>
        <td>INT col vs STRING literal — Spark adds implicit cast</td>
        <td class="pp-ok">Match literal type to column type</td>
      </tr>
    </table>
    <div class="pp-card">
      <p class="pp-card-h">Verify Pushdown with EXPLAIN</p>
      <pre class="pp-code">EXPLAIN FORMATTED
SELECT * FROM silver.events
WHERE region = 'US' AND ts > '2025-01-01';

-- Look for: PushedFilters in scan node
-- ✓ Good: PushedFilters: [IsNotNull(region), EqualTo(region,US), ...]
-- ✗ Bad:  PushedFilters: [] — nothing pushed down</pre>
    </div>
  </div>
</div>`;
      }
    },
    {
      title: 'MediaStream Query Patterns',
      render(container) {
        container.innerHTML = `
<div class="pp-wrap">
  <span class="pp-tag">READ OPS</span>
  <p class="pp-h1">MediaStream Query Patterns</p>
  <p class="pp-sub">Real-world predicate pushdown in production</p>
  <div class="pp-body">
    <div class="pp-card">
      <p class="pp-card-h">Pattern 1: Partition + Stats (Daily Dashboard)</p>
      <pre class="pp-code">-- Partition: dt / region → Stats: user_id range
SELECT user_id, SUM(watch_seconds)
FROM silver.user_events
WHERE dt = current_date()
  AND region = 'US'
  AND user_id BETWEEN 1000000 AND 2000000
GROUP BY user_id;
-- Files scanned: 12 of 1,440 daily files (99.2% skipped)</pre>
    </div>
    <div class="pp-card">
      <p class="pp-card-h">Pattern 2: Content Analytics (Range Scan)</p>
      <pre class="pp-code">-- Partition: content_type → Stats: rating min/max
SELECT content_id, AVG(rating)
FROM gold.content_ratings
WHERE content_type = 'series'
  AND rating >= 4.0
  AND created_at >= '2025-01-01';
-- Row groups skipped: 94% (rating &lt; 4.0 never read)</pre>
    </div>
    <div class="pp-row">
      <div class="pp-card">
        <p class="pp-card-h">Impact at Scale</p>
        <div style="text-align:center;padding:6px 0">
          <div class="pp-stat">87%</div>
          <div class="pp-stat-lbl">avg I/O reduction<br>across Gold queries</div>
        </div>
      </div>
      <div class="pp-card">
        <p class="pp-card-h">P95 Latency</p>
        <div style="text-align:center;padding:6px 0">
          <div class="pp-stat">3.2s</div>
          <div class="pp-stat-lbl">down from 41s<br>after stat optimization</div>
        </div>
      </div>
    </div>
  </div>
</div>`;
      }
    },
  ];

  const styleId = 'pp-styles';

  window.IcebergViz.modules['predicate-pushdown'] = {
    id: 'predicate-pushdown',
    title: 'Predicate Pushdown',
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
