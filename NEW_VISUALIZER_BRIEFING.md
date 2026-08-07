# New Visualizer — Session Briefing

This document gives a new Claude Code session everything it needs to build a
new topic visualizer in the `rajesh-satuluri/My-Projects` repo without
repeating any research or structural work.

---

## Repo and branch

- **Repo**: `rajesh-satuluri/My-Projects`
- **Working branch**: `claude/apache-flink-visualizer-f5tmg5`
- **Never push to main**. All work goes to the branch above.
- Push with: `git push -u origin claude/apache-flink-visualizer-f5tmg5`

---

## Existing structure

```
My-Projects/
├── flink-visualizer/          # Flink visualizer — deployed at site root
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   ├── components/
│   └── modules/
├── kafka-visualizer/          # Kafka visualizer — deployed at /kafka/
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   ├── components/
│   │   ├── nav.js
│   │   ├── module-shell.js
│   │   └── canvas-primitives.js
│   └── modules/
│       ├── m01-intro.js … m22-partition-reassignment.js
└── .github/
    └── workflows/
        └── deploy-pages.yml   # GitHub Actions deploy
```

The new visualizer must be a **separate top-level directory**, e.g.
`redis-visualizer/`, `k8s-visualizer/`, etc.

---

## Deploy workflow — what you must update

File: `.github/workflows/deploy-pages.yml`

Current content:
```yaml
name: Deploy GitHub Pages

on:
  push:
    branches:
      - claude/apache-flink-visualizer-f5tmg5
  workflow_dispatch:

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source branch
        uses: actions/checkout@v4

      - name: Stage site at root
        run: |
          mkdir -p /tmp/site-root
          # Flink visualizer at root (primary)
          cp -r flink-visualizer/. /tmp/site-root/
          # Kafka visualizer in /kafka subdirectory
          mkdir -p /tmp/site-root/kafka
          cp -r kafka-visualizer/. /tmp/site-root/kafka/

      - name: Deploy to gh-pages branch
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: /tmp/site-root
          publish_branch: gh-pages
          force_orphan: true
```

**You must add one block** to the "Stage site at root" step for your new
visualizer. Example for a Redis visualizer:
```yaml
          # Redis visualizer in /redis subdirectory
          mkdir -p /tmp/site-root/redis
          cp -r redis-visualizer/. /tmp/site-root/redis/
```

After adding this, the new visualizer will be live at:
`https://rajesh-satuluri.github.io/My-Projects/[name]/`

---

## Component API — copy and reuse exactly

### `components/module-shell.js`

```js
import { createModuleShell, createIQSection, initTabs, initIQ } from '../components/module-shell.js';

// createModuleShell({ tag, title, subtitle, tabs }) → HTML string
// tabs = [{ id: 'foo', label: '📊 Label' }, ...]
// Creates: hero header + tab buttons + tab-content divs with id="tab-{id}"

// createIQSection(IQ) → HTML string
// IQ = [{ q: '...', a: '...', tip: '...' }, ...]
// tip is optional

// After setting container.innerHTML = createModuleShell(...):
initTabs(canvas);   // wires tab switching
initIQ(canvas);     // wires accordion open/close
```

### `components/canvas-primitives.js`

```js
import { EventPacket, PulseRing, GlowNode, SegmentFill, SparkLine, LagBar, drawArrow, drawRoundRect, easeInOut, easeCubicOut, easeElasticOut } from '../components/canvas-primitives.js';

// EventPacket — animated pill traveling a path
new EventPacket({ label, color, path: [{x,y},...], speed, onArrive })
// path = array of waypoints; onArrive fires when packet reaches last point

// PulseRing — expanding ring (use on node arrival/event)
new PulseRing({ x, y, color, maxR, duration })

// GlowNode — breathing circle node
new GlowNode({ x, y, r, color, label, active })

// SegmentFill — horizontal fill bar (log segment, progress)
new SegmentFill({ x, y, w, h, color, label })
// segFill.addBytes(0.05)  ← call each tick

// SparkLine — rolling 60-point line chart
new SparkLine({ x, y, w, h, color, label, maxVal })
// sparkLine.push(value)   ← call each tick

// LagBar — lag indicator (green→amber→red)
new LagBar({ x, y, w, h, label })
// lagBar.setLag(0.0–1.0)
// lagBar.update(dt)
// lagBar.draw(ctx)

// Utility draw helpers
drawArrow(ctx, x1, y1, x2, y2, color, width)
drawRoundRect(ctx, x, y, w, h, r, fillColor, strokeColor)
```

