(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Feature Store',
      desc: 'What is a Feature Store and why MediaStream needs one',
      detail: 'A Feature Store is a centralized repository for ML features — computed once, served everywhere. MediaStream computes 2,847 features daily (user embeddings, content signals, engagement metrics) and serves them to 14 ML models. Without a feature store, each team recomputed the same features independently, wasting 6.2 CPU-hours/day and causing training-serving skew.',
    },
    {
      label: 'Feature Tables',
      desc: 'Delta Lake tables backing the feature store',
      detail: 'MediaStream feature tables are Delta Lake tables in Unity Catalog under mediastream.features.*. Key tables: user_embeddings (180M rows, 512-dim vectors, 4h refresh), content_embeddings (42M rows, 256-dim, daily), engagement_features (2.4B rows, 1h refresh), demographic_features (180M rows, weekly), realtime_signals (streaming, <5min lag). Total storage: 2.8TB.',
    },
    {
      label: 'User Embeddings',
      desc: 'DLT pipeline computing 512-dimensional user embeddings',
      detail: 'User embedding pipeline: Streaming Table user_watch_agg aggregates 90-day watch history → MV user_preference_vectors trains matrix factorization via MLflow → ST user_embeddings_live serves latest 512-dim vectors. DLT Expectations: embedding_not_null (FAIL), embedding_norm_valid (WARN, 0.8–1.2 range). Freshness SLA: <4 hours. Daily compute: 180M users × 512 dims.',
    },
    {
      label: 'Content Embeddings',
      desc: 'Content feature pipeline with multimodal signals',
      detail: 'Content embedding pipeline ingests 3 signal types: metadata (title, genre, cast — 64 dims), visual (thumbnail CNN features — 128 dims), engagement (CTR, completion rate, ratings — 64 dims). Concatenated into 256-dim content vector. 42M content items. DLT pipeline: ST content_raw → MV content_features_clean → MV content_embeddings_final. Daily batch, 2h compute window.',
    },
    {
      label: 'Freshness SLAs',
      desc: 'Feature freshness requirements per ML model',
      detail: 'Freshness SLAs by feature table: realtime_signals <5min (streaming, served via Delta cache), engagement_features <1h (micro-batch every 30min), user_embeddings <4h (triggered every 3h), content_embeddings <24h (nightly batch), demographic_features <7d (weekly ETL). SLA breach triggers PagerDuty alert. DLT pipeline_monitoring tracks lag per feature table.',
    },
    {
      label: 'Feature Serving',
      desc: 'Online and offline feature serving patterns',
      detail: 'Offline serving (training): Databricks Feature Store API joins features at training time, preventing data leakage via point-in-time lookups. Online serving (inference): Delta Live Cache + Databricks Online Store syncs critical features (user_embeddings, realtime_signals) to Redis with <10ms latency. 14 models consume 2.8B feature lookups/day. Cache hit rate: 94.2%.',
    },
  ];

  const DIAGRAMS = [
    // Step 0: Feature Store concept
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">MEDIASTREAM FEATURE STORE</text>
      <!-- Sources -->
      <rect x="10" y="40" width="90" height="30" rx="4" fill="#1e2030" stroke="#ff6b35" stroke-width="1"/>
      <text x="55" y="59" fill="#e0e0e0" font-size="9" text-anchor="middle">DLT Pipelines</text>
      <rect x="10" y="80" width="90" height="30" rx="4" fill="#1e2030" stroke="#ff6b35" stroke-width="1"/>
      <text x="55" y="99" fill="#e0e0e0" font-size="9" text-anchor="middle">Kafka Streams</text>
      <rect x="10" y="120" width="90" height="30" rx="4" fill="#1e2030" stroke="#ff6b35" stroke-width="1"/>
      <text x="55" y="139" fill="#e0e0e0" font-size="9" text-anchor="middle">Batch ETL</text>
      <!-- Arrows to store -->
      <line x1="100" y1="55" x2="150" y2="100" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="100" y1="95" x2="150" y2="105" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="100" y1="135" x2="150" y2="115" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>
      <!-- Feature Store box -->
      <rect x="150" y="60" width="160" height="90" rx="6" fill="#1e2030" stroke="#ff6b35" stroke-width="2"/>
      <text x="230" y="82" fill="#ff6b35" font-size="10" text-anchor="middle" font-weight="bold">FEATURE STORE</text>
      <text x="230" y="98" fill="#a0a0a0" font-size="8" text-anchor="middle">2,847 features</text>
      <text x="230" y="112" fill="#a0a0a0" font-size="8" text-anchor="middle">Unity Catalog backed</text>
      <text x="230" y="126" fill="#a0a0a0" font-size="8" text-anchor="middle">14 ML models served</text>
      <text x="230" y="140" fill="#a0a0a0" font-size="8" text-anchor="middle">2.8TB storage</text>
      <!-- Consumers -->
      <rect x="355" y="40" width="110" height="25" rx="4" fill="#1e2030" stroke="#a855f7" stroke-width="1"/>
      <text x="410" y="57" fill="#e0e0e0" font-size="9" text-anchor="middle">Rec Engine</text>
      <rect x="355" y="75" width="110" height="25" rx="4" fill="#1e2030" stroke="#a855f7" stroke-width="1"/>
      <text x="410" y="92" fill="#e0e0e0" font-size="9" text-anchor="middle">Churn Model</text>
      <rect x="355" y="110" width="110" height="25" rx="4" fill="#1e2030" stroke="#a855f7" stroke-width="1"/>
      <text x="410" y="127" fill="#e0e0e0" font-size="9" text-anchor="middle">Ad Targeting</text>
      <rect x="355" y="145" width="110" height="25" rx="4" fill="#1e2030" stroke="#a855f7" stroke-width="1"/>
      <text x="410" y="162" fill="#e0e0e0" font-size="9" text-anchor="middle">+11 more models</text>
      <line x1="310" y1="95" x2="355" y2="53" stroke="#a855f7" stroke-width="1" marker-end="url(#arr2)"/>
      <line x1="310" y1="100" x2="355" y2="88" stroke="#a855f7" stroke-width="1" marker-end="url(#arr2)"/>
      <line x1="310" y1="105" x2="355" y2="123" stroke="#a855f7" stroke-width="1" marker-end="url(#arr2)"/>
      <line x1="310" y1="110" x2="355" y2="158" stroke="#a855f7" stroke-width="1" marker-end="url(#arr2)"/>
      <!-- Benefits -->
      <rect x="10" y="195" width="460" height="90" rx="6" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="213" fill="#ff6b35" font-size="10" text-anchor="middle" font-weight="bold">WITHOUT vs WITH FEATURE STORE</text>
      <text x="120" y="232" fill="#ef4444" font-size="9" text-anchor="middle">WITHOUT</text>
      <text x="350" y="232" fill="#22c55e" font-size="9" text-anchor="middle">WITH</text>
      <line x1="240" y1="220" x2="240" y2="278" stroke="#333" stroke-width="1"/>
      <text x="120" y="248" fill="#a0a0a0" font-size="8" text-anchor="middle">14 teams recompute</text>
      <text x="350" y="248" fill="#a0a0a0" font-size="8" text-anchor="middle">Compute once, share</text>
      <text x="120" y="262" fill="#a0a0a0" font-size="8" text-anchor="middle">Training-serving skew</text>
      <text x="350" y="262" fill="#a0a0a0" font-size="8" text-anchor="middle">Point-in-time joins</text>
      <text x="120" y="276" fill="#a0a0a0" font-size="8" text-anchor="middle">6.2 CPU-hrs wasted/day</text>
      <text x="350" y="276" fill="#a0a0a0" font-size="8" text-anchor="middle">94.2% cache hit rate</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
        <marker id="arr2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#a855f7"/>
        </marker>
      </defs>
    </svg>`,

    // Step 1: Feature Tables
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">FEATURE TABLES — mediastream.features.*</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- Table rows -->
      <rect x="10" y="35" width="460" height="22" rx="3" fill="#ff6b35" fill-opacity="0.15"/>
      <text x="16" y="51" fill="#ff6b35" font-size="9" font-weight="bold">TABLE</text>
      <text x="180" y="51" fill="#ff6b35" font-size="9" font-weight="bold">ROWS</text>
      <text x="250" y="51" fill="#ff6b35" font-size="9" font-weight="bold">DIMS</text>
      <text x="310" y="51" fill="#ff6b35" font-size="9" font-weight="bold">REFRESH</text>
      <text x="395" y="51" fill="#ff6b35" font-size="9" font-weight="bold">SIZE</text>

      <rect x="10" y="58" width="460" height="20" rx="2" fill="#1a1d2e"/>
      <text x="16" y="73" fill="#e0e0e0" font-size="9">user_embeddings</text>
      <text x="180" y="73" fill="#a0a0a0" font-size="9">180M</text>
      <text x="250" y="73" fill="#a0a0a0" font-size="9">512</text>
      <text x="310" y="73" fill="#22c55e" font-size="9">4 hours</text>
      <text x="395" y="73" fill="#a0a0a0" font-size="9">1.1TB</text>

      <rect x="10" y="79" width="460" height="20" rx="2" fill="#12141f"/>
      <text x="16" y="94" fill="#e0e0e0" font-size="9">content_embeddings</text>
      <text x="180" y="94" fill="#a0a0a0" font-size="9">42M</text>
      <text x="250" y="94" fill="#a0a0a0" font-size="9">256</text>
      <text x="310" y="94" fill="#22c55e" font-size="9">24 hours</text>
      <text x="395" y="94" fill="#a0a0a0" font-size="9">380GB</text>

      <rect x="10" y="100" width="460" height="20" rx="2" fill="#1a1d2e"/>
      <text x="16" y="115" fill="#e0e0e0" font-size="9">engagement_features</text>
      <text x="180" y="115" fill="#a0a0a0" font-size="9">2.4B</text>
      <text x="250" y="115" fill="#a0a0a0" font-size="9">48</text>
      <text x="310" y="115" fill="#22c55e" font-size="9">1 hour</text>
      <text x="395" y="115" fill="#a0a0a0" font-size="9">820GB</text>

      <rect x="10" y="121" width="460" height="20" rx="2" fill="#12141f"/>
      <text x="16" y="136" fill="#e0e0e0" font-size="9">demographic_features</text>
      <text x="180" y="136" fill="#a0a0a0" font-size="9">180M</text>
      <text x="250" y="136" fill="#a0a0a0" font-size="9">32</text>
      <text x="310" y="136" fill="#a0a0a0" font-size="9">7 days</text>
      <text x="395" y="136" fill="#a0a0a0" font-size="9">95GB</text>

      <rect x="10" y="142" width="460" height="20" rx="2" fill="#1a1d2e"/>
      <text x="16" y="157" fill="#e0e0e0" font-size="9">realtime_signals</text>
      <text x="180" y="157" fill="#a0a0a0" font-size="9">streaming</text>
      <text x="250" y="157" fill="#a0a0a0" font-size="9">24</text>
      <text x="310" y="157" fill="#ef4444" font-size="9">&lt;5 min</text>
      <text x="395" y="157" fill="#a0a0a0" font-size="9">420GB</text>

      <!-- Total -->
      <rect x="10" y="165" width="460" height="20" rx="2" fill="#ff6b35" fill-opacity="0.1" stroke="#ff6b35" stroke-width="0.5"/>
      <text x="16" y="180" fill="#ff6b35" font-size="9" font-weight="bold">TOTAL</text>
      <text x="395" y="180" fill="#ff6b35" font-size="9" font-weight="bold">2.8TB</text>

      <!-- UC catalog path -->
      <rect x="10" y="198" width="460" height="90" rx="6" fill="#1e2030" stroke="#a855f7" stroke-width="1"/>
      <text x="240" y="216" fill="#a855f7" font-size="9" text-anchor="middle" font-weight="bold">UNITY CATALOG PATH</text>
      <text x="240" y="234" fill="#e0e0e0" font-size="10" text-anchor="middle">mediastream.features.user_embeddings</text>
      <text x="50" y="252" fill="#a0a0a0" font-size="8" text-anchor="middle">CATALOG</text>
      <text x="190" y="252" fill="#a0a0a0" font-size="8" text-anchor="middle">SCHEMA</text>
      <text x="360" y="252" fill="#a0a0a0" font-size="8" text-anchor="middle">TABLE</text>
      <rect x="20" y="257" width="60" height="22" rx="3" fill="#ff6b35" fill-opacity="0.2"/>
      <text x="50" y="272" fill="#ff6b35" font-size="9" text-anchor="middle">mediastream</text>
      <rect x="150" y="257" width="70" height="22" rx="3" fill="#ff6b35" fill-opacity="0.2"/>
      <text x="185" y="272" fill="#ff6b35" font-size="9" text-anchor="middle">features</text>
      <rect x="280" y="257" width="160" height="22" rx="3" fill="#ff6b35" fill-opacity="0.2"/>
      <text x="360" y="272" fill="#ff6b35" font-size="9" text-anchor="middle">user_embeddings</text>
    </svg>`,

    // Step 2: User Embeddings pipeline
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">USER EMBEDDINGS DLT PIPELINE</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- Stage 1 -->
      <rect x="10" y="40" width="130" height="60" rx="5" fill="#1e2030" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="75" y="57" fill="#ff6b35" font-size="8" text-anchor="middle" font-weight="bold">ST</text>
      <text x="75" y="70" fill="#e0e0e0" font-size="8" text-anchor="middle">user_watch_agg</text>
      <text x="75" y="84" fill="#a0a0a0" font-size="7" text-anchor="middle">90-day watch history</text>
      <text x="75" y="96" fill="#a0a0a0" font-size="7" text-anchor="middle">Streaming Table</text>
      <!-- Stage 2 -->
      <rect x="175" y="40" width="130" height="60" rx="5" fill="#1e2030" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="240" y="57" fill="#ff6b35" font-size="8" text-anchor="middle" font-weight="bold">MV</text>
      <text x="240" y="70" fill="#e0e0e0" font-size="8" text-anchor="middle">user_preference_vectors</text>
      <text x="240" y="84" fill="#a0a0a0" font-size="7" text-anchor="middle">Matrix factorization</text>
      <text x="240" y="96" fill="#a0a0a0" font-size="7" text-anchor="middle">MLflow training</text>
      <!-- Stage 3 -->
      <rect x="340" y="40" width="130" height="60" rx="5" fill="#1e2030" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="405" y="57" fill="#ff6b35" font-size="8" text-anchor="middle" font-weight="bold">ST</text>
      <text x="405" y="70" fill="#e0e0e0" font-size="8" text-anchor="middle">user_embeddings_live</text>
      <text x="405" y="84" fill="#a0a0a0" font-size="7" text-anchor="middle">512-dim vectors</text>
      <text x="405" y="96" fill="#a0a0a0" font-size="7" text-anchor="middle">180M users</text>
      <!-- Arrows -->
      <line x1="140" y1="70" x2="175" y2="70" stroke="#ff6b35" stroke-width="1.5" marker-end="url(#arr)"/>
      <line x1="305" y1="70" x2="340" y2="70" stroke="#ff6b35" stroke-width="1.5" marker-end="url(#arr)"/>
      <!-- Expectations -->
      <rect x="10" y="120" width="460" height="80" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="138" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">DLT EXPECTATIONS</text>
      <rect x="20" y="148" width="200" height="42" rx="4" fill="#ef4444" fill-opacity="0.1" stroke="#ef4444" stroke-width="1"/>
      <text x="120" y="165" fill="#ef4444" font-size="8" text-anchor="middle" font-weight="bold">FAIL — embedding_not_null</text>
      <text x="120" y="180" fill="#a0a0a0" font-size="8" text-anchor="middle">embedding IS NOT NULL</text>
      <text x="120" y="192" fill="#a0a0a0" font-size="7" text-anchor="middle">Pipeline halts if violated</text>
      <rect x="250" y="148" width="210" height="42" rx="4" fill="#f59e0b" fill-opacity="0.1" stroke="#f59e0b" stroke-width="1"/>
      <text x="355" y="165" fill="#f59e0b" font-size="8" text-anchor="middle" font-weight="bold">WARN — embedding_norm_valid</text>
      <text x="355" y="180" fill="#a0a0a0" font-size="8" text-anchor="middle">norm BETWEEN 0.8 AND 1.2</text>
      <text x="355" y="192" fill="#a0a0a0" font-size="7" text-anchor="middle">Alert if outside range, proceed</text>
      <!-- Metrics -->
      <rect x="10" y="215" width="460" height="72" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="233" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">PIPELINE METRICS</text>
      <text x="80" y="252" fill="#e0e0e0" font-size="9" text-anchor="middle">180M users</text>
      <text x="80" y="266" fill="#a0a0a0" font-size="8" text-anchor="middle">processed daily</text>
      <text x="200" y="252" fill="#e0e0e0" font-size="9" text-anchor="middle">512 dims</text>
      <text x="200" y="266" fill="#a0a0a0" font-size="8" text-anchor="middle">per user</text>
      <text x="310" y="252" fill="#e0e0e0" font-size="9" text-anchor="middle">&lt;4h SLA</text>
      <text x="310" y="266" fill="#a0a0a0" font-size="8" text-anchor="middle">freshness</text>
      <text x="415" y="252" fill="#e0e0e0" font-size="9" text-anchor="middle">1.1TB</text>
      <text x="415" y="266" fill="#a0a0a0" font-size="8" text-anchor="middle">storage</text>
      <line x1="140" y1="242" x2="140" y2="278" stroke="#333" stroke-width="0.5"/>
      <line x1="260" y1="242" x2="260" y2="278" stroke="#333" stroke-width="0.5"/>
      <line x1="370" y1="242" x2="370" y2="278" stroke="#333" stroke-width="0.5"/>
    </svg>`,

    // Step 3: Content embeddings
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">CONTENT EMBEDDINGS — MULTIMODAL SIGNALS</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- 3 signal types -->
      <rect x="10" y="40" width="130" height="70" rx="5" fill="#1e2030" stroke="#a855f7" stroke-width="1.5"/>
      <text x="75" y="58" fill="#a855f7" font-size="8" text-anchor="middle" font-weight="bold">METADATA</text>
      <text x="75" y="72" fill="#a0a0a0" font-size="8" text-anchor="middle">title, genre, cast</text>
      <text x="75" y="86" fill="#a0a0a0" font-size="8" text-anchor="middle">year, language</text>
      <text x="75" y="100" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">64 dims</text>

      <rect x="175" y="40" width="130" height="70" rx="5" fill="#1e2030" stroke="#a855f7" stroke-width="1.5"/>
      <text x="240" y="58" fill="#a855f7" font-size="8" text-anchor="middle" font-weight="bold">VISUAL</text>
      <text x="240" y="72" fill="#a0a0a0" font-size="8" text-anchor="middle">thumbnail CNN</text>
      <text x="240" y="86" fill="#a0a0a0" font-size="8" text-anchor="middle">scene embeddings</text>
      <text x="240" y="100" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">128 dims</text>

      <rect x="340" y="40" width="130" height="70" rx="5" fill="#1e2030" stroke="#a855f7" stroke-width="1.5"/>
      <text x="405" y="58" fill="#a855f7" font-size="8" text-anchor="middle" font-weight="bold">ENGAGEMENT</text>
      <text x="405" y="72" fill="#a0a0a0" font-size="8" text-anchor="middle">CTR, completion</text>
      <text x="405" y="86" fill="#a0a0a0" font-size="8" text-anchor="middle">ratings, shares</text>
      <text x="405" y="100" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">64 dims</text>

      <!-- Concat arrow -->
      <line x1="75" y1="110" x2="220" y2="148" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="240" y1="110" x2="240" y2="148" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="405" y1="110" x2="265" y2="148" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>

      <!-- Final embedding -->
      <rect x="155" y="150" width="170" height="50" rx="5" fill="#ff6b35" fill-opacity="0.15" stroke="#ff6b35" stroke-width="2"/>
      <text x="240" y="170" fill="#ff6b35" font-size="10" text-anchor="middle" font-weight="bold">CONCATENATE</text>
      <text x="240" y="188" fill="#e0e0e0" font-size="10" text-anchor="middle">256-dim content vector</text>

      <!-- DLT pipeline -->
      <rect x="10" y="220" width="460" height="70" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="238" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">DLT PIPELINE — 42M CONTENT ITEMS</text>
      <!-- Mini pipeline -->
      <rect x="20" y="248" width="100" height="32" rx="3" fill="#0f1117" stroke="#ff6b35" stroke-width="1"/>
      <text x="70" y="261" fill="#ff6b35" font-size="7" text-anchor="middle">ST</text>
      <text x="70" y="273" fill="#a0a0a0" font-size="7" text-anchor="middle">content_raw</text>
      <rect x="145" y="248" width="120" height="32" rx="3" fill="#0f1117" stroke="#ff6b35" stroke-width="1"/>
      <text x="205" y="261" fill="#ff6b35" font-size="7" text-anchor="middle">MV</text>
      <text x="205" y="273" fill="#a0a0a0" font-size="7" text-anchor="middle">content_features_clean</text>
      <rect x="290" y="248" width="160" height="32" rx="3" fill="#0f1117" stroke="#ff6b35" stroke-width="1"/>
      <text x="370" y="261" fill="#ff6b35" font-size="7" text-anchor="middle">MV</text>
      <text x="370" y="273" fill="#a0a0a0" font-size="7" text-anchor="middle">content_embeddings_final</text>
      <line x1="120" y1="264" x2="145" y2="264" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="265" y1="264" x2="290" y2="264" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>
    </svg>`,

    // Step 4: Freshness SLAs
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">FEATURE FRESHNESS SLAs</text>
      <!-- Timeline bar -->
      <line x1="20" y1="52" x2="460" y2="52" stroke="#333" stroke-width="1"/>
      <text x="20" y="46" fill="#a0a0a0" font-size="8">now</text>
      <text x="120" y="46" fill="#a0a0a0" font-size="8">5min</text>
      <text x="200" y="46" fill="#a0a0a0" font-size="8">1h</text>
      <text x="280" y="46" fill="#a0a0a0" font-size="8">4h</text>
      <text x="365" y="46" fill="#a0a0a0" font-size="8">24h</text>
      <text x="430" y="46" fill="#a0a0a0" font-size="8">7d</text>
      <line x1="120" y1="48" x2="120" y2="56" stroke="#333" stroke-width="1"/>
      <line x1="200" y1="48" x2="200" y2="56" stroke="#333" stroke-width="1"/>
      <line x1="280" y1="48" x2="280" y2="56" stroke="#333" stroke-width="1"/>
      <line x1="365" y1="48" x2="365" y2="56" stroke="#333" stroke-width="1"/>
      <line x1="430" y1="48" x2="430" y2="56" stroke="#333" stroke-width="1"/>
      <!-- SLA bars -->
      <rect x="20" y="62" width="100" height="28" rx="3" fill="#ef4444" fill-opacity="0.8"/>
      <text x="70" y="79" fill="#fff" font-size="8" text-anchor="middle" font-weight="bold">realtime_signals</text>
      <rect x="20" y="100" width="180" height="28" rx="3" fill="#f59e0b" fill-opacity="0.8"/>
      <text x="110" y="117" fill="#fff" font-size="8" text-anchor="middle" font-weight="bold">engagement_features</text>
      <rect x="20" y="138" width="260" height="28" rx="3" fill="#22c55e" fill-opacity="0.7"/>
      <text x="150" y="155" fill="#fff" font-size="8" text-anchor="middle" font-weight="bold">user_embeddings</text>
      <rect x="20" y="176" width="345" height="28" rx="3" fill="#3b82f6" fill-opacity="0.7"/>
      <text x="192" y="193" fill="#fff" font-size="8" text-anchor="middle" font-weight="bold">content_embeddings</text>
      <rect x="20" y="214" width="410" height="28" rx="3" fill="#a855f7" fill-opacity="0.7"/>
      <text x="225" y="231" fill="#fff" font-size="8" text-anchor="middle" font-weight="bold">demographic_features</text>
      <!-- Labels -->
      <text x="125" y="79" fill="#ef4444" font-size="8">&lt;5min</text>
      <text x="205" y="117" fill="#f59e0b" font-size="8">&lt;1h</text>
      <text x="285" y="155" fill="#22c55e" font-size="8">&lt;4h</text>
      <text x="370" y="193" fill="#3b82f6" font-size="8">&lt;24h</text>
      <text x="435" y="231" fill="#a855f7" font-size="8">&lt;7d</text>
      <!-- Alerting box -->
      <rect x="10" y="256" width="460" height="36" rx="4" fill="#1e2030" stroke="#ff6b35" stroke-width="1"/>
      <text x="240" y="271" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">SLA BREACH → PagerDuty Alert (P2 for &gt;2× SLA, P1 for &gt;4× SLA)</text>
      <text x="240" y="285" fill="#a0a0a0" font-size="8" text-anchor="middle">DLT pipeline_monitoring tracks lag per feature table in real-time</text>
    </svg>`,

    // Step 5: Feature Serving
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">FEATURE SERVING — OFFLINE &amp; ONLINE</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- Offline -->
      <rect x="10" y="35" width="220" height="120" rx="5" fill="#1e2030" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="120" y="53" fill="#3b82f6" font-size="9" text-anchor="middle" font-weight="bold">OFFLINE SERVING (Training)</text>
      <rect x="20" y="60" width="200" height="30" rx="3" fill="#0f1117"/>
      <text x="120" y="75" fill="#a0a0a0" font-size="8" text-anchor="middle">Databricks Feature Store API</text>
      <text x="120" y="87" fill="#e0e0e0" font-size="8" text-anchor="middle">Point-in-time joins</text>
      <text x="120" y="108" fill="#22c55e" font-size="8" text-anchor="middle">No data leakage</text>
      <text x="120" y="122" fill="#a0a0a0" font-size="8" text-anchor="middle">Training datasets materialized</text>
      <text x="120" y="136" fill="#a0a0a0" font-size="8" text-anchor="middle">as Delta tables</text>
      <!-- Online -->
      <rect x="250" y="35" width="220" height="120" rx="5" fill="#1e2030" stroke="#ef4444" stroke-width="1.5"/>
      <text x="360" y="53" fill="#ef4444" font-size="9" text-anchor="middle" font-weight="bold">ONLINE SERVING (Inference)</text>
      <rect x="260" y="60" width="200" height="30" rx="3" fill="#0f1117"/>
      <text x="360" y="75" fill="#a0a0a0" font-size="8" text-anchor="middle">Delta Live Cache + Redis</text>
      <text x="360" y="87" fill="#e0e0e0" font-size="8" text-anchor="middle">&lt;10ms latency</text>
      <text x="360" y="108" fill="#22c55e" font-size="8" text-anchor="middle">94.2% cache hit rate</text>
      <text x="360" y="122" fill="#a0a0a0" font-size="8" text-anchor="middle">user_embeddings &amp; realtime</text>
      <text x="360" y="136" fill="#a0a0a0" font-size="8" text-anchor="middle">signals synced to Redis</text>
      <!-- Delta Lake store -->
      <rect x="155" y="175" width="170" height="40" rx="5" fill="#ff6b35" fill-opacity="0.15" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="240" y="193" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">Delta Lake Feature Tables</text>
      <text x="240" y="208" fill="#a0a0a0" font-size="8" text-anchor="middle">mediastream.features.*</text>
      <line x1="120" y1="155" x2="200" y2="175" stroke="#3b82f6" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="360" y1="155" x2="285" y2="175" stroke="#ef4444" stroke-width="1" marker-end="url(#arr)"/>
      <!-- Scale metrics -->
      <rect x="10" y="228" width="460" height="60" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="246" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">SERVING SCALE</text>
      <text x="90" y="264" fill="#e0e0e0" font-size="10" text-anchor="middle">14 models</text>
      <text x="90" y="278" fill="#a0a0a0" font-size="8" text-anchor="middle">consuming</text>
      <text x="215" y="264" fill="#e0e0e0" font-size="10" text-anchor="middle">2.8B</text>
      <text x="215" y="278" fill="#a0a0a0" font-size="8" text-anchor="middle">lookups/day</text>
      <text x="340" y="264" fill="#e0e0e0" font-size="10" text-anchor="middle">&lt;10ms</text>
      <text x="340" y="278" fill="#a0a0a0" font-size="8" text-anchor="middle">p99 latency</text>
      <text x="430" y="264" fill="#e0e0e0" font-size="10" text-anchor="middle">94.2%</text>
      <text x="430" y="278" fill="#a0a0a0" font-size="8" text-anchor="middle">cache hits</text>
      <line x1="155" y1="252" x2="155" y2="282" stroke="#333" stroke-width="0.5"/>
      <line x1="280" y1="252" x2="280" y2="282" stroke="#333" stroke-width="0.5"/>
      <line x1="390" y1="252" x2="390" y2="282" stroke="#333" stroke-width="0.5"/>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.mf-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.mf-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.mf-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="mf-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="mf-header module-header">
        <div class="module-tag" style="background:var(--delta)">DLT PIPELINES</div>
        <h2 class="module-title">ML Feature Store</h2>
        <p class="module-subtitle">Delta Lake–backed feature tables powering 14 ML models at MediaStream</p>
      </div>
      <div class="mf-pills step-pills">${pills}</div>
      <div class="mf-diagram diagram-frame"></div>
      <div class="mf-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'mf-page page-enter';
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
    container.querySelectorAll('.mf-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['ml-features'] = {
    id: 'ml-features',
    title: 'ML Feature Store',
    group: 'DLT Pipelines',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
