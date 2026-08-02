(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Overview',
      desc: 'Delta Lake table constraints — NOT NULL and CHECK',
      detail: 'Delta Lake supports two types of table constraints: NOT NULL (enforced via column definition) and CHECK (arbitrary SQL expression evaluated on each row at write time). Constraints are enforced at write time — any INSERT, UPDATE, or MERGE that would violate a constraint fails with an AnalysisException. Existing rows are NOT retroactively checked when a constraint is added. Constraints are stored in the table metadata and visible via DESCRIBE DETAIL.',
    },
    {
      label: 'NOT NULL',
      desc: 'NOT NULL constraint on column definition',
      detail: 'NOT NULL constraints are declared in the column definition using the NOT NULL keyword. They prevent null values from being written to that column. For existing Delta tables you can add a NOT NULL constraint via ALTER TABLE ALTER COLUMN ... SET NOT NULL — but only if the existing data already has no nulls in that column (Delta verifies before adding). Useful for primary key-like columns: user_id, event_id, content_id.',
    },
    {
      label: 'CHECK',
      desc: 'CHECK constraint with arbitrary SQL expression',
      detail: 'CHECK constraints evaluate a boolean SQL expression against every row at write time. The expression can reference any columns in the table. If any row produces FALSE (not NULL), the entire write fails. CHECK constraints are ideal for: business rule enforcement (watch_duration >= 0), referential-style validation (status IN (\'active\',\'inactive\',\'deleted\')), and cross-column rules (end_time > start_time). MediaStream uses CHECK constraints on 8 Gold tables.',
    },
    {
      label: 'Violations',
      desc: 'What happens when a constraint is violated',
      detail: 'A constraint violation aborts the entire write operation with an AnalysisException: "CHECK constraint constraint_name (expression) violated by row with values: ...". The transaction is rolled back atomically — no partial writes. This is different from DLT EXPECT OR FAIL (which aborts the pipeline) but similar in effect. Note: NULL values pass CHECK constraints — a NULL in the expression evaluates to NULL (not FALSE), so NOT NULL constraints are separate.',
    },
    {
      label: 'Managing',
      desc: 'Adding, dropping, and viewing constraints',
      detail: 'Add CHECK constraint: ALTER TABLE t ADD CONSTRAINT name CHECK (expression). Drop: ALTER TABLE t DROP CONSTRAINT name. View all constraints: SHOW TBLPROPERTIES t — constraints are stored as delta.constraints.name = expression. You can also see them via DESCRIBE DETAIL. Important: dropping a constraint does NOT delete existing data that would have violated it — it only removes the future enforcement. MediaStream gates all constraint changes through a migration review process.',
    },
    {
      label: 'MediaStream',
      desc: 'MediaStream CHECK constraints on Gold tables',
      detail: 'MediaStream has CHECK constraints on 8 Gold tables: (1) gold.daily_metrics: watch_duration_secs >= 0, impression_count > 0. (2) gold.content_performance: play_rate BETWEEN 0 AND 1, completion_rate BETWEEN 0 AND 1. (3) gold.subscription_events: event_type IN (\'subscribe\',\'cancel\',\'upgrade\',\'downgrade\'). (4) gold.ad_revenue: revenue_usd >= 0. Benefits: catches upstream data bugs before they corrupt business-facing dashboards. 12 bugs caught in the last 90 days that would have silently corrupted analytics.',
    },
  ];

  const DIAGRAMS = [
    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Delta Constraints Overview</text>
      <rect x="20" y="44" width="200" height="130" rx="7" fill="var(--bg-3)" stroke="var(--delta)" stroke-width="1.5"/>
      <text x="120" y="62" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">NOT NULL</text>
      <text x="120" y="80" text-anchor="middle" fill="var(--text-muted)" font-size="8">Declared in column DDL</text>
      <text x="120" y="94" text-anchor="middle" fill="var(--text-muted)" font-size="8">Prevents null values</text>
      <rect x="32" y="102" width="176" height="18" rx="3" fill="rgba(255,107,53,0.1)"/>
      <text x="120" y="115" text-anchor="middle" fill="var(--delta)" font-size="7.5">user_id STRING NOT NULL</text>
      <rect x="32" y="124" width="176" height="18" rx="3" fill="rgba(255,107,53,0.1)"/>
      <text x="120" y="137" text-anchor="middle" fill="var(--delta)" font-size="7.5">event_id STRING NOT NULL</text>
      <text x="120" y="158" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Enforced at write time</text>
      <rect x="260" y="44" width="200" height="130" rx="7" fill="var(--bg-3)" stroke="var(--delta)" stroke-width="1.5"/>
      <text x="360" y="62" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">CHECK</text>
      <text x="360" y="80" text-anchor="middle" fill="var(--text-muted)" font-size="8">Arbitrary SQL expression</text>
      <text x="360" y="94" text-anchor="middle" fill="var(--text-muted)" font-size="8">Any boolean condition</text>
      <rect x="272" y="102" width="176" height="18" rx="3" fill="rgba(255,107,53,0.1)"/>
      <text x="360" y="115" text-anchor="middle" fill="var(--delta)" font-size="7.5">duration &gt;= 0</text>
      <rect x="272" y="124" width="176" height="18" rx="3" fill="rgba(255,107,53,0.1)"/>
      <text x="360" y="137" text-anchor="middle" fill="var(--delta)" font-size="7.5">status IN ('active','inactive')</text>
      <text x="360" y="158" text-anchor="middle" fill="var(--text-muted)" font-size="7.5">Enforced at write time</text>
      <rect x="20" y="192" width="440" height="80" rx="7" fill="rgba(255,107,53,0.06)" stroke="var(--delta)" stroke-width="1"/>
      <text x="240" y="210" text-anchor="middle" fill="var(--delta)" font-size="9" font-weight="700">Key Behavior</text>
      <text x="30" y="228" fill="var(--text-muted)" font-size="8">Write fails atomically if constraint violated — no partial writes</text>
      <text x="30" y="244" fill="var(--text-muted)" font-size="8">Existing rows NOT retroactively checked when constraint is added</text>
      <text x="30" y="260" fill="var(--text-muted)" font-size="8">NULL values pass CHECK (NULL is not FALSE) — combine with NOT NULL</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">NOT NULL Constraint</text>
      <rect x="14" y="38" width="452" height="224" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="58" fill="var(--text-muted)" font-size="8" font-weight="700">-- Declare NOT NULL at table creation</text>
      <text x="24" y="72" fill="var(--delta)" font-size="8.5">CREATE TABLE silver.user_events (</text>
      <text x="24" y="86" fill="var(--delta)" font-size="8.5">  event_id   STRING NOT NULL,</text>
      <text x="24" y="100" fill="var(--delta)" font-size="8.5">  user_id    STRING NOT NULL,</text>
      <text x="24" y="114" fill="var(--delta)" font-size="8.5">  event_date DATE   NOT NULL,</text>
      <text x="24" y="128" fill="var(--delta)" font-size="8.5">  duration   INT               -- nullable OK</text>
      <text x="24" y="142" fill="var(--delta)" font-size="8.5">) USING DELTA;</text>
      <text x="24" y="158" fill="var(--text-muted)" font-size="8" font-weight="700">-- Add NOT NULL to existing column (only if no current nulls)</text>
      <text x="24" y="172" fill="var(--delta)" font-size="8.5">ALTER TABLE silver.user_events</text>
      <text x="24" y="186" fill="var(--delta)" font-size="8.5">  ALTER COLUMN content_id SET NOT NULL;</text>
      <text x="24" y="202" fill="var(--text-muted)" font-size="8" font-weight="700">-- Remove NOT NULL</text>
      <text x="24" y="216" fill="var(--delta)" font-size="8.5">ALTER TABLE silver.user_events</text>
      <text x="24" y="230" fill="var(--delta)" font-size="8.5">  ALTER COLUMN content_id DROP NOT NULL;</text>
      <text x="240" y="276" text-anchor="middle" fill="var(--text-muted)" font-size="8">Delta verifies no existing nulls before SET NOT NULL — safe operation</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">CHECK Constraint</text>
      <rect x="14" y="38" width="452" height="224" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="58" fill="var(--text-muted)" font-size="8" font-weight="700">-- Add CHECK at table creation</text>
      <text x="24" y="72" fill="var(--delta)" font-size="8.5">CREATE TABLE gold.content_performance (</text>
      <text x="24" y="86" fill="var(--delta)" font-size="8.5">  content_id STRING NOT NULL,</text>
      <text x="24" y="100" fill="var(--delta)" font-size="8.5">  play_rate DOUBLE,</text>
      <text x="24" y="114" fill="var(--delta)" font-size="8.5">  CONSTRAINT valid_play_rate CHECK (play_rate BETWEEN 0 AND 1)</text>
      <text x="24" y="128" fill="var(--delta)" font-size="8.5">) USING DELTA;</text>
      <text x="24" y="144" fill="var(--text-muted)" font-size="8" font-weight="700">-- Add CHECK to existing table</text>
      <text x="24" y="158" fill="var(--delta)" font-size="8.5">ALTER TABLE gold.daily_metrics</text>
      <text x="24" y="172" fill="var(--delta)" font-size="8.5">  ADD CONSTRAINT non_negative_duration</text>
      <text x="24" y="186" fill="var(--delta)" font-size="8.5">  CHECK (watch_duration_secs &gt;= 0);</text>
      <text x="24" y="202" fill="var(--text-muted)" font-size="8" font-weight="700">-- Cross-column constraint</text>
      <text x="24" y="216" fill="var(--delta)" font-size="8.5">ALTER TABLE silver.sessions</text>
      <text x="24" y="230" fill="var(--delta)" font-size="8.5">  ADD CONSTRAINT valid_session CHECK (end_time &gt;= start_time);</text>
      <text x="240" y="276" text-anchor="middle" fill="var(--text-muted)" font-size="8">NULL in expression = NULL (not FALSE) — use NOT NULL + CHECK together</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Constraint Violation Behavior</text>
      <rect x="20" y="44" width="440" height="80" rx="7" fill="rgba(248,81,73,0.08)" stroke="rgba(248,81,73,0.4)" stroke-width="1.5"/>
      <text x="240" y="62" text-anchor="middle" fill="#f85149" font-size="9" font-weight="700">Write Attempt with Bad Row</text>
      <text x="30" y="80" fill="var(--text-muted)" font-size="8">INSERT INTO gold.daily_metrics VALUES ('U1', -5, ...);</text>
      <text x="30" y="96" fill="var(--text-muted)" font-size="8">-- watch_duration_secs = -5 violates non_negative_duration CHECK</text>
      <text x="30" y="112" fill="#f85149" font-size="8">→ AnalysisException: CHECK constraint non_negative_duration violated</text>
      <defs><marker id="act" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L7,2.5 z" fill="var(--text-muted)"/></marker></defs>
      <path d="M240 124 L240 148" stroke="var(--text-muted)" stroke-width="1.2" stroke-dasharray="4,2" fill="none" marker-end="url(#act)"/>
      <rect x="20" y="148" width="440" height="80" rx="7" fill="rgba(34,197,94,0.08)" stroke="#22c55e" stroke-width="1.5"/>
      <text x="240" y="166" text-anchor="middle" fill="#22c55e" font-size="9" font-weight="700">Atomic Rollback</text>
      <text x="30" y="184" fill="var(--text-muted)" font-size="8">Entire transaction is rolled back — zero rows written to table.</text>
      <text x="30" y="198" fill="var(--text-muted)" font-size="8">Delta log is NOT updated. Table remains at previous version.</text>
      <text x="30" y="212" fill="var(--text-muted)" font-size="8">No partial writes. Table stays consistent.</text>
      <rect x="20" y="244" width="440" height="40" rx="6" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="30" y="260" fill="var(--text-muted)" font-size="8" font-weight="700">NULL behavior:</text>
      <text x="30" y="276" fill="var(--text-muted)" font-size="8">NULL passes CHECK (NULL &gt;= 0 = NULL, not FALSE). Add NOT NULL to also block nulls.</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">Managing Constraints</text>
      <rect x="14" y="38" width="452" height="224" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="58" fill="var(--text-muted)" font-size="8" font-weight="700">-- Add a constraint</text>
      <text x="24" y="72" fill="var(--delta)" font-size="8.5">ALTER TABLE gold.daily_metrics</text>
      <text x="24" y="86" fill="var(--delta)" font-size="8.5">  ADD CONSTRAINT valid_status CHECK (status IN ('ok','warn','err'));</text>
      <text x="24" y="102" fill="var(--text-muted)" font-size="8" font-weight="700">-- Drop a constraint (does NOT delete existing violating data)</text>
      <text x="24" y="116" fill="var(--delta)" font-size="8.5">ALTER TABLE gold.daily_metrics DROP CONSTRAINT valid_status;</text>
      <text x="24" y="132" fill="var(--text-muted)" font-size="8" font-weight="700">-- View all constraints on a table</text>
      <text x="24" y="146" fill="var(--delta)" font-size="8.5">SHOW TBLPROPERTIES gold.daily_metrics;</text>
      <text x="24" y="160" fill="var(--text-muted)" font-size="7.5">-- delta.constraints.valid_status = status IN ('ok','warn','err')</text>
      <text x="24" y="176" fill="var(--text-muted)" font-size="8" font-weight="700">-- Constraints also visible in DESCRIBE DETAIL</text>
      <text x="24" y="190" fill="var(--delta)" font-size="8.5">DESCRIBE DETAIL gold.daily_metrics;</text>
      <text x="24" y="204" fill="var(--text-muted)" font-size="7.5">-- tableProperties column shows all delta.constraints.* entries</text>
      <text x="24" y="220" fill="var(--text-muted)" font-size="8" font-weight="700">-- Check if rows would violate before adding constraint</text>
      <text x="24" y="234" fill="var(--delta)" font-size="8.5">SELECT COUNT(*) FROM gold.daily_metrics</text>
      <text x="24" y="248" fill="var(--delta)" font-size="8.5">  WHERE NOT (watch_duration_secs &gt;= 0);  -- must be 0</text>
      <text x="240" y="278" text-anchor="middle" fill="var(--text-muted)" font-size="8">Adding constraint to table with violating rows raises AnalysisException</text>
    </svg>`,

    `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="26" text-anchor="middle" fill="var(--delta)" font-size="13" font-weight="700">MediaStream: Constraints on Gold Tables</text>
      <rect x="14" y="38" width="452" height="224" rx="7" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="24" y="58" fill="var(--text-muted)" font-size="8" font-weight="700">-- gold.daily_metrics (2 constraints)</text>
      <text x="24" y="72" fill="var(--delta)" font-size="8.5">ADD CONSTRAINT non_neg_duration CHECK (watch_duration_secs &gt;= 0);</text>
      <text x="24" y="86" fill="var(--delta)" font-size="8.5">ADD CONSTRAINT pos_impressions CHECK (impression_count &gt; 0);</text>
      <text x="24" y="102" fill="var(--text-muted)" font-size="8" font-weight="700">-- gold.content_performance (2 constraints)</text>
      <text x="24" y="116" fill="var(--delta)" font-size="8.5">ADD CONSTRAINT valid_play_rate CHECK (play_rate BETWEEN 0 AND 1);</text>
      <text x="24" y="130" fill="var(--delta)" font-size="8.5">ADD CONSTRAINT valid_completion CHECK (completion_rate BETWEEN 0 AND 1);</text>
      <text x="24" y="146" fill="var(--text-muted)" font-size="8" font-weight="700">-- gold.subscription_events (1 constraint)</text>
      <text x="24" y="160" fill="var(--delta)" font-size="8.5">ADD CONSTRAINT valid_event_type CHECK (</text>
      <text x="24" y="174" fill="var(--delta)" font-size="8.5">  event_type IN ('subscribe','cancel','upgrade','downgrade'));</text>
      <text x="24" y="190" fill="var(--text-muted)" font-size="8" font-weight="700">-- gold.ad_revenue (1 constraint)</text>
      <text x="24" y="204" fill="var(--delta)" font-size="8.5">ADD CONSTRAINT non_neg_revenue CHECK (revenue_usd &gt;= 0);</text>
      <line x1="24" y1="218" x2="452" y2="218" stroke="var(--border-subtle)" stroke-width="0.8"/>
      <text x="24" y="234" fill="var(--delta)" font-size="8">8 Gold tables · 6 CHECK constraints · 12 bugs caught in 90 days</text>
      <text x="24" y="250" fill="var(--text-muted)" font-size="8">Without constraints, negative durations would silently corrupt</text>
      <text x="24" y="264" fill="var(--text-muted)" font-size="8">executive dashboards. Now caught at write, not at query time.</text>
    </svg>`,
  ];

  let _engine = null;

  function _updateStep(el, si) {
    el.querySelectorAll('.ct-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.ct-diagram');
    if (diag) diag.innerHTML = DIAGRAMS[si] || '';
    const info = el.querySelector('.ct-info');
    if (info) info.textContent = STEPS[si].detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="ct-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="ct-header module-header">
        <div>
          <div class="module-tag" style="background:var(--delta)">DELTA CORE</div>
          <h2 class="module-title">Constraints &amp; Check</h2>
          <p class="module-subtitle">NOT NULL and CHECK constraints enforce data quality at write time — 12 bugs caught in 90 days at MediaStream</p>
        </div>
      </div>
      <div class="ct-pills step-pills">${pills}</div>
      <div class="ct-diagram diagram-frame"></div>
      <div class="ct-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'ct-page page-enter';
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
    container.querySelectorAll('.ct-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['constraints'] = {
    id: 'constraints', title: 'Constraints & Check', group: 'Delta Lake Core',
    render: _render,
    destroy() { if (_engine) { _engine.destroy(); _engine = null; } IV.AnimationControls.hide(); },
  };
})();
