(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'What is VACUUM',
      desc: 'VACUUM removes files no longer referenced by the Delta log',
      detail: 'VACUUM physically deletes data files that are no longer referenced by the Delta transaction log. Without VACUUM, Delta Lake retains all historical files for time travel — but storage costs grow unbounded. VACUUM only removes files older than the retention threshold (default 7 days). Critically: VACUUM does NOT break time travel within the retention window. MediaStream runs VACUUM weekly on all tables.',
    },
    {
      label: 'Retention Window',
      desc: 'How the 7-day default retention window works',
      detail: 'Delta retention window: files modified more than `delta.deletedFileRetentionDuration` ago (default `interval 7 days`) are eligible for VACUUM. The retention window must be ≥ the longest running query to prevent "file not found" errors in concurrent reads. MediaStream policy: Bronze tables retain 3 days (high volume, low value), Silver/Gold retain 14 days (lineage, auditing), ML feature tables retain 30 days (model training reproducibility).',
    },
    {
      label: 'VACUUM Command',
      desc: 'Running VACUUM safely — syntax and dry-run',
      detail: 'VACUUM syntax: `VACUUM table_name [RETAIN num HOURS] [DRY RUN]`. DRY RUN lists files to delete without deleting — always run first. Example: `VACUUM mediastream.silver.user_activity RETAIN 336 HOURS DRY RUN`. To override the 7-day minimum: `SET spark.databricks.delta.retentionDurationCheck.enabled = false` (use with caution — breaks time travel). MediaStream uses Databricks VACUUM CLI with `RETAIN 168 HOURS` (7 days) as standard.',
    },
    {
      label: 'Storage Impact',
      desc: 'Before/after VACUUM storage savings at MediaStream',
      detail: 'MediaStream VACUUM impact (weekly run): bronze_events_raw — 8.4TB → 2.1TB saved (25% reduction). silver_user_activity — 3.2TB → 890GB saved (28%). gold_daily_content_kpis — 420GB → 95GB saved (23%). Total weekly savings: ~3.1TB. Annual storage cost avoided: $2,200/TB/year × 3.1TB × 52 weeks = ~$354K. VACUUM scheduled every Sunday 02:00 UTC in DLT pipeline maintenance window.',
    },
    {
      label: 'VACUUM & Streaming',
      desc: 'Safe VACUUM for tables with active streaming queries',
      detail: 'Active streaming readers hold references to old files. If VACUUM removes files a stream checkpoint points to, the stream fails with FileNotFoundException. Safe pattern: (1) check for active streams on the table, (2) ensure stream checkpoints are ahead of retention window, (3) run VACUUM. Delta Lake 3.x: `VACUUM` respects streaming checkpoints automatically. MediaStream pauses affected streaming jobs during VACUUM windows or uses `RETAIN 336 HOURS` to stay safely ahead of stream lag.',
    },
    {
      label: 'Tombstones & Log',
      desc: 'How VACUUM interacts with the Delta transaction log',
      detail: 'VACUUM does not modify the Delta transaction log — it only deletes physical files. The log still contains references to deleted files (as "remove" actions), but those files no longer exist on disk. The Delta log itself has its own retention, controlled by `delta.logRetentionDuration` (default 30 days). After log cleanup (separate from VACUUM), old versions are fully gone. MediaStream retains the Delta log for 90 days for compliance audit trails.',
    },
  ];

  const DIAGRAMS = [
    // Step 0: VACUUM concept
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">VACUUM — PHYSICAL FILE DELETION</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- Timeline -->
      <line x1="20" y1="80" x2="460" y2="80" stroke="#333" stroke-width="2"/>
      <text x="20" y="68" fill="#a0a0a0" font-size="8">7 days ago</text>
      <text x="200" y="68" fill="#a0a0a0" font-size="8">retention boundary</text>
      <text x="400" y="68" fill="#a0a0a0" font-size="8">now</text>
      <line x1="240" y1="60" x2="240" y2="110" stroke="#ff6b35" stroke-width="1.5" stroke-dasharray="4,3"/>
      <text x="240" y="58" fill="#ff6b35" font-size="8" text-anchor="middle">VACUUM cutoff</text>
      <!-- Files before cutoff -->
      <rect x="30" y="92" width="55" height="25" rx="3" fill="#ef4444" fill-opacity="0.3" stroke="#ef4444" stroke-width="1"/>
      <text x="57" y="109" fill="#ef4444" font-size="7" text-anchor="middle">file_001.parquet</text>
      <rect x="95" y="92" width="55" height="25" rx="3" fill="#ef4444" fill-opacity="0.3" stroke="#ef4444" stroke-width="1"/>
      <text x="122" y="109" fill="#ef4444" font-size="7" text-anchor="middle">file_002.parquet</text>
      <rect x="160" y="92" width="55" height="25" rx="3" fill="#ef4444" fill-opacity="0.3" stroke="#ef4444" stroke-width="1"/>
      <text x="187" y="109" fill="#ef4444" font-size="7" text-anchor="middle">file_003.parquet</text>
      <!-- Files after cutoff (safe) -->
      <rect x="255" y="92" width="55" height="25" rx="3" fill="#22c55e" fill-opacity="0.3" stroke="#22c55e" stroke-width="1"/>
      <text x="282" y="109" fill="#22c55e" font-size="7" text-anchor="middle">file_004.parquet</text>
      <rect x="320" y="92" width="55" height="25" rx="3" fill="#22c55e" fill-opacity="0.3" stroke="#22c55e" stroke-width="1"/>
      <text x="347" y="109" fill="#22c55e" font-size="7" text-anchor="middle">file_005.parquet</text>
      <rect x="385" y="92" width="65" height="25" rx="3" fill="#22c55e" fill-opacity="0.3" stroke="#22c55e" stroke-width="1"/>
      <text x="417" y="109" fill="#22c55e" font-size="7" text-anchor="middle">file_006.parquet</text>
      <!-- Labels -->
      <rect x="30" y="128" width="185" height="22" rx="3" fill="#ef4444" fill-opacity="0.15"/>
      <text x="122" y="143" fill="#ef4444" font-size="8" text-anchor="middle">VACUUM DELETES (older than cutoff)</text>
      <rect x="255" y="128" width="195" height="22" rx="3" fill="#22c55e" fill-opacity="0.15"/>
      <text x="352" y="143" fill="#22c55e" font-size="8" text-anchor="middle">RETAINED (time travel available)</text>
      <!-- Delta log -->
      <rect x="10" y="165" width="460" height="120" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="183" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">DELTA TRANSACTION LOG (NOT modified by VACUUM)</text>
      <rect x="20" y="191" width="440" height="15" rx="2" fill="#ff6b35" fill-opacity="0.15"/>
      <text x="40" y="203" fill="#ff6b35" font-size="8">version</text>
      <text x="120" y="203" fill="#ff6b35" font-size="8">action</text>
      <text x="220" y="203" fill="#ff6b35" font-size="8">path</text>
      <text x="380" y="203" fill="#ff6b35" font-size="8">modificationTime</text>
      <rect x="20" y="208" width="440" height="13" rx="2" fill="#1a1d2e"/>
      <text x="40" y="219" fill="#a0a0a0" font-size="7">v001</text>
      <text x="120" y="219" fill="#a0a0a0" font-size="7">add</text>
      <text x="220" y="219" fill="#a0a0a0" font-size="7">file_001.parquet</text>
      <text x="380" y="219" fill="#a0a0a0" font-size="7">8 days ago</text>
      <rect x="20" y="223" width="440" height="13" rx="2" fill="#12141f"/>
      <text x="40" y="234" fill="#a0a0a0" font-size="7">v002</text>
      <text x="120" y="234" fill="#ef4444" font-size="7">remove</text>
      <text x="220" y="234" fill="#a0a0a0" font-size="7">file_001.parquet</text>
      <text x="380" y="234" fill="#a0a0a0" font-size="7">8 days ago</text>
      <text x="240" y="258" fill="#a0a0a0" font-size="8" text-anchor="middle">Log entries for deleted files remain — VACUUM only removes the physical parquet files</text>
      <text x="240" y="272" fill="#a0a0a0" font-size="8" text-anchor="middle">Log retention controlled separately by delta.logRetentionDuration (default 30 days)</text>
    </svg>`,

    // Step 1: Retention window
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">MEDIASTREAM RETENTION POLICIES</text>
      <!-- Table tiers -->
      <rect x="10" y="40" width="460" height="22" rx="3" fill="#ff6b35" fill-opacity="0.15"/>
      <text x="100" y="56" fill="#ff6b35" font-size="9" font-weight="bold">TABLE TIER</text>
      <text x="230" y="56" fill="#ff6b35" font-size="9" font-weight="bold">RETENTION</text>
      <text x="330" y="56" fill="#ff6b35" font-size="9" font-weight="bold">REASON</text>
      <rect x="10" y="64" width="460" height="20" rx="2" fill="#1a1d2e"/>
      <rect x="12" y="66" width="12" height="16" rx="2" fill="#cd7f32"/>
      <text x="100" y="78" fill="#e0e0e0" font-size="9">Bronze (raw events)</text>
      <text x="230" y="78" fill="#f59e0b" font-size="9">3 days</text>
      <text x="330" y="78" fill="#a0a0a0" font-size="8">High volume, low query value</text>
      <rect x="10" y="86" width="460" height="20" rx="2" fill="#12141f"/>
      <rect x="12" y="88" width="12" height="16" rx="2" fill="#aaa"/>
      <text x="100" y="100" fill="#e0e0e0" font-size="9">Silver (clean/dedup)</text>
      <text x="230" y="100" fill="#22c55e" font-size="9">14 days</text>
      <text x="330" y="100" fill="#a0a0a0" font-size="8">Lineage + auditing</text>
      <rect x="10" y="108" width="460" height="20" rx="2" fill="#1a1d2e"/>
      <rect x="12" y="110" width="12" height="16" rx="2" fill="#FFD700"/>
      <text x="100" y="122" fill="#e0e0e0" font-size="9">Gold (aggregates)</text>
      <text x="230" y="122" fill="#22c55e" font-size="9">14 days</text>
      <text x="330" y="122" fill="#a0a0a0" font-size="8">Dashboard reproducibility</text>
      <rect x="10" y="130" width="460" height="20" rx="2" fill="#12141f"/>
      <rect x="12" y="132" width="12" height="16" rx="2" fill="#a855f7"/>
      <text x="100" y="144" fill="#e0e0e0" font-size="9">ML Feature tables</text>
      <text x="230" y="144" fill="#3b82f6" font-size="9">30 days</text>
      <text x="330" y="144" fill="#a0a0a0" font-size="8">Model training reproducibility</text>
      <rect x="10" y="152" width="460" height="20" rx="2" fill="#1a1d2e"/>
      <rect x="12" y="154" width="12" height="16" rx="2" fill="#ff6b35"/>
      <text x="100" y="166" fill="#e0e0e0" font-size="9">Delta transaction log</text>
      <text x="230" y="166" fill="#a855f7" font-size="9">90 days</text>
      <text x="330" y="166" fill="#a0a0a0" font-size="8">Compliance audit trail</text>
      <!-- Warning box -->
      <rect x="10" y="185" width="460" height="50" rx="5" fill="#f59e0b" fill-opacity="0.1" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="240" y="204" fill="#f59e0b" font-size="9" text-anchor="middle" font-weight="bold">CRITICAL: Retention ≥ Longest Running Query</text>
      <text x="240" y="220" fill="#a0a0a0" font-size="8" text-anchor="middle">If a streaming job lags 48h and retention is 3 days → safe margin = 1 day</text>
      <text x="240" y="232" fill="#a0a0a0" font-size="8" text-anchor="middle">If retention = 24h and stream lags 26h → FileNotFoundException on recovery</text>
      <!-- Config -->
      <rect x="10" y="248" width="460" height="42" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="266" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">ALTER TABLE PROPERTIES</text>
      <text x="240" y="282" fill="#a0a0a0" font-size="9" text-anchor="middle">delta.deletedFileRetentionDuration = 'interval 14 days'</text>
    </svg>`,

    // Step 2: VACUUM command
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">VACUUM COMMAND SYNTAX</text>
      <!-- Syntax blocks -->
      <rect x="10" y="35" width="460" height="60" rx="5" fill="#12141f" stroke="#ff6b35" stroke-width="1"/>
      <text x="24" y="55" fill="#ff6b35" font-size="10" font-family="monospace">VACUUM</text>
      <text x="96" y="55" fill="#3b82f6" font-size="10" font-family="monospace">mediastream.silver.user_activity</text>
      <text x="24" y="72" fill="#ff6b35" font-size="10" font-family="monospace">  RETAIN</text>
      <text x="95" y="72" fill="#a0a0a0" font-size="10" font-family="monospace">336 HOURS</text>
      <text x="24" y="87" fill="#ff6b35" font-size="10" font-family="monospace">  DRY RUN;</text>
      <!-- Annotation arrows -->
      <rect x="10" y="110" width="460" height="60" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="24" y="128" fill="#22c55e" font-size="8">DRY RUN</text>
      <text x="95" y="128" fill="#a0a0a0" font-size="8">→ Lists files to delete, does NOT delete. Always run first.</text>
      <text x="24" y="146" fill="#22c55e" font-size="8">RETAIN 336</text>
      <text x="110" y="146" fill="#a0a0a0" font-size="8">→ 336 hours = 14 days. Overrides table default retention.</text>
      <text x="24" y="162" fill="#22c55e" font-size="8">No RETAIN</text>
      <text x="105" y="162" fill="#a0a0a0" font-size="8">→ Uses delta.deletedFileRetentionDuration (default 7 days).</text>
      <!-- Disable check warning -->
      <rect x="10" y="183" width="460" height="40" rx="4" fill="#ef4444" fill-opacity="0.1" stroke="#ef4444" stroke-width="1.5"/>
      <text x="240" y="200" fill="#ef4444" font-size="9" text-anchor="middle" font-weight="bold">DANGEROUS: Override minimum retention check</text>
      <text x="240" y="215" fill="#a0a0a0" font-size="8" text-anchor="middle">SET spark.databricks.delta.retentionDurationCheck.enabled = false</text>
      <text x="240" y="225" fill="#a0a0a0" font-size="7" text-anchor="middle">(breaks time travel — use only for storage emergency, never in production)</text>
      <!-- Schedule -->
      <rect x="10" y="236" width="460" height="55" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="254" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">MEDIASTREAM VACUUM SCHEDULE</text>
      <text x="100" y="272" fill="#e0e0e0" font-size="8" text-anchor="middle">Bronze</text>
      <text x="100" y="284" fill="#a0a0a0" font-size="7" text-anchor="middle">Daily 03:00 UTC</text>
      <text x="220" y="272" fill="#e0e0e0" font-size="8" text-anchor="middle">Silver / Gold</text>
      <text x="220" y="284" fill="#a0a0a0" font-size="7" text-anchor="middle">Weekly Sun 02:00</text>
      <text x="360" y="272" fill="#e0e0e0" font-size="8" text-anchor="middle">ML Features</text>
      <text x="360" y="284" fill="#a0a0a0" font-size="7" text-anchor="middle">Biweekly</text>
      <line x1="160" y1="260" x2="160" y2="288" stroke="#333" stroke-width="0.5"/>
      <line x1="290" y1="260" x2="290" y2="288" stroke="#333" stroke-width="0.5"/>
    </svg>`,

    // Step 3: Storage impact
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">VACUUM STORAGE SAVINGS — MEDIASTREAM</text>
      <!-- Before/after bars -->
      <text x="80" y="46" fill="#a0a0a0" font-size="8" text-anchor="middle">BEFORE</text>
      <text x="220" y="46" fill="#22c55e" font-size="8" text-anchor="middle">AFTER</text>
      <text x="360" y="46" fill="#ff6b35" font-size="8" text-anchor="middle">SAVED</text>
      <!-- Row 1 -->
      <rect x="10" y="55" width="460" height="24" rx="3" fill="#1a1d2e"/>
      <text x="15" y="71" fill="#cd7f32" font-size="8">bronze_events_raw</text>
      <rect x="115" y="59" width="84" height="16" rx="2" fill="#ef4444" fill-opacity="0.5"/>
      <text x="157" y="71" fill="#fff" font-size="7" text-anchor="middle">8.4 TB</text>
      <rect x="210" y="59" width="21" height="16" rx="2" fill="#22c55e" fill-opacity="0.5"/>
      <text x="221" y="71" fill="#fff" font-size="7" text-anchor="middle">2.1</text>
      <text x="340" y="71" fill="#ff6b35" font-size="8">2.1 TB saved (25%)</text>
      <!-- Row 2 -->
      <rect x="10" y="81" width="460" height="24" rx="3" fill="#12141f"/>
      <text x="15" y="97" fill="#aaa" font-size="8">silver_user_activity</text>
      <rect x="115" y="85" width="32" height="16" rx="2" fill="#ef4444" fill-opacity="0.5"/>
      <text x="131" y="97" fill="#fff" font-size="7" text-anchor="middle">3.2</text>
      <rect x="210" y="85" width="9" height="16" rx="2" fill="#22c55e" fill-opacity="0.5"/>
      <text x="215" y="97" fill="#fff" font-size="6" text-anchor="middle">.</text>
      <text x="340" y="97" fill="#ff6b35" font-size="8">890 GB saved (28%)</text>
      <!-- Row 3 -->
      <rect x="10" y="107" width="460" height="24" rx="3" fill="#1a1d2e"/>
      <text x="15" y="123" fill="#FFD700" font-size="8">gold_daily_content_kpis</text>
      <rect x="170" y="111" width="5" height="16" rx="2" fill="#ef4444" fill-opacity="0.5"/>
      <text x="175" y="123" fill="#fff" font-size="7">420GB</text>
      <rect x="210" y="111" width="1" height="16" rx="2" fill="#22c55e" fill-opacity="0.5"/>
      <text x="340" y="123" fill="#ff6b35" font-size="8">95 GB saved (23%)</text>
      <!-- Total -->
      <rect x="10" y="145" width="460" height="40" rx="5" fill="#ff6b35" fill-opacity="0.1" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="240" y="163" fill="#ff6b35" font-size="10" text-anchor="middle" font-weight="bold">WEEKLY SAVINGS: ~3.1 TB</text>
      <text x="240" y="178" fill="#a0a0a0" font-size="8" text-anchor="middle">Annual cost avoided: $2,200/TB/yr × 3.1TB × 52wks ≈ $354,000</text>
      <!-- Savings breakdown chart -->
      <rect x="10" y="200" width="460" height="90" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="218" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">STORAGE GROWTH WITHOUT VACUUM (projected)</text>
      <!-- Simple growth lines -->
      <line x1="40" y1="280" x2="440" y2="280" stroke="#333" stroke-width="1"/>
      <line x1="40" y1="230" x2="40" y2="280" stroke="#333" stroke-width="1"/>
      <!-- Without vacuum line (steep) -->
      <polyline points="40,275 100,262 160,248 220,233 280,220 340,207" stroke="#ef4444" stroke-width="2" fill="none"/>
      <text x="345" y="210" fill="#ef4444" font-size="7">without VACUUM</text>
      <!-- With vacuum line (flat) -->
      <polyline points="40,275 100,272 160,271 220,272 280,271 340,272 400,271" stroke="#22c55e" stroke-width="2" fill="none"/>
      <text x="345" y="274" fill="#22c55e" font-size="7">with VACUUM</text>
      <text x="40" y="288" fill="#a0a0a0" font-size="7">month 1</text>
      <text x="200" y="288" fill="#a0a0a0" font-size="7">month 6</text>
      <text x="360" y="288" fill="#a0a0a0" font-size="7">month 12</text>
    </svg>`,

    // Step 4: VACUUM and streaming
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">VACUUM SAFETY WITH STREAMING</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- Danger scenario -->
      <rect x="10" y="35" width="220" height="100" rx="5" fill="#1e2030" stroke="#ef4444" stroke-width="2"/>
      <text x="120" y="55" fill="#ef4444" font-size="9" text-anchor="middle" font-weight="bold">DANGEROUS SCENARIO</text>
      <text x="120" y="72" fill="#a0a0a0" font-size="8" text-anchor="middle">Retention: 24 hours</text>
      <text x="120" y="86" fill="#a0a0a0" font-size="8" text-anchor="middle">Stream lag: 26 hours</text>
      <text x="120" y="100" fill="#a0a0a0" font-size="8" text-anchor="middle">VACUUM runs at 25h mark</text>
      <rect x="20" y="110" width="200" height="18" rx="3" fill="#ef4444" fill-opacity="0.2"/>
      <text x="120" y="123" fill="#ef4444" font-size="8" text-anchor="middle">FileNotFoundException on recovery!</text>
      <!-- Safe scenario -->
      <rect x="250" y="35" width="220" height="100" rx="5" fill="#1e2030" stroke="#22c55e" stroke-width="2"/>
      <text x="360" y="55" fill="#22c55e" font-size="9" text-anchor="middle" font-weight="bold">SAFE SCENARIO</text>
      <text x="360" y="72" fill="#a0a0a0" font-size="8" text-anchor="middle">Retention: 336 hours (14d)</text>
      <text x="360" y="86" fill="#a0a0a0" font-size="8" text-anchor="middle">Stream lag: 26 hours (max)</text>
      <text x="360" y="100" fill="#a0a0a0" font-size="8" text-anchor="middle">Safe margin: 13.9 days</text>
      <rect x="260" y="110" width="200" height="18" rx="3" fill="#22c55e" fill-opacity="0.2"/>
      <text x="360" y="123" fill="#22c55e" font-size="8" text-anchor="middle">Stream recovers cleanly</text>
      <!-- Safe pattern -->
      <rect x="10" y="150" width="460" height="140" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="168" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">MEDIASTREAM SAFE VACUUM PATTERN</text>
      <rect x="20" y="176" width="100" height="30" rx="3" fill="#0f1117" stroke="#3b82f6" stroke-width="1"/>
      <text x="70" y="192" fill="#3b82f6" font-size="7" text-anchor="middle">Check active</text>
      <text x="70" y="202" fill="#a0a0a0" font-size="7" text-anchor="middle">streams</text>
      <rect x="140" y="176" width="100" height="30" rx="3" fill="#0f1117" stroke="#3b82f6" stroke-width="1"/>
      <text x="190" y="192" fill="#3b82f6" font-size="7" text-anchor="middle">Verify checkpoint</text>
      <text x="190" y="202" fill="#a0a0a0" font-size="7" text-anchor="middle">ahead of cutoff</text>
      <rect x="260" y="176" width="100" height="30" rx="3" fill="#0f1117" stroke="#3b82f6" stroke-width="1"/>
      <text x="310" y="192" fill="#3b82f6" font-size="7" text-anchor="middle">DRY RUN</text>
      <text x="310" y="202" fill="#a0a0a0" font-size="7" text-anchor="middle">review files</text>
      <rect x="380" y="176" width="80" height="30" rx="3" fill="#0f1117" stroke="#22c55e" stroke-width="1"/>
      <text x="420" y="192" fill="#22c55e" font-size="7" text-anchor="middle">VACUUM</text>
      <text x="420" y="202" fill="#a0a0a0" font-size="7" text-anchor="middle">execute</text>
      <line x1="120" y1="191" x2="140" y2="191" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="240" y1="191" x2="260" y2="191" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="360" y1="191" x2="380" y2="191" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>
      <text x="240" y="235" fill="#a0a0a0" font-size="8" text-anchor="middle">Delta Lake 3.x: VACUUM respects streaming checkpoints automatically</text>
      <text x="240" y="250" fill="#a0a0a0" font-size="8" text-anchor="middle">MediaStream: RETAIN 336 HOURS to stay safely ahead of any stream lag</text>
      <text x="240" y="265" fill="#a0a0a0" font-size="8" text-anchor="middle">Maintenance window: Sunday 02:00 UTC (lowest stream activity)</text>
      <text x="240" y="280" fill="#a0a0a0" font-size="7" text-anchor="middle">Active streaming jobs paused or lag-verified before VACUUM on Bronze tables</text>
    </svg>`,

    // Step 5: Tombstones and log
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">DELTA LOG RETENTION vs FILE RETENTION</text>
      <!-- Two retention controls -->
      <rect x="10" y="35" width="220" height="90" rx="5" fill="#1e2030" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="120" y="55" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">FILE RETENTION</text>
      <text x="120" y="70" fill="#a0a0a0" font-size="8" text-anchor="middle">deletedFileRetentionDuration</text>
      <text x="120" y="84" fill="#e0e0e0" font-size="9" text-anchor="middle">default: 7 days</text>
      <text x="120" y="100" fill="#a0a0a0" font-size="8" text-anchor="middle">Controls VACUUM eligible</text>
      <text x="120" y="114" fill="#a0a0a0" font-size="8" text-anchor="middle">window for physical files</text>
      <rect x="250" y="35" width="220" height="90" rx="5" fill="#1e2030" stroke="#a855f7" stroke-width="1.5"/>
      <text x="360" y="55" fill="#a855f7" font-size="9" text-anchor="middle" font-weight="bold">LOG RETENTION</text>
      <text x="360" y="70" fill="#a0a0a0" font-size="8" text-anchor="middle">logRetentionDuration</text>
      <text x="360" y="84" fill="#e0e0e0" font-size="9" text-anchor="middle">default: 30 days</text>
      <text x="360" y="100" fill="#a0a0a0" font-size="8" text-anchor="middle">Controls Delta log JSON</text>
      <text x="360" y="114" fill="#a0a0a0" font-size="8" text-anchor="middle">file cleanup (separate)</text>
      <!-- What VACUUM does/does not do -->
      <rect x="10" y="140" width="460" height="72" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="158" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">WHAT VACUUM DOES / DOES NOT DO</text>
      <rect x="20" y="166" width="200" height="36" rx="3" fill="#22c55e" fill-opacity="0.1"/>
      <text x="120" y="181" fill="#22c55e" font-size="8" text-anchor="middle" font-weight="bold">DOES:</text>
      <text x="120" y="195" fill="#a0a0a0" font-size="8" text-anchor="middle">Delete physical parquet/data files</text>
      <rect x="250" y="166" width="210" height="36" rx="3" fill="#ef4444" fill-opacity="0.1"/>
      <text x="355" y="181" fill="#ef4444" font-size="8" text-anchor="middle" font-weight="bold">DOES NOT:</text>
      <text x="355" y="195" fill="#a0a0a0" font-size="8" text-anchor="middle">Modify transaction log JSON files</text>
      <!-- MediaStream config -->
      <rect x="10" y="225" width="460" height="65" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="243" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">MEDIASTREAM CONFIGURATION</text>
      <text x="240" y="260" fill="#e0e0e0" font-size="9" text-anchor="middle">delta.logRetentionDuration = 'interval 90 days'</text>
      <text x="240" y="275" fill="#a0a0a0" font-size="8" text-anchor="middle">90-day log retention for compliance audit trail</text>
      <text x="240" y="285" fill="#a0a0a0" font-size="7" text-anchor="middle">All ALTER TABLE, MERGE, DELETE ops traceable via log for 90 days</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.vc-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.vc-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.vc-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="vc-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="vc-header module-header">
        <div class="module-tag" style="background:var(--delta)">ADVANCED</div>
        <h2 class="module-title">VACUUM &amp; Retention</h2>
        <p class="module-subtitle">Physical file cleanup and storage reclamation in Delta Lake — MediaStream saves $354K/year</p>
      </div>
      <div class="vc-pills step-pills">${pills}</div>
      <div class="vc-diagram diagram-frame"></div>
      <div class="vc-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'vc-page page-enter';
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
    container.querySelectorAll('.vc-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['vacuum'] = {
    id: 'vacuum',
    title: 'VACUUM & Retention',
    group: 'Advanced',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
