(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Fundamentals',
      desc: 'What is Delta Lake and why does it exist?',
      detail: 'Delta Lake is an open-source storage layer that adds ACID transactions, scalable metadata, and versioning to data lakes. It solves the "data swamp" problem: plain Parquet files on S3 have no atomicity, no schema enforcement, and no versioning. Delta adds a _delta_log/ transaction log — every change is a JSON entry recording add/remove file actions. This enables consistent reads, time travel, streaming+batch unification, and schema evolution without rewriting existing data.',
    },
    {
      label: 'ACID Deep Dive',
      desc: 'How does Delta Lake achieve ACID compliance?',
      detail: 'Atomicity: every write is all-or-nothing — files land atomically or not at all. Consistency: schema enforcement + CHECK constraints reject invalid data at write time. Isolation: optimistic concurrency control — readers always see a consistent snapshot at the version they started reading; writers detect conflicts at commit time by checking the log for intervening writes. Durability: committed transactions persist in cloud object storage with no in-process state. The log entry is a compare-and-swap atomic write to cloud storage.',
    },
    {
      label: 'Performance',
      desc: 'How do you optimize Delta Lake tables at scale?',
      detail: 'Three primary levers: (1) Partitioning eliminates entire file directories from scans — 99.4% scan reduction at MediaStream. (2) OPTIMIZE compacts small files (Parquet has ~48KB overhead per file; 284K → 187 files). (3) Z-Ordering co-locates related data on disk via a space-filling curve — 284K → 11 files scanned for user+date queries. Liquid Clustering (Delta 3.1+) replaces static partitioning + Z-Order with automatic incremental clustering. VACUUM frees 3.1TB/week at MediaStream = $354K/year saved.',
    },
    {
      label: 'Streaming & CDC',
      desc: 'How does Delta Lake handle streaming and change tracking?',
      detail: 'Streaming writes use blind appends — each Kafka consumer appends independently without locking (27,778 rows/sec, 12 consumers, zero conflicts). Structured Streaming treats Delta as an infinite source using log-based checkpointing. Change Data Feed (CDF): enableChangeDataFeed=true captures insert/update/delete rows with a _change_type column — table_changes() returns only modified rows, cutting downstream reprocessing by 94%. DLT pipelines add EXPECT/EXPECT_OR_DROP/EXPECT_OR_FAIL for declarative quality enforcement at the pipeline level.',
    },
    {
      label: 'Unity Catalog',
      desc: 'What governance features does Unity Catalog provide?',
      detail: 'Unity Catalog adds enterprise governance on top of Delta: (1) Three-level namespace: catalog.schema.table — one metastore per region, multiple workspaces attached. (2) Fine-grained access: row-level security via dynamic SQL filters (CURRENT_USER()), column masking functions (SHA-256 for non-privileged roles). (3) Automatic column-level data lineage across notebooks, jobs, and SQL. (4) Delta Sharing: open REST protocol for cross-org data sharing without copying data. (5) Audit logs: every read/write recorded to system.access.audit for GDPR compliance.',
    },
    {
      label: 'System Design',
      desc: 'Design a Lakehouse for 180M users, 2.4B events/day',
      detail: 'MediaStream architecture: (1) Ingest: 12 Kafka topics → Structured Streaming → Bronze (raw, event_date partitioned, RETAIN 72h for streaming safety). (2) Bronze→Silver via DLT: EXPECT drops invalid rows (99.94% quality), deduplication on event_id, user/content enrichment. (3) Silver→Gold: OPTIMIZE+ZORDER daily, aggregated metrics for analyst SQL. (4) ML: Feature Store on Silver with point-in-time joins, Redis online serving <10ms, 94.2% cache hit. (5) Governance: Unity Catalog with PII masking (email, IP), row security by workspace, Delta Sharing for partner data exchange.',
    },
  ];

  const DIAGRAMS = [
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Delta Lake Core Architecture</text>
      <rect x="30" y="44" width="120" height="210" rx="8" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="90" y="63" text-anchor="middle" fill="var(--text-muted)" font-size="8" font-weight="700">OBJECT STORAGE</text>
      <rect x="42" y="72" width="96" height="26" rx="4" fill="rgba(255,107,53,0.18)" stroke="var(--delta)" stroke-width="1"/>
      <text x="90" y="89" text-anchor="middle" fill="var(--delta)" font-size="9">_delta_log/</text>
      <rect x="42" y="106" width="96" height="20" rx="3" fill="var(--bg-4)"/>
      <text x="90" y="120" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">part-0001.parquet</text>
      <rect x="42" y="130" width="96" height="20" rx="3" fill="var(--bg-4)"/>
      <text x="90" y="144" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">part-0002.parquet</text>
      <rect x="42" y="154" width="96" height="20" rx="3" fill="var(--bg-4)"/>
      <text x="90" y="168" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">part-0003.parquet</text>
      <rect x="42" y="178" width="96" height="20" rx="3" fill="var(--bg-4)" opacity="0.5"/>
      <text x="90" y="192" text-anchor="middle" fill="var(--text-muted)" font-size="7.5" opacity="0.5">part-0004.parquet</text>
      <rect x="180" y="44" width="130" height="210" rx="8" fill="var(--bg-3)" stroke="var(--delta)" stroke-width="1.5"/>
      <text x="245" y="63" text-anchor="middle" fill="var(--delta)" font-size="8" font-weight="700">DELTA LAKE LAYER</text>
      <rect x="192" y="72" width="106" height="22" rx="4" fill="rgba(255,107,53,0.2)"/>
      <text x="245" y="87" text-anchor="middle" fill="var(--delta)" font-size="8.5">ACID Transactions</text>
      <rect x="192" y="100" width="106" height="22" rx="4" fill="rgba(255,107,53,0.14)"/>
      <text x="245" y="115" text-anchor="middle" fill="var(--delta)" font-size="8.5">Schema Evolution</text>
      <rect x="192" y="128" width="106" height="22" rx="4" fill="rgba(255,107,53,0.14)"/>
      <text x="245" y="143" text-anchor="middle" fill="var(--delta)" font-size="8.5">Time Travel</text>
      <rect x="192" y="156" width="106" height="22" rx="4" fill="rgba(255,107,53,0.14)"/>
      <text x="245" y="171" text-anchor="middle" fill="var(--delta)" font-size="8.5">Data Skipping</text>
      <rect x="192" y="184" width="106" height="22" rx="4" fill="rgba(255,107,53,0.14)"/>
      <text x="245" y="199" text-anchor="middle" fill="var(--delta)" font-size="8.5">Stream + Batch</text>
      <rect x="330" y="44" width="120" height="210" rx="8" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="390" y="63" text-anchor="middle" fill="var(--text-muted)" font-size="8" font-weight="700">QUERY ENGINES</text>
      <rect x="342" y="72" width="96" height="22" rx="3" fill="var(--bg-4)"/>
      <text x="390" y="87" text-anchor="middle" fill="var(--text-secondary)" font-size="8.5">Apache Spark</text>
      <rect x="342" y="100" width="96" height="22" rx="3" fill="var(--bg-4)"/>
      <text x="390" y="115" text-anchor="middle" fill="var(--text-secondary)" font-size="8.5">Databricks SQL</text>
      <rect x="342" y="128" width="96" height="22" rx="3" fill="var(--bg-4)"/>
      <text x="390" y="143" text-anchor="middle" fill="var(--text-secondary)" font-size="8.5">Apache Flink</text>
      <rect x="342" y="156" width="96" height="22" rx="3" fill="var(--bg-4)"/>
      <text x="390" y="171" text-anchor="middle" fill="var(--text-secondary)" font-size="8.5">Trino / Presto</text>
      <rect x="342" y="184" width="96" height="22" rx="3" fill="var(--bg-4)"/>
      <text x="390" y="199" text-anchor="middle" fill="var(--text-secondary)" font-size="8.5">Redshift / Athena</text>
      <defs><marker id="a0" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="var(--delta)"/></marker></defs>
      <path d="M150 155 L178 155" stroke="var(--delta)" stroke-width="1.5" marker-end="url(#a0)" fill="none"/>
      <path d="M310 155 L328 155" stroke="var(--delta)" stroke-width="1.5" marker-end="url(#a0)" fill="none"/>
      <text x="240" y="272" text-anchor="middle" fill="var(--text-muted)" font-size="9">Open format: Parquet data + JSON transaction log</text>
      <text x="240" y="286" text-anchor="middle" fill="var(--text-muted)" font-size="8">847 Delta tables at MediaStream · 180M subscribers · 2.4B events/day</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">ACID via Transaction Log</text>
      <rect x="18" y="44" width="94" height="38" rx="6" fill="rgba(255,107,53,0.12)" stroke="var(--delta)" stroke-width="1"/>
      <text x="65" y="58" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">Writer A</text>
      <text x="65" y="74" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">read v3 → write v4</text>
      <rect x="18" y="98" width="94" height="38" rx="6" fill="rgba(255,107,53,0.12)" stroke="var(--delta)" stroke-width="1"/>
      <text x="65" y="112" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">Writer B</text>
      <text x="65" y="128" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">read v3 → conflict!</text>
      <rect x="18" y="160" width="94" height="38" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="65" y="174" text-anchor="middle" fill="var(--text-secondary)" font-size="9" font-weight="700">Reader</text>
      <text x="65" y="190" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">snapshot = v3</text>
      <rect x="152" y="36" width="162" height="228" rx="8" fill="var(--bg-3)" stroke="var(--delta)" stroke-width="1.5"/>
      <text x="233" y="54" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">_delta_log/</text>
      <rect x="162" y="62" width="142" height="26" rx="4" fill="rgba(255,107,53,0.1)"/>
      <text x="233" y="74" text-anchor="middle" fill="var(--text-muted)" font-size="8">000...001.json (v1)</text>
      <text x="233" y="84" text-anchor="middle" fill="var(--text-muted)" font-size="7">add: part-001.parquet</text>
      <rect x="162" y="93" width="142" height="26" rx="4" fill="rgba(255,107,53,0.1)"/>
      <text x="233" y="105" text-anchor="middle" fill="var(--text-muted)" font-size="8">000...002.json (v2)</text>
      <text x="233" y="115" text-anchor="middle" fill="var(--text-muted)" font-size="7">add: part-002; remove: 001</text>
      <rect x="162" y="124" width="142" height="26" rx="4" fill="rgba(255,107,53,0.1)"/>
      <text x="233" y="136" text-anchor="middle" fill="var(--text-muted)" font-size="8">000...003.json (v3)</text>
      <text x="233" y="146" text-anchor="middle" fill="var(--text-muted)" font-size="7">add: part-003.parquet</text>
      <rect x="162" y="155" width="142" height="26" rx="4" fill="rgba(168,85,247,0.15)" stroke="rgba(168,85,247,0.4)" stroke-width="1"/>
      <text x="233" y="167" text-anchor="middle" fill="#a855f7" font-size="8">000...004.json (v4) ← A wins</text>
      <text x="233" y="177" text-anchor="middle" fill="var(--text-muted)" font-size="7">atomic CAS on object store</text>
      <rect x="162" y="186" width="142" height="26" rx="4" fill="rgba(255,107,53,0.1)"/>
      <text x="233" y="198" text-anchor="middle" fill="var(--text-muted)" font-size="8">000...005.json (v5) ← B retry</text>
      <text x="233" y="208" text-anchor="middle" fill="var(--text-muted)" font-size="7">after re-read + re-process</text>
      <path d="M112 63 L150 68" stroke="var(--delta)" stroke-width="1" stroke-dasharray="4,3" fill="none"/>
      <path d="M112 117 L150 108" stroke="var(--delta)" stroke-width="1" stroke-dasharray="4,3" fill="none"/>
      <path d="M112 179 L150 168" stroke="var(--text-muted)" stroke-width="1" stroke-dasharray="4,3" fill="none"/>
      <rect x="330" y="50" width="128" height="90" rx="6" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="394" y="67" text-anchor="middle" fill="var(--text-muted)" font-size="8.5" font-weight="700">ACID</text>
      <rect x="340" y="74" width="108" height="16" rx="3" fill="rgba(255,107,53,0.12)"/>
      <text x="394" y="85" text-anchor="middle" fill="var(--delta)" font-size="7.5">A — atomic commit</text>
      <rect x="340" y="94" width="108" height="16" rx="3" fill="rgba(255,107,53,0.12)"/>
      <text x="394" y="105" text-anchor="middle" fill="var(--delta)" font-size="7.5">C — schema checks</text>
      <rect x="340" y="114" width="108" height="16" rx="3" fill="rgba(255,107,53,0.12)"/>
      <text x="394" y="125" text-anchor="middle" fill="var(--delta)" font-size="7.5">I — snapshot isolation</text>
      <text x="394" y="148" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Readers always see</text>
      <text x="394" y="160" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">consistent snapshot —</text>
      <text x="394" y="172" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">never partial write</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Performance Optimization Stack</text>
      <polygon points="240,46 460,254 20,254" fill="none" stroke="var(--border-subtle)" stroke-width="1"/>
      <polygon points="240,46 460,254 20,254" fill="rgba(255,107,53,0.03)"/>
      <text x="240" y="82" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">▲ LIQUID CLUSTERING (Delta 3.1+)</text>
      <text x="240" y="94" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Automatic incremental clustering · zero OPTIMIZE needed</text>
      <line x1="80" y1="108" x2="400" y2="108" stroke="var(--border-subtle)" stroke-width="0.8" stroke-dasharray="4,3"/>
      <text x="240" y="125" text-anchor="middle" fill="var(--text-secondary)" font-size="9" font-weight="700">Z-ORDERING</text>
      <text x="240" y="137" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Space-filling curve · 284K → 11 files scanned per query</text>
      <line x1="55" y1="150" x2="425" y2="150" stroke="var(--border-subtle)" stroke-width="0.8" stroke-dasharray="4,3"/>
      <text x="240" y="166" text-anchor="middle" fill="var(--text-secondary)" font-size="9" font-weight="700">OPTIMIZE + DATA SKIPPING</text>
      <text x="240" y="178" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">284K → 187 files · column stats skip 94% of reads</text>
      <line x1="30" y1="190" x2="450" y2="190" stroke="var(--border-subtle)" stroke-width="0.8" stroke-dasharray="4,3"/>
      <text x="240" y="207" text-anchor="middle" fill="var(--text-secondary)" font-size="9" font-weight="700">PARTITIONING</text>
      <text x="240" y="219" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">event_date partitions · 99.4% scan reduction at MediaStream</text>
      <text x="240" y="245" text-anchor="middle" fill="var(--text-muted)" font-size="9" font-weight="700">VACUUM — Storage Reclamation</text>
      <text x="240" y="260" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">3.1TB/week freed · $354K/year saved · Bronze 3d, ML 30d retention</text>
      <text x="240" y="280" text-anchor="middle" fill="var(--text-muted)" font-size="8">P50 query: 42s → 14s · 20× ROI on OPTIMIZE job cost</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Streaming + Change Data Feed</text>
      <rect x="10" y="44" width="66" height="52" rx="5" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="43" y="62" text-anchor="middle" fill="var(--text-muted)" font-size="8" font-weight="700">KAFKA</text>
      <text x="43" y="75" text-anchor="middle" fill="var(--text-muted)" font-size="7">12 topics</text>
      <text x="43" y="87" text-anchor="middle" fill="var(--delta)" font-size="7">2.4B/day</text>
      <rect x="92" y="44" width="80" height="52" rx="5" fill="rgba(255,107,53,0.1)" stroke="var(--delta)" stroke-width="1"/>
      <text x="132" y="62" text-anchor="middle" fill="var(--delta)" font-size="8" font-weight="700">Structured</text>
      <text x="132" y="74" text-anchor="middle" fill="var(--delta)" font-size="8" font-weight="700">Streaming</text>
      <text x="132" y="88" text-anchor="middle" fill="var(--text-muted)" font-size="7">27,778 rows/s</text>
      <rect x="188" y="44" width="68" height="52" rx="5" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="222" y="62" text-anchor="middle" fill="var(--text-secondary)" font-size="8" font-weight="700">BRONZE</text>
      <text x="222" y="75" text-anchor="middle" fill="var(--text-muted)" font-size="7">blind appends</text>
      <text x="222" y="87" text-anchor="middle" fill="var(--text-muted)" font-size="7">0 conflicts</text>
      <rect x="272" y="44" width="68" height="52" rx="5" fill="rgba(255,107,53,0.1)" stroke="var(--delta)" stroke-width="1"/>
      <text x="306" y="62" text-anchor="middle" fill="var(--delta)" font-size="8" font-weight="700">SILVER</text>
      <text x="306" y="74" text-anchor="middle" fill="var(--delta)" font-size="7">CDF enabled</text>
      <text x="306" y="86" text-anchor="middle" fill="var(--text-muted)" font-size="7">_change_type</text>
      <rect x="356" y="44" width="78" height="52" rx="5" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="395" y="60" text-anchor="middle" fill="var(--text-secondary)" font-size="8" font-weight="700">DOWNSTREAM</text>
      <text x="395" y="73" text-anchor="middle" fill="var(--text-muted)" font-size="7">changed rows only</text>
      <text x="395" y="85" text-anchor="middle" fill="var(--delta)" font-size="7">94% less data</text>
      <defs><marker id="aiv" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L7,2.5 z" fill="var(--delta)"/></marker></defs>
      <path d="M76 70 L90 70" stroke="var(--delta)" stroke-width="1.3" marker-end="url(#aiv)" fill="none"/>
      <path d="M172 70 L186 70" stroke="var(--delta)" stroke-width="1.3" marker-end="url(#aiv)" fill="none"/>
      <path d="M256 70 L270 70" stroke="var(--delta)" stroke-width="1.3" marker-end="url(#aiv)" fill="none"/>
      <path d="M340 70 L354 70" stroke="var(--delta)" stroke-width="1.3" marker-end="url(#aiv)" fill="none"/>
      <rect x="10" y="115" width="460" height="128" rx="6" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="20" y="132" fill="var(--text-muted)" font-size="8" font-weight="700">CHANGE DATA FEED</text>
      <text x="20" y="150" fill="var(--text-muted)" font-size="8">-- 1. Enable on Silver table</text>
      <text x="20" y="164" fill="var(--delta)" font-size="8">ALTER TABLE silver.user_events SET TBLPROPERTIES (</text>
      <text x="20" y="178" fill="var(--delta)" font-size="8">  'delta.enableChangeDataFeed' = 'true' );</text>
      <text x="20" y="196" fill="var(--text-muted)" font-size="8">-- 2. Read only changes (insert/update_pre/update_post/delete)</text>
      <text x="20" y="210" fill="var(--delta)" font-size="8">SELECT * FROM table_changes('silver.user_events', 3)</text>
      <text x="20" y="224" fill="var(--delta)" font-size="8">WHERE _change_type = 'update_postimage';</text>
      <text x="240" y="254" text-anchor="middle" fill="var(--text-muted)" font-size="8">_change_type values: insert · update_preimage · update_postimage · delete</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="#a855f7" font-size="13" font-weight="700">Unity Catalog Governance Layers</text>
      <rect x="22" y="40" width="436" height="34" rx="6" fill="rgba(168,85,247,0.1)" stroke="#a855f7" stroke-width="1.5"/>
      <text x="50" y="52" fill="#a855f7" font-size="9" font-weight="700">CATALOG</text>
      <text x="115" y="52" fill="var(--text-muted)" font-size="8.5">mediastream_prod</text>
      <text x="265" y="52" fill="#a855f7" font-size="9" font-weight="700">SCHEMA</text>
      <text x="330" y="52" fill="var(--text-muted)" font-size="8.5">silver</text>
      <text x="240" y="66" text-anchor="middle" fill="var(--text-muted)" font-size="7">Three-level namespace: catalog.schema.table — one metastore, multiple workspaces</text>
      <rect x="22" y="86" width="134" height="78" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="89" y="103" text-anchor="middle" fill="var(--text-secondary)" font-size="8.5" font-weight="700">Row Security</text>
      <text x="89" y="118" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Dynamic filter per user</text>
      <text x="89" y="131" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">CURRENT_USER() check</text>
      <text x="89" y="144" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">No data copy needed</text>
      <text x="89" y="157" text-anchor="middle" fill="#a855f7" font-size="7">region_id = get_user_region()</text>
      <rect x="173" y="86" width="134" height="78" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="240" y="103" text-anchor="middle" fill="var(--text-secondary)" font-size="8.5" font-weight="700">Column Masking</text>
      <text x="240" y="118" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">SHA-256 for non-privileged</text>
      <text x="240" y="131" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">PII: email, IP, payment</text>
      <text x="240" y="144" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Transparent to queries</text>
      <text x="240" y="157" text-anchor="middle" fill="#a855f7" font-size="7">mask_email(email)</text>
      <rect x="324" y="86" width="134" height="78" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="391" y="103" text-anchor="middle" fill="var(--text-secondary)" font-size="8.5" font-weight="700">Data Lineage</text>
      <text x="391" y="118" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Column-level auto-track</text>
      <text x="391" y="131" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Notebooks + Jobs + SQL</text>
      <text x="391" y="144" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Impact analysis</text>
      <text x="391" y="157" text-anchor="middle" fill="#a855f7" font-size="7">23 RCAs via lineage</text>
      <rect x="22" y="178" width="134" height="78" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="89" y="195" text-anchor="middle" fill="var(--text-secondary)" font-size="8.5" font-weight="700">Audit Logs</text>
      <text x="89" y="210" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">system.access.audit</text>
      <text x="89" y="223" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Every read/write logged</text>
      <text x="89" y="236" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">GDPR + SOC2 compliant</text>
      <rect x="173" y="178" width="134" height="78" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="240" y="195" text-anchor="middle" fill="var(--text-secondary)" font-size="8.5" font-weight="700">Delta Sharing</text>
      <text x="240" y="210" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Open REST protocol</text>
      <text x="240" y="223" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">No data copy needed</text>
      <text x="240" y="236" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Cross-cloud / cross-org</text>
      <rect x="324" y="178" width="134" height="78" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="391" y="195" text-anchor="middle" fill="var(--text-secondary)" font-size="8.5" font-weight="700">Fine-Grained ACL</text>
      <text x="391" y="210" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">GRANT / REVOKE SQL</text>
      <text x="391" y="223" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Group-based + ABAC</text>
      <text x="391" y="236" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Inherits from catalog</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="22" text-anchor="middle" fill="var(--delta)" font-size="12" font-weight="700">MediaStream Lakehouse — System Design</text>
      <rect x="10" y="36" width="60" height="52" rx="5" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="40" y="55" text-anchor="middle" fill="var(--text-muted)" font-size="7.5" font-weight="700">KAFKA</text>
      <text x="40" y="67" text-anchor="middle" fill="var(--text-muted)" font-size="7">12 topics</text>
      <text x="40" y="79" text-anchor="middle" fill="var(--delta)" font-size="7">2.4B/day</text>
      <rect x="82" y="36" width="66" height="52" rx="5" fill="rgba(180,100,0,0.18)" stroke="#b46400" stroke-width="1"/>
      <text x="115" y="54" text-anchor="middle" fill="#b46400" font-size="8" font-weight="700">BRONZE</text>
      <text x="115" y="66" text-anchor="middle" fill="var(--text-muted)" font-size="7">Raw · blind app.</text>
      <text x="115" y="78" text-anchor="middle" fill="var(--text-muted)" font-size="7">event_date part.</text>
      <rect x="160" y="36" width="66" height="52" rx="5" fill="rgba(150,150,150,0.18)" stroke="#999" stroke-width="1"/>
      <text x="193" y="54" text-anchor="middle" fill="#aaa" font-size="8" font-weight="700">SILVER</text>
      <text x="193" y="66" text-anchor="middle" fill="var(--text-muted)" font-size="7">EXPECT dedup</text>
      <text x="193" y="78" text-anchor="middle" fill="var(--text-muted)" font-size="7">CDF enabled</text>
      <rect x="238" y="36" width="66" height="52" rx="5" fill="rgba(200,160,0,0.18)" stroke="#c8a000" stroke-width="1"/>
      <text x="271" y="54" text-anchor="middle" fill="#c8a000" font-size="8" font-weight="700">GOLD</text>
      <text x="271" y="66" text-anchor="middle" fill="var(--text-muted)" font-size="7">Aggregated</text>
      <text x="271" y="78" text-anchor="middle" fill="var(--text-muted)" font-size="7">ZORDER daily</text>
      <rect x="316" y="36" width="70" height="52" rx="5" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="351" y="54" text-anchor="middle" fill="var(--text-secondary)" font-size="7.5" font-weight="700">SQL</text>
      <text x="351" y="66" text-anchor="middle" fill="var(--text-muted)" font-size="7">Analysts</text>
      <text x="351" y="78" text-anchor="middle" fill="var(--text-muted)" font-size="7">Dashboards</text>
      <rect x="398" y="36" width="72" height="52" rx="5" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
      <text x="434" y="53" text-anchor="middle" fill="var(--text-secondary)" font-size="7.5" font-weight="700">PARTNERS</text>
      <text x="434" y="65" text-anchor="middle" fill="var(--text-muted)" font-size="7">Delta Sharing</text>
      <text x="434" y="77" text-anchor="middle" fill="var(--text-muted)" font-size="7">No copy</text>
      <defs><marker id="asd" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L7,2.5 z" fill="var(--delta)"/></marker></defs>
      <path d="M70 62 L80 62" stroke="var(--delta)" stroke-width="1.2" marker-end="url(#asd)" fill="none"/>
      <path d="M148 62 L158 62" stroke="var(--delta)" stroke-width="1.2" marker-end="url(#asd)" fill="none"/>
      <path d="M226 62 L236 62" stroke="var(--delta)" stroke-width="1.2" marker-end="url(#asd)" fill="none"/>
      <path d="M304 62 L314 62" stroke="var(--delta)" stroke-width="1.2" marker-end="url(#asd)" fill="none"/>
      <path d="M386 62 L396 62" stroke="var(--delta)" stroke-width="1.2" marker-end="url(#asd)" fill="none"/>
      <rect x="82" y="108" width="222" height="46" rx="5" fill="rgba(255,107,53,0.1)" stroke="var(--delta)" stroke-width="1"/>
      <text x="193" y="125" text-anchor="middle" fill="var(--delta)" font-size="8.5" font-weight="700">ML FEATURE STORE</text>
      <text x="193" y="138" text-anchor="middle" fill="var(--text-muted)" font-size="7">2,847 features · Redis online &lt;10ms · 94.2% cache hit · 2.8B lookups/day</text>
      <path d="M193 88 L193 106" stroke="var(--delta)" stroke-width="1.1" stroke-dasharray="4,2" marker-end="url(#asd)" fill="none"/>
      <rect x="10" y="170" width="460" height="54" rx="6" fill="rgba(168,85,247,0.08)" stroke="#a855f7" stroke-width="1.5"/>
      <text x="240" y="188" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="700">UNITY CATALOG GOVERNANCE</text>
      <text x="240" y="202" text-anchor="middle" fill="var(--text-muted)" font-size="7">Row-level security · Column masking (PII) · Delta Sharing · system.access.audit</text>
      <text x="240" y="216" text-anchor="middle" fill="var(--text-muted)" font-size="7">Data lineage · GRANT/REVOKE · Single metastore · multi-workspace</text>
      <text x="240" y="244" text-anchor="middle" fill="var(--text-muted)" font-size="8">847 tables · 99.94% quality · 45ms P50 recommendation latency · 180M subscribers</text>
      <text x="240" y="258" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">DLT Pipelines: EXPECT 47 constraints · 99.91% Silver quality · 23 RCAs via lineage</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    el.querySelectorAll('.iv-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.iv-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.iv-info');
    if (info) info.textContent = STEPS[si].detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="iv-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="iv-header module-header">
        <div>
          <div class="module-tag" style="background:var(--delta)">LEARNING</div>
          <h2 class="module-title">Interview Prep</h2>
          <p class="module-subtitle">Delta Lake + Unity Catalog interview questions — from core concepts to system design at MediaStream scale</p>
        </div>
      </div>
      <div class="iv-pills step-pills">${pills}</div>
      <div class="iv-diagram diagram-frame"></div>
      <div class="iv-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'iv-page page-enter';
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
    container.querySelectorAll('.iv-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['interview'] = {
    id: 'interview', title: 'Interview Prep', group: 'Learning',
    render: _render,
    destroy() { if (_engine) { _engine.destroy(); _engine = null; } IV.AnimationControls.hide(); },
  };
})();
