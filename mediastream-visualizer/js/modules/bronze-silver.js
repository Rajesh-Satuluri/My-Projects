(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Bronze Definition',
      desc: 'Bronze tables are the raw landing zone — exactly as received from sources, no transformations.',
      detail: 'Bronze is a Streaming Table that reads from Kafka with dlt.read_stream(). Every event lands verbatim — no filtering, no schema changes, no deduplication. Bronze is append-only and serves as the immutable source of truth for reprocessing.',
    },
    {
      label: 'Bronze Schema',
      desc: 'Bronze adds metadata columns — _kafka_offset, _kafka_partition, _ingest_ts — to every raw event.',
      detail: 'Metadata columns let you trace any row back to its exact Kafka position. If Silver or Gold has a bug and you need to reprocess, Bronze is the starting point. Schema evolution on Bronze is set to "rescue" mode — unknown columns go to _rescued_data JSON.',
    },
    {
      label: 'Bronze → Silver Transform',
      desc: 'Silver applies APPLY CHANGES INTO for CDC, deduplication via dropDuplicates, and type casting.',
      detail: 'APPLY CHANGES INTO is DLT\'s built-in CDC (change data capture) operator. It handles INSERT/UPDATE/DELETE operations from a source stream, applying them to a target table with configurable keys and sequencing.',
    },
    {
      label: 'Dedup Logic',
      desc: 'Silver deduplicates on (event_id, user_id) with a 24-hour watermark — handles late arrivals up to 24h.',
      detail: 'MediaStream receives 3.2M duplicate events per day due to Kafka at-least-once delivery and mobile app retries. Watermark at 24h catches 99.97% of duplicates. Remaining stragglers handled by MERGE INTO in a separate reconciliation job.',
    },
    {
      label: 'Quality Constraints',
      desc: 'Silver enforces 8 data quality constraints — DROP on violation to keep Silver clean.',
      detail: 'Constraints on Silver: session_duration > 0, user_id NOT NULL, event_time within 30-day window, content_id matches known catalog, region in valid set. Pass rate monitored in DLT UI — below 99.5% triggers PagerDuty.',
    },
    {
      label: 'Bronze → Silver Metrics',
      desc: 'Bronze ingests 27,778 events/sec. Silver outputs 24,380 events/sec after dedup and quality filtering.',
      detail: 'Bronze rows/day: 2.4B. Silver rows/day: 2.14B (89% retention after dedup + quality filters). Quarantined: 260M rows/day held in bronze_quarantine for investigation. Recovery: 3.2M/day rescued by late MERGE.',
    },
  ];

  const DIAGRAMS = [
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#ff6b35" font-size="11" font-weight="bold">BRONZE TABLE DEFINITION</text>
      <rect x="16" y="30" width="448" height="140" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">DLT Bronze table (Python API)</text>
      <text x="26" y="66" fill="#a855f7" font-size="8">@dlt.table(</text>
      <text x="26" y="80" fill="#94a3b8" font-size="8">  name="bronze_clickstream",</text>
      <text x="26" y="94" fill="#94a3b8" font-size="8">  comment="Raw Kafka events — immutable, append-only",</text>
      <text x="26" y="108" fill="#94a3b8" font-size="8">  table_properties={"pipelines.autoOptimize.managed": "true"})</text>
      <text x="26" y="122" fill="#a855f7" font-size="8">def bronze_clickstream():</text>
      <text x="26" y="136" fill="#94a3b8" font-size="8">  return spark.readStream.format("kafka") \</text>
      <text x="26" y="150" fill="#94a3b8" font-size="8">    .option("kafka.bootstrap.servers", KAFKA_BROKERS) \</text>
      <text x="26" y="164" fill="#94a3b8" font-size="8">    .option("subscribe", "ms-clickstream-events") \</text>
      <text x="26" y="178" fill="#94a3b8" font-size="8">    .load()</text>
      <rect x="16" y="182" width="448" height="64" rx="5" fill="#1e293b"/>
      <text x="240" y="200" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Bronze Table Properties</text>
      <text x="26" y="216" fill="#4ade80" font-size="8">✓ Append-only (no DELETE, no UPDATE)</text>
      <text x="26" y="230" fill="#4ade80" font-size="8">✓ Schema evolution = RESCUE (unknown cols → _rescued_data)</text>
      <text x="26" y="244" fill="#4ade80" font-size="8">✓ Partitioned by date(_ingest_ts) for efficient time-range queries</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#ff6b35" font-size="11" font-weight="bold">BRONZE SCHEMA</text>
      <rect x="16" y="30" width="448" height="186" rx="5" fill="#1e293b"/>
      <rect x="16" y="30" width="448" height="18" rx="4" fill="#334155"/>
      <text x="130" y="43" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">Column</text>
      <text x="280" y="43" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">Type</text>
      <text x="420" y="43" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">Source</text>
      <text x="26" y="63" fill="#ff6b35" font-size="8">value</text>
      <text x="226" y="63" fill="#94a3b8" font-size="8">BINARY</text>
      <text x="380" y="63" fill="#94a3b8" font-size="8">Kafka payload</text>
      <text x="26" y="79" fill="#ff6b35" font-size="8">key</text>
      <text x="226" y="79" fill="#94a3b8" font-size="8">BINARY</text>
      <text x="380" y="79" fill="#94a3b8" font-size="8">Kafka key</text>
      <text x="26" y="95" fill="#4ade80" font-size="8">_kafka_offset</text>
      <text x="226" y="95" fill="#94a3b8" font-size="8">BIGINT</text>
      <text x="380" y="95" fill="#4ade80" font-size="8">Added by DLT</text>
      <text x="26" y="111" fill="#4ade80" font-size="8">_kafka_partition</text>
      <text x="226" y="111" fill="#94a3b8" font-size="8">INT</text>
      <text x="380" y="111" fill="#4ade80" font-size="8">Added by DLT</text>
      <text x="26" y="127" fill="#4ade80" font-size="8">_kafka_topic</text>
      <text x="226" y="127" fill="#94a3b8" font-size="8">STRING</text>
      <text x="380" y="127" fill="#4ade80" font-size="8">Added by DLT</text>
      <text x="26" y="143" fill="#4ade80" font-size="8">_ingest_ts</text>
      <text x="226" y="143" fill="#94a3b8" font-size="8">TIMESTAMP</text>
      <text x="380" y="143" fill="#4ade80" font-size="8">Added by DLT</text>
      <text x="26" y="159" fill="#4ade80" font-size="8">_rescued_data</text>
      <text x="226" y="159" fill="#94a3b8" font-size="8">STRING (JSON)</text>
      <text x="380" y="159" fill="#4ade80" font-size="8">Schema rescue</text>
      <text x="26" y="175" fill="#64748b" font-size="8">event_id, user_id, ...</text>
      <text x="226" y="175" fill="#64748b" font-size="8">varies</text>
      <text x="380" y="175" fill="#64748b" font-size="8">Event payload</text>
      <text x="26" y="206" fill="#64748b" font-size="7">Metadata columns (green) added by DLT — trace any row back to exact Kafka offset</text>
      <rect x="16" y="226" width="448" height="44" rx="5" fill="#1e293b" stroke="#fbbf24" stroke-width="1"/>
      <text x="240" y="244" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">Rescue mode: schema change in Kafka</text>
      <text x="26" y="262" fill="#94a3b8" font-size="8">New field in Kafka payload → goes to _rescued_data (JSON) · DLT never fails on schema change</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#ff6b35" font-size="11" font-weight="bold">BRONZE → SILVER TRANSFORM</text>
      <rect x="16" y="30" width="448" height="152" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">APPLY CHANGES INTO (CDC)</text>
      <text x="26" y="66" fill="#a855f7" font-size="8">dlt.apply_changes(</text>
      <text x="26" y="80" fill="#94a3b8" font-size="8">  target = "silver_user_sessions",</text>
      <text x="26" y="94" fill="#94a3b8" font-size="8">  source = "bronze_clickstream",</text>
      <text x="26" y="108" fill="#94a3b8" font-size="8">  keys   = ["event_id", "user_id"],</text>
      <text x="26" y="122" fill="#94a3b8" font-size="8">  sequence_by = col("event_time"),</text>
      <text x="26" y="136" fill="#94a3b8" font-size="8">  apply_as_deletes = expr("op = 'DELETE'"),</text>
      <text x="26" y="150" fill="#94a3b8" font-size="8">  except_column_list = ["_kafka_offset", "_rescued_data"])</text>
      <text x="26" y="174" fill="#64748b" font-size="7">APPLY CHANGES handles INSERT/UPDATE/DELETE from CDC source automatically</text>
      <rect x="16" y="184" width="448" height="80" rx="5" fill="#1e293b"/>
      <text x="240" y="202" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">What APPLY CHANGES Does</text>
      <text x="26" y="218" fill="#4ade80" font-size="8">INSERT: new (event_id, user_id) → insert row</text>
      <text x="26" y="232" fill="#fbbf24" font-size="8">UPDATE: existing key, higher sequence_by → update row</text>
      <text x="26" y="246" fill="#ef4444" font-size="8">DELETE: op=DELETE → hard delete or tombstone</text>
      <text x="240" y="276" text-anchor="middle" fill="#64748b" font-size="7">Implements SCD Type 1 by default · Type 2 via STORED AS SCD TYPE 2</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#ff6b35" font-size="11" font-weight="bold">DEDUPLICATION LOGIC</text>
      <rect x="16" y="30" width="448" height="88" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Watermark Deduplication</text>
      <text x="26" y="66" fill="#a855f7" font-size="8">@dlt.table(name="silver_events_deduped")</text>
      <text x="26" y="80" fill="#a855f7" font-size="8">@dlt.expect_or_drop("no_duplicates", "event_id IS NOT NULL")</text>
      <text x="26" y="94" fill="#a855f7" font-size="8">def silver_events_deduped():</text>
      <text x="26" y="108" fill="#94a3b8" font-size="8">  return (dlt.read_stream("bronze_clickstream")</text>
      <text x="26" y="116" fill="#94a3b8" font-size="7">    .withWatermark("event_time", "24 hours")</text>
      <text x="26" y="124" fill="#94a3b8" font-size="7">    .dropDuplicates(["event_id", "user_id"]))</text>
      <rect x="16" y="142" width="448" height="96" rx="5" fill="#1e293b"/>
      <text x="240" y="160" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Duplicate Sources at MediaStream</text>
      <text x="26" y="176" fill="#fbbf24" font-size="8">Kafka at-least-once delivery:   1.8M dupes/day</text>
      <text x="26" y="190" fill="#fbbf24" font-size="8">Mobile app retry logic:         0.9M dupes/day</text>
      <text x="26" y="204" fill="#fbbf24" font-size="8">CDN edge re-delivery:           0.5M dupes/day</text>
      <text x="26" y="218" fill="#4ade80" font-size="8">Total caught by 24h watermark:  3.17M (99.97%)</text>
      <text x="26" y="232" fill="#64748b" font-size="7">Remaining stragglers:           ~9.6K/day → caught by MERGE reconciliation</text>
      <rect x="16" y="250" width="448" height="30" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
      <text x="240" y="270" text-anchor="middle" fill="#38bdf8" font-size="8">State store: 24h × 27,778 events/sec × ~100 bytes = ~240 GB RocksDB state</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#ff6b35" font-size="11" font-weight="bold">SILVER QUALITY CONSTRAINTS</text>
      <rect x="16" y="30" width="448" height="140" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">8 Constraints on Silver (all DROP on violation)</text>
      <text x="26" y="66" fill="#4ade80" font-size="8">CONSTRAINT valid_session      EXPECT (session_duration_ms &gt; 0)</text>
      <text x="26" y="80" fill="#4ade80" font-size="8">CONSTRAINT valid_user         EXPECT (user_id IS NOT NULL)</text>
      <text x="26" y="94" fill="#4ade80" font-size="8">CONSTRAINT valid_event_window EXPECT (event_time &gt; CURRENT_TIMESTAMP - INTERVAL 30 DAYS)</text>
      <text x="26" y="108" fill="#4ade80" font-size="8">CONSTRAINT valid_content      EXPECT (content_id RLIKE '^[a-z0-9-]{8,36}$')</text>
      <text x="26" y="122" fill="#4ade80" font-size="8">CONSTRAINT valid_region       EXPECT (region IN (SELECT region FROM regions_ref))</text>
      <text x="26" y="136" fill="#4ade80" font-size="8">CONSTRAINT valid_event_type   EXPECT (event_type IN ('play','pause','seek','buffer','complete'))</text>
      <text x="26" y="150" fill="#64748b" font-size="8">+ 2 more: valid_watch_pct (0-100), valid_bitrate (&gt;0)</text>
      <rect x="16" y="180" width="210" height="78" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1"/>
      <text x="121" y="198" text-anchor="middle" fill="#4ade80" font-size="8" font-weight="bold">Pass Rate (Jan 2025)</text>
      <text x="26" y="214" fill="#94a3b8" font-size="8">valid_session:  99.97%</text>
      <text x="26" y="228" fill="#94a3b8" font-size="8">valid_content:  99.91%</text>
      <text x="26" y="242" fill="#94a3b8" font-size="8">valid_region:   99.87%</text>
      <rect x="254" y="180" width="210" height="78" rx="5" fill="#1e293b" stroke="#ef4444" stroke-width="1"/>
      <text x="359" y="198" text-anchor="middle" fill="#ef4444" font-size="8" font-weight="bold">Alert Threshold</text>
      <text x="264" y="214" fill="#fbbf24" font-size="8">Warn:    &lt; 99.8% pass rate</text>
      <text x="264" y="228" fill="#ef4444" font-size="8">PagerDuty: &lt; 99.5% pass rate</text>
      <text x="264" y="242" fill="#ef4444" font-size="8">HALT:    &lt; 98.0% pass rate</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#ff6b35" font-size="11" font-weight="bold">BRONZE → SILVER METRICS</text>
      <rect x="16" y="30" width="448" height="114" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Daily Volume Flow</text>
      <rect x="26" y="56" width="100" height="72" rx="4" fill="#ff6b35" opacity="0.15" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="76" y="76" text-anchor="middle" fill="#ff6b35" font-size="9" font-weight="bold">BRONZE</text>
      <text x="76" y="92" text-anchor="middle" fill="#ff6b35" font-size="11" font-weight="bold">2.40B</text>
      <text x="76" y="106" text-anchor="middle" fill="#94a3b8" font-size="7">rows/day</text>
      <text x="76" y="118" text-anchor="middle" fill="#64748b" font-size="7">100%</text>
      <line x1="126" y1="92" x2="160" y2="92" stroke="#475569" stroke-width="1.5"/>
      <polygon points="158,88 166,92 158,96" fill="#475569"/>
      <text x="143" y="84" text-anchor="middle" fill="#ef4444" font-size="7">-11%</text>
      <rect x="166" y="56" width="100" height="72" rx="4" fill="#fbbf24" opacity="0.15" stroke="#fbbf24" stroke-width="1.5"/>
      <text x="216" y="76" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">DEDUPED</text>
      <text x="216" y="92" text-anchor="middle" fill="#fbbf24" font-size="11" font-weight="bold">2.14B</text>
      <text x="216" y="106" text-anchor="middle" fill="#94a3b8" font-size="7">rows/day</text>
      <text x="216" y="118" text-anchor="middle" fill="#64748b" font-size="7">89.2%</text>
      <line x1="266" y1="92" x2="300" y2="92" stroke="#475569" stroke-width="1.5"/>
      <polygon points="298,88 306,92 298,96" fill="#475569"/>
      <text x="283" y="84" text-anchor="middle" fill="#ef4444" font-size="7">-0.4%</text>
      <rect x="306" y="56" width="100" height="72" rx="4" fill="#4ade80" opacity="0.15" stroke="#4ade80" stroke-width="1.5"/>
      <text x="356" y="76" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">SILVER</text>
      <text x="356" y="92" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="bold">2.13B</text>
      <text x="356" y="106" text-anchor="middle" fill="#94a3b8" font-size="7">rows/day</text>
      <text x="356" y="118" text-anchor="middle" fill="#64748b" font-size="7">88.8%</text>
      <rect x="16" y="158" width="448" height="100" rx="5" fill="#1e293b"/>
      <text x="240" y="176" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Disposition of Dropped Rows</text>
      <text x="26" y="194" fill="#ef4444" font-size="8">Duplicates dropped:          260M/day (10.8%)  → not quarantined, expected</text>
      <text x="26" y="208" fill="#fbbf24" font-size="8">Constraint violations:        8.4M/day  (0.35%) → bronze_quarantine table</text>
      <text x="26" y="222" fill="#a855f7" font-size="8">Late stragglers MERGE-rescued:  3.2M/day (0.13%) → recovered same day</text>
      <text x="26" y="236" fill="#4ade80" font-size="8">Silver net rows:          2,131M/day (88.8%)  → clean, ready for Gold</text>
      <text x="240" y="260" text-anchor="middle" fill="#64748b" font-size="7">Quarantine table reviewed daily · chronic violations trigger schema investigation</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.bs-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.bs-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.bs-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="bs-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="bs-header module-header">
        <div class="module-tag" style="background:var(--delta)">DLT PIPELINES</div>
        <h2 class="module-title">Bronze → Silver</h2>
        <p class="module-subtitle">Raw ingest · APPLY CHANGES · Dedup watermark · Quality constraints</p>
      </div>
      <div class="bs-pills step-pills">${pills}</div>
      <div class="bs-diagram diagram-frame"></div>
      <div class="bs-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'bs-page page-enter';
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

    container.querySelectorAll('.bs-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['bronze-silver'] = {
    id: 'bronze-silver',
    title: 'Bronze → Silver',
    group: 'DLT Pipelines',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
