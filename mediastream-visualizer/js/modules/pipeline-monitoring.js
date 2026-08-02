(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'DLT Expectations',
      desc: 'Built-in data quality monitoring via DLT Expectations',
      detail: 'DLT Expectations are declarative data quality constraints checked at pipeline runtime. MediaStream defines 47 expectations across 22 DLT tables. Three action modes: WARN (log violation, proceed), DROP (exclude row, proceed), FAIL (halt pipeline). Expectations are tracked in the DLT event log Delta table and surfaced in the pipeline UI. Violations trigger downstream SLA risk scores.',
    },
    {
      label: 'Flow Metrics',
      desc: 'Per-flow throughput, latency and backlog metrics',
      detail: 'DLT Flow Metrics: rows_processed_per_second, backlog_bytes, backlog_rows, output_rows, failed_rows. MediaStream tracks per-flow P50/P95/P99 latency. Critical thresholds: bronze_events_raw backlog >500M rows → P1, engagement_features recompute >90min → P2, user_embeddings lag >6h → P2. All metrics written to mediastream.monitoring.dlt_flow_metrics Delta table every 60 seconds.',
    },
    {
      label: 'Quality Dashboard',
      desc: 'Unified data quality view across all MediaStream pipelines',
      detail: 'Quality Dashboard powered by mediastream.monitoring.data_quality_scores — a Gold MV aggregating all Expectation violations, row counts, schema drift events, and NULL rates across 847 Delta tables. Key quality dimensions: completeness (NULL rates), validity (constraint violations), timeliness (SLA lag), uniqueness (dedup rates). Dashboard refreshed every 5 minutes. 99.94% overall quality score today.',
    },
    {
      label: 'Alerting',
      desc: 'Multi-tier alerting for pipeline failures and quality breaches',
      detail: 'Alerting tiers: P1 (PagerDuty, 5min response) — pipeline FAIL, Bronze backlog >500M, Gold SLA >2h breach. P2 (Slack #data-eng, 30min) — WARN expectation rate >1%, Silver SLA >1h, ML feature freshness breach. P3 (email daily digest) — schema drift detected, partition skew >3×, vacuum warnings. Alert routing via mediastream.monitoring.alert_routing Delta table — 14 on-call rotation members.',
    },
    {
      label: 'Lineage Monitoring',
      desc: 'Lineage-driven impact analysis for pipeline changes',
      detail: 'Unity Catalog lineage powers impact analysis: when Bronze schema changes, lineage graph identifies all downstream Silver, Gold, and ML feature tables at risk. Change propagation time: seconds for lineage graph refresh. Pre-change impact report auto-generated for any ALTER TABLE on Bronze layer. Post-incident RCA (Root Cause Analysis) uses lineage to trace data errors from Gold back to source. 23 automated RCAs resolved in last 30 days.',
    },
    {
      label: 'SLA Tracking',
      desc: 'End-to-end SLA monitoring from ingestion to serving',
      detail: 'SLA tracking table: mediastream.monitoring.sla_compliance — records expected_ready_time, actual_ready_time, sla_met (bool) for every table in every pipeline run. 30-day SLA compliance: Bronze 99.98%, Silver 99.91%, Gold 99.74%, ML Features 99.62%. SLA breaches by cause: infrastructure (41%), upstream delay (33%), data quality (18%), pipeline bugs (8%). Monthly SLA report auto-generated and sent to VP Engineering.',
    },
  ];

  const DIAGRAMS = [
    // Step 0: DLT Expectations overview
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">DLT EXPECTATIONS — 47 CONSTRAINTS</text>
      <!-- 3 modes -->
      <rect x="10" y="40" width="140" height="110" rx="5" fill="#1e2030" stroke="#f59e0b" stroke-width="2"/>
      <text x="80" y="60" fill="#f59e0b" font-size="10" text-anchor="middle" font-weight="bold">WARN</text>
      <text x="80" y="78" fill="#a0a0a0" font-size="8" text-anchor="middle">Log violation</text>
      <text x="80" y="92" fill="#a0a0a0" font-size="8" text-anchor="middle">Pipeline continues</text>
      <text x="80" y="106" fill="#a0a0a0" font-size="8" text-anchor="middle">Row included</text>
      <text x="80" y="128" fill="#f59e0b" font-size="9" text-anchor="middle" font-weight="bold">18 expectations</text>
      <text x="80" y="142" fill="#a0a0a0" font-size="7" text-anchor="middle">e.g. embedding_norm_valid</text>
      <rect x="170" y="40" width="140" height="110" rx="5" fill="#1e2030" stroke="#ef4444" stroke-width="2"/>
      <text x="240" y="60" fill="#ef4444" font-size="10" text-anchor="middle" font-weight="bold">DROP</text>
      <text x="240" y="78" fill="#a0a0a0" font-size="8" text-anchor="middle">Exclude bad row</text>
      <text x="240" y="92" fill="#a0a0a0" font-size="8" text-anchor="middle">Pipeline continues</text>
      <text x="240" y="106" fill="#a0a0a0" font-size="8" text-anchor="middle">Row excluded</text>
      <text x="240" y="128" fill="#ef4444" font-size="9" text-anchor="middle" font-weight="bold">22 expectations</text>
      <text x="240" y="142" fill="#a0a0a0" font-size="7" text-anchor="middle">e.g. user_id_not_null</text>
      <rect x="330" y="40" width="140" height="110" rx="5" fill="#1e2030" stroke="#dc2626" stroke-width="2"/>
      <text x="400" y="60" fill="#dc2626" font-size="10" text-anchor="middle" font-weight="bold">FAIL</text>
      <text x="400" y="78" fill="#a0a0a0" font-size="8" text-anchor="middle">Halt pipeline</text>
      <text x="400" y="92" fill="#a0a0a0" font-size="8" text-anchor="middle">Alert P1</text>
      <text x="400" y="106" fill="#a0a0a0" font-size="8" text-anchor="middle">Row excluded</text>
      <text x="400" y="128" fill="#dc2626" font-size="9" text-anchor="middle" font-weight="bold">7 expectations</text>
      <text x="400" y="142" fill="#a0a0a0" font-size="7" text-anchor="middle">e.g. schema_version_match</text>
      <!-- Event log -->
      <rect x="10" y="168" width="460" height="120" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="186" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">DLT EVENT LOG → Delta Table</text>
      <rect x="20" y="194" width="440" height="16" rx="2" fill="#ff6b35" fill-opacity="0.15"/>
      <text x="70" y="206" fill="#ff6b35" font-size="8">timestamp</text>
      <text x="175" y="206" fill="#ff6b35" font-size="8">table_name</text>
      <text x="285" y="206" fill="#ff6b35" font-size="8">expectation</text>
      <text x="390" y="206" fill="#ff6b35" font-size="8">failed_count</text>
      <rect x="20" y="212" width="440" height="14" rx="2" fill="#1a1d2e"/>
      <text x="70" y="223" fill="#a0a0a0" font-size="7">2024-01-15 08:01:22</text>
      <text x="175" y="223" fill="#a0a0a0" font-size="7">bronze_events_raw</text>
      <text x="285" y="223" fill="#f59e0b" font-size="7">event_ts_valid (WARN)</text>
      <text x="390" y="223" fill="#a0a0a0" font-size="7">12,847</text>
      <rect x="20" y="228" width="440" height="14" rx="2" fill="#12141f"/>
      <text x="70" y="239" fill="#a0a0a0" font-size="7">2024-01-15 08:02:01</text>
      <text x="175" y="239" fill="#a0a0a0" font-size="7">silver_user_activity</text>
      <text x="285" y="239" fill="#ef4444" font-size="7">user_id_not_null (DROP)</text>
      <text x="390" y="239" fill="#a0a0a0" font-size="7">384</text>
      <rect x="20" y="244" width="440" height="14" rx="2" fill="#1a1d2e"/>
      <text x="70" y="255" fill="#a0a0a0" font-size="7">2024-01-15 08:02:45</text>
      <text x="175" y="255" fill="#a0a0a0" font-size="7">gold_daily_content_kpis</text>
      <text x="285" y="255" fill="#22c55e" font-size="7">kpi_not_negative (PASS)</text>
      <text x="390" y="255" fill="#22c55e" font-size="7">0</text>
      <text x="240" y="280" fill="#a0a0a0" font-size="8" text-anchor="middle">47 expectations × 22 tables | tracked in system.events.dlt_expectations</text>
    </svg>`,

    // Step 1: Flow metrics
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">DLT FLOW METRICS — REAL-TIME</text>
      <!-- Key flows -->
      <rect x="10" y="36" width="460" height="22" rx="3" fill="#ff6b35" fill-opacity="0.15"/>
      <text x="110" y="52" fill="#ff6b35" font-size="9" font-weight="bold">FLOW</text>
      <text x="220" y="52" fill="#ff6b35" font-size="9" font-weight="bold">ROWS/SEC</text>
      <text x="300" y="52" fill="#ff6b35" font-size="9" font-weight="bold">BACKLOG</text>
      <text x="380" y="52" fill="#ff6b35" font-size="9" font-weight="bold">P99 LAT</text>
      <text x="445" y="52" fill="#ff6b35" font-size="9" font-weight="bold">STATUS</text>
      <rect x="10" y="60" width="460" height="18" rx="2" fill="#1a1d2e"/>
      <text x="110" y="73" fill="#e0e0e0" font-size="8">bronze_events_raw</text>
      <text x="220" y="73" fill="#a0a0a0" font-size="8">27,778</text>
      <text x="300" y="73" fill="#a0a0a0" font-size="8">2.1M rows</text>
      <text x="380" y="73" fill="#a0a0a0" font-size="8">4.2s</text>
      <text x="445" y="73" fill="#22c55e" font-size="8">OK</text>
      <rect x="10" y="80" width="460" height="18" rx="2" fill="#12141f"/>
      <text x="110" y="93" fill="#e0e0e0" font-size="8">silver_user_activity</text>
      <text x="220" y="93" fill="#a0a0a0" font-size="8">24,756</text>
      <text x="300" y="93" fill="#a0a0a0" font-size="8">890K rows</text>
      <text x="380" y="93" fill="#a0a0a0" font-size="8">6.8s</text>
      <text x="445" y="93" fill="#22c55e" font-size="8">OK</text>
      <rect x="10" y="100" width="460" height="18" rx="2" fill="#1a1d2e"/>
      <text x="110" y="113" fill="#e0e0e0" font-size="8">gold_daily_content_kpis</text>
      <text x="220" y="113" fill="#a0a0a0" font-size="8">triggered</text>
      <text x="300" y="113" fill="#a0a0a0" font-size="8">—</text>
      <text x="380" y="113" fill="#a0a0a0" font-size="8">8.2min</text>
      <text x="445" y="113" fill="#22c55e" font-size="8">OK</text>
      <rect x="10" y="120" width="460" height="18" rx="2" fill="#12141f"/>
      <text x="110" y="133" fill="#e0e0e0" font-size="8">user_embeddings_live</text>
      <text x="220" y="133" fill="#a0a0a0" font-size="8">triggered</text>
      <text x="300" y="133" fill="#f59e0b" font-size="8">delayed</text>
      <text x="380" y="133" fill="#a0a0a0" font-size="8">4.8h</text>
      <text x="445" y="133" fill="#f59e0b" font-size="8">WARN</text>
      <rect x="10" y="140" width="460" height="18" rx="2" fill="#1a1d2e"/>
      <text x="110" y="153" fill="#e0e0e0" font-size="8">engagement_features</text>
      <text x="220" y="153" fill="#a0a0a0" font-size="8">83,333</text>
      <text x="300" y="153" fill="#a0a0a0" font-size="8">450K rows</text>
      <text x="380" y="153" fill="#a0a0a0" font-size="8">52min</text>
      <text x="445" y="153" fill="#22c55e" font-size="8">OK</text>
      <!-- Thresholds -->
      <rect x="10" y="175" width="460" height="115" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="193" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">ALERT THRESHOLDS</text>
      <rect x="20" y="200" width="200" height="36" rx="3" fill="#ef4444" fill-opacity="0.1" stroke="#ef4444" stroke-width="1"/>
      <text x="120" y="215" fill="#ef4444" font-size="8" text-anchor="middle" font-weight="bold">P1 — Pipeline Halt</text>
      <text x="120" y="229" fill="#a0a0a0" font-size="7" text-anchor="middle">bronze backlog &gt;500M rows</text>
      <text x="120" y="239" fill="#a0a0a0" font-size="7" text-anchor="middle">any FAIL expectation triggered</text>
      <rect x="250" y="200" width="210" height="36" rx="3" fill="#f59e0b" fill-opacity="0.1" stroke="#f59e0b" stroke-width="1"/>
      <text x="355" y="215" fill="#f59e0b" font-size="8" text-anchor="middle" font-weight="bold">P2 — SLA Risk</text>
      <text x="355" y="229" fill="#a0a0a0" font-size="7" text-anchor="middle">eng_features recompute &gt;90min</text>
      <text x="355" y="239" fill="#a0a0a0" font-size="7" text-anchor="middle">user_embeddings lag &gt;6h</text>
      <text x="240" y="268" fill="#a0a0a0" font-size="8" text-anchor="middle">All metrics in mediastream.monitoring.dlt_flow_metrics</text>
      <text x="240" y="282" fill="#a0a0a0" font-size="8" text-anchor="middle">Updated every 60 seconds | 14-day retention</text>
    </svg>`,

    // Step 2: Quality dashboard
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">DATA QUALITY DASHBOARD</text>
      <!-- Overall score -->
      <rect x="10" y="35" width="160" height="100" rx="5" fill="#1e2030" stroke="#22c55e" stroke-width="2"/>
      <text x="90" y="58" fill="#22c55e" font-size="11" text-anchor="middle" font-weight="bold">99.94%</text>
      <text x="90" y="74" fill="#a0a0a0" font-size="8" text-anchor="middle">OVERALL QUALITY</text>
      <text x="90" y="92" fill="#a0a0a0" font-size="8" text-anchor="middle">847 Delta tables</text>
      <text x="90" y="106" fill="#a0a0a0" font-size="8" text-anchor="middle">refreshed every 5min</text>
      <text x="90" y="126" fill="#22c55e" font-size="8" text-anchor="middle">↑ 0.02% vs yesterday</text>
      <!-- 4 dimensions -->
      <rect x="185" y="35" width="140" height="45" rx="4" fill="#1e2030" stroke="#3b82f6" stroke-width="1"/>
      <text x="255" y="53" fill="#3b82f6" font-size="8" text-anchor="middle" font-weight="bold">COMPLETENESS</text>
      <text x="255" y="68" fill="#e0e0e0" font-size="10" text-anchor="middle" font-weight="bold">99.97%</text>
      <text x="255" y="76" fill="#a0a0a0" font-size="7" text-anchor="middle">NULL rates across all cols</text>
      <rect x="335" y="35" width="135" height="45" rx="4" fill="#1e2030" stroke="#a855f7" stroke-width="1"/>
      <text x="402" y="53" fill="#a855f7" font-size="8" text-anchor="middle" font-weight="bold">VALIDITY</text>
      <text x="402" y="68" fill="#e0e0e0" font-size="10" text-anchor="middle" font-weight="bold">99.91%</text>
      <text x="402" y="76" fill="#a0a0a0" font-size="7" text-anchor="middle">constraint violations</text>
      <rect x="185" y="90" width="140" height="45" rx="4" fill="#1e2030" stroke="#22c55e" stroke-width="1"/>
      <text x="255" y="108" fill="#22c55e" font-size="8" text-anchor="middle" font-weight="bold">TIMELINESS</text>
      <text x="255" y="122" fill="#e0e0e0" font-size="10" text-anchor="middle" font-weight="bold">99.74%</text>
      <text x="255" y="130" fill="#a0a0a0" font-size="7" text-anchor="middle">SLA compliance rate</text>
      <rect x="335" y="90" width="135" height="45" rx="4" fill="#1e2030" stroke="#f59e0b" stroke-width="1"/>
      <text x="402" y="108" fill="#f59e0b" font-size="8" text-anchor="middle" font-weight="bold">UNIQUENESS</text>
      <text x="402" y="122" fill="#e0e0e0" font-size="10" text-anchor="middle" font-weight="bold">99.98%</text>
      <text x="402" y="130" fill="#a0a0a0" font-size="7" text-anchor="middle">dedup effectiveness</text>
      <!-- Issues -->
      <rect x="10" y="148" width="460" height="140" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="166" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">OPEN QUALITY ISSUES</text>
      <rect x="20" y="174" width="440" height="16" rx="2" fill="#ff6b35" fill-opacity="0.15"/>
      <text x="70" y="186" fill="#ff6b35" font-size="8">TABLE</text>
      <text x="210" y="186" fill="#ff6b35" font-size="8">DIMENSION</text>
      <text x="320" y="186" fill="#ff6b35" font-size="8">SCORE</text>
      <text x="410" y="186" fill="#ff6b35" font-size="8">TREND</text>
      <rect x="20" y="192" width="440" height="14" rx="2" fill="#1a1d2e"/>
      <text x="70" y="203" fill="#e0e0e0" font-size="7">user_embeddings_live</text>
      <text x="210" y="203" fill="#a0a0a0" font-size="7">Timeliness</text>
      <text x="320" y="203" fill="#f59e0b" font-size="7">97.3% (SLA breach)</text>
      <text x="410" y="203" fill="#ef4444" font-size="7">↓</text>
      <rect x="20" y="208" width="440" height="14" rx="2" fill="#12141f"/>
      <text x="70" y="219" fill="#e0e0e0" font-size="7">bronze_ad_events_raw</text>
      <text x="210" y="219" fill="#a0a0a0" font-size="7">Validity</text>
      <text x="320" y="219" fill="#f59e0b" font-size="7">98.9% (schema drift)</text>
      <text x="410" y="219" fill="#f59e0b" font-size="7">→</text>
      <rect x="20" y="224" width="440" height="14" rx="2" fill="#1a1d2e"/>
      <text x="70" y="235" fill="#e0e0e0" font-size="7">gold_user_segments</text>
      <text x="210" y="235" fill="#a0a0a0" font-size="7">Completeness</text>
      <text x="320" y="235" fill="#22c55e" font-size="7">99.99%</text>
      <text x="410" y="235" fill="#22c55e" font-size="7">↑</text>
      <text x="240" y="262" fill="#a0a0a0" font-size="8" text-anchor="middle">Source: mediastream.monitoring.data_quality_scores</text>
      <text x="240" y="276" fill="#a0a0a0" font-size="7" text-anchor="middle">Gold MV aggregating all expectations, NULL rates, schema drift events</text>
    </svg>`,

    // Step 3: Alerting
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">MULTI-TIER ALERTING SYSTEM</text>
      <!-- P1 -->
      <rect x="10" y="35" width="460" height="60" rx="5" fill="#1e2030" stroke="#dc2626" stroke-width="2"/>
      <rect x="10" y="35" width="60" height="60" rx="5" fill="#dc2626"/>
      <text x="40" y="68" fill="#fff" font-size="12" text-anchor="middle" font-weight="bold">P1</text>
      <text x="250" y="55" fill="#dc2626" font-size="9" text-anchor="middle" font-weight="bold">PagerDuty | 5min response SLA</text>
      <text x="250" y="72" fill="#a0a0a0" font-size="8" text-anchor="middle">Pipeline FAIL expectation | Bronze backlog &gt;500M | Gold SLA &gt;2h breach</text>
      <text x="250" y="86" fill="#a0a0a0" font-size="8" text-anchor="middle">Any Delta FAIL on Bronze or Silver layer tables</text>
      <!-- P2 -->
      <rect x="10" y="105" width="460" height="60" rx="5" fill="#1e2030" stroke="#f59e0b" stroke-width="2"/>
      <rect x="10" y="105" width="60" height="60" rx="5" fill="#f59e0b"/>
      <text x="40" y="138" fill="#fff" font-size="12" text-anchor="middle" font-weight="bold">P2</text>
      <text x="250" y="125" fill="#f59e0b" font-size="9" text-anchor="middle" font-weight="bold">Slack #data-eng | 30min response SLA</text>
      <text x="250" y="142" fill="#a0a0a0" font-size="8" text-anchor="middle">WARN expectation rate &gt;1% | Silver SLA &gt;1h | ML feature freshness breach</text>
      <text x="250" y="156" fill="#a0a0a0" font-size="8" text-anchor="middle">Recommendation serving latency P99 &gt;200ms</text>
      <!-- P3 -->
      <rect x="10" y="175" width="460" height="60" rx="5" fill="#1e2030" stroke="#3b82f6" stroke-width="2"/>
      <rect x="10" y="175" width="60" height="60" rx="5" fill="#3b82f6"/>
      <text x="40" y="208" fill="#fff" font-size="12" text-anchor="middle" font-weight="bold">P3</text>
      <text x="250" y="195" fill="#3b82f6" font-size="9" text-anchor="middle" font-weight="bold">Email Daily Digest</text>
      <text x="250" y="212" fill="#a0a0a0" font-size="8" text-anchor="middle">Schema drift detected | Partition skew &gt;3× | VACUUM warnings</text>
      <text x="250" y="226" fill="#a0a0a0" font-size="8" text-anchor="middle">Non-critical expectation violations | Data volume anomalies</text>
      <!-- Routing info -->
      <rect x="10" y="248" width="460" height="42" rx="4" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="265" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">Alert Routing: mediastream.monitoring.alert_routing Delta Table</text>
      <text x="240" y="280" fill="#a0a0a0" font-size="8" text-anchor="middle">14 on-call rotation members | escalation chain | suppression windows</text>
    </svg>`,

    // Step 4: Lineage monitoring
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">LINEAGE-DRIVEN IMPACT ANALYSIS</text>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b35"/>
        </marker>
        <marker id="arr-red" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444"/>
        </marker>
      </defs>
      <!-- Source change -->
      <rect x="10" y="38" width="110" height="45" rx="4" fill="#ef4444" fill-opacity="0.15" stroke="#ef4444" stroke-width="2"/>
      <text x="65" y="57" fill="#ef4444" font-size="8" text-anchor="middle" font-weight="bold">ALTER TABLE</text>
      <text x="65" y="70" fill="#e0e0e0" font-size="8" text-anchor="middle">bronze_events_raw</text>
      <text x="65" y="77" fill="#a0a0a0" font-size="7" text-anchor="middle">add column: country</text>
      <!-- Impact -->
      <line x1="120" y1="60" x2="155" y2="60" stroke="#ef4444" stroke-width="1.5" marker-end="url(#arr-red)"/>
      <rect x="155" y="45" width="310" height="60" rx="4" fill="#1e2030" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="310" y="63" fill="#f59e0b" font-size="9" text-anchor="middle" font-weight="bold">IMPACT ANALYSIS (auto-generated)</text>
      <text x="310" y="78" fill="#a0a0a0" font-size="8" text-anchor="middle">8 Silver tables at risk | 12 Gold MVs at risk</text>
      <text x="310" y="90" fill="#a0a0a0" font-size="8" text-anchor="middle">3 ML feature tables at risk | 2 ML models at risk</text>
      <text x="310" y="99" fill="#a0a0a0" font-size="7" text-anchor="middle">lineage refresh: &lt;10 seconds</text>
      <!-- Lineage graph -->
      <rect x="10" y="120" width="460" height="140" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="138" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">LINEAGE GRAPH — CHANGE PROPAGATION</text>
      <!-- Nodes -->
      <rect x="20" y="148" width="90" height="25" rx="3" fill="#ef4444" fill-opacity="0.2" stroke="#ef4444" stroke-width="1"/>
      <text x="65" y="164" fill="#ef4444" font-size="8" text-anchor="middle">bronze_events_raw</text>
      <rect x="150" y="140" width="90" height="22" rx="3" fill="#1a1d2e" stroke="#f59e0b" stroke-width="1"/>
      <text x="195" y="154" fill="#f59e0b" font-size="7" text-anchor="middle">silver_user_activity</text>
      <rect x="150" y="168" width="90" height="22" rx="3" fill="#1a1d2e" stroke="#f59e0b" stroke-width="1"/>
      <text x="195" y="182" fill="#f59e0b" font-size="7" text-anchor="middle">silver_content_views</text>
      <rect x="285" y="136" width="90" height="22" rx="3" fill="#1a1d2e" stroke="#f59e0b" stroke-width="1"/>
      <text x="330" y="150" fill="#f59e0b" font-size="7" text-anchor="middle">gold_daily_kpis</text>
      <rect x="285" y="162" width="90" height="22" rx="3" fill="#1a1d2e" stroke="#f59e0b" stroke-width="1"/>
      <text x="330" y="176" fill="#f59e0b" font-size="7" text-anchor="middle">gold_user_segments</text>
      <rect x="285" y="188" width="90" height="22" rx="3" fill="#1a1d2e" stroke="#f59e0b" stroke-width="1"/>
      <text x="330" y="202" fill="#f59e0b" font-size="7" text-anchor="middle">engagement_features</text>
      <rect x="400" y="150" width="60" height="22" rx="3" fill="#1a1d2e" stroke="#a855f7" stroke-width="1"/>
      <text x="430" y="164" fill="#a855f7" font-size="7" text-anchor="middle">rec_model</text>
      <line x1="110" y1="160" x2="150" y2="152" stroke="#ef4444" stroke-width="1" marker-end="url(#arr-red)"/>
      <line x1="110" y1="164" x2="150" y2="178" stroke="#ef4444" stroke-width="1" marker-end="url(#arr-red)"/>
      <line x1="240" y1="150" x2="285" y2="147" stroke="#f59e0b" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="240" y1="155" x2="285" y2="172" stroke="#f59e0b" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="240" y1="178" x2="285" y2="198" stroke="#f59e0b" stroke-width="1" marker-end="url(#arr)"/>
      <line x1="375" y1="147" x2="400" y2="158" stroke="#f59e0b" stroke-width="1" marker-end="url(#arr)"/>
      <text x="240" y="232" fill="#a0a0a0" font-size="8" text-anchor="middle">23 automated RCAs resolved in last 30 days</text>
      <text x="240" y="248" fill="#a0a0a0" font-size="8" text-anchor="middle">Pre-change impact report required for Bronze ALTER TABLE</text>
    </svg>`,

    // Step 5: SLA tracking
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f1117"/>
      <text x="240" y="22" fill="#ff6b35" font-size="11" text-anchor="middle" font-weight="bold">SLA COMPLIANCE — 30-DAY TRACKING</text>
      <!-- SLA bars -->
      <text x="20" y="46" fill="#a0a0a0" font-size="8">98%</text>
      <text x="20" y="86" fill="#a0a0a0" font-size="8">99%</text>
      <text x="20" y="126" fill="#a0a0a0" font-size="8">100%</text>
      <line x1="50" y1="42" x2="460" y2="42" stroke="#333" stroke-width="0.5" stroke-dasharray="3,3"/>
      <line x1="50" y1="82" x2="460" y2="82" stroke="#333" stroke-width="0.5" stroke-dasharray="3,3"/>
      <line x1="50" y1="122" x2="460" y2="122" stroke="#333" stroke-width="0.5" stroke-dasharray="3,3"/>
      <!-- Bars (from bottom) -->
      <rect x="65" y="44" width="50" height="78" rx="3" fill="#22c55e" fill-opacity="0.8"/>
      <text x="90" y="136" fill="#a0a0a0" font-size="8" text-anchor="middle">Bronze</text>
      <text x="90" y="34" fill="#22c55e" font-size="9" text-anchor="middle" font-weight="bold">99.98%</text>
      <rect x="145" y="54" width="50" height="68" rx="3" fill="#22c55e" fill-opacity="0.7"/>
      <text x="170" y="136" fill="#a0a0a0" font-size="8" text-anchor="middle">Silver</text>
      <text x="170" y="44" fill="#22c55e" font-size="9" text-anchor="middle" font-weight="bold">99.91%</text>
      <rect x="225" y="72" width="50" height="50" rx="3" fill="#f59e0b" fill-opacity="0.7"/>
      <text x="250" y="136" fill="#a0a0a0" font-size="8" text-anchor="middle">Gold</text>
      <text x="250" y="62" fill="#f59e0b" font-size="9" text-anchor="middle" font-weight="bold">99.74%</text>
      <rect x="305" y="84" width="50" height="38" rx="3" fill="#f59e0b" fill-opacity="0.6"/>
      <text x="330" y="136" fill="#a0a0a0" font-size="8" text-anchor="middle">ML Feat</text>
      <text x="330" y="74" fill="#f59e0b" font-size="9" text-anchor="middle" font-weight="bold">99.62%</text>
      <rect x="390" y="44" width="60" height="78" rx="3" fill="#3b82f6" fill-opacity="0.5" stroke="#3b82f6" stroke-width="1" stroke-dasharray="4,2"/>
      <text x="420" y="136" fill="#a0a0a0" font-size="8" text-anchor="middle">Target</text>
      <text x="420" y="34" fill="#3b82f6" font-size="9" text-anchor="middle" font-weight="bold">99.9%</text>
      <!-- Breach causes -->
      <rect x="10" y="155" width="460" height="130" rx="5" fill="#1e2030" stroke="#333" stroke-width="1"/>
      <text x="240" y="173" fill="#ff6b35" font-size="9" text-anchor="middle" font-weight="bold">SLA BREACH CAUSES (last 30 days)</text>
      <!-- Pie-like bar chart -->
      <rect x="20" y="182" width="185" height="16" rx="3" fill="#ef4444" fill-opacity="0.7"/>
      <text x="212" y="194" fill="#ef4444" font-size="8">Infrastructure 41%</text>
      <rect x="20" y="204" width="150" height="16" rx="3" fill="#f59e0b" fill-opacity="0.7"/>
      <text x="177" y="216" fill="#f59e0b" font-size="8">Upstream delay 33%</text>
      <rect x="20" y="226" width="82" height="16" rx="3" fill="#3b82f6" fill-opacity="0.7"/>
      <text x="109" y="238" fill="#3b82f6" font-size="8">Data quality 18%</text>
      <rect x="20" y="248" width="37" height="16" rx="3" fill="#a855f7" fill-opacity="0.7"/>
      <text x="64" y="260" fill="#a855f7" font-size="8">Pipeline bugs 8%</text>
      <text x="240" y="276" fill="#a0a0a0" font-size="8" text-anchor="middle">Auto-report sent monthly to VP Engineering</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.pm-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.pm-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.pm-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="pm-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="pm-header module-header">
        <div class="module-tag" style="background:var(--delta)">DLT PIPELINES</div>
        <h2 class="module-title">Pipeline Monitoring</h2>
        <p class="module-subtitle">End-to-end observability for MediaStream DLT pipelines — quality, SLAs, and alerting</p>
      </div>
      <div class="pm-pills step-pills">${pills}</div>
      <div class="pm-diagram diagram-frame"></div>
      <div class="pm-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'pm-page page-enter';
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
    container.querySelectorAll('.pm-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['pipeline-monitoring'] = {
    id: 'pipeline-monitoring',
    title: 'Pipeline Monitoring',
    group: 'DLT Pipelines',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
