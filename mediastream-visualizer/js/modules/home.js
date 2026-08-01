/* ============================================================
   Home Module — MediaStream DeltaViz landing page
   ============================================================ */

(function () {
  'use strict';

  const D = () => window.IcebergViz.Data;
  const IV = () => window.IcebergViz;

  const mod = {
    id: 'home',
    title: 'Home',
    group: 'start',
    _cleanups: [],

    render(container) {
      container.innerHTML = '';
      container.className = '';
      const page = document.createElement('div');
      page.className = 'home-page page-enter';
      page.innerHTML = _buildHTML();
      container.appendChild(page);
      _wireInteractions(page, this._cleanups);
      _animateCounters(page);
    },

    destroy() {
      this._cleanups.forEach(fn => fn && fn());
      this._cleanups = [];
      window.IcebergViz.AnimationControls.hide();
    },
  };

  /* ── HTML ──────────────────────────────────────────────────── */
  function _buildHTML() {
    return `
<style>
.home-page { overflow-y: auto; height: 100%; }

.home-hero {
  background: linear-gradient(180deg, var(--bg-0) 0%, var(--bg-1) 100%);
  padding: 72px var(--space-8) 56px;
  text-align: center;
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--border-default);
}
.home-hero::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,107,53,0.07) 0%, transparent 70%);
  pointer-events: none;
}

.hero-eyebrow {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: 6px 14px;
  background: rgba(255,107,53,.12); border: 1px solid rgba(255,107,53,0.25);
  border-radius: var(--radius-full);
  font-size: var(--text-xs); font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--delta); margin-bottom: var(--space-5);
}

.hero-logo-wrap { margin-bottom: var(--space-5); }

.hero-title {
  font-size: clamp(32px, 5vw, 56px); font-weight: 800; letter-spacing: -0.03em;
  margin-bottom: var(--space-5); line-height: 1.1; color: var(--text-primary);
}

.hero-subtitle {
  font-size: clamp(var(--text-base), 1.8vw, var(--text-xl));
  color: var(--text-secondary); max-width: 600px;
  margin: 0 auto var(--space-8); line-height: var(--leading-relaxed);
}

.hero-cta-row {
  display: flex; gap: var(--space-3); justify-content: center;
  flex-wrap: wrap; margin-bottom: var(--space-10);
}

.stats-banner { display: flex; justify-content: center; gap: var(--space-6); flex-wrap: wrap; }
.stats-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.stats-value { font-size: var(--text-3xl); font-weight: 700; letter-spacing: -0.02em; color: var(--text-primary); }
.stats-label { font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
.stats-div { width: 1px; background: var(--border-default); align-self: stretch; margin: 4px 0; }

.home-section { padding: var(--space-12) var(--space-8); max-width: 1200px; margin: 0 auto; }
.home-section-header { text-align: center; margin-bottom: var(--space-8); }
.home-section-label { font-size: var(--text-xs); font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--delta); margin-bottom: var(--space-2); }
.home-section-title { font-size: var(--text-3xl); font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-3); }
.home-section-desc { font-size: var(--text-base); color: var(--text-secondary); max-width: 540px; margin: 0 auto; }

.features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-4); }

.learning-path { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-3); }
.path-card {
  background: var(--bg-2); border: 1px solid var(--border-default); border-radius: var(--radius-lg);
  padding: var(--space-4); cursor: pointer;
  transition: border-color var(--ease-base), transform var(--ease-base), box-shadow var(--ease-base);
  display: flex; align-items: flex-start; gap: var(--space-3);
}
.path-card:hover { border-color: var(--border-muted); transform: translateY(-2px); box-shadow: var(--shadow-md); }
.path-card.coming-soon { opacity: 0.45; cursor: default; }
.path-card.coming-soon:hover { transform: none; box-shadow: none; }
.path-num { width: 28px; height: 28px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; font-size: var(--text-xs); font-weight: 700; flex-shrink: 0; margin-top: 2px; }
.path-info-title { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
.path-info-desc { font-size: var(--text-xs); color: var(--text-muted); line-height: 1.4; }

.incident-strip { display: flex; flex-direction: column; gap: var(--space-3); }
.incident-card {
  background: var(--bg-2); border: 1px solid var(--border-default);
  border-left: 3px solid var(--red); border-radius: 0 var(--radius-md) var(--radius-md) 0;
  padding: var(--space-4) var(--space-5);
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--space-4);
}
.incident-id { font-family: var(--font-mono); font-size: var(--text-xs); font-weight: 600; white-space: nowrap; }
.incident-title { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
.incident-desc { font-size: var(--text-xs); color: var(--text-secondary); }
.incident-resolution { font-size: var(--text-xs); color: var(--green); text-align: right; max-width: 200px; line-height: 1.4; }

/* DLT pipeline visual */
.dlt-pipeline-visual {
  display: flex; align-items: center; justify-content: center;
  gap: 0; padding: var(--space-8) 0 var(--space-6);
  overflow-x: auto;
}
.pipeline-stage {
  display: flex; flex-direction: column; align-items: center; gap: var(--space-2);
  min-width: 110px;
}
.pipeline-stage-box {
  width: 90px; height: 72px; border-radius: var(--radius-lg);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; border: 2px solid; font-size: var(--text-xs); font-weight: 700;
  cursor: pointer; transition: transform var(--ease-base), box-shadow var(--ease-base);
}
.pipeline-stage-box:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
.pipeline-stage-icon { font-size: 22px; }
.pipeline-stage-name { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; }
.pipeline-arrow {
  width: 32px; height: 2px; align-self: center; margin-top: -24px;
  position: relative;
}
.pipeline-arrow::after {
  content: '▶'; position: absolute; right: -6px; top: -7px;
  font-size: 10px;
}

.home-footer {
  padding: var(--space-8); text-align: center;
  border-top: 1px solid var(--border-default); color: var(--text-muted); font-size: var(--text-sm);
}
</style>

<!-- Hero -->
<div class="home-hero hero-enter">
  <div class="hero-eyebrow">
    <span>▲</span>
    <span>Delta Lake + Unity Catalog Visualizer</span>
  </div>

  <div class="hero-logo-wrap">
    ${_logoSVG()}
  </div>

  <h1 class="hero-title">
    Master Delta Lake &amp; Unity Catalog
    <br><span class="gradient-text">Visually</span>
  </h1>

  <p class="hero-subtitle">
    An interactive, animation-driven platform that teaches Delta Lake internals
    and Unity Catalog governance — through the lens of the MediaStream
    180M-subscriber streaming platform built on Databricks.
  </p>

  <div class="hero-cta-row">
    <button class="btn btn-primary btn-xl" data-nav="architecture">
      ${_iconPlay()} Start Learning
    </button>
    <button class="btn btn-secondary btn-xl" data-nav="why-delta">
      Why Delta Lake?
    </button>
  </div>

  <!-- Stats banner -->
  <div class="stats-banner">
    <div class="stats-item">
      <div class="stats-value gradient-text" data-count="180" data-suffix="M">0</div>
      <div class="stats-label">Subscribers</div>
    </div>
    <div class="stats-div"></div>
    <div class="stats-item">
      <div class="stats-value gradient-text-warm" data-count="2" data-suffix=".4B events/day">0</div>
      <div class="stats-label">Clickstream</div>
    </div>
    <div class="stats-div"></div>
    <div class="stats-item">
      <div class="stats-value" style="color:var(--green)" data-count="5" data-suffix=" PB">0</div>
      <div class="stats-label">Delta Lake Size</div>
    </div>
    <div class="stats-div"></div>
    <div class="stats-item">
      <div class="stats-value" style="color:var(--unity)" data-count="1200" data-suffix="+">0</div>
      <div class="stats-label">Tables</div>
    </div>
    <div class="stats-div"></div>
    <div class="stats-item">
      <div class="stats-value" style="color:var(--yellow)" data-count="42">0</div>
      <div class="stats-label">Regions</div>
    </div>
  </div>
</div>

<!-- DLT Pipeline Visual -->
<div class="home-section" style="padding-bottom: var(--space-6);">
  <div class="home-section-header">
    <div class="home-section-label">MediaStream Data Pipeline</div>
    <h2 class="home-section-title">Medallion Architecture at Scale</h2>
    <p class="home-section-desc">
      Every stream you watch generates clickstream events that flow through
      Bronze → Silver → Gold → ML Features → real-time recommendations.
    </p>
  </div>
  <div class="dlt-pipeline-visual">
    ${_pipelineVisual()}
  </div>
</div>

<!-- Features -->
<div class="home-section" style="border-top: 1px solid var(--border-default);">
  <div class="home-section-header">
    <div class="home-section-label">What You'll Master</div>
    <h2 class="home-section-title">Every Delta + Unity Concept, Visualized</h2>
    <p class="home-section-desc">
      From transaction log internals to Unity Catalog governance — every concept
      becomes interactive with step-by-step animations and real production scenarios.
    </p>
  </div>
  <div class="features-grid cards-enter">
    ${_featureCards()}
  </div>
</div>

<!-- Production Incidents -->
<div class="home-section" style="background: var(--bg-0); margin: 0; max-width: none; padding: var(--space-10) var(--space-8); border-top: 1px solid var(--border-default); border-bottom: 1px solid var(--border-default);">
  <div style="max-width:1200px;margin:0 auto">
    <div class="home-section-header">
      <div class="home-section-label">MediaStream Production History</div>
      <h2 class="home-section-title">Five Real Incidents — Each Solved by Delta + Unity</h2>
      <p class="home-section-desc">
        These are the production failures that drove MediaStream's migration from
        plain Parquet on S3 to a governed Delta Lake + Unity Catalog lakehouse.
      </p>
    </div>
    <div class="incident-strip">
      ${_incidentCards()}
    </div>
  </div>
</div>

<!-- Learning Path -->
<div class="home-section">
  <div class="home-section-header">
    <div class="home-section-label">Curriculum</div>
    <h2 class="home-section-title">The Learning Path</h2>
    <p class="home-section-desc">
      Structured from fundamentals to production architecture — covering all
      Delta Lake operations, Unity Catalog governance, and DLT pipelines.
    </p>
  </div>
  <div class="learning-path cards-enter">
    ${_pathCards()}
  </div>
</div>

<!-- Footer -->
<div class="home-footer">
  Delta Lake + Unity Catalog Engineering Handbook &nbsp;·&nbsp; MediaStream Streaming Platform &nbsp;·&nbsp;
  180M subscribers · 2.4B events/day · 5 PB
</div>
`;
  }

  /* ── Pipeline visual ─────────────────────────────────────── */
  function _pipelineVisual() {
    const stages = [
      { icon: '📡', name: 'Kafka',    color: '#58a6ff', bg: 'rgba(88,166,255,0.12)',   nav: null },
      { icon: '📦', name: 'Bronze',   color: '#b87333', bg: 'rgba(184,115,51,0.15)',   nav: 'architecture' },
      { icon: '⚙️',  name: 'Silver',   color: '#c0c0c0', bg: 'rgba(192,192,192,0.12)', nav: 'architecture' },
      { icon: '⭐',  name: 'Gold',     color: '#ffd700', bg: 'rgba(255,215,0,0.12)',    nav: 'architecture' },
      { icon: '🤖',  name: 'ML Feats', color: '#a855f7', bg: 'rgba(168,85,247,0.15)',  nav: 'architecture' },
      { icon: '🎬',  name: 'Recs',     color: '#3fb950', bg: 'rgba(63,185,80,0.12)',   nav: null },
    ];
    return stages.map((s, i) => `
      <div class="pipeline-stage">
        <div class="pipeline-stage-box"
          style="border-color:${s.color};background:${s.bg};color:${s.color};"
          ${s.nav ? `data-nav="${s.nav}"` : ''}>
          <div class="pipeline-stage-icon">${s.icon}</div>
          <div class="pipeline-stage-name">${s.name}</div>
        </div>
      </div>
      ${i < stages.length - 1 ? `<div class="pipeline-arrow" style="background:var(--border-muted);color:var(--text-muted)"></div>` : ''}
    `).join('');
  }

  /* ── Feature Cards ─────────────────────────────────────────── */
  function _featureCards() {
    const features = [
      { icon: '▲', color: 'var(--delta)', bg: 'rgba(255,107,53,.12)', title: 'Delta Log Explorer', desc: 'Dive into the _delta_log/ directory. Watch every JSON commit file build the transaction history that makes ACID possible.', nav: 'delta-log-explorer' },
      { icon: '🏗', color: 'var(--blue)', bg: 'var(--blue-subtle)', title: 'Medallion Architecture', desc: 'See how Bronze → Silver → Gold layers transform 2.4B raw events/day into ML-ready feature tables for 180M users.', nav: 'architecture' },
      { icon: '🔒', color: 'var(--unity)', bg: 'rgba(168,85,247,.12)', title: 'Unity Catalog Governance', desc: 'Navigate the Metastore → Catalog → Schema → Table hierarchy. Column masking, row filters, lineage, audit logs.', nav: 'uc-architecture' },
      { icon: '⏱', color: 'var(--orange)', bg: 'var(--orange-subtle)', title: 'Time Travel', desc: 'Query any historical version of a Delta table. Recover from bad writes. Reproduce exact ML training datasets.', nav: 'time-travel' },
      { icon: '📡', color: 'var(--green)', bg: 'var(--green-subtle)', title: 'Streaming Ingest', desc: 'Watch Kafka clickstream events land in Bronze tables via Spark Structured Streaming with exactly-once semantics.', nav: 'streaming-ingest' },
      { icon: '🔄', color: 'var(--teal)', bg: 'var(--teal-subtle)', title: 'MERGE (Upsert)', desc: 'Run idempotent upserts to handle late-arriving events and reprocessing without duplicating 2.4B daily records.', nav: 'upsert-merge' },
      { icon: '⚡', color: 'var(--yellow)', bg: 'var(--yellow-subtle)', title: 'Liquid Clustering', desc: 'Replace static partitioning with dynamic clustering. Eliminate the "too many files" problem at 5 PB scale.', nav: 'liquid-clustering' },
      { icon: '🔗', color: 'var(--purple)', bg: 'var(--purple-subtle)', title: 'Data Lineage', desc: "End-to-end lineage from raw Kafka → Gold table → ML feature. Proves exactly which pipelines touched any user's data.", nav: 'lineage' },
      { icon: '📡', color: 'var(--blue)', bg: 'var(--blue-subtle)', title: 'Change Data Feed', desc: 'Propagate only changed rows from Silver → Gold → Feature Store. Cuts DLT compute cost from full-table scans by 80%.', nav: 'cdf' },
      { icon: '🤝', color: 'var(--orange)', bg: 'var(--orange-subtle)', title: 'Delta Sharing', desc: 'Share live Delta tables with content studios and distributors without data copies. Open standard, no vendor lock-in.', nav: 'delta-sharing' },
      { icon: '🎓', color: 'var(--green)', bg: 'var(--green-subtle)', title: 'Interview Mode', desc: '150+ Delta Lake + Unity Catalog interview questions from Databricks, Meta, Netflix — with production-grade answers.', nav: 'interview' },
      { icon: '📄', color: 'var(--teal)', bg: 'var(--teal-subtle)', title: 'Cheat Sheets', desc: 'Dense reference cards for Delta SQL, transaction log format, Unity Catalog DDL, and DLT pipeline patterns.', nav: 'cheatsheet' },
    ];
    return features.map(f => `
      <div class="feature-card" data-nav="${f.nav}" role="button" tabindex="0">
        <div class="feature-card-icon" style="background:${f.bg};color:${f.color}">${f.icon}</div>
        <div class="feature-card-title">${f.title}</div>
        <div class="feature-card-desc">${f.desc}</div>
      </div>
    `).join('');
  }

  /* ── Incident Cards ──────────────────────────────────────── */
  function _incidentCards() {
    return D().mediastream.incidents.map(inc => `
      <div class="incident-card" style="border-left-color:${inc.color}">
        <div class="incident-id" style="color:${inc.color}">${inc.id}</div>
        <div>
          <div class="incident-title">${inc.title}</div>
          <div class="incident-desc">${inc.description}</div>
        </div>
        <div class="incident-resolution">✓ ${inc.resolution}</div>
      </div>
    `).join('');
  }

  /* ── Learning Path Cards ─────────────────────────────────── */
  function _pathCards() {
    const path = [
      { num: '01', color: 'var(--delta)',  bg: 'rgba(255,107,53,.12)', title: 'Why Delta Lake',       desc: 'Problems with vanilla Parquet',    nav: 'why-delta' },
      { num: '02', color: 'var(--delta)',  bg: 'rgba(255,107,53,.12)', title: 'Architecture',          desc: 'Medallion Bronze/Silver/Gold',     nav: 'architecture' },
      { num: '03', color: 'var(--delta)',  bg: 'rgba(255,107,53,.12)', title: 'Delta Log Explorer',    desc: '_delta_log/ structure & commits',  nav: 'delta-log-explorer' },
      { num: '04', color: 'var(--orange)', bg: 'var(--orange-subtle)', title: 'ACID Transactions',     desc: 'Atomicity, isolation, checkpoints', nav: 'acid-transactions', soon: true },
      { num: '05', color: 'var(--blue)',   bg: 'var(--blue-subtle)',   title: 'Streaming Ingest',      desc: 'Kafka → Bronze, exactly-once',     nav: 'streaming-ingest', soon: true },
      { num: '06', color: 'var(--orange)', bg: 'var(--orange-subtle)', title: 'MERGE (Upsert)',        desc: 'Idempotent deduplication',         nav: 'upsert-merge', soon: true },
      { num: '07', color: 'var(--teal)',   bg: 'var(--teal-subtle)',   title: 'Time Travel',           desc: 'VERSION AS OF, RESTORE TO',        nav: 'time-travel', soon: true },
      { num: '08', color: 'var(--teal)',   bg: 'var(--teal-subtle)',   title: 'Change Data Feed',      desc: 'Incremental Silver → Gold',        nav: 'cdf', soon: true },
      { num: '09', color: 'var(--yellow)', bg: 'var(--yellow-subtle)', title: 'Schema Evolution',      desc: 'Safe column adds, type widening',  nav: 'schema-evolution', soon: true },
      { num: '10', color: 'var(--yellow)', bg: 'var(--yellow-subtle)', title: 'Liquid Clustering',     desc: 'Replace static partitioning',      nav: 'liquid-clustering', soon: true },
      { num: '11', color: 'var(--unity)',  bg: 'rgba(168,85,247,.12)', title: 'UC Architecture',       desc: 'Metastore → Catalog → Schema',     nav: 'uc-architecture', soon: true },
      { num: '12', color: 'var(--unity)',  bg: 'rgba(168,85,247,.12)', title: 'Data Lineage',          desc: 'End-to-end pipeline graph',        nav: 'lineage', soon: true },
      { num: '13', color: 'var(--unity)',  bg: 'rgba(168,85,247,.12)', title: 'Row/Column Security',   desc: 'Masking, row filters, grants',     nav: 'row-security', soon: true },
      { num: '14', color: 'var(--green)',  bg: 'var(--green-subtle)',  title: 'DLT Pipelines',         desc: 'DLT Bronze→Silver→Gold flow',      nav: 'dlt-architecture', soon: true },
      { num: '15', color: 'var(--purple)', bg: 'var(--purple-subtle)', title: 'Interview Mode',        desc: '150+ Databricks/Netflix questions', nav: 'interview', soon: true },
    ];
    return path.map(p => `
      <div class="path-card${p.soon ? ' coming-soon' : ''}" data-nav="${p.nav}">
        <div class="path-num" style="background:${p.bg};color:${p.color}">${p.num}</div>
        <div>
          <div class="path-info-title">${p.title}</div>
          <div class="path-info-desc">${p.desc}${p.soon ? ' <span style="color:var(--text-disabled)">(coming soon)</span>' : ''}</div>
        </div>
      </div>
    `).join('');
  }

  /* ── Wire interactions ───────────────────────────────────── */
  function _wireInteractions(page, cleanups) {
    const handler = (e) => {
      const el = e.target.closest('[data-nav]');
      if (!el) return;
      const id = el.dataset.nav;
      if (id) window.IcebergViz.navigate(id);
    };
    page.addEventListener('click', handler);
    cleanups.push(() => page.removeEventListener('click', handler));
  }

  /* ── Counter animation ───────────────────────────────────── */
  function _animateCounters(page) {
    const els = page.querySelectorAll('[data-count]');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        let start = 0;
        const step = target / 40;
        const t = setInterval(() => {
          start = Math.min(start + step, target);
          el.textContent = Math.round(start) + suffix;
          if (start >= target) clearInterval(t);
        }, 30);
        obs.unobserve(el);
      });
    }, { threshold: 0.5 });
    els.forEach(el => obs.observe(el));
  }

  /* ── Logo SVG ────────────────────────────────────────────── */
  function _logoSVG() {
    return `
<svg class="hero-logo-svg float-anim" width="80" height="80" viewBox="0 0 80 80" fill="none">
  <defs>
    <linearGradient id="dlg1" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ff6b35"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <!-- Large outer delta triangle -->
  <polygon points="40,4 76,70 4,70" fill="none" stroke="url(#dlg1)" stroke-width="2.5" stroke-linejoin="round" opacity="0.9"/>
  <!-- Inner filled delta -->
  <polygon points="40,18 64,62 16,62" fill="url(#dlg1)" opacity="0.3"/>
  <!-- Center dot -->
  <circle cx="40" cy="42" r="4" fill="url(#dlg1)" opacity="0.95"/>
  <!-- Horizontal line (like Delta symbol) -->
  <line x1="18" y1="62" x2="62" y2="62" stroke="url(#dlg1)" stroke-width="2" opacity="0.6"/>
  <!-- Label -->
  <text x="40" y="77" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif"
    font-size="7" font-weight="700" letter-spacing="2" fill="rgba(255,107,53,0.7)">DELTA</text>
</svg>`;
  }

  function _iconPlay() {
    return `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><polygon points="5,3 19,12 5,21"/></svg>`;
  }

  /* ── Register ────────────────────────────────────────────── */
  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['home'] = mod;
})();
