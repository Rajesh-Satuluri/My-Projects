# New Visualizer — Session Briefing v2

This document gives a new Claude Code session everything it needs to build and
deploy a new topic visualizer in the `rajesh-satuluri/My-Projects` repo.
Read only this file — no other files need to be read before starting.

---

## Repo and branch

- **Repo**: `rajesh-satuluri/My-Projects`
- **Working branch**: `claude/apache-flink-visualizer-f5tmg5`
- **Never push to main**. All work goes to the branch above.
- Push with: `git push -u origin claude/apache-flink-visualizer-f5tmg5`

---

## Currently live visualizers

The site is at: `https://rajesh-satuluri.github.io/My-Projects/`

| URL path | Directory on branch | Topic |
|---|---|---|
| `/` (root) | `flink-visualizer/` | Apache Flink (Uber Edition) |
| `/kafka/` | `kafka-visualizer/` | Apache Kafka (Amazon Edition) |
| `/iceberg/` | `_branches/iceberg` → `iceberg-visualizer/` | Apache Iceberg |
| `/dbt/` | `_branches/dbt` → `dbt-visualizer/` | dbt |
| `/python/` | `_branches/python` → `python-companion/` | Python & PySpark |
| `/db-engineering/` | `_branches/db-engineering` → `db-engineering-visualizer/` | DB Engineering |
| `/snowflake/` | `_branches/snowflake` → `snowflake-visualizer/` | Snowflake |
| `/databricks/` | `databricks-visualizer/` | Databricks Lakehouse |

**Important**: flink and kafka/databricks visualizers are on the main working
branch (`claude/apache-flink-visualizer-f5tmg5`). Others live on separate branches
that are checked out during the deploy workflow. Your new visualizer goes directly
in the working branch (not a separate branch) — just like databricks-visualizer/.

---

## Two things to update for every new visualizer

### 1 — `.github/workflows/deploy-pages.yml`

Add a checkout step (if on a separate branch) and a staging block. Since your
new visualizer will be on the main working branch, you only need to add the
staging lines. Current full file for reference:

```yaml
name: Deploy All Visualizers to GitHub Pages

on:
  push:
    branches:
      - claude/apache-flink-visualizer-f5tmg5
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout flink+kafka branch
        uses: actions/checkout@v4
        with:
          ref: claude/apache-flink-visualizer-f5tmg5

      - name: Checkout iceberg branch
        uses: actions/checkout@v4
        with:
          ref: claude/iceberg-visualizer-v77ua8
          path: _branches/iceberg

      - name: Checkout dbt branch
        uses: actions/checkout@v4
        with:
          ref: claude/dbt-learning-module-e1393i
          path: _branches/dbt

      - name: Checkout python branch
        uses: actions/checkout@v4
        with:
          ref: claude/python-pyspark-companion
          path: _branches/python

      - name: Checkout db-engineering branch
        uses: actions/checkout@v4
        with:
          ref: claude/visualizer-app-shell-06nnvp
          path: _branches/db-engineering

      - name: Checkout snowflake branch
        uses: actions/checkout@v4
        with:
          ref: claude/new-project-branch-i29f9y
          path: _branches/snowflake

      - name: Stage all visualizers
        run: |
          mkdir -p /tmp/site-root/flink
          cp -r flink-visualizer/. /tmp/site-root/flink/

          mkdir -p /tmp/site-root/kafka
          cp -r kafka-visualizer/. /tmp/site-root/kafka/

          mkdir -p /tmp/site-root/iceberg
          cp -r _branches/iceberg/iceberg-visualizer/. /tmp/site-root/iceberg/

          mkdir -p /tmp/site-root/dbt
          cp -r _branches/dbt/dbt-visualizer/. /tmp/site-root/dbt/

          mkdir -p /tmp/site-root/python
          cp -r _branches/python/python-companion/. /tmp/site-root/python/

          mkdir -p /tmp/site-root/db-engineering
          cp -r _branches/db-engineering/db-engineering-visualizer/. /tmp/site-root/db-engineering/

          mkdir -p /tmp/site-root/snowflake
          cp -r _branches/snowflake/snowflake-visualizer/. /tmp/site-root/snowflake/

          mkdir -p /tmp/site-root/databricks
          cp -r databricks-visualizer/. /tmp/site-root/databricks/

          cp landing/index.html /tmp/site-root/index.html
          touch /tmp/site-root/.nojekyll

          echo "Staged:"
          ls /tmp/site-root/

      - name: Deploy to gh-pages branch
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: /tmp/site-root
          publish_branch: gh-pages
          force_orphan: true
```

