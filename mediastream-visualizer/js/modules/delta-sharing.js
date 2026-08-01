(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'What is Delta Sharing',
      desc: 'Delta Sharing is an open protocol for sharing Delta tables across organizations, clouds, and platforms — without copying data.',
      detail: 'Delta Sharing works through a REST API secured with short-lived tokens. Recipients query the shared tables directly in their own compute (Databricks, Spark, Pandas, PowerBI) — data stays in the provider\'s storage.',
    },
    {
      label: 'Provider / Recipient / Share',
      desc: 'Three objects model the sharing: Share (collection of tables), Recipient (who gets access), GRANT (what they can do).',
      detail: 'Provider creates a Share and adds tables to it. Recipient is identified by an activation token. Grant connects recipient to share. Recipient activates their token once and gets a credential profile — no OAuth, no IAM policies.',
    },
    {
      label: 'CREATE SHARE + ADD TABLE',
      desc: 'CREATE SHARE defines the sharing bundle; ADD TABLE populates it with Delta tables.',
      detail: 'You can share a full table, a partition, or a time-travel snapshot. MediaStream shares `gold.content_perf` with ad-agency partners so they can measure campaign performance without accessing raw user data.',
    },
    {
      label: 'CREATE RECIPIENT',
      desc: 'Recipients are created with IP allowlisting and expiration — access is time-bound and audited.',
      detail: 'Every recipient access is logged in system.access.audit. You can revoke a recipient instantly without changing any data or storage. Recipient tokens expire — auto-rotate on a schedule for partner SLAs.',
    },
    {
      label: 'Cross-Cloud Sharing',
      desc: 'Delta Sharing works across clouds and platforms — AWS, Azure, GCP, or any Delta Sharing REST client.',
      detail: 'MediaStream (AWS) shares gold tables with an Azure-based ad-tech partner. No S3 cross-account setup, no VPC peering, no ETL. The partner reads directly with their Azure Databricks workspace using the credential profile.',
    },
    {
      label: 'Recipient Audit',
      desc: 'Every query by every recipient is logged — what they queried, when, how many bytes transferred.',
      detail: 'GDPR compliance: if a partner over-reads shared data, UC audit logs capture it. MediaStream checks recipient query patterns weekly — anomalous access patterns (sudden full-table scans) trigger an alert.',
    },
  ];

  const DIAGRAMS = [
    // Step 0: What is Delta Sharing
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="22" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">DELTA SHARING</text>
      <text x="240" y="36" text-anchor="middle" fill="#64748b" font-size="8">Open protocol · No data copies · Cross-cloud · Cross-org</text>
      <!-- Provider side -->
      <rect x="16" y="48" width="180" height="140" rx="6" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="106" y="66" text-anchor="middle" fill="#ff6b35" font-size="10" font-weight="bold">PROVIDER</text>
      <text x="106" y="82" text-anchor="middle" fill="#94a3b8" font-size="8">MediaStream (AWS)</text>
      <rect x="26" y="90" width="160" height="40" rx="4" fill="#0f172a"/>
      <text x="106" y="108" text-anchor="middle" fill="#4ade80" font-size="8">Delta Tables (S3)</text>
      <text x="106" y="122" text-anchor="middle" fill="#64748b" font-size="7">gold.content_perf</text>
      <text x="106" y="150" text-anchor="middle" fill="#94a3b8" font-size="8">Delta Sharing Server</text>
      <text x="106" y="166" text-anchor="middle" fill="#64748b" font-size="7">(built into UC · REST API)</text>
      <text x="106" y="180" text-anchor="middle" fill="#64748b" font-size="7">s3:// never exposed</text>

      <!-- Recipient side -->
      <rect x="284" y="48" width="180" height="140" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="374" y="66" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="bold">RECIPIENT</text>
      <text x="374" y="82" text-anchor="middle" fill="#94a3b8" font-size="8">Ad Agency (Azure/GCP/other)</text>
      <text x="374" y="106" text-anchor="middle" fill="#94a3b8" font-size="8">Databricks</text>
      <text x="374" y="120" text-anchor="middle" fill="#94a3b8" font-size="8">Apache Spark</text>
      <text x="374" y="134" text-anchor="middle" fill="#94a3b8" font-size="8">Pandas / Python</text>
      <text x="374" y="148" text-anchor="middle" fill="#94a3b8" font-size="8">Power BI / Tableau</text>
      <text x="374" y="166" text-anchor="middle" fill="#64748b" font-size="7">any Delta Sharing client</text>
      <text x="374" y="180" text-anchor="middle" fill="#64748b" font-size="7">own compute, own cloud</text>

      <!-- Arrow through the middle -->
      <rect x="196" y="98" width="88" height="40" rx="4" fill="#a855f7" opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <text x="240" y="114" text-anchor="middle" fill="#a855f7" font-size="8" font-weight="bold">REST API</text>
      <text x="240" y="128" text-anchor="middle" fill="#94a3b8" font-size="7">credential profile</text>
      <!-- Line arrows -->
      <line x1="196" y1="118" x2="196" y2="118" stroke="#a855f7" stroke-width="1"/>
      <!-- Provider → API -->
      <line x1="196" y1="118" x2="196" y2="118"/>
      <!-- What travels -->
      <text x="240" y="220" text-anchor="middle" fill="#94a3b8" font-size="8">What crosses the wire: presigned S3 URLs for Parquet files</text>
      <text x="240" y="234" text-anchor="middle" fill="#94a3b8" font-size="8">What does NOT cross: raw S3 credentials, IAM roles, VPC access</text>
      <!-- Open protocol note -->
      <rect x="70" y="248" width="340" height="26" rx="4" fill="#1e293b" stroke="#4ade80" stroke-width="1"/>
      <text x="240" y="265" text-anchor="middle" fill="#4ade80" font-size="8">Open protocol (Linux Foundation) · Works with non-Databricks recipients</text>
    </svg>`,

    // Step 1: Provider/Recipient/Share model
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">SHARE / RECIPIENT / GRANT MODEL</text>
      <!-- Share box -->
      <rect x="16" y="36" width="140" height="100" rx="5" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="86" y="54" text-anchor="middle" fill="#ff6b35" font-size="9" font-weight="bold">SHARE</text>
      <text x="86" y="72" text-anchor="middle" fill="#94a3b8" font-size="8">ad_agency_share</text>
      <text x="86" y="88" text-anchor="middle" fill="#64748b" font-size="7">gold.content_perf</text>
      <text x="86" y="102" text-anchor="middle" fill="#64748b" font-size="7">gold.campaign_stats</text>
      <text x="86" y="116" text-anchor="middle" fill="#64748b" font-size="7">(no raw user data)</text>
      <text x="86" y="128" text-anchor="middle" fill="#64748b" font-size="7">partitioned by date</text>

      <!-- Recipient box -->
      <rect x="170" y="36" width="140" height="100" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="240" y="54" text-anchor="middle" fill="#38bdf8" font-size="9" font-weight="bold">RECIPIENT</text>
      <text x="240" y="72" text-anchor="middle" fill="#94a3b8" font-size="8">ad_agency_alpha</text>
      <text x="240" y="88" text-anchor="middle" fill="#64748b" font-size="7">IP allowlist: 34.12.0.0/16</text>
      <text x="240" y="102" text-anchor="middle" fill="#64748b" font-size="7">expiry: 2026-12-31</text>
      <text x="240" y="116" text-anchor="middle" fill="#64748b" font-size="7">token: one-time activate</text>

      <!-- Grant -->
      <rect x="324" y="36" width="140" height="100" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="394" y="54" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">GRANT</text>
      <text x="394" y="72" text-anchor="middle" fill="#94a3b8" font-size="8">GRANT SELECT</text>
      <text x="394" y="88" text-anchor="middle" fill="#94a3b8" font-size="8">ON SHARE ad_agency_share</text>
      <text x="394" y="104" text-anchor="middle" fill="#94a3b8" font-size="8">TO RECIPIENT</text>
      <text x="394" y="118" text-anchor="middle" fill="#94a3b8" font-size="8">ad_agency_alpha;</text>

      <!-- Activation flow -->
      <rect x="16" y="152" width="448" height="102" rx="5" fill="#1e293b"/>
      <text x="240" y="170" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Recipient Activation (one-time)</text>
      <text x="26" y="188" fill="#94a3b8" font-size="8">1. MediaStream: CREATE RECIPIENT ad_agency_alpha → returns activation_link</text>
      <text x="26" y="202" fill="#94a3b8" font-size="8">2. Agency clicks link → downloads credential.json (bearer token)</text>
      <text x="26" y="216" fill="#94a3b8" font-size="8">3. Agency configures Databricks: spark.databricks.delta.sharing.profile=/path/cred.json</text>
      <text x="26" y="230" fill="#94a3b8" font-size="8">4. Agency queries: SELECT * FROM delta_sharing.ad_agency_share.content_perf</text>
      <text x="240" y="250" text-anchor="middle" fill="#64748b" font-size="7">No IAM, no VPC peering, no S3 bucket policies — just a bearer token</text>
    </svg>`,

    // Step 2: CREATE SHARE + ADD TABLE
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">CREATE SHARE + ADD TABLES</text>
      <!-- SQL block -->
      <rect x="16" y="30" width="448" height="188" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">MediaStream ad-agency share setup</text>
      <text x="26" y="66" fill="#64748b" font-size="8">-- 1. Create the share</text>
      <text x="26" y="80" fill="#a855f7" font-size="8">CREATE SHARE ad_agency_share</text>
      <text x="26" y="94" fill="#94a3b8" font-size="8">  COMMENT 'Aggregated content performance for ad measurement';</text>
      <text x="26" y="112" fill="#64748b" font-size="8">-- 2. Add table (partitioned — recipient gets only dates they need)</text>
      <text x="26" y="126" fill="#a855f7" font-size="8">ALTER SHARE ad_agency_share ADD TABLE prod.gold.content_perf</text>
      <text x="26" y="140" fill="#94a3b8" font-size="8">  PARTITION (date &gt;= '2025-01-01')  -- last 18 months only</text>
      <text x="26" y="154" fill="#94a3b8" font-size="8">  AS content_perf;                   -- alias for recipient</text>
      <text x="26" y="172" fill="#64748b" font-size="8">-- 3. Add second table (no PII — aggregated only)</text>
      <text x="26" y="186" fill="#a855f7" font-size="8">ALTER SHARE ad_agency_share ADD TABLE prod.gold.campaign_stats AS campaign_stats;</text>
      <text x="26" y="202" fill="#64748b" font-size="8">-- 4. Verify</text>
      <text x="26" y="216" fill="#a855f7" font-size="8">SHOW ALL IN SHARE ad_agency_share;</text>
      <!-- PII note -->
      <rect x="16" y="228" width="448" height="44" rx="4" fill="#ef4444" opacity="0.1" stroke="#ef4444" stroke-width="1"/>
      <text x="240" y="246" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="bold">What MediaStream does NOT share</text>
      <text x="26" y="264" fill="#94a3b8" font-size="8">bronze/silver tables (raw events) · user_id columns · watch_history · IP addresses · email</text>
    </svg>`,

    // Step 3: CREATE RECIPIENT
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">CREATE RECIPIENT</text>
      <!-- SQL -->
      <rect x="16" y="30" width="448" height="130" rx="5" fill="#1e293b"/>
      <text x="26" y="48" fill="#64748b" font-size="8">-- Create recipient with IP allowlist + expiration</text>
      <text x="26" y="62" fill="#a855f7" font-size="8">CREATE RECIPIENT ad_agency_alpha</text>
      <text x="26" y="76" fill="#94a3b8" font-size="8">  IP_ADDRESS_LIST ('34.12.0.0/16', '34.13.0.0/16')  -- agency CIDR blocks</text>
      <text x="26" y="90" fill="#94a3b8" font-size="8">  EXPIRATION_TIME '2026-12-31T23:59:59Z'</text>
      <text x="26" y="104" fill="#94a3b8" font-size="8">  COMMENT 'Ad Agency Alpha — MNDA signed 2024-01-15 — contact: data@agency.com';</text>
      <text x="26" y="122" fill="#64748b" font-size="8">-- Grant share to recipient</text>
      <text x="26" y="136" fill="#a855f7" font-size="8">GRANT SELECT ON SHARE ad_agency_share TO RECIPIENT ad_agency_alpha;</text>
      <text x="26" y="150" fill="#64748b" font-size="8">-- Returns one-time activation link (URL with embedded token)</text>
      <!-- Revocation -->
      <rect x="16" y="170" width="448" height="60" rx="5" fill="#1e293b"/>
      <text x="240" y="188" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Instant Revocation (partner off-boarded)</text>
      <text x="26" y="204" fill="#a855f7" font-size="8">REVOKE SELECT ON SHARE ad_agency_share FROM RECIPIENT ad_agency_alpha;</text>
      <text x="26" y="220" fill="#94a3b8" font-size="8">-- or --</text>
      <text x="26" y="222" fill="#a855f7" font-size="8">ALTER RECIPIENT ad_agency_alpha SET EXPIRATION_TIME '2025-01-01T00:00:00Z';</text>
      <!-- Zero data change note -->
      <rect x="16" y="242" width="448" height="30" rx="4" fill="#4ade80" opacity="0.1" stroke="#4ade80" stroke-width="1"/>
      <text x="240" y="252" text-anchor="middle" fill="#4ade80" font-size="8">Revoking access does NOT delete or move any data — zero storage ops</text>
      <text x="240" y="268" text-anchor="middle" fill="#64748b" font-size="7">Next recipient query returns 401 Unauthorized · effect is immediate</text>
    </svg>`,

    // Step 4: Cross-cloud sharing
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">CROSS-CLOUD DELTA SHARING</text>
      <!-- AWS provider -->
      <rect x="16" y="36" width="150" height="120" rx="5" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="91" y="56" text-anchor="middle" fill="#ff6b35" font-size="9" font-weight="bold">MediaStream</text>
      <text x="91" y="72" text-anchor="middle" fill="#ff6b35" font-size="8">AWS us-east-1</text>
      <text x="91" y="92" text-anchor="middle" fill="#94a3b8" font-size="8">S3 Delta tables</text>
      <text x="91" y="106" text-anchor="middle" fill="#94a3b8" font-size="8">UC + Delta Sharing</text>
      <text x="91" y="120" text-anchor="middle" fill="#64748b" font-size="7">provider</text>
      <text x="91" y="136" text-anchor="middle" fill="#64748b" font-size="7">REST endpoint</text>
      <text x="91" y="150" text-anchor="middle" fill="#64748b" font-size="7">presigned S3 URLs</text>

      <!-- Recipients -->
      <rect x="186" y="36" width="130" height="56" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="251" y="54" text-anchor="middle" fill="#38bdf8" font-size="9" font-weight="bold">Ad Agency</text>
      <text x="251" y="70" text-anchor="middle" fill="#94a3b8" font-size="8">Azure West Europe</text>
      <text x="251" y="84" text-anchor="middle" fill="#64748b" font-size="7">Databricks workspace</text>

      <rect x="186" y="102" width="130" height="56" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="251" y="120" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">Research Partner</text>
      <text x="251" y="136" text-anchor="middle" fill="#94a3b8" font-size="8">GCP us-central1</text>
      <text x="251" y="150" text-anchor="middle" fill="#64748b" font-size="7">Apache Spark cluster</text>

      <rect x="334" y="36" width="130" height="56" rx="5" fill="#1e293b" stroke="#a855f7" stroke-width="1.5"/>
      <text x="399" y="54" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">Internal BI</text>
      <text x="399" y="70" text-anchor="middle" fill="#94a3b8" font-size="8">Same AWS region</text>
      <text x="399" y="84" text-anchor="middle" fill="#64748b" font-size="7">Power BI connector</text>

      <rect x="334" y="102" width="130" height="56" rx="5" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5"/>
      <text x="399" y="120" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">ML Research</text>
      <text x="399" y="136" text-anchor="middle" fill="#94a3b8" font-size="8">On-prem GPU cluster</text>
      <text x="399" y="150" text-anchor="middle" fill="#64748b" font-size="7">pandas + delta-sharing-py</text>

      <!-- Lines from provider to recipients -->
      <line x1="166" y1="64" x2="186" y2="64" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="4,2"/>
      <line x1="166" y1="64" x2="176" y2="64" stroke="#a855f7" stroke-width="1.5"/>
      <line x1="176" y1="64" x2="186" y2="64" stroke="#a855f7" stroke-width="1.5"/>
      <line x1="166" y1="130" x2="186" y2="130" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="4,2"/>
      <line x1="316" y1="64" x2="334" y2="64" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="4,2"/>
      <line x1="316" y1="130" x2="334" y2="130" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="4,2"/>

      <!-- Bottom note -->
      <rect x="16" y="172" width="448" height="90" rx="5" fill="#1e293b"/>
      <text x="240" y="190" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">No Cross-Cloud Infrastructure Required</text>
      <text x="26" y="208" fill="#4ade80" font-size="8">✓ No S3 cross-account bucket policies</text>
      <text x="26" y="222" fill="#4ade80" font-size="8">✓ No VPC peering or Transit Gateway</text>
      <text x="26" y="236" fill="#4ade80" font-size="8">✓ No data ETL or replication (data stays in S3)</text>
      <text x="26" y="250" fill="#4ade80" font-size="8">✓ No vendor lock-in — open Delta Sharing protocol</text>
    </svg>`,

    // Step 5: Recipient audit
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">RECIPIENT ACCESS AUDIT</text>
      <!-- Query -->
      <rect x="16" y="30" width="448" height="64" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Audit recipient query patterns</text>
      <text x="26" y="66" fill="#a855f7" font-size="8">SELECT recipient_name, action_name, table_full_name,</text>
      <text x="26" y="80" fill="#94a3b8" font-size="8">       event_time, source_ip_address, bytes_scanned</text>
      <text x="26" y="94" fill="#94a3b8" font-size="8">FROM system.access.audit WHERE action_name = 'deltaSharingQueryTable'</text>
      <!-- Normal activity -->
      <rect x="16" y="106" width="448" height="72" rx="5" fill="#1e293b"/>
      <text x="240" y="124" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">Normal Activity (ad_agency_alpha)</text>
      <text x="26" y="140" fill="#94a3b8" font-size="8">event_time: 2025-01-31 09:00 UTC · table: content_perf · bytes: 2.1 GB</text>
      <text x="26" y="154" fill="#94a3b8" font-size="8">event_time: 2025-01-31 09:02 UTC · table: campaign_stats · bytes: 340 MB</text>
      <text x="26" y="168" fill="#64748b" font-size="7">→ daily scheduled report run · expected pattern · no alert</text>
      <!-- Anomalous activity -->
      <rect x="16" y="188" width="448" height="72" rx="5" fill="#ef4444" opacity="0.1" stroke="#ef4444" stroke-width="1.5"/>
      <text x="240" y="206" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="bold">Anomalous Activity — Alert Triggered</text>
      <text x="26" y="222" fill="#ef4444" font-size="8">event_time: 2025-02-15 03:22 UTC · table: content_perf · bytes: 487 GB</text>
      <text x="26" y="236" fill="#ef4444" font-size="8">ip_address: 185.43.x.x (NOT in allowlist 34.12.0.0/16)</text>
      <text x="26" y="250" fill="#ef4444" font-size="8">→ 3AM full-table scan from unknown IP → auto-revoke + security ticket</text>
      <!-- Response -->
      <text x="240" y="276" text-anchor="middle" fill="#fbbf24" font-size="7">MediaStream runs weekly audit query · anomalies trigger PagerDuty · auto-revoke on IP mismatch</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.dsh-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--unity)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.dsh-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.dsh-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="dsh-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="dsh-header module-header">
        <div class="module-tag" style="background:var(--unity)">UNITY CATALOG</div>
        <h2 class="module-title">Delta Sharing</h2>
        <p class="module-subtitle">Cross-org data sharing · no copies · open protocol · audited</p>
      </div>
      <div class="dsh-pills step-pills">${pills}</div>
      <div class="dsh-diagram diagram-frame"></div>
      <div class="dsh-info info-panel" style="border-left:3px solid var(--unity)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'dsh-page page-enter';
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

    container.querySelectorAll('.dsh-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['delta-sharing'] = {
    id: 'delta-sharing',
    title: 'Delta Sharing',
    group: 'Unity Catalog',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