**Do NOT copy these files into the new visualizer directory.** The new
visualizer is a separate app — you must create its own copies of these
components (or write new ones). The paths `../components/...` won't reach
across visualizer directories.

---

## Module file pattern — exact template

Every module follows this pattern:

```js
import { createModuleShell, createIQSection } from '../components/module-shell.js';
// import canvas primitives only if needed

const IQ = [
  {
    q: 'Interview question text?',
    a: 'Full answer — explain mechanisms, not just definitions.',
    tip: 'Interview tip: what to say to impress.',
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
  return cleanup;   // MUST return cleanup or null — script.js calls this on navigation
}

function buildVisual(container) {
  const tab = container.querySelector('#tab-visual');
  const canvas = document.createElement('canvas');
  // ... setup canvas, requestAnimationFrame loop
  let raf = requestAnimationFrame(draw);
  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildDetail(container) {
  const tab = container.querySelector('#tab-detail');
  tab.innerHTML = `...static HTML...`;
}
```

**Rules:**
- `mount()` must always `return cleanup` (a function) or `null`
- Canvas modules start `requestAnimationFrame` and return a cleanup that cancels it
- Static modules return `null`
- Never start animations outside a canvas tab — they'll run even when tab is hidden
- Always `clearRect` + dark background on every frame: `ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0,0,w,h)`

---

## script.js pattern

```js
import { MODULES, renderNav, updateProgress } from './components/nav.js';
import { initTabs, initIQ } from './components/module-shell.js';

const done = new Set(JSON.parse(localStorage.getItem('[topic]-done') || '[]'));
let currentId = null;
let cleanupFn = null;

const LOADERS = {
  m01: () => import('./modules/m01-intro.js'),
  m02: () => import('./modules/m02-foo.js'),
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
  localStorage.setItem('[topic]-done', JSON.stringify([...done]));
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
const savedTheme = localStorage.getItem('[topic]-theme') || 'dark';
root.setAttribute('data-theme', savedTheme);
themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('[topic]-theme', next);
});

renderNav(null, done);
updateProgress(done);
navigate(getHash());
```

Replace `[topic]` with your topic slug (e.g. `redis`, `k8s`).

---

## nav.js pattern

```js
export const MODULES = [
  // ── Group Name ──────────────────────────────────────────────────────────
  { id:'m01', label:'Module Name', icon:'🔑', group:'Foundation', desc:'One-line description' },
  { id:'m02', label:'...',         icon:'...',  group:'Foundation', desc:'...' },
  // ── Next Group ──────────────────────────────────────────────────────────
  { id:'m03', label:'...',         icon:'...',  group:'Internals',  desc:'...' },
];

const GROUP_ORDER = ['Foundation', 'Internals', 'Operations', 'Advanced'];

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
  <title>[Topic] Visualizer — Amazon Edition</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="app">
    <aside id="sidebar">
      <div class="sidebar-header">
        <div class="brand">
          <span class="brand-icon">[ICON]</span>
          <div>
            <div class="brand-title">[Topic] Visualizer</div>
            <div class="brand-sub">Amazon Edition</div>
          </div>
        </div>
        <button id="sidebar-toggle" class="icon-btn" title="Toggle sidebar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="sidebar-progress">
        <div class="progress-label">
          <span>Progress</span>
          <span id="progress-count">0 / [N]</span>
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
            <svg id="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
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

Replace `[Topic]`, `[ICON]`, `[N]` (total module count). The HTML structure
is identical across all visualizers — only the title, brand text, icon, and
progress count change.

---

## CSS — copy kafka-visualizer/styles.css verbatim

The CSS is completely generic. Copy `kafka-visualizer/styles.css` into your
new visualizer directory unchanged. The only thing topic-specific is the
accent color. In Kafka it is `#FF6900` (orange). You may override it in one
place at the top of the file:

