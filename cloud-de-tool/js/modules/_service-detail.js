/* ============================================================
   Cloud DE Visualizer — generic Service Detail renderer.
   One renderer drives every cloud service page. A service object
   supplies up to six "depth" sections (What / Why / How / DE Use
   Case / Integrations / Runtime) plus optional key facts and
   interview Q&A. Pages scroll via the .page-enter bridge; no
   animation engine is attached.

   Public API:
     TV.ServiceDetail.registerAll(format, services[])
     TV.ServiceDetail.registerHome(format, meta)
     TV.ServiceDetail.categoriesFor(format)  -> ordered [{id,label,icon,items}]
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  /* Category registry — label + sidebar icon + display order, shared
     across formats. A service's `category` keys into this. */
  const CATEGORIES = {
    storage:      { label: 'Storage',              icon: 'folder',  order: 10 },
    'ingest-etl': { label: 'Ingestion & ETL',      icon: 'arrow-down', order: 20 },
    streaming:    { label: 'Streaming',            icon: 'activity', order: 30 },
    analytics:    { label: 'Analytics & Warehouse', icon: 'cpu',    order: 40 },
    databases:    { label: 'Databases',            icon: 'layers',  order: 50 },
    orchestration:{ label: 'Orchestration',        icon: 'git-branch', order: 60 },
    compute:      { label: 'Compute & Runtime',    icon: 'zap',     order: 70 },
    ml:           { label: 'ML & AI',              icon: 'sparkles', order: 80 },
    governance:   { label: 'Governance & Security', icon: 'shield', order: 90 },
    ops:          { label: 'Monitoring & Ops',     icon: 'sliders', order: 100 },
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  }

  /* Normalize a section: accept a string (lead only) or an object
     { lead, bullets:[{h,d}], code:{lang,text}, note }. */
  function normSection(s) {
    if (!s) return null;
    if (typeof s === 'string') return { lead: s };
    return s;
  }

  function bulletsHTML(bullets) {
    if (!bullets || !bullets.length) return '';
    return `<div class="sd-bullets">` + bullets.map(b =>
      `<div class="sd-bullet">
         <div class="sd-bullet-h">${esc(b.h)}</div>
         <div class="sd-bullet-d">${esc(b.d)}</div>
       </div>`).join('') + `</div>`;
  }

  function codeHTML(code) {
    if (!code || !code.text) return '';
    return `<div class="sd-code"><div class="sd-code-lang">${esc(code.lang || 'code')}</div><pre>${esc(code.text)}</pre></div>`;
  }

  /* Callouts — pedagogical highlight boxes. A section (or service) may supply
     callouts:[{ kind, title?, body }] with kind in
     insight | gotcha | interview | analogy | tip. Renders nothing when absent. */
  const CO_ICON = { insight: '💡', gotcha: '⚠️', interview: '🎯', analogy: '🔗', tip: '📌' };
  const CO_LABEL = { insight: 'Key insight', gotcha: 'Gotcha', interview: 'Interview angle', analogy: 'Analogy', tip: 'Tip' };
  function calloutsHTML(callouts) {
    if (!callouts || !callouts.length) return '';
    return callouts.map(c => {
      if (!c || !c.body) return '';
      const kind = CO_ICON[c.kind] ? c.kind : 'tip';
      const title = c.title || CO_LABEL[kind];
      return `<div class="sd-callout" data-kind="${kind}">
          <span class="sd-co-ico" aria-hidden="true">${CO_ICON[kind]}</span>
          <div><span class="sd-co-b">${esc(title)}</span><span class="sd-co-body">${esc(c.body)}</span></div>
        </div>`;
    }).join('');
  }

  function sectionHTML(kicker, accent, section) {
    const s = normSection(section);
    if (!s) return '';
    const lead = s.lead ? `<p class="sd-lead">${esc(s.lead)}</p>` : '';
    const note = s.note ? `<div class="sd-note">${esc(s.note)}</div>` : '';
    return `
      <section class="sd-section" data-accent="${accent}">
        <div class="sd-kicker">${esc(kicker)}</div>
        ${lead}
        ${bulletsHTML(s.bullets)}
        ${codeHTML(s.code)}
        ${calloutsHTML(s.callouts)}
        ${note}
      </section>`;
  }

  function integrationsHTML(format, integrations) {
    if (!integrations || !integrations.length) return '';
    const chips = integrations.map(it => {
      const label = esc(it.label || it.id);
      const note = it.note ? `<span class="sd-chip-note">${esc(it.note)}</span>` : '';
      if (it.id) {
        const fmt = it.format || format;
        return `<a class="sd-chip sd-chip--link" href="#${fmt}/${it.id}">
                  <span class="sd-chip-label">${label}</span>${note}
                </a>`;
      }
      return `<span class="sd-chip"><span class="sd-chip-label">${label}</span>${note}</span>`;
    }).join('');
    return `
      <section class="sd-section" data-accent="link">
        <div class="sd-kicker">Integrations</div>
        <p class="sd-lead">How this service wires into the rest of a data platform. Linked chips open that service.</p>
        <div class="sd-chips">${chips}</div>
      </section>`;
  }

  function keyFactsHTML(facts) {
    if (!facts || !facts.length) return '';
    return `<div class="sd-facts">` + facts.map(f =>
      `<div class="sd-fact"><div class="sd-fact-k">${esc(f.k)}</div><div class="sd-fact-v">${esc(f.v)}</div></div>`
    ).join('') + `</div>`;
  }

  function interviewHTML(qa) {
    if (!qa || !qa.length) return '';
    const items = qa.map((x, i) => `
      <div class="sd-iq" data-iq="${i}">
        <button class="sd-iq-q" type="button" aria-expanded="false">
          <span class="sd-iq-mark">Q</span>
          <span class="sd-iq-text">${esc(x.q)}</span>
          <span class="sd-iq-chev">▾</span>
        </button>
        <div class="sd-iq-a"><p>${esc(x.a)}</p></div>
      </div>`).join('');
    return `
      <section class="sd-section" data-accent="interview">
        <div class="sd-kicker">Interview Q&amp;A</div>
        <p class="sd-lead">The questions an interviewer actually asks about this service. Tap to reveal a model answer.</p>
        <div class="sd-iqs">${items}</div>
      </section>`;
  }

  function styleTag() {
    return `
<style id="sd-styles">
.sd { height:100%; overflow-y:auto; padding:34px clamp(18px,3vw,56px) 88px; background:var(--bg-0); }
.sd-wrap { width:100%; max-width:1040px; margin:0 auto; }
.sd-eyebrow { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--brand); margin-bottom:8px; }
.sd-h1 { font-size:28px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin:0 0 6px; }
.sd-aka { font-size:12.5px; color:var(--text-muted); margin:0 0 10px; font-style:italic; }
.sd-tagline { font-size:15.5px; color:var(--text-secondary); line-height:1.7; margin:0 0 20px; max-width:760px; }
.sd-facts { display:flex; flex-wrap:wrap; gap:10px; margin:0 0 28px; }
.sd-fact { position:relative; overflow:hidden; background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:12px; padding:12px 16px 10px; min-width:132px; box-shadow:var(--card-shadow); }
.sd-fact::before { content:''; position:absolute; left:0; right:0; top:0; height:3px; background:var(--brand); opacity:.9; }
.sd-fact-k { font-size:9.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); font-weight:800; margin-bottom:3px; }
.sd-fact-v { font-size:13.5px; font-weight:700; color:var(--text-primary); }
.sd-section { position:relative; background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:16px; padding:22px 26px 24px; margin-bottom:18px; box-shadow:var(--card-shadow); }
.sd-section::before { content:''; position:absolute; left:0; top:0; bottom:0; width:4px; border-radius:16px 0 0 16px; background:var(--stripe-neutral); }
.sd-section[data-accent="what"]::before { background:var(--brand); }
.sd-section[data-accent="why"]::before { background:var(--yellow); }
.sd-section[data-accent="how"]::before { background:var(--green); }
.sd-section[data-accent="deuse"]::before { background:var(--blue); }
.sd-section[data-accent="link"]::before { background:var(--purple); }
.sd-section[data-accent="runtime"]::before { background:var(--orange); }
.sd-section[data-accent="interview"]::before { background:var(--brand-2); }
.sd-kicker { display:inline-block; font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); background:var(--bg-3); padding:5px 12px; border-radius:999px; margin-bottom:14px; }
.sd-section[data-accent="what"] .sd-kicker { color:var(--brand); background:var(--brand-glow); }
.sd-section[data-accent="why"] .sd-kicker { color:var(--yellow); background:var(--yellow-subtle); }
.sd-section[data-accent="how"] .sd-kicker { color:var(--green); background:var(--green-subtle); }
.sd-section[data-accent="deuse"] .sd-kicker { color:var(--blue); background:var(--blue-subtle); }
.sd-section[data-accent="link"] .sd-kicker { color:var(--purple); background:var(--purple-subtle); }
.sd-section[data-accent="runtime"] .sd-kicker { color:var(--orange); background:var(--orange-subtle); }
.sd-section[data-accent="interview"] .sd-kicker { color:var(--brand); background:var(--brand-glow); }
.sd-lead { font-size:14px; color:var(--text-secondary); line-height:1.7; margin:0 0 12px; }
.sd-bullets { display:grid; gap:10px; }
.sd-bullet { background:var(--bg-2); border:1px solid var(--border-subtle); border-radius:11px; padding:12px 15px; }
.sd-bullet-h { font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:3px; }
.sd-bullet-d { font-size:12.5px; color:var(--text-secondary); line-height:1.6; }
.sd-code { margin-top:14px; background:var(--code-bg); border:1px solid #1a2536; border-radius:11px; overflow:hidden; }
.sd-code-lang { font-size:9.5px; text-transform:uppercase; letter-spacing:.06em; color:#7e8da8; font-weight:800; padding:8px 14px; border-bottom:1px solid #1a2536; }
.sd-code pre { margin:0; padding:14px 16px; font-family:var(--font-mono); font-size:12.5px; line-height:1.7; color:#b3c0d6; white-space:pre; overflow-x:auto; }
.sd-note { margin-top:12px; background:var(--brand-glow); border-radius:8px; padding:10px 13px; font-size:12.5px; color:var(--text-primary); line-height:1.6; }
/* Callouts — pedagogical highlight boxes (rendered when a section supplies callouts[]) */
.sd-callout { display:flex; gap:12px; align-items:flex-start; margin-top:14px; padding:13px 16px; border-radius:11px; border:1px solid var(--border-subtle); border-left:3px solid var(--text-muted); background:var(--bg-2); font-size:13.5px; line-height:1.65; }
.sd-co-ico { flex-shrink:0; font-size:16px; line-height:1.4; }
.sd-co-b { display:block; font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px; color:var(--text-muted); }
.sd-co-body { color:var(--text-primary); }
.sd-callout[data-kind="insight"]   { background:var(--green-subtle);  border-left-color:var(--green); }
.sd-callout[data-kind="insight"] .sd-co-b { color:var(--green); }
.sd-callout[data-kind="gotcha"]    { background:var(--red-subtle);    border-left-color:var(--red); }
.sd-callout[data-kind="gotcha"] .sd-co-b { color:var(--red); }
.sd-callout[data-kind="interview"] { background:var(--purple-subtle); border-left-color:var(--purple); }
.sd-callout[data-kind="interview"] .sd-co-b { color:var(--purple); }
.sd-callout[data-kind="analogy"]   { background:var(--teal-subtle);   border-left-color:var(--teal); }
.sd-callout[data-kind="analogy"] .sd-co-b { color:var(--teal); }
.sd-callout[data-kind="tip"]       { background:var(--blue-subtle);   border-left-color:var(--blue); }
.sd-callout[data-kind="tip"] .sd-co-b { color:var(--blue); }
.sd-chips { display:flex; flex-wrap:wrap; gap:9px; }
.sd-chip { display:inline-flex; flex-direction:column; gap:2px; background:var(--bg-2); border:1px solid var(--border-subtle); border-left:3px solid var(--purple); border-radius:10px; padding:9px 13px; text-decoration:none; }
.sd-chip--link { transition:border-color .12s, transform .12s, background .12s; }
.sd-chip--link:hover { border-color:var(--brand); background:var(--brand-glow); transform:translateY(-1px); text-decoration:none; }
.sd-chip-label { font-size:12.5px; font-weight:700; color:var(--text-primary); }
.sd-chip--link .sd-chip-label { color:var(--brand); }
.sd-chip-note { font-size:11px; color:var(--text-muted); line-height:1.4; }
.sd-iqs { display:grid; gap:8px; }
.sd-iq { background:var(--bg-2); border:1px solid var(--border-subtle); border-radius:10px; overflow:hidden; }
.sd-iq-q { width:100%; display:flex; align-items:flex-start; gap:10px; padding:11px 14px; background:none; border:none; cursor:pointer; text-align:left; font:inherit; }
.sd-iq-mark { flex-shrink:0; width:20px; height:20px; border-radius:5px; background:var(--brand); color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:1px; }
.sd-iq-text { flex:1; font-size:13.5px; font-weight:600; color:var(--text-primary); line-height:1.5; }
.sd-iq-chev { color:var(--text-muted); transition:transform .15s; flex-shrink:0; }
.sd-iq.open .sd-iq-chev { transform:rotate(180deg); }
.sd-iq-a { display:grid; grid-template-rows:0fr; transition:grid-template-rows .2s var(--ease); }
.sd-iq.open .sd-iq-a { grid-template-rows:1fr; }
.sd-iq-a > p { overflow:hidden; min-height:0; margin:0; padding:0 14px 13px 44px; font-size:13px; color:var(--text-secondary); line-height:1.7; }
/* Overview / home grid */
.sd-home { height:100%; overflow-y:auto; padding:34px clamp(18px,3vw,56px) 88px; background:var(--bg-0); }
.sd-home-wrap { width:100%; max-width:1080px; margin:0 auto; }
.sd-home-cat { margin-top:26px; }
.sd-home-cat-h { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin:0 0 12px; }
.sd-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; }
.sd-card { display:block; background:var(--bg-1); border:1px solid var(--border-subtle); border-left:3px solid var(--brand); border-radius:14px; padding:16px 18px; text-decoration:none; box-shadow:var(--card-shadow); transition:border-color .12s, transform .14s, box-shadow .14s; }
.sd-card:hover { transform:translateY(-3px); box-shadow:var(--card-shadow-lg); text-decoration:none; }
.sd-card-name { font-size:14.5px; font-weight:700; color:var(--text-primary); margin-bottom:5px; }
.sd-card-tag { font-size:12px; color:var(--text-secondary); line-height:1.55; }
.sd-home-hero { position:relative; border:1px solid var(--border-subtle); border-radius:20px; padding:30px 34px; box-shadow:var(--card-shadow-lg); background:
  radial-gradient(130% 150% at 0% 0%, var(--brand-glow), transparent 55%), linear-gradient(180deg, var(--bg-1), var(--bg-2)); }
.sd-home-hero h1 { font-size:28px; font-weight:800; letter-spacing:-.02em; margin:0 0 8px; color:var(--text-primary); }
.sd-home-hero p { font-size:14.5px; color:var(--text-secondary); line-height:1.7; margin:0; max-width:720px; }
.sd-home-stats { display:flex; gap:14px; margin-top:22px; flex-wrap:wrap; }
.sd-home-stat { background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:14px; padding:13px 20px; box-shadow:var(--card-shadow); }
.sd-home-stat b { display:block; font-size:24px; font-weight:800; color:var(--brand); }
.sd-home-stat span { font-size:11.5px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; }
/* Study header — meta chips */
.sd-essence { font-size:16px; color:var(--text-secondary); line-height:1.6; margin:2px 0 0; max-width:680px; font-style:italic; }
.sd-meta { display:flex; flex-wrap:wrap; gap:10px; margin:18px 0 18px; }
.sd-mchip { display:inline-flex; align-items:center; gap:7px; background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:999px; padding:7px 13px; font-size:12.5px; font-weight:600; color:var(--text-secondary); box-shadow:var(--card-shadow); }
.sd-mchip b { color:var(--text-primary); font-weight:800; }
.sd-mchip .sd-mchip-ico { font-size:13px; line-height:1; }
.sd-mchip-lvl { display:inline-flex; align-items:center; gap:7px; }
.sd-mchip-lvl .dot { width:8px; height:8px; border-radius:50%; background:var(--text-muted); }
.sd-mchip-lvl[data-lvl="foundational"] { color:var(--green); } .sd-mchip-lvl[data-lvl="foundational"] .dot { background:var(--green); }
.sd-mchip-lvl[data-lvl="core"] { color:var(--yellow); } .sd-mchip-lvl[data-lvl="core"] .dot { background:var(--yellow); }
.sd-mchip-lvl[data-lvl="advanced"] { color:var(--red); } .sd-mchip-lvl[data-lvl="advanced"] .dot { background:var(--red); }
/* What you'll master */
.sd-master { background:linear-gradient(180deg,var(--bg-1),var(--bg-2)); border:1px solid var(--border-subtle); border-radius:16px; padding:20px 24px; margin:0 0 28px; box-shadow:var(--card-shadow-lg); }
.sd-master-h { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted); margin:0 0 14px; display:flex; align-items:center; gap:8px; }
.sd-master-grid { display:grid; grid-template-columns:1fr 1fr; gap:11px 28px; }
.sd-goal { display:flex; align-items:flex-start; gap:11px; font-size:13.5px; color:var(--text-secondary); line-height:1.5; }
.sd-goal .sd-goal-box { flex-shrink:0; width:18px; height:18px; border:2px solid var(--border-muted); border-radius:5px; margin-top:1px; display:flex; align-items:center; justify-content:center; transition:background .12s, border-color .12s; }
@media (max-width:720px){ .sd-master-grid { grid-template-columns:1fr; } }
</style>`;
  }

  /* ── Ordered categories present for a format ─────────────── */
  function categoriesFor(format) {
    const list = (TV._services && TV._services[format]) || [];
    const byCat = {};
    list.forEach(s => { (byCat[s.category] = byCat[s.category] || []).push(s); });
    return Object.keys(byCat)
      .map(id => ({ id, label: (CATEGORIES[id] || {}).label || id, icon: (CATEGORIES[id] || {}).icon || 'layers',
                    order: (CATEGORIES[id] || {}).order || 999, items: byCat[id] }))
      .sort((a, b) => a.order - b.order);
  }

  /* Sections that carry teachable depth, in study order. */
  const DEPTH_KEYS = ['what', 'why', 'how', 'deUseCase', 'runtime'];

  function countWords(str) {
    if (!str) return 0;
    return String(str).trim().split(/\s+/).filter(Boolean).length;
  }

  /* Count teachable concepts = total bullets across the depth sections. */
  function conceptCount(svc) {
    let n = 0;
    DEPTH_KEYS.forEach(k => {
      const s = normSection(svc[k]);
      if (s && s.bullets) n += s.bullets.length;
    });
    return n;
  }

  /* Honest ~study-time estimate from the real prose (~200 wpm). */
  function studyMinutes(svc) {
    let w = countWords(svc.aka) + countWords(svc.tagline);
    DEPTH_KEYS.forEach(k => {
      const s = normSection(svc[k]);
      if (!s) return;
      w += countWords(s.lead);
      (s.bullets || []).forEach(b => { w += countWords(b.h) + countWords(b.d); });
    });
    (svc.interview || []).forEach(x => { w += countWords(x.q) + countWords(x.a); });
    return Math.min(20, Math.max(2, Math.round(w / 200)));
  }

  /* Computed, honest meta chips. Level chip only shows when authored. */
  function studyMetaHTML(svc) {
    const chips = [];
    const lvl = svc.level && ['foundational', 'core', 'advanced'].includes(svc.level) ? svc.level : null;
    if (lvl) {
      const label = lvl.charAt(0).toUpperCase() + lvl.slice(1);
      chips.push(`<span class="sd-mchip sd-mchip-lvl" data-lvl="${lvl}"><span class="dot"></span>${label}</span>`);
    }
    chips.push(`<span class="sd-mchip"><span class="sd-mchip-ico">⏱</span><b>~${studyMinutes(svc)} min</b> study</span>`);
    const concepts = conceptCount(svc);
    if (concepts) chips.push(`<span class="sd-mchip"><span class="sd-mchip-ico">📚</span><b>${concepts}</b> concept${concepts === 1 ? '' : 's'}</span>`);
    const iq = (svc.interview || []).length;
    if (iq) chips.push(`<span class="sd-mchip"><span class="sd-mchip-ico">🎯</span><b>${iq}</b> interview Q${iq === 1 ? '' : 's'}</span>`);
    const ints = (svc.integrations || []).length;
    if (ints) chips.push(`<span class="sd-mchip"><span class="sd-mchip-ico">🔗</span><b>${ints}</b> integration${ints === 1 ? '' : 's'}</span>`);
    return `<div class="sd-meta">${chips.join('')}</div>`;
  }

  /* "What you'll master" — authored svc.goals if present, else the lead
     concept from each depth section (a real spread of the page's content). */
  function masterGoals(svc) {
    if (Array.isArray(svc.goals) && svc.goals.length) return svc.goals.slice(0, 6);
    const goals = [];
    DEPTH_KEYS.forEach(k => {
      const s = normSection(svc[k]);
      if (s && s.bullets && s.bullets[0] && s.bullets[0].h) goals.push(s.bullets[0].h);
    });
    return goals.slice(0, 6);
  }

  function masterHTML(svc) {
    const goals = masterGoals(svc);
    if (goals.length < 2) return '';
    const items = goals.map(g =>
      `<div class="sd-goal"><span class="sd-goal-box"></span><span>${esc(g)}</span></div>`).join('');
    return `
      <div class="sd-master">
        <div class="sd-master-h">🎓 What you'll master here</div>
        <div class="sd-master-grid">${items}</div>
      </div>`;
  }

  /* ── Detail page for one service ─────────────────────────── */
  function renderDetail(container, format, svc) {
    container.className = '';
    let styles = document.getElementById('sd-styles') ? '' : styleTag();
    const catLabel = (CATEGORIES[svc.category] || {}).label || svc.category || '';
    container.innerHTML = `${styles}
<div class="sd page-enter">
  <div class="sd-wrap">
    <div class="sd-eyebrow">${esc(catLabel)}</div>
    <h1 class="sd-h1">${esc(svc.name)}</h1>
    ${svc.aka ? `<p class="sd-essence">${esc(svc.aka)}</p>` : ''}
    ${studyMetaHTML(svc)}
    <p class="sd-tagline">${esc(svc.tagline || '')}</p>
    ${keyFactsHTML(svc.keyFacts)}
    ${masterHTML(svc)}
    ${sectionHTML('What it is', 'what', svc.what)}
    ${sectionHTML('Why it exists', 'why', svc.why)}
    ${sectionHTML('How it works', 'how', svc.how)}
    ${sectionHTML('Data engineering use case', 'deuse', svc.deUseCase)}
    ${integrationsHTML(format, svc.integrations)}
    ${sectionHTML('Runtime behavior', 'runtime', svc.runtime)}
    ${interviewHTML(svc.interview)}
  </div>
</div>`;
    // Wire interview accordions
    container.querySelectorAll('.sd-iq-q').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.sd-iq');
        const open = row.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  }

  /* ── Overview / home page for a format ───────────────────── */
  function renderHome(container, format, meta) {
    container.className = '';
    let styles = document.getElementById('sd-styles') ? '' : styleTag();
    const cats = categoriesFor(format);
    const total = cats.reduce((n, c) => n + c.items.length, 0);
    const catBlocks = cats.map(c => `
      <div class="sd-home-cat">
        <h2 class="sd-home-cat-h">${esc(c.label)}</h2>
        <div class="sd-grid">${c.items.map(s =>
          `<a class="sd-card" href="#${format}/${s.id}">
             <div class="sd-card-name">${esc(s.name)}</div>
             <div class="sd-card-tag">${esc(s.tagline || '')}</div>
           </a>`).join('')}</div>
      </div>`).join('');
    container.innerHTML = `${styles}
<div class="sd-home page-enter">
  <div class="sd-home-wrap">
    <div class="sd-home-hero">
      <h1>${esc(meta.title)}</h1>
      <p>${esc(meta.subtitle)}</p>
      <div class="sd-home-stats">
        <div class="sd-home-stat"><b>${total}</b><span>services</span></div>
        <div class="sd-home-stat"><b>${cats.length}</b><span>categories</span></div>
        <div class="sd-home-stat"><b>6</b><span>depth levels each</span></div>
      </div>
    </div>
    ${catBlocks}
  </div>
</div>`;
  }

  /* ── Registration ────────────────────────────────────────── */
  function registerAll(format, services) {
    TV._services = TV._services || {};
    TV._services[format] = services;
    services.forEach(svc => {
      TV.registerModule(format, {
        id: svc.id, title: svc.name, group: svc.category, format,
        render(container) { renderDetail(container, format, svc); },
        destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); },
      });
    });
  }

  function registerHome(format, meta) {
    TV.registerModule(format, {
      id: 'home', title: meta.title || 'Overview', group: 'overview', format,
      render(container) { renderHome(container, format, meta); },
      destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); },
    });
  }

  /* Build navGroups for a format's descriptor from its service list. */
  function navGroupsFor(format, opts) {
    opts = opts || {};
    const groups = [{
      id: 'overview', label: 'Overview',
      items: [{ id: 'home', label: opts.homeLabel || 'Overview', icon: 'home', available: true }],
    }];
    categoriesFor(format).forEach(c => {
      groups.push({
        id: c.id, label: c.label,
        items: c.items.map(s => ({ id: s.id, label: s.name, icon: c.icon, available: true })),
      });
    });
    return groups;
  }

  TV.ServiceDetail = { registerAll, registerHome, categoriesFor, navGroupsFor, CATEGORIES };
})();
