(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Version History',
      desc: 'Every Delta table maintains a complete version history',
      detail: 'Delta Lake maintains a complete history of every change to a table — every INSERT, UPDATE, DELETE, MERGE, OPTIMIZE, SCHEMA CHANGE — as numbered versions in the `_delta_log/` directory. Each version is a JSON file containing the operations performed. `DESCRIBE HISTORY table_name` shows all versions with timestamp, user, operation, and statistics. MediaStream can query any of the last 90 days of history for any of its 847 Delta tables.',
    },
    {
      label: 'DESCRIBE HISTORY',
      desc: 'Reading the version history with DESCRIBE HISTORY',
      detail: 'DESCRIBE HISTORY returns: version (integer), timestamp, userId, userName, operation (WRITE/MERGE/DELETE/OPTIMIZE...), operationParameters (predicate used, etc.), operationMetrics (numFiles, numOutputRows, numRemovedFiles...), userMetadata, engineInfo. The history is stored in the Delta log — not a separate catalog table. MediaStream uses DESCRIBE HISTORY for incident investigation: "which version introduced this bad data?" and for SLA reporting: "when did gold_daily_content_kpis last refresh?"',
    },
    {
      label: 'Time Travel',
      desc: 'Querying historical versions with AS OF',
      detail: 'Time travel syntax: `SELECT * FROM table VERSION AS OF 42` or `SELECT * FROM table TIMESTAMP AS OF \'2024-01-15 08:00:00\'`. Delta resolves the closest version before the given timestamp. Time travel works as long as the version\'s data files haven\'t been VACUUMed. MediaStream uses time travel for: (1) Reproducing ML training datasets at a specific point in time. (2) Auditing: "what did user_segments look like before the Jan 15 update?" (3) Recovering from accidental deletes — RESTORE table to prior version.',
    },
    {
      label: 'RESTORE TABLE',
      desc: 'Rolling back to a previous version with RESTORE TABLE',
      detail: 'RESTORE TABLE syntax: `RESTORE TABLE table_name TO VERSION AS OF N` or `TO TIMESTAMP AS OF \'...\'`. RESTORE creates a new version (does not delete log history) that makes the table identical to version N. It re-adds previously removed files and removes newly-added files. MediaStream incident response playbook: if a bad MERGE is detected within the retention window, execute RESTORE TABLE immediately. Recovery time: <5 minutes for any table. Used twice in last 12 months (both times: accidental DELETE with incorrect predicate).',
    },
    {
      label: 'Log Compaction',
      desc: 'Delta log checkpointing and compaction for performance',
      detail: 'The Delta log is a sequence of JSON files. Reading millions of log entries to reconstruct table state would be slow. Delta addresses this with checkpoints: every 10 versions (configurable), Delta writes a Parquet checkpoint file that summarizes the full table state. On startup, Delta reads the latest checkpoint + any subsequent JSON files. MediaStream tables with high write frequency (Bronze) create checkpoints every 10 versions by default — a busy Bronze table may see 100+ checkpoints/day. Log JSON files are retained for `logRetentionDuration` (90 days at MediaStream).',
    },
    {
      label: 'Change Data Feed',
      desc: 'Tracking row-level changes with Change Data Feed',
      detail: 'Change Data Feed (CDF) records every row-level insert, update, and delete as separate change records. Enable with `ALTER TABLE SET TBLPROPERTIES (delta.enableChangeDataFeed = true)`. Read changes: `SELECT * FROM table_changes(\'table_name\', 1, 10)` returns rows with `_change_type` (insert/update_preimage/update_postimage/delete), `_commit_version`, `_commit_timestamp`. MediaStream uses CDF on Silver tables to feed downstream incremental pipelines — instead of full reprocessing, downstream systems consume only changed rows. CDF reduces downstream reprocessing by 94%.',
    },
  ];

  const DIAGRAMS = [
    // Step 0: Version history concept
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">DELTA VERSION HISTORY</text>
      <!-- Version timeline -->
      <line x1="30" y1="150" x2="450" y2="150" stroke="#ff6b35" stroke-width="2"/>
      <!-- Version nodes -->
      <circle cx="50" cy="150" r="12" fill="#1e2030" stroke="#ff6b35" stroke-width="2"/>
      <text x="50" y="154" fill="#ff6b35" font-size="8" text-anchor="middle" font-weight="bold">v0</text>
      <circle cx="120" cy="150" r="12" fill="#1e2030" stroke="#ff6b35" stroke-width="2"/>
      <text x="120" y="154" fill="#ff6b35" font-size="8" text-anchor="middle" font-weight="bold">v1</text>
      <circle cx="190" cy="150" r="12" fill="#1e2030" stroke="#ff6b35" stroke-width="2"/>
      <text x="190" y="154" fill="#ff6b35" font-size="8" text-anchor="middle" font-weight="bold">v2</text>
      <circle cx="260" cy="150" r="12" fill="#1e2030" stroke="#3b82f6" stroke-width="2"/>
      <text x="260" y="154" fill="#3b82f6" font-size="8" text-anchor="middle" font-weight="bold">v3</text>
      <circle cx="330" cy="150" r="12" fill="#1e2030" stroke="#ff6b35" stroke-width="2"/>
      <text x="330" y="154" fill="#ff6b35" font-size="8" text-anchor="middle" font-weight="bold">v4</text>
      <circle cx="400" cy="150" r="12" fill="#22c55e" fill-opacity="0.3" stroke="#22c55e" stroke-width="2"/>
      <text x="400" y="154" fill="#22c55e" font-size="8" text-anchor="middle" font-weight="bold">v5</text>
      <!-- Labels -->
      <text x="50" y="175" fill="#a0a0a0" font-size="7" text-anchor="middle">CREATE</text>
      <text x="120" y="175" fill="#a0a0a0" font-size="7" text-anchor="middle">WRITE</text>
      <text x="190" y="175" fill="#a0a0a0" font-size="7" text-anchor="middle">MERGE</text>
      <text x="260" y="175" fill="#3b82f6" font-size="7" text-anchor="middle">DELETE</text>
      <text x="330" y="175" fill="#a0a0a0" font-size="7" text-anchor="middle">OPTIMIZE</text>
      <text x="400" y="175" fill="#22c55e" font-size="7" text-anchor="middle">WRITE (now)</text>
      <!-- Timestamps -->
      <text x="50" y="192" fill="#a0a0a0" font-size="6" text-anchor="middle">Jan 1</text>
      <text x="120" y="192" fill="#a0a0a0" font-size="6" text-anchor="middle">Jan 5</text>
      <text x="190" y="192" fill="#a0a0a0" font-size="6" text-anchor="middle">Jan 10</text>
      <text x="260" y="192" fill="#3b82f6" font-size="6" text-anchor="middle">Jan 13</text>
      <text x="330" y="192" fill="#a0a0a0" font-size="6" text-anchor="middle">Jan 14</text>
      <text x="400" y="192" fill="#22c55e" font-size="6" text-anchor="middle">Jan 15</text>
      <!-- Delta log files -->
      <rect x="10" y="35" width="460" height="90" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="53" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">_delta_log/ directory</text>
      <text x="30" y="72" fill="#a0a0a0" font-size="8">00000000000000000000.json  (CREATE TABLE)</text>
      <text x="30" y="87" fill="#a0a0a0" font-size="8">00000000000000000001.json  (WRITE)</text>
      <text x="30" y="102" fill="#a0a0a0" font-size="8">00000000000000000002.json  (MERGE)</text>
      <text x="300" y="72" fill="#3b82f6" font-size="8">00000000000000000003.json  (DELETE)</text>
      <text x="300" y="87" fill="#a0a0a0" font-size="8">00000000000000000004.json  (OPTIMIZE)</text>
      <text x="300" y="102" fill="#22c55e" font-size="8">00000000000000000005.json  (WRITE) ← latest</text>
      <!-- Retention -->
      <rect x="10" y="210" width="460" height="40" rx="4" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="228" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">MEDIASTREAM: 847 tables × 90-day version history</text>
      <text x="240" y="242" fill="#a0a0a0" font-size="8" text-anchor="middle">DESCRIBE HISTORY available for any table, any version, any time in window</text>
      <!-- DESCRIBE HISTORY shortcut -->
      <rect x="10" y="262" width="460" height="28" rx="4" fill="#12141f" stroke="#ff6b35" stroke-width="1"/>
      <text x="24" y="280" fill="#ff6b35" font-size="10">DESCRIBE HISTORY</text>
      <text x="175" y="280" fill="#3b82f6" font-size="10">mediastream.gold.daily_content_kpis;</text>
    </svg>`,

    // Step 1: DESCRIBE HISTORY
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">DESCRIBE HISTORY OUTPUT</text>
      <!-- Table header -->
      <rect x="10" y="35" width="460" height="18" rx="2" fill="#ff6b35" fill-opacity="0.15"/>
      <text x="25" y="49" fill="#ff6b35" font-size="8">version</text>
      <text x="70" y="49" fill="#ff6b35" font-size="8">timestamp</text>
      <text x="175" y="49" fill="#ff6b35" font-size="8">operation</text>
      <text x="260" y="49" fill="#ff6b35" font-size="8">numFiles</text>
      <text x="315" y="49" fill="#ff6b35" font-size="8">numRows</text>
      <text x="370" y="49" fill="#ff6b35" font-size="8">userName</text>
      <!-- Rows -->
      <rect x="10" y="55" width="460" height="16" rx="2" fill="#1a1d2e"/>
      <text x="25" y="67" fill="#22c55e" font-size="7">v42</text>
      <text x="70" y="67" fill="#a0a0a0" font-size="7">2024-01-15 08:01:33</text>
      <text x="175" y="67" fill="#a0a0a0" font-size="7">WRITE</text>
      <text x="260" y="67" fill="#a0a0a0" font-size="7">187</text>
      <text x="315" y="67" fill="#a0a0a0" font-size="7">4,218,432</text>
      <text x="370" y="67" fill="#a0a0a0" font-size="7">dlt-pipeline</text>
      <rect x="10" y="73" width="460" height="16" rx="2" fill="#12141f"/>
      <text x="25" y="85" fill="#a0a0a0" font-size="7">v41</text>
      <text x="70" y="85" fill="#a0a0a0" font-size="7">2024-01-14 08:03:11</text>
      <text x="175" y="85" fill="#a0a0a0" font-size="7">OPTIMIZE</text>
      <text x="260" y="85" fill="#a0a0a0" font-size="7">187</text>
      <text x="315" y="85" fill="#a0a0a0" font-size="7">0 (rewrite)</text>
      <text x="370" y="85" fill="#a0a0a0" font-size="7">optimize-job</text>
      <rect x="10" y="91" width="460" height="16" rx="2" fill="#1a1d2e"/>
      <text x="25" y="103" fill="#a0a0a0" font-size="7">v40</text>
      <text x="70" y="103" fill="#a0a0a0" font-size="7">2024-01-14 08:00:55</text>
      <text x="175" y="103" fill="#a0a0a0" font-size="7">WRITE</text>
      <text x="260" y="103" fill="#a0a0a0" font-size="7">192</text>
      <text x="315" y="103" fill="#a0a0a0" font-size="7">4,198,116</text>
      <text x="370" y="103" fill="#a0a0a0" font-size="7">dlt-pipeline</text>
      <rect x="10" y="109" width="460" height="16" rx="2" fill="#12141f"/>
      <text x="25" y="121" fill="#ef4444" font-size="7">v39</text>
      <text x="70" y="121" fill="#a0a0a0" font-size="7">2024-01-13 08:05:22</text>
      <text x="175" y="121" fill="#ef4444" font-size="7">DELETE</text>
      <text x="260" y="121" fill="#a0a0a0" font-size="7">185</text>
      <text x="315" y="121" fill="#ef4444" font-size="7">-284,000</text>
      <text x="370" y="121" fill="#a0a0a0" font-size="7">gdpr-job</text>
      <text x="240" y="140" fill="#a0a0a0" font-size="7" text-anchor="middle">... 38 more versions ...</text>
      <!-- Use cases -->
      <rect x="10" y="150" width="460" height="140" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="168" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">MEDIASTREAM USE CASES</text>
      <rect x="20" y="176" width="200" height="50" rx="4" fill="#0f1117" stroke="#3b82f6" stroke-width="1"/>
      <text x="120" y="193" fill="#3b82f6" font-size="8" text-anchor="middle" font-weight="bold">Incident Investigation</text>
      <text x="120" y="208" fill="#a0a0a0" font-size="7" text-anchor="middle">"Which version caused</text>
      <text x="120" y="220" fill="#a0a0a0" font-size="7" text-anchor="middle">the bad data?" → check v39</text>
      <rect x="250" y="176" width="210" height="50" rx="4" fill="#0f1117" stroke="#22c55e" stroke-width="1"/>
      <text x="355" y="193" fill="#22c55e" font-size="8" text-anchor="middle" font-weight="bold">SLA Reporting</text>
      <text x="355" y="208" fill="#a0a0a0" font-size="7" text-anchor="middle">"When did gold_kpis last</text>
      <text x="355" y="220" fill="#a0a0a0" font-size="7" text-anchor="middle">refresh?" → check latest WRITE</text>
      <text x="240" y="256" fill="#a0a0a0" font-size="8" text-anchor="middle">operationMetrics contains: numFiles, numOutputRows,</text>
      <text x="240" y="270" fill="#a0a0a0" font-size="8" text-anchor="middle">executionTimeMs, numRemovedFiles, numOutputBytes</text>
    </svg>`,

    // Step 2: Time travel
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">TIME TRAVEL — QUERY HISTORICAL DATA</text>
      <!-- Syntax examples -->
      <rect x="10" y="35" width="460" height="40" rx="4" fill="#12141f" stroke="#ff6b35" stroke-width="1"/>
      <text x="24" y="52" fill="#ff6b35" font-size="9">SELECT</text>
      <text x="73" y="52" fill="#a0a0a0" font-size="9">* FROM mediastream.gold.user_segments</text>
      <text x="24" y="67" fill="#ff6b35" font-size="9">  VERSION AS OF</text>
      <text x="143" y="67" fill="#22c55e" font-size="9">38;</text>
      <rect x="10" y="85" width="460" height="40" rx="4" fill="#12141f" stroke="#ff6b35" stroke-width="1"/>
      <text x="24" y="102" fill="#ff6b35" font-size="9">SELECT</text>
      <text x="73" y="102" fill="#a0a0a0" font-size="9">* FROM mediastream.gold.user_segments</text>
      <text x="24" y="117" fill="#ff6b35" font-size="9">  TIMESTAMP AS OF</text>
      <text x="160" y="117" fill="#22c55e" font-size="9">'2024-01-13 07:59:00';</text>
      <!-- Use cases grid -->
      <rect x="10" y="140" width="460" height="148" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="158" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">MEDIASTREAM TIME TRAVEL USE CASES</text>
      <rect x="20" y="166" width="200" height="38" rx="4" fill="#0f1117" stroke="#3b82f6" stroke-width="1"/>
      <text x="120" y="182" fill="#3b82f6" font-size="8" text-anchor="middle" font-weight="bold">ML Training Reproducibility</text>
      <text x="120" y="196" fill="#a0a0a0" font-size="7" text-anchor="middle">Reproduce training dataset</text>
      <text x="120" y="200" fill="#a0a0a0" font-size="6" text-anchor="middle">at exact version from 3 months ago</text>
      <rect x="250" y="166" width="210" height="38" rx="4" fill="#0f1117" stroke="#a855f7" stroke-width="1"/>
      <text x="355" y="182" fill="#a855f7" font-size="8" text-anchor="middle" font-weight="bold">Audit Queries</text>
      <text x="355" y="196" fill="#a0a0a0" font-size="7" text-anchor="middle">"What did user_segments look</text>
      <text x="355" y="200" fill="#a0a0a0" font-size="6" text-anchor="middle">like before Jan 15 update?"</text>
      <rect x="20" y="212" width="200" height="38" rx="4" fill="#0f1117" stroke="#22c55e" stroke-width="1"/>
      <text x="120" y="228" fill="#22c55e" font-size="8" text-anchor="middle" font-weight="bold">Accidental Delete Recovery</text>
      <text x="120" y="242" fill="#a0a0a0" font-size="7" text-anchor="middle">SELECT from version N-1,</text>
      <text x="120" y="250" fill="#a0a0a0" font-size="6" text-anchor="middle">INSERT back into current table</text>
      <rect x="250" y="212" width="210" height="38" rx="4" fill="#0f1117" stroke="#f59e0b" stroke-width="1"/>
      <text x="355" y="228" fill="#f59e0b" font-size="8" text-anchor="middle" font-weight="bold">A/B Baseline Comparison</text>
      <text x="355" y="242" fill="#a0a0a0" font-size="7" text-anchor="middle">Compare metrics before/after</text>
      <text x="355" y="250" fill="#a0a0a0" font-size="6" text-anchor="middle">a pipeline change</text>
    </svg>`,

    // Step 3: RESTORE TABLE
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">RESTORE TABLE — UNDO A MISTAKE</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- Timeline -->
      <line x1="20" y1="80" x2="460" y2="80" stroke="#ff6b35" stroke-width="1.5"/>
      <circle cx="60" cy="80" r="10" fill="#1e2030" stroke="#22c55e" stroke-width="1.5"/>
      <text x="60" y="84" fill="#22c55e" font-size="7" text-anchor="middle">v38</text>
      <text x="60" y="98" fill="#a0a0a0" font-size="7" text-anchor="middle">good</text>
      <circle cx="180" cy="80" r="10" fill="#1e2030" stroke="#ef4444" stroke-width="2"/>
      <text x="180" y="84" fill="#ef4444" font-size="7" text-anchor="middle">v39</text>
      <text x="180" y="98" fill="#ef4444" font-size="7" text-anchor="middle">BAD DELETE</text>
      <circle cx="290" cy="80" r="10" fill="#1e2030" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="290" y="84" fill="#f59e0b" font-size="7" text-anchor="middle">v40</text>
      <text x="290" y="98" fill="#a0a0a0" font-size="7" text-anchor="middle">write</text>
      <circle cx="380" cy="80" r="10" fill="#1e2030" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="380" y="84" fill="#f59e0b" font-size="7" text-anchor="middle">v41</text>
      <text x="380" y="98" fill="#a0a0a0" font-size="7" text-anchor="middle">write</text>
      <circle cx="440" cy="80" r="12" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e" stroke-width="2"/>
      <text x="440" y="84" fill="#22c55e" font-size="7" text-anchor="middle">v42</text>
      <text x="440" y="98" fill="#22c55e" font-size="7" text-anchor="middle">RESTORE</text>
      <!-- Arrow back -->
      <path d="M435,65 C400,40 80,40 65,65" stroke="#22c55e" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
      <text x="250" y="38" fill="#22c55e" font-size="8" text-anchor="middle">RESTORE creates new version identical to v38</text>
      <!-- SQL -->
      <rect x="10" y="115" width="460" height="50" rx="4" fill="#12141f" stroke="#ff6b35" stroke-width="1"/>
      <text x="24" y="135" fill="#ff6b35" font-size="10">RESTORE TABLE</text>
      <text x="150" y="135" fill="#3b82f6" font-size="10">mediastream.silver.user_activity</text>
      <text x="24" y="152" fill="#ff6b35" font-size="10">  TO VERSION AS OF</text>
      <text x="190" y="152" fill="#22c55e" font-size="10">38;</text>
      <!-- Properties -->
      <rect x="10" y="178" width="460" height="112" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="196" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">RESTORE PROPERTIES</text>
      <text x="24" y="214" fill="#22c55e" font-size="8">✓</text>
      <text x="36" y="214" fill="#a0a0a0" font-size="8">Creates NEW version (v42) — log history preserved</text>
      <text x="24" y="230" fill="#22c55e" font-size="8">✓</text>
      <text x="36" y="230" fill="#a0a0a0" font-size="8">Re-adds files removed in v39-v41, removes v39-v41 additions</text>
      <text x="24" y="246" fill="#22c55e" font-size="8">✓</text>
      <text x="36" y="246" fill="#a0a0a0" font-size="8">ACID: readers see either old state or new state, never in-between</text>
      <text x="24" y="262" fill="#22c55e" font-size="8">✓</text>
      <text x="36" y="262" fill="#a0a0a0" font-size="8">MediaStream: &lt;5 minute recovery time for any table</text>
      <text x="24" y="278" fill="#f59e0b" font-size="8">⚠</text>
      <text x="36" y="278" fill="#a0a0a0" font-size="8">Requires files from v38 still exist (not VACUUMed)</text>
    </svg>`,

    // Step 4: Log compaction
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">DELTA LOG CHECKPOINTING</text>
      <!-- Log files with checkpoint -->
      <text x="240" y="46" fill="#a0a0a0" font-size="8" text-anchor="middle">_delta_log/ — checkpoint every 10 versions</text>
      <rect x="10" y="55" width="38" height="22" rx="2" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="29" y="70" fill="#a0a0a0" font-size="6" text-anchor="middle">v0.json</text>
      <rect x="52" y="55" width="38" height="22" rx="2" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="71" y="70" fill="#a0a0a0" font-size="6" text-anchor="middle">v1.json</text>
      <rect x="94" y="55" width="38" height="22" rx="2" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="113" y="70" fill="#a0a0a0" font-size="6" text-anchor="middle">...v8</text>
      <rect x="136" y="55" width="38" height="22" rx="2" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="155" y="70" fill="#a0a0a0" font-size="6" text-anchor="middle">v9.json</text>
      <!-- Checkpoint -->
      <rect x="180" y="48" width="60" height="36" rx="3" fill="#ff6b35" fill-opacity="0.2" stroke="#ff6b35" stroke-width="2"/>
      <text x="210" y="63" fill="#ff6b35" font-size="7" text-anchor="middle" font-weight="bold">v10</text>
      <text x="210" y="76" fill="#ff6b35" font-size="6" text-anchor="middle">.checkpoint</text>
      <text x="210" y="83" fill="#ff6b35" font-size="5" text-anchor="middle">.parquet</text>
      <!-- More JSON -->
      <rect x="248" y="55" width="38" height="22" rx="2" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="267" y="70" fill="#a0a0a0" font-size="6" text-anchor="middle">v11.json</text>
      <rect x="290" y="55" width="38" height="22" rx="2" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="309" y="70" fill="#a0a0a0" font-size="6" text-anchor="middle">...v19</text>
      <!-- Checkpoint 2 -->
      <rect x="334" y="48" width="60" height="36" rx="3" fill="#ff6b35" fill-opacity="0.2" stroke="#ff6b35" stroke-width="2"/>
      <text x="364" y="63" fill="#ff6b35" font-size="7" text-anchor="middle" font-weight="bold">v20</text>
      <text x="364" y="76" fill="#ff6b35" font-size="6" text-anchor="middle">.checkpoint</text>
      <text x="364" y="83" fill="#ff6b35" font-size="5" text-anchor="middle">.parquet</text>
      <!-- Startup diagram -->
      <rect x="10" y="105" width="460" height="80" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="123" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">READING TABLE STATE ON STARTUP</text>
      <text x="24" y="141" fill="#3b82f6" font-size="8">1.</text>
      <text x="36" y="141" fill="#a0a0a0" font-size="8">Find latest checkpoint (v20.checkpoint.parquet) — full table state</text>
      <text x="24" y="157" fill="#3b82f6" font-size="8">2.</text>
      <text x="36" y="157" fill="#a0a0a0" font-size="8">Read incremental JSON files after v20: v21.json, v22.json, ..., v24.json</text>
      <text x="24" y="173" fill="#3b82f6" font-size="8">3.</text>
      <text x="36" y="173" fill="#a0a0a0" font-size="8">Apply incremental changes to checkpoint state → current table state</text>
      <!-- MediaStream numbers -->
      <rect x="10" y="198" width="460" height="92" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="216" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">MEDIASTREAM CHECKPOINT STATISTICS</text>
      <text x="90" y="236" fill="#e0e0e0" font-size="9" text-anchor="middle">Bronze (busy)</text>
      <text x="240" y="236" fill="#e0e0e0" font-size="9" text-anchor="middle">Silver</text>
      <text x="390" y="236" fill="#e0e0e0" font-size="9" text-anchor="middle">Gold</text>
      <text x="90" y="254" fill="#a0a0a0" font-size="8" text-anchor="middle">100+ ckpts/day</text>
      <text x="240" y="254" fill="#a0a0a0" font-size="8" text-anchor="middle">~48 ckpts/day</text>
      <text x="390" y="254" fill="#a0a0a0" font-size="8" text-anchor="middle">1 ckpt/trigger</text>
      <text x="90" y="270" fill="#a0a0a0" font-size="7" text-anchor="middle">every 10 versions</text>
      <text x="240" y="270" fill="#a0a0a0" font-size="7" text-anchor="middle">every 10 versions</text>
      <text x="390" y="270" fill="#a0a0a0" font-size="7" text-anchor="middle">on MV recompute</text>
      <text x="240" y="282" fill="#a0a0a0" font-size="7" text-anchor="middle">Log JSON retained 90 days | Checkpoints retained 30 days</text>
      <line x1="165" y1="240" x2="165" y2="276" stroke="#333" stroke-width="0.5"/>
      <line x1="310" y1="240" x2="310" y2="276" stroke="#333" stroke-width="0.5"/>
    </svg>`,

    // Step 5: CDF
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">CHANGE DATA FEED (CDF)</text>
      <!-- Enable -->
      <rect x="10" y="35" width="460" height="28" rx="4" fill="#12141f" stroke="#ff6b35" stroke-width="1"/>
      <text x="24" y="52" fill="#ff6b35" font-size="9">ALTER TABLE</text>
      <text x="115" y="52" fill="#3b82f6" font-size="9">mediastream.silver.user_activity</text>
      <text x="24" y="63" fill="#ff6b35" font-size="9">  SET TBLPROPERTIES</text>
      <text x="175" y="63" fill="#22c55e" font-size="9">(delta.enableChangeDataFeed = true);</text>
      <!-- Change types -->
      <rect x="10" y="76" width="460" height="90" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="94" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">_change_type VALUES</text>
      <rect x="20" y="102" width="95" height="52" rx="3" fill="#22c55e" fill-opacity="0.1" stroke="#22c55e" stroke-width="1"/>
      <text x="67" y="118" fill="#22c55e" font-size="8" text-anchor="middle" font-weight="bold">insert</text>
      <text x="67" y="132" fill="#a0a0a0" font-size="7" text-anchor="middle">new row added</text>
      <text x="67" y="148" fill="#a0a0a0" font-size="6" text-anchor="middle">by INSERT/MERGE</text>
      <rect x="125" y="102" width="100" height="52" rx="3" fill="#f59e0b" fill-opacity="0.1" stroke="#f59e0b" stroke-width="1"/>
      <text x="175" y="118" fill="#f59e0b" font-size="7" text-anchor="middle" font-weight="bold">update_preimage</text>
      <text x="175" y="132" fill="#a0a0a0" font-size="7" text-anchor="middle">row before UPDATE</text>
      <text x="175" y="148" fill="#a0a0a0" font-size="6" text-anchor="middle">(old values)</text>
      <rect x="235" y="102" width="100" height="52" rx="3" fill="#f59e0b" fill-opacity="0.1" stroke="#f59e0b" stroke-width="1"/>
      <text x="285" y="118" fill="#f59e0b" font-size="7" text-anchor="middle" font-weight="bold">update_postimage</text>
      <text x="285" y="132" fill="#a0a0a0" font-size="7" text-anchor="middle">row after UPDATE</text>
      <text x="285" y="148" fill="#a0a0a0" font-size="6" text-anchor="middle">(new values)</text>
      <rect x="345" y="102" width="115" height="52" rx="3" fill="#ef4444" fill-opacity="0.1" stroke="#ef4444" stroke-width="1"/>
      <text x="402" y="118" fill="#ef4444" font-size="8" text-anchor="middle" font-weight="bold">delete</text>
      <text x="402" y="132" fill="#a0a0a0" font-size="7" text-anchor="middle">row removed</text>
      <text x="402" y="148" fill="#a0a0a0" font-size="6" text-anchor="middle">by DELETE/MERGE</text>
      <!-- Read CDF -->
      <rect x="10" y="178" width="460" height="30" rx="4" fill="#12141f" stroke="#ff6b35" stroke-width="1"/>
      <text x="24" y="194" fill="#ff6b35" font-size="9">SELECT</text>
      <text x="73" y="194" fill="#a0a0a0" font-size="9">* FROM</text>
      <text x="116" y="194" fill="#22c55e" font-size="9">table_changes('mediastream.silver.user_activity', 40, 42)</text>
      <text x="24" y="203" fill="#ff6b35" font-size="9">WHERE</text>
      <text x="73" y="203" fill="#a0a0a0" font-size="9">_change_type = 'insert';</text>
      <!-- MediaStream benefit -->
      <rect x="10" y="222" width="460" height="68" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="240" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">MEDIASTREAM CDF IMPACT</text>
      <text x="240" y="257" fill="#a0a0a0" font-size="8" text-anchor="middle">Downstream incremental pipelines consume CDF instead of full reprocessing</text>
      <text x="240" y="272" fill="#22c55e" font-size="9" text-anchor="middle" font-weight="bold">94% reduction in downstream reprocessing compute</text>
      <text x="240" y="284" fill="#a0a0a0" font-size="7" text-anchor="middle">Silver → Gold pipeline: reads only changed rows since last run via table_changes()</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.vh-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.vh-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.vh-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="vh-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="vh-header module-header">
        <div class="module-tag" style="background:var(--delta)">ADVANCED</div>
        <h2 class="module-title">Version History</h2>
        <p class="module-subtitle">Delta Lake version history, time travel, RESTORE, and Change Data Feed at MediaStream</p>
      </div>
      <div class="vh-pills step-pills">${pills}</div>
      <div class="vh-diagram diagram-frame"></div>
      <div class="vh-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'vh-page page-enter';
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
    container.querySelectorAll('.vh-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['version-history'] = {
    id: 'version-history',
    title: 'Version History',
    group: 'Advanced',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
