(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'System Overview',
      desc: 'MediaStream two-tower recommendation architecture',
      detail: 'MediaStream recommendation engine serves 180M subscribers using a two-tower neural network: a user tower (512-dim embeddings) and a content tower (256-dim embeddings). Two-stage architecture: candidate retrieval (ANN search, top-1000 from 42M) → ranking (LightGBM, top-50 → top-10 final). Daily training on 2.4B events via DLT pipelines. P50 recommendation latency: 45ms.',
    },
    {
      label: 'Retrieval Stage',
      desc: 'Approximate Nearest Neighbor retrieval from 42M content items',
      detail: 'Candidate retrieval: user embedding (512-dim) × content embedding matrix (42M × 256-dim) via FAISS ANN index. Top-1000 candidates returned in <15ms. Index rebuilt daily from content_embeddings_final Delta table. HNSW graph index, ef=200, M=32. Parallel shards: 12 shards × 3.5M items each. Index size: 42GB RAM per shard.',
    },
    {
      label: 'Ranking Stage',
      desc: 'LightGBM ranker with 847 features per candidate',
      detail: 'Ranking model: LightGBM gradient boosting with 847 input features per candidate. Feature sources: user features (engagement_features, demographic_features, user_embeddings), content features (content_embeddings, content_metadata), context features (time_of_day, device, session_length). Output: relevance score → top-50 → diversity filter → top-10. Trained daily on last 90 days, 4.2B training examples.',
    },
    {
      label: 'Collab Filtering',
      desc: 'Collaborative filtering signals in DLT',
      detail: 'Collaborative filtering via implicit feedback ALS (Alternating Least Squares). DLT pipeline: ST user_item_interactions → MV als_user_factors (180M × 128) → MV als_item_factors (42M × 128). Negative sampling: 5 negatives per positive, sampled from non-interacted popular items. Cold start: content-based fallback for users < 10 interactions (22M users). Training: Spark MLlib ALS, 50 iterations.',
    },
    {
      label: 'A/B Testing',
      desc: 'Experiment tracking with Delta Lake for recommendation variants',
      detail: 'A/B test infrastructure: experiments table (mediastream.experiments.ab_assignments) maps user_id → variant. Current active experiments: 8 concurrent tests. Each experiment stores recommendation outputs in separate Gold MVs. Results tracked in mediastream.experiments.results Delta table with SCD Type 1. Winning variant promoted after 7 days + statistical significance (p<0.05, min 500K users per variant).',
    },
    {
      label: 'Serving Latency',
      desc: 'End-to-end latency budget for real-time recommendations',
      detail: 'Latency budget breakdown: feature lookup Redis <10ms, FAISS retrieval <15ms, LightGBM ranking <12ms, diversity filter <3ms, result serialization <5ms. Total P50: 45ms, P95: 85ms, P99: 140ms. SLA: <200ms P99. Cache: precomputed recommendations for top 20M active users (24h TTL, Redis). Cache hit rate: 67.3%. Fallback on timeout: editorial top-50 by segment.',
    },
  ];

  const DIAGRAMS = [
    // Step 0: System overview
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">TWO-TOWER RECOMMENDATION SYSTEM</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- User tower -->
      <rect x="15" y="40" width="130" height="80" rx="5" fill="#1e2030" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="80" y="60" fill="#3b82f6" font-size="9" text-anchor="middle" font-weight="bold">USER TOWER</text>
      <text x="80" y="76" fill="#a0a0a0" font-size="8" text-anchor="middle">180M users</text>
      <text x="80" y="90" fill="#e0e0e0" font-size="9" text-anchor="middle">512-dim embedding</text>
      <text x="80" y="106" fill="#a0a0a0" font-size="8" text-anchor="middle">DLT: user_embeddings</text>
      <!-- Content tower -->
      <rect x="335" y="40" width="130" height="80" rx="5" fill="#1e2030" stroke="#a855f7" stroke-width="1.5"/>
      <text x="400" y="60" fill="#a855f7" font-size="9" text-anchor="middle" font-weight="bold">CONTENT TOWER</text>
      <text x="400" y="76" fill="#a0a0a0" font-size="8" text-anchor="middle">42M items</text>
      <text x="400" y="90" fill="#e0e0e0" font-size="9" text-anchor="middle">256-dim embedding</text>
      <text x="400" y="106" fill="#a0a0a0" font-size="8" text-anchor="middle">DLT: content_embeddings</text>
      <!-- Retrieval -->
      <rect x="155" y="50" width="170" height="55" rx="5" fill="#1e2030" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="240" y="70" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">STAGE 1: RETRIEVAL</text>
      <text x="240" y="85" fill="#a0a0a0" font-size="8" text-anchor="middle">ANN Search (FAISS)</text>
      <text x="240" y="98" fill="#e0e0e0" font-size="8" text-anchor="middle">42M → top-1000</text>
      <line x1="145" y1="80" x2="155" y2="80" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arr)"/>
      <line x1="335" y1="80" x2="325" y2="80" stroke="#a855f7" stroke-width="1.5" marker-end="url(#arr)"/>
      <!-- Ranking -->
      <rect x="155" y="125" width="170" height="55" rx="5" fill="#1e2030" stroke="#22c55e" stroke-width="1.5"/>
      <text x="240" y="145" fill="#22c55e" font-size="9" text-anchor="middle" font-weight="bold">STAGE 2: RANKING</text>
      <text x="240" y="160" fill="#a0a0a0" font-size="8" text-anchor="middle">LightGBM (847 features)</text>
      <text x="240" y="172" fill="#e0e0e0" font-size="8" text-anchor="middle">top-1000 → top-50</text>
      <line x1="240" y1="105" x2="240" y2="125" stroke="#ff6b35" stroke-width="1.5" marker-end="url(#arr)"/>
      <!-- Diversity -->
      <rect x="185" y="200" width="110" height="35" rx="5" fill="#1e2030" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="240" y="217" fill="#f59e0b" font-size="8" text-anchor="middle" font-weight="bold">DIVERSITY FILTER</text>
      <text x="240" y="229" fill="#a0a0a0" font-size="8" text-anchor="middle">top-50 → top-10</text>
      <line x1="240" y1="180" x2="240" y2="200" stroke="#22c55e" stroke-width="1.5" marker-end="url(#arr)"/>
      <!-- Metrics -->
      <rect x="10" y="250" width="460" height="40" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="90" y="267" fill="#e0e0e0" font-size="9" text-anchor="middle">180M users</text>
      <text x="90" y="280" fill="#a0a0a0" font-size="8" text-anchor="middle">served daily</text>
      <text x="215" y="267" fill="#e0e0e0" font-size="9" text-anchor="middle">45ms P50</text>
      <text x="215" y="280" fill="#a0a0a0" font-size="8" text-anchor="middle">latency</text>
      <text x="330" y="267" fill="#e0e0e0" font-size="9" text-anchor="middle">2.4B events</text>
      <text x="330" y="280" fill="#a0a0a0" font-size="8" text-anchor="middle">trained on</text>
      <text x="430" y="267" fill="#e0e0e0" font-size="9" text-anchor="middle">90-day</text>
      <text x="430" y="280" fill="#a0a0a0" font-size="8" text-anchor="middle">window</text>
      <line x1="155" y1="258" x2="155" y2="284" stroke="#333" stroke-width="0.5"/>
      <line x1="275" y1="258" x2="275" y2="284" stroke="#333" stroke-width="0.5"/>
      <line x1="380" y1="258" x2="380" y2="284" stroke="#333" stroke-width="0.5"/>
    </svg>`,

    // Step 1: Retrieval
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">ANN RETRIEVAL — FAISS INDEX</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- User query -->
      <rect x="15" y="40" width="100" height="50" rx="4" fill="#1e2030" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="65" y="60" fill="#3b82f6" font-size="8" text-anchor="middle" font-weight="bold">USER QUERY</text>
      <text x="65" y="75" fill="#e0e0e0" font-size="8" text-anchor="middle">512-dim vector</text>
      <text x="65" y="87" fill="#a0a0a0" font-size="8" text-anchor="middle">from Redis</text>
      <!-- FAISS index -->
      <rect x="150" y="30" width="200" height="130" rx="5" fill="#1e2030" stroke="#ff6b35" stroke-width="2"/>
      <text x="250" y="52" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">FAISS HNSW INDEX</text>
      <text x="250" y="68" fill="#a0a0a0" font-size="8" text-anchor="middle">42M items × 256-dim</text>
      <text x="250" y="82" fill="#a0a0a0" font-size="8" text-anchor="middle">12 shards × 3.5M items</text>
      <text x="250" y="96" fill="#a0a0a0" font-size="8" text-anchor="middle">HNSW: ef=200, M=32</text>
      <text x="250" y="110" fill="#a0a0a0" font-size="8" text-anchor="middle">42GB RAM per shard</text>
      <text x="250" y="124" fill="#22c55e" font-size="8" text-anchor="middle">rebuilt daily from Delta</text>
      <text x="250" y="138" fill="#22c55e" font-size="8" text-anchor="middle">content_embeddings_final</text>
      <!-- Result -->
      <rect x="385" y="40" width="85" height="50" rx="4" fill="#1e2030" stroke="#22c55e" stroke-width="1.5"/>
      <text x="427" y="58" fill="#22c55e" font-size="8" text-anchor="middle" font-weight="bold">TOP-1000</text>
      <text x="427" y="72" fill="#e0e0e0" font-size="8" text-anchor="middle">candidates</text>
      <text x="427" y="85" fill="#a0a0a0" font-size="8" text-anchor="middle">&lt;15ms</text>
      <line x1="115" y1="65" x2="150" y2="80" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arr)"/>
      <line x1="350" y1="80" x2="385" y2="65" stroke="#ff6b35" stroke-width="1.5" marker-end="url(#arr)"/>
      <!-- Delta rebuild -->
      <rect x="10" y="180" width="460" height="110" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="198" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">DAILY INDEX REBUILD FROM DELTA LAKE</text>
      <rect x="20" y="208" width="100" height="30" rx="3" fill="#0f1117" stroke="#a855f7" stroke-width="1"/>
      <text x="70" y="225" fill="#a855f7" font-size="8" text-anchor="middle">content_embeddings</text>
      <text x="70" y="237" fill="#a0a0a0" font-size="7" text-anchor="middle">Delta MV (42M rows)</text>
      <rect x="145" y="208" width="100" height="30" rx="3" fill="#0f1117" stroke="#ff6b35" stroke-width="1"/>
      <text x="195" y="225" fill="#ff6b35" font-size="8" text-anchor="middle">export vectors</text>
      <text x="195" y="237" fill="#a0a0a0" font-size="7" text-anchor="middle">Spark → numpy</text>
      <rect x="270" y="208" width="100" height="30" rx="3" fill="#0f1117" stroke="#ff6b35" stroke-width="1"/>
      <text x="320" y="225" fill="#ff6b35" font-size="8" text-anchor="middle">build HNSW</text>
      <text x="320" y="237" fill="#a0a0a0" font-size="7" text-anchor="middle">faiss.IndexHNSW</text>
      <rect x="390" y="208" width="80" height="30" rx="3" fill="#0f1117" stroke="#22c55e" stroke-width="1"/>
      <text x="430" y="225" fill="#22c55e" font-size="8" text-anchor="middle">deploy to</text>
      <text x="430" y="237" fill="#a0a0a0" font-size="7" text-anchor="middle">serving pods</text>
      <line x1="120" y1="223" x2="145" y2="223" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="245" y1="223" x2="270" y2="223" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="370" y1="223" x2="390" y2="223" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>
      <text x="240" y="268" fill="#a0a0a0" font-size="8" text-anchor="middle">Total rebuild time: 2.1h | Runs at 02:00 UTC</text>
      <text x="240" y="282" fill="#a0a0a0" font-size="8" text-anchor="middle">Old index stays live during rebuild — atomic swap on completion</text>
    </svg>`,

    // Step 2: Ranking
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">RANKING STAGE — LightGBM (847 FEATURES)</text>
      <!-- Feature groups -->
      <rect x="10" y="35" width="130" height="110" rx="5" fill="#1e2030" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="75" y="53" fill="#3b82f6" font-size="8" text-anchor="middle" font-weight="bold">USER FEATURES</text>
      <text x="75" y="68" fill="#a0a0a0" font-size="8" text-anchor="middle">engagement_features</text>
      <text x="75" y="81" fill="#a0a0a0" font-size="8" text-anchor="middle">demographic_features</text>
      <text x="75" y="94" fill="#a0a0a0" font-size="8" text-anchor="middle">user_embeddings</text>
      <text x="75" y="107" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">380 features</text>
      <text x="75" y="120" fill="#a0a0a0" font-size="8" text-anchor="middle">watch history</text>
      <text x="75" y="133" fill="#a0a0a0" font-size="8" text-anchor="middle">preference signals</text>
      <rect x="155" y="35" width="130" height="110" rx="5" fill="#1e2030" stroke="#a855f7" stroke-width="1.5"/>
      <text x="220" y="53" fill="#a855f7" font-size="8" text-anchor="middle" font-weight="bold">CONTENT FEATURES</text>
      <text x="220" y="68" fill="#a0a0a0" font-size="8" text-anchor="middle">content_embeddings</text>
      <text x="220" y="81" fill="#a0a0a0" font-size="8" text-anchor="middle">content_metadata</text>
      <text x="220" y="94" fill="#a0a0a0" font-size="8" text-anchor="middle">popularity signals</text>
      <text x="220" y="107" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">312 features</text>
      <text x="220" y="120" fill="#a0a0a0" font-size="8" text-anchor="middle">genre affinity</text>
      <text x="220" y="133" fill="#a0a0a0" font-size="8" text-anchor="middle">recency score</text>
      <rect x="300" y="35" width="170" height="110" rx="5" fill="#1e2030" stroke="#22c55e" stroke-width="1.5"/>
      <text x="385" y="53" fill="#22c55e" font-size="8" text-anchor="middle" font-weight="bold">CONTEXT FEATURES</text>
      <text x="385" y="68" fill="#a0a0a0" font-size="8" text-anchor="middle">time_of_day (24 buckets)</text>
      <text x="385" y="81" fill="#a0a0a0" font-size="8" text-anchor="middle">device type (8 types)</text>
      <text x="385" y="94" fill="#a0a0a0" font-size="8" text-anchor="middle">session_length</text>
      <text x="385" y="107" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">155 features</text>
      <text x="385" y="120" fill="#a0a0a0" font-size="8" text-anchor="middle">geo / timezone</text>
      <text x="385" y="133" fill="#a0a0a0" font-size="8" text-anchor="middle">network speed</text>
      <!-- LightGBM model -->
      <rect x="150" y="162" width="180" height="50" rx="5" fill="#ff6b35" fill-opacity="0.15" stroke="#ff6b35" stroke-width="2"/>
      <text x="240" y="183" fill="#ff6b35" font-size="10" text-anchor="middle" font-weight="bold">LightGBM Ranker</text>
      <text x="240" y="200" fill="#a0a0a0" font-size="8" text-anchor="middle">4.2B training examples | 90-day window</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <line x1="75" y1="145" x2="190" y2="162" stroke="#3b82f6" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="220" y1="145" x2="225" y2="162" stroke="#a855f7" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="385" y1="145" x2="300" y2="162" stroke="#22c55e" stroke-width="1" marker-end="url(#arr)"/>
      <!-- Output funnel -->
      <rect x="10" y="228" width="460" height="60" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="246" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">RANKING FUNNEL</text>
      <rect x="20" y="252" width="80" height="28" rx="3" fill="#ef4444" fill-opacity="0.2" stroke="#ef4444" stroke-width="1"/>
      <text x="60" y="265" fill="#ef4444" font-size="8" text-anchor="middle">Input</text>
      <text x="60" y="277" fill="#e0e0e0" font-size="9" text-anchor="middle">top-1000</text>
      <rect x="120" y="252" width="80" height="28" rx="3" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b" stroke-width="1"/>
      <text x="160" y="265" fill="#f59e0b" font-size="8" text-anchor="middle">After LGB</text>
      <text x="160" y="277" fill="#e0e0e0" font-size="9" text-anchor="middle">top-50</text>
      <rect x="220" y="252" width="100" height="28" rx="3" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6" stroke-width="1"/>
      <text x="270" y="265" fill="#3b82f6" font-size="8" text-anchor="middle">Diversity</text>
      <text x="270" y="277" fill="#e0e0e0" font-size="9" text-anchor="middle">genre balance</text>
      <rect x="340" y="252" width="130" height="28" rx="3" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e" stroke-width="1"/>
      <text x="405" y="265" fill="#22c55e" font-size="8" text-anchor="middle">Final Output</text>
      <text x="405" y="277" fill="#e0e0e0" font-size="9" text-anchor="middle">top-10 recs</text>
      <line x1="100" y1="266" x2="120" y2="266" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="200" y1="266" x2="220" y2="266" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="320" y1="266" x2="340" y2="266" stroke="#ff6b35" stroke-width="1" marker-end="url(#arr)"/>
    </svg>`,

    // Step 3: Collaborative filtering
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">COLLABORATIVE FILTERING — ALS IN DLT</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- DLT pipeline -->
      <rect x="10" y="38" width="140" height="65" rx="5" fill="#1e2030" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="80" y="57" fill="#ff6b35" font-size="8" text-anchor="middle" font-weight="bold">ST</text>
      <text x="80" y="70" fill="#e0e0e0" font-size="8" text-anchor="middle">user_item_interactions</text>
      <text x="80" y="84" fill="#a0a0a0" font-size="8" text-anchor="middle">implicit feedback</text>
      <text x="80" y="97" fill="#a0a0a0" font-size="7" text-anchor="middle">watch, click, skip, rate</text>
      <rect x="170" y="38" width="140" height="65" rx="5" fill="#1e2030" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="240" y="57" fill="#ff6b35" font-size="8" text-anchor="middle" font-weight="bold">MV</text>
      <text x="240" y="70" fill="#e0e0e0" font-size="8" text-anchor="middle">als_user_factors</text>
      <text x="240" y="84" fill="#a0a0a0" font-size="8" text-anchor="middle">180M × 128-dim</text>
      <text x="240" y="97" fill="#a0a0a0" font-size="7" text-anchor="middle">Spark MLlib ALS</text>
      <rect x="330" y="38" width="140" height="65" rx="5" fill="#1e2030" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="400" y="57" fill="#ff6b35" font-size="8" text-anchor="middle" font-weight="bold">MV</text>
      <text x="400" y="70" fill="#e0e0e0" font-size="8" text-anchor="middle">als_item_factors</text>
      <text x="400" y="84" fill="#a0a0a0" font-size="8" text-anchor="middle">42M × 128-dim</text>
      <text x="400" y="97" fill="#a0a0a0" font-size="7" text-anchor="middle">item latent factors</text>
      <line x1="150" y1="70" x2="170" y2="70" stroke="#ff6b35" stroke-width="1.5" marker-end="url(#arr)"/>
      <line x1="310" y1="70" x2="330" y2="70" stroke="#ff6b35" stroke-width="1.5" marker-end="url(#arr)"/>
      <!-- ALS params -->
      <rect x="10" y="120" width="460" height="80" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="138" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">ALS TRAINING PARAMETERS</text>
      <text x="100" y="158" fill="#a0a0a0" font-size="8" text-anchor="middle">iterations</text>
      <text x="200" y="158" fill="#a0a0a0" font-size="8" text-anchor="middle">rank (dims)</text>
      <text x="300" y="158" fill="#a0a0a0" font-size="8" text-anchor="middle">neg samples</text>
      <text x="400" y="158" fill="#a0a0a0" font-size="8" text-anchor="middle">regParam</text>
      <text x="100" y="175" fill="#e0e0e0" font-size="11" text-anchor="middle" font-weight="bold">50</text>
      <text x="200" y="175" fill="#e0e0e0" font-size="11" text-anchor="middle" font-weight="bold">128</text>
      <text x="300" y="175" fill="#e0e0e0" font-size="11" text-anchor="middle" font-weight="bold">5×</text>
      <text x="400" y="175" fill="#e0e0e0" font-size="11" text-anchor="middle" font-weight="bold">0.01</text>
      <line x1="155" y1="140" x2="155" y2="190" stroke="#333" stroke-width="0.5"/>
      <line x1="250" y1="140" x2="250" y2="190" stroke="#333" stroke-width="0.5"/>
      <line x1="345" y1="140" x2="345" y2="190" stroke="#333" stroke-width="0.5"/>
      <!-- Cold start -->
      <rect x="10" y="215" width="460" height="75" rx="5" fill="#1e2030" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="240" y="233" fill="#f59e0b" font-size="9" text-anchor="middle" font-weight="bold">COLD START HANDLING</text>
      <rect x="20" y="242" width="200" height="40" rx="4" fill="#f59e0b" fill-opacity="0.1"/>
      <text x="120" y="259" fill="#f59e0b" font-size="8" text-anchor="middle">22M users (&lt;10 interactions)</text>
      <text x="120" y="272" fill="#a0a0a0" font-size="8" text-anchor="middle">Fallback: content-based recs</text>
      <text x="120" y="283" fill="#a0a0a0" font-size="7" text-anchor="middle">based on metadata similarity</text>
      <rect x="250" y="242" width="210" height="40" rx="4" fill="#22c55e" fill-opacity="0.1"/>
      <text x="355" y="259" fill="#22c55e" font-size="8" text-anchor="middle">158M users (≥10 interactions)</text>
      <text x="355" y="272" fill="#a0a0a0" font-size="8" text-anchor="middle">Full collaborative filtering</text>
      <text x="355" y="283" fill="#a0a0a0" font-size="7" text-anchor="middle">ALS factors used in ranking</text>
    </svg>`,

    // Step 4: A/B Testing
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">A/B TESTING WITH DELTA LAKE</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
      </defs>
      <!-- Assignment table -->
      <rect x="10" y="38" width="200" height="90" rx="5" fill="#1e2030" stroke="#a855f7" stroke-width="1.5"/>
      <text x="110" y="56" fill="#a855f7" font-size="9" text-anchor="middle" font-weight="bold">ab_assignments</text>
      <text x="110" y="70" fill="#a0a0a0" font-size="8" text-anchor="middle">mediastream.experiments.*</text>
      <rect x="20" y="76" width="80" height="16" rx="2" fill="#0f1117"/>
      <text x="60" y="88" fill="#a0a0a0" font-size="7" text-anchor="middle">user_id</text>
      <rect x="110" y="76" width="90" height="16" rx="2" fill="#0f1117"/>
      <text x="155" y="88" fill="#a0a0a0" font-size="7" text-anchor="middle">variant_id</text>
      <rect x="20" y="95" width="180" height="25" rx="2" fill="#0f1117"/>
      <text x="110" y="112" fill="#a0a0a0" font-size="7" text-anchor="middle">180M rows | Delta SCD Type 1</text>
      <text x="110" y="122" fill="#ff6b35" font-size="8" text-anchor="middle">8 concurrent experiments</text>
      <!-- Results table -->
      <rect x="270" y="38" width="200" height="90" rx="5" fill="#1e2030" stroke="#22c55e" stroke-width="1.5"/>
      <text x="370" y="56" fill="#22c55e" font-size="9" text-anchor="middle" font-weight="bold">experiment_results</text>
      <text x="370" y="70" fill="#a0a0a0" font-size="8" text-anchor="middle">mediastream.experiments.*</text>
      <rect x="280" y="76" width="80" height="16" rx="2" fill="#0f1117"/>
      <text x="320" y="88" fill="#a0a0a0" font-size="7" text-anchor="middle">CTR, watch_time</text>
      <rect x="370" y="76" width="90" height="16" rx="2" fill="#0f1117"/>
      <text x="415" y="88" fill="#a0a0a0" font-size="7" text-anchor="middle">p-value, lift</text>
      <rect x="280" y="95" width="180" height="25" rx="2" fill="#0f1117"/>
      <text x="370" y="112" fill="#a0a0a0" font-size="7" text-anchor="middle">Delta table | daily aggregate</text>
      <text x="370" y="122" fill="#22c55e" font-size="8" text-anchor="middle">auto-promotion on win</text>
      <!-- Flow -->
      <rect x="140" y="150" width="200" height="55" rx="5" fill="#1e2030" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="240" y="170" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">EXPERIMENT LIFECYCLE</text>
      <text x="240" y="185" fill="#a0a0a0" font-size="8" text-anchor="middle">7 days | p&lt;0.05 | 500K users/variant</text>
      <text x="240" y="198" fill="#a0a0a0" font-size="8" text-anchor="middle">Winner promoted to production</text>
      <line x1="110" y1="100" x2="170" y2="150" stroke="#a855f7" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="370" y1="128" x2="320" y2="150" stroke="#22c55e" stroke-width="1" marker-end="url(#arr)"/>
      <!-- Metrics -->
      <rect x="10" y="224" width="460" height="64" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="242" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">CURRENT EXPERIMENTS (8 ACTIVE)</text>
      <text x="80" y="260" fill="#a0a0a0" font-size="8" text-anchor="middle">two-tower v7 vs v8</text>
      <text x="220" y="260" fill="#a0a0a0" font-size="8" text-anchor="middle">diversity weight 0.3 vs 0.5</text>
      <text x="360" y="260" fill="#a0a0a0" font-size="8" text-anchor="middle">context features on/off</text>
      <text x="80" y="278" fill="#22c55e" font-size="7" text-anchor="middle">+3.2% CTR lift</text>
      <text x="220" y="278" fill="#f59e0b" font-size="7" text-anchor="middle">running (day 3/7)</text>
      <text x="360" y="278" fill="#22c55e" font-size="7" text-anchor="middle">+1.8% watch time</text>
      <line x1="155" y1="250" x2="155" y2="282" stroke="#333" stroke-width="0.5"/>
      <line x1="290" y1="250" x2="290" y2="282" stroke="#333" stroke-width="0.5"/>
    </svg>`,

    // Step 5: Serving latency
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">END-TO-END SERVING LATENCY</text>
      <!-- Latency waterfall -->
      <text x="20" y="46" fill="#a0a0a0" font-size="8">0ms</text>
      <text x="120" y="46" fill="#a0a0a0" font-size="8">10ms</text>
      <text x="220" y="46" fill="#a0a0a0" font-size="8">25ms</text>
      <text x="320" y="46" fill="#a0a0a0" font-size="8">40ms</text>
      <text x="420" y="46" fill="#a0a0a0" font-size="8">50ms</text>
      <line x1="20" y1="50" x2="460" y2="50" stroke="#333" stroke-width="0.5"/>
      <!-- Bars -->
      <rect x="20" y="58" width="100" height="22" rx="3" fill="#3b82f6" fill-opacity="0.8"/>
      <text x="70" y="73" fill="#fff" font-size="8" text-anchor="middle">feature lookup Redis</text>
      <text x="125" y="73" fill="#3b82f6" font-size="8">&lt;10ms</text>
      <rect x="20" y="88" width="150" height="22" rx="3" fill="#ff6b35" fill-opacity="0.8"/>
      <text x="95" y="103" fill="#fff" font-size="8" text-anchor="middle">FAISS ANN retrieval</text>
      <text x="175" y="103" fill="#ff6b35" font-size="8">&lt;15ms</text>
      <rect x="20" y="118" width="120" height="22" rx="3" fill="#22c55e" fill-opacity="0.8"/>
      <text x="80" y="133" fill="#fff" font-size="8" text-anchor="middle">LightGBM ranking</text>
      <text x="145" y="133" fill="#22c55e" font-size="8">&lt;12ms</text>
      <rect x="20" y="148" width="30" height="22" rx="3" fill="#a855f7" fill-opacity="0.8"/>
      <text x="35" y="163" fill="#fff" font-size="6" text-anchor="middle">div</text>
      <text x="55" y="163" fill="#a855f7" font-size="8">&lt;3ms</text>
      <rect x="20" y="178" width="50" height="22" rx="3" fill="#f59e0b" fill-opacity="0.8"/>
      <text x="45" y="193" fill="#fff" font-size="7" text-anchor="middle">serial</text>
      <text x="75" y="193" fill="#f59e0b" font-size="8">&lt;5ms</text>
      <!-- Total -->
      <rect x="10" y="215" width="460" height="35" rx="4" fill="#ff6b35" fill-opacity="0.15" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="100" y="232" fill="#e0e0e0" font-size="10" text-anchor="middle">P50: 45ms</text>
      <text x="240" y="232" fill="#e0e0e0" font-size="10" text-anchor="middle">P95: 85ms</text>
      <text x="370" y="232" fill="#e0e0e0" font-size="10" text-anchor="middle">P99: 140ms</text>
      <text x="240" y="244" fill="#a0a0a0" font-size="8" text-anchor="middle">SLA: &lt;200ms P99</text>
      <!-- Cache box -->
      <rect x="10" y="262" width="460" height="32" rx="4" fill="#1e2030" stroke="#22c55e" stroke-width="1"/>
      <text x="240" y="278" fill="#22c55e" font-size="9" text-anchor="middle" font-weight="bold">PRECOMPUTED CACHE: top 20M active users | 24h TTL | 67.3% hit rate</text>
      <text x="240" y="290" fill="#a0a0a0" font-size="8" text-anchor="middle">On timeout fallback: editorial top-50 by user segment</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.re-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.re-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.re-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="re-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="re-header module-header">
        <div class="module-tag" style="background:var(--delta)">DLT PIPELINES</div>
        <h2 class="module-title">Recommendation Engine</h2>
        <p class="module-subtitle">Two-tower neural network serving personalized content to 180M MediaStream subscribers</p>
      </div>
      <div class="re-pills step-pills">${pills}</div>
      <div class="re-diagram diagram-frame"></div>
      <div class="re-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 're-page page-enter';
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
    container.querySelectorAll('.re-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['recommendation'] = {
    id: 'recommendation',
    title: 'Recommendation Engine',
    group: 'DLT Pipelines',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
