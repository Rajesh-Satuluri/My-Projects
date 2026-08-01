(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Metastore Overview',
      desc: 'The metastore is the top-level governance object in Unity Catalog — one per Databricks account region.',
      detail: 'A metastore holds all metadata: catalogs, schemas, tables, volumes, functions, and credentials. MediaStream runs one metastore per AWS region (us-east-1 primary, eu-west-1 secondary).',
    },
    {
      label: 'Storage Credential',
      desc: 'Storage credentials are IAM roles that UC uses to authenticate to cloud storage on behalf of principals.',
      detail: 'Instead of giving Databricks notebooks direct S3 credentials, UC brokers access. MediaStream uses an IAM role `arn:aws:iam::123456789:role/uc-storage-cred` with S3 read/write on `s3://mediastream-delta-*`.',
    },
    {
      label: 'External Location',
      desc: 'External locations bind a storage path to a credential — creating a named, audited access point.',
      detail: 'MediaStream registers 4 external locations: bronze-raw, silver-processed, gold-aggregated, ml-features. All Delta tables managed through these paths get automatic audit logging and lineage.',
    },
    {
      label: 'Managed vs External Tables',
      desc: 'Managed tables: UC owns lifecycle. External tables: you own the data, UC manages metadata.',
      detail: 'MediaStream uses managed tables for Gold + ML layers (DROP TABLE deletes data — intended) and external tables for Bronze/Silver (data outlives any one workspace, survives DROP TABLE).',
    },
    {
      label: 'System Schemas',
      desc: 'UC ships built-in system schemas under `system.*` — audit logs, lineage, billing, information schema.',
      detail: 'MediaStream queries `system.access.audit` for compliance, `system.lineage.column_lineage` for GDPR impact, and `system.billing.usage` for chargeback to BU teams. No setup required — enabled by default.',
    },
    {
      label: 'Single-Org Governance',
      desc: 'One metastore, three workspaces, zero data silos — all governed from a single control plane.',
      detail: 'The MediaStream data org manages permissions centrally in the metastore. Engineers in workspace A cannot see tables from workspace B unless explicitly GRANTed. Cross-workspace sharing uses Delta Sharing — no data copies.',
    },
  ];

  const DIAGRAMS = [
    // Step 0: Metastore overview
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <defs>
        <linearGradient id="mt-g0" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a855f7"/>
          <stop offset="100%" stop-color="#7c3aed"/>
        </linearGradient>
      </defs>
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <!-- Metastore box -->
      <rect x="140" y="18" width="200" height="44" rx="6" fill="url(#mt-g0)" opacity="0.9"/>
      <text x="240" y="36" text-anchor="middle" fill="white" font-size="11" font-weight="bold">METASTORE</text>
      <text x="240" y="52" text-anchor="middle" fill="#e9d5ff" font-size="9">us-east-1 · account: mediastream</text>
      <!-- Three catalogs -->
      <rect x="30" y="96" width="120" height="36" rx="5" fill="#1e293b" stroke="#a855f7" stroke-width="1.5"/>
      <text x="90" y="112" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">prod</text>
      <text x="90" y="126" text-anchor="middle" fill="#94a3b8" font-size="8">catalog</text>
      <rect x="180" y="96" width="120" height="36" rx="5" fill="#1e293b" stroke="#a855f7" stroke-width="1.5"/>
      <text x="240" y="112" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">dev</text>
      <text x="240" y="126" text-anchor="middle" fill="#94a3b8" font-size="8">catalog</text>
      <rect x="330" y="96" width="120" height="36" rx="5" fill="#1e293b" stroke="#a855f7" stroke-width="1.5"/>
      <text x="390" y="112" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">shared_governance</text>
      <text x="390" y="126" text-anchor="middle" fill="#94a3b8" font-size="8">catalog</text>
      <!-- Lines from metastore to catalogs -->
      <line x1="240" y1="62" x2="90" y2="96" stroke="#a855f7" stroke-width="1" opacity="0.5"/>
      <line x1="240" y1="62" x2="240" y2="96" stroke="#a855f7" stroke-width="1" opacity="0.5"/>
      <line x1="240" y1="62" x2="390" y2="96" stroke="#a855f7" stroke-width="1" opacity="0.5"/>
      <!-- What it holds -->
      <text x="240" y="162" text-anchor="middle" fill="#94a3b8" font-size="9">Metastore holds:</text>
      <rect x="44" y="172" width="96" height="18" rx="3" fill="#1e293b" stroke="#475569" stroke-width="1"/>
      <text x="92" y="185" text-anchor="middle" fill="#e2e8f0" font-size="8">Tables &amp; Views</text>
      <rect x="152" y="172" width="96" height="18" rx="3" fill="#1e293b" stroke="#475569" stroke-width="1"/>
      <text x="200" y="185" text-anchor="middle" fill="#e2e8f0" font-size="8">Credentials</text>
      <rect x="260" y="172" width="96" height="18" rx="3" fill="#1e293b" stroke="#475569" stroke-width="1"/>
      <text x="308" y="185" text-anchor="middle" fill="#e2e8f0" font-size="8">Ext Locations</text>
      <rect x="368" y="172" width="76" height="18" rx="3" fill="#1e293b" stroke="#475569" stroke-width="1"/>
      <text x="406" y="185" text-anchor="middle" fill="#e2e8f0" font-size="8">Lineage</text>
      <!-- Region note -->
      <rect x="110" y="210" width="260" height="34" rx="5" fill="#1e293b" stroke="#fbbf24" stroke-width="1"/>
      <text x="240" y="224" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">1 metastore per account region</text>
      <text x="240" y="238" text-anchor="middle" fill="#94a3b8" font-size="8">MediaStream: us-east-1 primary · eu-west-1 DR</text>
      <!-- Workspaces row -->
      <text x="240" y="265" text-anchor="middle" fill="#64748b" font-size="8">3 workspaces attached: prod-analytics · data-science · data-engineering</text>
    </svg>`,

    // Step 1: Storage credential
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="22" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">STORAGE CREDENTIAL</text>
      <!-- Old way -->
      <rect x="20" y="36" width="200" height="110" rx="6" fill="#1e293b" stroke="#ef4444" stroke-width="1.5"/>
      <text x="120" y="54" text-anchor="middle" fill="#ef4444" font-size="10" font-weight="bold">Without UC (risky)</text>
      <rect x="30" y="62" width="180" height="24" rx="3" fill="#0f172a"/>
      <text x="120" y="75" text-anchor="middle" fill="#fbbf24" font-size="8">spark.conf.set(</text>
      <text x="120" y="87" text-anchor="middle" fill="#fbbf24" font-size="7">  "fs.s3a.access.key","AK...")</text>
      <text x="120" y="104" text-anchor="middle" fill="#ef4444" font-size="8">⚠ Creds in notebook code</text>
      <text x="120" y="118" text-anchor="middle" fill="#ef4444" font-size="8">⚠ No audit trail</text>
      <text x="120" y="132" text-anchor="middle" fill="#ef4444" font-size="8">⚠ Over-privileged</text>
      <!-- New way -->
      <rect x="260" y="36" width="200" height="110" rx="6" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="360" y="54" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">With UC (secure)</text>
      <rect x="270" y="62" width="180" height="24" rx="3" fill="#0f172a"/>
      <text x="360" y="75" text-anchor="middle" fill="#4ade80" font-size="8">CREATE STORAGE CREDENTIAL</text>
      <text x="360" y="87" text-anchor="middle" fill="#4ade80" font-size="7">  mediastream_s3_cred</text>
      <text x="360" y="104" text-anchor="middle" fill="#4ade80" font-size="8">✓ IAM role assumption</text>
      <text x="360" y="118" text-anchor="middle" fill="#4ade80" font-size="8">✓ Every access audited</text>
      <text x="360" y="132" text-anchor="middle" fill="#4ade80" font-size="8">✓ Least-privilege</text>
      <!-- Arrow -->
      <text x="240" y="98" text-anchor="middle" fill="#a855f7" font-size="18">→</text>
      <!-- IAM role box -->
      <rect x="80" y="166" width="320" height="50" rx="6" fill="#1e293b" stroke="#a855f7" stroke-width="1"/>
      <text x="240" y="183" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">IAM Role (brokered by UC)</text>
      <text x="240" y="198" text-anchor="middle" fill="#94a3b8" font-size="8">arn:aws:iam::123456789:role/uc-storage-cred</text>
      <text x="240" y="210" text-anchor="middle" fill="#94a3b8" font-size="8">S3 policy: s3://mediastream-delta-* read/write</text>
      <!-- Flow -->
      <text x="60" y="246" fill="#64748b" font-size="8">Principal</text>
      <line x1="100" y1="248" x2="148" y2="248" stroke="#475569" stroke-width="1" marker-end="url(#arr)"/>
      <text x="154" y="246" fill="#a855f7" font-size="8">UC checks GRANT</text>
      <line x1="234" y1="248" x2="282" y2="248" stroke="#475569" stroke-width="1" marker-end="url(#arr)"/>
      <text x="288" y="246" fill="#4ade80" font-size="8">IAM role assumed</text>
      <line x1="370" y1="248" x2="418" y2="248" stroke="#475569" stroke-width="1" marker-end="url(#arr)"/>
      <text x="424" y="246" fill="#38bdf8" font-size="8">S3</text>
      <text x="240" y="276" text-anchor="middle" fill="#64748b" font-size="8">No user ever holds raw S3 credentials</text>
    </svg>`,

    // Step 2: External location
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">EXTERNAL LOCATIONS</text>
      <!-- SQL create -->
      <rect x="20" y="30" width="440" height="54" rx="5" fill="#1e293b"/>
      <text x="30" y="46" fill="#a855f7" font-size="9" font-weight="bold">CREATE EXTERNAL LOCATION bronze_raw</text>
      <text x="30" y="60" fill="#94a3b8" font-size="9">  URL = 's3://mediastream-delta-bronze/'</text>
      <text x="30" y="74" fill="#94a3b8" font-size="9">  WITH (STORAGE CREDENTIAL mediastream_s3_cred);</text>
      <!-- 4 locations -->
      <rect x="20" y="98" width="100" height="54" rx="5" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="70" y="116" text-anchor="middle" fill="#ff6b35" font-size="9" font-weight="bold">bronze_raw</text>
      <text x="70" y="130" text-anchor="middle" fill="#94a3b8" font-size="7">s3://…-bronze/</text>
      <text x="70" y="142" text-anchor="middle" fill="#64748b" font-size="7">2.4B evt/day</text>

      <rect x="130" y="98" width="100" height="54" rx="5" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5"/>
      <text x="180" y="116" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">silver_proc</text>
      <text x="180" y="130" text-anchor="middle" fill="#94a3b8" font-size="7">s3://…-silver/</text>
      <text x="180" y="142" text-anchor="middle" fill="#64748b" font-size="7">deduped+joined</text>

      <rect x="240" y="98" width="100" height="54" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="290" y="116" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">gold_agg</text>
      <text x="290" y="130" text-anchor="middle" fill="#94a3b8" font-size="7">s3://…-gold/</text>
      <text x="290" y="142" text-anchor="middle" fill="#64748b" font-size="7">aggregates</text>

      <rect x="350" y="98" width="110" height="54" rx="5" fill="#1e293b" stroke="#a855f7" stroke-width="1.5"/>
      <text x="405" y="116" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">ml_features</text>
      <text x="405" y="130" text-anchor="middle" fill="#94a3b8" font-size="7">s3://…-ml/</text>
      <text x="405" y="142" text-anchor="middle" fill="#64748b" font-size="7">feature store</text>

      <!-- Benefits -->
      <rect x="20" y="166" width="440" height="78" rx="5" fill="#1e293b"/>
      <text x="240" y="182" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Benefits of External Locations</text>
      <text x="34" y="198" fill="#4ade80" font-size="8">✓ GRANT READ on bronze_raw TO group analysts</text>
      <text x="34" y="212" fill="#4ade80" font-size="8">✓ Every file access logged in system.access.audit</text>
      <text x="34" y="226" fill="#4ade80" font-size="8">✓ Tables outlive workspaces — data is durable</text>
      <text x="34" y="240" fill="#4ade80" font-size="8">✓ GDPR: UC can track all paths holding PII data</text>
    </svg>`,

    // Step 3: Managed vs External tables
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">MANAGED vs EXTERNAL TABLES</text>
      <!-- Headers -->
      <rect x="20" y="30" width="210" height="26" rx="4" fill="#a855f7" opacity="0.2"/>
      <text x="125" y="47" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">MANAGED TABLE</text>
      <rect x="250" y="30" width="210" height="26" rx="4" fill="#38bdf8" opacity="0.2"/>
      <text x="355" y="47" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="bold">EXTERNAL TABLE</text>
      <!-- Managed column -->
      <text x="30" y="74" fill="#94a3b8" font-size="8">UC owns data location</text>
      <text x="30" y="88" fill="#94a3b8" font-size="8">DROP TABLE → data deleted</text>
      <text x="30" y="102" fill="#94a3b8" font-size="8">Stored in metastore root</text>
      <text x="30" y="116" fill="#94a3b8" font-size="8">Best for: curated layers</text>
      <rect x="20" y="126" width="210" height="44" rx="4" fill="#1e293b"/>
      <text x="30" y="142" fill="#a855f7" font-size="8">CREATE TABLE prod.gold.daily_kpis</text>
      <text x="30" y="156" fill="#94a3b8" font-size="8">-- no LOCATION clause</text>
      <text x="30" y="168" fill="#94a3b8" font-size="8">-- UC picks path automatically</text>
      <!-- External column -->
      <text x="260" y="74" fill="#94a3b8" font-size="8">You own data location</text>
      <text x="260" y="88" fill="#94a3b8" font-size="8">DROP TABLE → metadata only</text>
      <text x="260" y="102" fill="#94a3b8" font-size="8">Stored in external location</text>
      <text x="260" y="116" fill="#94a3b8" font-size="8">Best for: raw/shared data</text>
      <rect x="250" y="126" width="210" height="44" rx="4" fill="#1e293b"/>
      <text x="260" y="142" fill="#38bdf8" font-size="8">CREATE TABLE prod.bronze.events</text>
      <text x="260" y="156" fill="#94a3b8" font-size="8">LOCATION 's3://…-bronze/events'</text>
      <text x="260" y="168" fill="#94a3b8" font-size="8">-- data persists after drop</text>
      <!-- Divider -->
      <line x1="240" y1="30" x2="240" y2="178" stroke="#334155" stroke-width="1" stroke-dasharray="4,2"/>
      <!-- MediaStream decision -->
      <rect x="20" y="186" width="440" height="86" rx="5" fill="#1e293b" stroke="#a855f7" stroke-width="1"/>
      <text x="240" y="202" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">MediaStream Decision Matrix</text>
      <text x="30" y="218" fill="#ff6b35" font-size="8">Bronze / Silver → EXTERNAL  (data outlives workspaces, GDPR needs raw data)</text>
      <text x="30" y="232" fill="#4ade80" font-size="8">Gold / ML      → MANAGED   (curated, UC owns lifecycle, DROP cleans up)</text>
      <text x="30" y="246" fill="#fbbf24" font-size="8">Shared views   → MANAGED   (computed on the fly, no storage duplication)</text>
      <text x="30" y="260" fill="#94a3b8" font-size="8">External tables can always be re-registered — data is the source of truth</text>
    </svg>`,

    // Step 4: System schemas
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">SYSTEM SCHEMAS</text>
      <text x="240" y="34" text-anchor="middle" fill="#64748b" font-size="8">Built-in catalog: system.* — no setup required</text>
      <!-- Three system schemas -->
      <rect x="20" y="46" width="136" height="100" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="88" y="64" text-anchor="middle" fill="#38bdf8" font-size="9" font-weight="bold">system.access</text>
      <text x="88" y="80" text-anchor="middle" fill="#94a3b8" font-size="8">audit (table)</text>
      <text x="88" y="94" text-anchor="middle" fill="#94a3b8" font-size="8">column_lineage</text>
      <text x="88" y="108" text-anchor="middle" fill="#94a3b8" font-size="8">table_lineage</text>
      <text x="88" y="122" text-anchor="middle" fill="#64748b" font-size="7">compliance + GDPR</text>
      <text x="88" y="136" text-anchor="middle" fill="#64748b" font-size="7">impact analysis</text>

      <rect x="172" y="46" width="136" height="100" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="240" y="64" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">system.billing</text>
      <text x="240" y="80" text-anchor="middle" fill="#94a3b8" font-size="8">usage (table)</text>
      <text x="240" y="94" text-anchor="middle" fill="#94a3b8" font-size="8">DBU by workspace</text>
      <text x="240" y="108" text-anchor="middle" fill="#94a3b8" font-size="8">DBU by cluster type</text>
      <text x="240" y="122" text-anchor="middle" fill="#64748b" font-size="7">chargeback to BUs</text>
      <text x="240" y="136" text-anchor="middle" fill="#64748b" font-size="7">cost optimization</text>

      <rect x="324" y="46" width="136" height="100" rx="5" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5"/>
      <text x="392" y="64" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">system.information_schema</text>
      <text x="392" y="80" text-anchor="middle" fill="#94a3b8" font-size="8">tables</text>
      <text x="392" y="94" text-anchor="middle" fill="#94a3b8" font-size="8">columns</text>
      <text x="392" y="108" text-anchor="middle" fill="#94a3b8" font-size="8">table_privileges</text>
      <text x="392" y="122" text-anchor="middle" fill="#64748b" font-size="7">catalog introspection</text>
      <text x="392" y="136" text-anchor="middle" fill="#64748b" font-size="7">privilege audits</text>

      <!-- Example query -->
      <rect x="20" y="160" width="440" height="76" rx="5" fill="#1e293b"/>
      <text x="240" y="176" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">MediaStream: compliance query</text>
      <text x="30" y="192" fill="#a855f7" font-size="8">SELECT user_identity, action_name, request_params</text>
      <text x="30" y="206" fill="#94a3b8" font-size="8">FROM system.access.audit</text>
      <text x="30" y="220" fill="#94a3b8" font-size="8">WHERE request_params LIKE '%user_id=DELETE%'</text>
      <text x="30" y="234" fill="#94a3b8" font-size="8">AND event_time &gt; CURRENT_DATE - INTERVAL 90 DAYS;</text>
      <!-- Note -->
      <text x="240" y="264" text-anchor="middle" fill="#64748b" font-size="8">Data retained 365 days · queryable with standard SQL · no ETL needed</text>
    </svg>`,

    // Step 5: Single org governance
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <defs>
        <linearGradient id="mt-g5" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a855f7"/>
          <stop offset="100%" stop-color="#7c3aed"/>
        </linearGradient>
      </defs>
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="18" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">SINGLE-ORG GOVERNANCE</text>
      <!-- Metastore top -->
      <rect x="150" y="26" width="180" height="28" rx="5" fill="url(#mt-g5)" opacity="0.9"/>
      <text x="240" y="44" text-anchor="middle" fill="white" font-size="10" font-weight="bold">METASTORE (us-east-1)</text>
      <!-- Three workspaces below -->
      <line x1="240" y1="54" x2="90" y2="88" stroke="#a855f7" stroke-width="1" opacity="0.5"/>
      <line x1="240" y1="54" x2="240" y2="88" stroke="#a855f7" stroke-width="1" opacity="0.5"/>
      <line x1="240" y1="54" x2="390" y2="88" stroke="#a855f7" stroke-width="1" opacity="0.5"/>

      <rect x="20" y="88" width="140" height="52" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="90" y="106" text-anchor="middle" fill="#38bdf8" font-size="9" font-weight="bold">prod-analytics</text>
      <text x="90" y="120" text-anchor="middle" fill="#94a3b8" font-size="7">BI · dashboards</text>
      <text x="90" y="132" text-anchor="middle" fill="#64748b" font-size="7">READ on gold.*</text>

      <rect x="170" y="88" width="140" height="52" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="240" y="106" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">data-science</text>
      <text x="240" y="120" text-anchor="middle" fill="#94a3b8" font-size="7">ML · experimentation</text>
      <text x="240" y="132" text-anchor="middle" fill="#64748b" font-size="7">READ on ml.*</text>

      <rect x="320" y="88" width="140" height="52" rx="5" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="390" y="106" text-anchor="middle" fill="#ff6b35" font-size="9" font-weight="bold">data-engineering</text>
      <text x="390" y="120" text-anchor="middle" fill="#94a3b8" font-size="7">Pipelines · ETL</text>
      <text x="390" y="132" text-anchor="middle" fill="#64748b" font-size="7">WRITE on bronze.*</text>

      <!-- Central governance note -->
      <rect x="60" y="158" width="360" height="72" rx="5" fill="#1e293b" stroke="#a855f7" stroke-width="1"/>
      <text x="240" y="174" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">Central Permission Management</text>
      <text x="74" y="190" fill="#94a3b8" font-size="8">• Permissions granted at metastore level propagate down</text>
      <text x="74" y="204" fill="#94a3b8" font-size="8">• Engineers in WS A cannot see WS B tables unless GRANTed</text>
      <text x="74" y="218" fill="#94a3b8" font-size="8">• Cross-workspace sharing → Delta Sharing (no copies)</text>
      <!-- Stats -->
      <text x="70" y="250" fill="#64748b" font-size="8">180 tables</text>
      <text x="180" y="250" fill="#64748b" font-size="8">420 users</text>
      <text x="285" y="250" fill="#64748b" font-size="8">12 groups</text>
      <text x="390" y="250" fill="#64748b" font-size="8">1 policy set</text>
      <text x="240" y="272" text-anchor="middle" fill="#64748b" font-size="7">Zero data silos · Zero credential sprawl · Full audit trail</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.mt-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--unity)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.mt-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.mt-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="mt-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="mt-header module-header">
        <div class="module-tag" style="background:var(--unity)">UNITY CATALOG</div>
        <h2 class="module-title">Metastore Architecture</h2>
        <p class="module-subtitle">The top-level governance object · one per account region</p>
      </div>
      <div class="mt-pills step-pills">${pills}</div>
      <div class="mt-diagram diagram-frame"></div>
      <div class="mt-info info-panel" style="border-left:3px solid var(--unity)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'mt-page page-enter';
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

    container.querySelectorAll('.mt-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['metastore'] = {
    id: 'metastore',
    title: 'Metastore Architecture',
    group: 'Unity Catalog',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
