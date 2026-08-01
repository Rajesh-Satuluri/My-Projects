/* ============================================================
   Time Travel — 7-step animated module
   VERSION AS OF · TIMESTAMP AS OF · RESTORE · ML pinning
   CSS prefix: tv-
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Version History',
      desc: 'Every write to a Delta table creates a new immutable version. The full history is queryable back to the retention window.',
      detail: 'MediaStream\'s user_sessions table has 14 months of history — 420+ versions. Each version corresponds to one streaming micro-batch or DLT pipeline run.',
    },
    {
      label: 'DESCRIBE HISTORY',
      desc: 'DESCRIBE HISTORY shows the full audit trail: who wrote what, when, what operation, and how many rows changed.',
      detail: 'Used in post-incident analysis (INC-2022-011): MediaStream engineers ran DESCRIBE HISTORY to find exactly which pipeline run introduced 800M duplicate rows.',
    },
    {
      label: 'VERSION AS OF',
      desc: 'Read any past state of the table by version number. The query runs against the exact snapshot at that point in time.',
      detail: 'SELECT * FROM user_sessions VERSION AS OF 418 — recreates the exact training dataset used for the recommendation model deployed on 2024-01-20.',
    },
    {
      label: 'TIMESTAMP AS OF',
      desc: 'Query the table as it existed at a specific timestamp. Delta finds the latest version that existed at or before that moment.',
      detail: 'SELECT COUNT(*) FROM user_sessions TIMESTAMP AS OF \'2024-01-25 08:00:00\' — useful for hourly SLA reports that need a snapshot at a fixed point.',
    },
    {
      label: 'RESTORE TO VERSION',
      desc: 'Roll the entire table back to a past version. New commit entries are written that remove bad files and re-add old ones.',
      detail: 'INC-2022-011 recovery: RESTORE TABLE user_sessions TO VERSION AS OF 412 — instantly undid 3 days of double-counted events. A new version 425 now reflects the restored state.',
    },
    {
      label: 'ML Training Reproducibility',
      desc: 'Pin the exact version of every feature table used in a training run. Any future run with the same versions produces identical results.',
      detail: 'MediaStream ML team records the Delta version number for each feature table in MLflow experiment parameters. To debug a model regression, they restore the exact training data state in minutes.',
    },
    {
      label: 'Retention & VACUUM',
      desc: 'Delta retains versions for 30 days by default. VACUUM removes files no longer referenced by any version within the retention window.',
      detail: 'delta.logRetentionDuration = "30 days" on all MediaStream tables. GDPR requests use time travel to verify deletion — then VACUUM removes the actual Parquet files after the retention window.',
    },
  ];

  let _engine = null;

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'tv-page page-enter';
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

    container.querySelectorAll('.tv-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  function _updateStep(el, si) {
    el.querySelectorAll('.tv-pill').forEach((pill, idx) => {
      pill.classList.toggle('active', idx === si);
      pill.classList.toggle('visited', idx < si);
    });
    const step = STEPS[si];
    const diagram = el.querySelector('#tv-diagram');
    if (diagram) diagram.innerHTML = _buildDiagram(si);
    const title = el.querySelector('#tv-info-title');
    const body = el.querySelector('#tv-info-body');
    const detail = el.querySelector('#tv-info-detail');
    if (title) title.textContent = step.label;
    if (body) body.textContent = step.desc;
    if (detail) detail.textContent = step.detail;
  }

  function _buildDiagram(si) {
    const VERSIONS = [
      { v: 410, op: 'STREAMING', ts: '2024-01-22', rows: '+400K' },
      { v: 411, op: 'MERGE',     ts: '2024-01-23', rows: '+380K -12' },
      { v: 412, op: 'STREAMING', ts: '2024-01-24 08:00', rows: '+420K' },
      { v: 413, op: 'STREAMING', ts: '2024-01-24 12:00', rows: '+800M ← BUG' },
      { v: 414, op: 'STREAMING', ts: '2024-01-25', rows: '+440K' },
      { v: 415, op: 'OPTIMIZE',  ts: '2024-01-25', rows: '0 (compaction)' },
    ];

    const versionTimeline = (highlightV = null, highlightColor = '#58a6ff') => `
      <line x1="30" y1="80" x2="450" y2="80" stroke="#30363d" stroke-width="2"/>
      ${VERSIONS.map((v, i) => {
        const x = 50 + i * 78;
        const isBug = v.rows.includes('BUG');
        const isHL = v.v === highlightV;
        const color = isBug ? '#f85149' : isHL ? highlightColor : '#8b949e';
        return `
          <circle cx="${x}" cy="80" r="${isHL ? 10 : 7}" fill="${color}20" stroke="${color}" stroke-width="${isHL ? 2 : 1.5}"/>
          <text x="${x}" y="${isHL ? 76 : 74}" text-anchor="middle" font-size="${isHL ? 10 : 9}" font-weight="${isHL ? '700' : '400'}" fill="${color}">v${v.v}</text>
          <text x="${x}" y="98" text-anchor="middle" font-size="8" fill="${isBug ? '#f85149' : '#6e7681'}">${v.op}</text>
          <text x="${x}" y="112" text-anchor="middle" font-size="7" fill="#484f58">${v.ts}</text>
        `;
      }).join('')}
    `;

    const d = [
      /* 0 — Version history overview */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="240" y="24" text-anchor="middle" font-size="13" font-weight="700" fill="#e6edf3">user_sessions — Version Timeline</text>
        <text x="240" y="42" text-anchor="middle" font-size="10" fill="#8b949e">420+ versions across 14 months · 30-day retention window · Each version = one commit</text>
        ${versionTimeline()}
        <!-- Annotation boxes -->
        <rect x="20" y="128" width="440" height="60" rx="8" fill="rgba(45,51,59,.5)" stroke="#30363d"/>
        <text x="30" y="148" font-size="10" fill="#58a6ff" font-weight="600">Version 410:</text>
        <text x="115" y="148" font-size="10" fill="#8b949e">2024-01-22 streaming micro-batch · +400K new sessions · 128 MB Parquet</text>
        <text x="30" y="166" font-size="10" fill="#f85149" font-weight="600">Version 413:</text>
        <text x="115" y="166" font-size="10" fill="#f85149">INC-2022-011 reprocessing bug · +800M DUPLICATE rows · caused by pipeline retry</text>
        <text x="30" y="184" font-size="10" fill="#3fb950" font-weight="600">Version 412:</text>
        <text x="115" y="184" font-size="10" fill="#8b949e">Last clean version before the bug · target for RESTORE TO</text>
        <!-- Key insight -->
        <rect x="20" y="206" width="440" height="52" rx="8" fill="rgba(88,166,255,.06)" stroke="rgba(88,166,255,.25)"/>
        <text x="240" y="226" text-anchor="middle" font-size="10" font-weight="600" fill="#58a6ff">Every version is queryable forever (within retention window)</text>
        <text x="240" y="244" text-anchor="middle" font-size="10" fill="#8b949e">SELECT * FROM user_sessions VERSION AS OF 412</text>
        <text x="240" y="258" text-anchor="middle" font-size="10" fill="#8b949e">SELECT * FROM user_sessions TIMESTAMP AS OF '2024-01-24 07:00'</text>
        <text x="240" y="286" text-anchor="middle" font-size="11" fill="rgba(88,166,255,.7)">Time travel is free — no data copies, just reading older commit entries</text>
      </svg>`,

      /* 1 — DESCRIBE HISTORY */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="240" y="22" text-anchor="middle" font-size="12" font-weight="700" fill="#e6edf3">DESCRIBE HISTORY user_sessions</text>
        <!-- SQL -->
        <rect x="20" y="36" width="440" height="22" rx="4" fill="rgba(45,51,59,.8)" stroke="#30363d"/>
        <text x="30" y="51" font-size="10" fill="#58a6ff" font-family="monospace">DESCRIBE HISTORY user_sessions LIMIT 6;</text>
        <!-- Table header -->
        <rect x="20" y="66" width="440" height="22" rx="0" fill="rgba(30,86,160,.2)" stroke="rgba(88,166,255,.3)"/>
        <text x="32" y="81" font-size="9" font-weight="700" fill="#58a6ff">version</text>
        <text x="82" y="81" font-size="9" font-weight="700" fill="#58a6ff">timestamp</text>
        <text x="190" y="81" font-size="9" font-weight="700" fill="#58a6ff">operation</text>
        <text x="290" y="81" font-size="9" font-weight="700" fill="#58a6ff">operationMetrics</text>
        <text x="410" y="81" font-size="9" font-weight="700" fill="#58a6ff">userName</text>
        <!-- Rows -->
        ${[
          { v: 415, ts: '2024-01-25 18:00', op: 'OPTIMIZE',          metrics: 'filesAdded=12, filesRemoved=480', user: 'dlt-job@ms.io', color: '#8b949e' },
          { v: 414, ts: '2024-01-25 06:00', op: 'STREAMING UPDATE',  metrics: 'numAddedFiles=3, numAddedRows=440000', user: 'dlt-job@ms.io', color: '#8b949e' },
          { v: 413, ts: '2024-01-24 12:00', op: 'STREAMING UPDATE',  metrics: 'numAddedFiles=12, numAddedRows=800000000', user: 'dlt-job@ms.io', color: '#f85149' },
          { v: 412, ts: '2024-01-24 08:00', op: 'STREAMING UPDATE',  metrics: 'numAddedFiles=3, numAddedRows=420000', user: 'dlt-job@ms.io', color: '#3fb950' },
          { v: 411, ts: '2024-01-23 18:00', op: 'MERGE',             metrics: 'numTargetRowsInserted=380000, deleted=12', user: 'etl@ms.io', color: '#8b949e' },
          { v: 410, ts: '2024-01-22 06:00', op: 'STREAMING UPDATE',  metrics: 'numAddedFiles=3, numAddedRows=400000', user: 'dlt-job@ms.io', color: '#8b949e' },
        ].map((r, i) => `
          <rect x="20" y="${88 + i * 26}" width="440" height="26" fill="${r.color === '#f85149' ? 'rgba(248,81,73,.06)' : 'transparent'}" stroke="${i % 2 ? 'transparent' : 'rgba(48,54,61,.4)'}"/>
          <text x="32" y="${103 + i * 26}" font-size="9" font-family="monospace" fill="${r.color}">${r.v}</text>
          <text x="82" y="${103 + i * 26}" font-size="9" font-family="monospace" fill="#8b949e">${r.ts}</text>
          <text x="190" y="${103 + i * 26}" font-size="9" font-family="monospace" fill="${r.color}">${r.op}</text>
          <text x="290" y="${103 + i * 26}" font-size="8" font-family="monospace" fill="#6e7681">${r.metrics.substring(0,28)}</text>
          <text x="410" y="${103 + i * 26}" font-size="8" font-family="monospace" fill="#6e7681">${r.user}</text>
        `).join('')}
        <text x="240" y="286" text-anchor="middle" font-size="11" fill="rgba(88,166,255,.7)">v413 shows 800M rows added — immediately identified as the INC-2022-011 bug</text>
      </svg>`,

      /* 2 — VERSION AS OF */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="240" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#58a6ff">VERSION AS OF — Query Past State</text>
        ${versionTimeline(412, '#58a6ff')}
        <!-- Arrow pointing to v412 -->
        <line x1="206" y1="130" x2="206" y2="120" stroke="#58a6ff" stroke-width="1.5" stroke-dasharray="3 2"/>
        <text x="206" y="145" text-anchor="middle" font-size="9" fill="#58a6ff">↑ queried</text>
        <!-- SQL block -->
        <rect x="20" y="155" width="440" height="72" rx="8" fill="rgba(45,51,59,.7)" stroke="rgba(88,166,255,.35)"/>
        <text x="30" y="175" font-size="10" fill="#8b949e" font-family="monospace">-- Query the clean state before the bug</text>
        <text x="30" y="193" font-size="10" fill="#58a6ff" font-family="monospace">SELECT COUNT(*), SUM(watch_sec)</text>
        <text x="30" y="209" font-size="10" fill="#58a6ff" font-family="monospace">FROM user_sessions <tspan fill="#3fb950">VERSION AS OF 412</tspan></text>
        <text x="30" y="225" font-size="10" fill="#8b949e" font-family="monospace">WHERE event_date = '2024-01-24';</text>
        <!-- Result -->
        <rect x="20" y="238" width="440" height="30" rx="6" fill="rgba(63,185,80,.08)" stroke="rgba(63,185,80,.3)"/>
        <text x="30" y="258" font-size="10" fill="#3fb950" font-family="monospace">-- count(*) = 420000   sum(watch_sec) = 756000000   (correct, pre-bug)</text>
        <text x="240" y="286" text-anchor="middle" font-size="11" fill="rgba(88,166,255,.7)">No data copy — Delta reads older commit pointers in _delta_log</text>
      </svg>`,

      /* 3 — TIMESTAMP AS OF */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="240" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#a371f7">TIMESTAMP AS OF — Query at a Point in Time</text>
        ${versionTimeline(412, '#a371f7')}
        <!-- SQL block -->
        <rect x="20" y="130" width="440" height="90" rx="8" fill="rgba(45,51,59,.7)" stroke="rgba(163,113,247,.35)"/>
        <text x="30" y="150" font-size="10" fill="#8b949e" font-family="monospace">-- SLA report: DAU count as of 08:00 before pipeline ran</text>
        <text x="30" y="168" font-size="10" fill="#58a6ff" font-family="monospace">SELECT COUNT(DISTINCT user_id) AS dau</text>
        <text x="30" y="184" font-size="10" fill="#58a6ff" font-family="monospace">FROM user_sessions</text>
        <text x="30" y="200" font-size="10" fill="#a371f7" font-family="monospace">  TIMESTAMP AS OF '2024-01-24 08:00:00'</text>
        <text x="30" y="216" font-size="10" fill="#8b949e" font-family="monospace">WHERE event_date = '2024-01-24';</text>
        <!-- How Delta resolves it -->
        <rect x="20" y="234" width="440" height="38" rx="6" fill="rgba(163,113,247,.06)" stroke="rgba(163,113,247,.25)"/>
        <text x="30" y="252" font-size="10" fill="#a371f7">Delta resolution: finds latest version where commitTimestamp ≤ '2024-01-24 08:00:00'</text>
        <text x="30" y="268" font-size="10" fill="#8b949e">→ Version 412 (committed 2024-01-24 08:01) → returns pre-bug state</text>
        <text x="240" y="292" text-anchor="middle" font-size="11" fill="rgba(163,113,247,.7)">Delta maps timestamp → version via commitInfo in _delta_log</text>
      </svg>`,

      /* 4 — RESTORE */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs><marker id="tv-arr" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto"><polygon points="0 0 7 3.5 0 7" fill="#f97316"/></marker></defs>
        <text x="240" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#f97316">RESTORE TO VERSION — Undo Bad Writes</text>
        <!-- Before restore -->
        <text x="20" y="50" font-size="10" font-weight="700" fill="#8b949e">Before RESTORE (current = v425, corrupt since v413):</text>
        <line x1="30" y1="78" x2="450" y2="78" stroke="#30363d" stroke-width="1.5"/>
        ${[[60,'v412','#3fb950'],[140,'v413','#f85149'],[220,'v414-424','#6e7681'],[340,'v425','#6e7681']].map(([x,v,c]) => `
          <circle cx="${x}" cy="78" r="7" fill="${c}20" stroke="${c}"/>
          <text x="${x}" y="66" text-anchor="middle" font-size="8" fill="${c}">${v}</text>
        `).join('')}
        <text x="140" y="96" text-anchor="middle" font-size="8" fill="#f85149">BUG: +800M rows</text>
        <!-- SQL -->
        <rect x="20" y="110" width="440" height="52" rx="8" fill="rgba(45,51,59,.7)" stroke="rgba(249,115,22,.35)"/>
        <text x="30" y="130" font-size="10" fill="#8b949e" font-family="monospace">-- Incident response: undo the reprocessing bug</text>
        <text x="30" y="148" font-size="10" fill="#58a6ff" font-family="monospace">RESTORE TABLE user_sessions <tspan fill="#f97316">TO VERSION AS OF 412</tspan>;</text>
        <!-- What Delta does -->
        <rect x="20" y="170" width="440" height="60" rx="6" fill="rgba(249,115,22,.06)" stroke="rgba(249,115,22,.3)"/>
        <text x="30" y="188" font-size="10" font-weight="600" fill="#f97316">Delta writes a NEW commit (v426) that:</text>
        <text x="30" y="204" font-size="10" fill="#8b949e">• Adds "remove" actions for all files added in v413–v425</text>
        <text x="30" y="220" font-size="10" fill="#8b949e">• Adds "add" actions for all files that existed at v412</text>
        <!-- After restore -->
        <text x="20" y="248" font-size="10" font-weight="700" fill="#8b949e">After RESTORE (v426 = logically identical to v412):</text>
        <line x1="30" y1="268" x2="450" y2="268" stroke="#30363d" stroke-width="1.5"/>
        ${[[60,'v412','#3fb950'],[180,'…','#484f58'],[310,'v425','#484f58'],[410,'v426 ✓','#3fb950']].map(([x,v,c]) => `
          <circle cx="${x}" cy="268" r="7" fill="${c}20" stroke="${c}"/>
          <text x="${x}" y="256" text-anchor="middle" font-size="8" fill="${c}">${v}</text>
        `).join('')}
        <text x="240" y="292" text-anchor="middle" font-size="11" fill="rgba(249,115,22,.7)">RESTORE is non-destructive — old versions v413–v425 remain in history</text>
      </svg>`,

      /* 5 — ML reproducibility */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="240" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#3fb950">ML Training Reproducibility</text>
        <!-- MLflow run card -->
        <rect x="20" y="38" width="250" height="160" rx="8" fill="rgba(45,51,59,.6)" stroke="#30363d"/>
        <text x="145" y="60" text-anchor="middle" font-size="11" font-weight="700" fill="#8b949e">MLflow Run: rec-model-v42</text>
        <text x="30" y="80" font-size="10" font-weight="600" fill="#6e7681">Parameters:</text>
        <text x="30" y="96" font-size="10" fill="#8b949e" font-family="monospace">user_features_version:    418</text>
        <text x="30" y="112" font-size="10" fill="#8b949e" font-family="monospace">item_features_version:    305</text>
        <text x="30" y="128" font-size="10" fill="#8b949e" font-family="monospace">interaction_matrix_ver:   612</text>
        <text x="30" y="148" font-size="10" font-weight="600" fill="#6e7681">Metrics:</text>
        <text x="30" y="164" font-size="10" fill="#3fb950" font-family="monospace">NDCG@10: 0.412   MRR: 0.387</text>
        <text x="30" y="180" font-size="10" fill="#8b949e" font-family="monospace">trained: 2024-01-20 14:30</text>
        <!-- Replay block -->
        <rect x="290" y="38" width="170" height="160" rx="8" fill="rgba(63,185,80,.08)" stroke="rgba(63,185,80,.35)"/>
        <text x="375" y="60" text-anchor="middle" font-size="11" font-weight="700" fill="#3fb950">Replay Training</text>
        <text x="300" y="80" font-size="9" fill="#8b949e" font-family="monospace">user_features</text>
        <text x="300" y="96" font-size="9" fill="#58a6ff" font-family="monospace">VERSION AS OF 418</text>
        <text x="300" y="116" font-size="9" fill="#8b949e" font-family="monospace">item_features</text>
        <text x="300" y="132" font-size="9" fill="#58a6ff" font-family="monospace">VERSION AS OF 305</text>
        <text x="300" y="152" font-size="9" fill="#8b949e" font-family="monospace">interaction_matrix</text>
        <text x="300" y="168" font-size="9" fill="#58a6ff" font-family="monospace">VERSION AS OF 612</text>
        <text x="375" y="190" text-anchor="middle" font-size="9" fill="#3fb950">Identical model output ✓</text>
        <!-- Explanation -->
        <rect x="20" y="212" width="440" height="52" rx="8" fill="rgba(63,185,80,.06)" stroke="rgba(63,185,80,.25)"/>
        <text x="240" y="232" text-anchor="middle" font-size="10" font-weight="600" fill="#3fb950">Why this matters for MediaStream</text>
        <text x="30" y="248" font-size="10" fill="#8b949e">Model regression debugging: reproduce exact training data to isolate if issue is data or code.</text>
        <text x="30" y="262" font-size="10" fill="#8b949e">A/B experiment replay: re-run experiment with historical data to validate results.</text>
        <text x="240" y="292" text-anchor="middle" font-size="11" fill="rgba(63,185,80,.7)">Delta time travel makes ML experiments fully reproducible</text>
      </svg>`,

      /* 6 — Retention + VACUUM */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="240" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#e3b341">Retention Window & VACUUM</text>
        <!-- Timeline with retention window -->
        <line x1="30" y1="80" x2="450" y2="80" stroke="#30363d" stroke-width="2"/>
        <rect x="220" y="58" width="230" height="44" rx="4" fill="rgba(227,179,65,.08)" stroke="rgba(227,179,65,.35)" stroke-dasharray="4 3"/>
        <text x="335" y="76" text-anchor="middle" font-size="9" fill="#e3b341">30-day retention window</text>
        <text x="335" y="92" text-anchor="middle" font-size="8" fill="#6e7681">queryable via time travel</text>
        ${[
          [60,'v300','#484f58','2023-12-25'],
          [160,'v380','#484f58','2024-01-01'],
          [260,'v410','#3fb950','2024-01-22'],
          [360,'v420','#3fb950','2024-01-25'],
          [430,'v426','#3fb950','NOW'],
        ].map(([x,v,c,ts]) => `
          <circle cx="${x}" cy="80" r="7" fill="${c}20" stroke="${c}"/>
          <text x="${x}" y="68" text-anchor="middle" font-size="8" fill="${c}">${v}</text>
          <text x="${x}" y="108" text-anchor="middle" font-size="7" fill="#484f58">${ts}</text>
        `).join('')}
        <!-- Config -->
        <rect x="20" y="120" width="220" height="80" rx="8" fill="rgba(45,51,59,.6)" stroke="#30363d"/>
        <text x="130" y="140" text-anchor="middle" font-size="10" font-weight="700" fill="#8b949e">MediaStream Config</text>
        <text x="30" y="158" font-size="9" fill="#8b949e" font-family="monospace">delta.logRetentionDuration</text>
        <text x="30" y="174" font-size="9" fill="#e3b341" font-family="monospace">  = "30 days"</text>
        <text x="30" y="190" font-size="9" fill="#8b949e" font-family="monospace">delta.deletedFileRetentionDuration</text>
        <!-- VACUUM -->
        <rect x="260" y="120" width="200" height="80" rx="8" fill="rgba(45,51,59,.6)" stroke="#30363d"/>
        <text x="360" y="140" text-anchor="middle" font-size="10" font-weight="700" fill="#8b949e">VACUUM Command</text>
        <text x="270" y="158" font-size="9" fill="#8b949e" font-family="monospace">VACUUM user_sessions</text>
        <text x="270" y="174" font-size="9" fill="#8b949e" font-family="monospace">  RETAIN 720 HOURS;</text>
        <text x="270" y="190" font-size="9" fill="#6e7681">(removes files older than 30d)</text>
        <!-- GDPR use case -->
        <rect x="20" y="218" width="440" height="50" rx="8" fill="rgba(163,113,247,.06)" stroke="rgba(163,113,247,.25)"/>
        <text x="240" y="236" text-anchor="middle" font-size="10" font-weight="600" fill="#a371f7">GDPR Deletion Flow (INC-2023-019 fix)</text>
        <text x="30" y="252" font-size="10" fill="#8b949e">1. DELETE WHERE user_id='u-ghost-001' → creates new version with "remove" entries</text>
        <text x="30" y="266" font-size="10" fill="#8b949e">2. Wait 30 days retention window → run VACUUM → actual Parquet bytes deleted from S3</text>
        <text x="240" y="292" text-anchor="middle" font-size="11" fill="rgba(227,179,65,.7)">Never run VACUUM with &lt; 168 hours — breaks time travel for recent versions</text>
      </svg>`,
    ];
    return d[si] || d[0];
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) => `
      <button class="tv-pill${i === 0 ? ' active' : ''}" data-step="${i}">${i + 1}. ${s.label}</button>
    `).join('');
    return `
