(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Silver → Gold Overview',
      desc: 'Gold is the analytics-ready layer — aggregated, business-meaningful KPIs built from clean Silver data.',
      detail: 'Gold tables are Materialized Views in DLT — they fully recompute on each trigger (hourly). Because Silver is clean and deduplicated, Gold aggregates are always correct and idempotent. No append-only workarounds needed.',
    },
    {
      label: 'daily_content_kpis',
      desc: 'The primary Gold table: per-content, per-day metrics — views, watch time, completion rate, unique viewers.',
      detail: 'daily_content_kpis is MediaStream\'s most-queried Gold table — 840 BI dashboard queries/day. It aggregates 2.1B Silver rows into 4.2M content × date combinations. 99.9% freshness SLA within 1 hour of Silver completing.',
    },
    {
      label: 'user_segments',
      desc: 'User segmentation: power users, churners, casual viewers, genre preferences — refreshed daily.',
      detail: 'user_segments classifies 180M users into 12 behavioral segments using 90-day watch history. Used by ML team for recommendation features and by marketing for campaign targeting. Refreshed daily at 02:00 UTC.',
    },
    {
      label: 'SCD Type 2',
      desc: 'Content metadata uses SCD Type 2 — full history of title changes, genre reclassifications, license expirations.',
      detail: 'APPLY CHANGES INTO with STORED AS SCD TYPE 2 creates a slowly-changing dimension with effective_date/end_date columns. Content titles get renamed, genres get reclassified — SCD 2 preserves what users saw at the time they watched.',
    },
    {
      label: 'Gold Layer Joins',
      desc: 'Gold tables join Silver events with shared_governance dimension tables — content catalog, user regions, campaign IDs.',
      detail: 'Silver holds event-level data with foreign keys. Gold enriches these with content metadata (title, genre, runtime), user dimensions (region, segment, plan), and campaign data. Joins happen at Gold time, not Silver — keeps Silver thin and fast.',
    },
    {
      label: 'Gold Metrics',
      desc: 'Gold layer: 12 materialized views, 4.2M rows in daily_content_kpis, sub-1h freshness, 840 queries/day.',
      detail: 'Gold write time: 8 minutes for full recompute of 12 materialized views (Triggered mode, 16-node cluster). Storage: 240 GB uncompressed → 18 GB on disk (Delta + Parquet + Z-Order on content_id, date). Cache hit rate: 94% for BI queries.',
    },
  ];

  const DIAGRAMS = [
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="bold">SILVER → GOLD OVERVIEW</text>
      <rect x="16" y="32" width="130" height="110" rx="5" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5"/>
      <text x="81" y="50" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">SILVER</text>
      <text x="81" y="68" text-anchor="middle" fill="#94a3b8" font-size="8">2.13B rows/day</text>
      <text x="81" y="82" text-anchor="middle" fill="#94a3b8" font-size="8">Event-level</text>
      <text x="81" y="96" text-anchor="middle" fill="#94a3b8" font-size="8">Streaming Table</text>
      <text x="81" y="110" text-anchor="middle" fill="#64748b" font-size="7">clean · deduped</text>
      <text x="81" y="124" text-anchor="middle" fill="#64748b" font-size="7">continuous mode</text>
      <line x1="146" y1="87" x2="180" y2="87" stroke="#475569" stroke-width="1.5"/>
      <polygon points="178,83 186,87 178,91" fill="#475569"/>
      <text x="163" y="78" fill="#64748b" font-size="7">1h</text>
      <rect x="180" y="32" width="130" height="110" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="245" y="50" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">GOLD</text>
      <text x="245" y="68" text-anchor="middle" fill="#94a3b8" font-size="8">4.2M rows/day</text>
      <text x="245" y="82" text-anchor="middle" fill="#94a3b8" font-size="8">Aggregated KPIs</text>
      <text x="245" y="96" text-anchor="middle" fill="#94a3b8" font-size="8">Materialized View</text>
      <text x="245" y="110" text-anchor="middle" fill="#64748b" font-size="7">business-ready</text>
      <text x="245" y="124" text-anchor="middle" fill="#64748b" font-size="7">triggered mode</text>
      <rect x="328" y="32" width="136" height="44" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
      <text x="396" y="50" text-anchor="middle" fill="#38bdf8" font-size="8" font-weight="bold">BI / Looker</text>
      <text x="396" y="64" text-anchor="middle" fill="#64748b" font-size="7">840 queries/day</text>
      <rect x="328" y="86" width="136" height="44" rx="4" fill="#1e293b" stroke="#a855f7" stroke-width="1"/>
      <text x="396" y="104" text-anchor="middle" fill="#a855f7" font-size="8" font-weight="bold">ML Features</text>
      <text x="396" y="118" text-anchor="middle" fill="#64748b" font-size="7">4h refresh</text>
      <line x1="310" y1="60" x2="328" y2="54" stroke="#38bdf8" stroke-width="1"/>
      <line x1="310" y1="114" x2="328" y2="108" stroke="#a855f7" stroke-width="1"/>
      <rect x="16" y="156" width="448" height="100" rx="5" fill="#1e293b"/>
      <text x="240" y="174" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Gold = Materialized View (always-correct)</text>
      <text x="26" y="192" fill="#4ade80" font-size="8">✓ Full recompute each trigger → no incremental drift</text>
      <text x="26" y="206" fill="#4ade80" font-size="8">✓ Idempotent: re-run same pipeline → same result</text>
      <text x="26" y="220" fill="#4ade80" font-size="8">✓ No watermark needed → simpler than Streaming aggregation</text>
      <text x="26" y="234" fill="#4ade80" font-size="8">✓ Delta ACID: BI always reads consistent snapshot</text>
      <text x="240" y="260" text-anchor="middle" fill="#64748b" font-size="7">Recompute cost: 8min on 16-node cluster every 1h = 3.2 DBU/day</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="bold">daily_content_kpis</text>
      <rect x="16" y="30" width="448" height="106" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">DLT Definition</text>
      <text x="26" y="66" fill="#a855f7" font-size="8">@dlt.table(name="daily_content_kpis", comment="BI KPIs per content per day")</text>
      <text x="26" y="80" fill="#a855f7" font-size="8">def daily_content_kpis():</text>
      <text x="26" y="94" fill="#94a3b8" font-size="8">  return (dlt.read("silver_user_sessions")</text>
      <text x="26" y="108" fill="#94a3b8" font-size="8">    .groupBy("content_id", to_date("event_time").alias("date"))</text>
      <text x="26" y="118" fill="#94a3b8" font-size="7">    .agg(count("*").alias("views"), sum("watch_ms").alias("watch_ms"),</text>
      <text x="26" y="128" fill="#94a3b8" font-size="7">         avg("completion_pct").alias("completion_rate"),</text>
      <text x="26" y="138" fill="#94a3b8" font-size="7">         countDistinct("user_id").alias("unique_viewers")))</text>
      <rect x="16" y="148" width="448" height="110" rx="5" fill="#1e293b"/>
      <text x="240" y="166" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Schema &amp; Scale</text>
      <text x="26" y="184" fill="#38bdf8" font-size="8">content_id STRING      · date DATE</text>
      <text x="26" y="198" fill="#38bdf8" font-size="8">views BIGINT           · watch_ms BIGINT</text>
      <text x="26" y="212" fill="#38bdf8" font-size="8">completion_rate DOUBLE · unique_viewers BIGINT</text>
      <text x="26" y="232" fill="#64748b" font-size="7">4.2M rows · 18 GB on disk · Z-Order on (content_id, date)</text>
      <text x="26" y="246" fill="#64748b" font-size="7">Queried 840×/day · 94% Delta cache hit · P99 query = 1.2s</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="bold">USER SEGMENTS</text>
      <rect x="16" y="30" width="448" height="90" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Segmentation Logic (90-day window)</text>
      <text x="26" y="66" fill="#a855f7" font-size="8">@dlt.table(name="user_segments", schedule="0 2 * * *")</text>
      <text x="26" y="80" fill="#a855f7" font-size="8">def user_segments():</text>
      <text x="26" y="94" fill="#94a3b8" font-size="8">  sessions = dlt.read("silver_user_sessions")</text>
      <text x="26" y="108" fill="#94a3b8" font-size="7">    .filter(col("event_time") &gt; current_date() - expr("INTERVAL 90 DAYS"))</text>
      <rect x="16" y="132" width="448" height="94" rx="5" fill="#1e293b"/>
      <text x="240" y="150" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">12 Behavioral Segments</text>
      <text x="26" y="166" fill="#38bdf8" font-size="8">power_user    · binge_watcher · weekend_viewer</text>
      <text x="26" y="180" fill="#4ade80" font-size="8">genre_drama · genre_sports · genre_documentary · genre_comedy</text>
      <text x="26" y="194" fill="#fbbf24" font-size="8">at_risk_churn (30-day inactivity) · churned (90-day inactivity)</text>
      <text x="26" y="208" fill="#a855f7" font-size="8">new_user (&lt;7 days) · reactivated (return after churn) · casual</text>
      <text x="240" y="240" text-anchor="middle" fill="#64748b" font-size="7">180M users → 12 segments · refreshed 02:00 UTC daily · used by ML + Marketing</text>
      <rect x="16" y="252" width="448" height="26" rx="4" fill="#1e293b" stroke="#fbbf24" stroke-width="1"/>
      <text x="240" y="269" text-anchor="middle" fill="#fbbf24" font-size="8">at_risk_churn trigger → marketing email campaign within 2h of segment refresh</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="bold">SCD TYPE 2 — CONTENT METADATA</text>
      <rect x="16" y="30" width="448" height="90" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">APPLY CHANGES INTO with SCD Type 2</text>
      <text x="26" y="66" fill="#a855f7" font-size="8">dlt.apply_changes(</text>
      <text x="26" y="80" fill="#94a3b8" font-size="8">  target="gold_content_metadata_scd2",</text>
      <text x="26" y="94" fill="#94a3b8" font-size="8">  source="silver_content_updates",</text>
      <text x="26" y="108" fill="#94a3b8" font-size="8">  keys=["content_id"],</text>
      <text x="26" y="116" fill="#94a3b8" font-size="7">  sequence_by="update_ts",  stored_as_scd_type=2)</text>
      <rect x="16" y="132" width="448" height="82" rx="5" fill="#1e293b"/>
      <text x="240" y="150" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">SCD2 Schema (auto-added by DLT)</text>
      <text x="26" y="168" fill="#38bdf8" font-size="8">content_id  STRING   · title    STRING</text>
      <text x="26" y="182" fill="#38bdf8" font-size="8">genre       STRING   · runtime_min INT</text>
      <text x="26" y="196" fill="#4ade80" font-size="8">__START_AT  TIMESTAMP  (effective date — added by DLT)</text>
      <text x="26" y="210" fill="#4ade80" font-size="8">__END_AT    TIMESTAMP  (end date, NULL = current — added by DLT)</text>
      <rect x="16" y="224" width="448" height="44" rx="5" fill="#1e293b" stroke="#fbbf24" stroke-width="1"/>
      <text x="240" y="242" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">Why SCD2 Matters</text>
      <text x="26" y="258" fill="#94a3b8" font-size="8">content_id=xyz renamed "The Crown" → "The Crown: Season 6" on 2025-02-01</text>
      <text x="26" y="270" fill="#94a3b8" font-size="7">SCD2 preserves: users who watched before 2025-02-01 see old title in reports</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="bold">GOLD LAYER JOINS</text>
      <rect x="16" y="32" width="448" height="106" rx="5" fill="#1e293b"/>
      <text x="240" y="50" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Enrichment at Gold time</text>
      <text x="26" y="68" fill="#a855f7" font-size="8">@dlt.table(name="gold_content_perf")</text>
      <text x="26" y="82" fill="#a855f7" font-size="8">def gold_content_perf():</text>
      <text x="26" y="96" fill="#94a3b8" font-size="8">  kpis    = dlt.read("daily_content_kpis")</text>
      <text x="26" y="110" fill="#94a3b8" font-size="8">  content = spark.read.table("shared_governance.content.metadata")</text>
      <text x="26" y="124" fill="#94a3b8" font-size="8">  return kpis.join(content, "content_id") \</text>
      <text x="26" y="134" fill="#94a3b8" font-size="7">           .withColumn("watch_hrs", col("watch_ms")/3_600_000)</text>
      <rect x="16" y="150" width="448" height="78" rx="5" fill="#1e293b"/>
      <text x="240" y="168" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Dimension Sources</text>
      <text x="26" y="184" fill="#a855f7" font-size="8">shared_governance.content.metadata  → title, genre, runtime, license</text>
      <text x="26" y="198" fill="#a855f7" font-size="8">shared_governance.geo.region_codes  → country, timezone, GDPR flag</text>
      <text x="26" y="212" fill="#a855f7" font-size="8">shared_governance.campaigns.ads     → campaign_id, advertiser, budget</text>
      <text x="26" y="226" fill="#64748b" font-size="7">Dimensions live in shared_governance catalog · READ for all · versioned with Delta</text>
      <rect x="16" y="240" width="448" height="30" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
      <text x="240" y="260" text-anchor="middle" fill="#38bdf8" font-size="8">Join at Gold = Silver stays thin (no denormalization) · dimensions change independently</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="bold">GOLD LAYER METRICS</text>
      <rect x="16" y="30" width="448" height="108" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">12 Materialized Views Summary</text>
      <text x="26" y="66" fill="#4ade80" font-size="8">daily_content_kpis      4.2M rows  · 18 GB · 840 queries/day</text>
      <text x="26" y="80" fill="#4ade80" font-size="8">user_segments           180M rows  · 42 GB · 120 queries/day</text>
      <text x="26" y="94" fill="#4ade80" font-size="8">content_perf_enriched   4.2M rows  · 24 GB · 380 queries/day</text>
      <text x="26" y="108" fill="#4ade80" font-size="8">campaign_attribution     8.1M rows  · 7 GB  · 210 queries/day</text>
      <text x="26" y="122" fill="#64748b" font-size="7">+ 8 more: regional_kpis, hourly_trend, genre_perf, ab_experiment_results ...</text>
      <rect x="16" y="150" width="448" height="106" rx="5" fill="#1e293b"/>
      <text x="240" y="168" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Performance Profile</text>
      <text x="26" y="186" fill="#94a3b8" font-size="8">Recompute time:   8 min  (16-node Photon cluster)</text>
      <text x="26" y="200" fill="#94a3b8" font-size="8">Trigger interval: 1 hour (triggered mode)</text>
      <text x="26" y="214" fill="#94a3b8" font-size="8">Freshness SLA:    &lt;1h from Silver write</text>
      <text x="26" y="228" fill="#94a3b8" font-size="8">Query P99:        1.2s (Delta cache + Z-Order)</text>
      <text x="26" y="242" fill="#94a3b8" font-size="8">Cache hit rate:   94% (2-hour Databricks Delta cache)</text>
      <text x="240" y="268" text-anchor="middle" fill="#64748b" font-size="7">Cost: 3.2 DBU/day Gold recompute · $0.22/day · ROI vs manual ETL: 1,200%</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.sg-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.sg-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.sg-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="sg-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="sg-header module-header">
        <div class="module-tag" style="background:var(--delta)">DLT PIPELINES</div>
        <h2 class="module-title">Silver → Gold</h2>
        <p class="module-subtitle">Materialized Views · KPI aggregation · SCD Type 2 · enrichment joins</p>
      </div>
      <div class="sg-pills step-pills">${pills}</div>
      <div class="sg-diagram diagram-frame"></div>
      <div class="sg-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'sg-page page-enter';
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

    container.querySelectorAll('.sg-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['silver-gold'] = {
    id: 'silver-gold',
    title: 'Silver → Gold',
    group: 'DLT Pipelines',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
