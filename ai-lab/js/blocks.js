// =============================================================================
// AI LAB — block renderer registry
// A concept is an ordered list of typed blocks. Each block declares a minimum
// depth `d` (1–10, master-prompt §7) so the depth control reveals more as you
// go deeper. Renderers return HTML strings; math is rendered by KaTeX and code
// by Prism in a post-pass (see concept-view.js).
// =============================================================================

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// lightweight inline formatting: **bold**, `code`, and $math$ passthrough
function inline(s) {
  let out = "";
  let i = 0;
  const str = String(s);
  while (i < str.length) {
    const ch = str[i];
    if (ch === "$") {
      const end = str.indexOf("$", i + 1);
      if (end > i) { out += str.slice(i, end + 1); i = end + 1; continue; }
    }
    if (ch === "`") {
      const end = str.indexOf("`", i + 1);
      if (end > i) { out += `<code>${esc(str.slice(i + 1, end))}</code>`; i = end + 1; continue; }
    }
    if (ch === "*" && str[i + 1] === "*") {
      const end = str.indexOf("**", i + 2);
      if (end > i) { out += `<strong>${esc(str.slice(i + 2, end))}</strong>`; i = end + 2; continue; }
    }
    if (ch === "*" && str[i + 1] !== "*") {
      const end = str.indexOf("*", i + 1);
      if (end > i) { out += `<em>${esc(str.slice(i + 1, end))}</em>`; i = end + 1; continue; }
    }
    out += esc(ch);
    i++;
  }
  return out;
}

