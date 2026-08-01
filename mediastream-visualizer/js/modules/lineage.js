(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'What is Lineage',
      desc: 'Lineage tracks data origin, transformation, and consumption — automatically, without instrumentation.',
      detail: 'Unity Catalog captures lineage at the table and column level for every Spark and SQL operation. No code changes, no ETL annotations — UC intercepts query plans and records the data flow graph.',
    },
    {
      label: 'Automatic Capture',
      desc: 'UC captures lineage at query time — table reads, writes, and column-level transformations are all recorded.',
      detail: 'Every INSERT INTO, CREATE TABLE AS SELECT, MERGE INTO, and streaming write is captured. Lineage is queryable via system.access.table_lineage and system.access.column_lineage. Retention: 1 year.',
    },
    {
      label: 'Column-Level Lineage',
      desc: 'Column lineage tracks exactly which source columns contribute to each target column.',
      detail: 'When a Gold table column `watch_ms` is derived from Silver `session_duration_ms * 1000`, UC records that exact transformation path. Critical for GDPR — find every column derived from a PII source.',
    },
    {
      label: 'MediaStream Lineage Graph',
      desc: 'MediaStream data flows: Kafka → Bronze → Silver → Gold → ML Features → Recommendation Model.',
      detail: 'Full lineage across 6 hops. The recommendation model at the end traces back to raw Kafka clickstream. When a Kafka schema change breaks Bronze, lineage shows every downstream table affected.',
    },
    {
      label: 'Impact Analysis',
      desc: 'Before changing a table, query lineage to find every downstream consumer.',
      detail: 'Changing `prod.silver.user_sessions.session_id` type? Query system.access.column_lineage to find all Gold tables, ML features, dashboards that depend on it. Prevents silent downstream breakage.',
    },
    {
      label: 'GDPR Propagation',
      desc: 'Lineage enables automated GDPR propagation — find every table touched by user PII.',
      detail: 'DELETE user_id=X from Bronze. Lineage shows Silver (session joined), Gold (aggregated), ML features (embedded). MediaStream\'s GDPR pipeline uses lineage to auto-generate the deletion job list — no manual tracking.',
    },
    {
      label: 'Cross-Workspace Lineage',
      desc: 'Lineage spans workspace boundaries — the data-science workspace sees Gold tables it reads from prod.',
      detail: 'A model trained in data-science workspace reading prod.gold.user_segments has lineage visible in the metastore. One lineage graph, all workspaces — essential for multi-team governance.',
    },
  ];

  const DIAGRAMS = [
    // Step 0: What is lineage
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="22" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">DATA LINEAGE</text>
      <text x="240" y="36" text-anchor="middle" fill="#64748b" font-size="8">Automatic · No instrumentation · Table + Column level</text>
      <!-- Source node -->
      <rect x="16" y="54" width="90" height="38" rx="5" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="61" y="70" text-anchor="middle" fill="#ff6b35" font-size="8" font-weight="bold">Kafka Topic</text>
      <text x="61" y="84" text-anchor="middle" fill="#94a3b8" font-size="7">clickstream</text>
      <!-- Arrow -->
      <line x1="106" y1="73" x2="130" y2="73" stroke="#475569" stroke-width="1.5" marker-end="url(#lg-arr)"/>
      <text x="118" y="67" text-anchor="middle" fill="#64748b" font-size="7">stream</text>
      <!-- Bronze -->
      <rect x="130" y="54" width="90" height="38" rx="5" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="175" y="70" text-anchor="middle" fill="#ff6b35" font-size="8" font-weight="bold">bronze</text>
      <text x="175" y="84" text-anchor="middle" fill="#94a3b8" font-size="7">clickstream_raw</text>
      <!-- Arrow -->
      <line x1="220" y1="73" x2="244" y2="73" stroke="#475569" stroke-width="1.5" marker-end="url(#lg-arr)"/>
      <text x="232" y="67" text-anchor="middle" fill="#64748b" font-size="7">dbt</text>
      <!-- Silver -->
      <rect x="244" y="54" width="90" height="38" rx="5" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5"/>
      <text x="289" y="70" text-anchor="middle" fill="#fbbf24" font-size="8" font-weight="bold">silver</text>
      <text x="289" y="84" text-anchor="middle" fill="#94a3b8" font-size="7">user_sessions</text>
      <!-- Arrow -->
      <line x1="334" y1="73" x2="358" y2="73" stroke="#475569" stroke-width="1.5" marker-end="url(#lg-arr)"/>
      <text x="346" y="67" text-anchor="middle" fill="#64748b" font-size="7">dbt</text>
      <!-- Gold -->
      <rect x="358" y="54" width="90" height="38" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="403" y="70" text-anchor="middle" fill="#4ade80" font-size="8" font-weight="bold">gold</text>
      <text x="403" y="84" text-anchor="middle" fill="#94a3b8" font-size="7">daily_kpis</text>
      <!-- What UC captures -->
      <rect x="16" y="108" width="448" height="86" rx="5" fill="#1e293b"/>
      <text x="240" y="124" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">What UC Captures Automatically</text>
      <text x="26" y="142" fill="#4ade80" font-size="8">✓ Table reads — which query, which user, which workspace</text>
      <text x="26" y="156" fill="#4ade80" font-size="8">✓ Table writes — INSERT INTO, MERGE, streaming writeStream</text>
      <text x="26" y="170" fill="#4ade80" font-size="8">✓ Column-level — which source columns map to which target columns</text>
      <text x="26" y="184" fill="#4ade80" font-size="8">✓ Cross-workspace — lineage spans workspace boundaries</text>
      <!-- Query source -->
      <rect x="16" y="206" width="448" height="30" rx="5" fill="#1e293b"/>
      <text x="240" y="220" text-anchor="middle" fill="#94a3b8" font-size="8">Queryable: SELECT * FROM system.access.table_lineage WHERE target_table_full_name LIKE 'prod.gold.%'</text>
      <text x="240" y="270" text-anchor="middle" fill="#64748b" font-size="7">Zero instrumentation · UC intercepts query plans · 1-year retention</text>
    </svg>`,

    // Step 1: Automatic capture
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">AUTOMATIC LINEAGE CAPTURE</text>
      <!-- Query plan intercept -->
      <rect x="16" y="32" width="200" height="64" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="116" y="50" text-anchor="middle" fill="#38bdf8" font-size="9" font-weight="bold">Your SQL / Spark Job</text>
      <text x="116" y="66" text-anchor="middle" fill="#94a3b8" font-size="8">INSERT INTO prod.gold.daily_kpis</text>
      <text x="116" y="80" text-anchor="middle" fill="#94a3b8" font-size="8">SELECT ... FROM prod.silver.sessions</text>
      <!-- Arrow down -->
      <line x1="116" y1="96" x2="116" y2="116" stroke="#a855f7" stroke-width="1.5"/>
      <polygon points="110,116 122,116 116,124" fill="#a855f7"/>
      <!-- UC intercept box -->
      <rect x="16" y="124" width="200" height="46" rx="5" fill="#a855f7" opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <text x="116" y="142" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">UC Intercepts Query Plan</text>
      <text x="116" y="158" text-anchor="middle" fill="#94a3b8" font-size="8">extracts source → target mappings</text>
      <!-- Arrow right -->
      <line x1="216" y1="147" x2="240" y2="147" stroke="#a855f7" stroke-width="1.5"/>
      <polygon points="240,141 252,147 240,153" fill="#a855f7"/>
      <!-- system tables -->
      <rect x="252" y="108" width="210" height="78" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="357" y="126" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">system.access.*</text>
      <text x="357" y="142" text-anchor="middle" fill="#94a3b8" font-size="8">table_lineage</text>
      <text x="357" y="156" text-anchor="middle" fill="#94a3b8" font-size="8">column_lineage</text>
      <text x="357" y="170" text-anchor="middle" fill="#64748b" font-size="7">Retention: 365 days</text>
      <!-- Operations captured -->
      <rect x="16" y="184" width="448" height="70" rx="5" fill="#1e293b"/>
      <text x="240" y="200" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Operations Captured</text>
      <text x="26" y="216" fill="#4ade80" font-size="8">INSERT INTO  ·  CREATE TABLE AS SELECT (CTAS)</text>
      <text x="26" y="230" fill="#4ade80" font-size="8">MERGE INTO   ·  CREATE VIEW AS</text>
      <text x="26" y="244" fill="#4ade80" font-size="8">Structured Streaming writeStream  ·  dbt model runs</text>
      <text x="240" y="270" text-anchor="middle" fill="#64748b" font-size="7">SELECT-only reads also captured — who queried which table, when</text>
    </svg>`,

    // Step 2: Column-level lineage
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">COLUMN-LEVEL LINEAGE</text>
      <!-- Source columns (Silver) -->
      <rect x="16" y="32" width="170" height="134" rx="5" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5"/>
      <text x="101" y="50" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">prod.silver.user_sessions</text>
      <rect x="26" y="56" width="150" height="14" rx="2" fill="#0f172a"/>
      <text x="101" y="67" text-anchor="middle" fill="#94a3b8" font-size="8">session_id</text>
      <rect x="26" y="74" width="150" height="14" rx="2" fill="#0f172a"/>
      <text x="101" y="85" text-anchor="middle" fill="#94a3b8" font-size="8">user_id  ← PII</text>
      <rect x="26" y="92" width="150" height="14" rx="2" fill="#ef4444" opacity="0.2"/>
      <text x="101" y="103" text-anchor="middle" fill="#ef4444" font-size="8">session_duration_ms</text>
      <rect x="26" y="110" width="150" height="14" rx="2" fill="#0f172a"/>
      <text x="101" y="121" text-anchor="middle" fill="#94a3b8" font-size="8">content_id</text>
      <rect x="26" y="128" width="150" height="14" rx="2" fill="#0f172a"/>
      <text x="101" y="139" text-anchor="middle" fill="#94a3b8" font-size="8">region</text>
      <rect x="26" y="146" width="150" height="14" rx="2" fill="#0f172a"/>
      <text x="101" y="157" text-anchor="middle" fill="#94a3b8" font-size="8">event_date</text>

      <!-- Arrows between -->
      <line x1="186" y1="103" x2="208" y2="80" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,2"/>
      <line x1="186" y1="85" x2="208" y2="98" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,2"/>
      <line x1="186" y1="121" x2="208" y2="116" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,2"/>
      <line x1="186" y1="139" x2="208" y2="134" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,2"/>

      <!-- Target columns (Gold) -->
      <rect x="208" y="32" width="170" height="116" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="293" y="50" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">prod.gold.daily_kpis</text>
      <rect x="218" y="56" width="150" height="14" rx="2" fill="#ef4444" opacity="0.2"/>
      <text x="293" y="67" text-anchor="middle" fill="#ef4444" font-size="8">watch_ms  ← PII-derived</text>
      <rect x="218" y="74" width="150" height="14" rx="2" fill="#0f172a"/>
      <text x="293" y="85" text-anchor="middle" fill="#94a3b8" font-size="8">unique_viewers</text>
      <rect x="218" y="92" width="150" height="14" rx="2" fill="#0f172a"/>
      <text x="293" y="103" text-anchor="middle" fill="#94a3b8" font-size="8">content_id</text>
      <rect x="218" y="110" width="150" height="14" rx="2" fill="#0f172a"/>
      <text x="293" y="121" text-anchor="middle" fill="#94a3b8" font-size="8">date</text>
      <rect x="218" y="128" width="150" height="14" rx="2" fill="#0f172a"/>
      <text x="293" y="139" text-anchor="middle" fill="#94a3b8" font-size="8">region</text>

      <!-- Transformation note -->
      <rect x="386" y="54" width="88" height="38" rx="4" fill="#ef4444" opacity="0.1" stroke="#ef4444" stroke-width="1"/>
      <text x="430" y="68" text-anchor="middle" fill="#ef4444" font-size="7">watch_ms =</text>
      <text x="430" y="80" text-anchor="middle" fill="#ef4444" font-size="7">duration_ms*1</text>

      <!-- GDPR query -->
      <rect x="16" y="178" width="448" height="68" rx="5" fill="#1e293b"/>
      <text x="240" y="194" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">GDPR: find every column derived from user_id</text>
      <text x="26" y="210" fill="#94a3b8" font-size="8">SELECT target_table, target_column_name, transformation_type</text>
      <text x="26" y="224" fill="#94a3b8" font-size="8">FROM system.access.column_lineage</text>
      <text x="26" y="238" fill="#94a3b8" font-size="8">WHERE source_column_name = 'user_id' AND source_table LIKE 'prod.%';</text>
      <text x="240" y="264" text-anchor="middle" fill="#ef4444" font-size="8">Result: 23 columns across 8 tables derived from user_id — all need GDPR deletion</text>
    </svg>`,

    // Step 3: MediaStream lineage graph
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="18" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">MEDIASTREAM LINEAGE GRAPH</text>
      <!-- Nodes -->
      <rect x="16" y="30" width="68" height="38" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="50" y="48" text-anchor="middle" fill="#38bdf8" font-size="8" font-weight="bold">Kafka</text>
      <text x="50" y="62" text-anchor="middle" fill="#64748b" font-size="7">clickstream</text>

      <line x1="84" y1="49" x2="100" y2="49" stroke="#475569" stroke-width="1.5"/>
      <polygon points="100,45 110,49 100,53" fill="#475569"/>

      <rect x="110" y="30" width="68" height="38" rx="4" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="144" y="48" text-anchor="middle" fill="#ff6b35" font-size="8" font-weight="bold">Bronze</text>
      <text x="144" y="62" text-anchor="middle" fill="#64748b" font-size="7">raw events</text>

      <line x1="178" y1="49" x2="194" y2="49" stroke="#475569" stroke-width="1.5"/>
      <polygon points="194,45 204,49 194,53" fill="#475569"/>

      <rect x="204" y="30" width="68" height="38" rx="4" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5"/>
      <text x="238" y="48" text-anchor="middle" fill="#fbbf24" font-size="8" font-weight="bold">Silver</text>
      <text x="238" y="62" text-anchor="middle" fill="#64748b" font-size="7">sessions</text>

      <line x1="272" y1="49" x2="288" y2="49" stroke="#475569" stroke-width="1.5"/>
      <polygon points="288,45 298,49 288,53" fill="#475569"/>

      <rect x="298" y="30" width="68" height="38" rx="4" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="332" y="48" text-anchor="middle" fill="#4ade80" font-size="8" font-weight="bold">Gold</text>
      <text x="332" y="62" text-anchor="middle" fill="#64748b" font-size="7">daily_kpis</text>

      <!-- Gold fans to two consumers -->
      <line x1="366" y1="42" x2="390" y2="30" stroke="#475569" stroke-width="1.5"/>
      <polygon points="386,24 396,30 390,36" fill="#475569"/>
      <line x1="366" y1="55" x2="390" y2="68" stroke="#475569" stroke-width="1.5"/>
      <polygon points="386,62 396,68 390,74" fill="#475569"/>

      <rect x="396" y="16" width="68" height="30" rx="4" fill="#1e293b" stroke="#a855f7" stroke-width="1.5"/>
      <text x="430" y="32" text-anchor="middle" fill="#a855f7" font-size="8" font-weight="bold">ML Features</text>
      <text x="430" y="44" text-anchor="middle" fill="#64748b" font-size="7">user_embed</text>

      <rect x="396" y="54" width="68" height="30" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="430" y="68" text-anchor="middle" fill="#38bdf8" font-size="8" font-weight="bold">Dashboard</text>
      <text x="430" y="80" text-anchor="middle" fill="#64748b" font-size="7">Looker</text>

      <!-- ML features to rec model -->
      <line x1="430" y1="46" x2="430" y2="100" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="3,2"/>
      <polygon points="426,100 434,100 430,108" fill="#a855f7"/>
      <rect x="396" y="108" width="68" height="30" rx="4" fill="#a855f7" opacity="0.2" stroke="#a855f7" stroke-width="1.5"/>
      <text x="430" y="124" text-anchor="middle" fill="#a855f7" font-size="7" font-weight="bold">Rec Model v7</text>
      <text x="430" y="136" text-anchor="middle" fill="#64748b" font-size="6">serving</text>

      <!-- Impact example -->
      <rect x="16" y="156" width="448" height="96" rx="5" fill="#1e293b" stroke="#ef4444" stroke-width="1"/>
      <text x="240" y="172" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="bold">Kafka Schema Change — Lineage Shows Impact</text>
      <text x="26" y="190" fill="#94a3b8" font-size="8">Bronze: clickstream_raw (direct write) → AFFECTED</text>
      <text x="26" y="204" fill="#94a3b8" font-size="8">Silver: user_sessions (reads Bronze) → AFFECTED</text>
      <text x="26" y="218" fill="#94a3b8" font-size="8">Gold: daily_kpis (reads Silver) → AFFECTED</text>
      <text x="26" y="232" fill="#94a3b8" font-size="8">ML Features: user_embed → AFFECTED · Rec Model → AFFECTED</text>
      <text x="26" y="246" fill="#94a3b8" font-size="8">Dashboard: Looker → AFFECTED</text>
      <text x="240" y="268" text-anchor="middle" fill="#fbbf24" font-size="8">Lineage surfaces all 6 hops — no manual dependency tracking</text>
    </svg>`,

    // Step 4: Impact analysis
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">IMPACT ANALYSIS</text>
      <text x="240" y="34" text-anchor="middle" fill="#64748b" font-size="8">Before changing a table — know every downstream consumer</text>
      <!-- Scenario -->
      <rect x="16" y="44" width="448" height="30" rx="4" fill="#ef4444" opacity="0.15" stroke="#ef4444" stroke-width="1"/>
      <text x="240" y="58" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="bold">CHANGE: prod.silver.user_sessions.session_id  STRING → UUID</text>
      <text x="240" y="72" text-anchor="middle" fill="#ef4444" font-size="8">Who does this break?</text>
      <!-- Query -->
      <rect x="16" y="84" width="448" height="56" rx="4" fill="#1e293b"/>
      <text x="26" y="100" fill="#a855f7" font-size="8">SELECT target_table_full_name, target_column_name,</text>
      <text x="26" y="114" fill="#94a3b8" font-size="8">       last_event_ts, entity_type</text>
      <text x="26" y="128" fill="#94a3b8" font-size="8">FROM system.access.column_lineage</text>
      <text x="26" y="142" fill="#94a3b8" font-size="8">WHERE source_table='prod.silver.user_sessions' AND source_column_name='session_id'</text>
      <!-- Results -->
      <rect x="16" y="150" width="448" height="102" rx="4" fill="#1e293b"/>
      <text x="240" y="166" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Downstream Consumers Found</text>
      <text x="26" y="182" fill="#4ade80" font-size="8">prod.gold.daily_kpis.session_key</text>
      <text x="280" y="182" fill="#64748b" font-size="8">GROUP BY clause</text>
      <text x="26" y="196" fill="#4ade80" font-size="8">prod.gold.user_retention.cohort_session_id</text>
      <text x="280" y="196" fill="#64748b" font-size="8">JOIN key</text>
      <text x="26" y="210" fill="#4ade80" font-size="8">prod.ml_features.user_embeddings.context_id</text>
      <text x="280" y="210" fill="#64748b" font-size="8">feature concatenation</text>
      <text x="26" y="224" fill="#4ade80" font-size="8">prod.serving.rec_model_v7.session_ctx</text>
      <text x="280" y="224" fill="#64748b" font-size="8">model input</text>
      <text x="26" y="238" fill="#4ade80" font-size="8">prod.gold.gdpr_audit.source_session</text>
      <text x="280" y="238" fill="#64748b" font-size="8">compliance join</text>
      <!-- Bottom note -->
      <rect x="16" y="262" width="448" height="22" rx="4" fill="#1e293b" stroke="#fbbf24" stroke-width="1"/>
      <text x="240" y="277" text-anchor="middle" fill="#fbbf24" font-size="8">5 downstream columns found in 4 seconds — safe to plan migration · no surprises</text>
    </svg>`,

    // Step 5: GDPR propagation
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">GDPR LINEAGE PROPAGATION</text>
      <!-- Request comes in -->
      <rect x="16" y="32" width="180" height="38" rx="5" fill="#ef4444" opacity="0.15" stroke="#ef4444" stroke-width="1.5"/>
      <text x="106" y="50" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="bold">GDPR Delete Request</text>
      <text x="106" y="64" text-anchor="middle" fill="#ef4444" font-size="8">user_id = 'usr_7f3k9'</text>
      <!-- Arrow -->
      <line x1="196" y1="51" x2="226" y2="51" stroke="#ef4444" stroke-width="1.5"/>
      <polygon points="226,47 236,51 226,55" fill="#ef4444"/>
      <!-- Lineage query -->
      <rect x="236" y="32" width="228" height="38" rx="5" fill="#1e293b" stroke="#a855f7" stroke-width="1.5"/>
      <text x="350" y="50" text-anchor="middle" fill="#a855f7" font-size="8" font-weight="bold">Lineage: find all tables</text>
      <text x="350" y="64" text-anchor="middle" fill="#94a3b8" font-size="7">system.access.column_lineage WHERE source=user_id</text>
      <!-- Results table -->
      <rect x="16" y="84" width="448" height="134" rx="5" fill="#1e293b"/>
      <text x="240" y="100" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Deletion Pipeline — Auto-Generated from Lineage</text>
      <text x="26" y="118" fill="#ff6b35" font-size="8">1.</text>
      <text x="50" y="118" fill="#94a3b8" font-size="8">DELETE FROM prod.bronze.clickstream_raw WHERE user_id=X</text>
      <text x="26" y="132" fill="#fbbf24" font-size="8">2.</text>
      <text x="50" y="132" fill="#94a3b8" font-size="8">DELETE FROM prod.silver.user_sessions WHERE user_id=X</text>
      <text x="26" y="146" fill="#4ade80" font-size="8">3.</text>
      <text x="50" y="146" fill="#94a3b8" font-size="8">DELETE FROM prod.gold.user_retention WHERE user_id=X</text>
      <text x="26" y="160" fill="#a855f7" font-size="8">4.</text>
      <text x="50" y="160" fill="#94a3b8" font-size="8">DELETE FROM prod.ml_features.user_embeddings WHERE user_id=X</text>
      <text x="26" y="174" fill="#38bdf8" font-size="8">5.</text>
      <text x="50" y="174" fill="#94a3b8" font-size="8">DELETE FROM prod.serving.rec_model_v7 WHERE user_id=X</text>
      <text x="26" y="188" fill="#ef4444" font-size="8">6.</text>
      <text x="50" y="188" fill="#94a3b8" font-size="8">VACUUM each table RETAIN 0 HOURS (ensure Parquet purge)</text>
      <text x="240" y="208" text-anchor="middle" fill="#64748b" font-size="7">All 6 DELETE statements generated programmatically — no manual table list</text>
      <!-- Metrics -->
      <rect x="16" y="228" width="448" height="44" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1"/>
      <text x="240" y="244" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">MediaStream GDPR SLA</text>
      <text x="50" y="260" fill="#94a3b8" font-size="8">Detection → deletion pipeline</text>
      <text x="260" y="260" fill="#fbbf24" font-size="8">4h SLA (EU GDPR: 30 days)</text>
      <text x="240" y="276" text-anchor="middle" fill="#64748b" font-size="7">Lineage makes the 4h target achievable — no manual cross-team coordination</text>
    </svg>`,

    // Step 6: Cross-workspace lineage
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">CROSS-WORKSPACE LINEAGE</text>
      <!-- Metastore umbrella -->
      <rect x="60" y="28" width="360" height="18" rx="4" fill="#a855f7" opacity="0.15" stroke="#a855f7" stroke-width="1"/>
      <text x="240" y="41" text-anchor="middle" fill="#a855f7" font-size="8" font-weight="bold">METASTORE — single lineage graph across all workspaces</text>
      <!-- WS 1: prod-analytics -->
      <rect x="16" y="56" width="140" height="120" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="86" y="74" text-anchor="middle" fill="#38bdf8" font-size="8" font-weight="bold">prod-analytics</text>
      <text x="86" y="92" text-anchor="middle" fill="#94a3b8" font-size="7">WRITES TO:</text>
      <text x="86" y="106" text-anchor="middle" fill="#4ade80" font-size="7">prod.gold.daily_kpis</text>
      <text x="86" y="120" text-anchor="middle" fill="#4ade80" font-size="7">prod.gold.content_perf</text>
      <text x="86" y="138" text-anchor="middle" fill="#94a3b8" font-size="7">READS FROM:</text>
      <text x="86" y="152" text-anchor="middle" fill="#fbbf24" font-size="7">prod.silver.user_sessions</text>
      <text x="86" y="166" text-anchor="middle" fill="#fbbf24" font-size="7">prod.silver.content_views</text>

      <!-- WS 2: data-science -->
      <rect x="170" y="56" width="140" height="120" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="240" y="74" text-anchor="middle" fill="#4ade80" font-size="8" font-weight="bold">data-science</text>
      <text x="240" y="92" text-anchor="middle" fill="#94a3b8" font-size="7">WRITES TO:</text>
      <text x="240" y="106" text-anchor="middle" fill="#a855f7" font-size="7">prod.ml_features.user_embed</text>
      <text x="240" y="120" text-anchor="middle" fill="#a855f7" font-size="7">prod.serving.rec_model_v7</text>
      <text x="240" y="138" text-anchor="middle" fill="#94a3b8" font-size="7">READS FROM:</text>
      <text x="240" y="152" text-anchor="middle" fill="#4ade80" font-size="7">prod.gold.daily_kpis</text>
      <text x="240" y="166" text-anchor="middle" fill="#4ade80" font-size="7">prod.gold.user_segments</text>

      <!-- WS 3: data-engineering -->
      <rect x="324" y="56" width="140" height="120" rx="5" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="394" y="74" text-anchor="middle" fill="#ff6b35" font-size="8" font-weight="bold">data-engineering</text>
      <text x="394" y="92" text-anchor="middle" fill="#94a3b8" font-size="7">WRITES TO:</text>
      <text x="394" y="106" text-anchor="middle" fill="#ff6b35" font-size="7">prod.bronze.clickstream</text>
      <text x="394" y="120" text-anchor="middle" fill="#fbbf24" font-size="7">prod.silver.user_sessions</text>
      <text x="394" y="138" text-anchor="middle" fill="#94a3b8" font-size="7">READS FROM:</text>
      <text x="394" y="152" text-anchor="middle" fill="#38bdf8" font-size="7">Kafka (external)</text>
      <text x="394" y="166" text-anchor="middle" fill="#ff6b35" font-size="7">prod.bronze.clickstream</text>

      <!-- Lines connecting workspaces through metastore -->
      <line x1="156" y1="116" x2="170" y2="116" stroke="#475569" stroke-width="1" stroke-dasharray="3,2"/>
      <line x1="310" y1="116" x2="324" y2="116" stroke="#475569" stroke-width="1" stroke-dasharray="3,2"/>

      <!-- Summary note -->
      <rect x="16" y="190" width="448" height="60" rx="5" fill="#1e293b"/>
      <text x="240" y="208" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">One Lineage Graph → All Workspaces</text>
      <text x="26" y="224" fill="#94a3b8" font-size="8">• data-science workspace lineage visible in metastore control plane</text>
      <text x="26" y="238" fill="#94a3b8" font-size="8">• Governance team sees full prod lineage regardless of which WS wrote it</text>
      <text x="240" y="264" text-anchor="middle" fill="#64748b" font-size="7">No per-workspace lineage tools to maintain — one system, complete picture</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.lg-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--unity)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.lg-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.lg-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="lg-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="lg-header module-header">
        <div class="module-tag" style="background:var(--unity)">UNITY CATALOG</div>
        <h2 class="module-title">Data Lineage</h2>
        <p class="module-subtitle">Automatic · Table + Column level · GDPR propagation · Cross-workspace</p>
      </div>
      <div class="lg-pills step-pills">${pills}</div>
      <div class="lg-diagram diagram-frame"></div>
      <div class="lg-info info-panel" style="border-left:3px solid var(--unity)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'lg-page page-enter';
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

    container.querySelectorAll('.lg-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['lineage'] = {
    id: 'lineage',
    title: 'Data Lineage',
    group: 'Unity Catalog',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
