/* ============================================================
   Why Delta Lake? — 6-step animated module
   Problem: vanilla data lake on S3 → Solution: Delta Lake
   CSS prefix: wd-
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Steps ─────────────────────────────────────────────────── */
  const STEPS = [
    {
      label: 'The Data Swamp',
      desc: 'Raw Parquet files on S3 — no ACID, no versioning, no schema enforcement.',
      insight: 'MediaStream started like every company: dump data to S3, query with Spark. Works at 1M events/day. Breaks at 2.4 billion.',
    },
    {
      label: 'Problem 1: Dirty Reads',
      desc: 'Writer job fails mid-write. Reader sees partial data. Recommendations go wrong.',
      insight: 'INC-2022-003: Model trained on partial watch_history table. 40M users got broken recommendations for 3 days before detection.',
    },
    {
      label: 'Problem 2: Duplicate Data',
      desc: 'Reprocessing jobs re-ingest old events creating phantom rows. No deduplication possible.',
      insight: 'INC-2022-011: Revenue over-reported by 18% for a full quarter. 3 days of click events were double-counted after a pipeline retry.',
    },
    {
      label: 'Problem 3: Schema Chaos',
      desc: 'Team adds a column. 23 downstream pipelines break overnight. No schema registry.',
      insight: 'INC-2023-007: content_catalog schema changed without coordination. Every DLT pipeline reading it failed — killing next-day dashboards for 23 teams.',
    },
    {
      label: 'Delta Lake Transaction Log',
      desc: '_delta_log/ folder contains JSON commit files — the source of truth for all table state.',
      insight: 'Every write creates a new JSON entry in _delta_log/. Readers always see a consistent snapshot by reading the latest committed version.',
    },
    {
      label: 'Delta Solves Everything',
      desc: 'ACID transactions + schema enforcement + versioning = reliable lakehouse at any scale.',
      insight: 'With Delta Lake: no dirty reads (ACID), no duplicates (MERGE), no schema chaos (schema enforcement), full time travel (version history).',
    },
  ];

  let _engine = null;

  /* ── Render ────────────────────────────────────────────────── */
  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'wd-page page-enter';
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

    container.querySelectorAll('.wd-step-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  /* ── Update step visuals ──────────────────────────────────── */
  function _updateStep(el, si) {
    /* Step pills */
    el.querySelectorAll('.wd-step-pill').forEach((pill, idx) => {
      pill.classList.toggle('active', idx === si);
      pill.classList.toggle('visited', idx < si);
    });

    /* Diagram */
    const diagram = el.querySelector('#wd-diagram');
    if (diagram) diagram.innerHTML = _buildDiagram(si);

    /* Info panel */
    const title = el.querySelector('#wd-info-title');
    const body = el.querySelector('#wd-info-body');
    const insight = el.querySelector('#wd-info-insight');
    const badge = el.querySelector('#wd-step-badge');
    const step = STEPS[si];
    if (title) title.textContent = step.label;
    if (body) body.textContent = step.desc;
    if (insight) insight.textContent = step.insight;
    if (badge) {
      badge.textContent = si < 4 ? '⚠ Problem' : '✓ Solution';
      badge.style.color = si < 4 ? 'var(--red)' : 'var(--green)';
      badge.style.background = si < 4 ? 'rgba(248,81,73,.1)' : 'rgba(63,185,80,.1)';
      badge.style.border = si < 4 ? '1px solid rgba(248,81,73,.3)' : '1px solid rgba(63,185,80,.3)';
    }
  }

  /* ── SVG Diagrams per step ────────────────────────────────── */
  function _buildDiagram(si) {
    const diagrams = [
      /* 0 — Data swamp */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="240" y="26" text-anchor="middle" font-size="13" font-weight="700" fill="#8b949e">MediaStream Data Lake (Before Delta)</text>
        <!-- S3 bucket -->
        <rect x="40" y="50" width="400" height="220" rx="12" fill="rgba(45,51,59,.6)" stroke="#30363d" stroke-width="1.5"/>
        <text x="60" y="80" font-size="11" fill="#8b949e">s3://ms-datalake/ (5 PB, ~480M files)</text>
        <!-- Parquet files chaos -->
        ${_parquetFiles()}
        <!-- No order indicator -->
        <text x="240" y="286" text-anchor="middle" font-size="11" fill="rgba(248,81,73,.8)">⚠ No transactions · No versioning · No schema enforcement</text>
      </svg>`,

      /* 1 — Dirty read */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="240" y="26" text-anchor="middle" font-size="13" font-weight="700" fill="#f85149">INC-2022-003: Writer Fails Mid-Write</text>
        <!-- Writer -->
        <rect x="30" y="60" width="140" height="60" rx="8" fill="rgba(249,115,22,.1)" stroke="rgba(249,115,22,.4)" stroke-width="1.5"/>
        <text x="100" y="88" text-anchor="middle" font-size="12" font-weight="600" fill="#f97316">Spark Writer</text>
        <text x="100" y="106" text-anchor="middle" font-size="10" fill="#8b949e">Writing 3 Parquet files…</text>
        <!-- Files: 2 written, 1 not -->
        <rect x="200" y="55" width="70" height="36" rx="6" fill="rgba(63,185,80,.15)" stroke="rgba(63,185,80,.4)"/>
        <text x="235" y="70" text-anchor="middle" font-size="9" fill="#3fb950">part-00001</text>
        <text x="235" y="84" text-anchor="middle" font-size="9" fill="#3fb950">.parquet ✓</text>
        <rect x="280" y="55" width="70" height="36" rx="6" fill="rgba(63,185,80,.15)" stroke="rgba(63,185,80,.4)"/>
        <text x="315" y="70" text-anchor="middle" font-size="9" fill="#3fb950">part-00002</text>
        <text x="315" y="84" text-anchor="middle" font-size="9" fill="#3fb950">.parquet ✓</text>
        <rect x="360" y="55" width="70" height="36" rx="6" fill="rgba(248,81,73,.15)" stroke="rgba(248,81,73,.6)" stroke-dasharray="4 3"/>
        <text x="395" y="70" text-anchor="middle" font-size="9" fill="#f85149">part-00003</text>
        <text x="395" y="84" text-anchor="middle" font-size="9" fill="#f85149">.parquet ✗</text>
        <!-- Crash bolt -->
        <text x="100" y="145" text-anchor="middle" font-size="22">💥</text>
        <text x="100" y="165" text-anchor="middle" font-size="10" fill="#f85149">OOM crash</text>
        <!-- Arrow to reader -->
        <line x1="100" y1="120" x2="100" y2="180" stroke="#484f58" stroke-width="1" stroke-dasharray="3 2"/>
        <!-- Reader -->
        <rect x="30" y="180" width="140" height="60" rx="8" fill="rgba(88,166,255,.1)" stroke="rgba(88,166,255,.4)" stroke-width="1.5"/>
        <text x="100" y="208" text-anchor="middle" font-size="12" font-weight="600" fill="#58a6ff">ML Training Job</text>
        <text x="100" y="226" text-anchor="middle" font-size="10" fill="#f85149">Reads 2/3 files = corrupt model</text>
        <!-- Arrow from reader to files -->
        <path d="M170 210 L200 90" stroke="rgba(248,81,73,.6)" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arr-red)"/>
        <defs><marker id="arr-red" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><polygon points="0 0 6 3 0 6" fill="rgba(248,81,73,.6)"/></marker></defs>
        <text x="240" y="286" text-anchor="middle" font-size="11" fill="rgba(248,81,73,.8)">No isolation: reader sees partial write</text>
      </svg>`,

      /* 2 — Duplicates */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="240" y="26" text-anchor="middle" font-size="13" font-weight="700" fill="#f85149">INC-2022-011: Reprocessing Created Duplicates</text>
        <!-- Original data -->
        <rect x="30" y="50" width="200" height="100" rx="8" fill="rgba(45,51,59,.6)" stroke="#30363d"/>
        <text x="130" y="72" text-anchor="middle" font-size="11" font-weight="600" fill="#8b949e">watch_history (Day 1–3)</text>
        <text x="130" y="92" text-anchor="middle" font-size="10" fill="#6e7681">800M rows</text>
        <text x="130" y="108" text-anchor="middle" font-size="10" fill="#6e7681">user_id, content_id, watch_sec</text>
        <!-- Reprocess arrow -->
        <path d="M130 150 L130 180" stroke="var(--orange)" stroke-width="2" marker-end="url(#arr-ora)"/>
        <text x="155" y="170" font-size="9" fill="var(--orange)">Reprocess Day 1–3</text>
        <defs><marker id="arr-ora" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><polygon points="0 0 6 3 0 6" fill="var(--orange)"/></marker></defs>
        <!-- Result -->
        <rect x="30" y="185" width="200" height="80" rx="8" fill="rgba(248,81,73,.08)" stroke="rgba(248,81,73,.4)"/>
        <text x="130" y="208" text-anchor="middle" font-size="11" font-weight="600" fill="#f85149">watch_history (AFTER)</text>
        <text x="130" y="228" text-anchor="middle" font-size="12" font-weight="700" fill="#f85149">1.6B rows ← DOUBLE!</text>
        <text x="130" y="248" text-anchor="middle" font-size="10" fill="#8b949e">Revenue: +18% phantom</text>
        <!-- No upsert indicator -->
        <rect x="280" y="100" width="170" height="100" rx="8" fill="rgba(45,51,59,.4)" stroke="#30363d"/>
        <text x="365" y="128" text-anchor="middle" font-size="11" fill="#8b949e">Vanilla Parquet</text>
        <text x="365" y="150" text-anchor="middle" font-size="10" fill="#f85149">No MERGE INTO</text>
        <text x="365" y="168" text-anchor="middle" font-size="10" fill="#f85149">No deduplication</text>
        <text x="365" y="186" text-anchor="middle" font-size="10" fill="#f85149">Append-only</text>
        <text x="240" y="286" text-anchor="middle" font-size="11" fill="rgba(248,81,73,.8)">No idempotent writes: reprocessing = duplicates</text>
      </svg>`,

      /* 3 — Schema chaos */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="240" y="26" text-anchor="middle" font-size="13" font-weight="700" fill="#f85149">INC-2023-007: Schema Change Broke 23 Pipelines</text>
        <!-- Old schema -->
        <rect x="30" y="50" width="160" height="120" rx="8" fill="rgba(45,51,59,.6)" stroke="#3fb950" stroke-width="1.5"/>
        <text x="110" y="72" text-anchor="middle" font-size="11" font-weight="600" fill="#3fb950">content_catalog (v1)</text>
        <text x="50" y="92" font-size="10" fill="#8b949e">content_id  STRING</text>
        <text x="50" y="108" font-size="10" fill="#8b949e">title       STRING</text>
        <text x="50" y="124" font-size="10" fill="#8b949e">genre       STRING</text>
        <text x="50" y="140" font-size="10" fill="#8b949e">rating      FLOAT</text>
        <!-- New schema -->
        <rect x="220" y="50" width="180" height="140" rx="8" fill="rgba(45,51,59,.6)" stroke="rgba(248,81,73,.5)" stroke-width="1.5"/>
        <text x="310" y="72" text-anchor="middle" font-size="11" font-weight="600" fill="#f85149">content_catalog (v2)</text>
        <text x="240" y="92" font-size="10" fill="#8b949e">content_id  STRING</text>
        <text x="240" y="108" font-size="10" fill="#8b949e">title       STRING</text>
        <text x="240" y="124" font-size="10" fill="#8b949e">genre       STRING</text>
        <text x="240" y="140" font-size="10" fill="#8b949e">rating      FLOAT</text>
        <text x="240" y="156" font-size="10" fill="#f85149" font-weight="600">rights_territory STRING NOT NULL ← ADDED</text>
        <text x="240" y="172" font-size="10" fill="#f85149" font-weight="600">(no backfill!)</text>
        <!-- Broken pipelines -->
        <text x="110" y="210" text-anchor="middle" font-size="10" fill="#f85149">✗ 23 DLT pipelines FAILED</text>
        <text x="110" y="226" text-anchor="middle" font-size="10" fill="#f85149">AnalysisException: missing column</text>
        <text x="110" y="246" text-anchor="middle" font-size="10" fill="#8b949e">No schema registry — no warning</text>
        <text x="240" y="286" text-anchor="middle" font-size="11" fill="rgba(248,81,73,.8)">No schema governance: any team can break any pipeline</text>
      </svg>`,

      /* 4 — Transaction log */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="240" y="26" text-anchor="middle" font-size="13" font-weight="700" fill="#3fb950">Delta Lake: _delta_log/ is the Source of Truth</text>
        <!-- S3 directory tree -->
        <rect x="30" y="50" width="200" height="220" rx="8" fill="rgba(45,51,59,.5)" stroke="#30363d"/>
        <text x="50" y="74" font-size="10" fill="#8b949e" font-family="monospace">s3://ms-datalake/silver/sessions/</text>
        <text x="60" y="94" font-size="10" fill="#3fb950" font-family="monospace">├── _delta_log/</text>
        <text x="80" y="112" font-size="10" fill="#58a6ff" font-family="monospace">│  ├── 00000.json ✓</text>
        <text x="80" y="128" font-size="10" fill="#58a6ff" font-family="monospace">│  ├── 00001.json ✓</text>
        <text x="80" y="144" font-size="10" fill="#58a6ff" font-family="monospace">│  ├── 00002.json ✓</text>
        <text x="80" y="160" font-size="10" fill="#a371f7" font-family="monospace">│  └── 00010.cp.parquet</text>
        <text x="60" y="180" font-size="10" fill="#8b949e" font-family="monospace">├── part-0001.parquet</text>
        <text x="60" y="196" font-size="10" fill="#8b949e" font-family="monospace">├── part-0002.parquet</text>
        <text x="60" y="212" font-size="10" fill="#8b949e" font-family="monospace">└── part-0003.parquet</text>
        <!-- Arrow to commit -->
        <path d="M230 140 L270 140" stroke="#3fb950" stroke-width="1.5" marker-end="url(#arr-grn)"/>
        <defs><marker id="arr-grn" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><polygon points="0 0 6 3 0 6" fill="#3fb950"/></marker></defs>
        <!-- Commit file -->
        <rect x="270" y="90" width="180" height="130" rx="8" fill="rgba(45,51,59,.6)" stroke="rgba(88,166,255,.4)"/>
        <text x="360" y="112" text-anchor="middle" font-size="10" font-weight="600" fill="#58a6ff">00002.json (commit)</text>
        <text x="282" y="130" font-size="9" fill="#8b949e" font-family="monospace">"add": "part-0003.parquet"</text>
        <text x="282" y="148" font-size="9" fill="#8b949e" font-family="monospace">"stats": { "numRecords": 1.2M }</text>
        <text x="282" y="164" font-size="9" fill="#8b949e" font-family="monospace">"operationMetrics": {...}</text>
        <text x="282" y="182" font-size="9" fill="#6e7681" font-family="monospace">"timestamp": 1706140800000</text>
        <text x="282" y="200" font-size="9" fill="#6e7681" font-family="monospace">"engineInfo": "Spark 3.5"</text>
        <text x="240" y="286" text-anchor="middle" font-size="11" fill="rgba(63,185,80,.8)">Every write = one atomic JSON commit entry</text>
      </svg>`,

      /* 5 — Delta solves everything */
      `<svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="240" y="26" text-anchor="middle" font-size="13" font-weight="700" fill="#3fb950">Delta Lake: ACID + Versioning + Governance</text>
        <!-- 4 pillars -->
        ${[
          { x: 30,  y: 50,  color: '#3fb950', icon: 'A', title: 'Atomic',     desc1: 'All files commit', desc2: 'or none do' },
          { x: 150, y: 50,  color: '#58a6ff', icon: 'C', title: 'Consistent', desc1: 'Schema enforced', desc2: 'on every write' },
          { x: 270, y: 50,  color: '#a371f7', icon: 'I', title: 'Isolated',   desc1: 'Readers see', desc2: 'full snapshots' },
          { x: 390, y: 50,  color: '#e3b341', icon: 'D', title: 'Durable',    desc1: 'S3 + _delta_log', desc2: 'survives failures' },
        ].map(p => `
          <rect x="${p.x}" y="${p.y}" width="100" height="110" rx="8" fill="rgba(45,51,59,.6)" stroke="${p.color}" stroke-width="1.5"/>
          <circle cx="${p.x+50}" cy="${p.y+28}" r="16" fill="${p.color}" fill-opacity=".15" stroke="${p.color}" stroke-width="1.5"/>
          <text x="${p.x+50}" y="${p.y+34}" text-anchor="middle" font-size="14" font-weight="800" fill="${p.color}">${p.icon}</text>
          <text x="${p.x+50}" y="${p.y+64}" text-anchor="middle" font-size="11" font-weight="700" fill="${p.color}">${p.title}</text>
          <text x="${p.x+50}" y="${p.y+82}" text-anchor="middle" font-size="9" fill="#8b949e">${p.desc1}</text>
          <text x="${p.x+50}" y="${p.y+96}" text-anchor="middle" font-size="9" fill="#8b949e">${p.desc2}</text>
        `).join('')}
        <!-- Incident fixes -->
        ${[
          { y: 185, color: '#3fb950', check: '✓', label: 'INC-2022-003 fixed', fix: 'Atomic commits — partial writes are invisible to readers' },
          { y: 208, color: '#3fb950', check: '✓', label: 'INC-2022-011 fixed', fix: 'MERGE INTO for idempotent upserts with deduplication keys' },
          { y: 231, color: '#3fb950', check: '✓', label: 'INC-2023-007 fixed', fix: 'Schema enforcement + Unity Catalog schema registry alerts' },
        ].map(r => `
          <text x="40" y="${r.y}" font-size="10" fill="${r.color}">${r.check} <tspan font-weight="600">${r.label}:</tspan> <tspan fill="#8b949e">${r.fix}</tspan></text>
        `).join('')}
        <text x="240" y="286" text-anchor="middle" font-size="11" fill="rgba(63,185,80,.8)">Delta Lake: from data swamp to reliable lakehouse</text>
      </svg>`,
    ];
    return diagrams[si] || diagrams[0];
  }

  /* ── Helper: scattered parquet files ─────────────────────── */
  function _parquetFiles() {
    const files = [
      [60, 100], [140, 120], [220, 95], [300, 115], [380, 90],
      [80, 170], [175, 155], [260, 175], [350, 160], [420, 180],
      [120, 230], [210, 215], [310, 235], [400, 220],
    ];
    return files.map(([x, y]) => `
      <rect x="${x}" y="${y}" width="52" height="36" rx="4" fill="rgba(45,51,59,.8)" stroke="#30363d"/>
      <text x="${x + 26}" y="${y + 15}" text-anchor="middle" font-size="8" fill="#484f58">part-</text>
      <text x="${x + 26}" y="${y + 27}" text-anchor="middle" font-size="8" fill="#484f58">.parquet</text>
    `).join('');
  }

  /* ── HTML shell ─────────────────────────────────────────── */
  function _buildHTML() {
    const pills = STEPS.map((s, i) => `
      <button class="wd-step-pill${i === 0 ? ' active' : ''}" data-step="${i}">${i + 1}. ${s.label}</button>
    `).join('');

    return `
<style>
.wd-page { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.wd-header {
  padding: var(--space-4) var(--space-6); background: var(--bg-2);
  border-bottom: 1px solid var(--border-default); flex-shrink: 0;
}
.wd-header-top { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3); }
.wd-title { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.wd-subtitle { font-size: var(--text-sm); color: var(--text-muted); }
.wd-pills {
  display: flex; gap: var(--space-2); flex-wrap: wrap;
}
.wd-step-pill {
  padding: 5px 12px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 600;
  background: var(--bg-3); border: 1px solid var(--border-default); color: var(--text-muted);
  cursor: pointer; transition: all var(--ease-base); white-space: nowrap;
}
.wd-step-pill:hover { border-color: var(--border-muted); color: var(--text-secondary); }
.wd-step-pill.visited { border-color: var(--border-muted); color: var(--text-secondary); }
.wd-step-pill.active { background: rgba(255,107,53,.12); border-color: var(--delta); color: var(--delta); }

.wd-body {
  flex: 1; display: grid; grid-template-columns: 1fr 340px;
  min-height: 0; overflow: hidden;
}
.wd-diagram-area {
  display: flex; align-items: center; justify-content: center;
  padding: var(--space-6); background: var(--bg-1); overflow: hidden;
}
.wd-diagram-area svg { max-width: 100%; max-height: 100%; }
.wd-info-panel {
  border-left: 1px solid var(--border-default); background: var(--bg-2);
  padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4);
  overflow-y: auto;
}
.wd-step-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: var(--radius-full);
  font-size: var(--text-xs); font-weight: 700; letter-spacing: .04em;
  align-self: flex-start;
}
.wd-info-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.wd-info-body { font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.6; }
.wd-insight-box {
  background: var(--bg-3); border: 1px solid var(--border-default);
  border-radius: var(--radius-md); padding: var(--space-4);
}
.wd-insight-label { font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--delta); margin-bottom: var(--space-2); }
.wd-insight-text { font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.55; }
.wd-nav-hint { font-size: var(--text-xs); color: var(--text-muted); margin-top: auto; }
</style>

<div class="wd-header">
  <div class="wd-header-top">
    <div>
      <div class="wd-title">Why Delta Lake?</div>
      <div class="wd-subtitle">MediaStream's journey from data swamp to reliable lakehouse</div>
    </div>
  </div>
  <div class="wd-pills">${pills}</div>
</div>

<div class="wd-body">
  <div class="wd-diagram-area">
    <div id="wd-diagram">${_buildDiagram(0)}</div>
  </div>
  <div class="wd-info-panel">
    <div id="wd-step-badge" class="wd-step-badge" style="color:var(--red);background:rgba(248,81,73,.1);border:1px solid rgba(248,81,73,.3)">⚠ Problem</div>
    <div id="wd-info-title" class="wd-info-title">${STEPS[0].label}</div>
    <div id="wd-info-body" class="wd-info-body">${STEPS[0].desc}</div>
    <div class="wd-insight-box">
      <div class="wd-insight-label">📡 MediaStream Context</div>
      <div id="wd-info-insight" class="wd-insight-text">${STEPS[0].insight}</div>
    </div>
    <div class="wd-nav-hint">Use ← → keys or animation controls to navigate steps</div>
  </div>
</div>
`;
  }

  /* ── Register ─────────────────────────────────────────────── */
  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['why-delta'] = {
    id: 'why-delta',
    title: 'Why Delta Lake?',
    group: 'start',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