<style>
.tv-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.tv-header { padding: var(--space-4) var(--space-6); background: var(--bg-2); border-bottom: 1px solid var(--border-default); flex-shrink: 0; }
.tv-title { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.tv-subtitle { font-size: var(--text-sm); color: var(--text-muted); margin-top: 2px; margin-bottom: var(--space-3); }
.tv-pills { display:flex; gap: var(--space-2); flex-wrap: wrap; }
.tv-pill {
  padding: 4px 12px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 600;
  background: var(--bg-3); border: 1px solid var(--border-default); color: var(--text-muted);
  cursor: pointer; transition: all var(--ease-base); white-space: nowrap;
}
.tv-pill:hover { border-color: var(--border-muted); color: var(--text-secondary); }
.tv-pill.visited { border-color: var(--border-muted); color: var(--text-secondary); }
.tv-pill.active { background: rgba(88,166,255,.12); border-color: var(--blue); color: var(--blue); }
.tv-body { flex:1; display:grid; grid-template-columns: 1fr 320px; min-height:0; overflow:hidden; }
.tv-diagram-area { display:flex; align-items:center; justify-content:center; padding: var(--space-6); background: var(--bg-1); overflow:hidden; }
.tv-diagram-area svg { max-width:100%; max-height:100%; }
.tv-info-panel { border-left: 1px solid var(--border-default); background: var(--bg-2); padding: var(--space-5); display:flex; flex-direction:column; gap: var(--space-4); overflow-y:auto; }
.tv-info-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.tv-info-body { font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.6; }
.tv-detail-box { background: var(--bg-3); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: var(--space-4); }
.tv-detail-label { font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing:.06em; color: var(--blue); margin-bottom: var(--space-2); }
.tv-detail-text { font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.55; }
.tv-nav-hint { font-size: var(--text-xs); color: var(--text-muted); margin-top: auto; }
</style>
<div class="tv-header">
  <div class="tv-title">Time Travel</div>
  <div class="tv-subtitle">Query any past version · RESTORE corrupted tables · Reproduce ML experiments</div>
  <div class="tv-pills">${pills}</div>
</div>
<div class="tv-body">
  <div class="tv-diagram-area"><div id="tv-diagram">${_buildDiagram(0)}</div></div>
  <div class="tv-info-panel">
    <div id="tv-info-title" class="tv-info-title">${STEPS[0].label}</div>
    <div id="tv-info-body" class="tv-info-body">${STEPS[0].desc}</div>
    <div class="tv-detail-box">
      <div class="tv-detail-label">📡 MediaStream Context</div>
      <div id="tv-info-detail" class="tv-detail-text">${STEPS[0].detail}</div>
    </div>
    <div class="tv-nav-hint">Use ← → keys or animation controls to step through</div>
  </div>
</div>`;
  }

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['time-travel'] = {
    id: 'time-travel', title: 'Time Travel', group: 'delta-core',
    render: _render,
    destroy() { if (_engine) { _engine.destroy(); _engine = null; } IV.AnimationControls.hide(); },
  };
})();