**What to add** for a new visualizer named `redis` (in directory `redis-visualizer/`):

In the "Stage all visualizers" run block, add two lines:
```yaml
          mkdir -p /tmp/site-root/redis
          cp -r redis-visualizer/. /tmp/site-root/redis/
```

### 2 — `landing/index.html`

Add a card to the grid. The landing page is a standalone HTML file at
`landing/index.html` (copied to `site-root/index.html` at deploy time).

**Update the stat counters** at the top (currently: 8 Visualizers, 130+ Modules,
300+ Interview Q&As) to reflect the new totals.

**Add a card** inside `<div class="grid">`. Copy this template and fill in:

```html
<a class="card" href="redis/" data-color="red">
  <div class="card-top">
    <div class="card-icon">&#x1F534;</div>   <!-- emoji as HTML entity -->
    <div class="card-tag">In-Memory DB</div>
  </div>
  <div>
    <div class="card-title">Redis</div>
    <div class="card-subtitle">Amazon ElastiCache Edition</div>
  </div>
  <div class="card-desc">
    Data structures, persistence, pub/sub, streams, replication,
    Sentinel, cluster mode, and caching patterns at Amazon scale.
  </div>
  <div class="card-footer">
    <span class="card-modules">15 modules</span>
    <span class="card-open">Open
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.5">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </span>
  </div>
</a>
```

Available `data-color` values (already styled): `orange`, `blue`, `cyan`,
`green`, `yellow`. To add a new color like `red`, add one line to the `<style>`
block at the top of `landing/index.html`:
```css
.card[data-color=red]{--accent:#E53E3E}
```

---

## New visualizer directory structure

Create a top-level directory, e.g. `redis-visualizer/`:

```
redis-visualizer/
├── index.html                    ← SPA shell
├── styles.css                    ← Copy from kafka-visualizer/styles.css, change accent
├── script.js                     ← Router + nav wiring
├── components/
│   ├── nav.js                    ← MODULES array + renderNav + updateProgress
│   ├── module-shell.js           ← createModuleShell + createIQSection + initTabs + initIQ
│   └── canvas-primitives.js      ← Animation helpers (copy from kafka-visualizer/components/)
└── modules/
    ├── m01-why-redis.js
    ├── m02-data-structures.js
    └── … mN-*.js
```

**Do NOT import across visualizer directories.** Each visualizer is a fully
self-contained app. Copy `kafka-visualizer/components/` files into your new
`components/` directory.

---

## Component API

### `components/module-shell.js` — copy verbatim from kafka-visualizer

```js
// Usage in any module file:
import { createModuleShell, createIQSection, initTabs, initIQ } from '../components/module-shell.js';

// createModuleShell({ tag, title, subtitle, tabs }) → HTML string
// tabs = [{ id: 'foo', label: '📊 Label' }, ...]
// Creates: hero header + tab buttons + tab-content divs with id="tab-{id}"

// createIQSection(IQ) → HTML string
// IQ = [{ q: '...', a: '...', tip: '...' }, ...]
// tip is optional

// After setting container.innerHTML = createModuleShell(...):
// initTabs and initIQ are called by script.js — you don't call them in mount()
```

### `components/canvas-primitives.js` — copy verbatim from kafka-visualizer

