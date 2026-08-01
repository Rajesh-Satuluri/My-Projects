(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Query Entry',
      desc: 'A Spark SQL query hits the Delta table — what happens next?',
      detail: 'Spark submits a SQL query to the Databricks SQL engine. The query references a Unity Catalog table name. Before any Parquet file is touched, several resolution and planning steps occur in milliseconds.',
    },
    {
      label: 'Catalog Lookup',
      desc: 'Unity Catalog resolves the 3-part name to a storage location',
      detail: 'prod.mediastream.user_events_silver → Unity Catalog metastore → location: s3://ms-data-lake/silver/user_events/. Access check: does the calling principal have SELECT privilege on this table?',
    },
    {
      label: 'Delta Log Scan',
      desc: 'Read _delta_log to reconstruct the current snapshot',
      detail: 'Spark reads the latest checkpoint Parquet + any JSON commits after it. This builds the current active file list: which Parquet files exist in version N. No data files are opened yet.',
    },
    {
      label: 'File Stats Filter',
      desc: 'Use per-file stats to skip files that cannot match the predicate',
      detail: 'For each active file, Spark checks stats (min/max event_date, region). Files where predicate provably cannot match are eliminated. 8.2M files → 17K files remain for this query.',
    },
    {
      label: 'Partition Pruning',
      desc: 'Eliminate entire partition directories from the scan',
      detail: 'After stats-based skipping, Spark applies partition pruning: only event_date=2024-01-24 and region=us-east-1 directories are listed. Directory listing cost scales with partitions, not file count.',
    },
    {
      label: 'Parquet Read',
      desc: 'Column projection and predicate pushdown into Parquet footers',
      detail: 'Parquet files store column statistics in footer metadata. Spark pushes the predicate into the Parquet reader: only row groups where min_event_date ≤ 2024-01-24 ≤ max_event_date are decompressed.',
    },
    {
      label: 'Result Assembly',
      desc: 'Columnar data flows back through catalyst and returns to the caller',
      detail: 'Spark Catalyst assembles the final result. Arrow columnar format transfers data to the SQL gateway. For a 24-hour / 1-region window, 2.1 GB is read and results are returned in ~38 seconds.',
    },
  ];

  let _engine = null;

  const DIAGRAMS = [
    // Step 0: Query Entry
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <defs>
        <linearGradient id="rp-g0" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff6b35"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
      </defs>
      <rect x="15" y="15" width="450" height="35" rx="4" fill="url(#rp-g0)"/>
      <text x="240" y="37" text-anchor="middle" fill="white" font-weight="bold" font-size="13">Read Path — 7 Steps from SQL to Result</text>
      <!-- SQL query -->
      <rect x="15" y="62" width="450" height="55" rx="4" fill="#0f172a" stroke="#38bdf8"/>
      <text x="30" y="80" fill="#64748b" font-size="9">Recommendation pipeline query:</text>
      <text x="30" y="95" fill="#38bdf8" font-size="10">SELECT user_id, content_id, COUNT(*) AS plays</text>
      <text x="30" y="109" fill="#38bdf8" font-size="10">FROM prod.mediastream.user_events_silver</text>
      <text x="30" y="123" fill="#38bdf8" font-size="10">WHERE event_date = '2024-01-24' AND region = 'us-east-1' AND event_type = 'play'</text>
      <text x="30" y="137" fill="#38bdf8" font-size="10">GROUP BY 1, 2  ORDER BY plays DESC  LIMIT 1000000;</text>
      <!-- 7-step pipeline -->
      <text x="240" y="158" text-anchor="middle" fill="#64748b" font-size="9">Read path phases:</text>
      <rect x="15" y="165" width="450" height="60" rx="4" fill="#1e293b" stroke="#334155"/>
      <!-- Steps row -->
      <rect x="25" y="173" width="52" height="30" rx="3" fill="#0a1628" stroke="#38bdf8"/>
      <text x="51" y="186" text-anchor="middle" fill="#38bdf8" font-size="8">1. Catalog</text>
      <text x="51" y="197" text-anchor="middle" fill="#38bdf8" font-size="8">Lookup</text>
      <rect x="83" y="173" width="52" height="30" rx="3" fill="#0a1628" stroke="#a855f7"/>
      <text x="109" y="186" text-anchor="middle" fill="#a855f7" font-size="8">2. Delta</text>
      <text x="109" y="197" text-anchor="middle" fill="#a855f7" font-size="8">Log Scan</text>
      <rect x="141" y="173" width="52" height="30" rx="3" fill="#0a1628" stroke="#ff6b35"/>
      <text x="167" y="186" text-anchor="middle" fill="#ff6b35" font-size="8">3. File</text>
      <text x="167" y="197" text-anchor="middle" fill="#ff6b35" font-size="8">Stats</text>
      <rect x="199" y="173" width="52" height="30" rx="3" fill="#0a1628" stroke="#fbbf24"/>
      <text x="225" y="186" text-anchor="middle" fill="#fbbf24" font-size="8">4. Part.</text>
      <text x="225" y="197" text-anchor="middle" fill="#fbbf24" font-size="8">Pruning</text>
      <rect x="257" y="173" width="52" height="30" rx="3" fill="#0a1628" stroke="#4ade80"/>
      <text x="283" y="186" text-anchor="middle" fill="#4ade80" font-size="8">5. Parquet</text>
      <text x="283" y="197" text-anchor="middle" fill="#4ade80" font-size="8">Read</text>
      <rect x="315" y="173" width="52" height="30" rx="3" fill="#0a1628" stroke="#38bdf8"/>
      <text x="341" y="186" text-anchor="middle" fill="#38bdf8" font-size="8">6. Column</text>
      <text x="341" y="197" text-anchor="middle" fill="#38bdf8" font-size="8">Projection</text>
      <rect x="373" y="173" width="75" height="30" rx="3" fill="#0a1628" stroke="#4ade80"/>
      <text x="410" y="186" text-anchor="middle" fill="#4ade80" font-size="8">7. Result</text>
      <text x="410" y="197" text-anchor="middle" fill="#4ade80" font-size="8">Assembly</text>
      <!-- Timing -->
      <rect x="15" y="240" width="450" height="45" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="240" y="258" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">Query Timing Breakdown</text>
      <text x="30" y="272" fill="#64748b" font-size="9">Steps 1–5 (planning): ~0.8 s  •  Step 6 (Parquet read, 2.1 GB): ~31 s  •  Step 7 (shuffle/agg): ~6 s  •  Total: 38 s</text>
    </svg>`,

    // Step 1: Catalog Lookup
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Unity Catalog Resolution — 3-Part Name → S3 Path</text>
      <!-- Resolution chain -->
      <rect x="15" y="38" width="450" height="40" rx="4" fill="#0f172a" stroke="#38bdf8"/>
      <text x="240" y="62" text-anchor="middle" fill="#38bdf8" font-size="12" font-weight="bold">prod . mediastream . user_events_silver</text>
      <!-- Hierarchy boxes -->
      <rect x="15" y="90" width="130" height="75" rx="4" fill="#1e293b" stroke="#a855f7"/>
      <text x="80" y="107" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">Metastore</text>
      <text x="80" y="122" text-anchor="middle" fill="#64748b" font-size="9">mediastream</text>
      <text x="80" y="136" text-anchor="middle" fill="#64748b" font-size="9">s3://ms-metastore/</text>
      <text x="80" y="150" text-anchor="middle" fill="#64748b" font-size="9">3 catalogs</text>
      <line x1="145" y1="127" x2="168" y2="127" stroke="#a855f7" stroke-width="1.5" marker-end="url(#rp-a1)"/>
      <defs><marker id="rp-a1" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#a855f7"/></marker></defs>
      <rect x="171" y="90" width="130" height="75" rx="4" fill="#1e293b" stroke="#ff6b35"/>
      <text x="236" y="107" text-anchor="middle" fill="#ff6b35" font-size="10" font-weight="bold">Catalog: prod</text>
      <text x="236" y="122" text-anchor="middle" fill="#64748b" font-size="9">production data</text>
      <text x="236" y="136" text-anchor="middle" fill="#64748b" font-size="9">42 schemas</text>
      <text x="236" y="150" text-anchor="middle" fill="#64748b" font-size="9">1,200+ tables</text>
      <line x1="301" y1="127" x2="325" y2="127" stroke="#ff6b35" stroke-width="1.5" marker-end="url(#rp-a1)"/>
      <rect x="328" y="90" width="137" height="75" rx="4" fill="#1e293b" stroke="#4ade80"/>
      <text x="396" y="107" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">Schema: mediastream</text>
      <text x="396" y="122" text-anchor="middle" fill="#64748b" font-size="9">Tables: 247</text>
      <text x="396" y="136" text-anchor="middle" fill="#64748b" font-size="9">location:</text>
      <text x="396" y="150" text-anchor="middle" fill="#64748b" font-size="8">s3://ms-data-lake/</text>
      <!-- Access check -->
      <rect x="15" y="178" width="450" height="50" rx="4" fill="#1e293b" stroke="#fbbf24"/>
      <text x="240" y="196" text-anchor="middle" fill="#fbbf24" font-size="10" font-weight="bold">Unity Catalog Access Check</text>
      <text x="30" y="212" fill="#64748b" font-size="9">Principal: svc-rec-pipeline@mediastream  Privilege required: SELECT on prod.mediastream.user_events_silver</text>
      <text x="30" y="226" fill="#4ade80" font-size="9">✓ Granted via role: data-reader-silver  (row filter: none, column mask: none for this principal)</text>
      <!-- Result -->
      <rect x="15" y="240" width="450" height="45" rx="4" fill="#0a1628" stroke="#4ade80"/>
      <text x="240" y="258" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">Resolved location</text>
      <text x="240" y="274" text-anchor="middle" fill="#64748b" font-size="9">s3://ms-data-lake/silver/user_events/  (Delta format)  •  Duration: ~12 ms</text>
    </svg>`,

    // Step 2: Delta Log Scan
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Delta Log Scan — Reconstruct Snapshot at Version N</text>
      <!-- Log structure -->
      <rect x="15" y="38" width="200" height="145" rx="4" fill="#1e293b" stroke="#a855f7"/>
      <text x="115" y="55" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">_delta_log/ directory</text>
      <line x1="15" y1="60" x2="215" y2="60" stroke="#334155"/>
      <text x="30" y="76" fill="#64748b" font-size="9">├─ 00000000000.checkpoint.parquet</text>
      <text x="30" y="90" fill="#64748b" font-size="9">├─ 00000000000.json</text>
      <text x="30" y="103" fill="#64748b" font-size="9">├─ 00000000001.json</text>
      <text x="30" y="116" fill="#64748b" font-size="9">│  … (100 commits) …</text>
      <text x="30" y="130" fill="#4ade80" font-size="9">├─ 00000000100.checkpoint.parquet ←</text>
      <text x="30" y="143" fill="#64748b" font-size="9">├─ 00000000101.json</text>
      <text x="30" y="156" fill="#64748b" font-size="9">├─ 00000000102.json</text>
      <text x="30" y="169" fill="#4ade80" font-size="9">└─ 00000000421.json  ← latest</text>
      <!-- Algorithm -->
      <rect x="230" y="38" width="235" height="145" rx="4" fill="#0f172a" stroke="#334155"/>
      <text x="347" y="55" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">Snapshot Algorithm</text>
      <line x1="230" y1="60" x2="465" y2="60" stroke="#334155"/>
      <text x="245" y="77" fill="#64748b" font-size="9">1. Find latest checkpoint (v100)</text>
      <text x="245" y="91" fill="#64748b" font-size="9">2. Read checkpoint.parquet</text>
      <text x="245" y="104" fill="#64748b" font-size="9">   → active files at v100</text>
      <text x="245" y="118" fill="#64748b" font-size="9">3. Apply JSON commits 101–421</text>
      <text x="245" y="131" fill="#64748b" font-size="9">   → add new files</text>
      <text x="245" y="144" fill="#64748b" font-size="9">   → remove deleted files</text>
      <text x="245" y="157" fill="#4ade80" font-size="9">4. Active file list = snapshot v421</text>
      <text x="245" y="170" fill="#64748b" font-size="9">   Duration: ~120 ms</text>
      <!-- File list output -->
      <rect x="15" y="195" width="450" height="80" rx="4" fill="#1e293b" stroke="#4ade80"/>
      <text x="240" y="213" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">Active File List — Snapshot v421</text>
      <text x="30" y="229" fill="#64748b" font-size="9">8,200,000 active Parquet files total (before predicate filtering)</text>
      <text x="30" y="243" fill="#64748b" font-size="9">Each entry: {path, size, partitionValues, stats: {numRecords, minValues, maxValues, nullCount}}</text>
      <text x="30" y="257" fill="#64748b" font-size="9">Checkpoint Parquet is columnar → reading stats for 8.2M files costs ~80 MB I/O, ~40 ms</text>
      <text x="30" y="271" fill="#fbbf24" font-size="9">This happens in Spark driver — no executors needed yet. Zero data files opened.</text>
    </svg>`,

    // Step 3: File Stats Filter
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">File Stats Filter — Eliminate Non-Matching Files</text>
      <!-- Predicate -->
      <rect x="15" y="38" width="450" height="30" rx="4" fill="#0f172a" stroke="#38bdf8"/>
      <text x="240" y="58" text-anchor="middle" fill="#38bdf8" font-size="11">WHERE event_date = '2024-01-24'  AND region = 'us-east-1'</text>
      <!-- Funnel -->
      <text x="240" y="85" text-anchor="middle" fill="#64748b" font-size="9">Applying stats evaluation across 8.2M active files:</text>
      <!-- Stage 1 -->
      <rect x="100" y="92" width="280" height="35" rx="4" fill="#1c0a0a" stroke="#ef4444"/>
      <text x="240" y="107" text-anchor="middle" fill="#ef4444" font-size="10">8,200,000 files</text>
      <text x="240" y="120" text-anchor="middle" fill="#64748b" font-size="9">all active files in snapshot v421</text>
      <!-- Arrow down -->
      <line x1="240" y1="127" x2="240" y2="145" stroke="#fbbf24" stroke-width="1.5" marker-end="url(#rp-av)"/>
      <defs><marker id="rp-av" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto"><path d="M0,0 L3,5 L6,0 Z" fill="#fbbf24"/></marker></defs>
      <text x="330" y="139" fill="#fbbf24" font-size="9">max_event_date &lt; 2024-01-24 → skip</text>
      <!-- Stage 2 -->
      <rect x="120" y="147" width="240" height="30" rx="4" fill="#1e293b" stroke="#fbbf24"/>
      <text x="240" y="162" text-anchor="middle" fill="#fbbf24" font-size="10">560,000 files</text>
      <text x="240" y="174" text-anchor="middle" fill="#64748b" font-size="9">after date filter</text>
      <!-- Arrow down -->
      <line x1="240" y1="178" x2="240" y2="195" stroke="#fbbf24" stroke-width="1.5" marker-end="url(#rp-av)"/>
      <text x="330" y="189" fill="#fbbf24" font-size="9">partition_region ≠ us-east-1 → skip</text>
      <!-- Stage 3 -->
      <rect x="145" y="197" width="190" height="30" rx="4" fill="#0a1628" stroke="#4ade80"/>
      <text x="240" y="212" text-anchor="middle" fill="#4ade80" font-size="10">17,000 files</text>
      <text x="240" y="224" text-anchor="middle" fill="#64748b" font-size="9">passed to executors for reading</text>
      <!-- Summary -->
      <rect x="15" y="240" width="450" height="45" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="240" y="257" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">Skipping summary</text>
      <text x="240" y="274" text-anchor="middle" fill="#64748b" font-size="9">7,640,000 skipped by date stats  •  543,000 skipped by partition  •  17,000 sent to executors (0.2%)</text>
    </svg>`,

    // Step 4: Partition Pruning
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Partition Pruning — Directory Listing Optimization</text>
      <!-- Directory structure -->
      <rect x="15" y="38" width="200" height="200" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="115" y="55" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">S3 partition layout</text>
      <text x="30" y="72" fill="#64748b" font-size="9">s3://ms-data-lake/silver/user_events/</text>
      <text x="30" y="86" fill="#64748b" font-size="9">  event_date=2024-01-22/</text>
      <text x="45" y="99" fill="#ef4444" font-size="8">  region=eu-west-1/ ←skip</text>
      <text x="45" y="111" fill="#ef4444" font-size="8">  region=us-east-1/ ←skip (wrong date)</text>
      <text x="30" y="124" fill="#64748b" font-size="9">  event_date=2024-01-23/</text>
      <text x="45" y="137" fill="#ef4444" font-size="8">  region=eu-west-1/ ←skip</text>
      <text x="45" y="149" fill="#ef4444" font-size="8">  region=us-east-1/ ←skip (wrong date)</text>
      <text x="30" y="162" fill="#4ade80" font-size="9" font-weight="bold">  event_date=2024-01-24/</text>
      <text x="45" y="175" fill="#ef4444" font-size="8">  region=eu-west-1/ ←skip</text>
      <text x="45" y="188" fill="#4ade80" font-size="8">  region=us-east-1/ ← READ ✓</text>
      <text x="45" y="201" fill="#ef4444" font-size="8">  region=ap-south/  ←skip</text>
      <text x="30" y="214" fill="#64748b" font-size="9">  event_date=2024-01-25/ ←skip</text>
      <text x="30" y="228" fill="#64748b" font-size="9">  … 362 more date partitions …</text>
      <!-- Stats -->
      <rect x="230" y="38" width="235" height="200" rx="4" fill="#0f172a" stroke="#4ade80"/>
      <text x="347" y="55" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">Pruning Impact</text>
      <line x1="230" y1="60" x2="465" y2="60" stroke="#334155"/>
      <text x="245" y="77" fill="#64748b" font-size="9">Total date partitions: 365</text>
      <text x="245" y="91" fill="#64748b" font-size="9">After date pruning: 1</text>
      <text x="245" y="105" fill="#64748b" font-size="9">Total region partitions: 42</text>
      <text x="245" y="119" fill="#64748b" font-size="9">After region pruning: 1</text>
      <line x1="230" y1="127" x2="465" y2="127" stroke="#334155" stroke-dasharray="3,3"/>
      <text x="347" y="145" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">Directories listed: 1</text>
      <text x="347" y="160" text-anchor="middle" fill="#64748b" font-size="9">(instead of 15,330)</text>
      <text x="347" y="175" text-anchor="middle" fill="#64748b" font-size="9">S3 LIST calls: 1 (not 365×42)</text>
      <text x="347" y="192" text-anchor="middle" fill="#64748b" font-size="9">S3 LIST latency: 12 ms</text>
      <text x="347" y="207" text-anchor="middle" fill="#64748b" font-size="9">without pruning: 18+ s</text>
      <line x1="230" y1="212" x2="465" y2="212" stroke="#334155" stroke-dasharray="3,3"/>
      <text x="347" y="227" text-anchor="middle" fill="#fbbf24" font-size="9">Partition columns should match</text>
      <text x="347" y="240" text-anchor="middle" fill="#fbbf24" font-size="9">the most common filter patterns</text>
    </svg>`,

    // Step 5: Parquet Read
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Parquet Read — Column Projection + Row Group Filtering</text>
      <!-- Parquet structure -->
      <rect x="15" y="38" width="200" height="190" rx="4" fill="#1e293b" stroke="#ff6b35"/>
      <text x="115" y="56" text-anchor="middle" fill="#ff6b35" font-size="10" font-weight="bold">part-0041-v42.parquet</text>
      <text x="115" y="70" text-anchor="middle" fill="#64748b" font-size="9">Parquet internal structure</text>
      <line x1="15" y1="75" x2="215" y2="75" stroke="#334155"/>
      <rect x="25" y="82" width="180" height="35" rx="3" fill="#0a1628" stroke="#fbbf24"/>
      <text x="115" y="98" text-anchor="middle" fill="#fbbf24" font-size="9">Row Group 0  (min_date=Jan24)</text>
      <text x="115" y="111" text-anchor="middle" fill="#64748b" font-size="8">20,000 rows  — stats match → read</text>
      <rect x="25" y="122" width="180" height="35" rx="3" fill="#1e293b" stroke="#334155"/>
      <text x="115" y="138" text-anchor="middle" fill="#64748b" font-size="9">Row Group 1  (min_date=Jan23)</text>
      <text x="115" y="151" text-anchor="middle" fill="#ef4444" font-size="8">stats don't match → skip</text>
      <rect x="25" y="162" width="180" height="35" rx="3" fill="#0a1628" stroke="#fbbf24"/>
      <text x="115" y="178" text-anchor="middle" fill="#fbbf24" font-size="9">Row Group 2  (min_date=Jan24)</text>
      <text x="115" y="191" text-anchor="middle" fill="#64748b" font-size="8">18,000 rows — stats match → read</text>
      <text x="115" y="218" text-anchor="middle" fill="#64748b" font-size="8">footer: column offsets, stats</text>
      <!-- Column projection -->
      <rect x="230" y="38" width="235" height="190" rx="4" fill="#0f172a" stroke="#4ade80"/>
      <text x="347" y="56" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">Column Projection</text>
      <line x1="230" y1="61" x2="465" y2="61" stroke="#334155"/>
      <text x="245" y="78" fill="#64748b" font-size="9">Query selects: user_id, content_id,</text>
      <text x="245" y="91" fill="#64748b" font-size="9">  event_type (filter), plays (COUNT)</text>
      <line x1="230" y1="98" x2="465" y2="98" stroke="#334155" stroke-dasharray="3,3"/>
      <text x="245" y="114" fill="#ef4444" font-size="9">SKIP columns:</text>
      <text x="245" y="127" fill="#64748b" font-size="8">  session_id (not selected)</text>
      <text x="245" y="140" fill="#64748b" font-size="8">  device_type (not selected)</text>
      <text x="245" y="153" fill="#64748b" font-size="8">  quality_bitrate (not selected)</text>
      <text x="245" y="166" fill="#64748b" font-size="8">  _kafka_offset (not selected)</text>
      <line x1="230" y1="173" x2="465" y2="173" stroke="#334155" stroke-dasharray="3,3"/>
      <text x="245" y="189" fill="#4ade80" font-size="9">READ columns:</text>
      <text x="245" y="202" fill="#4ade80" font-size="8">  user_id, content_id, event_type</text>
      <text x="245" y="215" fill="#4ade80" font-size="8">  Bytes read: 2.1 GB (of 18 GB total)</text>
      <text x="240" y="253" text-anchor="middle" fill="#64748b" font-size="9">Parquet columnar format: only selected columns are decompressed from disk</text>
      <text x="240" y="267" text-anchor="middle" fill="#64748b" font-size="9">Column projection reduces I/O by 88%: 18 GB → 2.1 GB for this query</text>
    </svg>`,

    // Step 6: Result Assembly
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <defs>
        <linearGradient id="rp-res" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff6b35"/>
          <stop offset="100%" stop-color="#4ade80"/>
        </linearGradient>
      </defs>
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Result Assembly — End-to-End Summary</text>
      <!-- Pipeline -->
      <rect x="15" y="38" width="450" height="130" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="240" y="56" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">Read Path Timing Breakdown</text>
      <line x1="15" y1="61" x2="465" y2="61" stroke="#334155"/>
      <text x="30" y="78" fill="#38bdf8" font-size="9">1. Unity Catalog lookup + ACL check:</text>
      <text x="400" y="78" text-anchor="end" fill="#4ade80" font-size="9">12 ms</text>
      <text x="30" y="93" fill="#a855f7" font-size="9">2. Delta log scan (checkpoint + 321 JSONs):</text>
      <text x="400" y="93" text-anchor="end" fill="#4ade80" font-size="9">120 ms</text>
      <text x="30" y="108" fill="#ff6b35" font-size="9">3. File stats evaluation (8.2M files → 17K):</text>
      <text x="400" y="108" text-anchor="end" fill="#4ade80" font-size="9">80 ms</text>
      <text x="30" y="123" fill="#fbbf24" font-size="9">4. Partition pruning (S3 LIST × 1 dir):</text>
      <text x="400" y="123" text-anchor="end" fill="#4ade80" font-size="9">12 ms</text>
      <text x="30" y="138" fill="#4ade80" font-size="9">5. Parquet read (2.1 GB, 17K files, 200 executors):</text>
      <text x="400" y="138" text-anchor="end" fill="#4ade80" font-size="9">31 s</text>
      <text x="30" y="153" fill="#38bdf8" font-size="9">6. Shuffle + GROUP BY + top-1M sort:</text>
      <text x="400" y="153" text-anchor="end" fill="#4ade80" font-size="9">6.2 s</text>
      <!-- Bar chart -->
      <rect x="15" y="182" width="450" height="35" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="30" y="197" fill="#64748b" font-size="8">planning</text>
      <rect x="70" y="190" width="6" height="12" rx="1" fill="#38bdf8"/>
      <text x="90" y="197" fill="#64748b" font-size="8">read</text>
      <rect x="110" y="190" width="220" height="12" rx="1" fill="#4ade80"/>
      <text x="340" y="197" fill="#64748b" font-size="8">shuffle</text>
      <rect x="370" y="190" width="45" height="12" rx="1" fill="#fbbf24"/>
      <text x="30" y="210" fill="#64748b" font-size="8">0.2 s</text>
      <text x="110" y="210" fill="#64748b" font-size="8">31 s  (82% of total)</text>
      <text x="370" y="210" fill="#64748b" font-size="8">6 s</text>
      <!-- Total -->
      <rect x="15" y="230" width="450" height="55" rx="4" fill="url(#rp-res)" opacity=".15" stroke="#4ade80"/>
      <text x="240" y="249" text-anchor="middle" fill="#4ade80" font-size="13" font-weight="bold">Total: 37.8 seconds</text>
      <text x="240" y="265" text-anchor="middle" fill="#64748b" font-size="9">vs 47 minutes without data skipping + Z-Order (74× faster)</text>
      <text x="240" y="279" text-anchor="middle" fill="#64748b" font-size="9">1,000,000 rows returned  •  2.1 GB scanned  •  200 Spark executors  •  i3.xlarge nodes</text>
    </svg>`,
  ];

  function _buildDiagram(si) { return DIAGRAMS[si] || DIAGRAMS[0]; }

  function _updateStep(el, si) {
    el.querySelectorAll('.rp-pill').forEach((pill, idx) => {
      pill.classList.toggle('active', idx === si);
      pill.classList.toggle('visited', idx < si);
    });
    const diagram = el.querySelector('#rp-diagram');
    if (diagram) diagram.innerHTML = _buildDiagram(si);
    const s = STEPS[si];
    const t = el.querySelector('#rp-info-title');
    const b = el.querySelector('#rp-info-body');
    const d = el.querySelector('#rp-info-detail');
    if (t) t.textContent = s.label;
    if (b) b.textContent = s.desc;
    if (d) d.textContent = s.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="rp-pill${i === 0 ? ' active' : ''}" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
<style>
.rp-page { display:flex; flex-direction:column; gap:16px; padding:16px; }
.rp-pills { display:flex; flex-wrap:wrap; gap:6px; }
.rp-pill {
  padding:4px 12px; border-radius:20px; border:1px solid var(--border);
  background:var(--surface); color:var(--text-muted); font-size:11px;
  cursor:pointer; transition:all .2s;
}
.rp-pill.active { border-color:var(--blue); color:var(--blue); background:rgba(56,189,248,.1); }
.rp-pill.visited { border-color:var(--border); color:var(--text-muted); opacity:.6; }
.rp-pill:hover { border-color:var(--blue); color:var(--blue); }
.rp-layout { display:grid; grid-template-columns:1fr 280px; gap:16px; }
.rp-diagram-wrap { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:8px; }
.rp-diagram-wrap svg { width:100%; height:auto; }
.rp-info { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:16px; display:flex; flex-direction:column; gap:8px; }
.rp-info-title { font-size:16px; font-weight:600; color:var(--blue); }
.rp-info-body { font-size:13px; color:var(--text); }
.rp-info-detail { font-size:12px; color:var(--text-muted); line-height:1.6; }
.rp-badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:11px; background:rgba(56,189,248,.15); color:var(--blue); border:1px solid rgba(56,189,248,.3); }
@media(max-width:720px){ .rp-layout{ grid-template-columns:1fr; } }
</style>
<div class="rp-page page-enter">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
    <h2 style="font-size:20px;font-weight:700;color:var(--text);margin:0;">Read Path</h2>
    <span class="rp-badge">Read Operation</span>
    <span style="color:var(--text-muted);font-size:12px;">Catalog lookup → Delta log → stats filter → partition pruning → Parquet → result</span>
  </div>
  <div class="rp-pills">${pills}</div>
  <div class="rp-layout">
    <div class="rp-diagram-wrap"><div id="rp-diagram">${_buildDiagram(0)}</div></div>
    <div class="rp-info">
      <div class="rp-info-title" id="rp-info-title">${STEPS[0].label}</div>
      <div class="rp-info-body" id="rp-info-body">${STEPS[0].desc}</div>
      <div class="rp-info-detail" id="rp-info-detail">${STEPS[0].detail}</div>
    </div>
  </div>
</div>`;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'rp-page page-enter';
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

    container.querySelectorAll('.rp-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['read-path'] = {
    id: 'read-path',
    title: 'Read Path',
    group: 'Read Operations',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
