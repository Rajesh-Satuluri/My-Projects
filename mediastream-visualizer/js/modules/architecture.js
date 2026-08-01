/* ============================================================
   Architecture Module — 7-step animated Medallion architecture
   MediaStream: Kafka → Bronze → Silver → Gold → ML → Recs
   CSS prefix: ma-
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Steps ─────────────────────────────────────────────────── */
  const STEPS = [
    {
      label: 'Medallion Overview',
      desc: 'The Medallion architecture organizes data into three quality tiers: Bronze (raw), Silver (clean), Gold (aggregated).',
      detail: 'MediaStream processes 2.4B clickstream events/day across these layers using Databricks Delta Live Tables (DLT).',
      highlight: null,
    },
    {
      label: 'Source: Kafka Streams',
      desc: 'Events are produced to Apache Kafka topics: clickstream, play_events, search_events, ratings, device_telemetry.',
      detail: '8 Kafka clusters across 42 regions. 2.4B messages/day at peak ~50K msg/sec. Events include user_id, content_id, event_type, device_id, timestamp_ms.',
      highlight: 'kafka',
    },
    {
      label: 'Bronze Layer — Raw Ingestion',
      desc: 'Spark Structured Streaming reads from Kafka and writes raw events to Delta tables with exactly-once semantics.',
      detail: 'Bronze tables are append-only, schema-on-read, partition by date. No transformations — preserves original event bytes. 5 tables: raw_clickstream (2.4B/day), raw_play_events, raw_search_events, raw_ratings, raw_device_telemetry.',
      highlight: 'bronze',
    },
    {
      label: 'Silver Layer — Cleaned Data',
      desc: 'DLT pipelines clean Bronze data: deduplication (MERGE), null handling, type casting, cross-table joins.',
      detail: '5 Silver tables: user_sessions (session stitching), content_watch_history (deduped plays), search_intent (intent classification), device_profiles (user-agent parsing), content_catalog (joined metadata).',
      highlight: 'silver',
    },
    {
      label: 'Gold Layer — Business Metrics',
      desc: 'Aggregated tables ready for BI dashboards, A/B testing, and as feature inputs for ML models.',
      detail: '5 Gold tables: daily_active_users (180M/day), content_performance (per-title metrics), user_preferences (rolling 30-day), ab_test_results (50M events/day), revenue_summary. Updated hourly by DLT.',
      highlight: 'gold',
    },
    {
      label: 'ML Feature Store',
      desc: 'Databricks Feature Store reads Gold tables to compute and materialize ML features used by the recommendation model.',
      detail: '4 Feature tables: user_embedding_features (180M users, 512-dim), content_embedding_features (48M items), interaction_matrix (2B user-item pairs), realtime_context (last-session signals). Refreshed every 15 minutes.',
      highlight: 'ml',
    },
    {
      label: 'Unity Catalog Governance',
      desc: 'Unity Catalog sits above all layers providing metastore registration, lineage tracking, and access control.',
      detail: '3 Catalogs: mediastream_prod, mediastream_dev, shared_governance. Column masking on PII fields. Row-level filters by region team. End-to-end lineage from Kafka → ML predictions visible in the catalog UI.',
      highlight: 'unity',
    },
  ];

  let _engine = null;

  /* ── Render ────────────────────────────────────────────────── */
  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'ma-page page-enter';
    page.innerHTML = _buildHTML();
    container.appendChild(page);

    _engine = new IV.AnimationEngine({
      steps: STEPS.map((s, i) => ({
        label: s.label,
        description: s.desc,
        duration: 2200,
        enter(ctx) {
          const si = i;
          const el = ctx.el;
          _updateStep(el, si);
        },
      })),
    });

    _engine.setContext({ el: container });

    container.querySelectorAll('.ma-step-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    /* Layer box clicks jump to relevant step */
    container.querySelectorAll('.ma-layer-box').forEach(el => {
      el.addEventListener('click', () => {
        const step = parseInt(el.dataset.step, 10);
        if (!isNaN(step)) _engine.goto(step);
      });
    });

    IV.AnimationControls.register(_engine);
  }

  /* ── Update step visuals ──────────────────────────────────── */
  function _updateStep(el, si) {
    el.querySelectorAll('.ma-step-pill').forEach((pill, idx) => {
      pill.classList.toggle('active', idx === si);
      pill.classList.toggle('visited', idx < si);
    });

    const step = STEPS[si];
    const title = el.querySelector('#ma-info-title');
    const body = el.querySelector('#ma-info-body');
    const detail = el.querySelector('#ma-info-detail');
    if (title) title.textContent = step.label;
    if (body) body.textContent = step.desc;
    if (detail) detail.textContent = step.detail;

    /* Highlight active layer box */
    el.querySelectorAll('.ma-layer-box').forEach(box => {
      box.classList.toggle('highlighted', box.dataset.highlight === step.highlight);
    });
  }

  /* ── HTML Shell ───────────────────────────────────────────── */
  function _buildHTML() {
    const pills = STEPS.map((s, i) => `
      <button class="ma-step-pill${i === 0 ? ' active' : ''}" data-step="${i}">${i + 1}</button>
    `).join('');

    return `
<style>
.ma-page { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.ma-header {
  padding: var(--space-4) var(--space-6); background: var(--bg-2);
  border-bottom: 1px solid var(--border-default); flex-shrink: 0;
  display: flex; align-items: center; gap: var(--space-4);
}
.ma-header-text { flex: 1; }
.ma-title { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.ma-subtitle { font-size: var(--text-sm); color: var(--text-muted); margin-top: 2px; }
.ma-pills { display: flex; gap: 6px; }
.ma-step-pill {
  width: 28px; height: 28px; border-radius: var(--radius-full);
  font-size: var(--text-xs); font-weight: 700;
  background: var(--bg-3); border: 1px solid var(--border-default); color: var(--text-muted);
  cursor: pointer; transition: all var(--ease-base); display: flex; align-items: center; justify-content: center;
}
.ma-step-pill:hover { border-color: var(--border-muted); color: var(--text-secondary); }
.ma-step-pill.visited { border-color: var(--border-muted); color: var(--text-secondary); }
.ma-step-pill.active { background: rgba(255,107,53,.15); border-color: var(--delta); color: var(--delta); }

.ma-body {
  flex: 1; display: grid; grid-template-columns: 1fr 340px;
  min-height: 0; overflow: hidden;
}
.ma-diagram-area {
  padding: var(--space-6); background: var(--bg-1);
  overflow: hidden; display: flex; align-items: center; justify-content: center;
}
.ma-info-panel {
  border-left: 1px solid var(--border-default); background: var(--bg-2);
  padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4);
  overflow-y: auto;
}
.ma-info-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.ma-info-body { font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.6; }
.ma-detail-box {
  background: var(--bg-3); border: 1px solid var(--border-default);
  border-radius: var(--radius-md); padding: var(--space-4);
}
.ma-detail-label { font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--delta); margin-bottom: var(--space-2); }
.ma-detail-text { font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.55; }
.ma-nav-hint { font-size: var(--text-xs); color: var(--text-muted); margin-top: auto; }

/* SVG layer boxes */
.ma-layer-box { cursor: pointer; transition: opacity .2s; }
.ma-layer-box.highlighted rect { filter: brightness(1.4); }
.ma-layer-box:not(.highlighted) { opacity: 0.65; }
</style>

<div class="ma-header">
  <div class="ma-header-text">
    <div class="ma-title">Medallion Architecture</div>
    <div class="ma-subtitle">MediaStream · Kafka → Bronze → Silver → Gold → ML Features → Recommendations</div>
  </div>
  <div class="ma-pills">${pills}</div>
</div>

<div class="ma-body">
  <div class="ma-diagram-area">
    ${_buildSVG()}
  </div>
  <div class="ma-info-panel">
    <div id="ma-info-title" class="ma-info-title">${STEPS[0].label}</div>
    <div id="ma-info-body" class="ma-info-body">${STEPS[0].desc}</div>
    <div class="ma-detail-box">
      <div class="ma-detail-label">📡 MediaStream Detail</div>
      <div id="ma-info-detail" class="ma-detail-text">${STEPS[0].detail}</div>
    </div>
    <div class="ma-nav-hint">Click a layer in the diagram or use animation controls to explore</div>
  </div>
</div>
`;
  }

  /* ── SVG Architecture Diagram ─────────────────────────────── */
  function _buildSVG() {
    return `
<svg viewBox="0 0 520 480" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;max-height:420px">
  <defs>
    <linearGradient id="kafkaGrad" x1="0" y1="0" x2="100%" y2="0">
      <stop offset="0%" stop-color="#1e56a0"/><stop offset="100%" stop-color="#4090cc"/>
    </linearGradient>
    <linearGradient id="bronzeGrad" x1="0" y1="0" x2="100%" y2="0">
      <stop offset="0%" stop-color="#6b3a1f"/><stop offset="100%" stop-color="#b87333"/>
    </linearGradient>
    <linearGradient id="silverGrad" x1="0" y1="0" x2="100%" y2="0">
      <stop offset="0%" stop-color="#4a4a4a"/><stop offset="100%" stop-color="#a0a0a0"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="100%" y2="0">
      <stop offset="0%" stop-color="#7a5800"/><stop offset="100%" stop-color="#d4a017"/>
    </linearGradient>
    <linearGradient id="mlGrad" x1="0" y1="0" x2="100%" y2="0">
      <stop offset="0%" stop-color="#5b1f8c"/><stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
    <linearGradient id="ucGrad" x1="0" y1="0" x2="100%" y2="0">
      <stop offset="0%" stop-color="#1a3d5c"/><stop offset="100%" stop-color="#2d7dd2"/>
    </linearGradient>
    <marker id="ma-arr" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
      <polygon points="0 0 8 4 0 8" fill="#484f58"/>
    </marker>
  </defs>

  <!-- Unity Catalog background wrapper -->
  <rect x="10" y="10" width="500" height="460" rx="12" fill="rgba(45,125,210,.04)" stroke="rgba(45,125,210,.3)" stroke-dasharray="6 4"/>
  <text x="260" y="34" text-anchor="middle" font-size="11" font-weight="700" fill="rgba(45,125,210,.7)" letter-spacing=".06em">UNITY CATALOG GOVERNANCE</text>

  <!-- Kafka source -->
  <g class="ma-layer-box" data-highlight="kafka" data-step="1">
    <rect x="30" y="50" width="140" height="72" rx="8" fill="url(#kafkaGrad)" fill-opacity=".2" stroke="rgba(64,144,204,.5)" stroke-width="1.5"/>
    <text x="100" y="75" text-anchor="middle" font-size="13" font-weight="700" fill="#4090cc">📡 Apache Kafka</text>
    <text x="100" y="93" text-anchor="middle" font-size="9" fill="#8b949e">clickstream · play_events</text>
    <text x="100" y="108" text-anchor="middle" font-size="9" fill="#8b949e">search · ratings · telemetry</text>
  </g>

  <!-- Arrow Kafka → Bronze -->
  <line x1="170" y1="86" x2="195" y2="86" stroke="#484f58" stroke-width="1.5" marker-end="url(#ma-arr)"/>
  <text x="182" y="80" text-anchor="middle" font-size="8" fill="#6e7681">stream</text>

  <!-- Bronze -->
  <g class="ma-layer-box" data-highlight="bronze" data-step="2">
    <rect x="195" y="50" width="310" height="72" rx="8" fill="url(#bronzeGrad)" fill-opacity=".18" stroke="rgba(184,115,51,.5)" stroke-width="1.5"/>
    <text x="295" y="72" text-anchor="middle" font-size="13" font-weight="700" fill="#b87333">📦 Bronze Layer</text>
    <text x="350" y="72" text-anchor="middle" font-size="9" fill="#8b949e">Raw · Append-Only · Schema-On-Read</text>
    <text x="295" y="90" text-anchor="middle" font-size="9" fill="#8b949e">raw_clickstream (2.4B/day)</text>
    <text x="350" y="90" text-anchor="middle" font-size="9" fill="#8b949e">raw_play_events · raw_ratings</text>
    <text x="352" y="108" text-anchor="middle" font-size="9" fill="#8b949e">raw_search_events · raw_device_telemetry</text>
  </g>

  <!-- Arrow Bronze → Silver -->
  <line x1="350" y1="122" x2="350" y2="152" stroke="#484f58" stroke-width="1.5" marker-end="url(#ma-arr)"/>
  <text x="368" y="142" font-size="8" fill="#6e7681">DLT clean</text>

  <!-- Silver -->
  <g class="ma-layer-box" data-highlight="silver" data-step="3">
    <rect x="30" y="152" width="475" height="72" rx="8" fill="url(#silverGrad)" fill-opacity=".15" stroke="rgba(160,160,160,.4)" stroke-width="1.5"/>
    <text x="80" y="175" text-anchor="middle" font-size="13" font-weight="700" fill="#c0c0c0">⚙️ Silver Layer</text>
    <text x="260" y="175" text-anchor="middle" font-size="9" fill="#8b949e">Deduplicated · Joined · Validated · MERGE-driven</text>
    <text x="100" y="193" text-anchor="middle" font-size="9" fill="#8b949e">user_sessions</text>
    <text x="195" y="193" text-anchor="middle" font-size="9" fill="#8b949e">content_watch_history</text>
    <text x="295" y="193" text-anchor="middle" font-size="9" fill="#8b949e">search_intent</text>
    <text x="390" y="193" text-anchor="middle" font-size="9" fill="#8b949e">device_profiles</text>
    <text x="470" y="193" text-anchor="middle" font-size="9" fill="#8b949e">content_catalog</text>
    <text x="260" y="210" text-anchor="middle" font-size="9" fill="#6e7681">220M sessions/day · 800M watch records/day · 60M search intents/day</text>
  </g>

  <!-- Arrow Silver → Gold -->
  <line x1="260" y1="224" x2="260" y2="254" stroke="#484f58" stroke-width="1.5" marker-end="url(#ma-arr)"/>
  <text x="278" y="244" font-size="8" fill="#6e7681">DLT aggregate</text>

  <!-- Gold -->
  <g class="ma-layer-box" data-highlight="gold" data-step="4">
    <rect x="30" y="254" width="475" height="72" rx="8" fill="url(#goldGrad)" fill-opacity=".18" stroke="rgba(212,160,23,.5)" stroke-width="1.5"/>
    <text x="75" y="277" text-anchor="middle" font-size="13" font-weight="700" fill="#d4a017">⭐ Gold Layer</text>
    <text x="260" y="277" text-anchor="middle" font-size="9" fill="#8b949e">Aggregated · BI-Ready · ML Inputs</text>
    <text x="90" y="295" text-anchor="middle" font-size="9" fill="#8b949e">daily_active_users</text>
    <text x="200" y="295" text-anchor="middle" font-size="9" fill="#8b949e">content_performance</text>
    <text x="300" y="295" text-anchor="middle" font-size="9" fill="#8b949e">user_preferences</text>
    <text x="400" y="295" text-anchor="middle" font-size="9" fill="#8b949e">ab_test_results</text>
    <text x="480" y="295" text-anchor="middle" font-size="9" fill="#8b949e">revenue</text>
    <text x="260" y="313" text-anchor="middle" font-size="9" fill="#6e7681">180M DAU · 48M titles · Updated hourly by DLT</text>
  </g>

  <!-- Arrow Gold → ML -->
  <line x1="260" y1="326" x2="260" y2="356" stroke="#484f58" stroke-width="1.5" marker-end="url(#ma-arr)"/>
  <text x="278" y="346" font-size="8" fill="#6e7681">Feature eng</text>

  <!-- ML Features -->
  <g class="ma-layer-box" data-highlight="ml" data-step="5">
    <rect x="30" y="356" width="340" height="72" rx="8" fill="url(#mlGrad)" fill-opacity=".2" stroke="rgba(168,85,247,.5)" stroke-width="1.5"/>
    <text x="95" y="379" text-anchor="middle" font-size="13" font-weight="700" fill="#a855f7">🤖 ML Feature Store</text>
    <text x="200" y="379" text-anchor="middle" font-size="9" fill="#8b949e">Databricks Feature Store · 15-min refresh</text>
    <text x="100" y="397" text-anchor="middle" font-size="9" fill="#8b949e">user_embeddings (512-dim)</text>
    <text x="230" y="397" text-anchor="middle" font-size="9" fill="#8b949e">item_embeddings</text>
    <text x="335" y="397" text-anchor="middle" font-size="9" fill="#8b949e">interaction_matrix</text>
    <text x="200" y="415" text-anchor="middle" font-size="9" fill="#6e7681">180M users · 48M items · 2B interaction pairs</text>
  </g>

  <!-- Arrow ML → Recommendations -->
  <line x1="370" y1="392" x2="390" y2="392" stroke="#484f58" stroke-width="1.5" marker-end="url(#ma-arr)"/>

  <!-- Recommendations box -->
  <rect x="390" y="356" width="115" height="72" rx="8" fill="rgba(63,185,80,.12)" stroke="rgba(63,185,80,.4)" stroke-width="1.5"/>
  <text x="447" y="379" text-anchor="middle" font-size="11" font-weight="700" fill="#3fb950">🎬 Recs</text>
  <text x="447" y="397" text-anchor="middle" font-size="9" fill="#8b949e">900M/day</text>
  <text x="447" y="413" text-anchor="middle" font-size="9" fill="#8b949e">p99 &lt;50ms</text>

  <!-- Unity catalog label at bottom -->
  <g class="ma-layer-box" data-highlight="unity" data-step="6">
    <rect x="10" y="438" width="500" height="28" rx="6" fill="rgba(45,125,210,.08)" stroke="rgba(45,125,210,.25)"/>
    <text x="260" y="456" text-anchor="middle" font-size="10" font-weight="600" fill="rgba(45,125,210,.8)">🏛 Unity Catalog · Lineage · Column Masking · Row Filters · Audit Logs · Delta Sharing</text>
  </g>
</svg>`;
  }

  /* ── Register ─────────────────────────────────────────────── */
  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['architecture'] = {
    id: 'architecture',
    title: 'Architecture',
    group: 'start',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