```js
import {
  EventPacket, PulseRing, GlowNode, SegmentFill,
  SparkLine, LagBar, drawArrow, drawRoundRect,
  easeInOut, easeCubicOut, easeElasticOut
} from '../components/canvas-primitives.js';

// EventPacket — animated pill traveling a path
new EventPacket({ label, color, path: [{x,y},...], speed, onArrive })

// PulseRing — expanding ring (use on node arrival/event)
new PulseRing({ x, y, color, maxR, duration })

// GlowNode — breathing circle node
new GlowNode({ x, y, r, color, label, active })

// SegmentFill — horizontal fill bar (log segment, progress)
new SegmentFill({ x, y, w, h, color, label })
// segFill.addBytes(0.05) — call each tick

// SparkLine — rolling 60-point line chart
new SparkLine({ x, y, w, h, color, label, maxVal })
// sparkLine.push(value) — call each tick

// LagBar — lag indicator (green→amber→red)
new LagBar({ x, y, w, h, label })
// lagBar.setLag(0.0–1.0); lagBar.update(dt); lagBar.draw(ctx)

// Utility draw helpers
drawArrow(ctx, x1, y1, x2, y2, color, width)
drawRoundRect(ctx, x, y, w, h, r, fillColor, strokeColor)
```

---

## Module file pattern

```js
import { createModuleShell, createIQSection } from '../components/module-shell.js';
// import canvas primitives only if this module has animations

const IQ = [
  {
    q: 'Interview question text?',
    a: 'Full answer — explain mechanisms, not just definitions. Include concrete numbers.',
    tip: 'What distinguishes a good answer from a great one.',  // optional
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M01 · Foundation',          // short tag shown as badge
    title: 'Module Title',
    subtitle: 'What this module covers in one line',
    tabs: [
      { id: 'visual', label: '🎬 Live Demo' },
      { id: 'detail', label: '📋 Details' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildVisual(container);   // returns cancelAnimationFrame fn or null
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;   // MUST return cleanup or null
}

function buildVisual(container) {
  const tab = container.querySelector('#tab-visual');
  const canvas = document.createElement('canvas');
  canvas.width = 820; canvas.height = 420;
  canvas.style.cssText = 'width:100%;max-width:820px';
  tab.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let raf = null, lastT = 0;
  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);  // cap at 50ms
    lastT = ts;
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // ... draw primitives ...
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `...static HTML...`;
}
```

**Rules:**
- `mount()` must always `return cleanup` (a function) or `null`
- Canvas animations: start `requestAnimationFrame`, return a cleanup that cancels it
- Static modules: return `null`
- Never start animations outside a canvas tab — they run even when tab is hidden
- Always `clearRect` + dark background on every frame

---

## script.js pattern

```js
import { MODULES, renderNav, updateProgress } from './components/nav.js';
import { initTabs, initIQ } from './components/module-shell.js';

const done = new Set(JSON.parse(localStorage.getItem('redis-done') || '[]'));
let currentId = null;
let cleanupFn = null;

const LOADERS = {
  m01: () => import('./modules/m01-why-redis.js'),
  m02: () => import('./modules/m02-data-structures.js'),
  // ... one entry per module
};

async function navigate(id) {
  const mod = MODULES.find(m => m.id === id);
  if (!mod) { id = MODULES[0].id; }
  if (currentId === id) return;
  if (cleanupFn) { cleanupFn(); cleanupFn = null; }
  currentId = id;
  renderNav(id, done);

  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) breadcrumb.innerHTML = `${mod.group} &rsaquo; <strong>${mod.label}</strong>`;

  const canvas = document.getElementById('module-canvas');
  canvas.innerHTML = '<div class="coming-soon"><div class="coming-soon-icon">⏳</div><h3>Loading…</h3></div>';
  canvas.scrollTop = 0;

  try {
    const loader = LOADERS[id];
    if (!loader) throw new Error('No loader for ' + id);
    const m = await loader();
    canvas.innerHTML = '';
    cleanupFn = m.mount(canvas) || null;
    initTabs(canvas);
    initIQ(canvas);
    markDone(id);
  } catch (e) {
    console.error('Module load error', e);
    canvas.innerHTML = `<div class="coming-soon"><div class="coming-soon-icon">🚧</div><h3>Coming Soon</h3><p>${mod.desc}</p></div>`;
  }
}

function markDone(id) {
  done.add(id);
  localStorage.setItem('redis-done', JSON.stringify([...done]));
  updateProgress(done);
  renderNav(currentId, done);
}

function getHash() {
  const h = location.hash.slice(1);
  return MODULES.find(m => m.id === h) ? h : MODULES[0].id;
}

window.addEventListener('hashchange', () => navigate(getHash()));
document.getElementById('nav-list').addEventListener('click', e => {
  const item = e.target.closest('.nav-item[data-id]');
  if (item) { e.preventDefault(); location.hash = item.dataset.id; }
});
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});

const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;
const savedTheme = localStorage.getItem('redis-theme') || 'dark';
root.setAttribute('data-theme', savedTheme);
themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('redis-theme', next);
});

renderNav(null, done);
updateProgress(done);
navigate(getHash());
```

