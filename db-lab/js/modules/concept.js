/* ============================================================
   concept.js — Universal Concept Workspace
   Route: #concept/<slug>
   One consistent structure for every concept:
   Overview (Why · Intuition · How) → Internals → Simulate (embedded
   Canvas sim) → Engineering → Failure & Tradeoffs → Interview →
   Quick Check → Related → Next Step.
   Re-renders itself on hashchange (router keeps same base route).
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});

  function slugFromHash() {
    var raw = (location.hash || "").replace(/^#/, "").trim();
    var parts = raw.split("/");
    return parts[1] || null;
  }
  function wantsSim() {
    var raw = (location.hash || "").replace(/^#/, "").trim();
    return raw.split("/")[2] === "sim";
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function conceptLink(c) {
    return '<a class="chip" href="#concept/' + c.slug + '">' +
      '<span class="chip-icon">' + (c.icon || "•") + "</span>" + esc(c.title) + "</a>";
  }

  var Module = {
    id: "concept",
    title: "Concept",
    fullWidth: false,
    _teardownSim: null,
    _onHash: null,

    render: function (container) {
      var self = this;
      this._container = container;
      this._draw(container);
      // Router won't re-mount when only the slug changes, so watch hash.
      this._onHash = function () {
        if ((location.hash || "").indexOf("#concept/") === 0) self._draw(container);
      };
      window.addEventListener("hashchange", this._onHash);
    },

    destroy: function () {
      if (this._teardownSim) { try { this._teardownSim(); } catch (e) {} this._teardownSim = null; }
      if (this._onHash) { window.removeEventListener("hashchange", this._onHash); this._onHash = null; }
    },

    _draw: function (container) {
      var self = this;
      if (this._teardownSim) { try { this._teardownSim(); } catch (e) {} this._teardownSim = null; }

      var slug = slugFromHash();
      var c = slug && DL.conceptBySlug ? DL.conceptBySlug[slug] : null;

      if (!c) {
        container.innerHTML =
          '<div class="placeholder"><div class="placeholder-icon">🔍</div>' +
          "<div>Concept not found.</div>" +
          '<a class="btn btn-secondary" href="#learn">Browse all concepts</a></div>';
        return;
      }

      if (DL.Progress) DL.Progress.markViewed(c.id);

      var prereq = (c.prerequisites || []).map(function (id) { return DL.conceptById[id]; }).filter(Boolean);
      var related = (c.related || []).map(function (id) { return DL.conceptById[id]; }).filter(Boolean);
      var engApp = c.engineeringApp ? DL.conceptById[c.engineeringApp] : null;
      var next = related[0] || null;
      var quizzed = DL.Progress ? DL.Progress.quizFor(c.id) : null;

      // ── header ──
      var html = "";
      html += '<div class="module-header animate-fade-in-up">' +
        '<div class="module-eyebrow">' + esc(c.domain) + "</div>" +
        '<h1 class="module-title gradient-text">' + (c.icon || "") + " " + esc(c.title) + "</h1>" +
        '<p class="module-subtitle">' + esc(c.why || "Explore the interactive simulation below to see this concept in action.") + "</p>" +
        "</div>";

      // ── workspace tabs ──
      var tabs = [
        { id: "overview", label: "Overview" },
        { id: "internals", label: "Internals" },
        { id: "simulate", label: "▶ Simulate" },
        { id: "engineering", label: "Engineering" },
        { id: "failure", label: "Failure & Tradeoffs" },
        { id: "interview", label: "Interview" },
        { id: "related", label: "Related" },
      ];
      html += '<div class="ws-tabs" role="tablist">';
      tabs.forEach(function (t, i) {
        html += '<button class="ws-tab' + (i === 0 ? " active" : "") + '" data-tab="' + t.id + '" role="tab">' + t.label + "</button>";
      });
      html += "</div>";

      html += '<div class="ws-body">';

      // Overview
      html += '<section class="ws-panel active" data-panel="overview">' +
        section("Why it exists", c.why) +
        section("Intuition", c.intuition) +
        section("How it works", c.how || c.intuition) +
        (c.authored ? "" : authoringNote()) +
        '</section>';

      // Internals
      html += '<section class="ws-panel" data-panel="internals">' +
        section("Inside the database", c.internals) +
        '<div class="callout tip"><span class="callout-icon">🔬</span><div class="callout-body">' +
        'Open the <b>Simulate</b> tab to watch these internals step-by-step.</div></div>' +
        '</section>';

      // Simulate — sim mounts here
      html += '<section class="ws-panel" data-panel="simulate">' +
        '<div id="ws-sim-host" class="ws-sim-host"></div>' +
        '</section>';

      // Engineering
      html += '<section class="ws-panel" data-panel="engineering">' +
        section("Apply in engineering", c.engineering ||
          "When and why an engineer reaches for this — the practical decisions it drives.") +
        (engApp ? '<div class="callout"><span class="callout-icon">🏗️</span><div class="callout-body">' +
          'Applied concept: ' + conceptLink(engApp) + "</div></div>" : "") +
        '</section>';

      // Failure & tradeoffs
      html += '<section class="ws-panel" data-panel="failure">' +
        section("Failure modes & tradeoffs", c.failureModes) +
        '<div class="callout warn"><span class="callout-icon">💥</span><div class="callout-body">' +
        'See these break in the <a href="#failure-lab">Failure Lab</a>.</div></div>' +
        '</section>';

      // Interview
      html += '<section class="ws-panel" data-panel="interview">';
      if (c.interviewQs && c.interviewQs.length) {
        c.interviewQs.forEach(function (q, i) {
          html += '<div class="iq"><div class="iq-q">Q' + (i + 1) + ". " + esc(q.q) + "</div>" +
            '<div class="iq-a">' + q.a + "</div></div>";
        });
      } else {
        html += emptyNote("Interview questions for this concept are being authored.");
      }
      html += "</section>";

      // Related
      html += '<section class="ws-panel" data-panel="related">';
      if (prereq.length) html += '<div class="rel-group"><div class="rel-label">Prerequisites</div><div class="chip-row">' + prereq.map(conceptLink).join("") + "</div></div>";
      if (related.length) html += '<div class="rel-group"><div class="rel-label">Related concepts</div><div class="chip-row">' + related.map(conceptLink).join("") + "</div></div>";
      if (!prereq.length && !related.length) html += emptyNote("Concept graph links are being mapped.");
      html += "</section>";

      html += "</div>"; // ws-body

      // Next step footer
      html += '<div class="ws-footer">';
      html += '<a class="btn btn-secondary" href="#learn">← All concepts</a>';
      if (next) html += '<a class="btn btn-primary" href="#concept/' + next.slug + '">Next: ' + esc(next.title) + " →</a>";
      html += "</div>";

      container.innerHTML = html;

      // ── wire tabs ──
      var tabBtns = container.querySelectorAll(".ws-tab");
      var panels = container.querySelectorAll(".ws-panel");
      var simMounted = false;
      function activate(id) {
        tabBtns.forEach(function (b) { b.classList.toggle("active", b.dataset.tab === id); });
        panels.forEach(function (p) { p.classList.toggle("active", p.dataset.panel === id); });
        if (id === "simulate" && !simMounted) {
          simMounted = true;
          var host = container.querySelector("#ws-sim-host");
          if (host && DL.SimBridge) self._teardownSim = DL.SimBridge.mount(host, c.simFile);
        }
      }
      tabBtns.forEach(function (b) {
        b.addEventListener("click", function () { activate(b.dataset.tab); });
      });
      if (wantsSim()) activate("simulate");

      var canvas = document.getElementById("canvas");
      if (canvas) canvas.scrollTop = 0;
    },
  };

  function section(title, body) {
    if (!body) return "";
    return '<div class="ws-section"><h3 class="ws-h">' + esc(title) + "</h3>" +
      '<div class="ws-text">' + body + "</div></div>";
  }
  function authoringNote() {
    return '<div class="callout"><span class="callout-icon">✍️</span><div class="callout-body">' +
      "Full written walkthrough for this concept is on the roadmap — the interactive " +
      "simulation in the <b>Simulate</b> tab is fully live.</div></div>";
  }
  function emptyNote(msg) {
    return '<div class="ws-empty">' + esc(msg) + " Try the <b>Simulate</b> tab.</div>";
  }

  DL.registerModule(Module);
})();
