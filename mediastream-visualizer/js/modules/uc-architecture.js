(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'What Is UC',
      desc: 'Unity Catalog — a unified governance layer above all Delta tables',
      detail: 'Unity Catalog provides a single control plane for access control, data lineage, auditing, and discovery across all Databricks workspaces. It sits above the compute layer and governs every data asset MediaStream owns.',
    },
    {
      label: 'Hierarchy',
      desc: 'Metastore → Catalog → Schema → Table — the 3-part naming system',
      detail: 'Every table in Unity Catalog is addressed by three parts: catalog.schema.table. This hierarchy maps naturally to organizational boundaries: catalog = environment or domain, schema = team or subdomain, table = dataset.',
    },
    {
      label: 'Governance Layer',
      desc: 'Access control, lineage, and audit all unified in one service',
      detail: 'Before Unity Catalog, MediaStream managed ACLs in Hive metastore, lineage in a separate tool, and audit logs manually. Unity Catalog unifies all three: one GRANT statement governs who reads what, and every query is automatically tracked.',
    },
    {
      label: 'Multi-Workspace',
      desc: 'One metastore — multiple workspaces share the same governance',
      detail: 'MediaStream has three Databricks workspaces: prod-analytics, data-science, and data-engineering. All three attach to the same Unity Catalog metastore, so a table created in one workspace is immediately visible and governable in the others.',
    },
    {
      label: 'MediaStream Setup',
      desc: 'Three catalogs: prod, dev, shared_governance',
      detail: 'prod catalog holds Silver, Gold, and ML feature tables used by the recommendation engine. dev holds experimental tables and feature branches. shared_governance holds reference data and content metadata shared across teams.',
    },
    {
      label: 'UC vs Hive',
      desc: 'What Unity Catalog replaces and why it matters',
      detail: 'Hive metastore is workspace-scoped, lacks column-level lineage, has no row/column security, and produces no structured audit log. Unity Catalog fixes all four. MediaStream migrated 1,200+ tables from Hive to UC in Q1 2024.',
    },
  ];

  let _engine = null;

  const DIAGRAMS = [
    // Step 0: What Is UC
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <defs>
        <linearGradient id="ua-gg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#7c3aed"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
      </defs>
      <rect x="15" y="12" width="450" height="276" rx="6" fill="#0a0a1a" stroke="#a855f7" stroke-width="1.5"/>
      <!-- Unity Catalog layer -->
      <rect x="25" y="22" width="430" height="50" rx="4" fill="url(#ua-gg)"/>
      <text x="240" y="42" text-anchor="middle" fill="white" font-weight="bold" font-size="13">Unity Catalog</text>
      <text x="240" y="58" text-anchor="middle" fill="rgba(255,255,255,.8)" font-size="10">Access Control  •  Data Lineage  •  Auditing  •  Discovery</text>
      <!-- Workspaces -->
      <text x="240" y="92" text-anchor="middle" fill="#94a3b8" font-size="9">Governs all workspaces from one control plane:</text>
      <rect x="25" y="98" width="128" height="40" rx="4" fill="#1e293b" stroke="#38bdf8"/>
      <text x="89" y="116" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="bold">prod-analytics</text>
      <text x="89" y="130" text-anchor="middle" fill="#64748b" font-size="9">SQL Warehouse</text>
      <rect x="176" y="98" width="128" height="40" rx="4" fill="#1e293b" stroke="#38bdf8"/>
      <text x="240" y="116" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="bold">data-science</text>
      <text x="240" y="130" text-anchor="middle" fill="#64748b" font-size="9">ML Cluster</text>
      <rect x="327" y="98" width="128" height="40" rx="4" fill="#1e293b" stroke="#38bdf8"/>
      <text x="391" y="116" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="bold">data-engineering</text>
      <text x="391" y="130" text-anchor="middle" fill="#64748b" font-size="9">DLT Pipeline</text>
      <!-- Delta Lake layer -->
      <rect x="25" y="152" width="430" height="50" rx="4" fill="#1e293b" stroke="#ff6b35"/>
      <text x="240" y="170" text-anchor="middle" fill="#ff6b35" font-weight="bold" font-size="12">Delta Lake — Storage Layer</text>
      <text x="240" y="186" text-anchor="middle" fill="#64748b" font-size="9">s3://ms-data-lake/  (Bronze / Silver / Gold / ML Features)</text>
      <!-- UC features -->
      <rect x="25" y="215" width="100" height="55" rx="4" fill="#1e293b" stroke="#a855f7"/>
      <text x="75" y="232" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">Fine-grained</text>
      <text x="75" y="245" text-anchor="middle" fill="#a855f7" font-size="9">Access Control</text>
      <text x="75" y="259" text-anchor="middle" fill="#64748b" font-size="8">row + column</text>
      <rect x="135" y="215" width="100" height="55" rx="4" fill="#1e293b" stroke="#a855f7"/>
      <text x="185" y="232" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">Automated</text>
      <text x="185" y="245" text-anchor="middle" fill="#a855f7" font-size="9">Lineage</text>
      <text x="185" y="259" text-anchor="middle" fill="#64748b" font-size="8">col-level</text>
      <rect x="245" y="215" width="100" height="55" rx="4" fill="#1e293b" stroke="#a855f7"/>
      <text x="295" y="232" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">Structured</text>
      <text x="295" y="245" text-anchor="middle" fill="#a855f7" font-size="9">Audit Logs</text>
      <text x="295" y="259" text-anchor="middle" fill="#64748b" font-size="8">SQL queryable</text>
      <rect x="355" y="215" width="100" height="55" rx="4" fill="#1e293b" stroke="#a855f7"/>
      <text x="405" y="232" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">Data</text>
      <text x="405" y="245" text-anchor="middle" fill="#a855f7" font-size="9">Discovery</text>
      <text x="405" y="259" text-anchor="middle" fill="#64748b" font-size="8">tags + search</text>
    </svg>`,

    // Step 1: Hierarchy
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Unity Catalog Hierarchy — 3-Part Naming</text>
      <!-- 3-part name -->
      <rect x="50" y="35" width="380" height="38" rx="4" fill="#0f172a" stroke="#a855f7"/>
      <text x="150" y="58" text-anchor="middle" fill="#ff6b35" font-size="16" font-weight="bold">prod</text>
      <text x="210" y="58" text-anchor="middle" fill="#64748b" font-size="16">.</text>
      <text x="280" y="58" text-anchor="middle" fill="#38bdf8" font-size="16" font-weight="bold">mediastream</text>
      <text x="350" y="58" text-anchor="middle" fill="#64748b" font-size="16">.</text>
      <text x="410" y="58" text-anchor="middle" fill="#4ade80" font-size="16" font-weight="bold">user_events_silver</text>
      <!-- hierarchy boxes -->
      <text x="90" y="100" text-anchor="middle" fill="#ff6b35" font-size="11" font-weight="bold">METASTORE</text>
      <rect x="25" y="108" width="130" height="60" rx="4" fill="#1e293b" stroke="#ff6b35"/>
      <text x="90" y="126" text-anchor="middle" fill="#ff6b35" font-size="10">mediastream-ms</text>
      <text x="90" y="140" text-anchor="middle" fill="#64748b" font-size="9">1 per org/region</text>
      <text x="90" y="153" text-anchor="middle" fill="#64748b" font-size="9">3 workspaces attached</text>
      <!-- arrow -->
      <line x1="155" y1="138" x2="175" y2="138" stroke="#a855f7" stroke-width="1.5" marker-end="url(#ua-a)"/>
      <defs><marker id="ua-a" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#a855f7"/></marker></defs>
      <text x="240" y="100" text-anchor="middle" fill="#fbbf24" font-size="11" font-weight="bold">CATALOG</text>
      <rect x="178" y="108" width="124" height="60" rx="4" fill="#1e293b" stroke="#fbbf24"/>
      <text x="240" y="126" text-anchor="middle" fill="#fbbf24" font-size="10">prod</text>
      <text x="240" y="140" text-anchor="middle" fill="#64748b" font-size="9">also: dev, shared_gov</text>
      <text x="240" y="153" text-anchor="middle" fill="#64748b" font-size="9">environment boundary</text>
      <line x1="302" y1="138" x2="322" y2="138" stroke="#a855f7" stroke-width="1.5" marker-end="url(#ua-a)"/>
      <text x="390" y="100" text-anchor="middle" fill="#38bdf8" font-size="11" font-weight="bold">SCHEMA</text>
      <rect x="325" y="108" width="130" height="60" rx="4" fill="#1e293b" stroke="#38bdf8"/>
      <text x="390" y="126" text-anchor="middle" fill="#38bdf8" font-size="10">mediastream</text>
      <text x="390" y="140" text-anchor="middle" fill="#64748b" font-size="9">also: content, billing</text>
      <text x="390" y="153" text-anchor="middle" fill="#64748b" font-size="9">team/domain boundary</text>
      <!-- Table boxes -->
      <text x="240" y="188" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="bold">TABLES inside prod.mediastream</text>
      <rect x="15" y="196" width="85" height="35" rx="3" fill="#1e293b" stroke="#4ade80"/>
      <text x="57" y="211" text-anchor="middle" fill="#4ade80" font-size="8">user_events</text>
      <text x="57" y="223" text-anchor="middle" fill="#4ade80" font-size="8">_bronze</text>
      <rect x="106" y="196" width="85" height="35" rx="3" fill="#1e293b" stroke="#4ade80"/>
      <text x="148" y="211" text-anchor="middle" fill="#4ade80" font-size="8">user_events</text>
      <text x="148" y="223" text-anchor="middle" fill="#4ade80" font-size="8">_silver</text>
      <rect x="197" y="196" width="85" height="35" rx="3" fill="#1e293b" stroke="#4ade80"/>
      <text x="239" y="211" text-anchor="middle" fill="#4ade80" font-size="8">user_events</text>
      <text x="239" y="223" text-anchor="middle" fill="#4ade80" font-size="8">_gold</text>
      <rect x="288" y="196" width="85" height="35" rx="3" fill="#1e293b" stroke="#4ade80"/>
      <text x="330" y="211" text-anchor="middle" fill="#4ade80" font-size="8">rec_features</text>
      <text x="330" y="223" text-anchor="middle" fill="#4ade80" font-size="8">_gold</text>
      <rect x="379" y="196" width="86" height="35" rx="3" fill="#1e293b" stroke="#4ade80"/>
      <text x="422" y="211" text-anchor="middle" fill="#4ade80" font-size="8">content</text>
      <text x="422" y="223" text-anchor="middle" fill="#4ade80" font-size="8">_metadata</text>
      <text x="240" y="260" text-anchor="middle" fill="#64748b" font-size="9">1,247 tables total in prod.mediastream  •  247 per schema average</text>
      <text x="240" y="274" text-anchor="middle" fill="#64748b" font-size="9">USE CATALOG prod; USE SCHEMA mediastream; SELECT * FROM user_events_silver;</text>
    </svg>`,

    // Step 2: Governance Layer
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Unified Governance — Before vs After Unity Catalog</text>
      <!-- Before -->
      <rect x="15" y="38" width="215" height="210" rx="4" fill="#1c0a0a" stroke="#ef4444"/>
      <text x="122" y="56" text-anchor="middle" fill="#ef4444" font-size="11" font-weight="bold">BEFORE — Fragmented</text>
      <line x1="15" y1="61" x2="230" y2="61" stroke="#334155"/>
      <rect x="25" y="68" width="195" height="30" rx="3" fill="#1e293b" stroke="#ef4444"/>
      <text x="122" y="87" text-anchor="middle" fill="#94a3b8" font-size="9">ACLs in Hive metastore</text>
      <text x="122" y="97" text-anchor="middle" fill="#ef4444" font-size="8">workspace-scoped only</text>
      <rect x="25" y="104" width="195" height="30" rx="3" fill="#1e293b" stroke="#ef4444"/>
      <text x="122" y="123" text-anchor="middle" fill="#94a3b8" font-size="9">Lineage in separate tool</text>
      <text x="122" y="133" text-anchor="middle" fill="#ef4444" font-size="8">table-level only, manual</text>
      <rect x="25" y="140" width="195" height="30" rx="3" fill="#1e293b" stroke="#ef4444"/>
      <text x="122" y="159" text-anchor="middle" fill="#94a3b8" font-size="9">Audit logs: raw S3 access</text>
      <text x="122" y="169" text-anchor="middle" fill="#ef4444" font-size="8">no SQL query visibility</text>
      <rect x="25" y="176" width="195" height="30" rx="3" fill="#1e293b" stroke="#ef4444"/>
      <text x="122" y="195" text-anchor="middle" fill="#94a3b8" font-size="9">Row/column security</text>
      <text x="122" y="205" text-anchor="middle" fill="#ef4444" font-size="8">not supported</text>
      <text x="122" y="232" text-anchor="middle" fill="#ef4444" font-size="9">INC-2023-019: data breach</text>
      <text x="122" y="245" text-anchor="middle" fill="#ef4444" font-size="8">via un-governed workspace</text>
      <!-- After -->
      <rect x="250" y="38" width="215" height="210" rx="4" fill="#0a1628" stroke="#4ade80"/>
      <text x="357" y="56" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="bold">AFTER — Unified</text>
      <line x1="250" y1="61" x2="465" y2="61" stroke="#334155"/>
      <rect x="260" y="68" width="195" height="30" rx="3" fill="#1e293b" stroke="#4ade80"/>
      <text x="357" y="87" text-anchor="middle" fill="#94a3b8" font-size="9">GRANT SELECT ON TABLE</text>
      <text x="357" y="97" text-anchor="middle" fill="#4ade80" font-size="8">cross-workspace, inheritable</text>
      <rect x="260" y="104" width="195" height="30" rx="3" fill="#1e293b" stroke="#4ade80"/>
      <text x="357" y="123" text-anchor="middle" fill="#94a3b8" font-size="9">Auto column-level lineage</text>
      <text x="357" y="133" text-anchor="middle" fill="#4ade80" font-size="8">every query captured</text>
      <rect x="260" y="140" width="195" height="30" rx="3" fill="#1e293b" stroke="#4ade80"/>
      <text x="357" y="159" text-anchor="middle" fill="#94a3b8" font-size="9">system.access.audit table</text>
      <text x="357" y="169" text-anchor="middle" fill="#4ade80" font-size="8">SQL queryable, all queries</text>
      <rect x="260" y="176" width="195" height="30" rx="3" fill="#1e293b" stroke="#4ade80"/>
      <text x="357" y="195" text-anchor="middle" fill="#94a3b8" font-size="9">Row filters + column masks</text>
      <text x="357" y="205" text-anchor="middle" fill="#4ade80" font-size="8">enforced at query time</text>
      <text x="357" y="232" text-anchor="middle" fill="#4ade80" font-size="9">Zero governance gaps since</text>
      <text x="357" y="245" text-anchor="middle" fill="#4ade80" font-size="8">UC migration Q1 2024</text>
    </svg>`,

    // Step 3: Multi-Workspace
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <defs>
        <linearGradient id="ua-mw" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#7c3aed"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
      </defs>
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Multi-Workspace — One Metastore, Shared Governance</text>
      <!-- UC Metastore top -->
      <rect x="100" y="35" width="280" height="38" rx="4" fill="url(#ua-mw)"/>
      <text x="240" y="49" text-anchor="middle" fill="white" font-weight="bold" font-size="11">Unity Catalog Metastore</text>
      <text x="240" y="63" text-anchor="middle" fill="rgba(255,255,255,.8)" font-size="9">mediastream-prod-metastore  •  us-east-1</text>
      <!-- Lines down -->
      <line x1="160" y1="73" x2="90" y2="110" stroke="#a855f7" stroke-width="1" stroke-dasharray="4,3"/>
      <line x1="240" y1="73" x2="240" y2="110" stroke="#a855f7" stroke-width="1" stroke-dasharray="4,3"/>
      <line x1="320" y1="73" x2="390" y2="110" stroke="#a855f7" stroke-width="1" stroke-dasharray="4,3"/>
      <!-- Three workspaces -->
      <rect x="20" y="110" width="140" height="80" rx="4" fill="#1e293b" stroke="#38bdf8"/>
      <text x="90" y="128" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="bold">prod-analytics</text>
      <text x="90" y="142" text-anchor="middle" fill="#64748b" font-size="9">SQL Warehouse cluster</text>
      <text x="90" y="156" text-anchor="middle" fill="#64748b" font-size="9">Reads: Silver, Gold</text>
      <text x="90" y="170" text-anchor="middle" fill="#64748b" font-size="9">Writes: Gold (ETL jobs)</text>
      <text x="90" y="184" text-anchor="middle" fill="#64748b" font-size="9">Users: analysts, BI</text>
      <rect x="170" y="110" width="140" height="80" rx="4" fill="#1e293b" stroke="#38bdf8"/>
      <text x="240" y="128" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="bold">data-science</text>
      <text x="240" y="142" text-anchor="middle" fill="#64748b" font-size="9">ML/GPU cluster</text>
      <text x="240" y="156" text-anchor="middle" fill="#64748b" font-size="9">Reads: Gold, ML features</text>
      <text x="240" y="170" text-anchor="middle" fill="#64748b" font-size="9">Writes: ml_feature_store</text>
      <text x="240" y="184" text-anchor="middle" fill="#64748b" font-size="9">Users: ML engineers</text>
      <rect x="320" y="110" width="140" height="80" rx="4" fill="#1e293b" stroke="#38bdf8"/>
      <text x="390" y="128" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="bold">data-engineering</text>
      <text x="390" y="142" text-anchor="middle" fill="#64748b" font-size="9">DLT + Spark cluster</text>
      <text x="390" y="156" text-anchor="middle" fill="#64748b" font-size="9">Reads: Bronze</text>
      <text x="390" y="170" text-anchor="middle" fill="#64748b" font-size="9">Writes: Bronze, Silver</text>
      <text x="390" y="184" text-anchor="middle" fill="#64748b" font-size="9">Users: data engineers</text>
      <!-- Shared governance note -->
      <rect x="15" y="205" width="450" height="80" rx="4" fill="#1e293b" stroke="#a855f7"/>
      <text x="240" y="223" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">Shared governance across all workspaces</text>
      <text x="30" y="240" fill="#64748b" font-size="9">A GRANT on prod.mediastream.user_events_silver applies in ALL three workspaces simultaneously.</text>
      <text x="30" y="254" fill="#64748b" font-size="9">A table created in data-engineering workspace is immediately queryable from prod-analytics.</text>
      <text x="30" y="268" fill="#4ade80" font-size="9">Lineage, audit logs, and access policies are unified — no per-workspace silos.</text>
    </svg>`,

    // Step 4: MediaStream Setup
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">MediaStream Unity Catalog Setup — 3 Catalogs</text>
      <!-- prod catalog -->
      <rect x="15" y="38" width="140" height="215" rx="4" fill="#1e293b" stroke="#4ade80"/>
      <rect x="15" y="38" width="140" height="26" rx="4" fill="#4ade80" opacity=".3"/>
      <text x="85" y="55" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="bold">prod</text>
      <text x="85" y="75" text-anchor="middle" fill="#64748b" font-size="9" font-weight="bold">schemas:</text>
      <text x="30" y="89" fill="#38bdf8" font-size="9">mediastream</text>
      <text x="30" y="102" fill="#64748b" font-size="8">  user_events_bronze</text>
      <text x="30" y="114" fill="#64748b" font-size="8">  user_events_silver</text>
      <text x="30" y="126" fill="#64748b" font-size="8">  user_events_gold</text>
      <text x="30" y="138" fill="#64748b" font-size="8">  rec_features_gold</text>
      <text x="30" y="151" fill="#38bdf8" font-size="9">content</text>
      <text x="30" y="163" fill="#64748b" font-size="8">  content_metadata</text>
      <text x="30" y="175" fill="#64748b" font-size="8">  genre_taxonomy</text>
      <text x="30" y="188" fill="#38bdf8" font-size="9">billing</text>
      <text x="30" y="200" fill="#64748b" font-size="8">  subscriptions</text>
      <text x="30" y="212" fill="#64748b" font-size="8">  payment_events</text>
      <text x="85" y="237" text-anchor="middle" fill="#64748b" font-size="8">847 tables total</text>
      <text x="85" y="249" text-anchor="middle" fill="#64748b" font-size="8">read: analysts, ML</text>
      <!-- dev catalog -->
      <rect x="170" y="38" width="140" height="215" rx="4" fill="#1e293b" stroke="#fbbf24"/>
      <rect x="170" y="38" width="140" height="26" rx="4" fill="#fbbf24" opacity=".3"/>
      <text x="240" y="55" text-anchor="middle" fill="#fbbf24" font-size="11" font-weight="bold">dev</text>
      <text x="240" y="75" text-anchor="middle" fill="#64748b" font-size="9" font-weight="bold">schemas:</text>
      <text x="185" y="89" fill="#38bdf8" font-size="9">mediastream_exp</text>
      <text x="185" y="102" fill="#64748b" font-size="8">  feature_v3_candidate</text>
      <text x="185" y="114" fill="#64748b" font-size="8">  user_events_test</text>
      <text x="185" y="127" fill="#38bdf8" font-size="9">ml_sandbox</text>
      <text x="185" y="140" fill="#64748b" font-size="8">  model_eval_runs</text>
      <text x="185" y="152" fill="#64748b" font-size="8">  ab_test_results</text>
      <text x="185" y="165" fill="#38bdf8" font-size="9">data_quality</text>
      <text x="185" y="178" fill="#64748b" font-size="8">  dq_check_results</text>
      <text x="185" y="191" fill="#64748b" font-size="8">  schema_drift_log</text>
      <text x="240" y="237" text-anchor="middle" fill="#64748b" font-size="8">312 tables total</text>
      <text x="240" y="249" text-anchor="middle" fill="#64748b" font-size="8">write: engineers only</text>
      <!-- shared_governance catalog -->
      <rect x="325" y="38" width="140" height="215" rx="4" fill="#1e293b" stroke="#a855f7"/>
      <rect x="325" y="38" width="140" height="26" rx="4" fill="#a855f7" opacity=".3"/>
      <text x="395" y="55" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">shared_governance</text>
      <text x="395" y="75" text-anchor="middle" fill="#64748b" font-size="9" font-weight="bold">schemas:</text>
      <text x="340" y="89" fill="#38bdf8" font-size="9">reference</text>
      <text x="340" y="102" fill="#64748b" font-size="8">  region_codes</text>
      <text x="340" y="114" fill="#64748b" font-size="8">  country_lookup</text>
      <text x="340" y="127" fill="#38bdf8" font-size="9">security</text>
      <text x="340" y="140" fill="#64748b" font-size="8">  user_consent_flags</text>
      <text x="340" y="152" fill="#64748b" font-size="8">  gdpr_deletion_log</text>
      <text x="340" y="165" fill="#38bdf8" font-size="9">ml_registry</text>
      <text x="340" y="178" fill="#64748b" font-size="8">  model_registry</text>
      <text x="340" y="191" fill="#64748b" font-size="8">  feature_store_meta</text>
      <text x="395" y="237" text-anchor="middle" fill="#64748b" font-size="8">88 tables total</text>
      <text x="395" y="249" text-anchor="middle" fill="#64748b" font-size="8">read: all teams</text>
    </svg>`,

    // Step 5: UC vs Hive
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Unity Catalog vs Legacy Hive Metastore</text>
      <!-- Table comparison -->
      <rect x="15" y="35" width="450" height="220" rx="4" fill="#1e293b" stroke="#334155"/>
      <!-- Header -->
      <text x="185" y="53" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">Hive Metastore</text>
      <text x="380" y="53" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">Unity Catalog</text>
      <line x1="15" y1="58" x2="465" y2="58" stroke="#334155"/>
      <!-- Scope -->
      <text x="30" y="74" fill="#64748b" font-size="9" font-weight="bold">Scope</text>
      <text x="185" y="74" text-anchor="middle" fill="#ef4444" font-size="9">Per workspace (siloed)</text>
      <text x="380" y="74" text-anchor="middle" fill="#4ade80" font-size="9">Org-wide (all workspaces)</text>
      <line x1="15" y1="80" x2="465" y2="80" stroke="#334155" stroke-dasharray="2,4"/>
      <!-- ACL -->
      <text x="30" y="96" fill="#64748b" font-size="9" font-weight="bold">Access Control</text>
      <text x="185" y="96" text-anchor="middle" fill="#ef4444" font-size="9">Table/view level only</text>
      <text x="380" y="96" text-anchor="middle" fill="#4ade80" font-size="9">Row + column + table + catalog</text>
      <line x1="15" y1="102" x2="465" y2="102" stroke="#334155" stroke-dasharray="2,4"/>
      <!-- Lineage -->
      <text x="30" y="118" fill="#64748b" font-size="9" font-weight="bold">Lineage</text>
      <text x="185" y="118" text-anchor="middle" fill="#ef4444" font-size="9">Not captured</text>
      <text x="380" y="118" text-anchor="middle" fill="#4ade80" font-size="9">Automatic, column-level</text>
      <line x1="15" y1="124" x2="465" y2="124" stroke="#334155" stroke-dasharray="2,4"/>
      <!-- Audit -->
      <text x="30" y="140" fill="#64748b" font-size="9" font-weight="bold">Audit logs</text>
      <text x="185" y="140" text-anchor="middle" fill="#ef4444" font-size="9">S3 access logs only</text>
      <text x="380" y="140" text-anchor="middle" fill="#4ade80" font-size="9">system.access.audit (SQL)</text>
      <line x1="15" y1="146" x2="465" y2="146" stroke="#334155" stroke-dasharray="2,4"/>
      <!-- Delta Sharing -->
      <text x="30" y="162" fill="#64748b" font-size="9" font-weight="bold">Data Sharing</text>
      <text x="185" y="162" text-anchor="middle" fill="#ef4444" font-size="9">Manual S3 bucket share</text>
      <text x="380" y="162" text-anchor="middle" fill="#4ade80" font-size="9">Delta Sharing (open protocol)</text>
      <line x1="15" y1="168" x2="465" y2="168" stroke="#334155" stroke-dasharray="2,4"/>
      <!-- Data discovery -->
      <text x="30" y="184" fill="#64748b" font-size="9" font-weight="bold">Discovery</text>
      <text x="185" y="184" text-anchor="middle" fill="#ef4444" font-size="9">No search / tagging</text>
      <text x="380" y="184" text-anchor="middle" fill="#4ade80" font-size="9">Tags, search, descriptions</text>
      <line x1="15" y1="190" x2="465" y2="190" stroke="#334155" stroke-dasharray="2,4"/>
      <!-- Migration -->
      <text x="30" y="206" fill="#64748b" font-size="9" font-weight="bold">Multi-cloud</text>
      <text x="185" y="206" text-anchor="middle" fill="#ef4444" font-size="9">No cross-cloud support</text>
      <text x="380" y="206" text-anchor="middle" fill="#4ade80" font-size="9">AWS + Azure + GCP</text>
      <text x="240" y="245" text-anchor="middle" fill="#fbbf24" font-size="9">MediaStream migrated 1,247 tables from Hive to UC in Q1 2024 — zero downtime via SYNC</text>
    </svg>`,
  ];

  function _buildDiagram(si) { return DIAGRAMS[si] || DIAGRAMS[0]; }

  function _updateStep(el, si) {
    el.querySelectorAll('.ua-pill').forEach((pill, idx) => {
      pill.classList.toggle('active', idx === si);
      pill.classList.toggle('visited', idx < si);
    });
    const diagram = el.querySelector('#ua-diagram');
    if (diagram) diagram.innerHTML = _buildDiagram(si);
    const s = STEPS[si];
    const t = el.querySelector('#ua-info-title');
    const b = el.querySelector('#ua-info-body');
    const d = el.querySelector('#ua-info-detail');
    if (t) t.textContent = s.label;
    if (b) b.textContent = s.desc;
    if (d) d.textContent = s.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="ua-pill${i === 0 ? ' active' : ''}" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
<style>
.ua-page { display:flex; flex-direction:column; gap:16px; padding:16px; }
.ua-pills { display:flex; flex-wrap:wrap; gap:6px; }
.ua-pill {
  padding:4px 12px; border-radius:20px; border:1px solid var(--border);
  background:var(--surface); color:var(--text-muted); font-size:11px;
  cursor:pointer; transition:all .2s;
}
.ua-pill.active { border-color:var(--unity); color:var(--unity); background:rgba(168,85,247,.1); }
.ua-pill.visited { border-color:var(--border); color:var(--text-muted); opacity:.6; }
.ua-pill:hover { border-color:var(--unity); color:var(--unity); }
.ua-layout { display:grid; grid-template-columns:1fr 280px; gap:16px; }
.ua-diagram-wrap { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:8px; }
.ua-diagram-wrap svg { width:100%; height:auto; }
.ua-info { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:16px; display:flex; flex-direction:column; gap:8px; }
.ua-info-title { font-size:16px; font-weight:600; color:var(--unity); }
.ua-info-body { font-size:13px; color:var(--text); }
.ua-info-detail { font-size:12px; color:var(--text-muted); line-height:1.6; }
.ua-badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:11px; background:rgba(168,85,247,.15); color:var(--unity); border:1px solid rgba(168,85,247,.3); }
@media(max-width:720px){ .ua-layout{ grid-template-columns:1fr; } }
</style>
<div class="ua-page page-enter">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
    <h2 style="font-size:20px;font-weight:700;color:var(--text);margin:0;">UC Architecture</h2>
    <span class="ua-badge">Unity Catalog</span>
    <span style="color:var(--text-muted);font-size:12px;">MediaStream: 1,247 tables governed across 3 workspaces from one metastore</span>
  </div>
  <div class="ua-pills">${pills}</div>
  <div class="ua-layout">
    <div class="ua-diagram-wrap"><div id="ua-diagram">${_buildDiagram(0)}</div></div>
    <div class="ua-info">
      <div class="ua-info-title" id="ua-info-title">${STEPS[0].label}</div>
      <div class="ua-info-body" id="ua-info-body">${STEPS[0].desc}</div>
      <div class="ua-info-detail" id="ua-info-detail">${STEPS[0].detail}</div>
    </div>
  </div>
</div>`;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'ua-page page-enter';
    page.innerHTML = _buildHTML();
    container.appendChild(page);

    _engine = new IV.AnimationEngine({
      steps: STEPS.map((s, i) => ({
        label: s.label,
        description: s.desc,
        duration: 2000,
        enter(ctx) { const si = i; _updateStep(ctx.el, si); },
      })),
    });
    _engine.setContext({ el: container });
    container.querySelectorAll('.ua-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['uc-architecture'] = {
    id: 'uc-architecture', title: 'UC Architecture', group: 'Unity Catalog',
    render: _render,
    destroy() { if (_engine) { _engine.destroy(); _engine = null; } IV.AnimationControls.hide(); },
  };
})();