Replace `redis` with your topic slug in localStorage keys.

---

## nav.js pattern

```js
export const MODULES = [
  // ── Group Name ──────────────────────────────────────────────────────────
  { id:'m01', label:'Why Redis',        icon:'🔑', group:'Foundation', desc:'In-memory data store origins and use cases' },
  { id:'m02', label:'Data Structures',  icon:'🗂️', group:'Foundation', desc:'String, Hash, List, Set, Sorted Set' },
  // ── Next Group ──────────────────────────────────────────────────────────
  { id:'m03', label:'Architecture',     icon:'🏗️', group:'Internals',  desc:'Single-threaded event loop, IO multiplexing' },
];

const GROUP_ORDER = ['Foundation', 'Internals', 'HA', 'Patterns', 'Operations'];
// Add/rename groups as needed for your topic

export function renderNav(activeId, done) {
  const nav = document.getElementById('nav-list');
  if (!nav) return;
  const groups = {};
  MODULES.forEach(m => {
    if (!groups[m.group]) groups[m.group] = [];
    groups[m.group].push(m);
  });
  nav.innerHTML = GROUP_ORDER.map(g => `
    <div class="nav-group">
      <div class="nav-group-label">${g}</div>
      ${(groups[g] || []).map(m => `
        <a href="#${m.id}" class="nav-item${m.id === activeId ? ' active' : ''}${done.has(m.id) ? ' done' : ''}" data-id="${m.id}">
          <span class="nav-icon">${m.icon}</span>
          <span class="nav-label">${m.label}</span>
          ${done.has(m.id) ? '<span class="nav-check">✓</span>' : ''}
        </a>
      `).join('')}
    </div>
  `).join('');
}

export function updateProgress(done) {
  const fill = document.getElementById('progress-fill');
  const count = document.getElementById('progress-count');
  if (fill) fill.style.width = `${(done.size / MODULES.length) * 100}%`;
  if (count) count.textContent = `${done.size} / ${MODULES.length}`;
}
```

---

## index.html pattern

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redis Visualizer — Amazon ElastiCache Edition</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="app">
    <aside id="sidebar">
      <div class="sidebar-header">
        <div class="brand">
          <span class="brand-icon">🔴</span>
          <div>
            <div class="brand-title">Redis Visualizer</div>
            <div class="brand-sub">Amazon ElastiCache Edition</div>
          </div>
        </div>
        <button id="sidebar-toggle" class="icon-btn" title="Toggle sidebar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="sidebar-progress">
        <div class="progress-label">
          <span>Progress</span>
          <span id="progress-count">0 / 15</span>
        </div>
        <div class="progress-bar"><div id="progress-fill"></div></div>
      </div>
      <nav id="nav-list"></nav>
    </aside>
    <main id="content">
      <div id="module-header">
        <div id="breadcrumb"></div>
        <div class="header-actions">
          <button id="theme-toggle" class="icon-btn" title="Toggle theme">
            <svg id="theme-icon" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1"  x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1"  y1="12" x2="3"  y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
              <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
            </svg>
          </button>
        </div>
      </div>
      <div id="module-canvas"></div>
    </main>
  </div>
  <div id="tooltip" class="tooltip hidden"></div>
  <script type="module" src="script.js"></script>
