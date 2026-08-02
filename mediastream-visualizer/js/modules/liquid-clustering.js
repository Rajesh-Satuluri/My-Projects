(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Problem',
      desc: 'Why static partitioning breaks at scale',
      detail: 'Static partitioning by event_date works until data distribution becomes uneven. Problems: (1) Over-partitioning — user_id partitions create 180M directories, each with tiny files. (2) Partition skew — Super Bowl night creates 4× the normal partition size. (3) Static columns — once partitioned by event_date you can\'t also efficiently cluster by user_id. (4) Maintenance tax — adding a partition column requires full table rewrite via REPLACE TABLE CTAS.',
    },
    {
      label: 'What is it',
      desc: 'Liquid Clustering replaces partitions + Z-ORDER',
      detail: 'Liquid Clustering (introduced in Delta Lake 3.1) is an adaptive file layout strategy. Instead of static partitions or manual Z-ORDER, you declare CLUSTER BY (col1, col2) and Delta automatically reorganizes files during each OPTIMIZE run. Key properties: (1) Incremental — only reorganizes new/changed files, not the whole table. (2) Multi-column — clusters on multiple dimensions simultaneously. (3) Zero-maintenance — no manual OPTIMIZE WITH ZORDER, just run OPTIMIZE.',
    },
    {
      label: 'How it Works',
      desc: 'Incremental clustering during OPTIMIZE',
      detail: 'Liquid Clustering uses a Hilbert space-filling curve (same as Z-Order) to assign each row a 1D clustering key based on the CLUSTER BY columns. During OPTIMIZE, Delta identifies files that don\'t conform to the current clustering and rewrites them incrementally — only changed or unclustered files are rewritten. This means the first OPTIMIZE is expensive, but subsequent runs are cheap. The clustering state is tracked per-file in the transaction log.',
    },
    {
      label: 'Syntax',
      desc: 'CREATE TABLE and ALTER TABLE CLUSTER BY',
      detail: 'Create a new clustered table with CLUSTER BY, or migrate an existing table with ALTER TABLE. After declaring clustering, run OPTIMIZE to apply it incrementally. DESCRIBE DETAIL shows the clusteringColumns field. To remove clustering: ALTER TABLE t CLUSTER BY NONE. Important: Liquid Clustering is incompatible with partition-based writes — if you currently write with partitionBy(), you must stop or migrate the write path first.',
    },
    {
      label: 'vs Partitions',
      desc: 'Partition + Z-ORDER vs Liquid Clustering comparison',
      detail: 'Partitions: fast for low-cardinality, time-based queries; require full CTAS rewrite to change; cause small-file problems with high cardinality; must choose ONE partition column. Z-ORDER: works alongside partitions; must re-run on entire partition after each write; expensive full-partition rewrite. Liquid Clustering: handles high-cardinality columns; incremental reorganization; multi-column without overhead; easy to change clustering columns with ALTER TABLE. MediaStream target: migrate silver.user_events in Q2 2025.',
    },
    {
      label: 'Migration',
      desc: 'Migrating silver.user_events at MediaStream',
      detail: 'MediaStream Q2 2025 migration plan for silver.user_events (2.1TB, event_date partitioned): Step 1 — ALTER TABLE silver.user_events CLUSTER BY (user_id, event_date, content_id). Step 2 — Remove partitionBy("event_date") from all write paths. Step 3 — Run initial OPTIMIZE (one-time full rewrite, scheduled during off-peak). Step 4 — Remove ZORDER from daily OPTIMIZE jobs. Expected outcome: same query performance, 40% less OPTIMIZE time, automatic adaptation to new query patterns without DBA intervention.',
    },
  ];

  const DIAGRAMS = [
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Static Partitioning Problems</text>
      <rect x="20" y="42" width="200" height="110" rx="7" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="120" y="60" text-anchor="middle" fill="var(--text-secondary)" font-size="9" font-weight="700">Over-partitioning</text>
      <text x="120" y="76" text-anchor="middle" fill="var(--text-muted)" font-size="8">PARTITION BY user_id</text>
      <text x="120" y="90" text-anchor="middle" fill="var(--delta)" font-size="8">180M directories</text>
      <text x="120" y="104" text-anchor="middle" fill="var(--delta)" font-size="8">tiny files everywhere</text>
      <text x="120" y="118" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">48K Parquet overhead × 180M</text>
      <text x="120" y="130" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">= 8.6TB wasted metadata</text>
      <rect x="260" y="42" width="200" height="110" rx="7" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="360" y="60" text-anchor="middle" fill="var(--text-secondary)" font-size="9" font-weight="700">Partition Skew</text>
      <text x="360" y="76" text-anchor="middle" fill="var(--text-muted)" font-size="8">PARTITION BY event_date</text>
      <rect x="276" y="86" width="28" height="50" rx="3" fill="rgba(255,107,53,0.3)"/>
      <text x="290" y="144" text-anchor="middle" fill="var(--text-muted)" font-size="7">Mon</text>
      <rect x="310" y="96" width="28" height="40" rx="3" fill="rgba(255,107,53,0.3)"/>
      <text x="324" y="144" text-anchor="middle" fill="var(--text-muted)" font-size="7">Tue</text>
      <rect x="344" y="88" width="28" height="48" rx="3" fill="rgba(255,107,53,0.3)"/>
      <text x="358" y="144" text-anchor="middle" fill="var(--text-muted)" font-size="7">Wed</text>
      <rect x="378" y="70" width="28" height="66" rx="3" fill="rgba(255,107,53,0.7)"/>
      <text x="392" y="144" text-anchor="middle" fill="var(--delta)" font-size="7" font-weight="700">S.Bowl</text>
      <text x="392" y="154" text-anchor="middle" fill="var(--delta)" font-size="7">4×</text>
      <rect x="412" y="92" width="28" height="44" rx="3" fill="rgba(255,107,53,0.3)"/>
      <text x="426" y="144" text-anchor="middle" fill="var(--text-muted)" font-size="7">Fri</text>
      <rect x="20" y="168" width="200" height="80" rx="7" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="120" y="186" text-anchor="middle" fill="var(--text-secondary)" font-size="9" font-weight="700">Static Column Lock-in</text>
      <text x="120" y="202" text-anchor="middle" fill="var(--text-muted)" font-size="8">Can only partition by ONE column.</text>
      <text x="120" y="216" text-anchor="middle" fill="var(--text-muted)" font-size="8">Changing it = full table CTAS rewrite.</text>
      <text x="120" y="232" text-anchor="middle" fill="var(--delta)" font-size="8">MediaStream Q3 2023: 2.1TB rewrite,</text>
      <text x="120" y="244" text-anchor="middle" fill="var(--delta)" font-size="8">4.2h downtime to change partition col.</text>
      <rect x="260" y="168" width="200" height="80" rx="7" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="360" y="186" text-anchor="middle" fill="var(--text-secondary)" font-size="9" font-weight="700">Z-ORDER Maintenance Tax</text>
      <text x="360" y="202" text-anchor="middle" fill="var(--text-muted)" font-size="8">Must re-run OPTIMIZE ZORDER</text>
      <text x="360" y="216" text-anchor="middle" fill="var(--text-muted)" font-size="8">on entire partition after each write.</text>
      <text x="360" y="232" text-anchor="middle" fill="var(--delta)" font-size="8">Silver daily job: 2.3h wall clock</text>
      <text x="360" y="244" text-anchor="middle" fill="var(--delta)" font-size="8">re-ordering 284K files</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Liquid Clustering: Key Properties</text>
      <rect x="20" y="42" width="440" height="50" rx="7" fill="rgba(255,107,53,0.1)" stroke="var(--delta)" stroke-width="1.5"/>
      <text x="240" y="60" text-anchor="middle" fill="var(--delta)" font-size="10" font-weight="700">CLUSTER BY (user_id, event_date, content_id)</text>
      <text x="240" y="78" text-anchor="middle" fill="var(--text-muted)" font-size="8.5">Declare clustering columns — Delta handles the rest automatically</text>
      <rect x="20" y="106" width="130" height="90" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="85" y="124" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">Incremental</text>
      <text x="85" y="140" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Only rewrites new /</text>
      <text x="85" y="153" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">unclustered files.</text>
      <text x="85" y="166" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Subsequent OPTIMIZEs</text>
      <text x="85" y="179" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">are fast &amp; cheap.</text>
      <rect x="165" y="106" width="150" height="90" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="240" y="124" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">Multi-Column</text>
      <text x="240" y="140" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Clusters on several</text>
      <text x="240" y="153" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">dimensions at once using</text>
      <text x="240" y="166" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Hilbert space-filling curve.</text>
      <text x="240" y="179" text-anchor="middle" fill="var(--delta)" font-size="7.5">No partition column limit.</text>
      <rect x="330" y="106" width="130" height="90" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="395" y="124" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">Zero Maintenance</text>
      <text x="395" y="140" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Just run OPTIMIZE.</text>
      <text x="395" y="153" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">No ZORDER keyword.</text>
      <text x="395" y="166" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Change clustering cols</text>
      <text x="395" y="179" text-anchor="middle" fill="var(--delta)" font-size="7.5">with ALTER TABLE anytime.</text>
      <rect x="20" y="212" width="440" height="60" rx="6" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="30" y="230" fill="var(--text-muted)" font-size="8" font-weight="700">Delta Lake 3.1+ · Available in Databricks Runtime 13.3 LTS+</text>
      <text x="30" y="246" fill="var(--text-muted)" font-size="8">Replaces: PARTITION BY (static) + OPTIMIZE … ZORDER BY (manual)</text>
      <text x="30" y="262" fill="var(--delta)" font-size="8">MediaStream target: migrate silver.user_events in Q2 2025 → 40% faster daily OPTIMIZE</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">How Liquid Clustering Works</text>
      <text x="240" y="46" text-anchor="middle" fill="var(--text-muted)" font-size="9">Each OPTIMIZE run incrementally reorganizes unclustered files</text>
      <rect x="20" y="60" width="86" height="60" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="63" y="78" text-anchor="middle" fill="var(--text-secondary)" font-size="8" font-weight="700">New Write</text>
      <text x="63" y="93" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Random file layout</text>
      <text x="63" y="107" text-anchor="middle" fill="var(--delta)" font-size="7.5">tagged: unclustered</text>
      <defs><marker id="alc" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L7,2.5 z" fill="var(--delta)"/></marker></defs>
      <path d="M106 90 L130 90" stroke="var(--delta)" stroke-width="1.3" marker-end="url(#alc)" fill="none"/>
      <rect x="130" y="60" width="100" height="60" rx="6" fill="rgba(255,107,53,0.1)" stroke="var(--delta)" stroke-width="1.5"/>
      <text x="180" y="78" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">OPTIMIZE</text>
      <text x="180" y="93" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Compute Hilbert key</text>
      <text x="180" y="107" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">per unclustered file</text>
      <path d="M230 90 L254 90" stroke="var(--delta)" stroke-width="1.3" marker-end="url(#alc)" fill="none"/>
      <rect x="254" y="60" width="100" height="60" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="304" y="78" text-anchor="middle" fill="var(--text-secondary)" font-size="8" font-weight="700">Sort &amp; Rewrite</text>
      <text x="304" y="93" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Only unclustered files</text>
      <text x="304" y="107" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Already-clustered = skip</text>
      <path d="M354 90 L378 90" stroke="var(--delta)" stroke-width="1.3" marker-end="url(#alc)" fill="none"/>
      <rect x="378" y="60" width="82" height="60" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="419" y="78" text-anchor="middle" fill="var(--text-secondary)" font-size="8" font-weight="700">Clustered File</text>
      <text x="419" y="93" text-anchor="middle" fill="var(--delta)" font-size="7.5">tagged: clustered</text>
      <text x="419" y="107" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Min/max stats tight</text>
      <rect x="20" y="144" width="440" height="120" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="240" y="162" text-anchor="middle" fill="var(--text-muted)" font-size="8.5" font-weight="700">Hilbert Curve: 2D → 1D locality</text>
      <text x="30" y="180" fill="var(--text-muted)" font-size="8">user_id axis →</text>
      <text x="30" y="196" fill="var(--text-muted)" font-size="8">Rows nearby in</text>
      <text x="30" y="210" fill="var(--text-muted)" font-size="8">(user_id, event_date)</text>
      <text x="30" y="224" fill="var(--text-muted)" font-size="8">2D space end up</text>
      <text x="30" y="238" fill="var(--text-muted)" font-size="8">nearby in the same</text>
      <text x="30" y="252" fill="var(--delta)" font-size="8">Parquet file.</text>
      <rect x="160" y="165" width="140" height="86" rx="4" fill="var(--bg-4)"/>
      <text x="176" y="184" fill="var(--delta)" font-size="7.5">File A: user 1-50K, Jan</text>
      <text x="176" y="198" fill="var(--delta)" font-size="7.5">File B: user 1-50K, Feb</text>
      <text x="176" y="212" fill="var(--delta)" font-size="7.5">File C: user 50K-100K, Jan</text>
      <text x="176" y="226" fill="var(--delta)" font-size="7.5">File D: user 50K-100K, Feb</text>
      <text x="176" y="243" fill="var(--text-muted)" font-size="7">Tight min/max → max skipping</text>
      <text x="360" y="184" fill="var(--text-muted)" font-size="7.5">First OPTIMIZE:</text>
      <text x="360" y="198" fill="var(--text-muted)" font-size="7.5">rewrites all files</text>
      <text x="360" y="214" fill="var(--text-muted)" font-size="7.5">Subsequent runs:</text>
      <text x="360" y="228" fill="var(--delta)" font-size="7.5">only new files</text>
      <text x="360" y="242" fill="var(--delta)" font-size="7.5">incremental &amp; fast</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Liquid Clustering Syntax</text>
      <rect x="14" y="36" width="452" height="224" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="56" fill="var(--text-muted)" font-size="8" font-weight="700">-- Create new table with clustering</text>
      <text x="24" y="70" fill="var(--delta)" font-size="8.5">CREATE TABLE silver.user_events (</text>
      <text x="24" y="84" fill="var(--delta)" font-size="8.5">  user_id STRING, event_date DATE, content_id STRING, ...)</text>
      <text x="24" y="98" fill="var(--delta)" font-size="8.5">USING DELTA CLUSTER BY (user_id, event_date);</text>
      <text x="24" y="114" fill="var(--text-muted)" font-size="8" font-weight="700">-- Migrate existing partitioned table</text>
      <text x="24" y="128" fill="var(--delta)" font-size="8.5">ALTER TABLE silver.user_events CLUSTER BY (user_id, event_date);</text>
      <text x="24" y="144" fill="var(--text-muted)" font-size="8" font-weight="700">-- Apply clustering (run on schedule)</text>
      <text x="24" y="158" fill="var(--delta)" font-size="8.5">OPTIMIZE silver.user_events;  -- no ZORDER needed</text>
      <text x="24" y="174" fill="var(--text-muted)" font-size="8" font-weight="700">-- Inspect clustering configuration</text>
      <text x="24" y="188" fill="var(--delta)" font-size="8.5">DESCRIBE DETAIL silver.user_events;</text>
      <text x="24" y="202" fill="var(--text-muted)" font-size="7.5">-- clusteringColumns: [["user_id"], ["event_date"]]</text>
      <text x="24" y="218" fill="var(--text-muted)" font-size="8" font-weight="700">-- Remove clustering</text>
      <text x="24" y="232" fill="var(--delta)" font-size="8.5">ALTER TABLE silver.user_events CLUSTER BY NONE;</text>
      <text x="240" y="276" text-anchor="middle" fill="var(--text-muted)" font-size="8">Requires Delta 3.1+ · Databricks Runtime 13.3 LTS+</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="24" text-anchor="middle" fill="var(--delta)" font-size="12" font-weight="700">Partitions + Z-ORDER vs Liquid Clustering</text>
      <rect x="14" y="36" width="220" height="230" rx="7" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="124" y="54" text-anchor="middle" fill="var(--text-secondary)" font-size="9" font-weight="700">PARTITION + Z-ORDER</text>
      <text x="24" y="72" fill="var(--text-muted)" font-size="7.5">Setup</text>
      <text x="24" y="84" fill="var(--text-secondary)" font-size="7.5">partitionBy("event_date") + ZORDER BY</text>
      <line x1="24" y1="92" x2="224" y2="92" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <text x="24" y="107" fill="var(--text-muted)" font-size="7.5">Cardinality</text>
      <text x="24" y="119" fill="var(--delta)" font-size="7.5">Low only (date, region, status)</text>
      <line x1="24" y1="127" x2="224" y2="127" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <text x="24" y="142" fill="var(--text-muted)" font-size="7.5">Change columns</text>
      <text x="24" y="154" fill="var(--delta)" font-size="7.5">Full CTAS rewrite required</text>
      <line x1="24" y1="162" x2="224" y2="162" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <text x="24" y="177" fill="var(--text-muted)" font-size="7.5">OPTIMIZE cost</text>
      <text x="24" y="189" fill="var(--delta)" font-size="7.5">Full partition each time</text>
      <line x1="24" y1="197" x2="224" y2="197" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <text x="24" y="212" fill="var(--text-muted)" font-size="7.5">Multi-column</text>
      <text x="24" y="224" fill="var(--delta)" font-size="7.5">1 partition + Z-ORDER cols</text>
      <line x1="24" y1="232" x2="224" y2="232" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <text x="24" y="247" fill="var(--text-muted)" font-size="7.5">Skew handling</text>
      <text x="24" y="259" fill="var(--delta)" font-size="7.5">Manual AQE tuning needed</text>
      <rect x="246" y="36" width="220" height="230" rx="7" fill="rgba(255,107,53,0.06)" stroke="var(--delta)" stroke-width="1.5"/>
      <text x="356" y="54" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">LIQUID CLUSTERING</text>
      <text x="256" y="72" fill="var(--text-muted)" font-size="7.5">Setup</text>
      <text x="256" y="84" fill="var(--delta)" font-size="7.5">CLUSTER BY (col1, col2, col3)</text>
      <line x1="256" y1="92" x2="456" y2="92" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <text x="256" y="107" fill="var(--text-muted)" font-size="7.5">Cardinality</text>
      <text x="256" y="119" fill="var(--delta)" font-size="7.5">Any — high or low OK</text>
      <line x1="256" y1="127" x2="456" y2="127" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <text x="256" y="142" fill="var(--text-muted)" font-size="7.5">Change columns</text>
      <text x="256" y="154" fill="var(--delta)" font-size="7.5">ALTER TABLE — no rewrite</text>
      <line x1="256" y1="162" x2="456" y2="162" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <text x="256" y="177" fill="var(--text-muted)" font-size="7.5">OPTIMIZE cost</text>
      <text x="256" y="189" fill="var(--delta)" font-size="7.5">Incremental — only new files</text>
      <line x1="256" y1="197" x2="456" y2="197" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <text x="256" y="212" fill="var(--text-muted)" font-size="7.5">Multi-column</text>
      <text x="256" y="224" fill="var(--delta)" font-size="7.5">Unlimited clustering columns</text>
      <line x1="256" y1="232" x2="456" y2="232" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <text x="256" y="247" fill="var(--text-muted)" font-size="7.5">Skew handling</text>
      <text x="256" y="259" fill="var(--delta)" font-size="7.5">Automatic via Hilbert curve</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">MediaStream: Migration Plan Q2 2025</text>
      <rect x="14" y="38" width="452" height="220" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="56" fill="var(--text-muted)" font-size="8" font-weight="700">TARGET TABLE: silver.user_events  (2.1TB, 847M rows, event_date partitioned)</text>
      <rect x="24" y="64" width="18" height="18" rx="9" fill="var(--delta)"/>
      <text x="33" y="77" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">1</text>
      <text x="52" y="77" fill="var(--delta)" font-size="8">ALTER TABLE silver.user_events CLUSTER BY (user_id, event_date, content_id);</text>
      <rect x="24" y="90" width="18" height="18" rx="9" fill="var(--delta)"/>
      <text x="33" y="103" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">2</text>
      <text x="52" y="103" fill="var(--text-muted)" font-size="8">Remove partitionBy("event_date") from all 12 streaming write paths</text>
      <rect x="24" y="116" width="18" height="18" rx="9" fill="var(--delta)"/>
      <text x="33" y="129" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">3</text>
      <text x="52" y="129" fill="var(--text-muted)" font-size="8">Initial OPTIMIZE (off-peak, one-time full rewrite — ~3h estimated)</text>
      <rect x="24" y="142" width="18" height="18" rx="9" fill="var(--delta)"/>
      <text x="33" y="155" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">4</text>
      <text x="52" y="155" fill="var(--text-muted)" font-size="8">Remove ZORDER BY from daily OPTIMIZE jobs — just OPTIMIZE now</text>
      <rect x="24" y="168" width="18" height="18" rx="9" fill="var(--delta)"/>
      <text x="33" y="181" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">5</text>
      <text x="52" y="181" fill="var(--text-muted)" font-size="8">Monitor via DESCRIBE DETAIL — verify clusteringColumns populated</text>
      <line x1="24" y1="200" x2="452" y2="200" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <text x="24" y="216" fill="var(--text-muted)" font-size="8" font-weight="700">Expected outcomes:</text>
      <text x="24" y="230" fill="var(--delta)" font-size="8">Daily OPTIMIZE time: 2.3h → ~1.4h  (40% faster, incremental-only)</text>
      <text x="24" y="244" fill="var(--delta)" font-size="8">Query file skip: 94% (same as Z-ORDER, no regression)</text>
      <text x="24" y="258" fill="var(--delta)" font-size="8">No DBA intervention needed when query patterns change</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    el.querySelectorAll('.lc-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.lc-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.lc-info');
    if (info) info.textContent = STEPS[si].detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="lc-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="lc-header module-header">
        <div>
          <div class="module-tag" style="background:var(--delta)">DELTA CORE</div>
          <h2 class="module-title">Liquid Clustering</h2>
          <p class="module-subtitle">Delta 3.1+ adaptive file layout — replaces static partitioning and Z-ORDER with automatic, incremental clustering</p>
        </div>
      </div>
      <div class="lc-pills step-pills">${pills}</div>
      <div class="lc-diagram diagram-frame"></div>
      <div class="lc-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'lc-page page-enter';
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
    container.querySelectorAll('.lc-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['liquid-clustering'] = {
    id: 'liquid-clustering', title: 'Liquid Clustering', group: 'Delta Lake Core',
    render: _render,
    destroy() { if (_engine) { _engine.destroy(); _engine = null; } IV.AnimationControls.hide(); },
  };
})();
