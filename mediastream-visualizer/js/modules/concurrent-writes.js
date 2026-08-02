(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Optimistic Concurrency',
      desc: 'Delta Lake optimistic concurrency control model',
      detail: 'Delta Lake uses Optimistic Concurrency Control (OCC): multiple writers can proceed simultaneously, and conflicts are detected at commit time rather than locked upfront. Each writer reads the latest table version, makes its changes, then attempts to commit by writing a new JSON entry to the Delta log. If another commit happened in between, Delta checks whether the operations conflict. If not, the commit succeeds. If yes, a ConcurrentModificationException is thrown. MediaStream runs 14 concurrent writers on some tables — OCC ensures they rarely block each other.',
    },
    {
      label: 'Transaction Log',
      desc: 'How writers coordinate via the Delta transaction log',
      detail: 'Writer coordination flow: (1) Writer reads current version N from `_delta_log/`. (2) Writer processes data, produces new parquet files. (3) Writer attempts to write `_delta_log/00000...N+1.json`. (4) If another writer already wrote N+1, step 3 fails — Delta retries with conflict resolution. The log entry (JSON) contains: protocol, metadata, add/remove file actions. Atomicity guaranteed by file system rename semantics on object stores (S3, ADLS).',
    },
    {
      label: 'Conflict Detection',
      desc: 'What operations conflict and what coexist peacefully',
      detail: 'Delta conflict detection matrix: INSERT vs INSERT → no conflict (different files). INSERT vs UPDATE on same partition → conflict. UPDATE vs UPDATE on overlapping data → conflict. DELETE vs UPDATE on same rows → conflict. Blind INSERT (append-only streaming) → never conflicts. Streaming APPLY CHANGES → conflict-free by design (partition isolation). MediaStream: 12 concurrent Kafka consumers all doing blind appends to Bronze → zero conflicts. Silver MERGE runs serially to avoid conflicts.',
    },
    {
      label: 'Isolation Levels',
      desc: 'Snapshot Isolation and Serializable Isolation modes',
      detail: 'Delta supports two isolation levels: Snapshot Isolation (default) — readers see a consistent snapshot as of query start, never blocked by writers. Serializable — strongest isolation, prevents all anomalies including write skew, enabled with `ALTER TABLE SET TBLPROPERTIES (delta.isolationLevel = Serializable)`. MediaStream uses Snapshot Isolation for reads (analytics queries) and Serializable for critical financial tables (ad_revenue, subscription_events) where write skew is unacceptable.',
    },
    {
      label: 'Blind Appends',
      desc: 'Streaming blind appends — the conflict-free write pattern',
      detail: 'Blind append: a write that adds new rows without reading or modifying existing ones. In Delta, blind appends produce `add` log entries only — no `remove` entries. Multiple blind append writers on the same table NEVER conflict because they touch disjoint file sets. This is how MediaStream\'s 12 Kafka consumer groups all write to bronze_events_raw simultaneously: each consumer writes to separate partition directories, all as blind appends. Throughput: 27,778 rows/second sustained across all consumers.',
    },
    {
      label: 'MERGE Concurrency',
      desc: 'Handling concurrent MERGE operations safely',
      detail: 'MERGE (upsert) reads existing data before writing — making it conflict-prone. Two concurrent MERGEs on overlapping data will conflict. Solutions: (1) Serialize MERGEs at application level (MediaStream APPLY CHANGES INTO serializes by design). (2) Partition the table so concurrent MERGEs touch different partitions. (3) Use Serializable isolation. MediaStream MERGE pattern: APPLY CHANGES INTO partitioned by event_date — concurrent MERGEs target different date partitions, enabling ~6 concurrent APPLY CHANGES operations on Silver tables.',
    },
  ];

  const DIAGRAMS = [
    // Step 0: OCC overview
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">OPTIMISTIC CONCURRENCY CONTROL</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- Two writers -->
      <rect x="15" y="40" width="100" height="30" rx="4" fill="#1e2030" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="65" y="59" fill="#3b82f6" font-size="9" text-anchor="middle" font-weight="bold">Writer A</text>
      <rect x="365" y="40" width="100" height="30" rx="4" fill="#1e2030" stroke="#a855f7" stroke-width="1.5"/>
      <text x="415" y="59" fill="#a855f7" font-size="9" text-anchor="middle" font-weight="bold">Writer B</text>
      <!-- Read version -->
      <line x1="65" y1="70" x2="65" y2="100" stroke="#3b82f6" stroke-width="1" stroke-dasharray="4,3"/>
      <line x1="415" y1="70" x2="415" y2="100" stroke="#a855f7" stroke-width="1" stroke-dasharray="4,3"/>
      <!-- Delta log -->
      <rect x="165" y="85" width="150" height="40" rx="4" fill="#1e2030" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="240" y="103" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">Delta Log v10</text>
      <text x="240" y="117" fill="#a0a0a0" font-size="8" text-anchor="middle">Both read v10</text>
      <line x1="115" y1="105" x2="165" y2="105" stroke="#3b82f6" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="365" y1="105" x2="315" y2="105" stroke="#a855f7" stroke-width="1" marker-end="url(#arr)"/>
      <!-- Process -->
      <text x="65" y="145" fill="#3b82f6" font-size="8" text-anchor="middle">processes data</text>
      <text x="415" y="145" fill="#a855f7" font-size="8" text-anchor="middle">processes data</text>
      <!-- Commit attempt -->
      <rect x="165" y="165" width="150" height="40" rx="4" fill="#22c55e" fill-opacity="0.15" stroke="#22c55e" stroke-width="1.5"/>
      <text x="240" y="183" fill="#22c55e" font-size="9" text-anchor="middle" font-weight="bold">Delta Log v11</text>
      <text x="240" y="197" fill="#a0a0a0" font-size="8" text-anchor="middle">Writer A commits first</text>
      <line x1="65" y1="160" x2="165" y2="183" stroke="#3b82f6" stroke-width="1" marker-end="url(#arr)"/>
      <!-- Writer B conflict -->
      <rect x="310" y="165" width="150" height="40" rx="4" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="385" y="183" fill="#f59e0b" font-size="9" text-anchor="middle" font-weight="bold">Writer B: v11 exists!</text>
      <text x="385" y="197" fill="#a0a0a0" font-size="8" text-anchor="middle">Conflict check → retry</text>
      <line x1="415" y1="160" x2="385" y2="165" stroke="#a855f7" stroke-width="1" marker-end="url(#arr)"/>
      <!-- Outcome -->
      <rect x="10" y="220" width="460" height="68" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="238" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">CONFLICT RESOLUTION OUTCOMES</text>
      <rect x="20" y="246" width="200" height="34" rx="3" fill="#22c55e" fill-opacity="0.1"/>
      <text x="120" y="261" fill="#22c55e" font-size="8" text-anchor="middle" font-weight="bold">No conflict → retry succeeds</text>
      <text x="120" y="274" fill="#a0a0a0" font-size="7" text-anchor="middle">Different partitions / non-overlapping files</text>
      <rect x="250" y="246" width="210" height="34" rx="3" fill="#ef4444" fill-opacity="0.1"/>
      <text x="355" y="261" fill="#ef4444" font-size="8" text-anchor="middle" font-weight="bold">Conflict → ConcurrentModificationException</text>
      <text x="355" y="274" fill="#a0a0a0" font-size="7" text-anchor="middle">Overlapping UPDATE/DELETE on same rows</text>
    </svg>`,

    // Step 1: Transaction log coordination
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">WRITER COORDINATION VIA DELTA LOG</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- Steps -->
      <rect x="10" y="38" width="460" height="22" rx="3" fill="#ff6b35" fill-opacity="0.15"/>
      <text x="30" y="54" fill="#ff6b35" font-size="9" font-weight="bold">STEP</text>
      <text x="240" y="54" fill="#ff6b35" font-size="9" font-weight="bold">ACTION</text>
      <rect x="10" y="62" width="460" height="18" rx="2" fill="#1a1d2e"/>
      <text x="30" y="75" fill="#3b82f6" font-size="9" font-weight="bold">1</text>
      <text x="240" y="75" fill="#a0a0a0" font-size="8" text-anchor="middle">Read current version N from _delta_log/</text>
      <rect x="10" y="82" width="460" height="18" rx="2" fill="#12141f"/>
      <text x="30" y="95" fill="#3b82f6" font-size="9" font-weight="bold">2</text>
      <text x="240" y="95" fill="#a0a0a0" font-size="8" text-anchor="middle">Process data, write new parquet files to staging area</text>
      <rect x="10" y="102" width="460" height="18" rx="2" fill="#1a1d2e"/>
      <text x="30" y="115" fill="#3b82f6" font-size="9" font-weight="bold">3</text>
      <text x="240" y="115" fill="#a0a0a0" font-size="8" text-anchor="middle">Attempt atomic write of N+1.json to Delta log</text>
      <rect x="10" y="122" width="460" height="18" rx="2" fill="#12141f"/>
      <text x="30" y="135" fill="#3b82f6" font-size="9" font-weight="bold">4a</text>
      <text x="240" y="135" fill="#22c55e" font-size="8" text-anchor="middle">SUCCESS: N+1.json did not exist → commit completes</text>
      <rect x="10" y="142" width="460" height="18" rx="2" fill="#1a1d2e"/>
      <text x="30" y="155" fill="#3b82f6" font-size="9" font-weight="bold">4b</text>
      <text x="240" y="155" fill="#f59e0b" font-size="8" text-anchor="middle">CONFLICT: N+1.json already exists → check if ops overlap</text>
      <rect x="10" y="162" width="460" height="18" rx="2" fill="#12141f"/>
      <text x="30" y="175" fill="#3b82f6" font-size="9" font-weight="bold">5</text>
      <text x="240" y="175" fill="#a0a0a0" font-size="8" text-anchor="middle">Non-overlapping → increment to N+2, re-attempt. Overlapping → throw.</text>
      <!-- Log entry structure -->
      <rect x="10" y="196" width="460" height="95" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="214" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">LOG ENTRY STRUCTURE (00000000000000000011.json)</text>
      <text x="24" y="232" fill="#a0a0a0" font-size="8">{"protocol": {"minReaderVersion": 1, "minWriterVersion": 2}}</text>
      <text x="24" y="248" fill="#22c55e" font-size="8">{"add": {"path": "part-00001.snappy.parquet", "size": 1610612736, ...}}</text>
      <text x="24" y="264" fill="#22c55e" font-size="8">{"add": {"path": "part-00002.snappy.parquet", "size": 1610612736, ...}}</text>
      <text x="24" y="280" fill="#ef4444" font-size="8">{"remove": {"path": "old-part-001.snappy.parquet", "deletionTimestamp": ...}}</text>
    </svg>`,

    // Step 2: Conflict detection matrix
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">CONFLICT DETECTION MATRIX</text>
      <!-- Matrix header -->
      <rect x="10" y="35" width="460" height="20" rx="3" fill="#ff6b35" fill-opacity="0.15"/>
      <text x="110" y="50" fill="#ff6b35" font-size="9" font-weight="bold" text-anchor="middle">WRITER A</text>
      <text x="240" y="50" fill="#ff6b35" font-size="9" font-weight="bold" text-anchor="middle">WRITER B</text>
      <text x="390" y="50" fill="#ff6b35" font-size="9" font-weight="bold" text-anchor="middle">RESULT</text>
      <!-- Matrix rows -->
      <rect x="10" y="57" width="460" height="20" rx="2" fill="#1a1d2e"/>
      <text x="110" y="71" fill="#a0a0a0" font-size="8" text-anchor="middle">Blind INSERT (append)</text>
      <text x="240" y="71" fill="#a0a0a0" font-size="8" text-anchor="middle">Blind INSERT (append)</text>
      <rect x="335" y="60" width="130" height="14" rx="2" fill="#22c55e" fill-opacity="0.3"/>
      <text x="390" y="71" fill="#22c55e" font-size="8" text-anchor="middle">NO CONFLICT</text>
      <rect x="10" y="79" width="460" height="20" rx="2" fill="#12141f"/>
      <text x="110" y="93" fill="#a0a0a0" font-size="8" text-anchor="middle">INSERT (diff partitions)</text>
      <text x="240" y="93" fill="#a0a0a0" font-size="8" text-anchor="middle">UPDATE</text>
      <rect x="335" y="82" width="130" height="14" rx="2" fill="#22c55e" fill-opacity="0.3"/>
      <text x="390" y="93" fill="#22c55e" font-size="8" text-anchor="middle">NO CONFLICT</text>
      <rect x="10" y="101" width="460" height="20" rx="2" fill="#1a1d2e"/>
      <text x="110" y="115" fill="#a0a0a0" font-size="8" text-anchor="middle">INSERT (same partition)</text>
      <text x="240" y="115" fill="#a0a0a0" font-size="8" text-anchor="middle">UPDATE (same partition)</text>
      <rect x="335" y="104" width="130" height="14" rx="2" fill="#ef4444" fill-opacity="0.3"/>
      <text x="390" y="115" fill="#ef4444" font-size="8" text-anchor="middle">CONFLICT</text>
      <rect x="10" y="123" width="460" height="20" rx="2" fill="#12141f"/>
      <text x="110" y="137" fill="#a0a0a0" font-size="8" text-anchor="middle">UPDATE (rows 1-100K)</text>
      <text x="240" y="137" fill="#a0a0a0" font-size="8" text-anchor="middle">UPDATE (rows 50K-150K)</text>
      <rect x="335" y="126" width="130" height="14" rx="2" fill="#ef4444" fill-opacity="0.3"/>
      <text x="390" y="137" fill="#ef4444" font-size="8" text-anchor="middle">CONFLICT</text>
      <rect x="10" y="145" width="460" height="20" rx="2" fill="#1a1d2e"/>
      <text x="110" y="159" fill="#a0a0a0" font-size="8" text-anchor="middle">DELETE</text>
      <text x="240" y="159" fill="#a0a0a0" font-size="8" text-anchor="middle">UPDATE (overlapping)</text>
      <rect x="335" y="148" width="130" height="14" rx="2" fill="#ef4444" fill-opacity="0.3"/>
      <text x="390" y="159" fill="#ef4444" font-size="8" text-anchor="middle">CONFLICT</text>
      <rect x="10" y="167" width="460" height="20" rx="2" fill="#12141f"/>
      <text x="110" y="181" fill="#a0a0a0" font-size="8" text-anchor="middle">APPLY CHANGES INTO</text>
      <text x="240" y="181" fill="#a0a0a0" font-size="8" text-anchor="middle">APPLY CHANGES INTO</text>
      <rect x="335" y="170" width="130" height="14" rx="2" fill="#22c55e" fill-opacity="0.3"/>
      <text x="390" y="181" fill="#22c55e" font-size="8" text-anchor="middle">NO CONFLICT *</text>
      <!-- Footnote -->
      <text x="240" y="200" fill="#a0a0a0" font-size="7" text-anchor="middle">* with partition isolation — each APPLY CHANGES targets separate partition</text>
      <!-- MediaStream -->
      <rect x="10" y="213" width="460" height="78" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="231" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">MEDIASTREAM CONCURRENT WRITER PATTERNS</text>
      <text x="240" y="249" fill="#22c55e" font-size="8" text-anchor="middle">Bronze: 12 Kafka consumers → blind appends → zero conflicts</text>
      <text x="240" y="265" fill="#22c55e" font-size="8" text-anchor="middle">Silver: 8 streams → APPLY CHANGES by event_date partition → no conflicts</text>
      <text x="240" y="281" fill="#f59e0b" font-size="8" text-anchor="middle">Silver MERGE: serialized (1 at a time) to avoid UPDATE vs UPDATE conflicts</text>
    </svg>`,

    // Step 3: Isolation levels
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">ISOLATION LEVELS</text>
      <!-- Two isolation boxes -->
      <rect x="10" y="35" width="220" height="130" rx="5" fill="#1e2030" stroke="#3b82f6" stroke-width="2"/>
      <text x="120" y="56" fill="#3b82f6" font-size="10" text-anchor="middle" font-weight="bold">SNAPSHOT ISOLATION</text>
      <text x="120" y="72" fill="#a0a0a0" font-size="8" text-anchor="middle">(DEFAULT)</text>
      <text x="120" y="92" fill="#a0a0a0" font-size="8" text-anchor="middle">Readers see consistent snapshot</text>
      <text x="120" y="106" fill="#a0a0a0" font-size="8" text-anchor="middle">as of query start time</text>
      <text x="120" y="120" fill="#a0a0a0" font-size="8" text-anchor="middle">Never blocked by writers</text>
      <text x="120" y="134" fill="#a0a0a0" font-size="8" text-anchor="middle">Allows write skew anomaly</text>
      <text x="120" y="148" fill="#3b82f6" font-size="8" text-anchor="middle">Best for analytics tables</text>
      <rect x="250" y="35" width="220" height="130" rx="5" fill="#1e2030" stroke="#ff6b35" stroke-width="2"/>
      <text x="360" y="56" fill="#ff6b35" font-size="10" text-anchor="middle" font-weight="bold">SERIALIZABLE</text>
      <text x="360" y="72" fill="#a0a0a0" font-size="8" text-anchor="middle">(STRONGEST)</text>
      <text x="360" y="92" fill="#a0a0a0" font-size="8" text-anchor="middle">All transactions appear to</text>
      <text x="360" y="106" fill="#a0a0a0" font-size="8" text-anchor="middle">execute one at a time</text>
      <text x="360" y="120" fill="#a0a0a0" font-size="8" text-anchor="middle">Prevents write skew</text>
      <text x="360" y="134" fill="#a0a0a0" font-size="8" text-anchor="middle">Higher contention / lower throughput</text>
      <text x="360" y="148" fill="#ff6b35" font-size="8" text-anchor="middle">For financial / critical tables</text>
      <!-- Enable serializable -->
      <rect x="10" y="180" width="460" height="40" rx="4" fill="#12141f" stroke="#ff6b35" stroke-width="1"/>
      <text x="24" y="200" fill="#ff6b35" font-size="10">ALTER TABLE</text>
      <text x="120" y="200" fill="#3b82f6" font-size="10">mediastream.silver.ad_revenue</text>
      <text x="24" y="216" fill="#ff6b35" font-size="10">  SET TBLPROPERTIES</text>
      <text x="168" y="216" fill="#22c55e" font-size="10">(delta.isolationLevel = 'Serializable');</text>
      <!-- MediaStream policy -->
      <rect x="10" y="234" width="460" height="58" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="252" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">MEDIASTREAM ISOLATION POLICY</text>
      <rect x="20" y="260" width="200" height="24" rx="3" fill="#3b82f6" fill-opacity="0.1"/>
      <text x="120" y="272" fill="#3b82f6" font-size="8" text-anchor="middle" font-weight="bold">Snapshot Isolation</text>
      <text x="120" y="282" fill="#a0a0a0" font-size="7" text-anchor="middle">All analytics/DLT tables</text>
      <rect x="250" y="260" width="210" height="24" rx="3" fill="#ff6b35" fill-opacity="0.1"/>
      <text x="355" y="272" fill="#ff6b35" font-size="8" text-anchor="middle" font-weight="bold">Serializable</text>
      <text x="355" y="282" fill="#a0a0a0" font-size="7" text-anchor="middle">ad_revenue, subscription_events</text>
    </svg>`,

    // Step 4: Blind appends
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">BLIND APPENDS — CONFLICT-FREE STREAMING</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- 12 consumers -->
      <text x="240" y="48" fill="#a0a0a0" font-size="9" text-anchor="middle">12 Kafka consumer groups → bronze_events_raw</text>
      <rect x="10" y="56" width="55" height="25" rx="3" fill="#1e2030" stroke="#3b82f6" stroke-width="1"/>
      <text x="37" y="73" fill="#3b82f6" font-size="7" text-anchor="middle">consumer-1</text>
      <rect x="75" y="56" width="55" height="25" rx="3" fill="#1e2030" stroke="#3b82f6" stroke-width="1"/>
      <text x="102" y="73" fill="#3b82f6" font-size="7" text-anchor="middle">consumer-2</text>
      <rect x="140" y="56" width="55" height="25" rx="3" fill="#1e2030" stroke="#3b82f6" stroke-width="1"/>
      <text x="167" y="73" fill="#3b82f6" font-size="7" text-anchor="middle">consumer-3</text>
      <rect x="205" y="56" width="55" height="25" rx="3" fill="#1e2030" stroke="#3b82f6" stroke-width="1"/>
      <text x="232" y="73" fill="#3b82f6" font-size="7" text-anchor="middle">consumer-4</text>
      <rect x="270" y="56" width="55" height="25" rx="3" fill="#1e2030" stroke="#3b82f6" stroke-width="1"/>
      <text x="297" y="73" fill="#3b82f6" font-size="7" text-anchor="middle">consumer-5</text>
      <rect x="335" y="56" width="55" height="25" rx="3" fill="#1e2030" stroke="#3b82f6" stroke-width="1"/>
      <text x="362" y="73" fill="#3b82f6" font-size="7" text-anchor="middle">consumer-6</text>
      <text x="420" y="65" fill="#a0a0a0" font-size="8" text-anchor="middle">+6 more</text>
      <!-- Arrows down -->
      <line x1="37" y1="81" x2="37" y2="105" stroke="#3b82f6" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="102" y1="81" x2="102" y2="105" stroke="#3b82f6" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="167" y1="81" x2="167" y2="105" stroke="#3b82f6" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="232" y1="81" x2="232" y2="105" stroke="#3b82f6" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="297" y1="81" x2="297" y2="105" stroke="#3b82f6" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="362" y1="81" x2="362" y2="105" stroke="#3b82f6" stroke-width="1" marker-end="url(#arr)"/>
      <!-- Bronze table -->
      <rect x="10" y="105" width="450" height="50" rx="5" fill="#1e2030" stroke="#ff6b35" stroke-width="2"/>
      <text x="235" y="130" fill="#ff6b35" font-size="10" text-anchor="middle" font-weight="bold">bronze_events_raw</text>
      <text x="235" y="146" fill="#a0a0a0" font-size="8" text-anchor="middle">Each consumer writes to separate parquet files — NO READS of existing data</text>
      <!-- Log entries -->
      <rect x="10" y="168" width="460" height="55" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="186" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">DELTA LOG: ONLY "add" ENTRIES (no removes)</text>
      <text x="24" y="205" fill="#22c55e" font-size="8">{"add": {"path": "consumer-1/part-001.parquet", "size": 67108864}}</text>
      <text x="24" y="218" fill="#22c55e" font-size="8">{"add": {"path": "consumer-2/part-001.parquet", "size": 67108864}}</text>
      <!-- Metrics -->
      <rect x="10" y="237" width="460" height="52" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="255" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">BLIND APPEND THROUGHPUT</text>
      <text x="100" y="273" fill="#e0e0e0" font-size="10" text-anchor="middle" font-weight="bold">27,778</text>
      <text x="100" y="284" fill="#a0a0a0" font-size="8" text-anchor="middle">rows/sec total</text>
      <text x="240" y="273" fill="#e0e0e0" font-size="10" text-anchor="middle" font-weight="bold">0</text>
      <text x="240" y="284" fill="#a0a0a0" font-size="8" text-anchor="middle">conflicts ever</text>
      <text x="380" y="273" fill="#e0e0e0" font-size="10" text-anchor="middle" font-weight="bold">12</text>
      <text x="380" y="284" fill="#a0a0a0" font-size="8" text-anchor="middle">concurrent writers</text>
      <line x1="165" y1="260" x2="165" y2="286" stroke="#333" stroke-width="0.5"/>
      <line x1="310" y1="260" x2="310" y2="286" stroke="#333" stroke-width="0.5"/>
    </svg>`,

    // Step 5: MERGE concurrency
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">CONCURRENT MERGE — PARTITION ISOLATION</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- Problem -->
      <rect x="10" y="38" width="460" height="35" rx="4" fill="#ef4444" fill-opacity="0.1" stroke="#ef4444" stroke-width="1"/>
      <text x="240" y="54" fill="#ef4444" font-size="9" text-anchor="middle" font-weight="bold">PROBLEM: Two concurrent MERGEs = conflict</text>
      <text x="240" y="67" fill="#a0a0a0" font-size="8" text-anchor="middle">MERGE reads existing data → UPDATE vs UPDATE → ConcurrentModificationException</text>
      <!-- Solution: partition isolation -->
      <rect x="10" y="88" width="460" height="120" rx="5" fill="#1e2030" stroke="#22c55e" stroke-width="1.5"/>
      <text x="240" y="106" fill="#22c55e" font-size="9" text-anchor="middle" font-weight="bold">SOLUTION: Partition Isolation</text>
      <text x="240" y="120" fill="#a0a0a0" font-size="8" text-anchor="middle">APPLY CHANGES INTO partitioned by event_date</text>
      <!-- 6 concurrent writers on different partitions -->
      <rect x="20" y="130" width="60" height="28" rx="3" fill="#22c55e" fill-opacity="0.15" stroke="#22c55e" stroke-width="1"/>
      <text x="50" y="143" fill="#22c55e" font-size="7" text-anchor="middle">MERGE</text>
      <text x="50" y="153" fill="#a0a0a0" font-size="7" text-anchor="middle">Jan 15</text>
      <rect x="95" y="130" width="60" height="28" rx="3" fill="#22c55e" fill-opacity="0.15" stroke="#22c55e" stroke-width="1"/>
      <text x="125" y="143" fill="#22c55e" font-size="7" text-anchor="middle">MERGE</text>
      <text x="125" y="153" fill="#a0a0a0" font-size="7" text-anchor="middle">Jan 14</text>
      <rect x="170" y="130" width="60" height="28" rx="3" fill="#22c55e" fill-opacity="0.15" stroke="#22c55e" stroke-width="1"/>
      <text x="200" y="143" fill="#22c55e" font-size="7" text-anchor="middle">MERGE</text>
      <text x="200" y="153" fill="#a0a0a0" font-size="7" text-anchor="middle">Jan 13</text>
      <rect x="245" y="130" width="60" height="28" rx="3" fill="#22c55e" fill-opacity="0.15" stroke="#22c55e" stroke-width="1"/>
      <text x="275" y="143" fill="#22c55e" font-size="7" text-anchor="middle">MERGE</text>
      <text x="275" y="153" fill="#a0a0a0" font-size="7" text-anchor="middle">Jan 12</text>
      <rect x="320" y="130" width="60" height="28" rx="3" fill="#22c55e" fill-opacity="0.15" stroke="#22c55e" stroke-width="1"/>
      <text x="350" y="143" fill="#22c55e" font-size="7" text-anchor="middle">MERGE</text>
      <text x="350" y="153" fill="#a0a0a0" font-size="7" text-anchor="middle">Jan 11</text>
      <rect x="395" y="130" width="60" height="28" rx="3" fill="#22c55e" fill-opacity="0.15" stroke="#22c55e" stroke-width="1"/>
      <text x="425" y="143" fill="#22c55e" font-size="7" text-anchor="middle">MERGE</text>
      <text x="425" y="153" fill="#a0a0a0" font-size="7" text-anchor="middle">Jan 10</text>
      <text x="240" y="190" fill="#22c55e" font-size="8" text-anchor="middle">All 6 target different date partitions → NO CONFLICTS</text>
      <!-- MediaStream -->
      <rect x="10" y="225" width="460" height="65" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="243" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">MEDIASTREAM APPLY CHANGES PATTERN</text>
      <text x="240" y="260" fill="#a0a0a0" font-size="8" text-anchor="middle">6 concurrent APPLY CHANGES INTO on silver tables</text>
      <text x="240" y="275" fill="#a0a0a0" font-size="8" text-anchor="middle">Each targets: event_date = today-N, N ∈ [0,5]</text>
      <text x="240" y="284" fill="#22c55e" font-size="7" text-anchor="middle">Zero conflicts in 180 days of production operation</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.cw-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.cw-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.cw-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="cw-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="cw-header module-header">
        <div class="module-tag" style="background:var(--delta)">ADVANCED</div>
        <h2 class="module-title">Concurrent Writes</h2>
        <p class="module-subtitle">Optimistic concurrency, conflict detection, and isolation levels in Delta Lake</p>
      </div>
      <div class="cw-pills step-pills">${pills}</div>
      <div class="cw-diagram diagram-frame"></div>
      <div class="cw-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'cw-page page-enter';
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
    container.querySelectorAll('.cw-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['concurrent-writes'] = {
    id: 'concurrent-writes',
    title: 'Concurrent Writes',
    group: 'Advanced',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
