(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Current Schema',
      desc: 'MediaStream event schema — the foundation',
      detail: 'user_events_silver has been stable for 18 months with 6 core columns ingested from Kafka clickstream events.',
    },
    {
      label: 'ADD COLUMN',
      desc: 'Safely adding new columns — zero downtime',
      detail: 'Delta Lake records schema changes in the transaction log. Old files are read with NULL for the new column. No rewrite needed.',
    },
    {
      label: 'Type Widening',
      desc: 'Widening numeric types — safe promotion',
      detail: 'INT → BIGINT and FLOAT → DOUBLE are safe because no data precision is lost. Delta rejects narrowing casts that could corrupt data.',
    },
    {
      label: 'Unsafe Operations',
      desc: 'Schema incompatibilities that Delta blocks',
      detail: 'Dropping columns, renaming columns, and narrowing types all break reader contracts. Delta raises AnalysisException before writing.',
    },
    {
      label: 'mergeSchema',
      desc: 'Automatic schema merging on write',
      detail: 'Setting mergeSchema=true on a write lets Delta automatically reconcile new columns from incoming DataFrames — ideal for evolving ML feature tables.',
    },
    {
      label: 'Unity Catalog',
      desc: 'Schema governance enforced across the platform',
      detail: 'Unity Catalog validates schema changes against column-level policies, lineage contracts, and downstream consumer SLAs before committing.',
    },
  ];

  let _engine = null;

  const DIAGRAMS = [
    // Step 0: Current Schema
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <defs>
        <linearGradient id="se-hdr" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff6b35"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
      </defs>
      <rect x="80" y="20" width="320" height="32" rx="4" fill="url(#se-hdr)"/>
      <text x="240" y="41" text-anchor="middle" fill="white" font-weight="bold" font-size="13">user_events_silver</text>
      <text x="240" y="60" text-anchor="middle" fill="#94a3b8" font-size="10">prod.mediastream.user_events_silver  •  v1 schema  •  18 months stable</text>
      <rect x="80" y="70" width="320" height="195" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <!-- header -->
      <rect x="80" y="70" width="320" height="24" rx="4" fill="#1e293b"/>
      <rect x="80" y="82" width="320" height="12" fill="#1e293b"/>
      <text x="100" y="86" fill="#64748b" font-size="10">COLUMN NAME</text>
      <text x="230" y="86" fill="#64748b" font-size="10">TYPE</text>
      <text x="330" y="86" fill="#64748b" font-size="10">NULLABLE</text>
      <line x1="80" y1="94" x2="400" y2="94" stroke="#334155" stroke-width="1"/>
      <!-- rows -->
      <text x="100" y="113" fill="#38bdf8" font-size="11">user_id</text>
      <text x="230" y="113" fill="#a855f7" font-size="11">STRING</text>
      <text x="330" y="113" fill="#4ade80" font-size="11">NO</text>
      <text x="100" y="133" fill="#38bdf8" font-size="11">event_type</text>
      <text x="230" y="133" fill="#a855f7" font-size="11">STRING</text>
      <text x="330" y="133" fill="#4ade80" font-size="11">NO</text>
      <text x="100" y="153" fill="#38bdf8" font-size="11">content_id</text>
      <text x="230" y="153" fill="#a855f7" font-size="11">STRING</text>
      <text x="330" y="153" fill="#fbbf24" font-size="11">YES</text>
      <text x="100" y="173" fill="#38bdf8" font-size="11">session_duration_ms</text>
      <text x="230" y="173" fill="#a855f7" font-size="11">INT</text>
      <text x="330" y="173" fill="#fbbf24" font-size="11">YES</text>
      <text x="100" y="193" fill="#38bdf8" font-size="11">region</text>
      <text x="230" y="193" fill="#a855f7" font-size="11">STRING</text>
      <text x="330" y="193" fill="#4ade80" font-size="11">NO</text>
      <text x="100" y="213" fill="#38bdf8" font-size="11">event_ts</text>
      <text x="230" y="213" fill="#a855f7" font-size="11">TIMESTAMP</text>
      <text x="330" y="213" fill="#4ade80" font-size="11">NO</text>
      <line x1="80" y1="221" x2="400" y2="221" stroke="#334155" stroke-width="1"/>
      <text x="100" y="238" fill="#64748b" font-size="10">6 columns  •  partitioned by (region, date)  •  ~2.1B rows/day</text>
      <text x="100" y="253" fill="#64748b" font-size="10">registered in Unity Catalog: prod.mediastream.user_events_silver</text>
    </svg>`,

    // Step 1: ADD COLUMN
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <defs>
        <linearGradient id="se-g1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff6b35"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
      </defs>
      <!-- Old files -->
      <rect x="20" y="50" width="130" height="90" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="85" y="68" text-anchor="middle" fill="#64748b" font-size="10">OLD FILES</text>
      <text x="85" y="84" text-anchor="middle" fill="#38bdf8" font-size="10">user_id ✓</text>
      <text x="85" y="99" text-anchor="middle" fill="#38bdf8" font-size="10">event_type ✓</text>
      <text x="85" y="114" text-anchor="middle" fill="#38bdf8" font-size="10">session_duration_ms ✓</text>
      <text x="85" y="129" text-anchor="middle" fill="#ef4444" font-size="10">device_type → NULL</text>
      <!-- New files -->
      <rect x="330" y="50" width="130" height="90" rx="4" fill="#1e293b" stroke="#4ade80"/>
      <text x="395" y="68" text-anchor="middle" fill="#64748b" font-size="10">NEW FILES</text>
      <text x="395" y="84" text-anchor="middle" fill="#38bdf8" font-size="10">user_id ✓</text>
      <text x="395" y="99" text-anchor="middle" fill="#38bdf8" font-size="10">event_type ✓</text>
      <text x="395" y="114" text-anchor="middle" fill="#38bdf8" font-size="10">session_duration_ms ✓</text>
      <text x="395" y="129" text-anchor="middle" fill="#4ade80" font-size="10">device_type = "mobile"</text>
      <!-- Arrow -->
      <text x="240" y="95" text-anchor="middle" fill="#fbbf24" font-size="10" font-weight="bold">ALTER TABLE</text>
      <text x="240" y="108" text-anchor="middle" fill="#fbbf24" font-size="10">ADD COLUMN</text>
      <text x="240" y="121" text-anchor="middle" fill="#fbbf24" font-size="10">device_type</text>
      <text x="240" y="134" text-anchor="middle" fill="#fbbf24" font-size="10">STRING</text>
      <line x1="155" y1="96" x2="210" y2="96" stroke="#fbbf24" stroke-width="1.5" marker-end="url(#arr)"/>
      <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#fbbf24"/></marker></defs>
      <line x1="270" y1="96" x2="325" y2="96" stroke="#fbbf24" stroke-width="1.5" marker-end="url(#arr)"/>
      <!-- Delta log entry -->
      <rect x="60" y="175" width="360" height="100" rx="4" fill="#0f172a" stroke="#334155"/>
      <text x="80" y="192" fill="#64748b" font-size="9">_delta_log/00000000000000000042.json</text>
      <text x="80" y="208" fill="#a855f7" font-size="10">{"metaData": {"schemaString": "{\\"type\\":\\"struct\\",\\"fields\\":[</text>
      <text x="80" y="222" fill="#a855f7" font-size="10">  ...existing fields...,</text>
      <text x="80" y="236" fill="#4ade80" font-size="10">  {\\"name\\":\\"device_type\\",\\"type\\":\\"string\\",\\"nullable\\":true}</text>
      <text x="80" y="250" fill="#a855f7" font-size="10">]}}</text>
      <text x="80" y="264" fill="#64748b" font-size="9">No data rewrite. Old files return NULL for device_type on read.</text>
    </svg>`,

    // Step 2: Type Widening
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="28" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Safe Type Widening — No Data Loss</text>
      <!-- Safe widening -->
      <rect x="20" y="45" width="200" height="110" rx="4" fill="#1e293b" stroke="#4ade80"/>
      <text x="120" y="63" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="bold">✓ SAFE PROMOTIONS</text>
      <line x1="20" y1="68" x2="220" y2="68" stroke="#334155"/>
      <text x="40" y="86" fill="#94a3b8" font-size="10">session_duration_ms:</text>
      <text x="40" y="100" fill="#fbbf24" font-size="10">INT → BIGINT</text>
      <text x="190" y="100" text-anchor="end" fill="#4ade80" font-size="10">✓ OK</text>
      <text x="40" y="118" fill="#94a3b8" font-size="10">quality_score:</text>
      <text x="40" y="132" fill="#fbbf24" font-size="10">FLOAT → DOUBLE</text>
      <text x="190" y="132" text-anchor="end" fill="#4ade80" font-size="10">✓ OK</text>
      <text x="40" y="148" fill="#94a3b8" font-size="10">view_count:</text>
      <text x="40" y="148" fill="#fbbf24" dx="100" font-size="10">BYTE → SHORT</text>
      <text x="190" y="148" text-anchor="end" fill="#4ade80" font-size="10">✓ OK</text>
      <!-- Unsafe narrowing -->
      <rect x="260" y="45" width="200" height="110" rx="4" fill="#1e293b" stroke="#ef4444"/>
      <text x="360" y="63" text-anchor="middle" fill="#ef4444" font-size="11" font-weight="bold">✗ BLOCKED — DATA LOSS</text>
      <line x1="260" y1="68" x2="460" y2="68" stroke="#334155"/>
      <text x="280" y="86" fill="#94a3b8" font-size="10">session_duration_ms:</text>
      <text x="280" y="100" fill="#ef4444" font-size="10">BIGINT → INT</text>
      <text x="440" y="100" text-anchor="end" fill="#ef4444" font-size="10">✗</text>
      <text x="280" y="118" fill="#94a3b8" font-size="10">quality_score:</text>
      <text x="280" y="132" fill="#ef4444" font-size="10">DOUBLE → FLOAT</text>
      <text x="440" y="132" text-anchor="end" fill="#ef4444" font-size="10">✗</text>
      <text x="280" y="148" fill="#94a3b8" font-size="10">event_ts:</text>
      <text x="380" y="148" fill="#ef4444" font-size="10">TIMESTAMP → STRING</text>
      <!-- Error box -->
      <rect x="20" y="170" width="440" height="55" rx="4" fill="#1c0a0a" stroke="#ef4444"/>
      <text x="40" y="188" fill="#ef4444" font-size="10" font-weight="bold">AnalysisException:</text>
      <text x="40" y="202" fill="#94a3b8" font-size="10">Cannot update prod.mediastream.user_events_silver field session_duration_ms:</text>
      <text x="40" y="216" fill="#94a3b8" font-size="10">update a BIGINT field to INT would cause data truncation.</text>
      <!-- Medallion note -->
      <text x="240" y="248" text-anchor="middle" fill="#64748b" font-size="9">MediaStream: INT was hit when view counts exceeded 2.1B — widening to BIGINT solved INC-2023-007</text>
    </svg>`,

    // Step 3: Unsafe Operations
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Operations Delta Blocks — Protect Downstream Consumers</text>
      <!-- 3 blocked ops -->
      <rect x="15" y="35" width="140" height="115" rx="4" fill="#1c0a0a" stroke="#ef4444"/>
      <text x="85" y="52" text-anchor="middle" fill="#ef4444" font-size="10" font-weight="bold">DROP COLUMN</text>
      <text x="85" y="68" text-anchor="middle" fill="#64748b" font-size="9">ALTER TABLE t</text>
      <text x="85" y="81" text-anchor="middle" fill="#64748b" font-size="9">DROP COLUMN region</text>
      <rect x="25" y="90" width="120" height="40" rx="3" fill="#0f172a"/>
      <text x="85" y="104" text-anchor="middle" fill="#ef4444" font-size="9">AnalysisException:</text>
      <text x="85" y="116" text-anchor="middle" fill="#94a3b8" font-size="8">dropping columns not</text>
      <text x="85" y="127" text-anchor="middle" fill="#94a3b8" font-size="8">allowed (columnMapping off)</text>
      <text x="85" y="142" text-anchor="middle" fill="#94a3b8" font-size="8">Gold tables read region →</text>

      <rect x="170" y="35" width="140" height="115" rx="4" fill="#1c0a0a" stroke="#ef4444"/>
      <text x="240" y="52" text-anchor="middle" fill="#ef4444" font-size="10" font-weight="bold">RENAME COLUMN</text>
      <text x="240" y="68" text-anchor="middle" fill="#64748b" font-size="9">ALTER TABLE t RENAME</text>
      <text x="240" y="81" text-anchor="middle" fill="#64748b" font-size="9">COLUMN user_id TO uid</text>
      <rect x="180" y="90" width="120" height="40" rx="3" fill="#0f172a"/>
      <text x="240" y="104" text-anchor="middle" fill="#ef4444" font-size="9">AnalysisException:</text>
      <text x="240" y="116" text-anchor="middle" fill="#94a3b8" font-size="8">renaming not allowed</text>
      <text x="240" y="127" text-anchor="middle" fill="#94a3b8" font-size="8">without columnMapping</text>
      <text x="240" y="142" text-anchor="middle" fill="#94a3b8" font-size="8">Recommendation model reads uid</text>

      <rect x="325" y="35" width="140" height="115" rx="4" fill="#1c0a0a" stroke="#ef4444"/>
      <text x="395" y="52" text-anchor="middle" fill="#ef4444" font-size="10" font-weight="bold">CHANGE TYPE</text>
      <text x="395" y="68" text-anchor="middle" fill="#64748b" font-size="9">ALTER TABLE t CHANGE</text>
      <text x="395" y="81" text-anchor="middle" fill="#64748b" font-size="9">COLUMN event_ts STRING</text>
      <rect x="335" y="90" width="120" height="40" rx="3" fill="#0f172a"/>
      <text x="395" y="104" text-anchor="middle" fill="#ef4444" font-size="9">AnalysisException:</text>
      <text x="395" y="116" text-anchor="middle" fill="#94a3b8" font-size="8">cannot cast TIMESTAMP</text>
      <text x="395" y="127" text-anchor="middle" fill="#94a3b8" font-size="8">to STRING</text>
      <text x="395" y="142" text-anchor="middle" fill="#94a3b8" font-size="8">would break time-travel queries</text>

      <!-- Solution -->
      <rect x="15" y="165" width="450" height="55" rx="4" fill="#0a1628" stroke="#38bdf8"/>
      <text x="40" y="182" fill="#38bdf8" font-size="10" font-weight="bold">✓ Enable Column Mapping (Delta 2.0+) for safe renames and drops:</text>
      <text x="40" y="196" fill="#64748b" font-size="9">ALTER TABLE t SET TBLPROPERTIES ('delta.columnMapping.mode' = 'name',</text>
      <text x="40" y="208" fill="#64748b" font-size="9">                                 'delta.minReaderVersion' = '2', 'delta.minWriterVersion' = '5')</text>

      <text x="240" y="248" text-anchor="middle" fill="#64748b" font-size="9">Unity Catalog enforces schema contracts: downstream lineage checked before any DDL commits</text>
    </svg>`,

    // Step 4: mergeSchema
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">mergeSchema — Auto-Evolve on Write</text>
      <!-- Source DF -->
      <rect x="20" y="38" width="130" height="95" rx="4" fill="#1e293b" stroke="#a855f7"/>
      <text x="85" y="55" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">Incoming DataFrame</text>
      <line x1="20" y1="60" x2="150" y2="60" stroke="#334155"/>
      <text x="30" y="76" fill="#38bdf8" font-size="10">user_id</text>
      <text x="30" y="91" fill="#38bdf8" font-size="10">event_type</text>
      <text x="30" y="106" fill="#38bdf8" font-size="10">session_duration_ms</text>
      <text x="30" y="121" fill="#4ade80" font-size="10">device_type ← NEW</text>
      <text x="30" y="121" fill="#fbbf24" dx="100" font-size="10">+</text>

      <!-- Write code -->
      <rect x="170" y="38" width="290" height="70" rx="4" fill="#0f172a" stroke="#334155"/>
      <text x="185" y="56" fill="#64748b" font-size="9">PySpark write with mergeSchema:</text>
      <text x="185" y="71" fill="#a855f7" font-size="10">df.write</text>
      <text x="185" y="85" fill="#a855f7" font-size="10">  .format("delta")</text>
      <text x="185" y="99" fill="#4ade80" font-size="10">  .option("mergeSchema", "true")</text>
      <text x="185" y="113" fill="#a855f7" font-size="10">  .mode("append").save(path)</text>

      <!-- Delta action -->
      <rect x="20" y="152" width="440" height="120" rx="4" fill="#1e293b" stroke="#ff6b35"/>
      <text x="240" y="170" text-anchor="middle" fill="#ff6b35" font-size="11" font-weight="bold">Delta Merge Algorithm</text>
      <line x1="20" y1="175" x2="460" y2="175" stroke="#334155"/>
      <!-- Steps -->
      <circle cx="55" cy="195" r="10" fill="#ff6b35"/>
      <text x="55" y="199" text-anchor="middle" fill="white" font-size="9" font-weight="bold">1</text>
      <text x="75" y="199" fill="#94a3b8" font-size="10">Read current metaData schema from _delta_log</text>
      <circle cx="55" cy="218" r="10" fill="#ff6b35"/>
      <text x="55" y="222" text-anchor="middle" fill="white" font-size="9" font-weight="bold">2</text>
      <text x="75" y="222" fill="#94a3b8" font-size="10">Compute union: existing ∪ incoming → merged schema</text>
      <circle cx="55" cy="241" r="10" fill="#4ade80"/>
      <text x="55" y="245" text-anchor="middle" fill="white" font-size="9" font-weight="bold">3</text>
      <text x="75" y="245" fill="#94a3b8" font-size="10">Write new metaData action to commit JSON with merged schema</text>
      <circle cx="55" cy="264" r="10" fill="#a855f7"/>
      <text x="55" y="268" text-anchor="middle" fill="white" font-size="9" font-weight="bold">4</text>
      <text x="75" y="268" fill="#94a3b8" font-size="10">Old files return NULL for device_type — no backfill required</text>
    </svg>`,

    // Step 5: Unity Catalog Enforcement
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <defs>
        <linearGradient id="se-uc" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#7c3aed"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
      </defs>
      <rect x="15" y="12" width="450" height="276" rx="6" fill="#0a0a1a" stroke="#a855f7" stroke-width="1.5"/>
      <rect x="15" y="12" width="450" height="26" rx="6" fill="url(#se-uc)"/>
      <rect x="15" y="26" width="450" height="12" fill="url(#se-uc)"/>
      <text x="240" y="29" text-anchor="middle" fill="white" font-weight="bold" font-size="12">Unity Catalog — Schema Governance Layer</text>
      <!-- DDL request box -->
      <rect x="30" y="50" width="200" height="55" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="130" y="67" text-anchor="middle" fill="#94a3b8" font-size="10">DDL Request</text>
      <text x="130" y="82" text-anchor="middle" fill="#fbbf24" font-size="10">ALTER TABLE user_events_silver</text>
      <text x="130" y="96" text-anchor="middle" fill="#fbbf24" font-size="10">ADD COLUMN device_type STRING</text>
      <!-- Unity checks -->
      <rect x="250" y="50" width="200" height="130" rx="4" fill="#1e293b" stroke="#a855f7"/>
      <text x="350" y="67" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">Unity Catalog Checks</text>
      <line x1="250" y1="72" x2="450" y2="72" stroke="#334155"/>
      <text x="265" y="88" fill="#4ade80" font-size="9">✓ Caller has ALTER privilege on table</text>
      <text x="265" y="103" fill="#4ade80" font-size="9">✓ column name not reserved keyword</text>
      <text x="265" y="118" fill="#4ade80" font-size="9">✓ type STRING compatible with policy</text>
      <text x="265" y="133" fill="#4ade80" font-size="9">✓ No downstream lineage breakage</text>
      <text x="265" y="148" fill="#4ade80" font-size="9">✓ Column tagging (PII?) requested</text>
      <text x="265" y="163" fill="#fbbf24" font-size="9">⚠ Notify downstream: rec-model job</text>
      <!-- Arrow -->
      <line x1="230" y1="77" x2="248" y2="77" stroke="#a855f7" stroke-width="1.5" marker-end="url(#se-arr)"/>
      <defs><marker id="se-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#a855f7"/></marker></defs>
      <!-- Commit result -->
      <rect x="30" y="120" width="200" height="60" rx="4" fill="#0a1628" stroke="#4ade80"/>
      <text x="130" y="138" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">Committed to Delta Log</text>
      <text x="130" y="153" text-anchor="middle" fill="#64748b" font-size="9">metaData schema updated</text>
      <text x="130" y="166" text-anchor="middle" fill="#64748b" font-size="9">Unity lineage graph updated</text>
      <!-- Lineage -->
      <rect x="30" y="200" width="420" height="75" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="240" y="217" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">Lineage Impact Notification</text>
      <text x="50" y="234" fill="#64748b" font-size="9">Upstream:  kafka_raw_events_bronze → user_events_silver  (writes device_type)</text>
      <text x="50" y="249" fill="#64748b" font-size="9">Downstream: user_events_silver → rec_features_gold  (reads this table)</text>
      <text x="50" y="264" fill="#fbbf24" font-size="9">⚠ Notified: ml-platform@mediastream.io — rec-model job needs schema update</text>
    </svg>`,
  ];

  function _buildDiagram(si) {
    return DIAGRAMS[si] || DIAGRAMS[0];
  }

  function _updateStep(el, si) {
    el.querySelectorAll('.se-pill').forEach((pill, idx) => {
      pill.classList.toggle('active', idx === si);
      pill.classList.toggle('visited', idx < si);
    });
    const diagram = el.querySelector('#se-diagram');
    if (diagram) diagram.innerHTML = _buildDiagram(si);
    const s = STEPS[si];
    const t = el.querySelector('#se-info-title');
    const b = el.querySelector('#se-info-body');
    const d = el.querySelector('#se-info-detail');
    if (t) t.textContent = s.label;
    if (b) b.textContent = s.desc;
    if (d) d.textContent = s.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="se-pill${i === 0 ? ' active' : ''}" data-step="${i}">${s.label}</button>`
    ).join('');

    return `
<style>
.se-page { display:flex; flex-direction:column; gap:16px; padding:16px; }
.se-pills { display:flex; flex-wrap:wrap; gap:6px; }
.se-pill {
  padding:4px 12px; border-radius:20px; border:1px solid var(--border);
  background:var(--surface); color:var(--text-muted); font-size:11px;
  cursor:pointer; transition:all .2s;
}
.se-pill.active { border-color:var(--green); color:var(--green); background:rgba(74,222,128,.1); }
.se-pill.visited { border-color:var(--border); color:var(--text-muted); opacity:.6; }
.se-pill:hover { border-color:var(--green); color:var(--green); }
.se-layout { display:grid; grid-template-columns:1fr 280px; gap:16px; }
.se-diagram-wrap { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:8px; }
.se-diagram-wrap svg { width:100%; height:auto; }
.se-info { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:16px; display:flex; flex-direction:column; gap:8px; }
.se-info-title { font-size:16px; font-weight:600; color:var(--green); }
.se-info-body { font-size:13px; color:var(--text); }
.se-info-detail { font-size:12px; color:var(--text-muted); line-height:1.6; }
.se-badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:11px; background:rgba(74,222,128,.15); color:var(--green); border:1px solid rgba(74,222,128,.3); }
@media(max-width:720px){ .se-layout{ grid-template-columns:1fr; } }
</style>
<div class="se-page page-enter">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
    <h2 style="font-size:20px;font-weight:700;color:var(--text);margin:0;">Schema Evolution</h2>
    <span class="se-badge">Delta Lake Feature</span>
    <span style="color:var(--text-muted);font-size:12px;">MediaStream: user_events_silver evolves safely with 180M subscriber scale</span>
  </div>
  <div class="se-pills">${pills}</div>
  <div class="se-layout">
    <div class="se-diagram-wrap"><div id="se-diagram">${_buildDiagram(0)}</div></div>
    <div class="se-info">
      <div class="se-info-title" id="se-info-title">${STEPS[0].label}</div>
      <div class="se-info-body" id="se-info-body">${STEPS[0].desc}</div>
      <div class="se-info-detail" id="se-info-detail">${STEPS[0].detail}</div>
    </div>
  </div>
</div>`;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'se-page page-enter';
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

    container.querySelectorAll('.se-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['schema-evolution'] = {
    id: 'schema-evolution',
    title: 'Schema Evolution',
    group: 'Delta Lake Core',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
