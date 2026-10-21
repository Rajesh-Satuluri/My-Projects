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

  /* "Test yourself" — the interview Q&A as flip-to-reveal flashcards with a
     self-grade, so the page drives active recall instead of passive reading. */
  function interviewHTML(qa) {
    if (!qa || !qa.length) return '';
    const cards = qa.map((x, i) => `
      <div class="sd-fc" data-fc="${i}">
        <div class="sd-fc-q"><span class="sd-fc-num">${i + 1}</span><span class="sd-fc-qt">${esc(x.q)}</span></div>
        <button class="sd-fc-reveal" type="button" aria-expanded="false">Reveal answer ▾</button>
        <div class="sd-fc-a" hidden>
          <p>${esc(x.a)}</p>
          <div class="sd-fc-grade">
            <button class="sd-fc-g sd-fc-g--good" type="button" data-g="good">✓ I knew it</button>
            <button class="sd-fc-g sd-fc-g--again" type="button" data-g="again">↻ Review again</button>
          </div>
        </div>
      </div>`).join('');
    return `
      <section class="sd-section sd-recall" data-accent="interview">
        <h2 class="sd-recall-h">🎯 Test yourself</h2>
        <p class="sd-recall-sub">Active recall beats re-reading — try to answer out loud before you reveal.</p>
        <div class="sd-fcs">${cards}</div>
      </section>`;
  }

  /* ── Learned-state (persisted; read by the sidebar + Overview ring) ── */
  function learnedKey(format) { return 'cde-' + format + '-learned'; }
  function getLearnedSet(format) {
    try { return new Set(JSON.parse(TV.ls.get(learnedKey(format)) || '[]')); }
    catch (e) { return new Set(); }
  }
  function isLearned(format, id) { return getLearnedSet(format).has(id); }
  function setLearned(format, id, on) {
    const s = getLearnedSet(format);
    if (on) s.add(id); else s.delete(id);
    try { TV.ls.set(learnedKey(format), JSON.stringify(Array.from(s))); } catch (e) {}
    return s;
  }

  /* ── Per-service goal progress (micro-progress; drives the header ring) ── */
  function goalsKey(format, id) { return 'cde-' + format + '-goals-' + id; }
  function getCheckedGoals(format, id) {
    try { return new Set(JSON.parse(TV.ls.get(goalsKey(format, id)) || '[]')); }
    catch (e) { return new Set(); }
  }
  function setCheckedGoals(format, id, set) {
    try { TV.ls.set(goalsKey(format, id), JSON.stringify(Array.from(set))); } catch (e) {}
  }

  /* An SVG progress ring. pct in 0..1. */
  function ringHTML(pct, sub) {
    const r = 30, C = 2 * Math.PI * r;
    const off = Math.max(0, Math.min(C, C * (1 - pct)));
    const label = Math.round(pct * 100) + '%';
    return `
      <div class="sd-ringwrap">
        <div class="sd-ring" data-circ="${C.toFixed(1)}">
          <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
            <circle cx="36" cy="36" r="${r}" fill="none" stroke="var(--bg-4)" stroke-width="7"/>
            <circle class="sd-ring-fg" cx="36" cy="36" r="${r}" fill="none" stroke="var(--brand)" stroke-width="7"
              stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
              transform="rotate(-90 36 36)"/>
          </svg>
          <div class="sd-ring-txt">${label}</div>
        </div>
        <span class="sd-ring-sub">${esc(sub)}</span>
      </div>`;
  }

  /* The next service in reading order (within, then across categories). */
  function nextService(format, svc) {
    const flat = [];
    categoriesFor(format).forEach(c => c.items.forEach(s => flat.push({ cat: c.label, svc: s })));
    const idx = flat.findIndex(x => x.svc.id === svc.id);
    if (idx < 0 || idx + 1 >= flat.length) return null;
    return flat[idx + 1];
  }

  /* Momentum footer — mark-as-learned (persists) + next-up link. */
  function footerHTML(format, svc) {
    const learned = isLearned(format, svc.id);
    const nx = nextService(format, svc);
    const nextLink = nx ? `<a class="sd-next" href="#${format}/${nx.svc.id}">
        <span class="sd-next-lbl">Next up in ${esc(nx.cat)} →</span>
        <span class="sd-next-nm">${esc(nx.svc.name)}</span>
      </a>` : '';
    return `
      <div class="sd-foot">
        <button class="sd-foot-mark${learned ? ' is-learned' : ''}" type="button" data-learn-btn aria-pressed="${learned}">
          <span class="sd-foot-mark-ico" aria-hidden="true">${learned ? '✓' : '＋'}</span>
          <span class="sd-foot-mark-txt">${learned ? 'Learned' : 'Mark ' + esc(svc.name) + ' as learned'}</span>
        </button>
        ${nextLink}
      </div>`;
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
.sd-master-h .sd-master-hint { margin-left:auto; font-size:10px; font-weight:600; text-transform:none; letter-spacing:0; color:var(--text-disabled); }
.sd-master-grid { display:grid; grid-template-columns:1fr 1fr; gap:11px 28px; }
.sd-goal { display:flex; align-items:flex-start; gap:11px; width:100%; text-align:left; background:none; border:none; font:inherit; padding:0; cursor:pointer; font-size:13.5px; color:var(--text-secondary); line-height:1.5; }
.sd-goal .sd-goal-box { flex-shrink:0; width:18px; height:18px; border:2px solid var(--border-muted); border-radius:5px; margin-top:1px; display:flex; align-items:center; justify-content:center; transition:background .12s, border-color .12s; }
.sd-goal:hover .sd-goal-box { border-color:var(--brand); }
.sd-goal.done .sd-goal-box { background:var(--green); border-color:var(--green); }
.sd-goal.done .sd-goal-box::after { content:'✓'; color:#fff; font-size:11px; font-weight:800; line-height:1; }
.sd-goal.done .sd-goal-txt { color:var(--text-muted); text-decoration:line-through; text-decoration-color:var(--border-muted); }
@media (max-width:720px){ .sd-master-grid { grid-template-columns:1fr; } }
/* Header row + per-service progress ring */
.sd-headrow { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; flex-wrap:wrap; }
.sd-headmain { flex:1; min-width:0; }
.sd-ringwrap { display:flex; flex-direction:column; align-items:center; gap:7px; flex-shrink:0; }
.sd-ring { position:relative; width:72px; height:72px; }
.sd-ring-fg { transition:stroke-dashoffset .4s ease; }
.sd-ring-txt { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:800; color:var(--brand); }
.sd-ring-sub { font-size:11px; color:var(--text-muted); white-space:nowrap; }
/* Overview mastery + per-category progress */
.sd-hero-row { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; flex-wrap:wrap; }
.sd-hero-main { flex:1; min-width:0; }
.sd-home-cat-h .sd-cat-prog { font-size:11px; font-weight:800; color:var(--text-muted); background:var(--bg-3); border-radius:999px; padding:2px 9px; margin-left:8px; vertical-align:middle; letter-spacing:0; text-transform:none; }
.sd-home-cat-h .sd-cat-prog.complete { color:var(--green); background:var(--green-subtle); }
.sd-card.is-learned { border-left-color:var(--green); }
.sd-card-check { color:var(--green); font-weight:800; }
/* Test yourself — flashcards */
.sd-recall { background:linear-gradient(180deg,var(--bg-1),var(--bg-2)); }
.sd-recall-h { font-size:19px; font-weight:800; color:var(--text-primary); margin:0 0 4px; display:flex; align-items:center; gap:9px; }
.sd-recall-sub { font-size:13px; color:var(--text-muted); margin:0 0 18px; }
.sd-fcs { display:grid; gap:12px; }
.sd-fc { background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:12px; padding:16px 18px; box-shadow:var(--card-shadow); transition:border-color .12s; }
.sd-fc-q { display:flex; gap:11px; align-items:flex-start; font-size:14.5px; font-weight:700; color:var(--text-primary); line-height:1.5; }
.sd-fc-num { flex-shrink:0; width:22px; height:22px; border-radius:6px; background:var(--purple); color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:1px; }
.sd-fc-qt { flex:1; }
.sd-fc-reveal { margin:14px 0 0 33px; font-size:12.5px; font-weight:700; color:var(--purple); background:var(--purple-subtle); border:1px dashed var(--purple); border-radius:8px; padding:9px 14px; cursor:pointer; }
.sd-fc-reveal:hover { filter:brightness(1.06); }
.sd-fc-a { margin-left:33px; }
.sd-fc-a > p { margin:14px 0 0; font-size:13.5px; color:var(--text-secondary); line-height:1.7; padding:13px 16px; background:var(--bg-2); border-radius:9px; border-left:3px solid var(--purple); }
.sd-fc-grade { display:flex; gap:9px; margin-top:12px; }
.sd-fc-g { font-size:12px; font-weight:700; border-radius:8px; padding:6px 13px; cursor:pointer; border:1px solid var(--border-muted); background:var(--bg-2); color:var(--text-secondary); }
.sd-fc-g--good:hover, .sd-fc[data-grade="good"] .sd-fc-g--good { color:var(--green); border-color:var(--green); background:var(--green-subtle); }
.sd-fc-g--again:hover, .sd-fc[data-grade="again"] .sd-fc-g--again { color:var(--orange); border-color:var(--orange); background:var(--orange-subtle); }
.sd-fc[data-grade="good"] { border-color:var(--green); }
.sd-fc[data-grade="again"] { border-color:var(--orange); }
/* Momentum footer */
.sd-foot { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-top:30px; padding-top:24px; border-top:1px solid var(--border-subtle); }
.sd-foot-mark { display:inline-flex; align-items:center; gap:9px; font-size:14px; font-weight:800; color:#10151f; background:var(--brand); border-radius:11px; padding:12px 22px; cursor:pointer; box-shadow:var(--card-shadow); transition:transform .12s, filter .12s; }
.sd-foot-mark:hover { transform:translateY(-1px); filter:brightness(1.05); }
.sd-foot-mark.is-learned { background:var(--green); color:#fff; }
.sd-foot-mark-ico { font-size:15px; line-height:1; }
.sd-next { display:inline-flex; flex-direction:column; align-items:flex-end; text-decoration:none; }
.sd-next:hover { text-decoration:none; }
.sd-next-lbl { font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; font-weight:700; }
.sd-next-nm { font-size:15px; font-weight:700; color:var(--brand); }
.sd-next:hover .sd-next-nm { text-decoration:underline; }
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

  function masterHTML(format, svc) {
    const goals = masterGoals(svc);
    if (goals.length < 2) return '';
    const checked = getCheckedGoals(format, svc.id);
    const items = goals.map((g, i) => {
      const done = checked.has(i);
      return `<button class="sd-goal${done ? ' done' : ''}" type="button" data-goal="${i}" aria-pressed="${done}">
          <span class="sd-goal-box"></span><span class="sd-goal-txt">${esc(g)}</span>
        </button>`;
    }).join('');
    return `
      <div class="sd-master">
        <div class="sd-master-h">🎓 What you'll master here <span class="sd-master-hint">tap to check off</span></div>
        <div class="sd-master-grid">${items}</div>
      </div>`;
  }

  /* ── Detail page for one service ─────────────────────────── */
  function renderDetail(container, format, svc) {
    container.className = '';
    let styles = document.getElementById('sd-styles') ? '' : styleTag();
    const catLabel = (CATEGORIES[svc.category] || {}).label || svc.category || '';
    const goals = masterGoals(svc);
    const hasGoals = goals.length >= 2;
    const checkedNow = getCheckedGoals(format, svc.id);
    const ring = hasGoals ? ringHTML(checkedNow.size / goals.length, checkedNow.size + ' / ' + goals.length + ' goals') : '';
    container.innerHTML = `${styles}
<div class="sd page-enter">
  <div class="sd-wrap">
    <div class="sd-eyebrow">${esc(catLabel)}</div>
    <div class="sd-headrow">
      <div class="sd-headmain">
        <h1 class="sd-h1">${esc(svc.name)}</h1>
        ${svc.aka ? `<p class="sd-essence">${esc(svc.aka)}</p>` : ''}
        ${studyMetaHTML(svc)}
      </div>
      ${ring}
    </div>
    <p class="sd-tagline">${esc(svc.tagline || '')}</p>
    ${keyFactsHTML(svc.keyFacts)}
    ${masterHTML(format, svc)}
    ${sectionHTML('What it is', 'what', svc.what)}
    ${sectionHTML('Why it exists', 'why', svc.why)}
    ${sectionHTML('How it works', 'how', svc.how)}
    ${sectionHTML('Data engineering use case', 'deuse', svc.deUseCase)}
    ${integrationsHTML(format, svc.integrations)}
    ${sectionHTML('Runtime behavior', 'runtime', svc.runtime)}
    ${interviewHTML(svc.interview)}
    ${footerHTML(format, svc)}
  </div>
</div>`;
    // Goal checklist → persist + update the header progress ring
    const ringEl = container.querySelector('.sd-ring');
    const ringFg = container.querySelector('.sd-ring-fg');
    const ringTxt = container.querySelector('.sd-ring-txt');
    const ringSub = container.querySelector('.sd-ring-sub');
    function refreshRing() {
      const total = goals.length;
      const set = getCheckedGoals(format, svc.id);
      const pct = total ? set.size / total : 0;
      if (ringEl && ringFg) {
        const C = parseFloat(ringEl.getAttribute('data-circ')) || (2 * Math.PI * 30);
        ringFg.setAttribute('stroke-dashoffset', (C * (1 - pct)).toFixed(1));
      }
      if (ringTxt) ringTxt.textContent = Math.round(pct * 100) + '%';
      if (ringSub) ringSub.textContent = set.size + ' / ' + total + ' goals';
    }
    container.querySelectorAll('.sd-goal[data-goal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.getAttribute('data-goal'), 10);
        const set = getCheckedGoals(format, svc.id);
        const now = !set.has(i);
        if (now) set.add(i); else set.delete(i);
        setCheckedGoals(format, svc.id, set);
        btn.classList.toggle('done', now);
        btn.setAttribute('aria-pressed', String(now));
        refreshRing();
      });
    });

    // Flashcards: reveal answer, then self-grade
    container.querySelectorAll('.sd-fc-reveal').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.sd-fc');
        const ans = card.querySelector('.sd-fc-a');
        if (ans) ans.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        btn.style.display = 'none';
      });
    });
    container.querySelectorAll('.sd-fc-g').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.sd-fc');
        if (card) card.setAttribute('data-grade', btn.getAttribute('data-g'));
      });
    });
    // Mark as learned — persists; sidebar + Overview ring read this state
    const markBtn = container.querySelector('[data-learn-btn]');
    if (markBtn) {
      markBtn.addEventListener('click', () => {
        const now = !isLearned(format, svc.id);
        setLearned(format, svc.id, now);
        markBtn.classList.toggle('is-learned', now);
        markBtn.setAttribute('aria-pressed', String(now));
        const ico = markBtn.querySelector('.sd-foot-mark-ico');
        const txt = markBtn.querySelector('.sd-foot-mark-txt');
        if (ico) ico.textContent = now ? '✓' : '＋';
        if (txt) txt.textContent = now ? 'Learned' : 'Mark ' + svc.name + ' as learned';
        if (window.IcebergViz && window.IcebergViz.toast) {
          window.IcebergViz.toast(now ? svc.name + ' marked as learned' : svc.name + ' unmarked',
            { type: now ? 'success' : undefined, icon: now ? '✓' : undefined, duration: 1800 });
        }
        document.dispatchEvent(new CustomEvent('cde:learned-changed', { detail: { format, id: svc.id, learned: now } }));
      });
    }
  }

  /* ── Overview / home page for a format ───────────────────── */
  function renderHome(container, format, meta) {
    container.className = '';
    let styles = document.getElementById('sd-styles') ? '' : styleTag();
    const cats = categoriesFor(format);
    const total = cats.reduce((n, c) => n + c.items.length, 0);
    const learned = getLearnedSet(format);
    const learnedCount = cats.reduce((n, c) => n + c.items.filter(s => learned.has(s.id)).length, 0);
    const masteryPct = total ? learnedCount / total : 0;
    const catBlocks = cats.map(c => {
      const done = c.items.filter(s => learned.has(s.id)).length;
      const complete = done === c.items.length && c.items.length > 0;
      return `
      <div class="sd-home-cat">
        <h2 class="sd-home-cat-h">${esc(c.label)} <span class="sd-cat-prog${complete ? ' complete' : ''}">${done}/${c.items.length}</span></h2>
        <div class="sd-grid">${c.items.map(s => {
          const isL = learned.has(s.id);
          return `<a class="sd-card${isL ? ' is-learned' : ''}" href="#${format}/${s.id}">
             <div class="sd-card-name">${isL ? '<span class="sd-card-check" aria-label="Learned">✓</span> ' : ''}${esc(s.name)}</div>
             <div class="sd-card-tag">${esc(s.tagline || '')}</div>
           </a>`;
        }).join('')}</div>
      </div>`;
    }).join('');
    container.innerHTML = `${styles}
<div class="sd-home page-enter">
  <div class="sd-home-wrap">
    <div class="sd-home-hero">
      <div class="sd-hero-row">
        <div class="sd-hero-main">
          <h1>${esc(meta.title)}</h1>
          <p>${esc(meta.subtitle)}</p>
          <div class="sd-home-stats">
            <div class="sd-home-stat"><b>${total}</b><span>services</span></div>
            <div class="sd-home-stat"><b>${cats.length}</b><span>categories</span></div>
            <div class="sd-home-stat"><b>6</b><span>depth levels each</span></div>
          </div>
        </div>
        ${ringHTML(masteryPct, learnedCount + ' / ' + total + ' studied')}
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

  TV.ServiceDetail = { registerAll, registerHome, categoriesFor, navGroupsFor, CATEGORIES,
                       isLearned, getLearnedSet, setLearned };
})();
