(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'What is DLT',
      desc: 'Delta Live Tables is a declarative pipeline framework — you define what data should look like, DLT figures out how to compute it.',
      detail: 'With DLT you write table definitions, not orchestration code. No manually managing dependencies, retries, checkpoints, or schema validation. The DLT engine builds the DAG, handles failures, tracks data quality, and integrates with Unity Catalog automatically.',
    },
    {
      label: 'DLT Table Types',
      desc: 'Three object types: Streaming Table (stateful incremental), Materialized View (batch auto-refresh), View (ephemeral in-pipeline).',
      detail: 'Streaming Tables process new data incrementally — ideal for Bronze/Silver. Materialized Views recompute from scratch on each update — ideal for Gold aggregates. Views are intermediate steps that don\'t write storage — used for complex multi-step transformations within a pipeline.',
    },
    {
      label: 'Pipeline DAG',
      desc: 'DLT automatically infers the dependency graph from table references — no explicit wiring needed.',
      detail: 'When your Gold table calls dlt.read("silver_sessions"), DLT adds an edge Gold←Silver in the DAG. Run the pipeline — DLT executes in topological order. Add a new table mid-pipeline and DLT slots it in the right place automatically.',
    },
    {
      label: 'MediaStream Pipeline',
      desc: 'MediaStream\'s full DLT pipeline: Kafka → Bronze → Silver → Gold → ML Features, declared in 450 lines of Python.',
      detail: 'Before DLT: 12 separate Airflow DAGs, 3,400 lines of Spark boilerplate, 2-4h MTTR on failures. After DLT: one pipeline, 450 lines, MTTR under 20 minutes. DLT handles CDC, deduplication, schema evolution, and quarantine automatically.',
    },
    {
      label: 'Expectations',
      desc: 'CONSTRAINT clauses define data quality rules — DLT tracks pass/fail rates and can quarantine or drop bad rows.',
      detail: 'Three violation actions: warn (log metric, keep row), drop (metric + remove row), fail (halt pipeline). MediaStream uses warn on Bronze (can\'t lose raw data), drop on Silver (clean layer), fail on Gold (SLA breach if KPI is wrong).',
    },
    {
      label: 'Pipeline Modes',
      desc: 'DLT supports triggered (batch on-demand) and continuous (always-on streaming) execution modes.',
      detail: 'MediaStream Bronze/Silver: continuous mode (sub-minute latency, Structured Streaming). Gold/ML: triggered mode (every 1h, cost-efficient). Development: triggered mode with a subset of data. Production: continuous for latency-sensitive, triggered for batch-aggregated layers.',
    },
  ];

  const DIAGRAMS = [
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="22" text-anchor="middle" fill="#ff6b35" font-size="11" font-weight="bold">DELTA LIVE TABLES</text>
      <text x="240" y="36" text-anchor="middle" fill="#64748b" font-size="8">Declarative · Automatic orchestration · Built-in quality</text>
      <rect x="16" y="48" width="210" height="110" rx="5" fill="#1e293b" stroke="#ef4444" stroke-width="1.5"/>
      <text x="121" y="66" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="bold">Imperative (before DLT)</text>
      <text x="26" y="84" fill="#94a3b8" font-size="8">1. Read Kafka stream</text>
      <text x="26" y="98" fill="#94a3b8" font-size="8">2. Handle checkpoint manually</text>
      <text x="26" y="112" fill="#94a3b8" font-size="8">3. Catch & retry on failure</text>
      <text x="26" y="126" fill="#94a3b8" font-size="8">4. Validate schema yourself</text>
      <text x="26" y="140" fill="#94a3b8" font-size="8">5. Wire Airflow dependencies</text>
      <text x="26" y="154" fill="#ef4444" font-size="7">3,400 lines · 12 DAGs · 4h MTTR</text>
      <rect x="254" y="48" width="210" height="110" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="359" y="66" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">Declarative (DLT)</text>
      <text x="264" y="84" fill="#4ade80" font-size="8">@dlt.table</text>
      <text x="264" y="98" fill="#4ade80" font-size="8">def silver_sessions():</text>
      <text x="264" y="112" fill="#94a3b8" font-size="8">  return (dlt.read_stream("bronze")</text>
      <text x="264" y="126" fill="#94a3b8" font-size="8">    .dropDuplicates()</text>
      <text x="264" y="140" fill="#94a3b8" font-size="8">    .withColumn(...))</text>
      <text x="264" y="154" fill="#4ade80" font-size="7">450 lines · 1 pipeline · 20min MTTR</text>
      <text x="240" y="86" text-anchor="middle" fill="#a855f7" font-size="18">→</text>
      <rect x="16" y="170" width="448" height="88" rx="5" fill="#1e293b"/>
      <text x="240" y="188" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">What DLT Handles Automatically</text>
      <text x="26" y="204" fill="#4ade80" font-size="8">✓ DAG inference from table references</text>
      <text x="26" y="218" fill="#4ade80" font-size="8">✓ Incremental processing with checkpoints</text>
      <text x="240" y="204" fill="#4ade80" font-size="8">✓ Schema evolution + enforcement</text>
      <text x="240" y="218" fill="#4ade80" font-size="8">✓ Data quality metrics + quarantine</text>
      <text x="26" y="232" fill="#4ade80" font-size="8">✓ Retry + failure recovery</text>
      <text x="240" y="232" fill="#4ade80" font-size="8">✓ Unity Catalog integration</text>
      <text x="240" y="254" text-anchor="middle" fill="#64748b" font-size="7">MediaStream: 12 Airflow DAGs → 1 DLT pipeline · 450 lines vs 3,400</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#ff6b35" font-size="11" font-weight="bold">DLT TABLE TYPES</text>
      <rect x="16" y="32" width="140" height="130" rx="5" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="86" y="50" text-anchor="middle" fill="#ff6b35" font-size="9" font-weight="bold">STREAMING TABLE</text>
      <text x="86" y="68" text-anchor="middle" fill="#94a3b8" font-size="8">Stateful incremental</text>
      <text x="86" y="82" text-anchor="middle" fill="#94a3b8" font-size="8">Processes new rows only</text>
      <text x="86" y="96" text-anchor="middle" fill="#94a3b8" font-size="8">Checkpoint-backed</text>
      <text x="86" y="110" text-anchor="middle" fill="#64748b" font-size="7">CREATE OR REFRESH</text>
      <text x="86" y="124" text-anchor="middle" fill="#64748b" font-size="7">STREAMING TABLE</text>
      <text x="86" y="144" text-anchor="middle" fill="#ff6b35" font-size="7">Bronze · Silver</text>
      <rect x="170" y="32" width="140" height="130" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="240" y="50" text-anchor="middle" fill="#4ade80" font-size="8" font-weight="bold">MATERIALIZED VIEW</text>
      <text x="240" y="68" text-anchor="middle" fill="#94a3b8" font-size="8">Full recompute each run</text>
      <text x="240" y="82" text-anchor="middle" fill="#94a3b8" font-size="8">Always-correct aggregates</text>
      <text x="240" y="96" text-anchor="middle" fill="#94a3b8" font-size="8">No watermark needed</text>
      <text x="240" y="110" text-anchor="middle" fill="#64748b" font-size="7">CREATE OR REFRESH</text>
      <text x="240" y="124" text-anchor="middle" fill="#64748b" font-size="7">MATERIALIZED VIEW</text>
      <text x="240" y="144" text-anchor="middle" fill="#4ade80" font-size="7">Gold · Dashboards</text>
      <rect x="324" y="32" width="140" height="130" rx="5" fill="#1e293b" stroke="#a855f7" stroke-width="1.5"/>
      <text x="394" y="50" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">VIEW</text>
      <text x="394" y="68" text-anchor="middle" fill="#94a3b8" font-size="8">Ephemeral</text>
      <text x="394" y="82" text-anchor="middle" fill="#94a3b8" font-size="8">No storage written</text>
      <text x="394" y="96" text-anchor="middle" fill="#94a3b8" font-size="8">In-pipeline only</text>
      <text x="394" y="110" text-anchor="middle" fill="#64748b" font-size="7">@dlt.view</text>
      <text x="394" y="124" text-anchor="middle" fill="#64748b" font-size="7">or CREATE VIEW</text>
      <text x="394" y="144" text-anchor="middle" fill="#a855f7" font-size="7">Intermediate steps</text>
      <rect x="16" y="174" width="448" height="88" rx="5" fill="#1e293b"/>
      <text x="240" y="192" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">MediaStream DLT Object Count</text>
      <text x="60" y="212" fill="#ff6b35" font-size="8">Streaming Tables: 8</text>
      <text x="240" y="212" text-anchor="middle" fill="#4ade80" font-size="8">Materialized Views: 12</text>
      <text x="360" y="212" fill="#a855f7" font-size="8">Views: 6</text>
      <text x="26" y="232" fill="#94a3b8" font-size="8">Bronze (4 ST) · Silver (4 ST) · Gold (12 MV) · ML Features (6 V)</text>
      <text x="240" y="254" text-anchor="middle" fill="#64748b" font-size="7">Streaming Tables write incrementally; Materialized Views recompute on trigger</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#ff6b35" font-size="11" font-weight="bold">PIPELINE DAG — AUTO-INFERRED</text>
      <rect x="16" y="36" width="80" height="34" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="56" y="57" text-anchor="middle" fill="#38bdf8" font-size="8" font-weight="bold">Kafka</text>
      <line x1="96" y1="53" x2="116" y2="53" stroke="#475569" stroke-width="1.5" marker-end="url(#dt-arr)"/>
      <rect x="116" y="36" width="80" height="34" rx="4" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="156" y="50" text-anchor="middle" fill="#ff6b35" font-size="8" font-weight="bold">bronze_</text>
      <text x="156" y="63" text-anchor="middle" fill="#ff6b35" font-size="8" font-weight="bold">clickstream</text>
      <line x1="196" y1="53" x2="216" y2="53" stroke="#475569" stroke-width="1.5" marker-end="url(#dt-arr)"/>
      <rect x="216" y="36" width="80" height="34" rx="4" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5"/>
      <text x="256" y="50" text-anchor="middle" fill="#fbbf24" font-size="8" font-weight="bold">silver_</text>
      <text x="256" y="63" text-anchor="middle" fill="#fbbf24" font-size="8" font-weight="bold">sessions</text>
      <line x1="296" y1="53" x2="316" y2="36" stroke="#475569" stroke-width="1" marker-end="url(#dt-arr)"/>
      <line x1="296" y1="53" x2="316" y2="70" stroke="#475569" stroke-width="1" marker-end="url(#dt-arr)"/>
      <rect x="316" y="22" width="80" height="28" rx="4" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="356" y="40" text-anchor="middle" fill="#4ade80" font-size="8" font-weight="bold">gold_kpis</text>
      <rect x="316" y="58" width="80" height="28" rx="4" fill="#1e293b" stroke="#a855f7" stroke-width="1.5"/>
      <text x="356" y="76" text-anchor="middle" fill="#a855f7" font-size="8" font-weight="bold">ml_features</text>
      <line x1="396" y1="36" x2="420" y2="53" stroke="#475569" stroke-width="1" marker-end="url(#dt-arr)"/>
      <line x1="396" y1="72" x2="420" y2="53" stroke="#475569" stroke-width="1" marker-end="url(#dt-arr)"/>
      <rect x="420" y="42" width="44" height="22" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
      <text x="442" y="57" text-anchor="middle" fill="#38bdf8" font-size="7" font-weight="bold">serving</text>
      <rect x="16" y="90" width="448" height="60" rx="5" fill="#1e293b"/>
      <text x="240" y="108" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">DAG Inference — No Explicit Wiring</text>
      <text x="26" y="124" fill="#94a3b8" font-size="8">@dlt.table</text>
      <text x="26" y="138" fill="#a855f7" font-size="8">def gold_kpis(): return dlt.read("silver_sessions").groupBy(...)</text>
      <text x="240" y="124" fill="#64748b" font-size="7">dlt.read("silver_sessions") →</text>
      <text x="240" y="138" fill="#4ade80" font-size="7">DLT adds edge gold_kpis ← silver_sessions</text>
      <rect x="16" y="162" width="448" height="86" rx="5" fill="#1e293b"/>
      <text x="240" y="180" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">DLT Execution Order</text>
      <text x="26" y="196" fill="#94a3b8" font-size="8">1. Parse all @dlt.table / CREATE TABLE definitions</text>
      <text x="26" y="210" fill="#94a3b8" font-size="8">2. Build dependency graph from dlt.read() and dlt.read_stream() calls</text>
      <text x="26" y="224" fill="#94a3b8" font-size="8">3. Topological sort → determine execution order</text>
      <text x="26" y="238" fill="#94a3b8" font-size="8">4. Execute each node; parallelize independent branches automatically</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#ff6b35" font-size="11" font-weight="bold">MEDIASTREAM DLT PIPELINE</text>
      <rect x="16" y="32" width="60" height="48" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="46" y="50" text-anchor="middle" fill="#38bdf8" font-size="7" font-weight="bold">Kafka</text>
      <text x="46" y="64" text-anchor="middle" fill="#64748b" font-size="6">2.4B/day</text>
      <text x="46" y="76" text-anchor="middle" fill="#64748b" font-size="6">12 topics</text>
      <line x1="76" y1="56" x2="96" y2="56" stroke="#475569" stroke-width="1.5"/>
      <polygon points="94,52 102,56 94,60" fill="#475569"/>
      <rect x="102" y="32" width="72" height="48" rx="4" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="138" y="50" text-anchor="middle" fill="#ff6b35" font-size="7" font-weight="bold">Bronze</text>
      <text x="138" y="63" text-anchor="middle" fill="#64748b" font-size="6">ST × 4</text>
      <text x="138" y="75" text-anchor="middle" fill="#64748b" font-size="6">raw+meta</text>
      <line x1="174" y1="56" x2="194" y2="56" stroke="#475569" stroke-width="1.5"/>
      <polygon points="192,52 200,56 192,60" fill="#475569"/>
      <rect x="200" y="32" width="72" height="48" rx="4" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5"/>
      <text x="236" y="50" text-anchor="middle" fill="#fbbf24" font-size="7" font-weight="bold">Silver</text>
      <text x="236" y="63" text-anchor="middle" fill="#64748b" font-size="6">ST × 4</text>
      <text x="236" y="75" text-anchor="middle" fill="#64748b" font-size="6">dedup+join</text>
      <line x1="272" y1="56" x2="292" y2="56" stroke="#475569" stroke-width="1.5"/>
      <polygon points="290,52 298,56 290,60" fill="#475569"/>
      <rect x="298" y="32" width="72" height="48" rx="4" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="334" y="50" text-anchor="middle" fill="#4ade80" font-size="7" font-weight="bold">Gold</text>
      <text x="334" y="63" text-anchor="middle" fill="#64748b" font-size="6">MV × 12</text>
      <text x="334" y="75" text-anchor="middle" fill="#64748b" font-size="6">agg+KPIs</text>
      <line x1="370" y1="42" x2="390" y2="42" stroke="#475569" stroke-width="1"/>
      <polygon points="388,38 396,42 388,46" fill="#475569"/>
      <line x1="370" y1="70" x2="390" y2="70" stroke="#a855f7" stroke-width="1"/>
      <polygon points="388,66 396,70 388,74" fill="#a855f7"/>
      <rect x="396" y="28" width="68" height="28" rx="4" fill="#1e293b" stroke="#4ade80" stroke-width="1"/>
      <text x="430" y="46" text-anchor="middle" fill="#4ade80" font-size="7">BI / Looker</text>
      <rect x="396" y="62" width="68" height="28" rx="4" fill="#1e293b" stroke="#a855f7" stroke-width="1"/>
      <text x="430" y="80" text-anchor="middle" fill="#a855f7" font-size="7">ML Features</text>
      <rect x="16" y="96" width="448" height="78" rx="5" fill="#1e293b"/>
      <text x="240" y="114" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Before vs After DLT</text>
      <text x="120" y="132" text-anchor="middle" fill="#ef4444" font-size="8">Before DLT</text>
      <text x="360" y="132" text-anchor="middle" fill="#4ade80" font-size="8">After DLT</text>
      <text x="26" y="148" fill="#94a3b8" font-size="8">Airflow DAGs:     12</text>
      <text x="260" y="148" fill="#4ade80" font-size="8">DLT pipelines:    1</text>
      <text x="26" y="162" fill="#94a3b8" font-size="8">Lines of code: 3,400</text>
      <text x="260" y="162" fill="#4ade80" font-size="8">Lines of code:  450</text>
      <rect x="16" y="184" width="448" height="72" rx="5" fill="#1e293b"/>
      <text x="240" y="202" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Pipeline Metrics (Continuous Mode)</text>
      <text x="26" y="218" fill="#94a3b8" font-size="8">Bronze lag: &lt;30s from Kafka offset commit</text>
      <text x="26" y="232" fill="#94a3b8" font-size="8">Silver lag: &lt;90s end-to-end from event time</text>
      <text x="26" y="246" fill="#94a3b8" font-size="8">Gold freshness: 1h (triggered mode, cost-efficient)</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#ff6b35" font-size="11" font-weight="bold">DLT EXPECTATIONS (DATA QUALITY)</text>
      <rect x="16" y="30" width="448" height="100" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Three Violation Actions</text>
      <rect x="26" y="54" width="128" height="58" rx="4" fill="#fbbf24" opacity="0.1" stroke="#fbbf24" stroke-width="1"/>
      <text x="90" y="72" text-anchor="middle" fill="#fbbf24" font-size="8" font-weight="bold">WARN</text>
      <text x="90" y="86" text-anchor="middle" fill="#94a3b8" font-size="7">Log metric only</text>
      <text x="90" y="100" text-anchor="middle" fill="#94a3b8" font-size="7">Row kept</text>
      <rect x="176" y="54" width="128" height="58" rx="4" fill="#ff6b35" opacity="0.1" stroke="#ff6b35" stroke-width="1"/>
      <text x="240" y="72" text-anchor="middle" fill="#ff6b35" font-size="8" font-weight="bold">DROP</text>
      <text x="240" y="86" text-anchor="middle" fill="#94a3b8" font-size="7">Metric + quarantine</text>
      <text x="240" y="100" text-anchor="middle" fill="#94a3b8" font-size="7">Row removed</text>
      <rect x="326" y="54" width="128" height="58" rx="4" fill="#ef4444" opacity="0.1" stroke="#ef4444" stroke-width="1"/>
      <text x="390" y="72" text-anchor="middle" fill="#ef4444" font-size="8" font-weight="bold">FAIL</text>
      <text x="390" y="86" text-anchor="middle" fill="#94a3b8" font-size="7">Halt pipeline</text>
      <text x="390" y="100" text-anchor="middle" fill="#94a3b8" font-size="7">Alert on-call</text>
      <rect x="16" y="140" width="448" height="100" rx="5" fill="#1e293b"/>
      <text x="240" y="158" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">MediaStream Expectations</text>
      <text x="26" y="174" fill="#64748b" font-size="8">-- Bronze: warn (can't lose raw events)</text>
      <text x="26" y="188" fill="#fbbf24" font-size="8">CONSTRAINT valid_event EXPECT (event_id IS NOT NULL) ON VIOLATION WARN</text>
      <text x="26" y="204" fill="#64748b" font-size="8">-- Silver: drop (clean layer enforced)</text>
      <text x="26" y="218" fill="#ff6b35" font-size="8">CONSTRAINT valid_session EXPECT (session_duration_ms &gt; 0) ON VIOLATION DROP ROW</text>
      <text x="26" y="232" fill="#64748b" font-size="8">-- Gold: fail (bad KPI = SLA breach)</text>
      <rect x="16" y="250" width="448" height="30" rx="4" fill="#1e293b" stroke="#4ade80" stroke-width="1"/>
      <text x="240" y="270" text-anchor="middle" fill="#4ade80" font-size="8">Pass rate visible in DLT pipeline UI · system.access.audit · Grafana alert &lt;98%</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#ff6b35" font-size="11" font-weight="bold">PIPELINE EXECUTION MODES</text>
      <rect x="16" y="32" width="210" height="120" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="121" y="50" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="bold">CONTINUOUS</text>
      <text x="121" y="68" text-anchor="middle" fill="#94a3b8" font-size="8">Always-on cluster</text>
      <text x="121" y="82" text-anchor="middle" fill="#94a3b8" font-size="8">Sub-second micro-batch</text>
      <text x="121" y="96" text-anchor="middle" fill="#94a3b8" font-size="8">Structured Streaming</text>
      <text x="121" y="110" text-anchor="middle" fill="#64748b" font-size="7">Higher cost · lower latency</text>
      <text x="121" y="128" text-anchor="middle" fill="#38bdf8" font-size="7">Bronze + Silver</text>
      <text x="121" y="144" text-anchor="middle" fill="#64748b" font-size="7">&lt;90s end-to-end lag</text>
      <rect x="254" y="32" width="210" height="120" rx="5" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5"/>
      <text x="359" y="50" text-anchor="middle" fill="#fbbf24" font-size="10" font-weight="bold">TRIGGERED</text>
      <text x="359" y="68" text-anchor="middle" fill="#94a3b8" font-size="8">Runs once per invocation</text>
      <text x="359" y="82" text-anchor="middle" fill="#94a3b8" font-size="8">Processes all pending data</text>
      <text x="359" y="96" text-anchor="middle" fill="#94a3b8" font-size="8">Cluster starts + stops</text>
      <text x="359" y="110" text-anchor="middle" fill="#64748b" font-size="7">Lower cost · higher latency</text>
      <text x="359" y="128" text-anchor="middle" fill="#fbbf24" font-size="7">Gold + ML Features</text>
      <text x="359" y="144" text-anchor="middle" fill="#64748b" font-size="7">Every 1h · cost-efficient</text>
      <rect x="16" y="162" width="448" height="96" rx="5" fill="#1e293b"/>
      <text x="240" y="180" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">MediaStream Pipeline Schedule</text>
      <text x="26" y="198" fill="#38bdf8" font-size="8">Bronze ← Kafka:      Continuous  (30s lag target)</text>
      <text x="26" y="212" fill="#38bdf8" font-size="8">Silver ← Bronze:     Continuous  (90s lag target)</text>
      <text x="26" y="226" fill="#fbbf24" font-size="8">Gold ← Silver:       Triggered   (every 60 min)</text>
      <text x="26" y="240" fill="#fbbf24" font-size="8">ML Features ← Gold:  Triggered   (every 4h)</text>
      <text x="26" y="254" fill="#64748b" font-size="7">Development mode: triggered + 1% sample · 10× faster iteration</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.dt-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.dt-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.dt-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="dt-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="dt-header module-header">
        <div class="module-tag" style="background:var(--delta)">DLT PIPELINES</div>
        <h2 class="module-title">DLT Architecture</h2>
        <p class="module-subtitle">Declarative pipelines · Auto-DAG · Built-in quality · MediaStream 450-line pipeline</p>
      </div>
      <div class="dt-pills step-pills">${pills}</div>
      <div class="dt-diagram diagram-frame"></div>
      <div class="dt-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'dt-page page-enter';
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

    container.querySelectorAll('.dt-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['dlt-architecture'] = {
    id: 'dlt-architecture',
    title: 'DLT Architecture',
    group: 'DLT Pipelines',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