function paras(text) {
  return String(text)
    .split(/\n\n+/)
    .map((p) => `<p>${inline(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// ---- matrix renderer (for numerical examples) --------------------------------
function matrix(m, opts = {}) {
  const rows = m.map(
    (row) => `<tr>${row.map((v) => `<td>${typeof v === "number" ? fmt(v) : esc(v)}</td>`).join("")}</tr>`
  ).join("");
  const label = opts.label ? `<span class="mx-label">${inline(opts.label)}</span>` : "";
  return `<span class="mx">${label}<span class="mx-bracket">
    <table class="mx-tbl">${rows}</table></span></span>`;
}
function fmt(v) {
  if (Number.isInteger(v)) return String(v);
  return (Math.round(v * 1000) / 1000).toString();
}

// ---- flow diagram (vertical steps with arrows) -------------------------------
function flow(steps, hue) {
  return `<div class="flow">${steps
    .map((s, i) => {
      const box = typeof s === "string" ? { t: s } : s;
      const arrow = i < steps.length - 1 ? `<div class="flow-arrow">↓</div>` : "";
      return `<div class="flow-box${box.hi ? " hi" : ""}">${inline(box.t)}${
        box.note ? `<span class="flow-note">${inline(box.note)}</span>` : ""
      }</div>${arrow}`;
    })
    .join("")}</div>`;
}

// =============================================================================
// REGISTRY
// =============================================================================
export const RENDERERS = {
  hook: (b) => `<div class="blk hook">
      <div class="hook-q">${inline(b.q)}</div>
      ${b.sub ? `<div class="hook-sub">${paras(b.sub)}</div>` : ""}
    </div>`,

  prose: (b) => `<div class="blk prose">
      ${b.h ? `<h3 class="blk-h">${inline(b.h)}</h3>` : ""}
      ${paras(b.text)}
    </div>`,

  keyIdea: (b) => `<div class="blk keyidea">
      <span class="ki-tag">Key idea</span>
      <div>${paras(b.text)}</div>
    </div>`,

  equation: (b) => `<div class="blk equation">
      ${b.h ? `<div class="eq-h">${inline(b.h)}</div>` : ""}
      <div class="eq-display">$$${b.tex}$$</div>
      ${b.caption ? `<div class="eq-caption">${inline(b.caption)}</div>` : ""}
      ${
        b.symbols
          ? `<dl class="eq-symbols">${b.symbols
              .map((s) => `<dt>$${s.sym}$</dt><dd>${inline(s.meaning)}</dd>`)
              .join("")}</dl>`
          : ""
      }
    </div>`,

  numericalExample: (b) => `<div class="blk numex">
      ${b.h ? `<h3 class="blk-h">${inline(b.h)}</h3>` : ""}
      ${b.intro ? paras(b.intro) : ""}
      <div class="numex-steps">${b.steps
        .map(
          (st) => `<div class="numex-step">
            ${st.label ? `<div class="numex-label">${inline(st.label)}</div>` : ""}
            ${st.text ? `<div class="numex-text">${paras(st.text)}</div>` : ""}
            ${st.matrices ? `<div class="numex-mx">${st.matrices.map((m) => matrix(m.data, m)).join('<span class="mx-op">'+"</span>")}</div>` : ""}
            ${st.math ? `<div class="eq-display small">$$${st.math}$$</div>` : ""}
          </div>`
        )
        .join("")}</div>
      ${b.takeaway ? `<div class="numex-take">${inline(b.takeaway)}</div>` : ""}
    </div>`,

  diagram: (b) => `<div class="blk diagram">
      ${b.h ? `<h3 class="blk-h">${inline(b.h)}</h3>` : ""}
      ${flow(b.steps, b.hue)}
      ${b.caption ? `<div class="fig-caption">${inline(b.caption)}</div>` : ""}
    </div>`,

  code: (b) => `<div class="blk code">
      ${b.h ? `<div class="code-h">${inline(b.h)}</div>` : ""}
      <pre class="line-numbers"><code class="language-${b.lang || "python"}">${esc(b.code)}</code></pre>
      ${b.caption ? `<div class="fig-caption">${inline(b.caption)}</div>` : ""}
    </div>`,

  table: (b) => `<div class="blk tablewrap">
      ${b.h ? `<h3 class="blk-h">${inline(b.h)}</h3>` : ""}
      <div class="table-scroll"><table class="cmp">
        <thead><tr>${b.headers.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead>
        <tbody>${b.rows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody>
      </table></div>
    </div>`,

  tradeoffs: (b) => `<div class="blk tradeoffs">
      ${b.h ? `<h3 class="blk-h">${inline(b.h)}</h3>` : ""}
      <ul class="to-list">${b.items
        .map((it) => `<li><span class="to-lever">${inline(it.lever)}</span><span class="to-why">${inline(it.why)}</span></li>`)
        .join("")}</ul>
    </div>`,

  failureModes: (b) => `<div class="blk failures">
      ${b.h ? `<h3 class="blk-h">${inline(b.h)}</h3>` : ""}
      <table class="fail-tbl"><thead><tr><th>Symptom</th><th>Root cause</th><th>Fix</th></tr></thead>
      <tbody>${b.items
        .map((it) => `<tr><td>${inline(it.symptom)}</td><td>${inline(it.cause)}</td><td>${inline(it.fix)}</td></tr>`)
        .join("")}</tbody></table>
    </div>`,

  interview: (b) => `<div class="blk interview">
      <h3 class="blk-h">${b.h || "Interview"}</h3>
      ${b.items
        .map(
          (it) => `<details class="iq"><summary><span class="iq-reg">${it.reg || "Q"}</span>${inline(it.q)}</summary>
            <div class="iq-a">${paras(it.a)}</div></details>`
        )
        .join("")}
    </div>`,

  principalChallenge: (b) => `<div class="blk principal">
      <span class="pr-tag">Principal challenge</span>
      <div class="pr-scenario">${inline(b.scenario)}</div>
      <details class="pr-reason"><summary>How to reason about it</summary>
        <div>${paras(b.reasoning)}</div></details>
    </div>`,

  timeline: (b) => `<div class="blk timeline">
      ${b.h ? `<h3 class="blk-h">${inline(b.h)}</h3>` : ""}
      <ol class="tl">${b.items
        .map((it) => `<li><span class="tl-when">${inline(it.when)}</span><span class="tl-what">${inline(it.what)}</span></li>`)
        .join("")}</ol>
    </div>`,

  attentionMatrix: (b) => {
    const toks = b.tokens;
    const n = toks.length;
    const rows = b.weights; // n×n row-normalized
    const cell = 46, pad = 58;
    const w = pad + n * cell, h = pad + n * cell;
    let svg = `<svg viewBox="0 0 ${w} ${h}" class="attn-svg" role="img">`;
    // column labels
    toks.forEach((t, j) => {
      svg += `<text x="${pad + j * cell + cell / 2}" y="${pad - 20}" class="attn-lbl" text-anchor="middle">${esc(t)}</text>`;
    });
    rows.forEach((row, i) => {
      svg += `<text x="${pad - 12}" y="${pad + i * cell + cell / 2 + 4}" class="attn-lbl" text-anchor="end">${esc(toks[i])}</text>`;
      row.forEach((v, j) => {
        const op = 0.08 + 0.92 * v;
        svg += `<rect x="${pad + j * cell}" y="${pad + i * cell}" width="${cell - 4}" height="${cell - 4}" rx="6"
          fill="hsl(350 85% 62% / ${op.toFixed(2)})" class="attn-cell" data-row="${i}"><title>${esc(toks[i])} → ${esc(toks[j])}: ${v.toFixed(2)}</title></rect>`;
        svg += `<text x="${pad + j * cell + (cell - 4) / 2}" y="${pad + i * cell + (cell - 4) / 2 + 4}" class="attn-val" text-anchor="middle">${v.toFixed(2)}</text>`;
      });
    });
    svg += `</svg>`;
    return `<div class="blk attnmatrix">
      ${b.h ? `<h3 class="blk-h">${inline(b.h)}</h3>` : ""}
      <div class="attn-wrap">${svg}</div>
      ${b.caption ? `<div class="fig-caption">${inline(b.caption)}</div>` : ""}</div>`;
  },

  steps: (b) => {
    const items = b.items
      .map(
        (it, i) => `<li class="exec-step" data-i="${i}">
        <span class="exec-n">${i + 1}</span>
        <div><div class="exec-t">${inline(it.t)}</div>${it.d ? `<div class="exec-d">${inline(it.d)}</div>` : ""}</div>
      </li>`
      )
      .join("");
    return `<div class="blk execmode" data-exec>
      <h3 class="blk-h">${b.h || "Mentally execute it"}</h3>
      <div class="exec-controls"><button class="exec-btn" data-exec-next>Next ›</button>
        <button class="exec-btn ghost" data-exec-reset>Reset</button>
        <span class="exec-progress"><b>0</b>/${b.items.length}</span></div>
      <ol class="exec-list">${items}</ol></div>`;
  },

  relatedGraph: (b) => `<div class="blk relgraph">
      ${b.h ? `<h3 class="blk-h">${inline(b.h)}</h3>` : ""}
      ${b.chains
        .map((chain) => `<div class="relchain">${chain
          .map((node, i) => `<span class="relnode">${inline(node)}</span>${i < chain.length - 1 ? '<span class="relarr">→</span>' : ""}`)
          .join("")}</div>`)
        .join("")}
    </div>`,
};

export function renderBlock(b) {
  const fn = RENDERERS[b.type];
  if (!fn) return `<div class="blk unknown">[${esc(b.type)}]</div>`;
  return fn(b);
}
