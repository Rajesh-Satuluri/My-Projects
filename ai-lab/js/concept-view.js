// =============================================================================
// AI LAB — concept reader (3-column docs layout)
//   left rail  = all concepts in the track (persistent nav)
//   center     = one continuous explanation, read top to bottom
//   right rail = "on this page" outline with scroll-spy
// No depth control — each concept simply shows its full explanation.
// =============================================================================
import { renderBlock } from "./blocks.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export function renderConcept(concept, ctx) {
  const el = $("#reader-body");
  const idx = ctx.list.findIndex((c) => c.slug === concept.slug);
  const prev = idx > 0 ? ctx.list[idx - 1] : null;
  const next = idx < ctx.list.length - 1 ? ctx.list[idx + 1] : null;

  const railItems = ctx.list
    .map((c) => `<a class="rail-item${c.slug === concept.slug ? " on" : ""}" href="#/c/${c.slug}">
        <span class="rail-n">${c.n}</span><span class="rail-t">${escapeHtml(c.title)}</span></a>`)
    .join("");

  el.innerHTML = `
    <div class="reader-grid">
      <aside class="reader-rail left">
        <a class="rail-home" href="#/">‹ All curriculum</a>
        <div class="rail-track">Transformers ★</div>
        <nav class="rail-list">${railItems}</nav>
      </aside>

      <main class="reader-main">
        <div class="reader-topbar">
          <a class="crumb" href="#/">AI Lab</a><span class="crumb-sep">/</span>
          <a class="crumb" href="#/">${ctx.trackTitle}</a><span class="crumb-sep">/</span>
          <span class="crumb cur">${concept.n}</span>
        </div>
        <header class="reader-head">
          <div class="reader-eyebrow">${concept.n} · Transformer Laboratory</div>
          <h1 class="reader-title">${concept.title}</h1>
          ${concept.subtitle ? `<p class="reader-sub">${concept.subtitle}</p>` : ""}
        </header>
        <article class="blocks" id="blocks"></article>
        <nav class="reader-nav">
          ${prev ? `<a class="rn rn-prev" href="#/c/${prev.slug}"><span>‹ Previous</span><b>${prev.n} ${escapeHtml(prev.title)}</b></a>` : "<span></span>"}
          ${next ? `<a class="rn rn-next" href="#/c/${next.slug}"><span>Next ›</span><b>${next.n} ${escapeHtml(next.title)}</b></a>` : "<span></span>"}
        </nav>
      </main>

      <aside class="reader-rail right">
        <div class="toc-title">On this page</div>
        <nav class="toc-list" id="tocNav"></nav>
      </aside>
    </div>`;

  paintBlocks(concept);

  const active = $(".rail-item.on");
  if (active) active.scrollIntoView({ block: "nearest" });

  try { localStorage.setItem("ailab:seen:" + concept.slug, "1"); } catch (e) {}
  window.scrollTo(0, 0);
}

function paintBlocks(concept) {
  const host = $("#blocks");
  host.innerHTML = concept.blocks
    .map((b, i) => `<div class="blkwrap" id="blk-${i}">${renderBlock(b)}</div>`)
    .join("");

  buildToc(concept.blocks);
  postPass(host);
  wireExec(host);
  wireScrollSpy(concept.blocks);
}

function buildToc(blocks) {
  const nav = $("#tocNav");
  if (!nav) return;
  const items = [];
  blocks.forEach((b, i) => {
    const label = b.h || (b.type === "hook" ? "Opening question" : null);
    if (label) items.push(`<a href="#blk-${i}" data-target="blk-${i}">${escapeHtml(stripTex(label))}</a>`);
  });
  nav.innerHTML = items.join("") || "<span class='toc-empty'>—</span>";
  nav.onclick = (e) => {
    const a = e.target.closest("[data-target]");
    if (!a) return;
    e.preventDefault();
    const t = document.getElementById(a.dataset.target);
    if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
  };
}

function wireScrollSpy(blocks) {
  const links = $$("#tocNav a");
  if (!links.length) return;
  const map = new Map(links.map((a) => [a.dataset.target, a]));
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        links.forEach((a) => a.classList.remove("on"));
        const a = map.get(en.target.id);
        if (a) a.classList.add("on");
      }
    });
  }, { rootMargin: "-100px 0px -70% 0px" });
  blocks.forEach((_, i) => {
    const w = document.getElementById("blk-" + i);
    if (w && map.has("blk-" + i)) obs.observe(w);
  });
}

function postPass(container) {
  if (window.renderMathInElement) {
    try {
      window.renderMathInElement(container, {
        delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }],
        throwOnError: false,
      });
    } catch (e) {}
  }
  if (window.Prism) { try { window.Prism.highlightAllUnder(container); } catch (e) {} }
}

function wireExec(container) {
  $$("[data-exec]", container).forEach((box) => {
    const steps = $$(".exec-step", box);
    const counter = $(".exec-progress b", box);
    let at = 0;
    const paint = () => {
      steps.forEach((s, i) => s.classList.toggle("on", i < at));
      steps.forEach((s, i) => s.classList.toggle("active", i === at - 1));
      counter.textContent = at;
    };
    $(".exec-btn[data-exec-next]", box).addEventListener("click", () => {
      if (at < steps.length) at++;
      paint();
      if (steps[at - 1]) steps[at - 1].scrollIntoView({ block: "center", behavior: "smooth" });
    });
    $(".exec-btn[data-exec-reset]", box).addEventListener("click", () => { at = 0; paint(); });
    paint();
  });
}

function stripTex(s) { return String(s).replace(/\$[^$]*\$/g, "").replace(/\s+/g, " ").trim(); }
function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
