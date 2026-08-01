(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'What UC Audits',
      desc: 'Unity Catalog automatically logs every data access, permission change, and governance event — no setup required.',
      detail: 'UC captures: table reads/writes, GRANT/REVOKE changes, column mask evaluations, row filter evaluations, Delta Sharing queries, metastore admin actions. Stored in system.access.audit — queryable with SQL.',
    },
    {
      label: 'Audit Log Schema',
      desc: 'system.access.audit has a rich schema — event time, user, action, resource, request params, response status.',
      detail: 'Key columns: event_time (UTC), user_identity (email), action_name, request_params (JSON), response (status + error), source_ip_address, workspace_id, service_name. Partitioned by date — efficient range queries.',
    },
    {
      label: 'Query Patterns',
      desc: 'Common compliance queries: who accessed what table, failed access attempts, privilege changes.',
      detail: 'MediaStream data governance runs 5 standard audit queries weekly: sensitive table access (by non-privileged users), privilege escalations, failed access attempts, Delta Sharing recipient usage, VACUUM executions.',
    },
    {
      label: 'Suspicious Access',
      desc: 'Detect anomalous patterns: unusual hours, bulk scans, access from unexpected IPs or new users.',
      detail: 'MediaStream\'s security team built a Databricks workflow that runs nightly: flag any user who accessed a PII-containing table outside their region, queries above 10 GB after 11pm, or first-ever access to a Gold table by a non-analyst.',
    },
    {
      label: 'Compliance Reporting',
      desc: 'Generate GDPR Article 30 records-of-processing from audit logs — who processed what data, when.',
      detail: 'GDPR Art.30 requires a log of all processing activities. MediaStream auto-generates monthly reports from system.access.audit — who accessed user_profiles, user_sessions, and payment tables — exported to compliance team.',
    },
    {
      label: 'Retention Policy',
      desc: 'Audit logs are retained 365 days by default in system.access.audit — older data can be archived to S3.',
      detail: 'MediaStream policy: 365 days in hot tier (system.access.audit, queryable), 7 years in cold tier (S3 Glacier, GDPR legal hold). A Databricks workflow exports audit logs to `s3://mediastream-compliance-archive/audit/` monthly.',
    },
  ];

  const DIAGRAMS = [
    // Step 0: What UC audits
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="22" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">UNITY CATALOG AUDIT LOGGING</text>
      <text x="240" y="36" text-anchor="middle" fill="#64748b" font-size="8">Automatic · Zero setup · Everything logged · SQL queryable</text>
      <!-- Actions captured -->
      <rect x="16" y="48" width="448" height="160" rx="5" fill="#1e293b"/>
      <text x="240" y="66" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Every UC Action is Logged</text>
      <!-- Grid of actions -->
      <rect x="26" y="74" width="190" height="18" rx="3" fill="#38bdf8" opacity="0.1"/>
      <text x="121" y="87" text-anchor="middle" fill="#38bdf8" font-size="8">Table reads (SELECT)</text>
      <rect x="262" y="74" width="190" height="18" rx="3" fill="#38bdf8" opacity="0.1"/>
      <text x="357" y="87" text-anchor="middle" fill="#38bdf8" font-size="8">Table writes (INSERT/MERGE/DELETE)</text>

      <rect x="26" y="96" width="190" height="18" rx="3" fill="#fbbf24" opacity="0.1"/>
      <text x="121" y="109" text-anchor="middle" fill="#fbbf24" font-size="8">GRANT / REVOKE changes</text>
      <rect x="262" y="96" width="190" height="18" rx="3" fill="#fbbf24" opacity="0.1"/>
      <text x="357" y="109" text-anchor="middle" fill="#fbbf24" font-size="8">Column mask evaluations</text>

      <rect x="26" y="118" width="190" height="18" rx="3" fill="#a855f7" opacity="0.1"/>
      <text x="121" y="131" text-anchor="middle" fill="#a855f7" font-size="8">Row filter evaluations</text>
      <rect x="262" y="118" width="190" height="18" rx="3" fill="#a855f7" opacity="0.1"/>
      <text x="357" y="131" text-anchor="middle" fill="#a855f7" font-size="8">Delta Sharing queries</text>

      <rect x="26" y="140" width="190" height="18" rx="3" fill="#4ade80" opacity="0.1"/>
      <text x="121" y="153" text-anchor="middle" fill="#4ade80" font-size="8">Metastore admin ops</text>
      <rect x="262" y="140" width="190" height="18" rx="3" fill="#4ade80" opacity="0.1"/>
      <text x="357" y="153" text-anchor="middle" fill="#4ade80" font-size="8">VACUUM executions</text>

      <rect x="26" y="162" width="190" height="18" rx="3" fill="#ef4444" opacity="0.1"/>
      <text x="121" y="175" text-anchor="middle" fill="#ef4444" font-size="8">Failed access (403/401)</text>
      <rect x="262" y="162" width="190" height="18" rx="3" fill="#ef4444" opacity="0.1"/>
      <text x="357" y="175" text-anchor="middle" fill="#ef4444" font-size="8">Credential activations</text>

      <!-- Where it goes -->
      <rect x="16" y="220" width="448" height="42" rx="5" fill="#1e293b" stroke="#a855f7" stroke-width="1"/>
      <text x="240" y="238" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">system.access.audit</text>
      <text x="240" y="254" text-anchor="middle" fill="#94a3b8" font-size="8">queryable with standard SQL · retention 365 days · no ETL needed</text>
      <text x="240" y="278" text-anchor="middle" fill="#64748b" font-size="7">MediaStream generates 2.4M audit events per day (all workspaces combined)</text>
    </svg>`,

    // Step 1: Audit log schema
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">AUDIT LOG SCHEMA</text>
      <text x="240" y="34" text-anchor="middle" fill="#64748b" font-size="8">system.access.audit</text>
      <!-- Schema table -->
      <rect x="16" y="44" width="448" height="186" rx="5" fill="#1e293b"/>
      <rect x="16" y="44" width="448" height="18" rx="4" fill="#334155"/>
      <text x="130" y="57" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">Column</text>
      <text x="320" y="57" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">Type / Example</text>

      <text x="26" y="76" fill="#38bdf8" font-size="8">event_time</text>
      <text x="200" y="76" fill="#94a3b8" font-size="8">TIMESTAMP  2025-01-31 09:00:12.347 UTC</text>

      <text x="26" y="92" fill="#38bdf8" font-size="8">user_identity</text>
      <text x="200" y="92" fill="#94a3b8" font-size="8">STRING  alice@mediastream.com</text>

      <text x="26" y="108" fill="#38bdf8" font-size="8">action_name</text>
      <text x="200" y="108" fill="#94a3b8" font-size="8">STRING  getTable / updatePermissions / deleteTable</text>

      <text x="26" y="124" fill="#38bdf8" font-size="8">request_params</text>
      <text x="200" y="124" fill="#94a3b8" font-size="8">STRING (JSON)  {"table":"prod.gold.daily_kpis"}</text>

      <text x="26" y="140" fill="#38bdf8" font-size="8">response</text>
      <text x="200" y="140" fill="#94a3b8" font-size="8">STRUCT  status_code INT, error_message STRING</text>

      <text x="26" y="156" fill="#38bdf8" font-size="8">source_ip_address</text>
      <text x="200" y="156" fill="#94a3b8" font-size="8">STRING  34.12.45.67</text>

      <text x="26" y="172" fill="#38bdf8" font-size="8">workspace_id</text>
      <text x="200" y="172" fill="#94a3b8" font-size="8">STRING  prod-analytics · data-science</text>

      <text x="26" y="188" fill="#38bdf8" font-size="8">service_name</text>
      <text x="200" y="188" fill="#94a3b8" font-size="8">STRING  unityCatalog / deltaSharingService</text>

      <text x="26" y="204" fill="#38bdf8" font-size="8">request_id</text>
      <text x="200" y="204" fill="#94a3b8" font-size="8">STRING  UUID for correlation with Spark job logs</text>

      <text x="26" y="220" fill="#64748b" font-size="7">+ 12 more columns: cluster_id, notebook_path, user_agent, session_id...</text>

      <!-- Partition note -->
      <rect x="16" y="244" width="448" height="30" rx="4" fill="#1e293b" stroke="#fbbf24" stroke-width="1"/>
      <text x="240" y="264" text-anchor="middle" fill="#fbbf24" font-size="8">Partitioned by date — always filter on event_time for fast queries</text>
    </svg>`,

    // Step 2: Query patterns
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">COMMON AUDIT QUERY PATTERNS</text>
      <!-- Query 1 -->
      <rect x="16" y="30" width="448" height="52" rx="4" fill="#1e293b"/>
      <text x="26" y="46" fill="#64748b" font-size="8">-- Who accessed user_profiles in the last 7 days?</text>
      <text x="26" y="60" fill="#a855f7" font-size="8">SELECT user_identity, COUNT(*) reads, MAX(event_time) last_access</text>
      <text x="26" y="74" fill="#94a3b8" font-size="8">FROM system.access.audit WHERE request_params LIKE '%user_profiles%'</text>
      <text x="26" y="82" fill="#94a3b8" font-size="8">  AND event_time &gt; CURRENT_DATE - INTERVAL 7 DAYS GROUP BY 1 ORDER BY 2 DESC;</text>
      <!-- Query 2 -->
      <rect x="16" y="90" width="448" height="46" rx="4" fill="#1e293b"/>
      <text x="26" y="106" fill="#64748b" font-size="8">-- Privilege escalations (GRANT events)</text>
      <text x="26" y="120" fill="#a855f7" font-size="8">SELECT event_time, user_identity, request_params</text>
      <text x="26" y="134" fill="#94a3b8" font-size="8">FROM system.access.audit WHERE action_name = 'updatePermissions' AND event_time &gt; CURRENT_DATE - 30;</text>
      <!-- Query 3 -->
      <rect x="16" y="144" width="448" height="46" rx="4" fill="#1e293b"/>
      <text x="26" y="160" fill="#64748b" font-size="8">-- Failed access attempts (potential unauthorized probing)</text>
      <text x="26" y="174" fill="#a855f7" font-size="8">SELECT user_identity, action_name, request_params, source_ip_address</text>
      <text x="26" y="188" fill="#94a3b8" font-size="8">FROM system.access.audit WHERE response.status_code = 403 ORDER BY event_time DESC LIMIT 50;</text>
      <!-- MediaStream schedule -->
      <rect x="16" y="200" width="448" height="60" rx="5" fill="#1e293b" stroke="#a855f7" stroke-width="1"/>
      <text x="240" y="218" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">MediaStream Audit Schedule</text>
      <text x="26" y="234" fill="#94a3b8" font-size="8">Daily:   Failed access · PII table queries outside region</text>
      <text x="26" y="248" fill="#94a3b8" font-size="8">Weekly:  Privilege changes · Delta Sharing recipient usage</text>
      <text x="26" y="260" fill="#94a3b8" font-size="8">Monthly: GDPR Art.30 report · Compliance export to S3</text>
    </svg>`,

    // Step 3: Suspicious access detection
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">SUSPICIOUS ACCESS DETECTION</text>
      <!-- Detection rules -->
      <rect x="16" y="30" width="448" height="152" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">MediaStream Nightly Detection Rules</text>
      <rect x="26" y="54" width="428" height="20" rx="3" fill="#ef4444" opacity="0.1"/>
      <text x="30" y="68" fill="#ef4444" font-size="8">RULE 1: EU PII table accessed by non-EU group analyst</text>
      <rect x="26" y="78" width="428" height="20" rx="3" fill="#ef4444" opacity="0.1"/>
      <text x="30" y="92" fill="#ef4444" font-size="8">RULE 2: Query scanning &gt;10 GB after 23:00 UTC by non-engineer</text>
      <rect x="26" y="102" width="428" height="20" rx="3" fill="#ef4444" opacity="0.1"/>
      <text x="30" y="116" fill="#ef4444" font-size="8">RULE 3: First-ever access to Gold table by user not in analysts group</text>
      <rect x="26" y="126" width="428" height="20" rx="3" fill="#fbbf24" opacity="0.1"/>
      <text x="30" y="140" fill="#fbbf24" font-size="8">RULE 4: GRANT on prod.* executed by non-admin user</text>
      <rect x="26" y="150" width="428" height="20" rx="3" fill="#fbbf24" opacity="0.1"/>
      <text x="30" y="164" fill="#fbbf24" font-size="8">RULE 5: Delta Sharing query from IP outside recipient allowlist</text>
      <!-- Detection query snippet -->
      <rect x="16" y="192" width="448" height="62" rx="5" fill="#1e293b"/>
      <text x="26" y="208" fill="#64748b" font-size="8">-- Rule 1: EU PII accessed by non-EU user</text>
      <text x="26" y="222" fill="#a855f7" font-size="8">SELECT * FROM system.access.audit a JOIN prod.shared_governance.user_regions u</text>
      <text x="26" y="236" fill="#94a3b8" font-size="8">  ON a.user_identity = u.email</text>
      <text x="26" y="250" fill="#94a3b8" font-size="8">WHERE a.request_params LIKE '%user_profiles%' AND u.region NOT LIKE 'EU%';</text>
      <!-- Alert -->
      <rect x="16" y="264" width="448" height="22" rx="4" fill="#1e293b" stroke="#ef4444" stroke-width="1"/>
      <text x="240" y="279" text-anchor="middle" fill="#ef4444" font-size="8">Any match → PagerDuty alert + auto-REVOKE · Zero-tolerance PII policy</text>
    </svg>`,

    // Step 4: Compliance reporting
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">GDPR COMPLIANCE REPORTING</text>
      <text x="240" y="34" text-anchor="middle" fill="#64748b" font-size="8">GDPR Article 30: Records of Processing Activities</text>
      <!-- GDPR query -->
      <rect x="16" y="44" width="448" height="78" rx="5" fill="#1e293b"/>
      <text x="240" y="62" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Monthly Art.30 Report Query</text>
      <text x="26" y="80" fill="#a855f7" font-size="8">SELECT DATE_TRUNC('month', event_time) month,</text>
      <text x="26" y="94" fill="#94a3b8" font-size="8">       user_identity, request_params:table AS table_accessed,</text>
      <text x="26" y="108" fill="#94a3b8" font-size="8">       COUNT(*) access_count, MAX(event_time) last_access</text>
      <text x="26" y="122" fill="#94a3b8" font-size="8">FROM system.access.audit WHERE request_params LIKE '%user_profiles%'</text>
      <text x="26" y="118" fill="#94a3b8" font-size="8">  OR request_params LIKE '%user_sessions%' OR request_params LIKE '%payment%'</text>
      <!-- Report sample -->
      <rect x="16" y="136" width="448" height="94" rx="5" fill="#1e293b"/>
      <text x="240" y="154" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Sample Output (January 2025)</text>
      <rect x="16" y="158" width="448" height="18" rx="3" fill="#334155"/>
      <text x="100" y="171" text-anchor="middle" fill="#94a3b8" font-size="7" font-weight="bold">user_identity</text>
      <text x="260" y="171" text-anchor="middle" fill="#94a3b8" font-size="7" font-weight="bold">table_accessed</text>
      <text x="410" y="171" text-anchor="middle" fill="#94a3b8" font-size="7" font-weight="bold">access_count</text>
      <text x="26" y="191" fill="#94a3b8" font-size="7">alice@mediastream.com</text>
      <text x="180" y="191" fill="#94a3b8" font-size="7">prod.silver.user_profiles</text>
      <text x="420" y="191" fill="#94a3b8" font-size="7">342</text>
      <text x="26" y="205" fill="#94a3b8" font-size="7">dbt-prod-svc@mediastream.com</text>
      <text x="180" y="205" fill="#94a3b8" font-size="7">prod.silver.user_sessions</text>
      <text x="420" y="205" fill="#94a3b8" font-size="7">2,847</text>
      <text x="26" y="219" fill="#94a3b8" font-size="7">ml-train@mediastream.com</text>
      <text x="180" y="219" fill="#94a3b8" font-size="7">prod.ml_features.user_embed</text>
      <text x="420" y="219" fill="#94a3b8" font-size="7">18</text>
      <!-- Export pipeline -->
      <rect x="16" y="240" width="448" height="44" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1"/>
      <text x="240" y="258" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">Auto-Export Pipeline</text>
      <text x="26" y="276" fill="#94a3b8" font-size="8">Monthly: query → CSV → S3 compliance bucket → email to DPO · 7-year retention (legal hold)</text>
    </svg>`,

    // Step 5: Retention policy
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">AUDIT LOG RETENTION</text>
      <!-- Timeline -->
      <line x1="30" y1="70" x2="450" y2="70" stroke="#334155" stroke-width="2"/>
      <!-- Hot tier (0-365 days) -->
      <rect x="30" y="42" width="200" height="56" rx="4" fill="#38bdf8" opacity="0.15" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="130" y="58" text-anchor="middle" fill="#38bdf8" font-size="9" font-weight="bold">HOT TIER</text>
      <text x="130" y="72" text-anchor="middle" fill="#38bdf8" font-size="8">0 – 365 days</text>
      <text x="130" y="86" text-anchor="middle" fill="#94a3b8" font-size="7">system.access.audit</text>
      <text x="130" y="98" text-anchor="middle" fill="#94a3b8" font-size="7">queryable with SQL</text>
      <!-- Cold tier (365 days – 7 years) -->
      <rect x="240" y="42" width="210" height="56" rx="4" fill="#64748b" opacity="0.15" stroke="#64748b" stroke-width="1.5"/>
      <text x="345" y="58" text-anchor="middle" fill="#94a3b8" font-size="9" font-weight="bold">COLD TIER</text>
      <text x="345" y="72" text-anchor="middle" fill="#94a3b8" font-size="8">1 – 7 years</text>
      <text x="345" y="86" text-anchor="middle" fill="#64748b" font-size="7">S3 Glacier · compliance archive</text>
      <text x="345" y="98" text-anchor="middle" fill="#64748b" font-size="7">legal hold · not queryable directly</text>
      <!-- Export workflow -->
      <rect x="16" y="116" width="448" height="72" rx="5" fill="#1e293b"/>
      <text x="240" y="134" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Monthly Archive Workflow</text>
      <text x="26" y="150" fill="#a855f7" font-size="8">COPY INTO 's3://mediastream-compliance-archive/audit/{{year}}/{{month}}/'</text>
      <text x="26" y="164" fill="#94a3b8" font-size="8">FROM system.access.audit</text>
      <text x="26" y="178" fill="#94a3b8" font-size="8">WHERE event_time BETWEEN '{{month_start}}' AND '{{month_end}}'</text>
      <text x="26" y="192" fill="#94a3b8" font-size="8">FILEFORMAT = PARQUET COMPRESSION = SNAPPY;</text>
      <!-- Storage cost note -->
      <rect x="16" y="200" width="448" height="60" rx="5" fill="#1e293b"/>
      <text x="240" y="218" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">MediaStream Audit Storage</text>
      <text x="26" y="234" fill="#94a3b8" font-size="8">2.4M events/day × 365 days ≈ 876M events/year</text>
      <text x="26" y="248" fill="#94a3b8" font-size="8">~250 bytes/event compressed → ~219 GB/year hot · ~1.5 TB 7-year cold</text>
      <text x="240" y="272" text-anchor="middle" fill="#64748b" font-size="7">S3 Glacier cost: ~$0.004/GB/month · 7-year archive ≈ $0.30/month total</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.al-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--unity)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.al-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.al-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="al-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="al-header module-header">
        <div class="module-tag" style="background:var(--unity)">UNITY CATALOG</div>
        <h2 class="module-title">Audit Logs</h2>
        <p class="module-subtitle">Automatic audit · system.access.audit · GDPR compliance · anomaly detection</p>
      </div>
      <div class="al-pills step-pills">${pills}</div>
      <div class="al-diagram diagram-frame"></div>
      <div class="al-info info-panel" style="border-left:3px solid var(--unity)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'al-page page-enter';
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

    container.querySelectorAll('.al-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['audit-logs'] = {
    id: 'audit-logs',
    title: 'Audit Logs',
    group: 'Unity Catalog',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
