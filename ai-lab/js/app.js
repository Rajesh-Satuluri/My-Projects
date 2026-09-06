// =============================================================================
// AI LAB — OUTLINE VIEWER (titles only)
// -----------------------------------------------------------------------------
// Renders the coverage manifest as a browsable outline. No content yet — this
// is the "see every heading before we author anything" view. Every concept is
// a stub marked "pending".
// =============================================================================

import { MODULES, SYSTEMS, PATHS, KINDS, countConcepts } from "./manifest.js";

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

// ---- Build the concept list for a module (flat, with optional group labels) -
function moduleConcepts(m) {
  const out = [];
  if (m.concepts) m.concepts.forEach((c) => out.push({ title: c, group: null }));
  if (m.groups) m.groups.forEach((g) => g.concepts.forEach((c) => out.push({ title: c, group: g.title })));
  return out;
}
function moduleCount(m) {
  return moduleConcepts(m).length;
}

// ---- Sidebar -----------------------------------------------------------------
function renderSidebar() {
  const nav = $("#nav");
  nav.innerHTML = "";
  for (const m of MODULES) {
    const kind = KINDS[m.kind] || {};
    const a = document.createElement("a");
    a.href = `#${m.id}`;
    a.className = "nav-item" + (m.star ? " nav-star" : "");
    a.dataset.id = m.id;
    a.style.setProperty("--hue", kind.hue ?? 210);
    a.innerHTML = `
      <span class="nav-code">${m.code}</span>
      <span class="nav-title">${m.title}${m.star ? " ⭐" : ""}</span>
      <span class="nav-count">${moduleCount(m)}</span>`;
    nav.appendChild(a);
  }
}

// ---- Main outline ------------------------------------------------------------
function conceptCard(title) {
  const el = document.createElement("li");
  el.className = "concept";
  el.innerHTML = `<span class="concept-dot"></span><span class="concept-title">${title}</span><span class="concept-status">pending</span>`;
  return el;
}

function renderModule(m) {
  const kind = KINDS[m.kind] || {};
  const section = document.createElement("section");
  section.className = "module" + (m.star ? " module-star" : "");
  section.id = m.id;
  section.style.setProperty("--hue", kind.hue ?? 210);

  const header = document.createElement("header");
  header.className = "module-head";
  header.innerHTML = `
    <div class="module-head-row">
      <span class="module-code">${m.code}</span>
      <h2 class="module-title">${m.title}</h2>
      <span class="kind-chip">${kind.label ?? ""}</span>
      <span class="module-count">${moduleCount(m)} concepts</span>
    </div>
    <p class="module-sub">${m.subtitle ?? ""}</p>`;
  section.appendChild(header);

  if (m.groups) {
    for (const g of m.groups) {
      const gh = document.createElement("h3");
      gh.className = "group-title";
      gh.textContent = g.title;
      section.appendChild(gh);
      const ul = document.createElement("ul");
      ul.className = "concepts";
      g.concepts.forEach((c) => ul.appendChild(conceptCard(c)));
      section.appendChild(ul);
    }
  }
  if (m.concepts) {
    const ul = document.createElement("ul");
    ul.className = "concepts";
    m.concepts.forEach((c) => ul.appendChild(conceptCard(c)));
    section.appendChild(ul);
  }
  return section;
}

function renderSystems() {
  const section = document.createElement("section");
  section.className = "module module-systems";
  section.id = "systems";
  section.innerHTML = `
    <header class="module-head">
      <div class="module-head-row">
        <span class="module-code">§24–36</span>
        <h2 class="module-title">Cross-cutting Systems</h2>
        <span class="kind-chip">Platform-wide</span>
        <span class="module-count">${SYSTEMS.length} engines</span>
      </div>
      <p class="module-sub">Modes &amp; engines that wrap every concept — not linear modules.</p>
    </header>`;
  const ul = document.createElement("ul");
  ul.className = "concepts systems-list";
  for (const s of SYSTEMS) {
    const li = document.createElement("li");
    li.className = "concept";
    li.innerHTML = `<span class="concept-dot"></span><span class="concept-title">${s.code} · ${s.title}</span><span class="concept-note">${s.note}</span>`;
    ul.appendChild(li);
  }
  section.appendChild(ul);

  const ph = document.createElement("div");
  ph.className = "paths-block";
  ph.innerHTML = `<h3 class="group-title">§34 Learning Paths</h3>
    <div class="paths">${PATHS.map((p) => `<span class="path-chip">${p}</span>`).join("")}</div>`;
  section.appendChild(ph);
  return section;
}

function renderMain() {
  const main = $("#outline");
  main.innerHTML = "";
  MODULES.forEach((m) => main.appendChild(renderModule(m)));
  main.appendChild(renderSystems());
}

// ---- Coverage banner ---------------------------------------------------------
function renderBanner() {
  const total = countConcepts();
  $("#stat-concepts").textContent = total;
  $("#stat-modules").textContent = MODULES.length;
  $("#stat-systems").textContent = SYSTEMS.length;
}

// ---- Filter ------------------------------------------------------------------
function wireFilter() {
  const input = $("#filter");
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    let anyVisible;
    $$(".module").forEach((sec) => {
      let visibleInSec = 0;
      $$(".concept", sec).forEach((c) => {
        const t = c.querySelector(".concept-title").textContent.toLowerCase();
        const show = !q || t.includes(q);
        c.hidden = !show;
        if (show) visibleInSec++;
      });
      // hide empty group titles
      $$(".group-title", sec).forEach((gt) => {
        const ul = gt.nextElementSibling;
        gt.hidden = ul && $$(".concept:not([hidden])", ul).length === 0;
      });
      sec.hidden = visibleInSec === 0;
    });
  });
}

// ---- Scroll-spy for sidebar --------------------------------------------------
function wireScrollSpy() {
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          $$(".nav-item").forEach((n) => n.classList.remove("active"));
          const active = $(`.nav-item[data-id="${e.target.id}"]`);
          if (active) active.classList.add("active");
        }
      });
    },
    { rootMargin: "-10% 0px -80% 0px" }
  );
  $$(".module").forEach((m) => obs.observe(m));
}

// ---- Init --------------------------------------------------------------------
renderSidebar();
renderMain();
renderBanner();
wireFilter();
wireScrollSpy();
