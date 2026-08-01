(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'The Problem',
      desc: 'Late-arriving events and corrections create duplicates without MERGE',
      detail: 'MediaStream receives ~3.2M late-arriving events per day — network retries, mobile apps buffering offline, and producer bugs. Simple append writes create duplicates in user_events_silver.',
    },
    {
      label: 'MERGE INTO Syntax',
      desc: 'SQL MERGE INTO — the idempotent upsert primitive',
      detail: 'MERGE INTO target USING source ON condition WHEN MATCHED THEN UPDATE WHEN NOT MATCHED THEN INSERT. Delta evaluates every source row against the target and applies the right action atomically.',
    },
    {
      label: 'Matched / Not Matched',
      desc: 'Three clause types handle every data reconciliation pattern',
      detail: 'WHEN MATCHED AND condition THEN UPDATE SET: update matching rows. WHEN NOT MATCHED THEN INSERT: insert new rows. WHEN MATCHED AND condition THEN DELETE: remove retracted events.',
    },
    {
      label: 'Idempotent Upsert',
      desc: 'Running MERGE twice with same source produces the same result',
      detail: 'If the Silver → Gold MERGE job is rerun due to a pipeline failure, the second run finds all rows already MATCHED with identical values. No double-counting, no phantom deletes.',
    },
    {
      label: 'SCD Type 2',
      desc: 'Slowly Changing Dimension Type 2 — history preservation with MERGE',
      detail: 'content_metadata tracks content lifecycle changes: a show moves from "new" to "popular" to "catalog". MERGE closes the current record (sets end_date) and inserts a new open record — full history preserved.',
    },
    {
      label: 'Performance',
      desc: 'Optimizing MERGE with partition pruning and bloom filters',
      detail: 'Without optimization, MERGE scans the full target table. Partitioning on (region, date) + Z-Order on user_id reduces target files scanned from 8.2M to ~17K — 480× less I/O.',
    },
    {
      label: 'Late Events',
      desc: 'MediaStream late-event pipeline: deduplicate before Silver MERGE',
      detail: 'Bronze → Silver uses a two-phase approach: (1) watermark-based dedup in Spark Structured Streaming removes duplicates within a 24-hour window; (2) MERGE INTO Silver handles any stragglers.',
    },
  ];

  let _engine = null;

  const DIAGRAMS = [
    // Step 0: The Problem
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Late-Arriving Events Create Duplicates Without MERGE</text>
      <!-- Timeline -->
      <line x1="40" y1="60" x2="440" y2="60" stroke="#334155" stroke-width="2"/>
      <text x="30" y="64" text-anchor="end" fill="#64748b" font-size="9">time</text>
      <!-- Events on timeline -->
      <circle cx="100" cy="60" r="6" fill="#38bdf8"/>
      <text x="100" y="52" text-anchor="middle" fill="#38bdf8" font-size="8">E1</text>
      <text x="100" y="78" text-anchor="middle" fill="#64748b" font-size="8">14:32:07</text>
      <circle cx="180" cy="60" r="6" fill="#38bdf8"/>
      <text x="180" y="52" text-anchor="middle" fill="#38bdf8" font-size="8">E2</text>
      <text x="180" y="78" text-anchor="middle" fill="#64748b" font-size="8">14:32:09</text>
      <circle cx="280" cy="60" r="6" fill="#ef4444"/>
      <text x="280" y="52" text-anchor="middle" fill="#ef4444" font-size="8">E1 late</text>
      <text x="280" y="78" text-anchor="middle" fill="#64748b" font-size="8">14:33:55</text>
      <text x="280" y="90" text-anchor="middle" fill="#ef4444" font-size="7">mobile buffered</text>
      <circle cx="380" cy="60" r="6" fill="#ef4444"/>
      <text x="380" y="52" text-anchor="middle" fill="#ef4444" font-size="8">E1 retry</text>
      <text x="380" y="78" text-anchor="middle" fill="#64748b" font-size="8">14:35:12</text>
      <text x="380" y="90" text-anchor="middle" fill="#ef4444" font-size="7">producer retry</text>
      <!-- Without MERGE -->
      <rect x="15" y="105" width="200" height="95" rx="4" fill="#1c0a0a" stroke="#ef4444"/>
      <text x="115" y="122" text-anchor="middle" fill="#ef4444" font-size="10" font-weight="bold">Append Only (BAD)</text>
      <text x="115" y="137" text-anchor="middle" fill="#64748b" font-size="9">E1 play  user_id=u_847</text>
      <text x="115" y="150" text-anchor="middle" fill="#64748b" font-size="9">E2 pause user_id=u_847</text>
      <text x="115" y="163" text-anchor="middle" fill="#ef4444" font-size="9">E1 play  user_id=u_847 dup!</text>
      <text x="115" y="176" text-anchor="middle" fill="#ef4444" font-size="9">E1 play  user_id=u_847 dup!</text>
      <text x="115" y="191" text-anchor="middle" fill="#ef4444" font-size="9">3× play counted → bad metrics</text>
      <!-- With MERGE -->
      <rect x="260" y="105" width="200" height="95" rx="4" fill="#0a1628" stroke="#4ade80"/>
      <text x="360" y="122" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">MERGE INTO (GOOD)</text>
      <text x="360" y="137" text-anchor="middle" fill="#4ade80" font-size="9">E1 play  user_id=u_847  → INSERT</text>
      <text x="360" y="150" text-anchor="middle" fill="#4ade80" font-size="9">E2 pause user_id=u_847  → INSERT</text>
      <text x="360" y="163" text-anchor="middle" fill="#4ade80" font-size="9">E1 late  → MATCHED → no-op</text>
      <text x="360" y="176" text-anchor="middle" fill="#4ade80" font-size="9">E1 retry → MATCHED → no-op</text>
      <text x="360" y="191" text-anchor="middle" fill="#4ade80" font-size="9">1× play counted → correct ✓</text>
      <text x="240" y="225" text-anchor="middle" fill="#64748b" font-size="9">MediaStream: 3.2M late events/day — MERGE prevents ~9.6M spurious play counts per day</text>
    </svg>`,

    // Step 1: MERGE INTO Syntax
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">MERGE INTO — Full SQL Syntax</text>
      <rect x="15" y="35" width="450" height="175" rx="4" fill="#0f172a" stroke="#334155"/>
      <text x="30" y="53" fill="#64748b" font-size="9">MediaStream: Silver upsert from Bronze deduplicated batch</text>
      <text x="30" y="68" fill="#a855f7" font-size="10">MERGE INTO prod.mediastream.user_events_silver AS target</text>
      <text x="30" y="82" fill="#a855f7" font-size="10">USING (</text>
      <text x="30" y="96" fill="#38bdf8" font-size="10">  SELECT user_id, event_type, content_id,</text>
      <text x="30" y="110" fill="#38bdf8" font-size="10">         event_ts, region, session_id,</text>
      <text x="30" y="124" fill="#38bdf8" font-size="10">         MAX(_ingest_ts) AS latest_ingest</text>
      <text x="30" y="138" fill="#38bdf8" font-size="10">  FROM   prod.mediastream.user_events_bronze</text>
      <text x="30" y="152" fill="#38bdf8" font-size="10">  WHERE  date(event_ts) = current_date() - 1</text>
      <text x="30" y="166" fill="#38bdf8" font-size="10">  GROUP BY 1,2,3,4,5,6</text>
      <text x="30" y="180" fill="#a855f7" font-size="10">) AS source</text>
      <text x="30" y="194" fill="#4ade80" font-size="10">ON target.user_id = source.user_id AND target.event_ts = source.event_ts</text>
      <text x="30" y="208" fill="#fbbf24" font-size="10">WHEN MATCHED AND target.event_type != source.event_type THEN</text>
      <!-- Key clauses below -->
      <rect x="15" y="218" width="215" height="62" rx="4" fill="#1e293b" stroke="#fbbf24"/>
      <text x="122" y="234" text-anchor="middle" fill="#fbbf24" font-size="9">WHEN MATCHED</text>
      <text x="122" y="247" text-anchor="middle" fill="#64748b" font-size="9">row exists in both tables</text>
      <text x="122" y="260" text-anchor="middle" fill="#64748b" font-size="9">→ UPDATE or DELETE</text>
      <text x="122" y="273" text-anchor="middle" fill="#64748b" font-size="9">optional extra condition</text>
      <rect x="250" y="218" width="215" height="62" rx="4" fill="#1e293b" stroke="#4ade80"/>
      <text x="357" y="234" text-anchor="middle" fill="#4ade80" font-size="9">WHEN NOT MATCHED</text>
      <text x="357" y="247" text-anchor="middle" fill="#64748b" font-size="9">row exists only in source</text>
      <text x="357" y="260" text-anchor="middle" fill="#64748b" font-size="9">→ INSERT into target</text>
      <text x="357" y="273" text-anchor="middle" fill="#64748b" font-size="9">optional condition filter</text>
    </svg>`,

    // Step 2: Matched / Not Matched
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Clause Evaluation — Three Outcomes per Source Row</text>
      <!-- Source -->
      <rect x="15" y="38" width="130" height="130" rx="4" fill="#1e293b" stroke="#38bdf8"/>
      <text x="80" y="55" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="bold">Source Batch</text>
      <line x1="15" y1="60" x2="145" y2="60" stroke="#334155"/>
      <text x="30" y="75" fill="#94a3b8" font-size="9">E1: u_847 play</text>
      <text x="30" y="89" fill="#94a3b8" font-size="9">E2: u_847 pause</text>
      <text x="30" y="103" fill="#94a3b8" font-size="9">E3: u_291 play</text>
      <text x="30" y="117" fill="#94a3b8" font-size="9">E4: u_847 play</text>
      <text x="30" y="131" fill="#94a3b8" font-size="9">E5: u_553 seek</text>
      <text x="30" y="145" fill="#94a3b8" font-size="9">E6: u_291 quit</text>
      <!-- Target -->
      <rect x="350" y="38" width="115" height="130" rx="4" fill="#1e293b" stroke="#a855f7"/>
      <text x="407" y="55" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">Target (Silver)</text>
      <line x1="350" y1="60" x2="465" y2="60" stroke="#334155"/>
      <text x="365" y="75" fill="#94a3b8" font-size="9">E1 (exists)</text>
      <text x="365" y="89" fill="#94a3b8" font-size="9">E2 (exists)</text>
      <text x="365" y="103" fill="#64748b" font-size="9">—</text>
      <text x="365" y="117" fill="#94a3b8" font-size="9">E4 (exists)</text>
      <text x="365" y="131" fill="#64748b" font-size="9">—</text>
      <text x="365" y="145" fill="#94a3b8" font-size="9">E6 (exists)</text>
      <!-- Outcomes -->
      <text x="240" y="55" text-anchor="middle" fill="#64748b" font-size="9">MERGE evaluates each source row:</text>
      <text x="185" y="75" fill="#ef4444" font-size="9">E1 → MATCHED, no change → skip</text>
      <text x="185" y="89" fill="#ef4444" font-size="9">E2 → MATCHED, no change → skip</text>
      <text x="185" y="103" fill="#4ade80" font-size="9">E3 → NOT MATCHED → INSERT</text>
      <text x="185" y="117" fill="#ef4444" font-size="9">E4 → MATCHED, no change → skip</text>
      <text x="185" y="131" fill="#4ade80" font-size="9">E5 → NOT MATCHED → INSERT</text>
      <text x="185" y="145" fill="#fbbf24" font-size="9">E6 → MATCHED changed → UPDATE</text>
      <!-- Summary box -->
      <rect x="15" y="185" width="450" height="90" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="240" y="203" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">MERGE Result Summary</text>
      <text x="30" y="220" fill="#4ade80" font-size="10">2 INSERTED (E3: new u_291 play,  E5: new u_553 seek)</text>
      <text x="30" y="236" fill="#fbbf24" font-size="10">1 UPDATED  (E6: u_291 quit — event_type changed)</text>
      <text x="30" y="252" fill="#64748b" font-size="10">3 SKIPPED  (E1, E2, E4 — already in Silver, no change)</text>
      <text x="30" y="268" fill="#64748b" font-size="9">Total rows scanned: 6 source  ×  target-partition  →  single atomic commit v43</text>
    </svg>`,

    // Step 3: Idempotent Upsert
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Idempotency — Same Source, Same Result, Any Number of Runs</text>
      <!-- Run 1 -->
      <rect x="15" y="38" width="200" height="110" rx="4" fill="#0a1628" stroke="#4ade80"/>
      <text x="115" y="56" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">Run 1 (first time)</text>
      <line x1="15" y1="61" x2="215" y2="61" stroke="#334155"/>
      <text x="30" y="77" fill="#64748b" font-size="9">Source: E3, E5 (new), E6 (changed)</text>
      <text x="30" y="91" fill="#4ade80" font-size="9">INSERT E3 → Silver row added</text>
      <text x="30" y="105" fill="#4ade80" font-size="9">INSERT E5 → Silver row added</text>
      <text x="30" y="119" fill="#fbbf24" font-size="9">UPDATE E6 → event_type updated</text>
      <text x="30" y="135" fill="#64748b" font-size="9">Commit: Delta v43</text>
      <!-- Run 2 -->
      <rect x="265" y="38" width="200" height="110" rx="4" fill="#1e293b" stroke="#38bdf8"/>
      <text x="365" y="56" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="bold">Run 2 (rerun/retry)</text>
      <line x1="265" y1="61" x2="465" y2="61" stroke="#334155"/>
      <text x="280" y="77" fill="#64748b" font-size="9">Same source: E3, E5, E6</text>
      <text x="280" y="91" fill="#64748b" font-size="9">E3 → MATCHED, no change → skip</text>
      <text x="280" y="105" fill="#64748b" font-size="9">E5 → MATCHED, no change → skip</text>
      <text x="280" y="119" fill="#64748b" font-size="9">E6 → MATCHED, no change → skip</text>
      <text x="280" y="135" fill="#38bdf8" font-size="9">Commit: Delta v44 (no-op write)</text>
      <!-- Arrow -->
      <text x="240" y="80" text-anchor="middle" fill="#64748b" font-size="20">→</text>
      <!-- Silver state -->
      <rect x="15" y="165" width="450" height="50" rx="4" fill="#1e293b" stroke="#4ade80"/>
      <text x="240" y="183" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">Silver table state: identical after Run 1 and Run 2</text>
      <text x="240" y="200" text-anchor="middle" fill="#64748b" font-size="9">E3 row: same data.  E5 row: same data.  E6 row: same updated value.  No duplicates ever.</text>
      <!-- Why it matters -->
      <rect x="15" y="228" width="450" height="55" rx="4" fill="#0f172a" stroke="#334155"/>
      <text x="240" y="246" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">Why This Matters for MediaStream</text>
      <text x="30" y="261" fill="#64748b" font-size="9">Airflow retries: Bronze → Silver MERGE reruns 4× per day due to transient S3 errors.</text>
      <text x="30" y="274" fill="#64748b" font-size="9">Without idempotency: each retry doubles the Silver row count. With MERGE: always correct.</text>
    </svg>`,

    // Step 4: SCD Type 2
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">SCD Type 2 with MERGE — content_metadata Lifecycle</text>
      <!-- State change -->
      <text x="240" y="45" text-anchor="middle" fill="#64748b" font-size="9">Content c_stranger_things_s4e9 changes status from "new" to "popular"</text>
      <!-- SQL -->
      <rect x="15" y="55" width="450" height="115" rx="4" fill="#0f172a" stroke="#334155"/>
      <text x="30" y="73" fill="#64748b" font-size="9">SCD Type 2 MERGE pattern:</text>
      <text x="30" y="87" fill="#a855f7" font-size="10">MERGE INTO prod.mediastream.content_metadata AS target</text>
      <text x="30" y="101" fill="#38bdf8" font-size="10">USING content_updates AS source</text>
      <text x="30" y="115" fill="#38bdf8" font-size="10">ON target.content_id = source.content_id AND target.is_current = true</text>
      <text x="30" y="129" fill="#fbbf24" font-size="10">WHEN MATCHED THEN UPDATE SET</text>
      <text x="30" y="143" fill="#fbbf24" font-size="10">  target.is_current = false, target.end_date = current_date()</text>
      <text x="30" y="157" fill="#4ade80" font-size="10">WHEN NOT MATCHED THEN INSERT (content_id, status, start_date, end_date, is_current)</text>
      <!-- Before / After -->
      <rect x="15" y="180" width="215" height="90" rx="4" fill="#1e293b" stroke="#fbbf24"/>
      <text x="122" y="197" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">Before MERGE</text>
      <text x="30" y="212" fill="#94a3b8" font-size="8">content_id   status  start      end    cur</text>
      <line x1="15" y1="216" x2="230" y2="216" stroke="#334155"/>
      <text x="30" y="229" fill="#38bdf8" font-size="8">c_st_s4e9    new    2024-01-01  NULL   true</text>
      <rect x="250" y="180" width="215" height="90" rx="4" fill="#1e293b" stroke="#4ade80"/>
      <text x="357" y="197" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">After MERGE</text>
      <text x="265" y="212" fill="#94a3b8" font-size="8">content_id   status   start      end        cur</text>
      <line x1="250" y1="216" x2="465" y2="216" stroke="#334155"/>
      <text x="265" y="229" fill="#ef4444" font-size="8">c_st_s4e9   new    2024-01-01  2024-01-24  false</text>
      <text x="265" y="242" fill="#4ade80" font-size="8">c_st_s4e9   popular 2024-01-24  NULL       true</text>
      <text x="122" y="260" text-anchor="middle" fill="#64748b" font-size="8">1 row, current=true</text>
      <text x="357" y="260" text-anchor="middle" fill="#64748b" font-size="8">old row closed, new row inserted</text>
    </svg>`,

    // Step 5: Performance
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">MERGE Performance — Partition Pruning + Z-Order</text>
      <!-- Unoptimized -->
      <rect x="15" y="38" width="210" height="130" rx="4" fill="#1c0a0a" stroke="#ef4444"/>
      <text x="120" y="56" text-anchor="middle" fill="#ef4444" font-size="10" font-weight="bold">Unoptimized MERGE</text>
      <text x="30" y="72" fill="#94a3b8" font-size="9">No partitioning</text>
      <text x="30" y="86" fill="#94a3b8" font-size="9">No Z-Order</text>
      <text x="30" y="100" fill="#94a3b8" font-size="9">Files scanned: 8,200,000</text>
      <text x="30" y="114" fill="#94a3b8" font-size="9">Duration: 52 minutes</text>
      <text x="30" y="128" fill="#94a3b8" font-size="9">Shuffle: 5.2 TB</text>
      <text x="30" y="142" fill="#ef4444" font-size="9">SLA breached (target: 5 min)</text>
      <text x="30" y="156" fill="#64748b" font-size="9">Daily cost: $8,400</text>
      <!-- Optimized -->
      <rect x="255" y="38" width="210" height="130" rx="4" fill="#0a1628" stroke="#4ade80"/>
      <text x="360" y="56" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">Optimized MERGE</text>
      <text x="270" y="72" fill="#94a3b8" font-size="9">Partition: (region, date)</text>
      <text x="270" y="86" fill="#94a3b8" font-size="9">ZORDER BY (user_id)</text>
      <text x="270" y="100" fill="#4ade80" font-size="9">Files scanned: 17,000</text>
      <text x="270" y="114" fill="#4ade80" font-size="9">Duration: 3 min 41 s</text>
      <text x="270" y="128" fill="#4ade80" font-size="9">Shuffle: 2.1 GB</text>
      <text x="270" y="142" fill="#4ade80" font-size="9">SLA met ✓ (3.6 min)</text>
      <text x="270" y="156" fill="#4ade80" font-size="9">Daily cost: $490</text>
      <!-- Tips -->
      <rect x="15" y="183" width="450" height="95" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="240" y="200" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">Optimization Techniques for MERGE</text>
      <line x1="15" y1="205" x2="465" y2="205" stroke="#334155"/>
      <text x="30" y="220" fill="#4ade80" font-size="9">1. Partition the target on merge join key (region/date) → partition pruning eliminates 99.8% of files</text>
      <text x="30" y="234" fill="#4ade80" font-size="9">2. OPTIMIZE ZORDER BY (user_id) on target → data skipping within partitions</text>
      <text x="30" y="248" fill="#4ade80" font-size="9">3. Filter source to today's data only (WHERE date = current_date - 1) → smaller source scan</text>
      <text x="30" y="262" fill="#4ade80" font-size="9">4. Use low-shuffle MERGE hint: spark.conf.set("spark.databricks.delta.merge.repartitionBeforeWrite.enabled", "true")</text>
      <text x="30" y="276" fill="#fbbf24" font-size="9">MediaStream: 480× fewer files scanned, 2,476× less shuffle — $14.5M saved annually vs append+dedup</text>
    </svg>`,

    // Step 6: Late Events
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <defs>
        <linearGradient id="um-g6" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff6b35"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
      </defs>
      <rect x="15" y="12" width="450" height="26" rx="4" fill="url(#um-g6)"/>
      <text x="240" y="29" text-anchor="middle" fill="white" font-weight="bold" font-size="12">MediaStream Late-Event Pipeline</text>
      <!-- Phase 1 -->
      <rect x="15" y="48" width="200" height="115" rx="4" fill="#1e293b" stroke="#ff6b35"/>
      <text x="115" y="66" text-anchor="middle" fill="#ff6b35" font-size="10" font-weight="bold">Phase 1: Streaming Dedup</text>
      <line x1="15" y1="71" x2="215" y2="71" stroke="#334155"/>
      <text x="30" y="87" fill="#64748b" font-size="9">Watermark: 24-hour window</text>
      <text x="30" y="101" fill="#64748b" font-size="9">dropDuplicates(["user_id","event_ts"])</text>
      <text x="30" y="115" fill="#64748b" font-size="9">Handles: &gt;95% of late events</text>
      <text x="30" y="129" fill="#64748b" font-size="9">Bronze → Bronze_deduped table</text>
      <text x="30" y="143" fill="#4ade80" font-size="9">Eliminates ~3.04M dups/day</text>
      <text x="30" y="157" fill="#64748b" font-size="9">Runs: every 5 minutes</text>
      <!-- Arrow -->
      <text x="240" y="100" text-anchor="middle" fill="#94a3b8" font-size="16">→</text>
      <!-- Phase 2 -->
      <rect x="265" y="48" width="200" height="115" rx="4" fill="#1e293b" stroke="#a855f7"/>
      <text x="365" y="66" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">Phase 2: MERGE Stragglers</text>
      <line x1="265" y1="71" x2="465" y2="71" stroke="#334155"/>
      <text x="280" y="87" fill="#64748b" font-size="9">Source: Bronze_deduped batch</text>
      <text x="280" y="101" fill="#64748b" font-size="9">Target: user_events_silver</text>
      <text x="280" y="115" fill="#64748b" font-size="9">Handles: remaining ~160K/day</text>
      <text x="280" y="129" fill="#64748b" font-size="9">ON (user_id, event_ts)</text>
      <text x="280" y="143" fill="#4ade80" font-size="9">Zero duplicates in Silver ✓</text>
      <text x="280" y="157" fill="#64748b" font-size="9">Runs: every 5 minutes</text>
      <!-- Stats -->
      <rect x="15" y="180" width="450" height="95" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="240" y="198" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">Late Event Statistics — MediaStream Production</text>
      <text x="30" y="215" fill="#64748b" font-size="9">Total late events/day:        3.2M  (0.13% of 2.4B total)</text>
      <text x="30" y="229" fill="#64748b" font-size="9">Eliminated by watermark dedup: 3.04M (95.0%)</text>
      <text x="30" y="243" fill="#64748b" font-size="9">Handled by MERGE upsert:         160K (5.0%)</text>
      <text x="30" y="257" fill="#4ade80" font-size="9">Duplicates in Silver after both phases: 0</text>
      <text x="30" y="271" fill="#64748b" font-size="9">Sources: mobile buffering (62%), network retry (31%), producer bug (7%)</text>
    </svg>`,
  ];

  function _buildDiagram(si) { return DIAGRAMS[si] || DIAGRAMS[0]; }

  function _updateStep(el, si) {
    el.querySelectorAll('.um-pill').forEach((pill, idx) => {
      pill.classList.toggle('active', idx === si);
      pill.classList.toggle('visited', idx < si);
    });
    const diagram = el.querySelector('#um-diagram');
    if (diagram) diagram.innerHTML = _buildDiagram(si);
    const s = STEPS[si];
    const t = el.querySelector('#um-info-title');
    const b = el.querySelector('#um-info-body');
    const d = el.querySelector('#um-info-detail');
    if (t) t.textContent = s.label;
    if (b) b.textContent = s.desc;
    if (d) d.textContent = s.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="um-pill${i === 0 ? ' active' : ''}" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
<style>
.um-page { display:flex; flex-direction:column; gap:16px; padding:16px; }
.um-pills { display:flex; flex-wrap:wrap; gap:6px; }
.um-pill {
  padding:4px 12px; border-radius:20px; border:1px solid var(--border);
  background:var(--surface); color:var(--text-muted); font-size:11px;
  cursor:pointer; transition:all .2s;
}
.um-pill.active { border-color:var(--unity); color:var(--unity); background:rgba(168,85,247,.1); }
.um-pill.visited { border-color:var(--border); color:var(--text-muted); opacity:.6; }
.um-pill:hover { border-color:var(--unity); color:var(--unity); }
.um-layout { display:grid; grid-template-columns:1fr 280px; gap:16px; }
.um-diagram-wrap { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:8px; }
.um-diagram-wrap svg { width:100%; height:auto; }
.um-info { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:16px; display:flex; flex-direction:column; gap:8px; }
.um-info-title { font-size:16px; font-weight:600; color:var(--unity); }
.um-info-body { font-size:13px; color:var(--text); }
.um-info-detail { font-size:12px; color:var(--text-muted); line-height:1.6; }
.um-badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:11px; background:rgba(168,85,247,.15); color:var(--unity); border:1px solid rgba(168,85,247,.3); }
@media(max-width:720px){ .um-layout{ grid-template-columns:1fr; } }
</style>
<div class="um-page page-enter">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
    <h2 style="font-size:20px;font-weight:700;color:var(--text);margin:0;">MERGE (Upsert)</h2>
    <span class="um-badge">Write Operation</span>
    <span style="color:var(--text-muted);font-size:12px;">Idempotent upsert for 3.2M late events/day — zero duplicates in Silver</span>
  </div>
  <div class="um-pills">${pills}</div>
  <div class="um-layout">
    <div class="um-diagram-wrap"><div id="um-diagram">${_buildDiagram(0)}</div></div>
    <div class="um-info">
      <div class="um-info-title" id="um-info-title">${STEPS[0].label}</div>
      <div class="um-info-body" id="um-info-body">${STEPS[0].desc}</div>
      <div class="um-info-detail" id="um-info-detail">${STEPS[0].detail}</div>
    </div>
  </div>
</div>`;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'um-page page-enter';
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

    container.querySelectorAll('.um-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['upsert-merge'] = {
    id: 'upsert-merge',
    title: 'MERGE (Upsert)',
    group: 'Write Operations',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
