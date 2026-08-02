(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Overview',
      desc: 'Batch write patterns in Delta Lake',
      detail: 'Delta Lake supports four primary batch write patterns: (1) INSERT INTO — append rows from a query. (2) INSERT OVERWRITE — atomically replace a table or partition. (3) COPY INTO — idempotent bulk load from files (CSV, Parquet, JSON). (4) DataFrame.write API — Spark programmatic writes with various save modes. All four are ACID — they either fully commit or fully roll back. At MediaStream, batch writes power the nightly aggregation jobs that populate Gold tables from Silver.',
    },
    {
      label: 'INSERT INTO',
      desc: 'Appending rows with INSERT INTO',
      detail: 'INSERT INTO appends rows from a SELECT query into a Delta table. The schema of the SELECT must be compatible with the target table (Delta enforces schema at write time). Use INSERT INTO for incremental appends — e.g., loading today\'s Silver data into Gold at the end of each day. INSERT INTO is equivalent to DataFrame.write.mode("append"). It creates a new transaction log entry with add file actions for the new Parquet files.',
    },
    {
      label: 'INSERT OVERWRITE',
      desc: 'Atomically replacing a table or partition',
      detail: 'INSERT OVERWRITE replaces the entire table (or a specific partition with dynamic overwrite) in a single atomic transaction. The old data files are marked as removed in the transaction log, and new files are added — all in one commit. This is safer than DROP + INSERT because readers always see either the old or new data, never nothing. Use for: full table refreshes, partition-level backfill, and corrective rewrites. MediaStream uses INSERT OVERWRITE for daily Gold table rebuilds.',
    },
    {
      label: 'COPY INTO',
      desc: 'Idempotent bulk load from object storage',
      detail: 'COPY INTO is an idempotent file-loading command — it tracks which files have already been loaded and skips them on re-run. Perfect for landing zone ingestion where files may accumulate before processing. Supports CSV, JSON, Parquet, Avro, ORC, text, and binary. The idempotency state is stored in the Delta transaction log. Use COPY INTO when: (1) files arrive in S3/ADLS and you want simple, restartable ingestion. (2) Deduplication across multiple runs is needed. MediaStream uses COPY INTO for partner feed ingestion.',
    },
    {
      label: 'DataFrame API',
      desc: 'Spark DataFrame.write with save modes',
      detail: 'The Spark DataFrame write API offers four save modes: append (add rows), overwrite (replace table), ignore (skip if table exists), error (fail if table exists). For Delta-specific features use .option("mergeSchema", "true") to allow schema evolution during write, and .option("overwriteSchema", "true") to replace the entire schema. The dynamic partition overwrite mode (spark.sql.sources.partitionOverwriteMode=dynamic) replaces only the partitions present in the DataFrame — key for safe incremental partition replacement.',
    },
    {
      label: 'MediaStream',
      desc: 'Batch write patterns at MediaStream',
      detail: 'MediaStream batch write patterns: (1) Daily Gold rebuild — INSERT OVERWRITE gold.daily_metrics with the last 90 days of Silver data (idempotent, 8:00am daily). (2) Weekly model training data — DataFrame.write.mode("overwrite").save() to ML feature store snapshot path. (3) Partner feed ingestion — COPY INTO bronze.partner_events FROM \'s3://landing-zone/partner/\' (runs hourly, idempotent). (4) Backfill jobs — INSERT OVERWRITE with specific event_date partition via dynamic overwrite. All jobs use job clusters (not interactive) to minimize cost.',
    },
  ];

  const DIAGRAMS = [
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Batch Write Patterns</text>
      <rect x="20" y="44" width="96" height="68" rx="6" fill="var(--bg-3)" stroke="var(--delta)" stroke-width="1.5"/>
      <text x="68" y="62" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">INSERT</text>
      <text x="68" y="76" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">INTO</text>
      <text x="68" y="92" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Append rows</text>
      <text x="68" y="104" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">from query</text>
      <rect x="130" y="44" width="96" height="68" rx="6" fill="var(--bg-3)" stroke="var(--delta)" stroke-width="1.5"/>
      <text x="178" y="62" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">INSERT</text>
      <text x="178" y="76" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">OVERWRITE</text>
      <text x="178" y="92" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Replace table</text>
      <text x="178" y="104" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">or partition</text>
      <rect x="240" y="44" width="96" height="68" rx="6" fill="var(--bg-3)" stroke="var(--delta)" stroke-width="1.5"/>
      <text x="288" y="62" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">COPY</text>
      <text x="288" y="76" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">INTO</text>
      <text x="288" y="92" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Idempotent</text>
      <text x="288" y="104" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">file load</text>
      <rect x="350" y="44" width="110" height="68" rx="6" fill="var(--bg-3)" stroke="var(--delta)" stroke-width="1.5"/>
      <text x="405" y="62" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">DataFrame</text>
      <text x="405" y="76" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">.write</text>
      <text x="405" y="92" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Programmatic</text>
      <text x="405" y="104" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Spark API</text>
      <rect x="20" y="130" width="440" height="136" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="240" y="148" text-anchor="middle" fill="var(--text-muted)" font-size="8.5" font-weight="700">All batch writes are ACID</text>
      <text x="30" y="166" fill="var(--text-muted)" font-size="8">Atomicity: all rows land or none do</text>
      <text x="30" y="182" fill="var(--text-muted)" font-size="8">Consistency: schema + constraints enforced at write</text>
      <text x="30" y="198" fill="var(--text-muted)" font-size="8">Isolation: concurrent readers see consistent snapshot</text>
      <text x="30" y="214" fill="var(--text-muted)" font-size="8">Durability: committed to object storage in _delta_log/</text>
      <line x1="30" y1="226" x2="450" y2="226" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <text x="30" y="244" fill="var(--delta)" font-size="8">MediaStream: Gold rebuild (INSERT OVERWRITE) · COPY INTO partner feeds</text>
      <text x="30" y="258" fill="var(--delta)" font-size="8">DataFrame.write for ML snapshots · INSERT INTO for incremental Silver→Gold</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">INSERT INTO — Append Pattern</text>
      <rect x="14" y="38" width="452" height="224" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="58" fill="var(--text-muted)" font-size="8" font-weight="700">-- Append today's Silver to Gold incremental table</text>
      <text x="24" y="72" fill="var(--delta)" font-size="8.5">INSERT INTO gold.daily_view_counts</text>
      <text x="24" y="86" fill="var(--delta)" font-size="8.5">SELECT event_date, content_id,</text>
      <text x="24" y="100" fill="var(--delta)" font-size="8.5">  COUNT(DISTINCT user_id) AS unique_viewers,</text>
      <text x="24" y="114" fill="var(--delta)" font-size="8.5">  SUM(watch_duration_secs) AS total_watch_secs</text>
      <text x="24" y="128" fill="var(--delta)" font-size="8.5">FROM silver.user_events</text>
      <text x="24" y="142" fill="var(--delta)" font-size="8.5">WHERE event_date = current_date()</text>
      <text x="24" y="156" fill="var(--delta)" font-size="8.5">GROUP BY 1, 2;</text>
      <text x="24" y="172" fill="var(--text-muted)" font-size="8" font-weight="700">-- Equivalent DataFrame API</text>
      <text x="24" y="186" fill="var(--delta)" font-size="8.5">df.write.format("delta").mode("append")</text>
      <text x="24" y="200" fill="var(--delta)" font-size="8.5">  .saveAsTable("gold.daily_view_counts")</text>
      <text x="24" y="216" fill="var(--text-muted)" font-size="8" font-weight="700">-- Schema must match (or use mergeSchema for new columns)</text>
      <text x="24" y="230" fill="var(--delta)" font-size="8.5">df.write.format("delta").mode("append")</text>
      <text x="24" y="244" fill="var(--delta)" font-size="8.5">  .option("mergeSchema", "true").saveAsTable("gold.table")</text>
      <text x="240" y="278" text-anchor="middle" fill="var(--text-muted)" font-size="8">Creates new files · adds log entries · readers see new rows immediately</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">INSERT OVERWRITE — Atomic Replace</text>
      <rect x="14" y="38" width="452" height="224" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="58" fill="var(--text-muted)" font-size="8" font-weight="700">-- Full table overwrite (replaces everything atomically)</text>
      <text x="24" y="72" fill="var(--delta)" font-size="8.5">INSERT OVERWRITE gold.daily_metrics</text>
      <text x="24" y="86" fill="var(--delta)" font-size="8.5">SELECT * FROM silver.user_events_agg</text>
      <text x="24" y="100" fill="var(--delta)" font-size="8.5">WHERE event_date &gt;= date_sub(current_date(), 90);</text>
      <text x="24" y="116" fill="var(--text-muted)" font-size="8" font-weight="700">-- Dynamic partition overwrite (replaces only present partitions)</text>
      <text x="24" y="130" fill="var(--delta)" font-size="8.5">SET spark.sql.sources.partitionOverwriteMode=dynamic;</text>
      <text x="24" y="144" fill="var(--delta)" font-size="8.5">INSERT OVERWRITE gold.daily_metrics PARTITION (event_date)</text>
      <text x="24" y="158" fill="var(--delta)" font-size="8.5">SELECT * FROM corrected_data;  -- only rewrites affected dates</text>
      <text x="24" y="174" fill="var(--text-muted)" font-size="8" font-weight="700">-- DataFrame API overwrite</text>
      <text x="24" y="188" fill="var(--delta)" font-size="8.5">df.write.format("delta").mode("overwrite")</text>
      <text x="24" y="202" fill="var(--delta)" font-size="8.5">  .option("replaceWhere", "event_date = '2025-01-15'")</text>
      <text x="24" y="216" fill="var(--delta)" font-size="8.5">  .saveAsTable("gold.daily_metrics")</text>
      <text x="240" y="276" text-anchor="middle" fill="var(--text-muted)" font-size="8">Readers see old data until commit — atomic flip, no partial state</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">COPY INTO — Idempotent File Load</text>
      <rect x="14" y="38" width="452" height="224" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="58" fill="var(--text-muted)" font-size="8" font-weight="700">-- Load new files from S3 landing zone (idempotent)</text>
      <text x="24" y="72" fill="var(--delta)" font-size="8.5">COPY INTO bronze.partner_events</text>
      <text x="24" y="86" fill="var(--delta)" font-size="8.5">FROM 's3://mediastream-landing/partner/'</text>
      <text x="24" y="100" fill="var(--delta)" font-size="8.5">FILEFORMAT = PARQUET</text>
      <text x="24" y="114" fill="var(--delta)" font-size="8.5">COPY_OPTIONS ('mergeSchema' = 'true');</text>
      <text x="24" y="130" fill="var(--text-muted)" font-size="8" font-weight="700">-- COPY INTO with CSV and format options</text>
      <text x="24" y="144" fill="var(--delta)" font-size="8.5">COPY INTO bronze.raw_impressions</text>
      <text x="24" y="158" fill="var(--delta)" font-size="8.5">FROM 's3://mediastream-landing/impressions/'</text>
      <text x="24" y="172" fill="var(--delta)" font-size="8.5">FILEFORMAT = CSV</text>
      <text x="24" y="186" fill="var(--delta)" font-size="8.5">FORMAT_OPTIONS ('header' = 'true', 'delimiter' = ',');</text>
      <text x="24" y="202" fill="var(--text-muted)" font-size="8" font-weight="700">-- Why idempotent: already-loaded files are tracked in Delta log</text>
      <rect x="24" y="210" width="420" height="38" rx="5" fill="rgba(255,107,53,0.08)"/>
      <text x="34" y="225" fill="var(--text-muted)" font-size="8">Re-running COPY INTO the same path is SAFE — skips already-loaded files.</text>
      <text x="34" y="239" fill="var(--delta)" font-size="8">MediaStream: hourly partner feed job, ~200 new files/run, never duplicates.</text>
      <text x="240" y="278" text-anchor="middle" fill="var(--text-muted)" font-size="8">Supports: CSV, JSON, Parquet, Avro, ORC, text, binaryFile</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">DataFrame.write API</text>
      <rect x="14" y="38" width="452" height="224" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="58" fill="var(--text-muted)" font-size="8" font-weight="700">-- Append (default for streaming, common for batch)</text>
      <text x="24" y="72" fill="var(--delta)" font-size="8.5">df.write.format("delta").mode("append").saveAsTable("t")</text>
      <text x="24" y="88" fill="var(--text-muted)" font-size="8" font-weight="700">-- Overwrite entire table</text>
      <text x="24" y="102" fill="var(--delta)" font-size="8.5">df.write.format("delta").mode("overwrite").saveAsTable("t")</text>
      <text x="24" y="118" fill="var(--text-muted)" font-size="8" font-weight="700">-- Overwrite with schema evolution</text>
      <text x="24" y="132" fill="var(--delta)" font-size="8.5">df.write.format("delta").mode("overwrite")</text>
      <text x="24" y="146" fill="var(--delta)" font-size="8.5">  .option("overwriteSchema", "true").saveAsTable("t")</text>
      <text x="24" y="162" fill="var(--text-muted)" font-size="8" font-weight="700">-- Append with schema merge (adds new columns if present)</text>
      <text x="24" y="176" fill="var(--delta)" font-size="8.5">df.write.format("delta").mode("append")</text>
      <text x="24" y="190" fill="var(--delta)" font-size="8.5">  .option("mergeSchema", "true").saveAsTable("t")</text>
      <text x="24" y="206" fill="var(--text-muted)" font-size="8" font-weight="700">-- Partition overwrite (replaces only affected partitions)</text>
      <text x="24" y="220" fill="var(--delta)" font-size="8.5">df.write.format("delta").mode("overwrite")</text>
      <text x="24" y="234" fill="var(--delta)" font-size="8.5">  .option("replaceWhere", "event_date = '2025-01-15'")</text>
      <text x="24" y="248" fill="var(--delta)" font-size="8.5">  .saveAsTable("gold.daily_metrics")</text>
      <text x="240" y="278" text-anchor="middle" fill="var(--text-muted)" font-size="8">replaceWhere: only rewrites the matching partition — safe for concurrent jobs</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">MediaStream Batch Write Patterns</text>
      <rect x="14" y="38" width="452" height="234" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <rect x="24" y="50" width="14" height="14" rx="2" fill="var(--delta)"/>
      <text x="46" y="61" fill="var(--delta)" font-size="8" font-weight="700">Daily Gold Rebuild</text>
      <text x="46" y="75" fill="var(--text-muted)" font-size="7.5">INSERT OVERWRITE gold.daily_metrics  (8:00am daily, 90-day window)</text>
      <line x1="24" y1="84" x2="452" y2="84" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <rect x="24" y="92" width="14" height="14" rx="2" fill="var(--delta)"/>
      <text x="46" y="103" fill="var(--delta)" font-size="8" font-weight="700">Partner Feed Ingestion</text>
      <text x="46" y="117" fill="var(--text-muted)" font-size="7.5">COPY INTO bronze.partner_events FROM s3://landing/  (hourly, idempotent)</text>
      <line x1="24" y1="126" x2="452" y2="126" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <rect x="24" y="134" width="14" height="14" rx="2" fill="var(--delta)"/>
      <text x="46" y="145" fill="var(--delta)" font-size="8" font-weight="700">ML Feature Snapshot</text>
      <text x="46" y="159" fill="var(--text-muted)" font-size="7.5">DataFrame.write.mode("overwrite")  (weekly, training data export)</text>
      <line x1="24" y1="168" x2="452" y2="168" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <rect x="24" y="176" width="14" height="14" rx="2" fill="var(--delta)"/>
      <text x="46" y="187" fill="var(--delta)" font-size="8" font-weight="700">Incremental Silver → Gold</text>
      <text x="46" y="201" fill="var(--text-muted)" font-size="7.5">INSERT INTO gold.view_counts  (hourly, today's Silver only)</text>
      <line x1="24" y1="210" x2="452" y2="210" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <rect x="24" y="218" width="14" height="14" rx="2" fill="var(--delta)"/>
      <text x="46" y="229" fill="var(--delta)" font-size="8" font-weight="700">Backfill / Correction Jobs</text>
      <text x="46" y="243" fill="var(--text-muted)" font-size="7.5">INSERT OVERWRITE with dynamic partition overwrite  (on-demand)</text>
      <text x="240" y="286" text-anchor="middle" fill="var(--text-muted)" font-size="8">All batch jobs use job clusters (not interactive) · estimated $2,100/day total</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    el.querySelectorAll('.bw-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.bw-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.bw-info');
    if (info) info.textContent = STEPS[si].detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="bw-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="bw-header module-header">
        <div>
          <div class="module-tag" style="background:var(--delta)">WRITE OPS</div>
          <h2 class="module-title">Batch Write</h2>
          <p class="module-subtitle">INSERT INTO, INSERT OVERWRITE, COPY INTO, and DataFrame.write — four ACID batch write patterns for Delta Lake</p>
        </div>
      </div>
      <div class="bw-pills step-pills">${pills}</div>
      <div class="bw-diagram diagram-frame"></div>
      <div class="bw-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'bw-page page-enter';
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
    container.querySelectorAll('.bw-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['batch-write'] = {
    id: 'batch-write', title: 'Batch Write', group: 'Write Operations',
    render: _render,
    destroy() { if (_engine) { _engine.destroy(); _engine = null; } IV.AnimationControls.hide(); },
  };
})();