```css
:root {
  --accent: #YOUR_COLOR;   /* e.g. #E53E3E for Redis red */
}
```

Then do a find-replace of `#FF6900` → `var(--accent)` if you want
theme-aware accent control. This is optional — a straight color swap on the
copy works fine.

---

## Design principles

These were established across Kafka and Flink visualizers. Follow them:

1. **Canvas-first for dynamic concepts** — replication, routing, failover,
   data flow all get animated Canvas tabs. Static SVG is fine for
   diagrams that don't need motion.

2. **requestAnimationFrame loop pattern**:
   ```js
   let raf = null, lastT = 0;
   function draw(ts) {
     const dt = Math.min((ts - lastT) / 1000, 0.05);  // cap at 50ms
     lastT = ts;
     ctx.clearRect(0, 0, canvas.width, canvas.height);
     ctx.fillStyle = '#0A0E1A';
     ctx.fillRect(0, 0, canvas.width, canvas.height);
     // ... draw ...
     raf = requestAnimationFrame(draw);
   }
   raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
   ```
   Always cap `dt` at 0.05 so tab-switching doesn't cause a huge jump.

3. **Canvas size**: `width="820" height="420"` with `style="width:100%;max-width:820px"` — this scales on mobile.

4. **Control buttons**: Use `.ctrl-btn` class, put inside `.canvas-controls` div below canvas. Example:
   ```html
   <div class="canvas-controls">
     <button class="ctrl-btn" id="my-btn">▶ Start</button>
     <span class="ctrl-label">Descriptive hint for the user</span>
   </div>
   ```

5. **Interview Q&A tab**: Every module must have one. Minimum 3 questions.
   Target senior/staff engineer level (5+ YoE). Format:
   - Q: specific scenario ("Design X for Y requirements")
   - A: structured numbered steps, concrete configs/numbers, no vague answers
   - tip: "interview tip" — what distinguishes a good answer from great

6. **Amazon business story**: Frame every module around Amazon use cases.
   Examples: Prime Day traffic, fraud detection, recommendations, fulfillment.
   This was a deliberate theme of the Kafka visualizer and should continue.

7. **Color palette for nodes/status**:
   - Primary accent: pick one per topic (Kafka=`#FF6900`, Flink=`#E6522C`, Redis=`#E53E3E`)
   - Success/healthy: `#10B981`
   - Warning/lag: `#F59E0B`
   - Error/dead: `#EF4444`
   - Info/secondary: `#3B82F6`
   - Purple/advanced: `#8B5CF6`

8. **Info cards** (for non-canvas content):
   ```html
   <div class="info-grid">
     <div class="info-card" style="border-left:3px solid #COLOR">
       <div class="info-card-title">Title</div>
       <div class="info-card-tag" style="color:#COLOR;background:#COLOR22">tag</div>
       <div class="info-card-body">Body text</div>
     </div>
   </div>
   ```

9. **Comparison tables**:
   ```html
   <div class="compare-table-wrap">
     <table class="compare-table" style="font-size:11px">...</table>
   </div>
   ```

10. **No external dependencies** — vanilla JS ES modules only.
    No React, Vue, D3, Chart.js. Everything is Canvas 2D or DOM.

---

## What NOT to do (save time)

- Do NOT read/explore the Kafka or Flink visualizer source files — the
  patterns you need are fully documented in this briefing.
