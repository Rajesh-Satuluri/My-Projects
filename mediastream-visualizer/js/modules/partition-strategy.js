(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Why Partition',
      desc: 'Partitioning for data skipping and parallel processing',
      detail: 'Partitioning physically organizes data files into directory hierarchies. A partition on event_date means all data for 2024-01-15 lives in a single directory. Benefits: (1) Partition pruning — queries with WHERE event_date = \'2024-01-15\' scan only that directory, skipping 99.9%+ of data. (2) Parallel writes — different partitions can be written concurrently without conflicts. (3) Lifecycle management — old partitions can be archived or deleted atomically. MediaStream: partitioning reduces scan size from 33.6B rows to <200M on typical queries.',
    },
    {
      label: 'Partition Columns',
      desc: 'Choosing the right partition columns — cardinality and query patterns',
      detail: 'Partition column selection rules: (1) High cardinality but bounded (dates, not user_id — never partition on unbounded keys). (2) Matches query filter patterns (most queries filter on what?). (3) ~1GB+ per partition (too-small partitions create small file problem). Bad choices: user_id (180M partitions!), event_type (too few, skewed), hour (often too small). Good choices: event_date (365 partitions/year), event_year_month (12/year). MediaStream uses event_date for Bronze/Silver, no partitions for Gold (ZORDER instead).',
    },
    {
      label: 'Partition Pruning',
      desc: 'How Spark prunes partitions at query planning time',
      detail: 'Partition pruning happens at the Spark driver level, before any executor reads data. For `WHERE event_date = \'2024-01-15\'`, Spark lists only the matching directory. For `WHERE event_date BETWEEN \'2024-01-01\' AND \'2024-01-07\'`, Spark lists 7 directories. Pruning requires the filter to match the partition column exactly — expressions like `DATE_TRUNC(\'month\', event_date) = \'2024-01-01\'` may not prune. MediaStream partition pruning effectiveness: 94% of Bronze rows skipped on user-specific queries.',
    },
    {
      label: 'Partition Evolution',
      desc: 'Repartitioning an existing Delta table without full rewrite',
      detail: 'Changing partition strategy on an existing Delta table: `REPLACE TABLE AS SELECT ... PARTITIONED BY (new_col)`. This rewrites all data but is fully ACID — old table remains readable until commit. Alternatively, use `ALTER TABLE ADD PARTITION FIELD` (Delta Lake 3.x). MediaStream repartitioned bronze_ad_events from (event_year, event_month) to (event_date) in Q3 2023 — 2.1TB rewrite, 4.2h process, zero downtime (alias swap at commit time).',
    },
    {
      label: 'Partition Skew',
      desc: 'Diagnosing and fixing skewed partitions',
      detail: 'Partition skew: one partition has disproportionately more data than others. Common causes: hot dates (product launch), uneven event distribution. MediaStream Super Bowl weekend: 4× normal event_date partition size. Symptoms: single slow Spark task, memory spills. Fixes: (1) Sub-partition hot partitions (event_date + event_hour for outlier days). (2) Adaptive Query Execution (AQE) — Spark 3.x automatically splits skewed partitions. MediaStream uses AQE with `spark.sql.adaptive.skewJoin.enabled=true`.',
    },
    {
      label: 'MediaStream Strategy',
      desc: 'Full partition strategy across all table tiers',
      detail: 'MediaStream partition strategy by layer: Bronze tables — PARTITIONED BY (event_date) — simple date partition for streaming ingest and lifecycle management. Silver tables — PARTITIONED BY (event_date) — same, enables partition-isolated APPLY CHANGES INTO. Gold MVs — NO partitions — ZORDER BY (content_id/user_id) instead; Gold tables are smaller and query patterns are multi-dimensional. ML Features — NO partitions — full table scan, ZORDER BY (user_id). Audit logs — PARTITIONED BY (log_date, workspace_id) — compliance queries by date and workspace.',
    },
  ];

  const DIAGRAMS = [
    // Step 0: Partition concept
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">PARTITIONING — DIRECTORY LAYOUT</text>
      <!-- Directory tree -->
      <text x="30" y="50" fill="#ff6b35" font-size="9">bronze_events_raw/</text>
      <text x="50" y="68" fill="#3b82f6" font-size="9">event_date=2024-01-13/</text>
      <text x="70" y="84" fill="#a0a0a0" font-size="8">part-00001.snappy.parquet  (1.4GB)</text>
      <text x="70" y="98" fill="#a0a0a0" font-size="8">part-00002.snappy.parquet  (1.3GB)</text>
      <text x="50" y="116" fill="#3b82f6" font-size="9">event_date=2024-01-14/</text>
      <text x="70" y="132" fill="#a0a0a0" font-size="8">part-00001.snappy.parquet  (1.5GB)</text>
      <text x="70" y="146" fill="#a0a0a0" font-size="8">part-00002.snappy.parquet  (1.4GB)</text>
      <text x="50" y="164" fill="#22c55e" font-size="9">event_date=2024-01-15/  ← query target</text>
      <text x="70" y="180" fill="#22c55e" font-size="8">part-00001.snappy.parquet  (1.6GB)</text>
      <text x="70" y="194" fill="#22c55e" font-size="8">part-00002.snappy.parquet  (1.5GB)</text>
      <text x="50" y="210" fill="#a0a0a0" font-size="9">event_date=2024-01-16/</text>
      <text x="50" y="224" fill="#a0a0a0" font-size="9">...365 partitions total...</text>
      <!-- Query annotation -->
      <rect x="250" y="40" width="220" height="90" rx="5" fill="#22c55e" fill-opacity="0.1" stroke="#22c55e" stroke-width="1.5"/>
      <text x="360" y="60" fill="#22c55e" font-size="9" text-anchor="middle" font-weight="bold">QUERY</text>
      <text x="360" y="76" fill="#e0e0e0" font-size="9" text-anchor="middle">SELECT * FROM</text>
      <text x="360" y="90" fill="#e0e0e0" font-size="9" text-anchor="middle">bronze_events_raw</text>
      <text x="360" y="104" fill="#ff6b35" font-size="9" text-anchor="middle">WHERE event_date = '2024-01-15'</text>
      <rect x="250" y="145" width="220" height="55" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="360" y="163" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">PARTITION PRUNING</text>
      <text x="360" y="178" fill="#22c55e" font-size="8" text-anchor="middle">Read: 2 files (3.1GB)</text>
      <text x="360" y="192" fill="#ef4444" font-size="8" text-anchor="middle">Skip: 363 partitions (99.7%)</text>
      <!-- Metrics -->
      <rect x="10" y="248" width="460" height="42" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="266" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">SCAN REDUCTION AT MEDIASTREAM</text>
      <text x="240" y="281" fill="#a0a0a0" font-size="8" text-anchor="middle">Full table: 33.6B rows | Partitioned query: &lt;200M rows | 99.4% reduction</text>
    </svg>`,

    // Step 1: Partition column choice
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">PARTITION COLUMN SELECTION</text>
      <!-- Good vs bad table -->
      <rect x="10" y="35" width="460" height="22" rx="3" fill="#ff6b35" fill-opacity="0.15"/>
      <text x="100" y="51" fill="#ff6b35" font-size="9" font-weight="bold">COLUMN</text>
      <text x="210" y="51" fill="#ff6b35" font-size="9" font-weight="bold">CARDINALITY</text>
      <text x="320" y="51" fill="#ff6b35" font-size="9" font-weight="bold">PARTITION SIZE</text>
      <text x="425" y="51" fill="#ff6b35" font-size="9" font-weight="bold">VERDICT</text>
      <rect x="10" y="59" width="460" height="20" rx="2" fill="#1a1d2e"/>
      <text x="100" y="73" fill="#e0e0e0" font-size="8">event_date</text>
      <text x="210" y="73" fill="#a0a0a0" font-size="8">365/year</text>
      <text x="320" y="73" fill="#a0a0a0" font-size="8">~3 GB</text>
      <rect x="390" y="62" width="75" height="14" rx="2" fill="#22c55e" fill-opacity="0.3"/>
      <text x="425" y="73" fill="#22c55e" font-size="8" text-anchor="middle">GOOD</text>
      <rect x="10" y="81" width="460" height="20" rx="2" fill="#12141f"/>
      <text x="100" y="95" fill="#e0e0e0" font-size="8">event_year_month</text>
      <text x="210" y="95" fill="#a0a0a0" font-size="8">12/year</text>
      <text x="320" y="95" fill="#a0a0a0" font-size="8">~90 GB</text>
      <rect x="390" y="84" width="75" height="14" rx="2" fill="#22c55e" fill-opacity="0.3"/>
      <text x="425" y="95" fill="#22c55e" font-size="8" text-anchor="middle">GOOD</text>
      <rect x="10" y="103" width="460" height="20" rx="2" fill="#1a1d2e"/>
      <text x="100" y="117" fill="#e0e0e0" font-size="8">event_type</text>
      <text x="210" y="117" fill="#a0a0a0" font-size="8">12 types</text>
      <text x="320" y="117" fill="#a0a0a0" font-size="8">varies wildly</text>
      <rect x="390" y="106" width="75" height="14" rx="2" fill="#f59e0b" fill-opacity="0.3"/>
      <text x="425" y="117" fill="#f59e0b" font-size="8" text-anchor="middle">RISKY</text>
      <rect x="10" y="125" width="460" height="20" rx="2" fill="#12141f"/>
      <text x="100" y="139" fill="#e0e0e0" font-size="8">hour_of_day</text>
      <text x="210" y="139" fill="#a0a0a0" font-size="8">24/day</text>
      <text x="320" y="139" fill="#a0a0a0" font-size="8">~125 MB</text>
      <rect x="390" y="128" width="75" height="14" rx="2" fill="#f59e0b" fill-opacity="0.3"/>
      <text x="425" y="139" fill="#f59e0b" font-size="8" text-anchor="middle">SMALL FILES</text>
      <rect x="10" y="147" width="460" height="20" rx="2" fill="#1a1d2e"/>
      <text x="100" y="161" fill="#e0e0e0" font-size="8">user_id</text>
      <text x="210" y="161" fill="#a0a0a0" font-size="8">180M</text>
      <text x="320" y="161" fill="#a0a0a0" font-size="8">~18 bytes</text>
      <rect x="390" y="150" width="75" height="14" rx="2" fill="#ef4444" fill-opacity="0.3"/>
      <text x="425" y="161" fill="#ef4444" font-size="8" text-anchor="middle">NEVER</text>
      <!-- Rules -->
      <rect x="10" y="182" width="460" height="108" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="200" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">PARTITION COLUMN RULES</text>
      <text x="24" y="218" fill="#22c55e" font-size="8">✓</text>
      <text x="36" y="218" fill="#a0a0a0" font-size="8">High cardinality but BOUNDED (not unbounded like user_id)</text>
      <text x="24" y="234" fill="#22c55e" font-size="8">✓</text>
      <text x="36" y="234" fill="#a0a0a0" font-size="8">Matches most common query filter (WHERE clause column)</text>
      <text x="24" y="250" fill="#22c55e" font-size="8">✓</text>
      <text x="36" y="250" fill="#a0a0a0" font-size="8">Target ≥1GB per partition (avoids small file problem)</text>
      <text x="24" y="266" fill="#ef4444" font-size="8">✗</text>
      <text x="36" y="266" fill="#a0a0a0" font-size="8">Never partition on continuous numeric or high-cardinality string</text>
      <text x="24" y="282" fill="#ef4444" font-size="8">✗</text>
      <text x="36" y="282" fill="#a0a0a0" font-size="8">Avoid highly skewed columns (one value has 90% of data)</text>
    </svg>`,

    // Step 2: Partition pruning
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">PARTITION PRUNING MECHANICS</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- Query plan -->
      <rect x="10" y="38" width="460" height="35" rx="4" fill="#12141f" stroke="#ff6b35" stroke-width="1"/>
      <text x="24" y="54" fill="#ff6b35" font-size="9">SELECT</text>
      <text x="75" y="54" fill="#a0a0a0" font-size="9">* FROM mediastream.bronze.events</text>
      <text x="24" y="68" fill="#ff6b35" font-size="9">WHERE</text>
      <text x="75" y="68" fill="#22c55e" font-size="9">event_date BETWEEN '2024-01-01' AND '2024-01-07'</text>
      <!-- Pruning steps -->
      <rect x="10" y="85" width="460" height="100" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="103" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">SPARK DRIVER — PARTITION PRUNING STEPS</text>
      <text x="24" y="121" fill="#3b82f6" font-size="8">1.</text>
      <text x="36" y="121" fill="#a0a0a0" font-size="8">Read Delta log to find all partition directories</text>
      <text x="24" y="137" fill="#3b82f6" font-size="8">2.</text>
      <text x="36" y="137" fill="#a0a0a0" font-size="8">Apply predicate pushdown: keep only event_date IN ['2024-01-01'...'2024-01-07']</text>
      <text x="24" y="153" fill="#3b82f6" font-size="8">3.</text>
      <text x="36" y="153" fill="#a0a0a0" font-size="8">List files in those 7 directories only — skip the other 358</text>
      <text x="24" y="169" fill="#3b82f6" font-size="8">4.</text>
      <text x="36" y="169" fill="#a0a0a0" font-size="8">Executors read only those files — no network I/O for pruned partitions</text>
      <!-- Pruning caveat -->
      <rect x="10" y="200" width="460" height="40" rx="4" fill="#f59e0b" fill-opacity="0.1" stroke="#f59e0b" stroke-width="1"/>
      <text x="240" y="218" fill="#f59e0b" font-size="9" text-anchor="middle" font-weight="bold">PRUNING CAVEAT: Expression must match partition column directly</text>
      <text x="240" y="233" fill="#a0a0a0" font-size="8" text-anchor="middle">DATE_TRUNC('month', event_date) = '2024-01-01' → may NOT prune (use event_date BETWEEN)</text>
      <!-- Stats -->
      <rect x="10" y="253" width="460" height="38" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="271" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">MEDIASTREAM PRUNING EFFECTIVENESS</text>
      <text x="100" y="284" fill="#22c55e" font-size="8" text-anchor="middle">94% rows skipped</text>
      <text x="240" y="284" fill="#22c55e" font-size="8" text-anchor="middle">99.4% data reduction</text>
      <text x="380" y="284" fill="#22c55e" font-size="8" text-anchor="middle">on user queries</text>
    </svg>`,

    // Step 3: Partition evolution
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">PARTITION EVOLUTION — REPARTITIONING</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- Old partition -->
      <rect x="10" y="38" width="200" height="70" rx="5" fill="#1e2030" stroke="#ef4444" stroke-width="1.5"/>
      <text x="110" y="56" fill="#ef4444" font-size="8" text-anchor="middle" font-weight="bold">OLD PARTITION SCHEME</text>
      <text x="110" y="72" fill="#a0a0a0" font-size="8" text-anchor="middle">PARTITIONED BY</text>
      <text x="110" y="86" fill="#e0e0e0" font-size="9" text-anchor="middle">(event_year, event_month)</text>
      <text x="110" y="100" fill="#a0a0a0" font-size="7" text-anchor="middle">12 partitions/year, 90GB each</text>
      <!-- New partition -->
      <rect x="270" y="38" width="200" height="70" rx="5" fill="#1e2030" stroke="#22c55e" stroke-width="1.5"/>
      <text x="370" y="56" fill="#22c55e" font-size="8" text-anchor="middle" font-weight="bold">NEW PARTITION SCHEME</text>
      <text x="370" y="72" fill="#a0a0a0" font-size="8" text-anchor="middle">PARTITIONED BY</text>
      <text x="370" y="86" fill="#e0e0e0" font-size="9" text-anchor="middle">(event_date)</text>
      <text x="370" y="100" fill="#a0a0a0" font-size="7" text-anchor="middle">365 partitions/year, 3GB each</text>
      <!-- Arrow -->
      <line x1="210" y1="73" x2="270" y2="73" stroke="#ff6b35" stroke-width="2" marker-end="url(#arr)"/>
      <text x="240" y="68" fill="#ff6b35" font-size="8" text-anchor="middle">CTAS</text>
      <!-- SQL -->
      <rect x="10" y="125" width="460" height="60" rx="4" fill="#12141f" stroke="#ff6b35" stroke-width="1"/>
      <text x="24" y="145" fill="#ff6b35" font-size="9">REPLACE TABLE</text>
      <text x="140" y="145" fill="#3b82f6" font-size="9">mediastream.bronze.ad_events</text>
      <text x="24" y="161" fill="#ff6b35" font-size="9">  PARTITIONED BY</text>
      <text x="155" y="161" fill="#22c55e" font-size="9">(event_date)</text>
      <text x="24" y="177" fill="#ff6b35" font-size="9">  AS SELECT</text>
      <text x="100" y="177" fill="#a0a0a0" font-size="9">* FROM mediastream.bronze.ad_events;</text>
      <!-- MediaStream case study -->
      <rect x="10" y="200" width="460" height="90" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="218" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">MEDIASTREAM CASE STUDY — Q3 2023</text>
      <text x="100" y="237" fill="#a0a0a0" font-size="8" text-anchor="middle">Data size</text>
      <text x="225" y="237" fill="#a0a0a0" font-size="8" text-anchor="middle">Rewrite time</text>
      <text x="340" y="237" fill="#a0a0a0" font-size="8" text-anchor="middle">Downtime</text>
      <text x="430" y="237" fill="#a0a0a0" font-size="8" text-anchor="middle">Query gain</text>
      <text x="100" y="255" fill="#e0e0e0" font-size="10" text-anchor="middle" font-weight="bold">2.1 TB</text>
      <text x="225" y="255" fill="#e0e0e0" font-size="10" text-anchor="middle" font-weight="bold">4.2 h</text>
      <text x="340" y="255" fill="#22c55e" font-size="10" text-anchor="middle" font-weight="bold">ZERO</text>
      <text x="430" y="255" fill="#22c55e" font-size="10" text-anchor="middle" font-weight="bold">8×</text>
      <line x1="155" y1="244" x2="155" y2="264" stroke="#333" stroke-width="0.5"/>
      <line x1="285" y1="244" x2="285" y2="264" stroke="#333" stroke-width="0.5"/>
      <line x1="385" y1="244" x2="385" y2="264" stroke="#333" stroke-width="0.5"/>
      <text x="240" y="280" fill="#a0a0a0" font-size="7" text-anchor="middle">ACID semantics: old table served reads until REPLACE TABLE committed atomically</text>
    </svg>`,

    // Step 4: Partition skew
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">PARTITION SKEW — DIAGNOSING &amp; FIXING</text>
      <!-- Normal vs skewed bars -->
      <text x="120" y="48" fill="#a0a0a0" font-size="8" text-anchor="middle">Normal day partitions (3GB)</text>
      <text x="360" y="48" fill="#ef4444" font-size="8" text-anchor="middle">Skewed: Super Bowl day (12GB)</text>
      <rect x="20" y="55" width="50" height="50" rx="2" fill="#3b82f6" fill-opacity="0.7"/>
      <rect x="75" y="55" width="50" height="50" rx="2" fill="#3b82f6" fill-opacity="0.7"/>
      <rect x="130" y="55" width="50" height="50" rx="2" fill="#3b82f6" fill-opacity="0.7"/>
      <rect x="185" y="55" width="50" height="50" rx="2" fill="#3b82f6" fill-opacity="0.7"/>
      <rect x="285" y="5" width="50" height="100" rx="2" fill="#ef4444" fill-opacity="0.8"/>
      <text x="310" y="115" fill="#ef4444" font-size="8" text-anchor="middle">4×</text>
      <rect x="340" y="55" width="50" height="50" rx="2" fill="#3b82f6" fill-opacity="0.7"/>
      <rect x="395" y="55" width="50" height="50" rx="2" fill="#3b82f6" fill-opacity="0.7"/>
      <!-- Symptom -->
      <rect x="10" y="135" width="460" height="45" rx="4" fill="#ef4444" fill-opacity="0.1" stroke="#ef4444" stroke-width="1"/>
      <text x="240" y="153" fill="#ef4444" font-size="9" text-anchor="middle" font-weight="bold">SYMPTOMS</text>
      <text x="240" y="169" fill="#a0a0a0" font-size="8" text-anchor="middle">One Spark task runs 4× longer than others | Memory spills to disk | OOM errors</text>
      <!-- Solutions -->
      <rect x="10" y="195" width="460" height="95" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="213" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">SOLUTIONS</text>
      <rect x="20" y="221" width="130" height="60" rx="4" fill="#0f1117" stroke="#3b82f6" stroke-width="1"/>
      <text x="85" y="237" fill="#3b82f6" font-size="8" text-anchor="middle" font-weight="bold">Sub-partition</text>
      <text x="85" y="252" fill="#a0a0a0" font-size="7" text-anchor="middle">event_date + event_hour</text>
      <text x="85" y="265" fill="#a0a0a0" font-size="7" text-anchor="middle">for outlier days</text>
      <text x="85" y="275" fill="#a0a0a0" font-size="6" text-anchor="middle">(manual detection)</text>
      <rect x="170" y="221" width="130" height="60" rx="4" fill="#0f1117" stroke="#22c55e" stroke-width="1"/>
      <text x="235" y="237" fill="#22c55e" font-size="8" text-anchor="middle" font-weight="bold">AQE (Spark 3.x)</text>
      <text x="235" y="252" fill="#a0a0a0" font-size="7" text-anchor="middle">Auto-split skewed</text>
      <text x="235" y="265" fill="#a0a0a0" font-size="7" text-anchor="middle">partitions at runtime</text>
      <text x="235" y="275" fill="#22c55e" font-size="6" text-anchor="middle">MediaStream default</text>
      <rect x="320" y="221" width="140" height="60" rx="4" fill="#0f1117" stroke="#a855f7" stroke-width="1"/>
      <text x="390" y="237" fill="#a855f7" font-size="8" text-anchor="middle" font-weight="bold">Liquid Clustering</text>
      <text x="390" y="252" fill="#a0a0a0" font-size="7" text-anchor="middle">No partitions needed</text>
      <text x="390" y="265" fill="#a0a0a0" font-size="7" text-anchor="middle">No skew possible</text>
      <text x="390" y="275" fill="#a0a0a0" font-size="6" text-anchor="middle">(future direction)</text>
    </svg>`,

    // Step 5: MediaStream strategy
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">MEDIASTREAM PARTITION STRATEGY</text>
      <!-- Strategy table -->
      <rect x="10" y="35" width="460" height="22" rx="3" fill="#ff6b35" fill-opacity="0.15"/>
      <text x="80" y="51" fill="#ff6b35" font-size="9" font-weight="bold">LAYER</text>
      <text x="200" y="51" fill="#ff6b35" font-size="9" font-weight="bold">PARTITION</text>
      <text x="330" y="51" fill="#ff6b35" font-size="9" font-weight="bold">REASON</text>
      <rect x="10" y="59" width="460" height="22" rx="2" fill="#1a1d2e"/>
      <rect x="12" y="62" width="12" height="16" rx="2" fill="#cd7f32"/>
      <text x="80" y="74" fill="#e0e0e0" font-size="8">Bronze</text>
      <text x="200" y="74" fill="#22c55e" font-size="8">event_date</text>
      <text x="330" y="74" fill="#a0a0a0" font-size="8">Streaming lifecycle mgmt</text>
      <rect x="10" y="83" width="460" height="22" rx="2" fill="#12141f"/>
      <rect x="12" y="86" width="12" height="16" rx="2" fill="#aaa"/>
      <text x="80" y="98" fill="#e0e0e0" font-size="8">Silver</text>
      <text x="200" y="98" fill="#22c55e" font-size="8">event_date</text>
      <text x="330" y="98" fill="#a0a0a0" font-size="8">Partition-isolated MERGE</text>
      <rect x="10" y="107" width="460" height="22" rx="2" fill="#1a1d2e"/>
      <rect x="12" y="110" width="12" height="16" rx="2" fill="#FFD700"/>
      <text x="80" y="122" fill="#e0e0e0" font-size="8">Gold MVs</text>
      <text x="200" y="122" fill="#ef4444" font-size="8">NONE</text>
      <text x="330" y="122" fill="#a0a0a0" font-size="8">ZORDER instead (multi-dim)</text>
      <rect x="10" y="131" width="460" height="22" rx="2" fill="#12141f"/>
      <rect x="12" y="134" width="12" height="16" rx="2" fill="#a855f7"/>
      <text x="80" y="146" fill="#e0e0e0" font-size="8">ML Features</text>
      <text x="200" y="146" fill="#ef4444" font-size="8">NONE</text>
      <text x="330" y="146" fill="#a0a0a0" font-size="8">Full scan, ZORDER by user_id</text>
      <rect x="10" y="155" width="460" height="22" rx="2" fill="#1a1d2e"/>
      <rect x="12" y="158" width="12" height="16" rx="2" fill="#ff6b35"/>
      <text x="80" y="170" fill="#e0e0e0" font-size="8">Audit Logs</text>
      <text x="200" y="170" fill="#22c55e" font-size="8">log_date + workspace_id</text>
      <text x="330" y="170" fill="#a0a0a0" font-size="8">Compliance queries by date+ws</text>
      <!-- Key benefits -->
      <rect x="10" y="192" width="460" height="98" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="210" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">KEY OUTCOMES</text>
      <text x="24" y="228" fill="#22c55e" font-size="8">✓</text>
      <text x="36" y="228" fill="#a0a0a0" font-size="8">Bronze partition pruning: 99.4% scan reduction on date-range queries</text>
      <text x="24" y="244" fill="#22c55e" font-size="8">✓</text>
      <text x="36" y="244" fill="#a0a0a0" font-size="8">Silver: 6 concurrent APPLY CHANGES → partition isolation → zero conflicts</text>
      <text x="24" y="260" fill="#22c55e" font-size="8">✓</text>
      <text x="36" y="260" fill="#a0a0a0" font-size="8">Gold: no partition overhead, ZORDER handles multi-dimensional queries</text>
      <text x="24" y="276" fill="#22c55e" font-size="8">✓</text>
      <text x="36" y="276" fill="#a0a0a0" font-size="8">Audit: instant compliance queries by workspace + date range</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.ps-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.ps-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.ps-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="ps-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="ps-header module-header">
        <div class="module-tag" style="background:var(--delta)">ADVANCED</div>
        <h2 class="module-title">Partition Strategy</h2>
        <p class="module-subtitle">Choosing, evolving, and optimizing partition schemes for MediaStream's 847 Delta tables</p>
      </div>
      <div class="ps-pills step-pills">${pills}</div>
      <div class="ps-diagram diagram-frame"></div>
      <div class="ps-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'ps-page page-enter';
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
    container.querySelectorAll('.ps-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['partition-strategy'] = {
    id: 'partition-strategy',
    title: 'Partition Strategy',
    group: 'Advanced',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
