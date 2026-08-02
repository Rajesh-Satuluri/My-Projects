(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Column Masking',
      desc: 'Column masks redact or transform sensitive column values based on caller identity — same table, masked data.',
      detail: 'Unity Catalog column masks are SQL functions that transform a column\'s value at read time. An analyst sees `usr_***7f3k`, an engineer sees the real `user_id`. No data copies, no separate tables.',
    },
    {
      label: 'PII Columns',
      desc: 'MediaStream has 14 PII columns across 6 tables — user_id, email, ip_address, device_fingerprint, and more.',
      detail: 'PII classification: user_id (direct identifier), email (direct), ip_address (indirect), device_fingerprint (indirect), watch_history (behavioral), payment_method (financial). All require masking for non-privileged roles.',
    },
    {
      label: 'CREATE COLUMN MASK',
      desc: 'Column masks are functions that return a transformed value — same type as the original column.',
      detail: 'The function must return the same data type as the source column. Use CURRENT_USER(), IS_ACCOUNT_GROUP_MEMBER(), and SESSION_USER() to determine the calling identity and return appropriate values.',
    },
    {
      label: 'Apply Mask',
      desc: 'ALTER TABLE ... ALTER COLUMN ... SET MASK attaches a mask function to a specific column.',
      detail: 'Once set, the mask fires for every SELECT on that column — notebooks, BI tools, Spark jobs, dbt models. The mask is transparent to callers — they get a value, they just don\'t know it\'s masked unless they\'re authorized.',
    },
    {
      label: 'Dynamic by Role',
      desc: 'The same mask function can return different transformations for different roles.',
      detail: 'data-admin: real value. data-engineer: first-4 + masked. analyst: fully hashed. bi-tool: null (not needed). One function, four output behaviors, zero application changes.',
    },
    {
      label: 'Testing Masks',
      desc: 'Verify masks with EXECUTE AS — confirm each role sees the correct masked value.',
      detail: 'Test every role before deploying to prod. Typical MediaStream test matrix: admin=real, engineer=partial, analyst=hashed, bi=null. Write these as automated integration tests in CI — a mask change that breaks a test fails the PR.',
    },
  ];

  const DIAGRAMS = [
    // Step 0: Column masking overview
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">COLUMN MASKING</text>
      <!-- Table source -->
      <rect x="16" y="32" width="180" height="120" rx="5" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      <text x="106" y="50" text-anchor="middle" fill="#94a3b8" font-size="9" font-weight="bold">user_profiles (real data)</text>
      <text x="26" y="68" fill="#ef4444" font-size="8">user_id: usr_7f3k9a2b</text>
      <text x="26" y="82" fill="#ef4444" font-size="8">email: alice@example.com</text>
      <text x="26" y="96" fill="#ef4444" font-size="8">ip_addr: 203.45.12.87</text>
      <text x="26" y="110" fill="#94a3b8" font-size="8">region: EU-FR</text>
      <text x="26" y="124" fill="#94a3b8" font-size="8">plan: premium</text>
      <text x="26" y="138" fill="#94a3b8" font-size="8">since: 2021-03-14</text>
      <!-- Mask box -->
      <rect x="210" y="72" width="100" height="36" rx="4" fill="#a855f7" opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <text x="260" y="88" text-anchor="middle" fill="#a855f7" font-size="8" font-weight="bold">UC Column Mask</text>
      <text x="260" y="102" text-anchor="middle" fill="#94a3b8" font-size="7">checks CURRENT_USER</text>
      <!-- Two views: analyst vs admin -->
      <rect x="324" y="32" width="140" height="78" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="394" y="50" text-anchor="middle" fill="#38bdf8" font-size="8" font-weight="bold">Analyst sees</text>
      <text x="334" y="66" fill="#fbbf24" font-size="7">user_id: usr_***k9a2b</text>
      <text x="334" y="80" fill="#fbbf24" font-size="7">email: a***@***.com</text>
      <text x="334" y="94" fill="#fbbf24" font-size="7">ip_addr: ***.***.***.87</text>
      <text x="334" y="108" fill="#94a3b8" font-size="7">(PII columns masked)</text>

      <rect x="324" y="124" width="140" height="78" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="394" y="142" text-anchor="middle" fill="#4ade80" font-size="8" font-weight="bold">Admin sees</text>
      <text x="334" y="158" fill="#4ade80" font-size="7">user_id: usr_7f3k9a2b</text>
      <text x="334" y="172" fill="#4ade80" font-size="7">email: alice@example.com</text>
      <text x="334" y="186" fill="#4ade80" font-size="7">ip_addr: 203.45.12.87</text>
      <text x="334" y="200" fill="#94a3b8" font-size="7">(unmasked, full access)</text>

      <!-- Lines from mask to outputs -->
      <line x1="310" y1="90" x2="324" y2="71" stroke="#38bdf8" stroke-width="1" stroke-dasharray="3,2"/>
      <line x1="310" y1="90" x2="324" y2="163" stroke="#4ade80" stroke-width="1" stroke-dasharray="3,2"/>
      <!-- Note -->
      <text x="240" y="244" text-anchor="middle" fill="#64748b" font-size="8">Same table · Same query · Column value transformed by caller identity</text>
      <text x="240" y="260" text-anchor="middle" fill="#64748b" font-size="7">No data copies · No view proliferation · Works in all SQL/Spark clients</text>
    </svg>`,

    // Step 1: PII columns
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">MEDIASTREAM PII COLUMNS</text>
      <text x="240" y="34" text-anchor="middle" fill="#64748b" font-size="8">14 PII columns across 6 tables — all masked via UC</text>
      <!-- PII table -->
      <rect x="16" y="46" width="448" height="196" rx="5" fill="#1e293b"/>
      <!-- Header -->
      <rect x="16" y="46" width="448" height="20" rx="5" fill="#334155"/>
      <text x="120" y="60" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">Column</text>
      <text x="240" y="60" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">Classification</text>
      <text x="390" y="60" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">Mask Type</text>
      <!-- Rows -->
      <text x="26" y="82" fill="#ef4444" font-size="8">user_id</text>
      <text x="200" y="82" fill="#ef4444" font-size="8">Direct identifier</text>
      <text x="360" y="82" fill="#fbbf24" font-size="8">hash(usr_***+last4)</text>

      <text x="26" y="98" fill="#ef4444" font-size="8">email</text>
      <text x="200" y="98" fill="#ef4444" font-size="8">Direct identifier</text>
      <text x="360" y="98" fill="#fbbf24" font-size="8">a***@***.com</text>

      <text x="26" y="114" fill="#fbbf24" font-size="8">ip_address</text>
      <text x="200" y="114" fill="#fbbf24" font-size="8">Indirect identifier</text>
      <text x="360" y="114" fill="#fbbf24" font-size="8">***.***.***.last-octet</text>

      <text x="26" y="130" fill="#fbbf24" font-size="8">device_fingerprint</text>
      <text x="200" y="130" fill="#fbbf24" font-size="8">Indirect identifier</text>
      <text x="360" y="130" fill="#fbbf24" font-size="8">SHA256 (one-way)</text>

      <text x="26" y="146" fill="#a855f7" font-size="8">watch_history</text>
      <text x="200" y="146" fill="#a855f7" font-size="8">Behavioral (GDPR Art.4)</text>
      <text x="360" y="146" fill="#fbbf24" font-size="8">NULL for non-engineers</text>

      <text x="26" y="162" fill="#a855f7" font-size="8">payment_method</text>
      <text x="200" y="162" fill="#a855f7" font-size="8">Financial PCI-DSS</text>
      <text x="360" y="162" fill="#fbbf24" font-size="8">last-4 only</text>

      <text x="26" y="178" fill="#a855f7" font-size="8">home_address</text>
      <text x="200" y="178" fill="#a855f7" font-size="8">Direct identifier</text>
      <text x="360" y="178" fill="#fbbf24" font-size="8">country only</text>

      <text x="26" y="194" fill="#64748b" font-size="8">+ 7 more columns across billing, consent, health-flags tables</text>
      <!-- Note -->
      <rect x="16" y="252" width="448" height="28" rx="4" fill="#1e293b" stroke="#ef4444" stroke-width="1"/>
      <text x="240" y="262" text-anchor="middle" fill="#ef4444" font-size="7">All 14 masked with UC column masks — zero PII exposed to analysts without explicit GRANT</text>
      <text x="240" y="276" text-anchor="middle" fill="#64748b" font-size="7">Engineers with 'pii-access' group: see real values · Analysts: always masked</text>
    </svg>`,

    // Step 2: CREATE COLUMN MASK
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">CREATE COLUMN MASK</text>
      <!-- Function -->
      <rect x="16" y="30" width="448" height="148" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Mask function for user_id</text>
      <text x="26" y="66" fill="#a855f7" font-size="8">CREATE FUNCTION prod.shared_governance.mask_user_id(user_id STRING)</text>
      <text x="26" y="80" fill="#94a3b8" font-size="8">RETURNS STRING</text>
      <text x="26" y="94" fill="#94a3b8" font-size="8">COMMENT 'Mask user_id by role — PII GDPR Art.25'</text>
      <text x="26" y="108" fill="#94a3b8" font-size="8">RETURN CASE</text>
      <text x="26" y="122" fill="#4ade80" font-size="8">  WHEN IS_ACCOUNT_GROUP_MEMBER('data-admin') THEN user_id</text>
      <text x="26" y="136" fill="#fbbf24" font-size="8">  WHEN IS_ACCOUNT_GROUP_MEMBER('data-engineer') THEN CONCAT(LEFT(user_id,4),'***',RIGHT(user_id,4))</text>
      <text x="26" y="150" fill="#38bdf8" font-size="8">  WHEN IS_ACCOUNT_GROUP_MEMBER('analyst') THEN SHA2(user_id, 256)</text>
      <text x="26" y="164" fill="#ef4444" font-size="8">  ELSE NULL</text>
      <text x="26" y="178" fill="#94a3b8" font-size="8">END;</text>
      <!-- Output examples -->
      <rect x="16" y="190" width="448" height="72" rx="5" fill="#1e293b"/>
      <text x="240" y="208" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Output by role for user_id = 'usr_7f3k9a2b'</text>
      <text x="26" y="224" fill="#4ade80" font-size="8">data-admin:    usr_7f3k9a2b   (real value)</text>
      <text x="26" y="238" fill="#fbbf24" font-size="8">data-engineer: usr_***9a2b    (first 4 + *** + last 4)</text>
      <text x="26" y="252" fill="#38bdf8" font-size="8">analyst:       7e3f82a1...    (SHA-256 hash — consistent, one-way)</text>
      <text x="26" y="266" fill="#ef4444" font-size="8">other roles:   NULL           (no access)</text>
    </svg>`,

    // Step 3: Apply mask
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">APPLY COLUMN MASK</text>
      <!-- ALTER TABLE command -->
      <rect x="16" y="30" width="448" height="64" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Attach mask to table column</text>
      <text x="26" y="66" fill="#a855f7" font-size="8">ALTER TABLE prod.silver.user_profiles</text>
      <text x="26" y="80" fill="#94a3b8" font-size="8">  ALTER COLUMN user_id SET MASK prod.shared_governance.mask_user_id;</text>
      <!-- Batch apply -->
      <rect x="16" y="106" width="448" height="64" rx="5" fill="#1e293b"/>
      <text x="240" y="124" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">MediaStream: apply to all 6 PII tables (one-time)</text>
      <text x="26" y="142" fill="#94a3b8" font-size="8">ALTER TABLE prod.silver.user_profiles ALTER COLUMN user_id SET MASK mask_user_id;</text>
      <text x="26" y="156" fill="#94a3b8" font-size="8">ALTER TABLE prod.gold.user_retention  ALTER COLUMN user_id SET MASK mask_user_id;</text>
      <text x="26" y="168" fill="#64748b" font-size="8">-- ... repeat for billing.user_id, ml_features.user_id, consent.user_id</text>
      <!-- Callers affected -->
      <rect x="16" y="182" width="448" height="52" rx="5" fill="#1e293b"/>
      <text x="240" y="198" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Every caller gets masked value automatically</text>
      <text x="26" y="214" fill="#4ade80" font-size="8">✓ Jupyter notebooks  ✓ Looker / Tableau dashboards  ✓ dbt models</text>
      <text x="26" y="228" fill="#4ade80" font-size="8">✓ Spark DataFrames   ✓ REST SQL API calls           ✓ Delta Sharing</text>
      <!-- Remove mask -->
      <rect x="16" y="246" width="448" height="26" rx="5" fill="#1e293b"/>
      <text x="26" y="262" fill="#64748b" font-size="8">Remove: ALTER TABLE prod.silver.user_profiles ALTER COLUMN user_id DROP MASK;</text>
    </svg>`,

    // Step 4: Dynamic by role
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">DYNAMIC MASKING BY ROLE</text>
      <!-- Role matrix -->
      <rect x="16" y="32" width="448" height="166" rx="5" fill="#1e293b"/>
      <!-- Headers -->
      <rect x="16" y="32" width="448" height="20" rx="4" fill="#334155"/>
      <text x="100" y="46" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">Role / Group</text>
      <text x="230" y="46" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">user_id</text>
      <text x="330" y="46" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">email</text>
      <text x="430" y="46" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">ip_address</text>
      <!-- Rows -->
      <text x="26" y="68" fill="#4ade80" font-size="8">data-admin</text>
      <text x="198" y="68" fill="#4ade80" font-size="8">usr_7f3k9a2b</text>
      <text x="298" y="68" fill="#4ade80" font-size="8">alice@ex.com</text>
      <text x="398" y="68" fill="#4ade80" font-size="8">203.45.12.87</text>

      <text x="26" y="88" fill="#fbbf24" font-size="8">data-engineer</text>
      <text x="198" y="88" fill="#fbbf24" font-size="8">usr_***9a2b</text>
      <text x="298" y="88" fill="#fbbf24" font-size="8">a***@***.com</text>
      <text x="398" y="88" fill="#fbbf24" font-size="8">***.***.***.87</text>

      <text x="26" y="108" fill="#38bdf8" font-size="8">analyst</text>
      <text x="198" y="108" fill="#38bdf8" font-size="8">7e3f82a1... (hash)</text>
      <text x="298" y="108" fill="#38bdf8" font-size="8">SHA256 hash</text>
      <text x="398" y="108" fill="#38bdf8" font-size="8">SHA256 hash</text>

      <text x="26" y="128" fill="#a855f7" font-size="8">bi-tool-svc</text>
      <text x="198" y="128" fill="#a855f7" font-size="8">NULL</text>
      <text x="298" y="128" fill="#a855f7" font-size="8">NULL</text>
      <text x="398" y="128" fill="#a855f7" font-size="8">NULL</text>

      <text x="26" y="148" fill="#ef4444" font-size="8">unknown / other</text>
      <text x="198" y="148" fill="#ef4444" font-size="8">NULL</text>
      <text x="298" y="148" fill="#ef4444" font-size="8">NULL</text>
      <text x="398" y="148" fill="#ef4444" font-size="8">NULL</text>

      <text x="26" y="168" fill="#64748b" font-size="8">gdpr-officer (special)</text>
      <text x="198" y="168" fill="#64748b" font-size="8">SHA256 (consistent)</text>
      <text x="298" y="168" fill="#64748b" font-size="8">domain only</text>
      <text x="398" y="168" fill="#64748b" font-size="8">country only</text>

      <!-- One function note -->
      <rect x="16" y="210" width="448" height="60" rx="5" fill="#a855f7" opacity="0.1" stroke="#a855f7" stroke-width="1"/>
      <text x="240" y="228" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">One function · Four output tiers · Zero application changes</text>
      <text x="26" y="246" fill="#94a3b8" font-size="8">Adding a new role tier: edit the CASE expression in the function body</text>
      <text x="26" y="260" fill="#94a3b8" font-size="8">Effect is immediate — no redeployment, no downtime, no view rebuilds</text>
    </svg>`,

    // Step 5: Testing masks
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">TESTING COLUMN MASKS</text>
      <!-- Test script -->
      <rect x="16" y="30" width="448" height="172" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Verification script (run in CI)</text>
      <text x="26" y="66" fill="#64748b" font-size="8">-- Test 1: admin sees real value</text>
      <text x="26" y="80" fill="#a855f7" font-size="8">EXECUTE AS admin@mediastream.com;</text>
      <text x="26" y="94" fill="#94a3b8" font-size="8">SELECT user_id FROM prod.silver.user_profiles LIMIT 1;</text>
      <text x="26" y="108" fill="#4ade80" font-size="8">-- Expected: usr_7f3k9a2b (real value)</text>
      <text x="26" y="126" fill="#64748b" font-size="8">-- Test 2: analyst sees hash</text>
      <text x="26" y="140" fill="#a855f7" font-size="8">EXECUTE AS analyst@mediastream.com;</text>
      <text x="26" y="154" fill="#94a3b8" font-size="8">SELECT user_id FROM prod.silver.user_profiles LIMIT 1;</text>
      <text x="26" y="168" fill="#38bdf8" font-size="8">-- Expected: 7e3f82a1c4d9b2e8... (64-char SHA256)</text>
      <text x="26" y="186" fill="#a855f7" font-size="8">EXECUTE AS bi-service@mediastream.com;</text>
      <text x="26" y="200" fill="#ef4444" font-size="8">-- Expected: NULL</text>
      <!-- CI integration note -->
      <rect x="16" y="214" width="448" height="60" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1"/>
      <text x="240" y="232" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">CI Integration</text>
      <text x="26" y="250" fill="#94a3b8" font-size="8">MediaStream runs mask tests in GitHub Actions on every schema change PR</text>
      <text x="26" y="264" fill="#94a3b8" font-size="8">A mask regression (analyst suddenly sees real PII) fails the PR — zero tolerance</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.cm-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--unity)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.cm-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.cm-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="cm-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="cm-header module-header">
        <div class="module-tag" style="background:var(--unity)">UNITY CATALOG</div>
        <h2 class="module-title">Column Masking</h2>
        <p class="module-subtitle">PII redaction · dynamic by role · no data copies</p>
      </div>
      <div class="cm-pills step-pills">${pills}</div>
      <div class="cm-diagram diagram-frame"></div>
      <div class="cm-info info-panel" style="border-left:3px solid var(--unity)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'cm-page page-enter';
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

    container.querySelectorAll('.cm-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['column-masking'] = {
    id: 'column-masking',
    title: 'Column Masking',
    group: 'Unity Catalog',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