- Do NOT modify `kafka-visualizer/` or `flink-visualizer/` directories.
- Do NOT create a `gh-pages` branch manually — the workflow does it.
- Do NOT run `npm install` or any build step — this is zero-build vanilla JS.
- Do NOT add TypeScript, bundlers, or transpilers.
- Do NOT copy canvas-primitives.js from kafka-visualizer and import it from
  there — paths won't work. Either copy it into your new visualizer's
  `components/` folder, or rewrite equivalents.
- Do NOT use `Date.now()` or `Math.random()` in module-level code that runs
  at import time — only inside functions called during `mount()`.

---

## Suggested: Redis Visualizer module list

If building a Redis visualizer, here is a suggested 15-module structure with
groups and Amazon use cases:

| ID  | Label                  | Group        | Canvas? | Amazon angle |
|-----|------------------------|--------------|---------|--------------|
| m01 | Why Redis              | Foundation   | Timeline | LinkedIn/Twitter origins, in-memory story |
| m02 | Data Structures        | Foundation   | Interactive | String, Hash, List, Set, ZSet — animated |
| m03 | Architecture           | Foundation   | Diagram | Single-threaded event loop, IO multiplexing |
| m04 | Persistence (RDB/AOF)  | Internals    | Canvas  | fsync modes, fork-based snapshot |
| m05 | Eviction Policies      | Internals    | Canvas  | LRU/LFU/allkeys/volatile — memory fill sim |
| m06 | Pub/Sub & Streams      | Messaging    | Canvas  | Redis Streams vs Kafka (Amazon comparison) |
| m07 | Replication            | HA           | Canvas  | Primary-replica, partial resync, PSYNC2 |
| m08 | Sentinel               | HA           | Canvas  | Quorum election, failover animation |
| m09 | Cluster Mode           | HA           | Canvas  | Hash slots 0–16383, node sharding |
| m10 | Caching Patterns       | Patterns     | Cards   | Cache-aside, write-through, write-behind |
| m11 | Distributed Locks      | Patterns     | Canvas  | SETNX/Redlock — race condition prevention |
| m12 | Rate Limiting          | Patterns     | Canvas  | Token bucket / sliding window with Redis |
| m13 | Lua Scripts            | Advanced     | Code    | Atomic operations, script caching |
| m14 | Performance Tuning     | Operations   | Meters  | maxmemory, slowlog, LATENCY DOCTOR |
| m15 | Amazon ElastiCache     | Advanced     | Diagram | ElastiCache Redis vs self-managed, cluster mode |

---

## Commit and push pattern

```bash
git add [new-visualizer-dir]/ .github/workflows/deploy-pages.yml
git commit -m "Add [topic] visualizer — [N] modules, Amazon Edition"
git push -u origin claude/apache-flink-visualizer-f5tmg5
```

GitHub Actions deploys automatically on push to this branch.
Deploy takes ~1–2 minutes. Site will be live at:
`https://rajesh-satuluri.github.io/My-Projects/[topic]/`

---

## Quick-start checklist for the new session

- [ ] Read only this file — no other files needed before starting
- [ ] Create `[topic]-visualizer/` directory
- [ ] Copy `kafka-visualizer/styles.css` → `[topic]-visualizer/styles.css`, change accent color
- [ ] Create `[topic]-visualizer/index.html` from the pattern above
- [ ] Create `[topic]-visualizer/components/nav.js` from the pattern above
- [ ] Create `[topic]-visualizer/components/module-shell.js` — copy exact content from kafka (it's generic)
- [ ] Create `[topic]-visualizer/components/canvas-primitives.js` — copy exact content from kafka (it's generic)
- [ ] Create `[topic]-visualizer/script.js` from the pattern above
- [ ] Create `[topic]-visualizer/modules/m01-*.js` … `mN-*.js`
- [ ] Update `.github/workflows/deploy-pages.yml` — add 2 lines to staging step
- [ ] `git add`, `git commit`, `git push`
- [ ] Wait ~2 min — confirm site is live
