// =============================================================================
// AI LAB — premium curriculum shell (titles only)
// Renders the coverage manifest as a track-based journey: hero, path map,
// six tracks of expandable module cards, cross-cutting systems, learning paths.
// =============================================================================
import { MODULES, SYSTEMS, PATHS, TRACKS, moduleById, countConcepts } from "./manifest.js";
import { TRANSFORMER_CONCEPTS } from "../data/transformers.js";
import { initRouter } from "./router.js";

// map a manifest concept title like "11.4 Build attention from zero" -> concept slug
const T_BY_N = new Map(TRANSFORMER_CONCEPTS.map((c) => [c.n, c]));
function conceptLink(title) {
  const m = String(title).match(/^(\d+\.\d+)/);
  if (m && T_BY_N.has(m[1])) return "#/c/" + T_BY_N.get(m[1]).slug;
  return null;
}

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// ---- helpers ----------------------------------------------------------------
function moduleConcepts(m) {
  const groups = [];
  if (m.groups) m.groups.forEach((g) => groups.push({ label: g.title, items: g.concepts }));
  if (m.concepts) groups.push({ label: null, items: m.concepts });
  return groups;
}
function moduleCount(m) {
  return moduleConcepts(m).reduce((n, g) => n + g.items.length, 0);
}

// progress ring at 0% (every concept pending) — the geometry is ready for later
function ring() {
  const r = 12, c = 2 * Math.PI * r;
  return `<svg class="ring" width="30" height="30" viewBox="0 0 30 30">
    <circle class="bg" cx="15" cy="15" r="${r}" fill="none" stroke-width="3"/>
    <circle class="fg" cx="15" cy="15" r="${r}" fill="none" stroke-width="3"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${c.toFixed(1)}"/>
  </svg>`;
}

// ---- top nav + path map ------------------------------------------------------
function renderNavAndMap() {
  const nav = $("#topnav");
  const map = $("#pathmap");
  nav.innerHTML = "";
  map.innerHTML = "";
  for (const t of TRACKS) {
    const a = document.createElement("a");
    a.href = `#${t.id}`;
    a.textContent = t.title;
    nav.appendChild(a);

    const card = document.createElement("a");
    card.href = `#${t.id}`;
    card.className = "pmcard" + (t.crown ? " crown" : "");
    card.style.setProperty("--hue", t.hue);
    const count = t.modules.reduce((n, id) => n + moduleCount(moduleById(id)), 0);
    card.innerHTML = `
      <div class="pm-n">${t.n}</div>
      <div class="pm-ic">${t.icon}</div>
      <div class="pm-t">${t.title}</div>
      <div class="pm-c">${t.modules.length} modules · ${count} concepts</div>`;
    map.appendChild(card);
  }
}

// ---- module card -------------------------------------------------------------
function moduleCard(m, hue) {
  const card = document.createElement("div");
  card.className = "modcard";
  card.style.setProperty("--hue", hue);
  card.dataset.module = m.id;

  const panelGroups = moduleConcepts(m)
    .map((g) => {
      const chips = g.items
        .map((c) => {
          const link = conceptLink(c);
          return link
            ? `<a class="chip chip-live" href="${link}">${c}</a>`
            : `<span class="chip">${c}</span>`;
        })
        .join("");
      const label = g.label ? `<div class="mc-grouplabel">${g.label}</div>` : "";
      return `${label}<div class="mc-concepts">${chips}</div>`;
    })
    .join("");

  const isLive = !!conceptLink((m.concepts || [])[0] || "");

  card.innerHTML = `
    <button class="modcard-btn" aria-expanded="false">
      <div class="mc-top">
        <span class="mc-code">${m.code}</span>
        ${m.star ? '<span class="badge-crown" style="margin:0">★ crown jewel</span>' : ""}
        <span class="mc-ring">${ring()}</span>
      </div>
      <h3 class="mc-title">${m.title}</h3>
      <p class="mc-sub">${m.subtitle || ""}</p>
      <div class="mc-foot">
        <span class="mc-count">${moduleCount(m)} concepts</span>
        <span class="${isLive ? "mc-live" : ""}">· ${isLive ? "live" : "pending"}</span>
        <span class="mc-chevron">›</span>
      </div>
    </button>
    <div class="mc-panel">${panelGroups}</div>`;

  const btn = $(".modcard-btn", card);
  btn.addEventListener("click", () => {
    const open = card.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  return card;
}

// ---- track section -----------------------------------------------------------
function renderTracks() {
  const root = $("#tracks");
  root.innerHTML = "";
  for (const t of TRACKS) {
    const sec = document.createElement("section");
    sec.className = "track" + (t.crown ? " crown" : "");
    sec.id = t.id;
    sec.style.setProperty("--hue", t.hue);
    const count = t.modules.reduce((n, id) => n + moduleCount(moduleById(id)), 0);

    sec.innerHTML = `
      <div class="track-head">
        <div class="track-num">${t.n}</div>
        <div class="track-headtext">
          ${t.crown ? '<div class="badge-crown">★ The star of the show</div>' : ""}
          <h2>${t.title}</h2>
          <p>${t.tagline}</p>
        </div>
        <div class="track-meta">
          <div class="tm-n">${count}</div>
          <div class="tm-l">concepts</div>
        </div>
      </div>`;

    const grid = document.createElement("div");
    grid.className = "modgrid";
    t.modules.forEach((id) => grid.appendChild(moduleCard(moduleById(id), t.hue)));
    sec.appendChild(grid);
    root.appendChild(sec);
  }
}

// ---- systems + paths ---------------------------------------------------------
function renderSystems() {
  const grid = $("#systems-grid");
  grid.innerHTML = SYSTEMS.map(
    (s) => `<div class="tile"><div class="t-code">${s.code}</div>
      <div class="t-title">${s.title}</div><div class="t-note">${s.note}</div></div>`
  ).join("");
}
function renderPaths() {
  const icons = ["◉", "⚙", "◆", "⇢", "▤", "⚡", "★"];
  $("#paths-grid").innerHTML = PATHS.map(
    (p, i) => `<div class="pathcard"><span class="p-ic">${icons[i % icons.length]}</span>
      <span class="p-t">${p}</span><span class="p-a">→</span></div>`
  ).join("");
}

// ---- stats -------------------------------------------------------------------
function renderStats() {
  $("#s-concepts").textContent = countConcepts();
  $("#s-tracks").textContent = TRACKS.length;
  $("#s-modules").textContent = MODULES.length;
}

// ---- search / filter ---------------------------------------------------------
function wireFilter() {
  const input = $("#filter");
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    document.body.classList.toggle("filtering", !!q);
    $$(".track").forEach((sec) => {
      let visInTrack = 0;
      $$(".modcard", sec).forEach((card) => {
        const m = moduleById(card.dataset.module);
        const hay = (m.title + " " + (m.subtitle || "") + " " +
          moduleConcepts(m).flatMap((g) => g.items).join(" ")).toLowerCase();
        const hitConcept = q && moduleConcepts(m).flatMap((g) => g.items)
          .some((c) => c.toLowerCase().includes(q));
        const show = !q || hay.includes(q);
        card.hidden = !show;
        if (show) visInTrack++;
        // auto-open cards that match on a concept so the hit is visible
        if (q && hitConcept) card.classList.add("open");
        else if (q) card.classList.remove("open");
      });
      sec.hidden = visInTrack === 0;
    });
  });
}

// ---- init --------------------------------------------------------------------
renderNavAndMap();
renderTracks();
renderSystems();
renderPaths();
renderStats();
wireFilter();
initRouter();
