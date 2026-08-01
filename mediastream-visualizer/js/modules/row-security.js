(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Row-Level Security',
      desc: 'Row filters restrict which rows a user can see — same query, different result sets by identity.',
      detail: 'Unity Catalog row filters are SQL functions attached to a table. When a user queries the table, UC injects the filter predicate automatically. No app-level filtering needed, no view proliferation.',
    },
    {
      label: 'CREATE ROW FILTER',
      desc: 'Row filters are Python/SQL UDFs registered in UC, then attached to a table with ALTER TABLE.',
      detail: 'The function receives current user context (IS_MEMBER, CURRENT_USER) and returns a boolean predicate. UC pushes this predicate into every query on the table — fully transparent to callers.',
    },
    {
      label: 'Apply to Table',
      desc: 'ALTER TABLE ... SET ROW FILTER binds a filter function to a table column set.',
      detail: 'Once set, the row filter fires for every SELECT on the table — interactive queries, BI tools, Spark jobs, dbt models. Admin and data-owner groups can be exempted with IS_ACCOUNT_GROUP_MEMBER.',
    },
    {
      label: 'Region-Based Filter',
      desc: 'MediaStream uses region-based row security — EU analysts see only EU data, US analysts only US data.',
      detail: 'GDPR compliance: EU user data must not be queried by non-EU personnel without explicit authorization. Row filter `user_region = current_user_region()` enforces this at the table level — zero application code changes.',
    },
    {
      label: 'Testing Filters',
      desc: 'Test row filters by impersonating users — EXECUTE AS lets you verify filter behavior.',
      detail: 'Use `SET SESSION AUTHORIZATION` or `EXECUTE AS` to test that EU analyst sees 42M rows (EU users) and US analyst sees 138M rows (US users) from the same `user_profiles` table.',
    },
    {
      label: 'Filters vs Views',
      desc: 'Row filters eliminate the need for region-specific views — one table, many secure windows.',
      detail: 'Before UC row filters, MediaStream maintained 7 regional views of `user_profiles`. After migration to row filters: 1 table, 1 row filter function, 0 views to maintain. Privileges still apply normally above the filter.',
    },
  ];

  const DIAGRAMS = [
    // Step 0: Row-level security overview
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">ROW-LEVEL SECURITY</text>
      <!-- Two users -->
      <rect x="16" y="36" width="100" height="50" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="66" y="56" text-anchor="middle" fill="#38bdf8" font-size="9" font-weight="bold">EU Analyst</text>
      <text x="66" y="72" text-anchor="middle" fill="#94a3b8" font-size="8">alice@mediastream</text>
      <text x="66" y="84" text-anchor="middle" fill="#64748b" font-size="7">group: eu-analysts</text>

      <rect x="364" y="36" width="100" height="50" rx="5" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="414" y="56" text-anchor="middle" fill="#ff6b35" font-size="9" font-weight="bold">US Analyst</text>
      <text x="414" y="72" text-anchor="middle" fill="#94a3b8" font-size="8">bob@mediastream</text>
      <text x="414" y="84" text-anchor="middle" fill="#64748b" font-size="7">group: us-analysts</text>

      <!-- Same query -->
      <text x="116" y="76" fill="#94a3b8" font-size="8">SELECT * FROM</text>
      <text x="116" y="88" fill="#94a3b8" font-size="8">user_profiles</text>
      <text x="350" y="76" fill="#94a3b8" font-size="8">SELECT * FROM</text>
      <text x="350" y="88" fill="#94a3b8" font-size="8">user_profiles</text>

      <!-- UC filter box -->
      <rect x="130" y="108" width="220" height="44" rx="5" fill="#a855f7" opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <text x="240" y="126" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">UC Row Filter Injected</text>
      <text x="240" y="142" text-anchor="middle" fill="#94a3b8" font-size="8">WHERE region = user_region(CURRENT_USER)</text>

      <!-- Lines from users to filter -->
      <line x1="86" y1="86" x2="180" y2="118" stroke="#38bdf8" stroke-width="1" stroke-dasharray="3,2"/>
      <line x1="414" y1="86" x2="300" y2="118" stroke="#ff6b35" stroke-width="1" stroke-dasharray="3,2"/>

      <!-- Results -->
      <rect x="16" y="172" width="200" height="60" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="116" y="190" text-anchor="middle" fill="#38bdf8" font-size="9" font-weight="bold">Alice sees</text>
      <text x="116" y="206" text-anchor="middle" fill="#94a3b8" font-size="8">42M rows (EU users only)</text>
      <text x="116" y="220" text-anchor="middle" fill="#64748b" font-size="7">region IN ('FR','DE','IT','ES','NL'...)</text>

      <rect x="264" y="172" width="200" height="60" rx="5" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="364" y="190" text-anchor="middle" fill="#ff6b35" font-size="9" font-weight="bold">Bob sees</text>
      <text x="364" y="206" text-anchor="middle" fill="#94a3b8" font-size="8">138M rows (US users only)</text>
      <text x="364" y="220" text-anchor="middle" fill="#64748b" font-size="7">region IN ('US-CA','US-NY','US-TX'...)</text>

      <!-- Note -->
      <text x="240" y="254" text-anchor="middle" fill="#64748b" font-size="8">Same table · Same query · Different result sets · Zero app changes</text>
      <text x="240" y="270" text-anchor="middle" fill="#64748b" font-size="7">GDPR compliant: EU data never crosses region boundary without authorization</text>
    </svg>`,

    // Step 1: CREATE ROW FILTER
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">CREATE ROW FILTER</text>
      <!-- Function definition -->
      <rect x="16" y="30" width="448" height="130" rx="5" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Step 1: Define the filter function</text>
      <text x="26" y="66" fill="#a855f7" font-size="8">CREATE FUNCTION prod.shared_governance.region_filter(region STRING)</text>
      <text x="26" y="80" fill="#94a3b8" font-size="8">RETURNS BOOLEAN</text>
      <text x="26" y="94" fill="#94a3b8" font-size="8">COMMENT 'Row filter: analysts see only their region'</text>
      <text x="26" y="108" fill="#94a3b8" font-size="8">RETURN</text>
      <text x="26" y="122" fill="#4ade80" font-size="8">  IS_ACCOUNT_GROUP_MEMBER('data-admin')  -- admins bypass</text>
      <text x="26" y="136" fill="#4ade80" font-size="8">  OR region = get_user_region(CURRENT_USER()); -- others: own region only</text>
      <text x="26" y="150" fill="#64748b" font-size="8">  -- get_user_region() looks up user→region mapping in shared_governance.user_regions</text>
      <!-- Attach to table -->
      <rect x="16" y="170" width="448" height="44" rx="5" fill="#1e293b"/>
      <text x="240" y="186" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Step 2: Attach filter to table</text>
      <text x="26" y="202" fill="#a855f7" font-size="8">ALTER TABLE prod.silver.user_profiles</text>
      <text x="26" y="216" fill="#94a3b8" font-size="8">  SET ROW FILTER prod.shared_governance.region_filter ON (region);</text>
      <!-- What happens next -->
      <rect x="16" y="224" width="448" height="44" rx="5" fill="#4ade80" opacity="0.1" stroke="#4ade80" stroke-width="1"/>
      <text x="26" y="240" fill="#4ade80" font-size="8">After this command, every query on user_profiles automatically receives</text>
      <text x="26" y="254" fill="#4ade80" font-size="8">WHERE region_filter(region) = TRUE injected by UC — no code changes needed.</text>
      <text x="240" y="278" text-anchor="middle" fill="#64748b" font-size="7">DROP FUNCTION or ALTER TABLE DROP ROW FILTER to remove · ALTER TABLE to replace</text>
    </svg>`,

    // Step 2: Apply to table (runtime behavior)
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">FILTER AT RUNTIME</text>
      <!-- Query flow -->
      <rect x="16" y="32" width="448" height="36" rx="4" fill="#1e293b"/>
      <text x="240" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">User submits: SELECT * FROM prod.silver.user_profiles WHERE age > 25</text>
      <text x="240" y="62" text-anchor="middle" fill="#64748b" font-size="7">Running as: alice@mediastream · group: eu-analysts</text>

      <!-- UC intercept -->
      <rect x="140" y="80" width="200" height="36" rx="4" fill="#a855f7" opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <text x="240" y="96" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">UC Intercepts Query</text>
      <text x="240" y="110" text-anchor="middle" fill="#94a3b8" font-size="8">Evaluates region_filter(region)</text>

      <!-- Rewritten query -->
      <rect x="16" y="128" width="448" height="36" rx="4" fill="#1e293b"/>
      <text x="240" y="144" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">Rewritten query (invisible to user)</text>
      <text x="240" y="160" text-anchor="middle" fill="#fbbf24" font-size="8">SELECT * FROM user_profiles WHERE age &gt; 25 AND region IN ('FR','DE','IT','ES','NL','BE','PT')</text>

      <!-- Result -->
      <rect x="16" y="176" width="210" height="36" rx="4" fill="#4ade80" opacity="0.1" stroke="#4ade80" stroke-width="1.5"/>
      <text x="121" y="192" text-anchor="middle" fill="#4ade80" font-size="8" font-weight="bold">Alice (EU): 42M matching rows</text>
      <text x="121" y="206" text-anchor="middle" fill="#64748b" font-size="7">EU regions only · GDPR compliant</text>

      <rect x="254" y="176" width="210" height="36" rx="4" fill="#ff6b35" opacity="0.1" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="359" y="192" text-anchor="middle" fill="#ff6b35" font-size="8" font-weight="bold">Bob (US): 138M matching rows</text>
      <text x="359" y="206" text-anchor="middle" fill="#64748b" font-size="7">US regions only</text>

      <!-- Callers -->
      <rect x="16" y="224" width="448" height="52" rx="5" fill="#1e293b"/>
      <text x="240" y="240" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Works for ALL callers — no exceptions needed</text>
      <text x="26" y="256" fill="#94a3b8" font-size="8">SQL notebook  ·  BI tool (Looker/Tableau)  ·  Spark DataFrame  ·  dbt model</text>
      <text x="26" y="270" fill="#94a3b8" font-size="8">REST API  ·  Python pandas reader  ·  Delta Sharing recipient</text>
    </svg>`,

    // Step 3: Region-based filter (MediaStream specific)
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">MEDIASTREAM: REGION-BASED ROW FILTER</text>
      <!-- World split -->
      <rect x="16" y="32" width="210" height="100" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="121" y="50" text-anchor="middle" fill="#38bdf8" font-size="9" font-weight="bold">EU Region</text>
      <text x="121" y="68" text-anchor="middle" fill="#94a3b8" font-size="8">42M subscribers</text>
      <text x="121" y="82" text-anchor="middle" fill="#94a3b8" font-size="8">FR · DE · IT · ES · NL · BE</text>
      <text x="121" y="96" text-anchor="middle" fill="#64748b" font-size="7">GDPR jurisdiction</text>
      <text x="121" y="110" text-anchor="middle" fill="#64748b" font-size="7">data residency: eu-west-1</text>
      <text x="121" y="124" text-anchor="middle" fill="#64748b" font-size="7">PII: strict deletion SLA</text>

      <rect x="254" y="32" width="210" height="100" rx="5" fill="#1e293b" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="359" y="50" text-anchor="middle" fill="#ff6b35" font-size="9" font-weight="bold">US + Global Region</text>
      <text x="359" y="68" text-anchor="middle" fill="#94a3b8" font-size="8">138M subscribers</text>
      <text x="359" y="82" text-anchor="middle" fill="#94a3b8" font-size="8">US · CA · AU · BR · IN · JP</text>
      <text x="359" y="96" text-anchor="middle" fill="#64748b" font-size="7">CCPA + local jurisdiction</text>
      <text x="359" y="110" text-anchor="middle" fill="#64748b" font-size="7">data residency: us-east-1</text>
      <text x="359" y="124" text-anchor="middle" fill="#64748b" font-size="7">PII: 30-day deletion SLA</text>

      <!-- Filter function -->
      <rect x="16" y="144" width="448" height="84" rx="5" fill="#1e293b"/>
      <text x="240" y="162" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">Region Filter (prod.silver.user_profiles)</text>
      <text x="26" y="180" fill="#a855f7" font-size="8">CREATE FUNCTION region_filter(user_region STRING) RETURNS BOOLEAN RETURN</text>
      <text x="26" y="194" fill="#4ade80" font-size="8">  IS_ACCOUNT_GROUP_MEMBER('data-admin')  -- data admins: see all</text>
      <text x="26" y="208" fill="#fbbf24" font-size="8">  OR IS_ACCOUNT_GROUP_MEMBER('gdpr-officer')  -- GDPR team: see EU only audit</text>
      <text x="26" y="222" fill="#94a3b8" font-size="8">  OR user_region = get_user_region(CURRENT_USER());  -- everyone else: own region</text>

      <!-- Enforcement note -->
      <rect x="16" y="240" width="448" height="36" rx="4" fill="#1e293b" stroke="#fbbf24" stroke-width="1"/>
      <text x="240" y="256" text-anchor="middle" fill="#fbbf24" font-size="8">GDPR Article 25 — data minimization by design: no EU data ever reaches US analyst</text>
      <text x="240" y="270" text-anchor="middle" fill="#64748b" font-size="7">Enforced at the storage layer — no application-level enforcement needed</text>
    </svg>`,

    // Step 4: Testing filters
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">TESTING ROW FILTERS</text>
      <!-- Test as alice -->
      <rect x="16" y="32" width="448" height="52" rx="5" fill="#1e293b"/>
      <text x="240" y="50" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Test filter as EU analyst</text>
      <text x="26" y="68" fill="#a855f7" font-size="8">EXECUTE AS alice@mediastream.com;</text>
      <text x="26" y="80" fill="#94a3b8" font-size="8">SELECT COUNT(*), MIN(region), MAX(region) FROM prod.silver.user_profiles;</text>
      <!-- Expected result -->
      <rect x="16" y="96" width="210" height="46" rx="5" fill="#4ade80" opacity="0.1" stroke="#4ade80" stroke-width="1.5"/>
      <text x="121" y="114" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">Expected: EU-only</text>
      <text x="121" y="128" text-anchor="middle" fill="#94a3b8" font-size="8">count: 42,000,000</text>
      <text x="121" y="140" text-anchor="middle" fill="#94a3b8" font-size="8">region: BE → PT (EU only)</text>

      <!-- Test as bob -->
      <rect x="16" y="156" width="448" height="52" rx="5" fill="#1e293b"/>
      <text x="240" y="174" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Test filter as US analyst</text>
      <text x="26" y="192" fill="#a855f7" font-size="8">EXECUTE AS bob@mediastream.com;</text>
      <text x="26" y="206" fill="#94a3b8" font-size="8">SELECT COUNT(*), MIN(region), MAX(region) FROM prod.silver.user_profiles;</text>
      <!-- Expected result -->
      <rect x="16" y="220" width="210" height="46" rx="5" fill="#ff6b35" opacity="0.1" stroke="#ff6b35" stroke-width="1.5"/>
      <text x="121" y="238" text-anchor="middle" fill="#ff6b35" font-size="9" font-weight="bold">Expected: US-only</text>
      <text x="121" y="252" text-anchor="middle" fill="#94a3b8" font-size="8">count: 138,000,000</text>
      <text x="121" y="266" text-anchor="middle" fill="#94a3b8" font-size="8">region: US-CA → US-WY (US only)</text>

      <!-- Admin bypass -->
      <rect x="240" y="220" width="224" height="46" rx="5" fill="#1e293b" stroke="#a855f7" stroke-width="1"/>
      <text x="352" y="238" text-anchor="middle" fill="#a855f7" font-size="8" font-weight="bold">Admin bypass test</text>
      <text x="352" y="252" text-anchor="middle" fill="#94a3b8" font-size="8">EXECUTE AS admin@mediastream.com</text>
      <text x="352" y="266" text-anchor="middle" fill="#4ade80" font-size="8">→ count: 180,000,000 (all regions)</text>
    </svg>`,

    // Step 5: Filters vs Views
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="#0f172a" rx="8"/>
      <text x="240" y="20" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">ROW FILTERS vs VIEWS</text>
      <!-- Before: views -->
      <rect x="16" y="32" width="210" height="130" rx="5" fill="#1e293b" stroke="#ef4444" stroke-width="1.5"/>
      <text x="121" y="50" text-anchor="middle" fill="#ef4444" font-size="10" font-weight="bold">BEFORE: 7 views</text>
      <text x="121" y="68" text-anchor="middle" fill="#94a3b8" font-size="8">user_profiles_eu</text>
      <text x="121" y="82" text-anchor="middle" fill="#94a3b8" font-size="8">user_profiles_us</text>
      <text x="121" y="96" text-anchor="middle" fill="#94a3b8" font-size="8">user_profiles_apac</text>
      <text x="121" y="110" text-anchor="middle" fill="#94a3b8" font-size="8">user_profiles_latam</text>
      <text x="121" y="124" text-anchor="middle" fill="#94a3b8" font-size="8">user_profiles_mena</text>
      <text x="121" y="138" text-anchor="middle" fill="#94a3b8" font-size="8">user_profiles_africa</text>
      <text x="121" y="152" text-anchor="middle" fill="#ef4444" font-size="8">+ view for each new region</text>

      <!-- After: row filter -->
      <rect x="254" y="32" width="210" height="130" rx="5" fill="#1e293b" stroke="#4ade80" stroke-width="1.5"/>
      <text x="359" y="50" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">AFTER: 1 filter</text>
      <text x="359" y="76" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="bold">user_profiles</text>
      <text x="359" y="92" text-anchor="middle" fill="#94a3b8" font-size="8">+ region_filter function</text>
      <text x="359" y="108" text-anchor="middle" fill="#94a3b8" font-size="8">Any new region: zero changes</text>
      <text x="359" y="124" text-anchor="middle" fill="#94a3b8" font-size="8">Any new user: zero changes</text>
      <text x="359" y="140" text-anchor="middle" fill="#94a3b8" font-size="8">Privileges still apply above</text>
      <text x="359" y="154" text-anchor="middle" fill="#64748b" font-size="7">one row filter covers all callers</text>

      <!-- Arrow between -->
      <text x="240" y="100" text-anchor="middle" fill="#a855f7" font-size="20">→</text>

      <!-- Summary -->
      <rect x="16" y="174" width="448" height="88" rx="5" fill="#1e293b"/>
      <text x="240" y="192" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">Operational Savings</text>
      <text x="26" y="210" fill="#ef4444" font-size="8">Before: 7 views × 42 tables = 294 objects to maintain + GRANT</text>
      <text x="26" y="224" fill="#4ade80" font-size="8">After:  1 filter function × 42 tables = 42 ALTER TABLE statements (one-time)</text>
      <text x="26" y="238" fill="#4ade80" font-size="8">New region added: 0 schema changes, 0 new views, 0 new GRANTs</text>
      <text x="26" y="252" fill="#4ade80" font-size="8">New analyst onboarded: GRANT SELECT on schema — filter auto-applies</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    const step = STEPS[si];
    el.querySelectorAll('.rs-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--unity)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.rs-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.rs-info');
    if (info) info.textContent = step.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="rs-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="rs-header module-header">
        <div class="module-tag" style="background:var(--unity)">UNITY CATALOG</div>
        <h2 class="module-title">Row-Level Security</h2>
        <p class="module-subtitle">Row filters · region-based access · GDPR data minimization</p>
      </div>
      <div class="rs-pills step-pills">${pills}</div>
      <div class="rs-diagram diagram-frame"></div>
      <div class="rs-info info-panel" style="border-left:3px solid var(--unity)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'rs-page page-enter';
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

    container.querySelectorAll('.rs-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['row-security'] = {
    id: 'row-security',
    title: 'Row-Level Security',
    group: 'Unity Catalog',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