</body>
</html>
```

---

## CSS — copy kafka-visualizer/styles.css and change accent

The CSS is completely generic. Copy `kafka-visualizer/styles.css` into your new
visualizer's directory. Change the accent color at the top of the file:

```css
:root {
  --accent:  #E53E3E;   /* Redis red — change for your topic */
  --accent2: #FC8181;   /* lighter variant for gradients */
  --accent-lo: rgba(229,62,62,.12); /* low-opacity accent for backgrounds */
}
```

Kafka's accent is `#FF6900` (orange). Databricks also uses `#FF6900`.
Choose a distinct color for the new topic.

---

## CSS classes available for module content

These are safe to use in any module's HTML without adding extra `<style>` tags:

| Class | Purpose |
|---|---|
| `.section-pad` | 32px 40px padding wrapper |
| `.section-header` / `.section-title` / `.section-desc` | Section heading block |
| `.info-grid` | Auto-fill grid of cards |
| `.info-card` / `.info-card-icon` / `.info-card-title` / `.info-card-body` / `.info-card-tag` | Feature card |
| `.compare-table-wrap` / `.compare-table` | Comparison table with hover |
| `.tag-good` / `.tag-warn` / `.tag-bad` | Green / amber / red text in table cells |
| `.config-section` / `.config-grid` / `.config-card` | Config/settings cards |
| `.config-name` / `.config-val` / `.config-desc` / `.config-impact` | Config card fields |
| `.impact-high` / `.impact-medium` / `.impact-low` | Impact level colors |
| `.stats-row` / `.stat-box` / `.stat-val` / `.stat-label` | Key stats row |
| `.code-block` | Dark code block; use `.kw` `.str` `.num` `.cmt` for syntax coloring |
| `.prose` / `.prose h3` / `.prose p` / `.prose ul` | Readable prose text |
| `.iq-list` | IQ accordion list (output of `createIQSection`) |
| `.canvas-wrap` / `.canvas-controls` / `.ctrl-btn` / `.ctrl-label` | Canvas + buttons |
| `.timeline-wrap` / `.timeline-outer` | Horizontal scrollable timeline |
| `.coming-soon` / `.coming-soon-icon` | Placeholder panel |
| `.scroll-content` | 32px 40px padded scroll area |
| `.flow-legend` / `.legend-item` / `.legend-dot` | Canvas legend |

---

## Design principles

1. **Canvas-first for dynamic concepts** — replication, routing, failover,
   data flow all get animated Canvas tabs. Static HTML is fine for reference.

2. **requestAnimationFrame loop pattern**:
   ```js
   let raf = null, lastT = 0;
   function draw(ts) {
     const dt = Math.min((ts - lastT) / 1000, 0.05);
     lastT = ts;
     ctx.fillStyle = '#0A0E1A';
     ctx.fillRect(0, 0, canvas.width, canvas.height);
     // draw...
     raf = requestAnimationFrame(draw);
   }
   raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
   ```

3. **Canvas size**: `width="820" height="420"` with `style="width:100%;max-width:820px"`

4. **Interview Q&A tab**: Every module must have one. Minimum 3 questions at
   senior/staff engineer level (5+ YoE). Format:
   - Q: specific scenario ("Design X for Y requirements")
   - A: structured numbered steps, concrete configs/numbers
   - tip: what distinguishes a good answer from a great one

5. **Business story framing**: Frame every module around a real company's use
   case (Amazon, Netflix, Uber, Shopify). Makes content memorable and
   interview-relevant. Pick one company per visualizer and stick with it.

