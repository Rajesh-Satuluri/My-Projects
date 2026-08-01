/* ============================================================
   ACID Transactions — 6-step animated deep dive
   How Delta Lake achieves Atomicity, Consistency, Isolation, Durability
   CSS prefix: at-
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'The ACID Promise',
      desc: 'Delta Lake provides full ACID transactions over object storage. Every write is atomic, consistent, isolated, and durable.',
      detail: 'Before Delta, MediaStream had partial writes (INC-2022-003), duplicate rows (INC-2022-011), and schema chaos (INC-2023-007). Each violated a different ACID property.',
    },
    {
      label: 'Atomicity',
      desc: 'A write either commits all its files or commits nothing. Partial tables are impossible — readers never see incomplete data.',
      detail: 'Spark writes Parquet files to S3 speculatively. Only when a new JSON entry is appended to _delta_log/ does the write become visible. If the job dies before that, the orphaned files are invisible.',
    },
    {
      label: 'Consistency',
      desc: 'Every write is validated against the table schema. Columns with constraints are checked. Bad data is rejected at the transaction boundary.',
      detail: 'Delta enforces the schema on every write. A pipeline trying to write a STRING into an INTEGER column throws AnalysisException before touching S3. CHECK constraints (delta.constraints.*) are evaluated row-by-row.',
    },
    {
      label: 'Isolation',
      desc: 'Readers always see a consistent snapshot. A reader at version 10 sees version 10 even while 100 concurrent writes are landing version 11, 12, 13…',
      detail: 'Delta uses MVCC (Multi-Version Concurrency Control). Each read pins a snapshot version at query start. Writers create new versions; they never modify existing commit entries. Snapshot isolation is the default — no dirty reads ever.',
    },
    {
      label: 'Durability',
      desc: 'Once a commit JSON file is written to S3, the data is permanent. Spark driver crashes, network failures, cluster restarts — none can undo a committed transaction.',
      detail: 'S3 provides 99.999999999% (11 nines) durability. Delta piggybacks on S3 atomicity for the final commit step: writing a new JSON file is an atomic S3 PUT. If the PUT succeeds, the transaction is committed. Period.',
    },
    {
      label: 'Optimistic Concurrency',
      desc: 'Multiple writers can proceed in parallel. Delta detects conflicts at commit time — only if two writers touched the same data do they conflict.',
      detail: 'Writer A and Writer B both read version 10. A commits first (version 11). When B tries to commit as version 11, Delta checks if A\'s changes conflict with B\'s predicate. If no overlap (e.g., different partitions), B\'s commit is re-tried as version 12. If conflict, B\'s transaction is aborted and must retry from scratch.',
    },
  ];

  let _engine = null;

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'at-page page-enter';
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

    container.querySelectorAll('.at-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  function _updateStep(el, si) {
    el.querySelectorAll('.at-pill').forEach((pill, idx) => {
      pill.classList.toggle('active', idx === si);
      pill.classList.toggle('visited', idx < si);
    });
    const step = STEPS[si];
    const diagram = el.querySelector('#at-diagram');
    if (diagram) diagram.innerHTML = _buildDiagram(si);
    const title = el.querySelector('#at-info-title');
    const body = el.querySelector('#at-info-body');
    const detail = el.querySelector('#at-info-detail');
    if (title) title.textContent = step.label;
    if (body) body.textContent = step.desc;
    if (detail) detail.textContent = step.detail;
  }

  function _buildDiagram(si) {
    const d = [
      /* 0 — ACID overview */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="240" y="26" text-anchor="middle" font-size="13" font-weight="700" fill="#e6edf3">Delta Lake ACID Guarantee</text>
        ${[
          { x: 30,  y: 50,  letter: 'A', name: 'Atomicity',     color: '#3fb950', desc1: 'All files commit', desc2: 'or none do', example: 'INC-2022-003 fixed' },
          { x: 255, y: 50,  letter: 'C', name: 'Consistency',   color: '#58a6ff', desc1: 'Schema enforced', desc2: 'on every write', example: 'INC-2023-007 fixed' },
          { x: 30,  y: 165, letter: 'I', name: 'Isolation',     color: '#a371f7', desc1: 'Snapshot read', desc2: 'never partial', example: 'Concurrent safe' },
          { x: 255, y: 165, letter: 'D', name: 'Durability',    color: '#e3b341', desc1: 'S3 + log commit', desc2: 'crash-proof', example: 'S3 11-nines' },
        ].map(p => `
          <rect x="${p.x}" y="${p.y}" width="195" height="105" rx="10" fill="${p.color}10" stroke="${p.color}" stroke-width="1.5"/>
          <circle cx="${p.x+32}" cy="${p.y+32}" r="18" fill="${p.color}20" stroke="${p.color}" stroke-width="1.5"/>
          <text x="${p.x+32}" y="${p.y+38}" text-anchor="middle" font-size="16" font-weight="800" fill="${p.color}">${p.letter}</text>
          <text x="${p.x+60}" y="${p.y+26}" font-size="13" font-weight="700" fill="${p.color}">${p.name}</text>
          <text x="${p.x+60}" y="${p.y+44}" font-size="10" fill="#8b949e">${p.desc1}</text>
          <text x="${p.x+60}" y="${p.y+58}" font-size="10" fill="#8b949e">${p.desc2}</text>
          <text x="${p.x+16}" y="${p.y+88}" font-size="10" fill="${p.color}99">✓ ${p.example}</text>
        `).join('')}
        <text x="240" y="286" text-anchor="middle" font-size="11" fill="#6e7681">ACID compliance is enforced by the _delta_log transaction log</text>
      </svg>`,

      /* 1 — Atomicity */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs><marker id="at-arr" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto"><polygon points="0 0 7 3.5 0 7" fill="#484f58"/></marker></defs>
        <text x="240" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#3fb950">Atomicity: All-or-Nothing Commit</text>
        <!-- Spark writer -->
        <rect x="20" y="40" width="120" height="50" rx="8" fill="rgba(249,115,22,.1)" stroke="rgba(249,115,22,.4)" stroke-width="1.5"/>
        <text x="80" y="62" text-anchor="middle" font-size="12" font-weight="600" fill="#f97316">Spark Writer</text>
        <text x="80" y="80" text-anchor="middle" font-size="10" fill="#8b949e">Streaming micro-batch</text>
        <!-- Phase 1 -->
        <text x="175" y="38" font-size="10" font-weight="600" fill="#8b949e">Phase 1: Write Files (speculative)</text>
        <line x1="140" y1="65" x2="162" y2="65" stroke="#484f58" stroke-width="1.5" marker-end="url(#at-arr)"/>
        ${[[162,50,'part-0001',true],[240,50,'part-0002',true],[318,50,'part-0003',true]].map(([x,y,name,ok]) => `
          <rect x="${x}" y="${y}" width="72" height="40" rx="6" fill="${ok?'rgba(63,185,80,.1)':'rgba(248,81,73,.1)'}" stroke="${ok?'rgba(63,185,80,.4)':'rgba(248,81,73,.4)'}"/>
          <text x="${x+36}" y="${y+16}" text-anchor="middle" font-size="9" fill="#8b949e">${name}</text>
          <text x="${x+36}" y="${y+32}" text-anchor="middle" font-size="9" fill="${ok?'#3fb950':'#f85149'}">.parquet${ok?' ✓':' —'}</text>
        `).join('')}
        <!-- Invisible to readers annotation -->
        <rect x="162" y="98" width="228" height="18" rx="4" fill="rgba(108,117,125,.08)" stroke="rgba(108,117,125,.2)"/>
        <text x="276" y="111" text-anchor="middle" font-size="9" fill="#6e7681">↑ invisible to readers until commit entry lands in _delta_log</text>
        <!-- Phase 2 -->
        <text x="20" y="148" font-size="10" font-weight="600" fill="#8b949e">Phase 2: Atomic commit to _delta_log</text>
        <rect x="20" y="158" width="440" height="52" rx="8" fill="rgba(63,185,80,.08)" stroke="rgba(63,185,80,.35)" stroke-width="1.5"/>
        <text x="240" y="178" text-anchor="middle" font-size="10" font-weight="700" fill="#3fb950">_delta_log/00001.json written atomically (S3 PUT)</text>
        <text x="240" y="196" text-anchor="middle" font-size="9" fill="#8b949e">"add": ["part-0001","part-0002","part-0003"] — all 3 files become visible simultaneously</text>
        <!-- Failure path -->
        <text x="20" y="240" font-size="10" font-weight="600" fill="#8b949e">If Spark crashes BEFORE Phase 2:</text>
        <rect x="20" y="250" width="440" height="32" rx="8" fill="rgba(248,81,73,.06)" stroke="rgba(248,81,73,.25)"/>
        <text x="240" y="270" text-anchor="middle" font-size="10" fill="#f85149">Orphaned part-*.parquet files on S3 — VACUUM will clean them. Readers see nothing.</text>
        <text x="240" y="292" text-anchor="middle" font-size="11" fill="rgba(63,185,80,.7)">Partial table is IMPOSSIBLE for readers</text>
      </svg>`,

      /* 2 — Consistency */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="240" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#58a6ff">Consistency: Schema + Constraints Enforced</text>
        <!-- Good write -->
        <rect x="20" y="40" width="200" height="100" rx="8" fill="rgba(63,185,80,.08)" stroke="rgba(63,185,80,.35)"/>
        <text x="120" y="62" text-anchor="middle" font-size="11" font-weight="600" fill="#3fb950">✓ Valid Write</text>
        <text x="30" y="82" font-size="10" fill="#8b949e" font-family="monospace">session_id: "s-abc123"</text>
        <text x="30" y="98" font-size="10" fill="#8b949e" font-family="monospace">user_id:    "u-456"</text>
        <text x="30" y="114" font-size="10" fill="#8b949e" font-family="monospace">watch_sec:  1800</text>
        <text x="30" y="130" font-size="10" fill="#8b949e" font-family="monospace">event_date: 2024-01-25</text>
        <!-- Bad write -->
        <rect x="260" y="40" width="200" height="100" rx="8" fill="rgba(248,81,73,.08)" stroke="rgba(248,81,73,.35)"/>
        <text x="360" y="62" text-anchor="middle" font-size="11" font-weight="600" fill="#f85149">✗ Invalid Write</text>
        <text x="270" y="82" font-size="10" fill="#8b949e" font-family="monospace">session_id: "s-abc123"</text>
        <text x="270" y="98" font-size="10" fill="#8b949e" font-family="monospace">user_id:    null</text>
        <text x="270" y="98" font-size="10" fill="#f85149" font-family="monospace">          ← NOT NULL</text>
        <text x="270" y="114" font-size="10" fill="#8b949e" font-family="monospace">watch_sec:  "two hours"</text>
        <text x="270" y="114" font-size="10" fill="#f85149" font-family="monospace">           ← wrong type</text>
        <text x="270" y="130" font-size="10" fill="#f85149" font-family="monospace">watch_sec must be INTEGER</text>
        <!-- Schema definition -->
        <rect x="20" y="155" width="440" height="80" rx="8" fill="rgba(45,51,59,.6)" stroke="#30363d"/>
        <text x="240" y="175" text-anchor="middle" font-size="10" font-weight="700" fill="#58a6ff">user_sessions schema (enforced on every write)</text>
        <text x="30" y="193" font-size="9" fill="#8b949e" font-family="monospace">session_id STRING NOT NULL  ·  user_id STRING NOT NULL  ·  content_id STRING</text>
        <text x="30" y="209" font-size="9" fill="#8b949e" font-family="monospace">watch_sec INTEGER  ·  event_date DATE  ·  device_type STRING</text>
        <text x="30" y="224" font-size="9" fill="#e3b341" font-family="monospace">delta.constraints.watch_sec_positive = "watch_sec > 0"</text>
        <text x="240" y="286" text-anchor="middle" font-size="11" fill="rgba(88,166,255,.7)">Schema mismatch → AnalysisException before any S3 write</text>
      </svg>`,

      /* 3 — Isolation */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs><marker id="at-arrb" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto"><polygon points="0 0 7 3.5 0 7" fill="#484f58"/></marker></defs>
        <text x="240" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#a371f7">Isolation: Snapshot Reads (MVCC)</text>
        <!-- Version timeline -->
        <line x1="30" y1="70" x2="450" y2="70" stroke="#30363d" stroke-width="2"/>
        ${[
          { x: 60,  v: 'v10', color: '#8b949e' },
          { x: 155, v: 'v11', color: '#3fb950' },
          { x: 250, v: 'v12', color: '#3fb950' },
          { x: 345, v: 'v13', color: '#3fb950' },
          { x: 440, v: 'v14 (future)', color: '#484f58' },
        ].map(p => `
          <circle cx="${p.x}" cy="70" r="7" fill="${p.color}" fill-opacity=".3" stroke="${p.color}"/>
          <text x="${p.x}" y="58" text-anchor="middle" font-size="9" fill="${p.color}">${p.v}</text>
        `).join('')}
        <!-- Reader 1 at v10 -->
        <rect x="20" y="90" width="160" height="55" rx="8" fill="rgba(88,166,255,.1)" stroke="rgba(88,166,255,.4)"/>
        <text x="100" y="112" text-anchor="middle" font-size="11" font-weight="600" fill="#58a6ff">ML Training Job</text>
        <text x="100" y="130" text-anchor="middle" font-size="9" fill="#8b949e">Pinned at version 10</text>
        <text x="100" y="144" text-anchor="middle" font-size="9" fill="#3fb950">Sees consistent v10 snapshot</text>
        <line x1="60" y1="77" x2="60" y2="90" stroke="rgba(88,166,255,.5)" stroke-width="1.5" stroke-dasharray="3 2"/>
        <!-- Reader 2 at v11 -->
        <rect x="115" y="160" width="160" height="55" rx="8" fill="rgba(163,113,247,.1)" stroke="rgba(163,113,247,.4)"/>
        <text x="195" y="182" text-anchor="middle" font-size="11" font-weight="600" fill="#a371f7">Dashboard Query</text>
        <text x="195" y="200" text-anchor="middle" font-size="9" fill="#8b949e">Pinned at version 11</text>
        <text x="195" y="214" text-anchor="middle" font-size="9" fill="#3fb950">Sees consistent v11 snapshot</text>
        <line x1="155" y1="77" x2="155" y2="160" stroke="rgba(163,113,247,.5)" stroke-width="1.5" stroke-dasharray="3 2"/>
        <!-- Writer at v13 -->
        <rect x="290" y="90" width="170" height="55" rx="8" fill="rgba(249,115,22,.1)" stroke="rgba(249,115,22,.4)"/>
        <text x="375" y="112" text-anchor="middle" font-size="11" font-weight="600" fill="#f97316">DLT Pipeline (Writer)</text>
        <text x="375" y="130" text-anchor="middle" font-size="9" fill="#8b949e">Creating version 14…</text>
        <text x="375" y="144" text-anchor="middle" font-size="9" fill="#6e7681">Readers unaffected</text>
        <line x1="440" y1="77" x2="440" y2="90" stroke="rgba(249,115,22,.5)" stroke-width="1.5" stroke-dasharray="3 2"/>
        <!-- Key fact -->
        <rect x="20" y="232" width="440" height="32" rx="8" fill="rgba(163,113,247,.06)" stroke="rgba(163,113,247,.25)"/>
        <text x="240" y="252" text-anchor="middle" font-size="10" fill="#a371f7">No dirty reads · No phantom reads · Readers never block writers · Writers never block readers</text>
        <text x="240" y="286" text-anchor="middle" font-size="11" fill="rgba(163,113,247,.7)">MVCC: concurrent versions coexist safely in _delta_log</text>
      </svg>`,

      /* 4 — Durability */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="240" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#e3b341">Durability: Committed = Permanent</text>
        <!-- Commit timeline -->
        ${[
          { x: 60,  y: 70, label: 'Files written', sub: 'part-*.parquet to S3', color: '#8b949e', ok: false },
          { x: 200, y: 70, label: 'Commit issued', sub: 'S3 PUT _delta_log/N.json', color: '#f97316', ok: false },
          { x: 340, y: 70, label: 'PUT succeeds', sub: 'S3 acknowledges write', color: '#3fb950', ok: true },
          { x: 420, y: 70, label: 'COMMITTED', sub: 'permanent and durable', color: '#e3b341', ok: true },
        ].map(p => `
          <circle cx="${p.x}" cy="${p.y}" r="10" fill="${p.color}20" stroke="${p.color}" stroke-width="1.5"/>
          <text x="${p.x}" y="${p.y+4}" text-anchor="middle" font-size="10" fill="${p.color}">${p.ok ? '✓' : '·'}</text>
          <text x="${p.x}" y="${p.y+24}" text-anchor="middle" font-size="9" font-weight="600" fill="${p.color}">${p.label}</text>
          <text x="${p.x}" y="${p.y+38}" text-anchor="middle" font-size="8" fill="#6e7681">${p.sub}</text>
        `).join('')}
        <line x1="70" y1="70" x2="185" y2="70" stroke="#30363d" stroke-width="1.5"/>
        <line x1="210" y1="70" x2="325" y2="70" stroke="#30363d" stroke-width="1.5"/>
        <line x1="350" y1="70" x2="405" y2="70" stroke="#3fb950" stroke-width="1.5"/>
        <!-- Failure scenarios -->
        <text x="20" y="132" font-size="11" font-weight="700" fill="#8b949e">Failure Scenarios</text>
        ${[
          { y: 148, when: 'Driver crashes BEFORE PUT',    result: 'Orphaned files on S3 → invisible to readers. VACUUM removes them.', color: '#f97316' },
          { y: 172, when: 'Network fails DURING PUT',     result: 'S3 guarantees atomic PUT: either the JSON exists or it does not. No partial writes.', color: '#f97316' },
          { y: 196, when: 'Driver crashes AFTER PUT',     result: 'Commit is permanently recorded. Next reader sees the committed version.', color: '#3fb950' },
          { y: 220, when: 'Cluster restarts',             result: 'Spark reads _delta_log to resume. All committed data survives, uncommitted is dropped.', color: '#3fb950' },
        ].map(r => `
          <text x="30" y="${r.y}" font-size="10" fill="${r.color}" font-weight="600">When: ${r.when}</text>
          <text x="30" y="${r.y+14}" font-size="10" fill="#8b949e">${r.result}</text>
        `).join('')}
        <text x="240" y="286" text-anchor="middle" font-size="11" fill="rgba(227,179,65,.7)">S3 provides 11 nines durability — committed data never disappears</text>
      </svg>`,

      /* 5 — OCC */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs><marker id="at-arrc" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto"><polygon points="0 0 7 3.5 0 7" fill="#484f58"/></marker></defs>
        <text x="240" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#58a6ff">Optimistic Concurrency Control</text>
        <!-- Timeline steps -->
        <rect x="20" y="40" width="440" height="22" rx="4" fill="rgba(45,51,59,.6)" stroke="#30363d"/>
        <text x="240" y="55" text-anchor="middle" font-size="10" fill="#8b949e">Both writers read version 10 simultaneously</text>
        <!-- Writer A -->
        <rect x="20" y="72" width="200" height="150" rx="8" fill="rgba(88,166,255,.08)" stroke="rgba(88,166,255,.4)"/>
        <text x="120" y="94" text-anchor="middle" font-size="11" font-weight="700" fill="#58a6ff">Writer A (DLT Batch 1)</text>
        <text x="35" y="112" font-size="9" fill="#8b949e">Reads version 10</text>
        <text x="35" y="128" font-size="9" fill="#8b949e">Writes files for date=2024-01-25</text>
        <text x="35" y="144" font-size="9" fill="#8b949e">Commits _delta_log/00011.json</text>
        <rect x="35" y="154" width="170" height="22" rx="4" fill="rgba(63,185,80,.12)" stroke="rgba(63,185,80,.4)"/>
        <text x="120" y="169" text-anchor="middle" font-size="9" font-weight="700" fill="#3fb950">✓ SUCCESS — version 11 created</text>
        <text x="35" y="198" font-size="9" fill="#6e7681">No conflict: partition date=2024-01-25</text>
        <!-- Writer B -->
        <rect x="260" y="72" width="200" height="150" rx="8" fill="rgba(249,115,22,.08)" stroke="rgba(249,115,22,.4)"/>
        <text x="360" y="94" text-anchor="middle" font-size="11" font-weight="700" fill="#f97316">Writer B (DLT Batch 2)</text>
        <text x="275" y="112" font-size="9" fill="#8b949e">Reads version 10</text>
        <text x="275" y="128" font-size="9" fill="#8b949e">Writes files for date=2024-01-26</text>
        <text x="275" y="144" font-size="9" fill="#8b949e">Tries _delta_log/00011.json → EXISTS</text>
        <rect x="275" y="154" width="170" height="22" rx="4" fill="rgba(248,81,73,.12)" stroke="rgba(248,81,73,.35)"/>
        <text x="360" y="169" text-anchor="middle" font-size="9" font-weight="700" fill="#f85149">⟳ RETRY as version 12</text>
        <text x="275" y="198" font-size="9" fill="#6e7681">Different partition → no conflict → commit</text>
        <!-- Result -->
        <rect x="20" y="234" width="440" height="22" rx="4" fill="rgba(63,185,80,.08)" stroke="rgba(63,185,80,.3)"/>
        <text x="240" y="249" text-anchor="middle" font-size="10" fill="#3fb950">Both writers succeed. No data lost. Serializable history maintained.</text>
        <text x="240" y="286" text-anchor="middle" font-size="11" fill="rgba(88,166,255,.7)">Same-partition conflict → TransactionConflictException (pipeline must re-read and retry)</text>
      </svg>`,
    ];
    return d[si] || d[0];
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) => `
      <button class="at-pill${i === 0 ? ' active' : ''}" data-step="${i}">${i + 1}. ${s.label}</button>
    `).join('');
    return `
<style>
.at-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.at-header {
  padding: var(--space-4) var(--space-6); background: var(--bg-2);
  border-bottom: 1px solid var(--border-default); flex-shrink: 0;
}
.at-title { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.at-subtitle { font-size: var(--text-sm); color: var(--text-muted); margin-top: 2px; margin-bottom: var(--space-3); }
.at-pills { display:flex; gap: var(--space-2); flex-wrap: wrap; }
.at-pill {
  padding: 4px 12px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 600;
  background: var(--bg-3); border: 1px solid var(--border-default); color: var(--text-muted);
  cursor: pointer; transition: all var(--ease-base); white-space: nowrap;
}
.at-pill:hover { border-color: var(--border-muted); color: var(--text-secondary); }
.at-pill.visited { border-color: var(--border-muted); color: var(--text-secondary); }
.at-pill.active { background: rgba(63,185,80,.12); border-color: var(--green); color: var(--green); }
.at-body { flex:1; display:grid; grid-template-columns: 1fr 320px; min-height:0; overflow:hidden; }
.at-diagram-area { display:flex; align-items:center; justify-content:center; padding: var(--space-6); background: var(--bg-1); overflow:hidden; }
.at-diagram-area svg { max-width:100%; max-height:100%; }
.at-info-panel {
  border-left: 1px solid var(--border-default); background: var(--bg-2);
  padding: var(--space-5); display:flex; flex-direction:column; gap: var(--space-4); overflow-y:auto;
}
.at-info-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.at-info-body { font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.6; }
.at-detail-box { background: var(--bg-3); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: var(--space-4); }
.at-detail-label { font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing:.06em; color: var(--delta); margin-bottom: var(--space-2); }
.at-detail-text { font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.55; }
.at-nav-hint { font-size: var(--text-xs); color: var(--text-muted); margin-top: auto; }
</style>
<div class="at-header">
  <div class="at-title">ACID Transactions</div>
  <div class="at-subtitle">How Delta Lake enforces Atomicity, Consistency, Isolation, Durability on object storage</div>
  <div class="at-pills">${pills}</div>
</div>
<div class="at-body">
  <div class="at-diagram-area"><div id="at-diagram">${_buildDiagram(0)}</div></div>
  <div class="at-info-panel">
    <div id="at-info-title" class="at-info-title">${STEPS[0].label}</div>
    <div id="at-info-body" class="at-info-body">${STEPS[0].desc}</div>
    <div class="at-detail-box">
      <div class="at-detail-label">📡 MediaStream Context</div>
      <div id="at-info-detail" class="at-detail-text">${STEPS[0].detail}</div>
    </div>
    <div class="at-nav-hint">Use ← → keys or animation controls to step through</div>
  </div>
</div>`;
  }

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['acid-transactions'] = {
    id: 'acid-transactions', title: 'ACID Transactions', group: 'delta-core',
    render: _render,
    destroy() { if (_engine) { _engine.destroy(); _engine = null; } IV.AnimationControls.hide(); },
  };
})();
