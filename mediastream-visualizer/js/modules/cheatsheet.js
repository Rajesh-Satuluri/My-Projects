(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Time Travel',
      desc: 'Time Travel & RESTORE TABLE syntax',
      detail: 'Time travel uses VERSION AS OF or TIMESTAMP AS OF to query historical snapshots. DESCRIBE HISTORY shows all versions with operation, timestamp, and metrics. RESTORE TABLE creates a new version that reverts to a prior state — the operation itself is ACID and appears as a new log entry. Use cases: ML reproducibility, audit evidence, accidental-delete recovery. At MediaStream: 90-day retention window, <5min recovery SLA for Gold tables, used twice in 12 months.',
    },
    {
      label: 'VACUUM',
      desc: 'VACUUM retention and safe usage patterns',
      detail: 'VACUUM physically removes files no longer referenced by any version within the retention window. Default retention: 168 hours (7 days). Always DRY RUN first to preview. Never VACUUM below your streaming checkpoint window (MediaStream uses RETAIN 336 HOURS for streaming tables). MediaStream per-layer policy: Bronze 72h, Silver 336h, Gold 336h, ML 720h, Audit 2160h. Storage impact: 3.1TB/week freed = $354K/year saved.',
    },
    {
      label: 'OPTIMIZE',
      desc: 'OPTIMIZE, Z-ORDER, and Liquid Clustering',
      detail: 'OPTIMIZE coalesces small Parquet files into target-size files (~1GB). ZORDER BY reorders data using a space-filling curve for multi-dimensional locality — dramatically reduces files scanned per query. Liquid Clustering (Delta 3.1+) replaces partitioning + Z-ORDER with automatic incremental clustering: CLUSTER BY (col1, col2) — no manual OPTIMIZE needed. MediaStream results: 284K → 187 files, P50 query 42s → 14s, 94% file skip rate.',
    },
    {
      label: 'DML',
      desc: 'INSERT, UPDATE, DELETE, and MERGE syntax',
      detail: 'Delta Lake supports full DML — INSERT OVERWRITE replaces a partition atomically. UPDATE and DELETE use predicate pushdown for efficiency. MERGE (upsert) is the workhorse for CDC workflows: WHEN MATCHED THEN UPDATE, WHEN NOT MATCHED THEN INSERT, WHEN MATCHED AND condition THEN DELETE. At MediaStream: APPLY CHANGES INTO (DLT MERGE) processes 847K CDC events/day across 6 concurrent writers with zero conflicts via event_date partition isolation.',
    },
    {
      label: 'DLT API',
      desc: 'DLT Streaming Tables, Views, and Expectations',
      detail: 'DLT uses Python/SQL decorators to declare pipeline logic declaratively. @dlt.table creates a materialized view (batch). @dlt.table with spark.readStream creates a Streaming Table (incremental). Expectations: @dlt.expect("name", "condition") = WARN; @dlt.expect_or_drop = DROP bad rows; @dlt.expect_or_fail = abort on violation. MediaStream: 47 total constraints across 22 tables — 18 WARN, 22 DROP, 7 FAIL — violations logged to system.events.dlt_expectations.',
    },
    {
      label: 'Unity Catalog',
      desc: 'Unity Catalog GRANT, REVOKE, and object hierarchy',
      detail: 'Unity Catalog uses standard SQL GRANT/REVOKE on a three-level hierarchy: catalog → schema → table (or volume, function, model). Privileges cascade down: SELECT on catalog grants read on all tables within. Row-level security uses CREATE ROW FILTER FUNCTION and ALTER TABLE SET ROW FILTER. Column masking uses CREATE MASKING POLICY and ALTER TABLE ALTER COLUMN SET MASK. Audit all grants with: SELECT * FROM system.information_schema.table_privileges.',
    },
  ];

  const DIAGRAMS = [
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="24" text-anchor="middle" fill="var(--delta)" font-size="12" font-weight="700">Cheat Sheet: Time Travel &amp; RESTORE</text>
      <rect x="14" y="36" width="452" height="222" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="55" fill="var(--text-muted)" font-size="8" font-weight="700">-- Query by version</text>
      <text x="24" y="69" fill="var(--delta)" font-size="9">SELECT * FROM silver.user_events VERSION AS OF 42;</text>
      <text x="24" y="85" fill="var(--text-muted)" font-size="8" font-weight="700">-- Query by timestamp</text>
      <text x="24" y="99" fill="var(--delta)" font-size="9">SELECT * FROM silver.user_events</text>
      <text x="24" y="113" fill="var(--delta)" font-size="9">  TIMESTAMP AS OF '2025-01-15 02:00:00';</text>
      <text x="24" y="129" fill="var(--text-muted)" font-size="8" font-weight="700">-- Show full history (version, timestamp, operation, metrics)</text>
      <text x="24" y="143" fill="var(--delta)" font-size="9">DESCRIBE HISTORY silver.user_events;</text>
      <text x="24" y="159" fill="var(--text-muted)" font-size="8" font-weight="700">-- Restore to a prior version (creates new version, ACID)</text>
      <text x="24" y="173" fill="var(--delta)" font-size="9">RESTORE TABLE gold.content_performance</text>
      <text x="24" y="187" fill="var(--delta)" font-size="9">  TO VERSION AS OF 89;  -- Recovery &lt;5min at MediaStream</text>
      <text x="24" y="203" fill="var(--text-muted)" font-size="8" font-weight="700">-- Compare two versions (Python)</text>
      <text x="24" y="217" fill="var(--delta)" font-size="9">spark.read.format("delta").option("versionAsOf", 89)</text>
      <text x="24" y="231" fill="var(--delta)" font-size="9">  .load("/path/to/table")</text>
      <text x="240" y="274" text-anchor="middle" fill="var(--text-muted)" font-size="8">Retention window: 90 days at MediaStream · log checkpoint every 10 versions</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="24" text-anchor="middle" fill="var(--delta)" font-size="12" font-weight="700">Cheat Sheet: VACUUM</text>
      <rect x="14" y="36" width="452" height="222" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="55" fill="var(--text-muted)" font-size="8" font-weight="700">-- 1. Always DRY RUN first to preview deletions</text>
      <text x="24" y="69" fill="var(--delta)" font-size="9">VACUUM silver.user_events DRY RUN;</text>
      <text x="24" y="85" fill="var(--text-muted)" font-size="8" font-weight="700">-- 2. Run with safe retention (default 168h = 7 days)</text>
      <text x="24" y="99" fill="var(--delta)" font-size="9">VACUUM silver.user_events RETAIN 336 HOURS;</text>
      <text x="24" y="115" fill="var(--text-muted)" font-size="8" font-weight="700">-- 3. Lower than 168h requires safety override (use with caution!)</text>
      <text x="24" y="129" fill="var(--delta)" font-size="9">SET spark.databricks.delta.retentionDurationCheck.enabled = false;</text>
      <text x="24" y="143" fill="var(--delta)" font-size="9">VACUUM silver.user_events RETAIN 72 HOURS;</text>
      <text x="24" y="159" fill="var(--text-muted)" font-size="8" font-weight="700">-- MediaStream per-layer policy (scheduled weekly)</text>
      <rect x="24" y="168" width="420" height="72" rx="5" fill="var(--bg-4)"/>
      <text x="34" y="183" fill="var(--text-muted)" font-size="8">Bronze  → RETAIN  72 HOURS  (3 days)</text>
      <text x="34" y="197" fill="var(--text-muted)" font-size="8">Silver  → RETAIN 336 HOURS  (14 days)</text>
      <text x="34" y="211" fill="var(--text-muted)" font-size="8">Gold    → RETAIN 336 HOURS  (14 days)</text>
      <text x="34" y="225" fill="var(--text-muted)" font-size="8">ML      → RETAIN 720 HOURS  (30 days)</text>
      <text x="240" y="270" text-anchor="middle" fill="var(--text-muted)" font-size="8">3.1TB/week freed · $354K/year · NEVER below streaming checkpoint window</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="24" text-anchor="middle" fill="var(--delta)" font-size="12" font-weight="700">Cheat Sheet: OPTIMIZE &amp; Z-ORDER</text>
      <rect x="14" y="36" width="452" height="222" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="55" fill="var(--text-muted)" font-size="8" font-weight="700">-- Basic OPTIMIZE (coalesce small files → ~1GB target)</text>
      <text x="24" y="69" fill="var(--delta)" font-size="9">OPTIMIZE silver.user_events;</text>
      <text x="24" y="85" fill="var(--text-muted)" font-size="8" font-weight="700">-- OPTIMIZE on a specific partition only</text>
      <text x="24" y="99" fill="var(--delta)" font-size="9">OPTIMIZE silver.user_events WHERE event_date = '2025-01-15';</text>
      <text x="24" y="115" fill="var(--text-muted)" font-size="8" font-weight="700">-- Z-ORDER: co-locate rows by multi-column locality (space-filling curve)</text>
      <text x="24" y="129" fill="var(--delta)" font-size="9">OPTIMIZE silver.user_events ZORDER BY (user_id, event_date);</text>
      <text x="24" y="145" fill="var(--text-muted)" font-size="8" font-weight="700">-- Liquid Clustering (Delta 3.1+) — replaces partitions + Z-ORDER</text>
      <text x="24" y="159" fill="var(--delta)" font-size="9">ALTER TABLE silver.user_events CLUSTER BY (user_id, event_date);</text>
      <text x="24" y="175" fill="var(--delta)" font-size="9">OPTIMIZE silver.user_events;  -- now does incremental clustering</text>
      <text x="24" y="191" fill="var(--text-muted)" font-size="8" font-weight="700">-- MediaStream results after OPTIMIZE + ZORDER</text>
      <rect x="24" y="200" width="420" height="44" rx="5" fill="var(--bg-4)"/>
      <text x="34" y="215" fill="var(--text-muted)" font-size="8">Files: 284,000 → 187  (99.93% reduction)</text>
      <text x="34" y="229" fill="var(--text-muted)" font-size="8">P50 query: 42s → 14s · 94% files skipped · 20× ROI on job cost</text>
      <text x="240" y="272" text-anchor="middle" fill="var(--text-muted)" font-size="8">Schedule: Bronze weekly · Silver daily · Gold on-trigger · ML weekly</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="24" text-anchor="middle" fill="var(--delta)" font-size="12" font-weight="700">Cheat Sheet: DML Operations</text>
      <rect x="14" y="36" width="452" height="222" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="54" fill="var(--text-muted)" font-size="8" font-weight="700">-- INSERT OVERWRITE (atomic partition replace)</text>
      <text x="24" y="68" fill="var(--delta)" font-size="8.5">INSERT OVERWRITE silver.user_events PARTITION (event_date='2025-01-15')</text>
      <text x="24" y="82" fill="var(--delta)" font-size="8.5">  SELECT * FROM bronze.raw_events WHERE event_date='2025-01-15';</text>
      <text x="24" y="96" fill="var(--text-muted)" font-size="8" font-weight="700">-- UPDATE and DELETE with predicates</text>
      <text x="24" y="110" fill="var(--delta)" font-size="8.5">UPDATE silver.user_events SET is_valid=false WHERE user_id='DELETED';</text>
      <text x="24" y="124" fill="var(--delta)" font-size="8.5">DELETE FROM silver.user_events WHERE gdpr_delete_flag = true;</text>
      <text x="24" y="138" fill="var(--text-muted)" font-size="8" font-weight="700">-- MERGE (upsert) — primary CDC pattern at MediaStream</text>
      <text x="24" y="152" fill="var(--delta)" font-size="8.5">MERGE INTO silver.user_profiles t USING cdc_updates s</text>
      <text x="24" y="166" fill="var(--delta)" font-size="8.5">  ON t.user_id = s.user_id</text>
      <text x="24" y="180" fill="var(--delta)" font-size="8.5">  WHEN MATCHED AND s.op='DELETE' THEN DELETE</text>
      <text x="24" y="194" fill="var(--delta)" font-size="8.5">  WHEN MATCHED THEN UPDATE SET *</text>
      <text x="24" y="208" fill="var(--delta)" font-size="8.5">  WHEN NOT MATCHED THEN INSERT *;</text>
      <text x="240" y="272" text-anchor="middle" fill="var(--text-muted)" font-size="8">847K CDC events/day · APPLY CHANGES INTO (DLT) for SCD Type 1</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="24" text-anchor="middle" fill="var(--delta)" font-size="12" font-weight="700">Cheat Sheet: DLT Pipeline API</text>
      <rect x="14" y="36" width="452" height="222" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="54" fill="var(--text-muted)" font-size="8" font-weight="700">-- Streaming Table (incremental, maintains checkpointing)</text>
      <text x="24" y="68" fill="var(--delta)" font-size="8.5">@dlt.table(name="bronze_raw_events")</text>
      <text x="24" y="82" fill="var(--delta)" font-size="8.5">def bronze_raw_events():</text>
      <text x="24" y="96" fill="var(--delta)" font-size="8.5">  return spark.readStream.format("kafka").load()</text>
      <text x="24" y="110" fill="var(--text-muted)" font-size="8" font-weight="700">-- Materialized View with expectations (quality enforcement)</text>
      <text x="24" y="124" fill="var(--delta)" font-size="8.5">@dlt.expect_or_drop("valid_user", "user_id IS NOT NULL")</text>
      <text x="24" y="138" fill="var(--delta)" font-size="8.5">@dlt.expect("positive_duration", "watch_duration_secs &gt;= 0")</text>
      <text x="24" y="152" fill="var(--delta)" font-size="8.5">@dlt.table(name="silver_user_events")</text>
      <text x="24" y="166" fill="var(--delta)" font-size="8.5">def silver_user_events():</text>
      <text x="24" y="180" fill="var(--delta)" font-size="8.5">  return dlt.read_stream("bronze_raw_events").where(...)</text>
      <text x="24" y="194" fill="var(--text-muted)" font-size="8" font-weight="700">-- APPLY CHANGES INTO (SCD Type 1 upsert from CDC stream)</text>
      <text x="24" y="208" fill="var(--delta)" font-size="8.5">dlt.apply_changes(target="silver_user_profiles",</text>
      <text x="24" y="222" fill="var(--delta)" font-size="8.5">  source="cdc_stream", keys=["user_id"], sequence_by="ts")</text>
      <text x="240" y="272" text-anchor="middle" fill="var(--text-muted)" font-size="8">47 expectations · 22 tables · violations → system.events.dlt_expectations</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="24" text-anchor="middle" fill="#a855f7" font-size="12" font-weight="700">Cheat Sheet: Unity Catalog</text>
      <rect x="14" y="36" width="452" height="222" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="54" fill="var(--text-muted)" font-size="8" font-weight="700">-- Create hierarchy and grant privileges</text>
      <text x="24" y="68" fill="#a855f7" font-size="8.5">CREATE CATALOG IF NOT EXISTS mediastream_prod;</text>
      <text x="24" y="82" fill="#a855f7" font-size="8.5">GRANT USE CATALOG ON CATALOG mediastream_prod TO analysts;</text>
      <text x="24" y="96" fill="#a855f7" font-size="8.5">GRANT SELECT ON SCHEMA mediastream_prod.gold TO analysts;</text>
      <text x="24" y="110" fill="var(--text-muted)" font-size="8" font-weight="700">-- Row-level security (dynamic filter per user)</text>
      <text x="24" y="124" fill="#a855f7" font-size="8.5">CREATE ROW FILTER fn_region_filter(t STRUCT&lt;region_id STRING&gt;)</text>
      <text x="24" y="138" fill="#a855f7" font-size="8.5">  RETURN is_account_group_member('admin') OR t.region_id =</text>
      <text x="24" y="152" fill="#a855f7" font-size="8.5">    get_user_attribute(CURRENT_USER(), 'region');</text>
      <text x="24" y="166" fill="#a855f7" font-size="8.5">ALTER TABLE gold.content_performance SET ROW FILTER fn_region_filter ON (region_id);</text>
      <text x="24" y="180" fill="var(--text-muted)" font-size="8" font-weight="700">-- Column masking (PII protection)</text>
      <text x="24" y="194" fill="#a855f7" font-size="8.5">CREATE MASKING POLICY mask_email USING (email STRING)</text>
      <text x="24" y="208" fill="#a855f7" font-size="8.5">  RETURN CASE WHEN is_account_group_member('pii_access')</text>
      <text x="24" y="222" fill="#a855f7" font-size="8.5">    THEN email ELSE SHA2(email, 256) END;</text>
      <text x="240" y="272" text-anchor="middle" fill="var(--text-muted)" font-size="8">system.access.audit · system.information_schema.table_privileges · Delta Sharing</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    el.querySelectorAll('.cs-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.cs-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.cs-info');
    if (info) info.textContent = STEPS[si].detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="cs-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="cs-header module-header">
        <div>
          <div class="module-tag" style="background:var(--delta)">LEARNING</div>
          <h2 class="module-title">Cheat Sheets</h2>
          <p class="module-subtitle">Quick-reference SQL syntax for Delta Lake operations — Time Travel, VACUUM, OPTIMIZE, DML, DLT, and Unity Catalog</p>
        </div>
      </div>
      <div class="cs-pills step-pills">${pills}</div>
      <div class="cs-diagram diagram-frame"></div>
      <div class="cs-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'cs-page page-enter';
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
    container.querySelectorAll('.cs-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['cheatsheet'] = {
    id: 'cheatsheet', title: 'Cheat Sheets', group: 'Learning',
    render: _render,
    destroy() { if (_engine) { _engine.destroy(); _engine = null; } IV.AnimationControls.hide(); },
  };
})();
