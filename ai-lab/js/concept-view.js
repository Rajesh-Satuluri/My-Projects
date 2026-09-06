// =============================================================================
// AI LAB — concept reader
// Renders a concept (ordered typed blocks) with a depth control, then runs the
// KaTeX + Prism post-pass and wires interactive blocks.
// =============================================================================
import { renderBlock } from "./blocks.js";

const DEPTHS = [
  "Intuition", "Visual", "Technical", "Mathematical", "Implementation",
  "Production", "Engineering", "Architecture", "Interview", "Principal",
];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

let currentDepth = Number(localStorage.getItem("ailab:depth") || 5);

function progressKey(slug) { return "ailab:seen:" + slug; }

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

    <div class="depthbar">
      <span class="depth-label">Depth</span>
      <input type="range" min="1" max="10" value="${currentDepth}" class="depth-range" id="depthRange" />
      <span class="depth-name" id="depthName">${DEPTHS[currentDepth - 1]}</span>
      <span class="depth-num">L${currentDepth}</span>
    </div>

    <article class="blocks" id="blocks"></article>

    <nav class="reader-nav">
      ${prev ? `<a class="rn rn-prev" href="#/c/${prev.slug}"><span>‹ Previous</span><b>${prev.n} ${escapeHtml(prev.title)}</b></a>` : "<span></span>"}
      ${next ? `<a class="rn rn-next" href="#/c/${next.slug}"><span>Next ›</span><b>${next.n} ${escapeHtml(next.title)}</b></a>` : "<span></span>"}
    </nav>`;

  paintBlocks(concept);
  $("#depthRange").addEventListener("input", (e) => {
    currentDepth = Number(e.target.value);
    localStorage.setItem("ailab:depth", currentDepth);
    $("#depthName").textContent = DEPTHS[currentDepth - 1];
    $(".depth-num").textContent = "L" + currentDepth;
    paintBlocks(concept);
  });

  try { localStorage.setItem(progressKey(concept.slug), "1"); } catch (e) {}
  window.scrollTo(0, 0);
}

function paintBlocks(concept) {
  const host = $("#blocks");
  const visible = concept.blocks.filter((b) => (b.d || 1) <= currentDepth);
  if (!visible.length) {
    host.innerHTML = `<div class="depth-empty">Nothing at this depth yet — raise the depth to reveal more of this concept.</div>`;
    return;
  }
  host.innerHTML = visible.map(renderBlock).join("");
  postPass(host);
  wireExec(host);
}

function postPass(container) {
  // KaTeX
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
  // Prism
  if (window.Prism) {
    try { window.Prism.highlightAllUnder(container); } catch (e) {}
  }
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
      if (at <= steps.length && steps[at - 1]) steps[at - 1].scrollIntoView({ block: "center", behavior: "smooth" });
    });
    $(".exec-btn[data-exec-reset]", box).addEventListener("click", () => { at = 0; paint(); });
    paint();
  });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
