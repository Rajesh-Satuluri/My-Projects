// =============================================================================
// AI LAB — hash router. Two views: the landing shell and the concept reader.
//   #/            → landing
//   #/c/<slug>    → concept reader (deep-linkable)
// =============================================================================
import { renderConcept } from "./concept-view.js";
import { TRANSFORMER_CONCEPTS } from "../data/transformers.js";

const bySlug = new Map(TRANSFORMER_CONCEPTS.map((c) => [c.slug, c]));

function show(view) {
  document.getElementById("landing").hidden = view !== "landing";
  document.getElementById("reader").hidden = view !== "reader";
  document.body.classList.toggle("reading", view === "reader");
}

function route() {
  const h = location.hash.replace(/^#/, "");
  const m = h.match(/^\/c\/(.+)$/);
  if (m && bySlug.has(m[1])) {
    show("reader");
    renderConcept(bySlug.get(m[1]), {
      list: TRANSFORMER_CONCEPTS,
      trackTitle: "Transformers ★",
    });
  } else {
    show("landing");
  }
}

export function initRouter() {
  window.addEventListener("hashchange", route);
  route();
}
