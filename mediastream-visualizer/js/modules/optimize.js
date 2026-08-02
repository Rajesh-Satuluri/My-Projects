(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Why OPTIMIZE',
      desc: 'The small file problem and why OPTIMIZE solves it',
      detail: 'Delta Lake streaming writes produce many small parquet files (often 1-100MB each). Small files hurt query performance: more file opens, more metadata reads, less vectorized I/O. OPTIMIZE compacts small files into large files (default 1GB target). MediaStream bronze_events_raw accumulates 48,000+ small files per day from Kafka micro-batches. After OPTIMIZE, query times drop 40-70%.',
    },
    {
      label: 'OPTIMIZE Command',
      desc: 'Running OPTIMIZE — basic and with Z-Ordering',
      detail: 'OPTIMIZE syntax: `OPTIMIZE table_name [WHERE predicate] [ZORDER BY (col1, col2, ...)]`. Without ZORDER: files are compacted to 1GB target size, no reordering. With ZORDER: data is physically sorted by the specified columns within each file, enabling data skipping. MediaStream runs OPTIMIZE ZORDER BY (user_id, event_date) on Silver tables daily, cutting scan sizes by 65%.',
    },
    {
      label: 'Z-Ordering',
      desc: 'How Z-Order interleaves multiple dimension columns',
      detail: 'Z-Order is a space-filling curve that maps multi-dimensional data to 1D while preserving locality. For two columns (user_id, event_date): rows with similar (user_id AND event_date) values are stored in the same files. This enables Delta to skip entire files when querying by either dimension alone. Z-Order on up to 4 columns is effective; beyond that, benefits diminish. MediaStream uses (user_id, event_date) for Silver tables, (content_id, event_date) for engagement tables.',
    },
    {
      label: 'Liquid Clustering',
      desc: 'Liquid Clustering — the OPTIMIZE-free successor to Z-Order',
      detail: 'Liquid Clustering (Delta Lake 3.1+) incrementally clusters data as it is written, without requiring explicit OPTIMIZE runs. No partition columns needed — clustering keys specified with `CLUSTER BY (col1, col2)`. Cluster files are automatically rewritten by background compaction. Advantages: always-fresh clustering, no maintenance window, no partition explosion. MediaStream is evaluating migration from Z-Order to Liquid Clustering for Bronze tables (expected 2× write throughput improvement).',
    },
    {
      label: 'OPTIMIZE Metrics',
      desc: 'Before/after query and storage metrics at MediaStream',
      detail: 'OPTIMIZE impact on silver_user_activity (14-day data): before — 284,000 files, avg 12MB each, p50 query 42s. After OPTIMIZE ZORDER BY (user_id, event_date) — 187 files, avg 1.6GB each, p50 query 14s (67% faster). Files reduced: 99.9%. Data skipping effectiveness: 94% of files skipped on typical user queries. OPTIMIZE runs: 28 minutes daily. Net benefit: 28min OPTIMIZE cost vs 40s × 840 queries/day saved = 560 compute-minutes/day saved.',
    },
    {
      label: 'OPTIMIZE Schedule',
      desc: 'When and how often to run OPTIMIZE at different table tiers',
      detail: 'OPTIMIZE frequency by tier: Bronze — OPTIMIZE only (no ZORDER, too wide), weekly; Silver — OPTIMIZE ZORDER BY (user_id, event_date), daily at 01:00 UTC; Gold — OPTIMIZE ZORDER BY (content_id), on trigger after MV recompute; ML Features — OPTIMIZE ZORDER BY (user_id), weekly. OPTIMIZE is idempotent — running twice on an already-optimized table is fast (nothing to compact). MediaStream uses DLT maintenance tasks or Databricks job clusters for OPTIMIZE runs.',
    },
  ];

  const DIAGRAMS = [
    // Step 0: Small file problem
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">SMALL FILE PROBLEM — BEFORE OPTIMIZE</text>
      <!-- Before -->
      <text x="120" y="45" fill="#ef4444" font-size="9" text-anchor="middle" font-weight="bold">BEFORE (48,000 small files)</text>
      <text x="360" y="45" fill="#22c55e" font-size="9" text-anchor="middle" font-weight="bold">AFTER (compact 1GB files)</text>
      <line x1="240" y1="38" x2="240" y2="175" stroke="#333" stroke-width="1" stroke-dasharray="4,3"/>
      <!-- Small files grid -->
      <g fill="#ef4444" fill-opacity="0.6">
        <rect x="15" y="55" width="16" height="10" rx="1"/>
        <rect x="33" y="55" width="16" height="10" rx="1"/>
        <rect x="51" y="55" width="16" height="10" rx="1"/>
        <rect x="69" y="55" width="16" height="10" rx="1"/>
        <rect x="87" y="55" width="16" height="10" rx="1"/>
        <rect x="105" y="55" width="16" height="10" rx="1"/>
        <rect x="123" y="55" width="16" height="10" rx="1"/>
        <rect x="141" y="55" width="16" height="10" rx="1"/>
        <rect x="159" y="55" width="16" height="10" rx="1"/>
        <rect x="177" y="55" width="16" height="10" rx="1"/>
        <rect x="195" y="55" width="16" height="10" rx="1"/>
        <rect x="213" y="55" width="16" height="10" rx="1"/>
        <rect x="15" y="68" width="16" height="10" rx="1"/>
        <rect x="33" y="68" width="16" height="10" rx="1"/>
        <rect x="51" y="68" width="16" height="10" rx="1"/>
        <rect x="69" y="68" width="16" height="10" rx="1"/>
        <rect x="87" y="68" width="16" height="10" rx="1"/>
        <rect x="105" y="68" width="16" height="10" rx="1"/>
        <rect x="123" y="68" width="16" height="10" rx="1"/>
        <rect x="141" y="68" width="16" height="10" rx="1"/>
        <rect x="159" y="68" width="16" height="10" rx="1"/>
        <rect x="177" y="68" width="16" height="10" rx="1"/>
        <rect x="195" y="68" width="16" height="10" rx="1"/>
        <rect x="213" y="68" width="16" height="10" rx="1"/>
        <rect x="15" y="81" width="16" height="10" rx="1"/>
        <rect x="33" y="81" width="16" height="10" rx="1"/>
        <rect x="51" y="81" width="16" height="10" rx="1"/>
        <rect x="69" y="81" width="16" height="10" rx="1"/>
        <rect x="87" y="81" width="16" height="10" rx="1"/>
        <rect x="105" y="81" width="16" height="10" rx="1"/>
        <rect x="123" y="81" width="16" height="10" rx="1"/>
        <rect x="141" y="81" width="16" height="10" rx="1"/>
        <rect x="159" y="81" width="16" height="10" rx="1"/>
        <rect x="177" y="81" width="16" height="10" rx="1"/>
        <rect x="195" y="81" width="16" height="10" rx="1"/>
        <rect x="213" y="81" width="16" height="10" rx="1"/>
      </g>
      <text x="120" y="108" fill="#a0a0a0" font-size="8" text-anchor="middle">...48,000 files (avg 12MB)</text>
      <!-- After big files -->
      <rect x="255" y="55" width="80" height="50" rx="3" fill="#22c55e" fill-opacity="0.6"/>
      <text x="295" y="85" fill="#fff" font-size="9" text-anchor="middle">1.6 GB</text>
      <rect x="345" y="55" width="80" height="50" rx="3" fill="#22c55e" fill-opacity="0.6"/>
      <text x="385" y="85" fill="#fff" font-size="9" text-anchor="middle">1.6 GB</text>
      <text x="360" y="125" fill="#a0a0a0" font-size="8" text-anchor="middle">187 files (avg 1.6GB)</text>
      <!-- Metrics comparison -->
      <rect x="10" y="145" width="460" height="140" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="163" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">QUERY PERFORMANCE COMPARISON</text>
      <text x="120" y="182" fill="#ef4444" font-size="8" text-anchor="middle">BEFORE</text>
      <text x="340" y="182" fill="#22c55e" font-size="8" text-anchor="middle">AFTER OPTIMIZE</text>
      <line x1="240" y1="172" x2="240" y2="278" stroke="#333" stroke-width="0.5"/>
      <text x="120" y="200" fill="#e0e0e0" font-size="10" text-anchor="middle" font-weight="bold">284,000 files</text>
      <text x="340" y="200" fill="#e0e0e0" font-size="10" text-anchor="middle" font-weight="bold">187 files</text>
      <text x="120" y="220" fill="#e0e0e0" font-size="10" text-anchor="middle" font-weight="bold">42s p50 query</text>
      <text x="340" y="220" fill="#e0e0e0" font-size="10" text-anchor="middle" font-weight="bold">14s p50 query</text>
      <text x="120" y="240" fill="#e0e0e0" font-size="9" text-anchor="middle">12MB avg file size</text>
      <text x="340" y="240" fill="#e0e0e0" font-size="9" text-anchor="middle">1.6GB avg file size</text>
      <text x="120" y="258" fill="#e0e0e0" font-size="9" text-anchor="middle">6% files skipped</text>
      <text x="340" y="258" fill="#e0e0e0" font-size="9" text-anchor="middle">94% files skipped</text>
      <rect x="280" y="268" width="150" height="16" rx="3" fill="#22c55e" fill-opacity="0.2"/>
      <text x="355" y="280" fill="#22c55e" font-size="8" text-anchor="middle">67% faster queries</text>
    </svg>`,

    // Step 1: OPTIMIZE command
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">OPTIMIZE COMMAND SYNTAX</text>
      <!-- Basic optimize -->
      <rect x="10" y="35" width="460" height="45" rx="4" fill="#12141f" stroke="#ff6b35" stroke-width="1"/>
      <text x="24" y="55" fill="#ff6b35" font-size="10">OPTIMIZE</text>
      <text x="109" y="55" fill="#3b82f6" font-size="10">mediastream.silver.user_activity;</text>
      <text x="24" y="72" fill="#a0a0a0" font-size="8">-- Compacts small files to 1GB target, no column reordering</text>
      <!-- With where -->
      <rect x="10" y="90" width="460" height="50" rx="4" fill="#12141f" stroke="#ff6b35" stroke-width="1"/>
      <text x="24" y="110" fill="#ff6b35" font-size="10">OPTIMIZE</text>
      <text x="109" y="110" fill="#3b82f6" font-size="10">mediastream.silver.user_activity</text>
      <text x="24" y="126" fill="#ff6b35" font-size="10">  WHERE</text>
      <text x="89" y="126" fill="#a0a0a0" font-size="10">event_date &gt;= '2024-01-01';</text>
      <!-- With zorder -->
      <rect x="10" y="152" width="460" height="60" rx="4" fill="#12141f" stroke="#ff6b35" stroke-width="1"/>
      <text x="24" y="172" fill="#ff6b35" font-size="10">OPTIMIZE</text>
      <text x="109" y="172" fill="#3b82f6" font-size="10">mediastream.silver.user_activity</text>
      <text x="24" y="188" fill="#ff6b35" font-size="10">  ZORDER BY</text>
      <text x="120" y="188" fill="#22c55e" font-size="10">(user_id, event_date);</text>
      <text x="24" y="204" fill="#a0a0a0" font-size="8">-- Compacts AND sorts by Z-order curve on (user_id, event_date)</text>
      <!-- MediaStream -->
      <rect x="10" y="228" width="460" height="62" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="246" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">MEDIASTREAM OPTIMIZE COMMANDS</text>
      <text x="240" y="263" fill="#a0a0a0" font-size="8" text-anchor="middle">silver.*: OPTIMIZE ZORDER BY (user_id, event_date)</text>
      <text x="240" y="278" fill="#a0a0a0" font-size="8" text-anchor="middle">gold.engagement: OPTIMIZE ZORDER BY (content_id)</text>
      <text x="240" y="284" fill="#a0a0a0" font-size="7" text-anchor="middle">ml.user_embeddings: OPTIMIZE ZORDER BY (user_id)</text>
    </svg>`,

    // Step 2: Z-Order
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">Z-ORDER SPACE-FILLING CURVE</text>
      <!-- 4x4 grid visualization -->
      <text x="120" y="48" fill="#a0a0a0" font-size="9" text-anchor="middle">2D data space (user_id × event_date)</text>
      <text x="360" y="48" fill="#a0a0a0" font-size="9" text-anchor="middle">Z-Order traversal → 1D file layout</text>
      <!-- Grid -->
      <g stroke="#333" stroke-width="0.5">
        <rect x="20" y="55" width="200" height="110" fill="none" stroke="#555"/>
        <line x1="70" y1="55" x2="70" y2="165"/>
        <line x1="120" y1="55" x2="120" y2="165"/>
        <line x1="170" y1="55" x2="170" y2="165"/>
        <line x1="20" y1="82" x2="220" y2="82"/>
        <line x1="20" y1="110" x2="220" y2="110"/>
        <line x1="20" y1="138" x2="220" y2="138"/>
      </g>
      <!-- Z-curve path -->
      <polyline points="35,68 85,68 35,96 85,96 135,68 185,68 135,96 185,96 35,124 85,124 35,152 85,152 135,124 185,124 135,152 185,152" stroke="#ff6b35" stroke-width="2" fill="none" stroke-dasharray="3,2"/>
      <!-- Cell colors showing locality -->
      <rect x="21" y="56" width="48" height="26" rx="1" fill="#ff6b35" fill-opacity="0.3"/>
      <rect x="71" y="56" width="48" height="26" rx="1" fill="#ff6b35" fill-opacity="0.3"/>
      <rect x="21" y="83" width="48" height="26" rx="1" fill="#ff6b35" fill-opacity="0.3"/>
      <rect x="71" y="83" width="48" height="26" rx="1" fill="#ff6b35" fill-opacity="0.3"/>
      <rect x="121" y="56" width="48" height="26" rx="1" fill="#3b82f6" fill-opacity="0.3"/>
      <rect x="171" y="56" width="48" height="26" rx="1" fill="#3b82f6" fill-opacity="0.3"/>
      <!-- Axes -->
      <text x="120" y="178" fill="#a0a0a0" font-size="8" text-anchor="middle">event_date →</text>
      <text x="10" y="110" fill="#a0a0a0" font-size="8" text-anchor="middle" transform="rotate(-90, 10, 110)">user_id ↑</text>
      <!-- 1D layout -->
      <text x="360" y="62" fill="#a0a0a0" font-size="8" text-anchor="middle">File layout after Z-Order</text>
      <rect x="255" y="72" width="210" height="22" rx="3" fill="#ff6b35" fill-opacity="0.5"/>
      <text x="360" y="87" fill="#fff" font-size="8" text-anchor="middle">file_001 (user 1-100, Jan 1-7)</text>
      <rect x="255" y="98" width="210" height="22" rx="3" fill="#3b82f6" fill-opacity="0.5"/>
      <text x="360" y="113" fill="#fff" font-size="8" text-anchor="middle">file_002 (user 100-200, Jan 1-7)</text>
      <rect x="255" y="124" width="210" height="22" rx="3" fill="#22c55e" fill-opacity="0.5"/>
      <text x="360" y="139" fill="#fff" font-size="8" text-anchor="middle">file_003 (user 1-100, Jan 8-14)</text>
      <!-- Query illustration -->
      <rect x="10" y="195" width="460" height="95" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="213" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">QUERY: WHERE user_id = 42 AND event_date = '2024-01-05'</text>
      <text x="240" y="230" fill="#22c55e" font-size="9" text-anchor="middle">Z-Order min/max stats → skip 94% of files</text>
      <rect x="30" y="240" width="100" height="20" rx="3" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e" stroke-width="1"/>
      <text x="80" y="254" fill="#22c55e" font-size="7" text-anchor="middle">READ file_001 ✓</text>
      <rect x="145" y="240" width="100" height="20" rx="3" fill="#ef4444" fill-opacity="0.1" stroke="#333" stroke-width="1"/>
      <text x="195" y="254" fill="#a0a0a0" font-size="7" text-anchor="middle">SKIP file_002 ✗</text>
      <rect x="260" y="240" width="100" height="20" rx="3" fill="#ef4444" fill-opacity="0.1" stroke="#333" stroke-width="1"/>
      <text x="310" y="254" fill="#a0a0a0" font-size="7" text-anchor="middle">SKIP file_003 ✗</text>
      <rect x="370" y="240" width="100" height="20" rx="3" fill="#ef4444" fill-opacity="0.1" stroke="#333" stroke-width="1"/>
      <text x="420" y="254" fill="#a0a0a0" font-size="7" text-anchor="middle">SKIP file_N ✗</text>
      <text x="240" y="278" fill="#a0a0a0" font-size="8" text-anchor="middle">Without Z-Order: scan all 284,000 files | With Z-Order: scan 11 files</text>
    </svg>`,

    // Step 3: Liquid clustering
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">LIQUID CLUSTERING — OPTIMIZE-FREE</text>
      <!-- Comparison table -->
      <rect x="10" y="35" width="460" height="22" rx="3" fill="#ff6b35" fill-opacity="0.15"/>
      <text x="160" y="51" fill="#ff6b35" font-size="9" font-weight="bold" text-anchor="middle">Z-ORDER (current)</text>
      <text x="360" y="51" fill="#a855f7" font-size="9" font-weight="bold" text-anchor="middle">LIQUID CLUSTERING (Delta 3.1+)</text>
      <line x1="240" y1="35" x2="240" y2="175" stroke="#333" stroke-width="1"/>
      <rect x="10" y="59" width="460" height="18" rx="2" fill="#1a1d2e"/>
      <text x="50" y="72" fill="#a0a0a0" font-size="8">Syntax</text>
      <text x="160" y="72" fill="#e0e0e0" font-size="8" text-anchor="middle">OPTIMIZE ZORDER BY</text>
      <text x="360" y="72" fill="#e0e0e0" font-size="8" text-anchor="middle">CLUSTER BY (on CREATE)</text>
      <rect x="10" y="79" width="460" height="18" rx="2" fill="#12141f"/>
      <text x="50" y="92" fill="#a0a0a0" font-size="8">When</text>
      <text x="160" y="92" fill="#e0e0e0" font-size="8" text-anchor="middle">Manual / scheduled</text>
      <text x="360" y="92" fill="#e0e0e0" font-size="8" text-anchor="middle">Automatic background</text>
      <rect x="10" y="99" width="460" height="18" rx="2" fill="#1a1d2e"/>
      <text x="50" y="112" fill="#a0a0a0" font-size="8">Freshness</text>
      <text x="160" y="112" fill="#e0e0e0" font-size="8" text-anchor="middle">Only after OPTIMIZE run</text>
      <text x="360" y="112" fill="#e0e0e0" font-size="8" text-anchor="middle">Always fresh</text>
      <rect x="10" y="119" width="460" height="18" rx="2" fill="#12141f"/>
      <text x="50" y="132" fill="#a0a0a0" font-size="8">Partitioning</text>
      <text x="160" y="132" fill="#e0e0e0" font-size="8" text-anchor="middle">PARTITIONED BY required</text>
      <text x="360" y="132" fill="#e0e0e0" font-size="8" text-anchor="middle">No partitions needed</text>
      <rect x="10" y="139" width="460" height="18" rx="2" fill="#1a1d2e"/>
      <text x="50" y="152" fill="#a0a0a0" font-size="8">Write cost</text>
      <text x="160" y="152" fill="#e0e0e0" font-size="8" text-anchor="middle">Low (no rewrite on write)</text>
      <text x="360" y="152" fill="#e0e0e0" font-size="8" text-anchor="middle">Slightly higher (background)</text>
      <rect x="10" y="159" width="460" height="14" rx="2" fill="#12141f"/>
      <text x="50" y="170" fill="#a0a0a0" font-size="8">Maintenance</text>
      <text x="160" y="170" fill="#e0e0e0" font-size="8" text-anchor="middle">Manual schedule required</text>
      <text x="360" y="170" fill="#22c55e" font-size="8" text-anchor="middle">Zero maintenance</text>
      <!-- SQL -->
      <rect x="10" y="185" width="460" height="45" rx="4" fill="#12141f" stroke="#a855f7" stroke-width="1"/>
      <text x="24" y="205" fill="#a855f7" font-size="10">CREATE TABLE</text>
      <text x="130" y="205" fill="#3b82f6" font-size="10">mediastream.bronze.events_v2</text>
      <text x="24" y="222" fill="#a855f7" font-size="10">  CLUSTER BY</text>
      <text x="120" y="222" fill="#22c55e" font-size="10">(user_id, event_date);</text>
      <!-- MediaStream note -->
      <rect x="10" y="243" width="460" height="48" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="261" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">MEDIASTREAM: Evaluating for Bronze Tables</text>
      <text x="240" y="277" fill="#a0a0a0" font-size="8" text-anchor="middle">Expected: 2× write throughput improvement</text>
      <text x="240" y="286" fill="#a0a0a0" font-size="7" text-anchor="middle">Eliminates 28-minute daily OPTIMIZE window | Q2 2025 migration target</text>
    </svg>`,

    // Step 4: OPTIMIZE metrics
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">OPTIMIZE IMPACT — SILVER.USER_ACTIVITY</text>
      <!-- Before metrics -->
      <rect x="10" y="35" width="225" height="120" rx="5" fill="#1e2030" stroke="#ef4444" stroke-width="1.5"/>
      <text x="122" y="55" fill="#ef4444" font-size="9" text-anchor="middle" font-weight="bold">BEFORE OPTIMIZE</text>
      <text x="122" y="74" fill="#a0a0a0" font-size="8" text-anchor="middle">File count</text>
      <text x="122" y="90" fill="#e0e0e0" font-size="14" text-anchor="middle" font-weight="bold">284,000</text>
      <text x="122" y="108" fill="#a0a0a0" font-size="8" text-anchor="middle">Avg file size: 12MB</text>
      <text x="122" y="122" fill="#a0a0a0" font-size="8" text-anchor="middle">p50 query: 42 seconds</text>
      <text x="122" y="136" fill="#a0a0a0" font-size="8" text-anchor="middle">Files skipped: 6%</text>
      <text x="122" y="149" fill="#a0a0a0" font-size="8" text-anchor="middle">Data: 14 days, 33.6B events</text>
      <!-- After metrics -->
      <rect x="245" y="35" width="225" height="120" rx="5" fill="#1e2030" stroke="#22c55e" stroke-width="1.5"/>
      <text x="357" y="55" fill="#22c55e" font-size="9" text-anchor="middle" font-weight="bold">AFTER OPTIMIZE ZORDER</text>
      <text x="357" y="74" fill="#a0a0a0" font-size="8" text-anchor="middle">File count</text>
      <text x="357" y="90" fill="#e0e0e0" font-size="14" text-anchor="middle" font-weight="bold">187</text>
      <text x="357" y="108" fill="#a0a0a0" font-size="8" text-anchor="middle">Avg file size: 1.6 GB</text>
      <text x="357" y="122" fill="#a0a0a0" font-size="8" text-anchor="middle">p50 query: 14 seconds</text>
      <text x="357" y="136" fill="#a0a0a0" font-size="8" text-anchor="middle">Files skipped: 94%</text>
      <text x="357" y="149" fill="#a0a0a0" font-size="8" text-anchor="middle">ZORDER: (user_id, event_date)</text>
      <!-- ROI calc -->
      <rect x="10" y="168" width="460" height="120" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="186" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">ROI CALCULATION</text>
      <text x="150" y="206" fill="#a0a0a0" font-size="8" text-anchor="middle">OPTIMIZE runs daily</text>
      <text x="150" y="220" fill="#e0e0e0" font-size="9" text-anchor="middle" font-weight="bold">28 minutes</text>
      <text x="150" y="234" fill="#a0a0a0" font-size="7" text-anchor="middle">compute cost</text>
      <text x="290" y="206" fill="#a0a0a0" font-size="8" text-anchor="middle">Query time saved</text>
      <text x="290" y="220" fill="#e0e0e0" font-size="9" text-anchor="middle" font-weight="bold">560 min/day</text>
      <text x="290" y="234" fill="#a0a0a0" font-size="7" text-anchor="middle">840 queries × 40s saved each</text>
      <text x="420" y="206" fill="#a0a0a0" font-size="8" text-anchor="middle">Net benefit</text>
      <text x="420" y="220" fill="#22c55e" font-size="9" text-anchor="middle" font-weight="bold">20×</text>
      <text x="420" y="234" fill="#a0a0a0" font-size="7" text-anchor="middle">return on time</text>
      <line x1="220" y1="198" x2="220" y2="250" stroke="#333" stroke-width="0.5"/>
      <line x1="365" y1="198" x2="365" y2="250" stroke="#333" stroke-width="0.5"/>
      <text x="240" y="265" fill="#a0a0a0" font-size="8" text-anchor="middle">Files 99.9% reduced: 284,000 → 187 | Query 67% faster</text>
      <text x="240" y="280" fill="#a0a0a0" font-size="7" text-anchor="middle">All Silver and Gold tables optimized daily; Bronze weekly (too high velocity)</text>
    </svg>`,

    // Step 5: OPTIMIZE schedule
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">OPTIMIZE SCHEDULE BY TIER</text>
      <!-- Schedule grid -->
      <rect x="10" y="35" width="460" height="22" rx="3" fill="#ff6b35" fill-opacity="0.15"/>
      <text x="80" y="51" fill="#ff6b35" font-size="9" font-weight="bold">TIER</text>
      <text x="175" y="51" fill="#ff6b35" font-size="9" font-weight="bold">FREQUENCY</text>
      <text x="270" y="51" fill="#ff6b35" font-size="9" font-weight="bold">ZORDER COLUMNS</text>
      <text x="415" y="51" fill="#ff6b35" font-size="9" font-weight="bold">DURATION</text>
      <rect x="10" y="59" width="460" height="20" rx="2" fill="#1a1d2e"/>
      <rect x="12" y="61" width="12" height="16" rx="2" fill="#cd7f32"/>
      <text x="80" y="73" fill="#e0e0e0" font-size="8">Bronze</text>
      <text x="175" y="73" fill="#a0a0a0" font-size="8">Weekly (Sun 03:00)</text>
      <text x="270" y="73" fill="#a0a0a0" font-size="8">none (too many dims)</text>
      <text x="415" y="73" fill="#a0a0a0" font-size="8">4.2 hrs</text>
      <rect x="10" y="81" width="460" height="20" rx="2" fill="#12141f"/>
      <rect x="12" y="83" width="12" height="16" rx="2" fill="#aaa"/>
      <text x="80" y="95" fill="#e0e0e0" font-size="8">Silver</text>
      <text x="175" y="95" fill="#22c55e" font-size="8">Daily (01:00 UTC)</text>
      <text x="270" y="95" fill="#22c55e" font-size="8">(user_id, event_date)</text>
      <text x="415" y="95" fill="#a0a0a0" font-size="8">28 min</text>
      <rect x="10" y="103" width="460" height="20" rx="2" fill="#1a1d2e"/>
      <rect x="12" y="105" width="12" height="16" rx="2" fill="#FFD700"/>
      <text x="80" y="117" fill="#e0e0e0" font-size="8">Gold</text>
      <text x="175" y="117" fill="#a0a0a0" font-size="8">On MV recompute</text>
      <text x="270" y="117" fill="#a0a0a0" font-size="8">(content_id)</text>
      <text x="415" y="117" fill="#a0a0a0" font-size="8">8 min</text>
      <rect x="10" y="125" width="460" height="20" rx="2" fill="#12141f"/>
      <rect x="12" y="127" width="12" height="16" rx="2" fill="#a855f7"/>
      <text x="80" y="139" fill="#e0e0e0" font-size="8">ML Features</text>
      <text x="175" y="139" fill="#a0a0a0" font-size="8">Weekly</text>
      <text x="270" y="139" fill="#a0a0a0" font-size="8">(user_id)</text>
      <text x="415" y="139" fill="#a0a0a0" font-size="8">45 min</text>
      <!-- Idempotency note -->
      <rect x="10" y="158" width="460" height="40" rx="4" fill="#22c55e" fill-opacity="0.1" stroke="#22c55e" stroke-width="1"/>
      <text x="240" y="176" fill="#22c55e" font-size="9" text-anchor="middle" font-weight="bold">OPTIMIZE IS IDEMPOTENT</text>
      <text x="240" y="191" fill="#a0a0a0" font-size="8" text-anchor="middle">Running twice on an already-optimized table is fast (nothing to compact)</text>
      <!-- Run on cluster -->
      <rect x="10" y="212" width="460" height="78" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="230" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">EXECUTION METHOD</text>
      <rect x="20" y="238" width="200" height="42" rx="4" fill="#0f1117" stroke="#3b82f6" stroke-width="1"/>
      <text x="120" y="254" fill="#3b82f6" font-size="8" text-anchor="middle" font-weight="bold">Databricks Job Cluster</text>
      <text x="120" y="268" fill="#a0a0a0" font-size="7" text-anchor="middle">Dedicated OPTIMIZE cluster</text>
      <text x="120" y="279" fill="#a0a0a0" font-size="7" text-anchor="middle">8-core auto-scaling, spot instances</text>
      <rect x="250" y="238" width="210" height="42" rx="4" fill="#0f1117" stroke="#ff6b35" stroke-width="1"/>
      <text x="355" y="254" fill="#ff6b35" font-size="8" text-anchor="middle" font-weight="bold">DLT Maintenance Task</text>
      <text x="355" y="268" fill="#a0a0a0" font-size="7" text-anchor="middle">Gold tables via DLT pipeline</text>
      <text x="355" y="279" fill="#a0a0a0" font-size="7" text-anchor="middle">afterflow hook after MV recompute</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.op-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.op-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.op-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="op-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="op-header module-header">
        <div class="module-tag" style="background:var(--delta)">ADVANCED</div>
        <h2 class="module-title">OPTIMIZE &amp; Z-Order</h2>
        <p class="module-subtitle">Compact small files and physically co-locate data — 67% faster queries at MediaStream</p>
      </div>
      <div class="op-pills step-pills">${pills}</div>
      <div class="op-diagram diagram-frame"></div>
      <div class="op-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'op-page page-enter';
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
    container.querySelectorAll('.op-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['optimize'] = {
    id: 'optimize',
    title: 'OPTIMIZE & Z-Order',
    group: 'Advanced',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