6. **Color palette for canvas nodes/status**:
   - Primary accent: choose one per topic
   - Success/healthy: `#10B981`
   - Warning: `#F59E0B`
   - Error/dead: `#EF4444`
   - Info: `#3B82F6`
   - Purple/advanced: `#8B5CF6`

7. **No external dependencies** — vanilla JS ES modules only. No React, Vue,
   D3, Chart.js. Everything is Canvas 2D API or DOM.

8. **No `Date.now()` or `Math.random()` at module scope** — only inside
   functions called during `mount()`.

---

## Commit and push pattern

```bash
git add [topic]-visualizer/ .github/workflows/deploy-pages.yml landing/index.html
git commit -m "Add [topic] visualizer — N modules, [Company] Edition"
git push -u origin claude/apache-flink-visualizer-f5tmg5
```

GitHub Actions deploys automatically on push. Takes ~2 min.
Site live at: `https://rajesh-satuluri.github.io/My-Projects/[topic]/`

GitHub Pages is configured to serve from the `gh-pages` branch at `/ (root)`.
The `peaceiris/actions-gh-pages@v4` action creates/updates that branch on every push.

---

## Quick-start checklist

- [ ] Create `[topic]-visualizer/` directory
- [ ] Copy `kafka-visualizer/styles.css` → `[topic]-visualizer/styles.css`, change `--accent`
- [ ] Copy `kafka-visualizer/components/` → `[topic]-visualizer/components/` (all 3 files)
- [ ] Create `[topic]-visualizer/index.html` from the pattern above
- [ ] Create `[topic]-visualizer/components/nav.js` — define `MODULES` array + `GROUP_ORDER`
- [ ] Create `[topic]-visualizer/script.js` — fill in `LOADERS` map + change localStorage key
- [ ] Create `[topic]-visualizer/modules/m01-*.js` … `mN-*.js`
- [ ] Update `.github/workflows/deploy-pages.yml` — add 2 staging lines
- [ ] Update `landing/index.html` — add card to grid, update stat counters
- [ ] `git add`, `git commit`, `git push`
- [ ] Wait ~2 min — open `https://rajesh-satuluri.github.io/My-Projects/[topic]/`

---

## Suggested next visualizer: Redis

| ID  | Label | Group | Canvas? | Amazon angle |
|---|---|---|---|---|
| m01 | Why Redis | Foundation | Timeline | Session caching, leaderboards, ElastiCache |
| m02 | Data Structures | Foundation | Interactive | String, Hash, List, Set, ZSet animated |
| m03 | Architecture | Foundation | Diagram | Single-threaded event loop, IO multiplexing |
| m04 | Persistence (RDB/AOF) | Internals | Canvas | fsync modes, fork-based snapshot |
| m05 | Eviction Policies | Internals | Canvas | LRU/LFU memory fill simulation |
| m06 | Pub/Sub & Streams | Messaging | Canvas | Redis Streams vs Kafka comparison |
| m07 | Replication | HA | Canvas | Primary-replica, partial resync, PSYNC2 |
| m08 | Sentinel | HA | Canvas | Quorum election, failover animation |
| m09 | Cluster Mode | HA | Canvas | Hash slots 0–16383, node sharding |
| m10 | Caching Patterns | Patterns | Cards | Cache-aside, write-through, write-behind |
| m11 | Distributed Locks | Patterns | Canvas | SETNX/Redlock race condition prevention |
| m12 | Rate Limiting | Patterns | Canvas | Token bucket / sliding window |
| m13 | Lua Scripts | Advanced | Code | Atomic operations, script caching |
| m14 | Performance Tuning | Operations | Meters | maxmemory, slowlog, LATENCY DOCTOR |
| m15 | Amazon ElastiCache | Advanced | Diagram | ElastiCache vs self-managed, cluster mode |

Redis accent color: `#E53E3E` (red). Company framing: Amazon (ElastiCache,
Prime Day session management, shopping cart, leaderboards).
