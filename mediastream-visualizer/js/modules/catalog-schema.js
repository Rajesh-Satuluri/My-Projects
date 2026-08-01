(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: '3-Part Naming',
      desc: 'Unity Catalog uses catalog.schema.table — a fully-qualified, globally unique table identifier.',
      detail: 'Every table in UC has an exact 3-part name: catalog (environment boundary), schema (logical grouping), table (the data asset). Example: prod.streaming.user_events. No ambiguity, no "which database?" questions.',
    },
    {
      label: 'Catalog Tier',
      desc: 'Catalogs are environment or domain boundaries — they separate prod/dev/shared data namespaces.',
      detail: 'MediaStream has 3 catalogs: prod (live data, strict ACLs), dev (sandbox, engineers have write), shared_governance (cross-team reference tables, dimension data, ML model registry).',
    },
    {
      label: 'Schema Tier',
      desc: 'Schemas (databases) group related tables within a catalog — typically by pipeline layer or team.',
      detail: 'prod catalog has: bronze (raw ingest), silver (cleaned), gold (aggregates), ml_features (feature store), serving (low-latency views). Each schema has its own GRANT set.',
    },
    {
      label: 'Table Types',
      desc: 'Schemas contain tables, views, materialized views, functions, and volumes.',
      detail: 'Delta tables dominate MediaStream — ACID, time travel, schema enforcement. Views computed from Delta tables avoid data duplication for BI. Volumes hold non-tabular files (ML models, CSVs, JSON configs).',
    },
    {
      label: 'CREATE Statements',
      desc: 'Creating catalogs, schemas, and tables follows standard SQL with UC extensions.',
      detail: 'No special tooling needed — standard CREATE TABLE/VIEW SQL works. UC intercepts, stores metadata, applies ACLs, begins lineage tracking automatically.',
    },
    {
      label: 'Privileges Hierarchy',
      desc: 'Permissions cascade: catalog → schema → table. Deny at any level blocks access below.',
      detail: 'MediaStream uses group-based grants: analysts→READ on prod.gold.*, data-engineers→WRITE on prod.bronze.*, ml-team→READ on prod.ml_features.*. All rows GRANTed once at schema level — 180 tables, 12 GRANT statements.',
    },
  ];

  const DIAGRAMS = [
    // Step 0: 3-Part naming
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="22" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">3-PART NAMING CONVENTION</text>
      <!-- Full name banner -->
      <rect x="30" y="36" width="420" height="46" rx="6" fill="#1e293b" stroke="#a855f7" stroke-width="2"/>
      <text x="240" y="57" text-anchor="middle" fill="white" font-size="16" font-weight="bold" letter-spacing="1">prod.streaming.user_events</text>
      <text x="240" y="74" text-anchor="middle" fill="#a855f7" font-size="9">fully qualified table name</text>
      <!-- Three segments -->
      <rect x="30" y="100" width="120" height="56" rx="5" fill="#a855f7" opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <text x="90" y="118" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">prod</text>
      <text x="90" y="134" text-anchor="middle" fill="#a855f7" font-size="9">CATALOG</text>
      <text x="90" y="148" text-anchor="middle" fill="#64748b" font-size="7">env boundary</text>
      <text x="165" y="130" text-anchor="middle" fill="#475569" font-size="16">.</text>
      <rect x="180" y="100" width="120" height="56" rx="5" fill="#38bdf8" opacity="0.15" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="240" y="118" text-anchor="middle" fill="#38bdf8" font-size="11" font-weight="bold">streaming</text>
      <text x="240" y="134" text-anchor="middle" fill="#38bdf8" font-size="9">SCHEMA</text>
      <text x="240" y="148" text-anchor="middle" fill="#64748b" font-size="7">layer grouping</text>
      <text x="315" y="130" text-anchor="middle" fill="#475569" font-size="16">.</text>
      <rect x="330" y="100" width="120" height="56" rx="5" fill="#4ade80" opacity="0.15" stroke="#4ade80" stroke-width="1.5"/>
      <text x="390" y="118" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="bold">user_events</text>
      <text x="390" y="134" text-anchor="middle" fill="#4ade80" font-size="9">TABLE</text>
      <text x="390" y="148" text-anchor="middle" fill="#64748b" font-size="7">the data asset</text>
      <!-- Examples -->
      <text x="240" y="180" text-anchor="middle" fill="#64748b" font-size="9">MediaStream Examples</text>
      <rect x="20" y="188" width="440" height="76" rx="5" fill="#1e293b"/>
      <text x="30" y="204" fill="#ff6b35" font-size="8">prod.bronze.clickstream_raw</text>
      <text x="280" y="204" fill="#64748b" font-size="8">raw Kafka events</text>
      <text x="30" y="218" fill="#fbbf24" font-size="8">prod.silver.user_sessions</text>
      <text x="280" y="218" fill="#64748b" font-size="8">deduped sessions</text>
      <text x="30" y="232" fill="#4ade80" font-size="8">prod.gold.daily_content_kpis</text>
      <text x="280" y="232" fill="#64748b" font-size="8">BI-ready aggregates</text>
      <text x="30" y="246" fill="#a855f7" font-size="8">prod.ml_features.user_embeddings</text>
      <text x="280" y="246" fill="#64748b" font-size="8">recommendation model input</text>
      <text x="240" y="274" text-anchor="middle" fill="#64748b" font-size="7">No more "which cluster?", "which Hive?", "which schema?" — one name, one table</text>
    </svg>`,

    // Step 1: Catalog tier
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">CATALOG TIER</text>
      <!-- Three catalogs -->
      <rect x="16" y="32" width="140" height="160" rx="6" fill="#1e293b" stroke="#4ade80" stroke-width="2"/>
      <rect x="16" y="32" width="140" height="28" rx="6" fill="#4ade80" opacity="0.2"/>
      <text x="86" y="50" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="bold">prod</text>
      <text x="86" y="76" text-anchor="middle" fill="#94a3b8" font-size="8">Live production data</text>
      <text x="86" y="90" text-anchor="middle" fill="#94a3b8" font-size="8">Strict ACLs</text>
      <text x="86" y="104" text-anchor="middle" fill="#94a3b8" font-size="8">180M subscribers</text>
      <text x="86" y="118" text-anchor="middle" fill="#94a3b8" font-size="8">2.4B events/day</text>
      <rect x="26" y="128" width="120" height="16" rx="3" fill="#0f172a"/>
      <text x="86" y="140" text-anchor="middle" fill="#64748b" font-size="7">GRANT: analysts→READ</text>
      <rect x="26" y="148" width="120" height="16" rx="3" fill="#0f172a"/>
      <text x="86" y="160" text-anchor="middle" fill="#64748b" font-size="7">GRANT: engineers→WRITE</text>
      <rect x="26" y="168" width="120" height="16" rx="3" fill="#0f172a"/>
      <text x="86" y="180" text-anchor="middle" fill="#ef4444" font-size="7">DENY: devs (prod isolation)</text>

      <rect x="170" y="32" width="140" height="160" rx="6" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>
      <rect x="170" y="32" width="140" height="28" rx="6" fill="#fbbf24" opacity="0.2"/>
      <text x="240" y="50" text-anchor="middle" fill="#fbbf24" font-size="11" font-weight="bold">dev</text>
      <text x="240" y="76" text-anchor="middle" fill="#94a3b8" font-size="8">Sandbox environment</text>
      <text x="240" y="90" text-anchor="middle" fill="#94a3b8" font-size="8">Engineers: full write</text>
      <text x="240" y="104" text-anchor="middle" fill="#94a3b8" font-size="8">Synthetic data only</text>
      <text x="240" y="118" text-anchor="middle" fill="#94a3b8" font-size="8">Auto-clean weekly</text>
      <rect x="180" y="128" width="120" height="16" rx="3" fill="#0f172a"/>
      <text x="240" y="140" text-anchor="middle" fill="#64748b" font-size="7">GRANT: engineers→ALL</text>
      <rect x="180" y="148" width="120" height="16" rx="3" fill="#0f172a"/>
      <text x="240" y="160" text-anchor="middle" fill="#64748b" font-size="7">no PII data allowed</text>

      <rect x="324" y="32" width="140" height="160" rx="6" fill="#1e293b" stroke="#a855f7" stroke-width="2"/>
      <rect x="324" y="32" width="140" height="28" rx="6" fill="#a855f7" opacity="0.2"/>
      <text x="394" y="50" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">shared_governance</text>
      <text x="394" y="76" text-anchor="middle" fill="#94a3b8" font-size="8">Cross-team reference</text>
      <text x="394" y="90" text-anchor="middle" fill="#94a3b8" font-size="8">Dimension tables</text>
      <text x="394" y="104" text-anchor="middle" fill="#94a3b8" font-size="8">ML model registry</text>
      <text x="394" y="118" text-anchor="middle" fill="#94a3b8" font-size="8">Content catalog</text>
      <rect x="334" y="128" width="120" height="16" rx="3" fill="#0f172a"/>
      <text x="394" y="140" text-anchor="middle" fill="#64748b" font-size="7">GRANT: everyone→READ</text>
      <rect x="334" y="148" width="120" height="16" rx="3" fill="#0f172a"/>
      <text x="394" y="160" text-anchor="middle" fill="#64748b" font-size="7">data-governance→WRITE</text>

      <!-- Note at bottom -->
      <rect x="16" y="202" width="448" height="30" rx="4" fill="#1e293b"/>
      <text x="240" y="222" text-anchor="middle" fill="#94a3b8" font-size="8">Catalogs = hard environment boundaries · Cross-catalog queries allowed but audited</text>
      <text x="240" y="268" text-anchor="middle" fill="#64748b" font-size="7">CREATE CATALOG dev COMMENT 'Sandbox — synthetic data only, no PII';</text>
    </svg>`,

    // Step 2: Schema tier
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">SCHEMA TIER (prod catalog)</text>
      <!-- Schemas in prod -->
      <rect x="16" y="32" width="80" height="130" rx="5" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="56" y="50" text-anchor="middle" fill="#ff6b35" font-size="9" font-weight="bold">bronze</text>
      <text x="56" y="68" text-anchor="middle" fill="#94a3b8" font-size="7">clickstream_raw</text>
      <text x="56" y="82" text-anchor="middle" fill="#94a3b8" font-size="7">app_events_raw</text>
      <text x="56" y="96" text-anchor="middle" fill="#94a3b8" font-size="7">ad_events_raw</text>
      <text x="56" y="114" text-anchor="middle" fill="#64748b" font-size="7">WRITE: pipelines</text>
      <text x="56" y="128" text-anchor="middle" fill="#64748b" font-size="7">READ: engineers</text>
      <text x="56" y="144" text-anchor="middle" fill="#64748b" font-size="7">EXTERNAL</text>

      <rect x="106" y="32" width="80" height="130" rx="5" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5"/>
      <text x="146" y="50" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">silver</text>
      <text x="146" y="68" text-anchor="middle" fill="#94a3b8" font-size="7">user_sessions</text>
      <text x="146" y="82" text-anchor="middle" fill="#94a3b8" font-size="7">content_views</text>
      <text x="146" y="96" text-anchor="middle" fill="#94a3b8" font-size="7">ad_impressions</text>
      <text x="146" y="114" text-anchor="middle" fill="#64748b" font-size="7">WRITE: dbt</text>
      <text x="146" y="128" text-anchor="middle" fill="#64748b" font-size="7">READ: engineers</text>
      <text x="146" y="144" text-anchor="middle" fill="#64748b" font-size="7">EXTERNAL</text>

      <rect x="196" y="32" width="80" height="130" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="236" y="50" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">gold</text>
      <text x="236" y="68" text-anchor="middle" fill="#94a3b8" font-size="7">daily_kpis</text>
      <text x="236" y="82" text-anchor="middle" fill="#94a3b8" font-size="7">content_perf</text>
      <text x="236" y="96" text-anchor="middle" fill="#94a3b8" font-size="7">user_segments</text>
      <text x="236" y="114" text-anchor="middle" fill="#64748b" font-size="7">WRITE: dbt</text>
      <text x="236" y="128" text-anchor="middle" fill="#64748b" font-size="7">READ: analysts</text>
      <text x="236" y="144" text-anchor="middle" fill="#64748b" font-size="7">MANAGED</text>

      <rect x="286" y="32" width="84" height="130" rx="5" fill="#1e293b" stroke="#a855f7" stroke-width="1.5"/>
      <text x="328" y="50" text-anchor="middle" fill="#a855f7" font-size="8" font-weight="bold">ml_features</text>
      <text x="328" y="68" text-anchor="middle" fill="#94a3b8" font-size="7">user_embed</text>
      <text x="328" y="82" text-anchor="middle" fill="#94a3b8" font-size="7">content_embed</text>
      <text x="328" y="96" text-anchor="middle" fill="#94a3b8" font-size="7">ctx_features</text>
      <text x="328" y="114" text-anchor="middle" fill="#64748b" font-size="7">WRITE: ml-eng</text>
      <text x="328" y="128" text-anchor="middle" fill="#64748b" font-size="7">READ: ml-team</text>
      <text x="328" y="144" text-anchor="middle" fill="#64748b" font-size="7">MANAGED</text>

      <rect x="380" y="32" width="84" height="130" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="422" y="50" text-anchor="middle" fill="#38bdf8" font-size="9" font-weight="bold">serving</text>
      <text x="422" y="68" text-anchor="middle" fill="#94a3b8" font-size="7">rec_model_v7</text>
      <text x="422" y="82" text-anchor="middle" fill="#94a3b8" font-size="7">trending_24h</text>
      <text x="422" y="96" text-anchor="middle" fill="#94a3b8" font-size="7">live_dashboard</text>
      <text x="422" y="114" text-anchor="middle" fill="#64748b" font-size="7">WRITE: ml-eng</text>
      <text x="422" y="128" text-anchor="middle" fill="#64748b" font-size="7">READ: serving</text>
      <text x="422" y="144" text-anchor="middle" fill="#64748b" font-size="7">VIEWS</text>

      <!-- CREATE SCHEMA example -->
      <rect x="16" y="174" width="448" height="54" rx="5" fill="#1e293b"/>
      <text x="240" y="190" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Schema Definition</text>
      <text x="26" y="207" fill="#a855f7" font-size="8">CREATE SCHEMA prod.gold</text>
      <text x="26" y="221" fill="#94a3b8" font-size="8">  COMMENT 'BI-ready aggregates — SLA: 99.9% freshness within 1h';</text>
      <!-- Stats row -->
      <text x="30" y="254" fill="#64748b" font-size="8">5 schemas in prod</text>
      <text x="160" y="254" fill="#64748b" font-size="8">42 tables total</text>
      <text x="280" y="254" fill="#64748b" font-size="8">12 GRANT rules</text>
      <text x="400" y="254" fill="#64748b" font-size="8">0 credential sprawl</text>
      <text x="240" y="276" text-anchor="middle" fill="#64748b" font-size="7">One GRANT per schema covers all current + future tables in that schema</text>
    </svg>`,

    // Step 3: Table types
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">TABLE TYPES IN UC</text>
      <!-- 4 types -->
      <rect x="16" y="32" width="100" height="104" rx="5" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="66" y="50" text-anchor="middle" fill="#ff6b35" font-size="9" font-weight="bold">Delta Table</text>
      <text x="66" y="68" text-anchor="middle" fill="#94a3b8" font-size="7">ACID · time travel</text>
      <text x="66" y="82" text-anchor="middle" fill="#94a3b8" font-size="7">schema enforce</text>
      <text x="66" y="96" text-anchor="middle" fill="#94a3b8" font-size="7">streaming + batch</text>
      <text x="66" y="116" text-anchor="middle" fill="#64748b" font-size="7">Most MediaStream</text>
      <text x="66" y="128" text-anchor="middle" fill="#64748b" font-size="7">tables use this</text>

      <rect x="126" y="32" width="100" height="104" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="176" y="50" text-anchor="middle" fill="#38bdf8" font-size="9" font-weight="bold">View</text>
      <text x="176" y="68" text-anchor="middle" fill="#94a3b8" font-size="7">Computed on read</text>
      <text x="176" y="82" text-anchor="middle" fill="#94a3b8" font-size="7">no storage cost</text>
      <text x="176" y="96" text-anchor="middle" fill="#94a3b8" font-size="7">security boundary</text>
      <text x="176" y="116" text-anchor="middle" fill="#64748b" font-size="7">Masked PII for</text>
      <text x="176" y="128" text-anchor="middle" fill="#64748b" font-size="7">analyst access</text>

      <rect x="236" y="32" width="100" height="104" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="286" y="50" text-anchor="middle" fill="#4ade80" font-size="8" font-weight="bold">Materialized View</text>
      <text x="286" y="68" text-anchor="middle" fill="#94a3b8" font-size="7">Auto-refresh</text>
      <text x="286" y="82" text-anchor="middle" fill="#94a3b8" font-size="7">pre-computed</text>
      <text x="286" y="96" text-anchor="middle" fill="#94a3b8" font-size="7">faster reads</text>
      <text x="286" y="116" text-anchor="middle" fill="#64748b" font-size="7">Dashboard KPIs</text>
      <text x="286" y="128" text-anchor="middle" fill="#64748b" font-size="7">hourly refresh</text>

      <rect x="346" y="32" width="118" height="104" rx="5" fill="#1e293b" stroke="#a855f7" stroke-width="1.5"/>
      <text x="405" y="50" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">Volume</text>
      <text x="405" y="68" text-anchor="middle" fill="#94a3b8" font-size="7">Non-tabular files</text>
      <text x="405" y="82" text-anchor="middle" fill="#94a3b8" font-size="7">UC-governed path</text>
      <text x="405" y="96" text-anchor="middle" fill="#94a3b8" font-size="7">Parquet/JSON/CSV</text>
      <text x="405" y="116" text-anchor="middle" fill="#64748b" font-size="7">ML model files</text>
      <text x="405" y="128" text-anchor="middle" fill="#64748b" font-size="7">raw CSVs, images</text>

      <!-- MediaStream mix -->
      <rect x="16" y="148" width="448" height="106" rx="5" fill="#1e293b"/>
      <text x="240" y="164" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">MediaStream Object Inventory</text>
      <text x="30" y="182" fill="#ff6b35" font-size="8">Delta Tables</text>
      <text x="150" y="182" fill="#94a3b8" font-size="8">42   Bronze 8 · Silver 12 · Gold 10 · ML 12</text>
      <text x="30" y="198" fill="#38bdf8" font-size="8">Views</text>
      <text x="150" y="198" fill="#94a3b8" font-size="8">18   PII-masked analyst views, BI aggregation views</text>
      <text x="30" y="214" fill="#4ade80" font-size="8">Mat. Views</text>
      <text x="150" y="214" fill="#94a3b8" font-size="8">6    Dashboard KPIs refreshed hourly</text>
      <text x="30" y="230" fill="#a855f7" font-size="8">Volumes</text>
      <text x="150" y="230" fill="#94a3b8" font-size="8">4    ML model artifacts, raw CSV imports</text>
      <text x="30" y="246" fill="#fbbf24" font-size="8">Functions</text>
      <text x="150" y="246" fill="#94a3b8" font-size="8">12   UDFs for session hashing, geo lookup, PII masking</text>
    </svg>`,

    // Step 4: CREATE statements
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">UC CREATE STATEMENTS</text>
      <!-- Catalog -->
      <rect x="16" y="30" width="448" height="44" rx="4" fill="#1e293b"/>
      <text x="26" y="46" fill="#64748b" font-size="8">-- 1. Create catalog</text>
      <text x="26" y="62" fill="#a855f7" font-size="9">CREATE CATALOG prod COMMENT 'Production — live 180M subscribers';</text>
      <!-- Schema -->
      <rect x="16" y="82" width="448" height="30" rx="4" fill="#1e293b"/>
      <text x="26" y="94" fill="#64748b" font-size="8">-- 2. Create schema</text>
      <text x="26" y="107" fill="#38bdf8" font-size="9">CREATE SCHEMA prod.gold COMMENT 'BI aggregates · SLA 1h freshness';</text>
      <!-- Table -->
      <rect x="16" y="120" width="448" height="72" rx="4" fill="#1e293b"/>
      <text x="26" y="134" fill="#64748b" font-size="8">-- 3. Create Delta table (managed)</text>
      <text x="26" y="148" fill="#4ade80" font-size="8">CREATE TABLE prod.gold.daily_content_kpis (</text>
      <text x="26" y="162" fill="#94a3b8" font-size="8">  content_id STRING, date DATE, views BIGINT, watch_ms BIGINT,</text>
      <text x="26" y="176" fill="#94a3b8" font-size="8">  completion_rate DOUBLE, unique_viewers BIGINT</text>
      <text x="26" y="190" fill="#94a3b8" font-size="8">) USING DELTA COMMENT 'Daily content KPIs for BI · managed';</text>
      <!-- View -->
      <rect x="16" y="200" width="448" height="44" rx="4" fill="#1e293b"/>
      <text x="26" y="214" fill="#64748b" font-size="8">-- 4. Create view (PII-masked for analysts)</text>
      <text x="26" y="228" fill="#fbbf24" font-size="9">CREATE VIEW prod.gold.content_kpis_public AS</text>
      <text x="26" y="242" fill="#94a3b8" font-size="9">  SELECT content_id, date, views, watch_ms FROM prod.gold.daily_content_kpis;</text>
      <!-- Note -->
      <text x="240" y="268" text-anchor="middle" fill="#64748b" font-size="7">Standard SQL · UC intercepts, registers metadata, starts lineage tracking · No special driver needed</text>
    </svg>`,

    // Step 5: Privileges hierarchy
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">PRIVILEGES HIERARCHY</text>
      <!-- Cascade diagram -->
      <rect x="160" y="30" width="160" height="28" rx="5" fill="#a855f7" opacity="0.2" stroke="#a855f7" stroke-width="1.5"/>
      <text x="240" y="48" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">CATALOG</text>
      <line x1="240" y1="58" x2="240" y2="74" stroke="#a855f7" stroke-width="1.5" opacity="0.5" marker-end="url(#ca-arr)"/>
      <rect x="160" y="74" width="160" height="28" rx="5" fill="#38bdf8" opacity="0.15" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="240" y="92" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="bold">SCHEMA</text>
      <line x1="240" y1="102" x2="240" y2="118" stroke="#38bdf8" stroke-width="1.5" opacity="0.5"/>
      <rect x="160" y="118" width="160" height="28" rx="5" fill="#4ade80" opacity="0.15" stroke="#4ade80" stroke-width="1.5"/>
      <text x="240" y="136" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">TABLE / VIEW</text>
      <!-- Grant statements -->
      <rect x="16" y="158" width="448" height="96" rx="5" fill="#1e293b"/>
      <text x="240" y="174" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">MediaStream: 12 GRANT statements cover 180 tables</text>
      <text x="26" y="190" fill="#4ade80" font-size="8">GRANT USE SCHEMA, SELECT ON SCHEMA prod.gold TO GROUP analysts;</text>
      <text x="26" y="204" fill="#38bdf8" font-size="8">GRANT USE SCHEMA, MODIFY  ON SCHEMA prod.bronze TO GROUP data-engineers;</text>
      <text x="26" y="218" fill="#a855f7" font-size="8">GRANT USE SCHEMA, SELECT  ON SCHEMA prod.ml_features TO GROUP ml-team;</text>
      <text x="26" y="232" fill="#fbbf24" font-size="8">GRANT USE CATALOG           ON CATALOG prod TO GROUP all-data-employees;</text>
      <text x="26" y="246" fill="#ef4444" font-size="8">REVOKE ALL ON SCHEMA prod.bronze FROM GROUP analysts;  -- explicit deny</text>
      <!-- One GRANT covers all tables note -->
      <rect x="16" y="264" width="448" height="22" rx="4" fill="#1e293b" stroke="#fbbf24" stroke-width="1"/>
      <text x="240" y="279" text-anchor="middle" fill="#fbbf24" font-size="8">GRANT at SCHEMA level auto-applies to all tables in that schema — new tables inherit permissions</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.ca-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--unity)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.ca-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.ca-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="ca-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="ca-header module-header">
        <div class="module-tag" style="background:var(--unity)">UNITY CATALOG</div>
        <h2 class="module-title">Catalog &amp; Schema</h2>
        <p class="module-subtitle">3-part naming · catalogs · schemas · table types · privileges</p>
      </div>
      <div class="ca-pills step-pills">${pills}</div>
      <div class="ca-diagram diagram-frame"></div>
      <div class="ca-info info-panel" style="border-left:3px solid var(--unity)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'ca-page page-enter';
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

    container.querySelectorAll('.ca-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['catalog-schema'] = {
    id: 'catalog-schema',
    title: 'Catalog & Schema',
    group: 'Unity Catalog',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
