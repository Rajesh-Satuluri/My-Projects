(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Full Scan Problem',
      desc: '5 PB scanned for a 1-day query — without optimization',
      detail: 'Before Delta data skipping, every query on user_events_gold scanned all 5 PB across 8.2M Parquet files. A simple 24-hour window query took 47 minutes.',
    },
    {
      label: 'File-Level Stats',
      desc: 'Delta collects min/max/null counts per file at write time',
      detail: 'For each Parquet file written, Delta records minValues, maxValues, and nullCount for the first 32 columns into the _delta_log. Zero read overhead.',
    },
    {
      label: 'Stats in Commit Log',
      desc: 'addFile actions carry stats JSON inside the commit entry',
      detail: 'Each "add" action in the commit JSON carries a "stats" field. Spark reads only these small JSON files to evaluate predicate pushdown — no data files opened.',
    },
    {
      label: 'Predicate Pushdown',
      desc: 'Delta skips files where the predicate cannot match',
      detail: 'For WHERE event_date = \'2024-01-24\', Delta checks each file\'s stats. If file max(event_date) < 2024-01-24 OR file min(event_date) > 2024-01-24, the file is skipped entirely.',
    },
    {
      label: 'Z-Order OPTIMIZE',
      desc: 'Co-locate correlated columns to maximize skipping',
      detail: 'Z-Ordering rewrites files so rows with similar (user_id, content_id) values are co-located. A query filtering on both columns can skip 99.7% of files.',
    },
    {
      label: 'MediaStream Results',
      desc: '5 PB → 2.1 GB scanned for a user-day query',
      detail: 'After enabling Z-Order on (user_id, event_date) and (region, event_date), the recommendation pipeline query time dropped from 47 minutes to 38 seconds — a 74× improvement.',
    },
  ];

  let _engine = null;

  const DIAGRAMS = [
    // Step 0: Full Scan Problem
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <defs>
        <linearGradient id="ds-g0" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ef4444"/>
          <stop offset="100%" stop-color="#f97316"/>
        </linearGradient>
      </defs>
      <rect x="20" y="20" width="440" height="50" rx="4" fill="#1c0a0a" stroke="#ef4444"/>
      <text x="240" y="40" text-anchor="middle" fill="#ef4444" font-size="12" font-weight="bold">SELECT * FROM user_events_gold</text>
      <text x="240" y="58" text-anchor="middle" fill="#f97316" font-size="11">WHERE event_date = '2024-01-24'  AND region = 'us-east-1'</text>
      <!-- Files grid -->
      <text x="240" y="90" text-anchor="middle" fill="#94a3b8" font-size="10">Without data skipping: ALL 8.2M files scanned</text>
      <rect x="25" y="98" width="38" height="22" rx="2" fill="#ef4444" opacity=".7"/><text x="44" y="113" text-anchor="middle" fill="white" font-size="8">file</text>
      <rect x="68" y="98" width="38" height="22" rx="2" fill="#ef4444" opacity=".7"/><text x="87" y="113" text-anchor="middle" fill="white" font-size="8">file</text>
      <rect x="111" y="98" width="38" height="22" rx="2" fill="#ef4444" opacity=".7"/>
      <rect x="154" y="98" width="38" height="22" rx="2" fill="#ef4444" opacity=".7"/>
      <rect x="197" y="98" width="38" height="22" rx="2" fill="#ef4444" opacity=".7"/>
      <rect x="240" y="98" width="38" height="22" rx="2" fill="#ef4444" opacity=".7"/>
      <rect x="283" y="98" width="38" height="22" rx="2" fill="#ef4444" opacity=".7"/>
      <rect x="326" y="98" width="38" height="22" rx="2" fill="#ef4444" opacity=".7"/>
      <rect x="369" y="98" width="38" height="22" rx="2" fill="#ef4444" opacity=".7"/>
      <rect x="412" y="98" width="44" height="22" rx="2" fill="#ef4444" opacity=".7"/>
      <text x="440" y="113" text-anchor="middle" fill="white" font-size="7">+8.2M</text>
      <!-- Stats -->
      <rect x="40" y="140" width="120" height="60" rx="4" fill="#1e293b" stroke="#ef4444"/>
      <text x="100" y="158" text-anchor="middle" fill="#ef4444" font-size="10" font-weight="bold">5 PB Total</text>
      <text x="100" y="173" text-anchor="middle" fill="#94a3b8" font-size="10">all regions</text>
      <text x="100" y="188" text-anchor="middle" fill="#94a3b8" font-size="10">all dates</text>
      <rect x="180" y="140" width="120" height="60" rx="4" fill="#1e293b" stroke="#f97316"/>
      <text x="240" y="158" text-anchor="middle" fill="#f97316" font-size="10" font-weight="bold">47 minutes</text>
      <text x="240" y="173" text-anchor="middle" fill="#94a3b8" font-size="10">query time</text>
      <text x="240" y="188" text-anchor="middle" fill="#94a3b8" font-size="10">SLA: 2 min ✗</text>
      <rect x="320" y="140" width="120" height="60" rx="4" fill="#1e293b" stroke="#ef4444"/>
      <text x="380" y="158" text-anchor="middle" fill="#ef4444" font-size="10" font-weight="bold">$2,400/query</text>
      <text x="380" y="173" text-anchor="middle" fill="#94a3b8" font-size="10">Databricks DBUs</text>
      <text x="380" y="188" text-anchor="middle" fill="#94a3b8" font-size="10">hourly cost</text>
      <text x="240" y="230" text-anchor="middle" fill="#64748b" font-size="9">Recommendation pipeline runs 1440× per day — $3.5M/month wasted compute</text>
      <rect x="40" y="245" width="400" height="32" rx="4" fill="url(#ds-g0)" opacity=".15" stroke="#ef4444"/>
      <text x="240" y="265" text-anchor="middle" fill="#ef4444" font-size="10">INC-2023-014: pipeline budget overrun detected — root cause: no data skipping</text>
    </svg>`,

    // Step 1: File-Level Stats
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Delta Collects Stats at Write Time — Zero Read Overhead</text>
      <!-- Parquet write -->
      <rect x="20" y="40" width="100" height="80" rx="4" fill="#1e293b" stroke="#ff6b35"/>
      <text x="70" y="57" text-anchor="middle" fill="#ff6b35" font-size="10" font-weight="bold">Parquet File</text>
      <text x="70" y="72" text-anchor="middle" fill="#64748b" font-size="9">128 MB</text>
      <text x="70" y="87" text-anchor="middle" fill="#38bdf8" font-size="9">event_date:</text>
      <text x="70" y="100" text-anchor="middle" fill="#94a3b8" font-size="9">2024-01-24</text>
      <text x="70" y="113" text-anchor="middle" fill="#94a3b8" font-size="9">→ 2024-01-24</text>
      <!-- Arrow -->
      <line x1="120" y1="80" x2="145" y2="80" stroke="#4ade80" stroke-width="1.5" marker-end="url(#ds-a1)"/>
      <defs><marker id="ds-a1" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#4ade80"/></marker></defs>
      <!-- Stats computation -->
      <rect x="148" y="40" width="130" height="80" rx="4" fill="#1e293b" stroke="#4ade80"/>
      <text x="213" y="57" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">Stats Computed</text>
      <text x="163" y="72" fill="#94a3b8" font-size="9">numRecords: 1,247,382</text>
      <text x="163" y="85" fill="#94a3b8" font-size="9">minValues:</text>
      <text x="163" y="98" fill="#38bdf8" font-size="9">  event_date: 2024-01-24</text>
      <text x="163" y="111" fill="#94a3b8" font-size="9">maxValues:</text>
      <text x="163" y="124" fill="#38bdf8" font-size="9">  event_date: 2024-01-24</text>
      <!-- Arrow -->
      <line x1="278" y1="80" x2="300" y2="80" stroke="#4ade80" stroke-width="1.5" marker-end="url(#ds-a1)"/>
      <!-- Commit log -->
      <rect x="303" y="35" width="162" height="120" rx="4" fill="#0f172a" stroke="#a855f7"/>
      <text x="384" y="52" text-anchor="middle" fill="#a855f7" font-size="9">commit 0000...0421.json</text>
      <text x="315" y="67" fill="#64748b" font-size="8">{"add": {</text>
      <text x="315" y="79" fill="#38bdf8" font-size="8">  "path": "part-0421.parquet",</text>
      <text x="315" y="91" fill="#38bdf8" font-size="8">  "size": 134217728,</text>
      <text x="315" y="103" fill="#4ade80" font-size="8">  "stats": {</text>
      <text x="315" y="115" fill="#4ade80" font-size="8">    "numRecords": 1247382,</text>
      <text x="315" y="127" fill="#4ade80" font-size="8">    "minValues": {...},</text>
      <text x="315" y="139" fill="#4ade80" font-size="8">    "maxValues": {...}</text>
      <text x="315" y="151" fill="#64748b" font-size="8">  }}}</text>
      <!-- Per-file stats note -->
      <rect x="20" y="175" width="440" height="50" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="240" y="193" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">32-Column Stats Limit</text>
      <text x="240" y="210" text-anchor="middle" fill="#64748b" font-size="9">Delta collects stats for first 32 columns by default. Put high-cardinality filter columns first in the schema.</text>
      <text x="240" y="222" text-anchor="middle" fill="#64748b" font-size="9">MediaStream: (user_id, event_type, event_date, region) placed as columns 1–4 in user_events_silver.</text>
    </svg>`,

    // Step 2: Stats in Commit Log
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Stats Embedded in _delta_log Commit JSON</text>
      <!-- File tree left -->
      <rect x="15" y="35" width="130" height="95" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="80" y="52" text-anchor="middle" fill="#64748b" font-size="9">_delta_log/</text>
      <text x="30" y="67" fill="#a855f7" font-size="9">├─ 0000...0420.json</text>
      <text x="30" y="80" fill="#ff6b35" font-size="9">├─ 0000...0421.json ←</text>
      <text x="30" y="93" fill="#64748b" font-size="9">├─ 0000...0422.json</text>
      <text x="30" y="106" fill="#64748b" font-size="9">└─ 00000000000.checkpoint</text>
      <text x="80" y="120" text-anchor="middle" fill="#64748b" font-size="8">small JSON files, &lt;1MB each</text>
      <!-- JSON detail right -->
      <rect x="160" y="35" width="305" height="180" rx="4" fill="#0f172a" stroke="#ff6b35"/>
      <text x="313" y="52" text-anchor="middle" fill="#ff6b35" font-size="9">0000...0421.json — add action with stats</text>
      <line x1="160" y1="57" x2="465" y2="57" stroke="#334155"/>
      <text x="175" y="72" fill="#64748b" font-size="9">{"add": {</text>
      <text x="175" y="85" fill="#38bdf8" font-size="9">  "path": "date=2024-01-24/region=us-east-1/part-0421.parquet",</text>
      <text x="175" y="98" fill="#94a3b8" font-size="9">  "partitionValues": {"event_date":"2024-01-24","region":"us-east-1"},</text>
      <text x="175" y="111" fill="#94a3b8" font-size="9">  "size": 134217728, "modificationTime": 1706054400000,</text>
      <text x="175" y="124" fill="#4ade80" font-size="9">  "stats": "{</text>
      <text x="175" y="137" fill="#4ade80" font-size="9">    \"numRecords\": 1247382,</text>
      <text x="175" y="150" fill="#4ade80" font-size="9">    \"minValues\": {\"user_id\":\"u_0000001\",\"event_date\":\"2024-01-24\"},</text>
      <text x="175" y="163" fill="#4ade80" font-size="9">    \"maxValues\": {\"user_id\":\"u_9999999\",\"event_date\":\"2024-01-24\"},</text>
      <text x="175" y="176" fill="#4ade80" font-size="9">    \"nullCount\": {\"content_id\": 12847}</text>
      <text x="175" y="189" fill="#4ade80" font-size="9">  }"</text>
      <text x="175" y="202" fill="#64748b" font-size="9">}}</text>
      <!-- Efficiency note -->
      <rect x="15" y="145" width="130" height="70" rx="4" fill="#0a1628" stroke="#38bdf8"/>
      <text x="80" y="162" text-anchor="middle" fill="#38bdf8" font-size="9" font-weight="bold">Query Planning</text>
      <text x="80" y="175" text-anchor="middle" fill="#94a3b8" font-size="8">Spark reads only</text>
      <text x="80" y="187" text-anchor="middle" fill="#94a3b8" font-size="8">_delta_log JSONs</text>
      <text x="80" y="199" text-anchor="middle" fill="#4ade80" font-size="8">No data files opened</text>
      <text x="80" y="211" text-anchor="middle" fill="#4ade80" font-size="8">until plan is built</text>
      <text x="240" y="248" text-anchor="middle" fill="#64748b" font-size="9">_delta_log is ~0.01% the size of data — reading stats costs milliseconds, not minutes</text>
    </svg>`,

    // Step 3: Predicate Pushdown
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Predicate Pushdown — Files That Cannot Match Are Skipped</text>
      <!-- Query -->
      <rect x="15" y="35" width="450" height="30" rx="4" fill="#0f172a" stroke="#38bdf8"/>
      <text x="240" y="55" text-anchor="middle" fill="#38bdf8" font-size="11">WHERE event_date = '2024-01-24'  AND region = 'us-east-1'</text>
      <!-- Files -->
      <text x="240" y="85" text-anchor="middle" fill="#64748b" font-size="10">Evaluating stats for each file in _delta_log:</text>
      <!-- File 1 - skip (different date) -->
      <rect x="15" y="95" width="130" height="65" rx="4" fill="#1c0a0a" stroke="#ef4444"/>
      <text x="80" y="111" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="bold">SKIP ✗</text>
      <text x="80" y="124" text-anchor="middle" fill="#64748b" font-size="8">min_date: 2024-01-20</text>
      <text x="80" y="136" text-anchor="middle" fill="#64748b" font-size="8">max_date: 2024-01-22</text>
      <text x="80" y="148" text-anchor="middle" fill="#ef4444" font-size="8">max &lt; filter → skip</text>
      <text x="80" y="160" text-anchor="middle" fill="#64748b" font-size="8">128 MB saved</text>
      <!-- File 2 - skip (different region) -->
      <rect x="155" y="95" width="130" height="65" rx="4" fill="#1c0a0a" stroke="#ef4444"/>
      <text x="220" y="111" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="bold">SKIP ✗</text>
      <text x="220" y="124" text-anchor="middle" fill="#64748b" font-size="8">date: 2024-01-24 ✓</text>
      <text x="220" y="136" text-anchor="middle" fill="#64748b" font-size="8">region: eu-west-1</text>
      <text x="220" y="148" text-anchor="middle" fill="#ef4444" font-size="8">region ≠ us-east-1 → skip</text>
      <text x="220" y="160" text-anchor="middle" fill="#64748b" font-size="8">128 MB saved</text>
      <!-- File 3 - read -->
      <rect x="295" y="95" width="130" height="65" rx="4" fill="#0a1628" stroke="#4ade80"/>
      <text x="360" y="111" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">READ ✓</text>
      <text x="360" y="124" text-anchor="middle" fill="#4ade80" font-size="8">date: 2024-01-24 ✓</text>
      <text x="360" y="136" text-anchor="middle" fill="#4ade80" font-size="8">region: us-east-1 ✓</text>
      <text x="360" y="148" text-anchor="middle" fill="#94a3b8" font-size="8">stats match — open file</text>
      <text x="360" y="160" text-anchor="middle" fill="#4ade80" font-size="8">2.1 GB total read</text>
      <!-- Summary -->
      <rect x="15" y="175" width="450" height="55" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="240" y="192" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">Skipping Summary for user_events_gold</text>
      <text x="50" y="208" fill="#64748b" font-size="9">Total files: 8,200,000     Skipped by date: 7,640,000 (93.2%)</text>
      <text x="50" y="222" fill="#64748b" font-size="9">Skipped by region: 543,000 (6.6%)     Files actually read: 17,000 (0.2%)</text>
      <text x="240" y="252" text-anchor="middle" fill="#64748b" font-size="9">5 PB total → 2.1 GB read — 99.96% of data skipped by stats evaluation</text>
    </svg>`,

    // Step 4: Z-Order OPTIMIZE
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Z-Order — Co-locate Correlated Columns for Maximum Skipping</text>
      <!-- Before Z-Order -->
      <text x="100" y="42" text-anchor="middle" fill="#ef4444" font-size="10" font-weight="bold">Before OPTIMIZE</text>
      <text x="100" y="55" text-anchor="middle" fill="#64748b" font-size="9">user_id scattered across files</text>
      <rect x="15" y="62" width="40" height="18" rx="2" fill="#334155"/><text x="35" y="75" text-anchor="middle" fill="#94a3b8" font-size="7">A,F,K</text>
      <rect x="60" y="62" width="40" height="18" rx="2" fill="#334155"/><text x="80" y="75" text-anchor="middle" fill="#94a3b8" font-size="7">B,G,L</text>
      <rect x="105" y="62" width="40" height="18" rx="2" fill="#334155"/><text x="125" y="75" text-anchor="middle" fill="#94a3b8" font-size="7">C,H,M</text>
      <rect x="150" y="62" width="40" height="18" rx="2" fill="#334155"/><text x="170" y="75" text-anchor="middle" fill="#94a3b8" font-size="7">D,I,N</text>
      <text x="100" y="95" text-anchor="middle" fill="#ef4444" font-size="9">query user_id='A' → must read ALL files</text>
      <!-- Arrow -->
      <text x="240" y="95" text-anchor="middle" fill="#ff6b35" font-size="11" font-weight="bold">OPTIMIZE</text>
      <text x="240" y="108" text-anchor="middle" fill="#64748b" font-size="9">ZORDER BY</text>
      <text x="240" y="121" text-anchor="middle" fill="#64748b" font-size="9">(user_id,</text>
      <text x="240" y="134" text-anchor="middle" fill="#64748b" font-size="9">event_date)</text>
      <line x1="200" y1="80" x2="215" y2="80" stroke="#ff6b35" stroke-width="1.5" marker-end="url(#ds-ao)"/>
      <defs><marker id="ds-ao" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/></marker></defs>
      <line x1="265" y1="80" x2="275" y2="80" stroke="#ff6b35" stroke-width="1.5" marker-end="url(#ds-ao)"/>
      <!-- After Z-Order -->
      <text x="375" y="42" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">After OPTIMIZE</text>
      <text x="375" y="55" text-anchor="middle" fill="#64748b" font-size="9">user_ids co-located</text>
      <rect x="280" y="62" width="40" height="18" rx="2" fill="#0a1628" stroke="#4ade80"/><text x="300" y="75" text-anchor="middle" fill="#4ade80" font-size="7">A,B,C</text>
      <rect x="325" y="62" width="40" height="18" rx="2" fill="#0a1628" stroke="#4ade80"/><text x="345" y="75" text-anchor="middle" fill="#4ade80" font-size="7">D,E,F</text>
      <rect x="370" y="62" width="40" height="18" rx="2" fill="#334155"/><text x="390" y="75" text-anchor="middle" fill="#64748b" font-size="7">G,H,I</text>
      <rect x="415" y="62" width="40" height="18" rx="2" fill="#334155"/><text x="435" y="75" text-anchor="middle" fill="#64748b" font-size="7">J,K,L</text>
      <text x="375" y="95" text-anchor="middle" fill="#4ade80" font-size="9">query user_id='A' → reads 1 file only</text>
      <!-- Maintenance -->
      <rect x="15" y="118" width="450" height="90" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="240" y="136" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">MediaStream OPTIMIZE Schedule</text>
      <line x1="15" y1="141" x2="465" y2="141" stroke="#334155"/>
      <text x="30" y="156" fill="#38bdf8" font-size="9">user_events_silver:</text>
      <text x="200" y="156" fill="#64748b" font-size="9">OPTIMIZE ZORDER BY (user_id, event_date)  — nightly 02:00 UTC</text>
      <text x="30" y="170" fill="#38bdf8" font-size="9">rec_features_gold:</text>
      <text x="200" y="170" fill="#64748b" font-size="9">OPTIMIZE ZORDER BY (user_id, content_id) — nightly 03:00 UTC</text>
      <text x="30" y="184" fill="#38bdf8" font-size="9">content_metadata:</text>
      <text x="200" y="184" fill="#64748b" font-size="9">OPTIMIZE ZORDER BY (content_id, genre)   — weekly Sunday 04:00 UTC</text>
      <text x="30" y="198" fill="#fbbf24" font-size="9">VACUUM RETAIN 30 DAYS — runs after each OPTIMIZE to clean old small files</text>
      <text x="240" y="235" text-anchor="middle" fill="#64748b" font-size="9">Z-Order is a local sort approximation — improves linearly with file count and query selectivity</text>
    </svg>`,

    // Step 5: MediaStream Results
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <defs>
        <linearGradient id="ds-res" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff6b35"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
      </defs>
      <rect x="15" y="12" width="450" height="30" rx="4" fill="url(#ds-res)"/>
      <text x="240" y="32" text-anchor="middle" fill="white" font-weight="bold" font-size="13">MediaStream Data Skipping — Before vs After</text>
      <!-- Before -->
      <rect x="15" y="55" width="215" height="140" rx="4" fill="#1c0a0a" stroke="#ef4444"/>
      <text x="122" y="73" text-anchor="middle" fill="#ef4444" font-size="12" font-weight="bold">BEFORE</text>
      <line x1="15" y1="78" x2="230" y2="78" stroke="#334155"/>
      <text x="30" y="95" fill="#94a3b8" font-size="10">Data scanned:</text>
      <text x="210" y="95" text-anchor="end" fill="#ef4444" font-size="11" font-weight="bold">5 PB</text>
      <text x="30" y="112" fill="#94a3b8" font-size="10">Query time:</text>
      <text x="210" y="112" text-anchor="end" fill="#ef4444" font-size="11" font-weight="bold">47 min</text>
      <text x="30" y="129" fill="#94a3b8" font-size="10">Files opened:</text>
      <text x="210" y="129" text-anchor="end" fill="#ef4444" font-size="11" font-weight="bold">8.2M</text>
      <text x="30" y="146" fill="#94a3b8" font-size="10">Hourly cost:</text>
      <text x="210" y="146" text-anchor="end" fill="#ef4444" font-size="11" font-weight="bold">$2,400</text>
      <text x="30" y="163" fill="#94a3b8" font-size="10">SLA met:</text>
      <text x="210" y="163" text-anchor="end" fill="#ef4444" font-size="11" font-weight="bold">✗ No</text>
      <text x="30" y="180" fill="#94a3b8" font-size="10">Pipeline runs/day:</text>
      <text x="210" y="180" text-anchor="end" fill="#ef4444" font-size="11" font-weight="bold">1,440</text>
      <!-- After -->
      <rect x="250" y="55" width="215" height="140" rx="4" fill="#0a1628" stroke="#4ade80"/>
      <text x="358" y="73" text-anchor="middle" fill="#4ade80" font-size="12" font-weight="bold">AFTER</text>
      <line x1="250" y1="78" x2="465" y2="78" stroke="#334155"/>
      <text x="265" y="95" fill="#94a3b8" font-size="10">Data scanned:</text>
      <text x="455" y="95" text-anchor="end" fill="#4ade80" font-size="11" font-weight="bold">2.1 GB</text>
      <text x="265" y="112" fill="#94a3b8" font-size="10">Query time:</text>
      <text x="455" y="112" text-anchor="end" fill="#4ade80" font-size="11" font-weight="bold">38 sec</text>
      <text x="265" y="129" fill="#94a3b8" font-size="10">Files opened:</text>
      <text x="455" y="129" text-anchor="end" fill="#4ade80" font-size="11" font-weight="bold">17,000</text>
      <text x="265" y="146" fill="#94a3b8" font-size="10">Hourly cost:</text>
      <text x="455" y="146" text-anchor="end" fill="#4ade80" font-size="11" font-weight="bold">$32</text>
      <text x="265" y="163" fill="#94a3b8" font-size="10">SLA met:</text>
      <text x="455" y="163" text-anchor="end" fill="#4ade80" font-size="11" font-weight="bold">✓ Yes</text>
      <text x="265" y="180" fill="#94a3b8" font-size="10">Pipeline runs/day:</text>
      <text x="455" y="180" text-anchor="end" fill="#4ade80" font-size="11" font-weight="bold">1,440</text>
      <!-- Improvement -->
      <rect x="15" y="210" width="450" height="65" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="240" y="228" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">Improvement Summary</text>
      <text x="80" y="245" text-anchor="middle" fill="#4ade80" font-size="13" font-weight="bold">74×</text>
      <text x="80" y="260" text-anchor="middle" fill="#64748b" font-size="9">faster queries</text>
      <text x="200" y="245" text-anchor="middle" fill="#4ade80" font-size="13" font-weight="bold">99.96%</text>
      <text x="200" y="260" text-anchor="middle" fill="#64748b" font-size="9">data skipped</text>
      <text x="330" y="245" text-anchor="middle" fill="#4ade80" font-size="13" font-weight="bold">$3.47M</text>
      <text x="330" y="260" text-anchor="middle" fill="#64748b" font-size="9">monthly savings</text>
      <text x="430" y="245" text-anchor="middle" fill="#4ade80" font-size="13" font-weight="bold">99.8%</text>
      <text x="430" y="260" text-anchor="middle" fill="#64748b" font-size="9">files skipped</text>
    </svg>`,
  ];

  function _buildDiagram(si) {
    return DIAGRAMS[si] || DIAGRAMS[0];
  }

  function _updateStep(el, si) {
    el.querySelectorAll('.ds-pill').forEach((pill, idx) => {
      pill.classList.toggle('active', idx === si);
      pill.classList.toggle('visited', idx < si);
    });
    const diagram = el.querySelector('#ds-diagram');
    if (diagram) diagram.innerHTML = _buildDiagram(si);
    const s = STEPS[si];
    const t = el.querySelector('#ds-info-title');
    const b = el.querySelector('#ds-info-body');
    const d = el.querySelector('#ds-info-detail');
    if (t) t.textContent = s.label;
    if (b) b.textContent = s.desc;
    if (d) d.textContent = s.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="ds-pill${i === 0 ? ' active' : ''}" data-step="${i}">${s.label}</button>`
    ).join('');

    return `
<style>
.ds-page { display:flex; flex-direction:column; gap:16px; padding:16px; }
.ds-pills { display:flex; flex-wrap:wrap; gap:6px; }
.ds-pill {
  padding:4px 12px; border-radius:20px; border:1px solid var(--border);
  background:var(--surface); color:var(--text-muted); font-size:11px;
  cursor:pointer; transition:all .2s;
}
.ds-pill.active { border-color:var(--delta); color:var(--delta); background:rgba(255,107,53,.1); }
.ds-pill.visited { border-color:var(--border); color:var(--text-muted); opacity:.6; }
.ds-pill:hover { border-color:var(--delta); color:var(--delta); }
.ds-layout { display:grid; grid-template-columns:1fr 280px; gap:16px; }
.ds-diagram-wrap { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:8px; }
.ds-diagram-wrap svg { width:100%; height:auto; }
.ds-info { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:16px; display:flex; flex-direction:column; gap:8px; }
.ds-info-title { font-size:16px; font-weight:600; color:var(--delta); }
.ds-info-body { font-size:13px; color:var(--text); }
.ds-info-detail { font-size:12px; color:var(--text-muted); line-height:1.6; }
.ds-badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:11px; background:rgba(255,107,53,.15); color:var(--delta); border:1px solid rgba(255,107,53,.3); }
@media(max-width:720px){ .ds-layout{ grid-template-columns:1fr; } }
</style>
<div class="ds-page page-enter">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
    <h2 style="font-size:20px;font-weight:700;color:var(--text);margin:0;">Data Skipping &amp; Z-Order</h2>
    <span class="ds-badge">Performance Optimization</span>
    <span style="color:var(--text-muted);font-size:12px;">MediaStream: 5 PB → 2.1 GB scanned — 74× faster recommendation queries</span>
  </div>
  <div class="ds-pills">${pills}</div>
  <div class="ds-layout">
    <div class="ds-diagram-wrap"><div id="ds-diagram">${_buildDiagram(0)}</div></div>
    <div class="ds-info">
      <div class="ds-info-title" id="ds-info-title">${STEPS[0].label}</div>
      <div class="ds-info-body" id="ds-info-body">${STEPS[0].desc}</div>
      <div class="ds-info-detail" id="ds-info-detail">${STEPS[0].detail}</div>
    </div>
  </div>
</div>`;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'ds-page page-enter';
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

    container.querySelectorAll('.ds-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['data-skipping'] = {
    id: 'data-skipping',
    title: 'Data Skipping & Z-Order',
    group: 'Delta Lake Core',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
