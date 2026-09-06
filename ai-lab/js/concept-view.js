// =============================================================================
// AI LAB — concept reader
// A concept is ONE continuous explanation, ordered from basic intuition down to
// deep internals. By default the whole thing is shown. The optional "read depth"
// control only *trims how far down you go* — it never swaps in a different
// explanation. Blocks are cumulative: Full = everything, top to bottom.
// =============================================================================
import { renderBlock } from "./blocks.js";

// depth (1–10, master-prompt §7) → short tag shown on section headings
const DEPTH_TAG = {
  1: "Intuition", 2: "Intuition", 3: "Technical", 4: "Mathematics",
  5: "Implementation", 6: "Production", 7: "Engineering", 8: "Architecture",
  9: "Interview", 10: "Principal",
};

// three friendly presets — a CEILING on how deep to read. Default = Full.
const PRESETS = [
  { id: "essentials", label: "Essentials", cap: 3, hint: "intuition → technical" },
  { id: "standard", label: "Standard", cap: 6, hint: "adds math, code, production" },
  { id: "full", label: "Full", cap: 10, hint: "everything, incl. interview & principal" },
];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

let presetId = localStorage.getItem("ailab:preset") || "full";
function cap() { return (PRESETS.find((p) => p.id === presetId) || PRESETS[2]).cap; }

export function renderConcept(concept, ctx) {
  const el = $("#reader-body");
  const idx = ctx.list.findIndex((c) => c.slug === concept.slug);
  const prev = idx > 0 ? ctx.list[idx - 1] : null;
  const next = idx < ctx.list.length - 1 ? ctx.list[idx + 1] : null;

  el.innerHTML = `
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

    <div class="readbar">
      <div class="readbar-left">
        <span class="readbar-label">Read depth</span>
        <div class="preset-group" id="presetGroup">
          ${PRESETS.map((p) => `<button class="preset${p.id === presetId ? " on" : ""}" data-preset="${p.id}" title="${p.hint}">${p.label}</button>`).join("")}
        </div>
      </div>
      <details class="toc"><summary>On this page</summary><nav id="tocNav"></nav></details>
    </div>

    <article class="blocks" id="blocks"></article>

    <nav class="reader-nav">
      ${prev ? `<a class="rn rn-prev" href="#/c/${prev.slug}"><span>‹ Previous</span><b>${prev.n} ${escapeHtml(prev.title)}</b></a>` : "<span></span>"}
      ${next ? `<a class="rn rn-next" href="#/c/${next.slug}"><span>Next ›</span><b>${next.n} ${escapeHtml(next.title)}</b></a>` : "<span></span>"}
    </nav>`;

  paintBlocks(concept);

  $("#presetGroup").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-preset]");
    if (!btn) return;
    presetId = btn.dataset.preset;
    localStorage.setItem("ailab:preset", presetId);
    $$(".preset", $("#presetGroup")).forEach((b) => b.classList.toggle("on", b.dataset.preset === presetId));
    paintBlocks(concept);
  });

  try { localStorage.setItem("ailab:seen:" + concept.slug, "1"); } catch (e) {}
  window.scrollTo(0, 0);
}

function paintBlocks(concept) {
  const host = $("#blocks");
  const visible = concept.blocks.filter((b) => (b.d || 1) <= cap());

  host.innerHTML = visible
    .map((b, i) => `<div class="blkwrap" id="blk-${i}" data-depth="${b.d || 1}">${renderBlock(b)}</div>`)
    .join("");

  // add a small depth tag onto each block that has a visible heading
  visible.forEach((b, i) => {
    if (!b.d) return;
    const wrap = $("#blk-" + i, host);
    const heading = wrap && wrap.querySelector(".blk-h, .hook-q, .eq-h, .pr-scenario, .ki-tag");
    if (heading && wrap.querySelector(".blk-h")) {
      const tag = document.createElement("span");
      tag.className = "depth-tag";
      tag.textContent = DEPTH_TAG[b.d] || "";
      wrap.querySelector(".blk-h").appendChild(tag);
    }
  });

  buildToc(visible, host);
  postPass(host);
  wireExec(host);
}

function buildToc(visible, host) {
  const nav = $("#tocNav");
  if (!nav) return;
  const items = [];
  visible.forEach((b, i) => {
    const label = b.h || (b.type === "hook" ? "Opening question" : null);
    if (label) items.push(`<a href="#blk-${i}" data-target="blk-${i}">${escapeHtml(stripTex(label))}</a>`);
  });
  nav.innerHTML = items.join("") || "<span class='toc-empty'>—</span>";
  nav.addEventListener("click", (e) => {
    const a = e.target.closest("[data-target]");
    if (!a) return;
    e.preventDefault();
    const t = document.getElementById(a.dataset.target);
    if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
    const det = a.closest("details"); if (det) det.open = false;
  });
}

function postPass(container) {
  if (window.renderMathInElement) {
    try {
      window.renderMathInElement(container, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
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
function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
