# Delta Lake Visualizer — Complete Build Spec & Prompt

> **Purpose of this file.** Hand this entire file to a fresh Claude Code (or any capable coding
> agent) session as the build brief. It contains (1) a copy‑paste **master build prompt**, and
> (2) the exact architecture, conventions, module list, data shapes, verification harness, and
> deploy steps needed to produce a **Delta Lake Visualizer** that is a 1:1 structural twin of the
> existing **Apache Iceberg Visualizer** in this repo (`iceberg-visualizer/`), with every piece of
> content re-authored for Delta Lake's transaction‑log model.
>
> The Iceberg app is the **reference implementation**. When in doubt about *how* something should
> work (router, animation engine, controls bar, theming, nav, modals, verify scripts), open the
> corresponding file under `iceberg-visualizer/` and mirror it. This spec tells you *what to change*.

---

## 0. TL;DR — what you are building

A vanilla **HTML/CSS/JS** single-page app (no build step, no framework) called the **Delta Lake
Visualizer** ("DeltaViz"). It teaches Delta Lake the same way IcebergViz teaches Iceberg:
animation-driven, step-by-step visualizations of the table format's internals, wrapped in a
polished sidebar/topbar shell with a hash router, deep links, a bottom animation-controls bar, a
command palette, per-module quizzes, an interview mode, a study deck, and cheat sheets.

- **Folder:** new top-level folder `delta-lake-visualizer/` (sibling of `iceberg-visualizer/`).
- **Deploy path:** `https://<user>.github.io/My-Projects/delta/` (add a `delta` card to the root portfolio).
- **Global namespace:** `window.DeltaViz` (alias `DV`). Everywhere IcebergViz uses `IV`/`IcebergViz`,
  Delta uses `DV`/`DeltaViz`. Every `localStorage` key prefix `iv-` becomes `dv-`.
- **Brand accent:** a **Delta red→amber** gradient (distinct from Iceberg's blue→purple) so the two
  apps are visually siblings, not clones. See §6.
- **Narrative:** reuse the same fictional company, **ShopKart Global E‑Commerce**, so both tools live
  in one universe and interview answers stay consistent. Re-cast every scenario in Delta terms.

**Absolute constraints (do not violate):**
1. Build **only** inside `delta-lake-visualizer/`. Do **not** modify any other project folder. The
   one shared file you may touch is the deploy workflow (§9) — and only additively.
2. **Never** break an animation's layout. Animation module roots use
   `display:flex; flex-direction:column; height:100%; overflow:hidden`. Never inject scrolling
   content as a flex child of that root. Per-module quizzes live in a **modal appended to `<body>`**,
   never injected into the module DOM. (This is the #1 mistake made on IcebergViz — see §8.)
3. No external runtime dependencies. All CSS/JS is local and inlined via `<script>`/`<link>` tags.
   The only dev dependency is Playwright (for the verify scripts).

---

## 1. Master build prompt (copy-paste this)

> Build a **Delta Lake Visualizer** — a vanilla HTML/CSS/JS single-page app (no framework, no build
> step) that teaches Apache Delta Lake through animation-driven, step-by-step visualizations. It must
> be a structural twin of the existing `iceberg-visualizer/` app in this repo: same app shell
> (collapsible sidebar with grouped nav + search, topbar with theme toggle + contextual quiz button +
> shortcuts + docs link, bottom animation-controls bar), same hash router with deep links
> (`#screen` and `#screen/step`) and last-screen resume, same self-registering module pattern, same
> reusable `AnimationEngine`, same command palette, progress meter, first-run tour, keyboard
> shortcuts, and the same modal-based "Test Yourself" per-module quiz. Reuse the Iceberg app's file
> layout, CSS token system, and verification scripts verbatim in structure; only the content and the
> brand accent change.
>
> Put everything in a new top-level folder `delta-lake-visualizer/`. Use the global namespace
> `window.DeltaViz` (alias `DV`) and the `localStorage` prefix `dv-`. Set the brand accent to a Delta
> red→amber gradient so it reads as a sibling of the blue Iceberg app. Keep the fictional company
> **ShopKart Global E‑Commerce** as the running narrative, re-cast for Delta Lake.
>
> Re-author 100% of the teaching content for **Delta Lake's transaction-log model**: the `_delta_log`
> ordered JSON commits + Parquet checkpoints, Add/Remove file actions, protocol/metaData actions,
> data skipping via per-file stats in the log, optimistic concurrency control, OPTIMIZE (bin-packing)
> + Z-ordering + Liquid Clustering, VACUUM, deletion vectors (merge-on-read), time travel by
> version/timestamp, schema evolution, generated columns, Change Data Feed, and engine
> integrations. The module list is in the spec (§4). Every animated module drives its SVG through the
> shared `AnimationEngine` and registers with `DV.AnimationControls`.
>
> Hard rules: (1) only touch `delta-lake-visualizer/` plus the deploy workflow additively; (2) never
> inject scrolling content into an animation module's `height:100%; overflow:hidden` flex root — the
> quiz is a body-level modal; (3) no external runtime deps. Port the two Playwright verification
> scripts (`verify.mjs`, `verify-animations.mjs`) and the syntax gate (`check-syntax.mjs`) and make
> all of them pass before you consider it done. Follow the detailed spec below for module contracts,
> data shapes, tokens, and acceptance criteria.

---

## 2. Reference architecture (mirror this exactly)

The Iceberg app is the source of truth for *mechanism*. Read these files and reproduce their
behavior with Delta content:

| Concern | Reference file | What to do |
|---|---|---|
| App shell / HTML skeleton | `iceberg-visualizer/index.html` | Copy structure; rename brand, title, meta, script list; swap `IcebergViz`→`DeltaViz`; retitle shortcut hints. |
| Router + nav registry + bootstrap | `js/app.js` | Copy verbatim, rename `IV`→`DV`, replace `NAV_GROUPS` (§4) and localStorage keys (`iv-`→`dv-`). |
| Animation engine | `js/core/animation-engine.js` | Copy **verbatim** (only the namespace line at bottom changes). It is content-agnostic. |
| Controls bar wiring | `js/components/animation-controls.js` | Copy verbatim; rename namespace + `_syncStepToUrl` ref. |
| Tooltip / keyboard / toast | `js/core/*.js` | Copy verbatim; rename namespace + `g h`/`g w`/`g a`/`g m` shortcut targets to Delta screens. |
| Code viewer | `js/components/code-viewer.js` | Copy verbatim (syntax highlighter is generic). |
| Command palette | `js/features/command-palette.js` | Copy verbatim; it reads `DV.getScreens()`. |
| Progress meter | `js/features/progress.js` | Copy verbatim; rename keys. |
| First-run tour | `js/features/tour.js` | Copy structure; rewrite copy for Delta; rename `iv-tour-done`→`dv-tour-done`. |
| Gestures | `js/features/gestures.js` | Copy verbatim. |
| Test-Yourself modal | `js/features/test-yourself.js` | Copy verbatim; reads `DV.QuestionBank[id]`, keys `dv-quiz-<id>`. |
| CSS design system | `css/main.css` | Copy tokens; swap the brand block (§6). |
| Layout / components / animations / responsive / enhancements / print | `css/*.css` | Copy; rename `.iv-*` helper classes to `.dv-*`; keep everything else. |
| Verify harness | `scripts/verify.mjs`, `scripts/verify-animations.mjs`, `scripts/check-syntax.mjs` | Copy; update screen lists + the "no bank" test screen (§7). |

### 2.1 The module contract (identical to Iceberg)

Every screen is a self-registering module. Module files end with:

```js
window.DeltaViz = window.DeltaViz || {};
window.DeltaViz.modules = window.DeltaViz.modules || {};
window.DeltaViz.modules['<id>'] = mod;
```

where `mod` is:

```js
const mod = {
  id: 'read-path',           // matches the nav id and the URL hash
  title: 'Read Path',
  group: 'read-ops',
  _engine: null,             // animated modules hold their engine here
  render(container) { /* build DOM into container; wire engine; register controls */ },
  destroy() { /* engine.destroy(); AnimationControls.hide(); remove injected <style> */ },
};
```

- `render(container)` receives `#module-container`. It must set `container.innerHTML=''` first, build
  its own DOM, and (if animated) create an `AnimationEngine`, wire a step sidebar, and call
  `DV.AnimationControls.register(engine)`.
- The **module root element** gets classes `<prefix>-page page-enter`. For an **animated** module the
  root is `display:flex; flex-direction:column; height:100%; overflow:hidden`; for a **static/reading**
  module it scrolls (the shell's bridge CSS `#module-container > .page-enter { height:100%;
  overflow-y:auto }` handles this).
- `destroy()` must tear down the engine, hide the controls bar, and remove any injected `<style id>`.
- Each module injects its own scoped CSS once via `<style id="<prefix>-styles">` and guards with
  `if (document.getElementById('<prefix>-styles')) return;`.
- Use a **unique 2–4 letter prefix per module** for ids/classes (Iceberg uses `rp-` for read-path,
  `me-` for metadata-explorer, etc.). Keep the same prefixes where a module maps 1:1; invent new ones
  for new Delta modules (e.g. `tl-` transaction-log, `cp-`… careful, `cp-` is command palette — use
  `cx-` for checkpoint-explorer, `dv-`… reserved for global helpers, so use module-specific prefixes).

### 2.2 The AnimationEngine (content-agnostic — copy verbatim)

`new DV.AnimationEngine({ steps })` where each step is `{ label, description, duration, enter(ctx),
exit(ctx) }`. Helpers: `AE.fnStep(label, desc, enter, exit, duration)` and
`AE.classStep(...)`. Methods: `play/pause/reset/next/prev/goto(i)/setSpeed(s)/destroy()`;
events via `engine.on('stepchange', fn)` and `'statechange'`. `enter`/`exit` mutate the module's SVG
(show/hide/glow elements). **This file does not change** except the namespace assignment at the
bottom. Delta animation semantics live entirely in each module's `enter`/`exit` callbacks.

### 2.3 Decoupling bus

`document.dispatchEvent(new CustomEvent('app:navigate', { detail:{ id } }))` fires on every
navigation. Features (progress, test-yourself button sync, tour) listen on it. Do not couple modules
to features directly. Accessors on `DV`: `getScreens()`, `getNavGroups()`, `currentScreenId()`,
`navigate(id, step)`, `_syncStepToUrl(i)`, `_openQuiz`/`_closeQuiz`, `_showShortcutsModal`,
`_closeDrawer`.

---

## 3. Iceberg → Delta concept translation map

Use this to re-author content. The **left** is what the Iceberg module teaches; the **right** is the
Delta equivalent to teach in the twin module.

| Concept | Iceberg | Delta Lake |
|---|---|---|
| Table format core | Metadata tree on object storage | **Transaction log** (`_delta_log/`) on object storage |
| Root pointer | `metadata.json` (via catalog) | Latest committed version = highest-numbered JSON in `_delta_log` (via catalog) |
| Commit unit | New `metadata.json` + snapshot | Ordered JSON commit file `00000000000000000000.json`, `...0001.json`, … (one per version) |
| What a commit contains | Snapshot → manifest list → manifests | **Actions**: `protocol`, `metaData`, `add` (AddFile), `remove` (RemoveFile), `commitInfo`, `cdc` |
| File tracking | Manifest files list data files + stats | `add`/`remove` actions in the log carry path, partitionValues, size, and per-column **stats** (min/max/nullCount) |
| Read acceleration | Manifest/partition pruning + column stats | **Log replay** to reconstruct current file set + **data skipping** from file stats + partition pruning |
| Compaction of metadata | (rewrite metadata) | **Checkpoint** Parquet file every N commits (default 10) → readers replay from last checkpoint, not version 0 |
| Snapshots / history | Snapshots | **Table versions** (monotonic version numbers) + timestamps |
| Time travel | `VERSION AS OF` / snapshot id | `VERSION AS OF n` / `TIMESTAMP AS OF t` |
| Delete strategy | Positional/equality delete files (MoR) | **Deletion vectors** (merge-on-read) or copy-on-write rewrite |
| Update/Merge | MERGE INTO, UPDATE, DELETE | Same SQL surface; mechanics = rewrite files or write deletion vectors + new adds |
| Overwrite | INSERT OVERWRITE (partition) | `INSERT OVERWRITE` / `replaceWhere` predicate overwrite |
| Schema evolution | Add/rename/reorder columns, safe | `ALTER TABLE`, `mergeSchema`, column mapping (id/name mode) |
| Partitioning | **Hidden partitioning** + transforms | Explicit partition columns + **generated columns**; and **Liquid Clustering** (no physical partitions) |
| Partition change | Partition evolution | **Liquid Clustering** re-clustering (Delta's modern answer) / repartition-on-write |
| Layout optimization | (compaction/sorting) | **OPTIMIZE** (bin-packing) + **Z-ORDER BY** + Liquid Clustering |
| Cleanup | Expire snapshots / remove orphan | **VACUUM** (removes files no longer referenced past retention) |
| Concurrency | Optimistic, snapshot isolation | **Optimistic concurrency control** — conflict detection on commit, retry; serializable/WriteSerializable |
| Catalog | Hive/Glue/REST/Nessie | Hive metastore / **Unity Catalog** / path-based |
| Change tracking | (incremental via snapshots) | **Change Data Feed (CDF)** — `_change_data/` + `cdc` actions |
| Interop | — | **Delta UniForm** (expose Delta as Iceberg/Hudi metadata) — nice "advanced" bonus module |
| Protocol | format-version | **protocol** action: reader/writer versions + **table features** |

### ShopKart incidents, recast for Delta

Reuse the same incident framing from `iceberg-visualizer/js/data/shopkart-data.js` but resolve each
with the Delta mechanism:

- *Black Friday concurrent-write corruption* → resolved by Delta's **optimistic concurrency control +
  atomic log commit** (a losing writer detects the conflict and retries; no partial state is ever read).
- *11-hour schema-change outage* → resolved by Delta **`ALTER TABLE ADD COLUMN`** (metadata-only,
  milliseconds; readers use column mapping).
- Add a Delta-flavored one: *"Slow dashboards from millions of tiny files"* → resolved by **OPTIMIZE
  bin-packing + Z-ORDER**, and *"reader latency creeping up as history grows"* → resolved by
  **checkpoints** so readers replay from the last checkpoint instead of version 0.

---

## 4. Navigation registry (`NAV_GROUPS` for Delta)

Replace Iceberg's `NAV_GROUPS` in `app.js` with this. IDs are also the module ids and URL hashes.
Keep the icon names (they exist in `_navIcon`); add new path entries to `_navIcon` for any new icon.

```js
const NAV_GROUPS = [
  {
    id: 'start', label: 'Get Started',
    items: [
      { id: 'home',            label: 'Home',                icon: 'home',    available: true },
      { id: 'why-delta',       label: 'Why Delta Lake?',     icon: 'shield',  available: true },
      { id: 'architecture',    label: 'Architecture',        icon: 'layers',  available: true },
      { id: 'log-explorer',    label: 'Transaction Log',     icon: 'folder',  available: true },
    ],
  },
  {
    id: 'write-ops', label: 'Write Operations',
    items: [
      { id: 'create-table', label: 'CREATE TABLE',    icon: 'table-plus', available: true },
      { id: 'insert',       label: 'INSERT / APPEND', icon: 'arrow-down', available: true },
      { id: 'update',       label: 'UPDATE',          icon: 'pencil',     available: true },
      { id: 'delete',       label: 'DELETE',          icon: 'trash',      available: true },
      { id: 'merge',        label: 'MERGE INTO',      icon: 'merge',      available: true },
      { id: 'overwrite',    label: 'replaceWhere',    icon: 'refresh',    available: true },
    ],
  },
  {
    id: 'read-ops', label: 'Read & Query',
    items: [
      { id: 'read-path',     label: 'Read Path (Log Replay)', icon: 'search', available: true },
      { id: 'write-path',    label: 'Write Path (Commit)',    icon: 'edit',   available: true },
      { id: 'query-planner', label: 'Query Planner',          icon: 'cpu',    available: true },
      { id: 'time-travel',   label: 'Time Travel',            icon: 'clock',  available: true },
    ],
  },
  {
    id: 'log', label: 'Log & Schema',
    items: [
      { id: 'version-explorer',  label: 'Version History',   icon: 'camera',     available: true },
      { id: 'commit-explorer',   label: 'Commit Explorer',   icon: 'list',       available: true },
      { id: 'checkpoint',        label: 'Checkpoints',       icon: 'book',       available: true },
      { id: 'schema-evolution',  label: 'Schema Evolution',  icon: 'columns',    available: true },
      { id: 'partitioning',      label: 'Partitioning & Generated Cols', icon: 'filter', available: true },
      { id: 'liquid-clustering', label: 'Liquid Clustering', icon: 'git-branch', available: true },
    ],
  },
  {
    id: 'advanced', label: 'Advanced Topics',
    items: [
      { id: 'concurrency',        label: 'Concurrency (OCC)',    icon: 'users', available: true },
      { id: 'deletion-vectors',   label: 'Deletion Vectors',     icon: 'trash', available: true },
      { id: 'optimize',           label: 'OPTIMIZE & Z-Order',   icon: 'zap',   available: true },
      { id: 'vacuum',             label: 'VACUUM',               icon: 'tool',  available: true },
      { id: 'change-data-feed',   label: 'Change Data Feed',     icon: 'refresh', available: true },
      { id: 'engine-integrations',label: 'Engine Integrations',  icon: 'link',  available: true },
    ],
  },
  {
    id: 'learn', label: 'Learn & Practice',
    items: [
      { id: 'interview',  label: 'Interview Mode', icon: 'message-square', available: true },
      { id: 'quiz',       label: 'Quiz Mode',      icon: 'check-square',   available: true },
      { id: 'study',      label: 'Study Deck',     icon: 'book',           available: true },
      { id: 'cheatsheet', label: 'Cheat Sheets',   icon: 'file-text',      available: true },
    ],
  },
];
```

**Optional bonus module** (add if time permits): `uniform` — "Delta UniForm" showing Delta metadata
being exposed as Iceberg/Hudi, a nice cross-link back to the Iceberg app.

### 4.1 Which modules are animated vs. static

- **Animated** (build an SVG + `AnimationEngine` step sequence, root is flex/overflow-hidden, register
  controls): `architecture`, `create-table`, `insert`, `update`, `delete`, `merge`, `overwrite`,
  `read-path`, `write-path`, `query-planner`, `time-travel`, `version-explorer`, `commit-explorer`,
  `checkpoint`, `schema-evolution`, `partitioning`, `liquid-clustering`, `concurrency`,
  `deletion-vectors`, `optimize`, `vacuum`, `change-data-feed`.
- **Static / reading / interactive-but-not-timeline**: `home`, `why-delta`, `log-explorer` (tree
  explorer like Iceberg's metadata-explorer), `engine-integrations`, `interview`, `quiz`, `study`,
  `cheatsheet`. (`log-explorer` can be an interactive click-to-expand tree — not a timeline animation.)

Match the animated/static split of the Iceberg twin where a module maps 1:1 (e.g. `read-path`,
`write-path`, `time-travel`, `schema-evolution`, `concurrency` are animated in both).

---

## 5. Per-module content briefs (Delta)

Each animated module = an SVG diagram + a step sidebar + an `AnimationEngine` sequence of ~6–8 steps,
each with a `{ label, desc }` narration (the `desc` is data-rich, ShopKart-flavored, like the Iceberg
read-path example). Keep numbers concrete and internally consistent (reuse ShopKart's 20M orders/day,
30 countries, 6 PB history, 24,000 files / 38.4 TB table).

- **home** — landing hub. Hero (Delta red→amber), "what you'll learn" cards linking to modules,
  ShopKart context, progress. Mirror `home.js`.
- **why-delta** — the problem Delta solves over plain Parquet-on-object-storage: ACID via the log,
  schema evolution, time travel, data skipping. Recast the 3 ShopKart incidents. Mirror `why-iceberg.js`.
- **architecture** — animate the layered model: query engine → catalog/path → `_delta_log` (ordered
  JSON commits + checkpoints) → Parquet data files. Highlight each layer in turn.
- **log-explorer** — interactive tree of `_delta_log/`: `00000000000000000000.json`,
  `...0001.json`, …, `...0010.checkpoint.parquet`, `_last_checkpoint`. Click a commit to expand its
  actions (`protocol`, `metaData`, `add`, `remove`, `commitInfo`). Mirror `metadata-explorer.js`.
- **create-table** — animate: write `protocol` + `metaData` actions → version 0 commit → empty table.
- **insert** — append: write new Parquet files → `add` actions in a new commit → version bumps.
- **update** — show copy-on-write (rewrite touched files: `remove` old + `add` new) *and* mention the
  merge-on-read deletion-vector path (cross-link to `deletion-vectors`).
- **delete** — same two strategies; animate `remove` actions / deletion-vector marking.
- **merge** — MERGE INTO (upsert): matched → update, not matched → insert; show the resulting
  add/remove actions in one atomic commit.
- **overwrite** — `replaceWhere('country = "BR"')`: only matching files removed + replaced, rest
  untouched; contrast with full overwrite.
- **read-path** — the star module. Animate: query → resolve latest version → **replay log from last
  checkpoint** to build current file set → **data skipping** using per-file min/max stats → partition
  pruning → column projection → parallel read → results. Reuse ShopKart's Brazil-2024 query and the
  98.7% skip framing, but the pruning source is **log stats**, not manifests.
- **write-path** — the commit protocol: stage files → attempt commit at version N → optimistic
  conflict check → atomic rename/put of `N.json` → success (or retry on conflict).
- **query-planner** — predicate pushdown + file-level stat pruning from the log; show files
  eliminated by min/max before any data read.
- **time-travel** — `VERSION AS OF` and `TIMESTAMP AS OF`: point the reader at an older version by
  replaying the log up to version k; show the file set differing across versions.
- **version-explorer** — timeline of table versions (like Iceberg snapshot-explorer): each version's
  operation, timestamp, added/removed files, cumulative row count. Click to inspect.
- **commit-explorer** — deep-dive into a single JSON commit file: pretty-print its action objects
  (`add` with `stats`, `remove` with `deletionTimestamp`, `commitInfo` with `operationMetrics`).
- **checkpoint** — animate why checkpoints exist: as commits pile up, a reader would replay N JSON
  files; at version 10 a `.checkpoint.parquet` snapshots cumulative state so readers start there +
  replay only the tail. Show `_last_checkpoint`.
- **schema-evolution** — add/rename/reorder columns via metadata-only `metaData` action + column
  mapping; `mergeSchema` on write. No data rewrite.
- **partitioning** — physical partition columns + **generated columns** (e.g. `date GENERATED ALWAYS
  AS (CAST(ts AS DATE))`); show partition pruning.
- **liquid-clustering** — Delta's modern alternative to fixed partitions: cluster keys, incremental
  re-clustering on OPTIMIZE, no small-file/skew problems of physical partitions.
- **concurrency** — two ShopKart writers commit simultaneously; optimistic concurrency control detects
  the conflict at commit time, one retries against the new version; isolation levels
  (Serializable vs WriteSerializable).
- **deletion-vectors** — merge-on-read deletes: mark rows in a deletion vector bitmap instead of
  rewriting files; readers apply the DV; later OPTIMIZE materializes.
- **optimize** — bin-packing small files into right-sized files (`remove` many + `add` few) and
  `ZORDER BY (country, order_date)` for multi-dimensional data skipping; before/after skip rates.
- **vacuum** — remove data files no longer referenced by any version past the retention window
  (default 7 days); show the danger of vacuuming too aggressively vs time travel.
- **change-data-feed** — CDF: enable `delta.enableChangeDataFeed`; reads of row-level
  inserts/updates/deletes between versions via `_change_data/` + `cdc` actions.
- **engine-integrations** — Spark, Databricks, Trino/Presto, Flink, DuckDB, Polars, delta-rs
  (Rust/Python) reading/writing Delta; a matrix of capabilities. Mirror `engine-integrations.js`.
- **interview / quiz / study / cheatsheet** — see §7.

---

## 6. Brand & theming (the only visual change)

Copy `css/main.css` tokens verbatim, then replace the **brand block** so Delta reads as a sibling of
Iceberg (blue→purple) with a **red→amber** identity:

```css
/* Delta brand — replaces the Iceberg brand block */
:root {
  --delta: #ff5a3c;                 /* delta red-orange */
  --delta-dark: #d23b1f;
  --delta-glow: rgba(255, 90, 60, 0.3);
  --delta-gradient: linear-gradient(135deg, #ff5a3c 0%, #ffb020 100%);   /* red → amber */
  --delta-gradient-cool: linear-gradient(135deg, #ff5a3c 0%, #a371f7 100%);
}
```

- Global find/replace intent: `--iceberg*` token names → `--delta*` (and update every consumer). The
  generic accent tokens (`--blue`, `--green`, `--red`, etc.) stay — animations still use blue/green/
  orange for state; only the **brand** (logo gradient, hero, progress fill, active glow) becomes Delta
  red→amber.
- Sidebar brand: name **"DeltaViz"**, tagline **"ShopKart Handbook"**. Replace the iceberg-triangle
  logo SVG with a **Delta (Δ) triangle** built from the `--delta-gradient` (a filled upward triangle
  with a horizontal "log line" through it echoes both a delta and stacked commits).
- `<title>`: `Delta Lake Visualizer — ShopKart Engineering Handbook`. Update `<meta>` description,
  OG/Twitter tags, `theme-color` (`#ff5a3c` reads well on dark), and the docs link href to
  `https://docs.delta.io/latest/index.html`.
- Keep the **full light-theme** token block (`:root[data-theme="light"]`) and the
  `prefers-color-scheme` fallback — Iceberg has both; port them. Theme toggle persists to `dv-theme`;
  the no-flash inline `<script>` in `<head>` reads `dv-theme`.
- Icons/PWA: generate a new favicon/og set (`scripts/gen-assets.mjs` exists in Iceberg — port it and
  swap the gradient) or reuse simple placeholder icons. Update `manifest.json` name/colors.

---

## 7. Data layer & learn modules

### 7.1 `js/data/shopkart-data.js`
Port `DeltaViz.Data` from the Iceberg file; keep the company stats; **recast every `resolution`
field** to the Delta mechanism (log/OCC/OPTIMIZE/checkpoint). Keep JSON/SQL examples but rewrite them
as Delta (e.g. `_delta_log` action JSON, `MERGE`, `OPTIMIZE ... ZORDER BY`, `VACUUM`, `DESCRIBE
HISTORY`, `SELECT ... VERSION AS OF`).

### 7.2 `js/data/delta-concepts.js` (was `iceberg-concepts.js`)
Port the concept glossary; re-author entries for Delta terms (transaction log, checkpoint, deletion
vector, OCC, Z-order, liquid clustering, CDF, generated column, protocol/table features, etc.).

### 7.3 `js/data/question-bank.js`
`DeltaViz.QuestionBank[screenId] = [{ q, options, correct, explanation, difficulty }]` where
`difficulty ∈ 'basic'|'intermediate'|'advanced'`. Provide banks for **most** screens (Iceberg ships
~43 questions across ~23 screens — match or exceed). The Test-Yourself modal shows the contextual
`#quiz-toggle` button **only** when `DV.QuestionBank[currentId]` exists. Every animated + core
concept screen should have a bank.

### 7.4 `js/modules/interview.js`
`QA = [{ q, tags:['intermediate'|'advanced'|'senior'], answer:`html`, code?:`html`, shopkart?:'html'
}]`. Author **~24** Delta interview Q&As (log internals, checkpoints, OCC & isolation levels,
deletion vectors vs COW, OPTIMIZE/Z-order/liquid clustering trade-offs, VACUUM + time-travel
interaction, CDF, schema evolution + column mapping, Delta vs Iceberg vs Hudi, protocol/table
features). Filter buttons by tag. Subtitle: `${QA.length} interview questions`.

### 7.5 `js/modules/quiz.js`
`QUESTIONS` array of ~22 MCQs `{ q, options, correct, explanation }`, ShopKart-flavored, spanning all
topics. Quiz Mode = shuffled run with scoring.

### 7.6 `js/modules/study.js`
Study Deck that aggregates the question bank into flip-through cards (Iceberg pulls from
`QuestionBank`). Should surface ~50+ cards.

### 7.7 `js/modules/cheatsheet.js`
Cheat sheets: Delta SQL/DataFrame quick reference — `DESCRIBE HISTORY`, `VERSION AS OF`, `OPTIMIZE …
ZORDER BY`, `VACUUM`, `MERGE`, `replaceWhere`, `CDF`, table properties, `_delta_log` anatomy.

---

## 8. The animation-layout rule (read twice — this broke IcebergViz)

The single biggest failure on the Iceberg build: injecting quiz/extra content **into** a module whose
root is `height:100%; overflow:hidden` flex. It squishes or collapses the animation. **Never do
this.**

- Per-module quizzes are a **modal appended to `document.body`** (`.ty-modal`), opened by the topbar
  `#quiz-toggle` button. `js/features/test-yourself.js` owns it. It reads `DV.QuestionBank[id]`,
  grades inline, stores best score at `dv-quiz-<id>`, closes on Esc/backdrop, restores focus, and
  **never** touches `#module-container`. Port it verbatim; the enforcing CSS is
  `#quiz-toggle[hidden] { display: none !important; }` (because `.btn-icon` sets its own `display`).
- The `#quiz-toggle` button is `hidden` by default and shown/hidden by `syncButton()` on
  `app:navigate`, based on whether a bank exists for the current screen.
- Reading modules that legitimately scroll use the `.page-enter` root and the bridge CSS
  `#module-container > .page-enter { height:100%; overflow-y:auto }`.

Do **not** re-introduce the deleted `pager.js`. There is no in-flow pager.

---

## 9. Verification harness (must pass before "done")

Port all three scripts from `iceberg-visualizer/scripts/`:

- **`check-syntax.mjs`** — parses every `js/**/*.js` for syntax errors (fast gate). `npm run check`.
- **`verify.mjs`** — Playwright headless sweep across every screen × 2 themes × 3 viewports. Asserts:
  no console errors, no horizontal overflow, no empty module, drawer works, deep-links + resume work,
  command palette + progress render, nav collapse persists, a11y basics, and the **Test-Yourself
  modal** contract: button shows on a screen **with** a bank (e.g. `#insert`), is hidden on a screen
  **without** a bank (pick a Delta screen you intentionally leave bankless, e.g. `#engine-integrations`),
  the modal opens/grades/Esc-closes, and **nothing** is injected into `#module-container`. Update the
  screen list to the Delta `NAV_GROUPS`. `npm run verify`.
- **`verify-animations.mjs`** — drives every animated screen through the real Play/Next/Prev/Reset/
  speed controls; asserts Next advances each step, reaches the final step, Reset returns to idle, Play
  auto-advances (`setSpeed(8)`), Pause holds, the step label + counter update, and no console errors.
  Update the animated-screen list (§4.1). `npm run verify:anim`.

Playwright: the sandbox Chromium lives at `/opt/pw-browsers/chromium-*/chrome-linux/chrome`
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`). If the pinned build differs, launch with
`executablePath` pointing at the installed build — do **not** run `playwright install`. The verify
scripts set `localStorage 'dv-tour-done'='1'` before asserting so the first-run tour overlay doesn't
block hit-testing.

`package.json` mirrors Iceberg's: `check`, `verify`, `verify:anim` scripts; `playwright` as the only
devDependency.

**Definition of done:** all three scripts green, all `js/**/*.js` syntax-clean, both themes correct,
every animated module passes the driver, and no animation layout is disturbed by the quiz modal.

---

## 10. Deploy integration (the only shared change — additive)

The repo deploys the whole portfolio to GitHub Pages via `.github/workflows/deploy-pages.yml`
(`peaceiris/actions-gh-pages@v3`, publishes `gh-pages` with `keep_files:false`, so the workflow must
stage **every** project). It assembles `/tmp/site`, copies the root `index.html`/`.nojekyll`, loops
the project folders, then places the Iceberg app at `/iceberg`. To add Delta:

1. **Add the folder to the deploy loop.** In `deploy-pages.yml`, after the Iceberg placement block,
   add Delta the same way (strip dev-only files):
   ```bash
   rm -rf /tmp/site/delta
   cp -r delta-lake-visualizer /tmp/site/delta
   rm -rf /tmp/site/delta/{node_modules,scripts,.verify-artifacts,package.json,package-lock.json,.gitignore,DELTA-LAKE-VISUALIZER-BUILD.md}
   ```
   (rsync is not available in the sandbox — use `cp -r` + `rm -rf`, exactly as the Iceberg block does.)
2. **Add the syntax gate** for Delta alongside the Iceberg one:
   `node delta-lake-visualizer/scripts/check-syntax.mjs`.
3. **Add a portfolio card.** Edit the root `index.html` ("Data Engineering Visualizers" landing) to
   add a **Delta Lake** card linking to `delta/`, styled like the existing Iceberg card but with the
   Delta red→amber accent. Cross-link: on the Iceberg card mention its Delta sibling and vice-versa
   (optional).
4. **Do not** change any other project's staging. Verify the deploy by reading
   `gh-pages` via the GitHub tools after the Action runs (outbound to `github.io` is blocked in the
   sandbox — do not curl the live URL; inspect the `gh-pages` branch contents instead).

Absolute rule from the Iceberg build, still in force: **only the Delta app and this workflow change.**
`keep_files:false` means an incomplete staging list wipes projects — never remove an existing project
from the loop.

---

## 11. Build order (suggested)

1. Scaffold `delta-lake-visualizer/`: copy Iceberg's `index.html`, `css/`, `js/core/`,
   `js/components/`, `js/features/`, `app.js`, `package.json`, `scripts/`. Global rename
   `IcebergViz`→`DeltaViz`, `IV`→`DV`, `iv-`→`dv-`, `.iv-`→`.dv-` (helper classes only).
2. Swap the brand block + logo + titles/meta (§6). Get the empty shell running (home + a placeholder).
3. Author the data layer (§7.1–7.2).
4. Build modules group-by-group in this order, running `check` + `verify:anim` as you go:
   architecture → log-explorer → create-table → insert → write-path → read-path → commit-explorer →
   version-explorer → checkpoint → time-travel → update → delete → merge → overwrite → schema-evolution
   → partitioning → liquid-clustering → concurrency → deletion-vectors → optimize → vacuum →
   query-planner → change-data-feed → engine-integrations.
5. Author question bank, interview, quiz, study, cheatsheet (§7.3–7.7).
6. Wire + test the Test-Yourself modal (§8). Rewrite the tour copy.
7. Run all three verify scripts until green (§9).
8. Deploy integration (§10). Commit to the designated branch; push; (create a PR only if asked).

---

## 12. Reference file inventory (Iceberg → Delta, 1:1)

```
delta-lake-visualizer/
├── index.html                       (from iceberg index.html)
├── manifest.json
├── package.json
├── assets/                          (regenerate/port icons + og-image)
├── css/
│   ├── main.css                     (tokens + Delta brand block + light theme)
│   ├── layout.css  components.css  animations.css  responsive.css
│   ├── enhancements.css             (toast, palette, progress, .ty-modal quiz, tour)
│   └── print.css
├── js/
│   ├── data/
│   │   ├── shopkart-data.js
│   │   ├── delta-concepts.js        (was iceberg-concepts.js)
│   │   └── question-bank.js
│   ├── core/    animation-engine.js  tooltip.js  keyboard.js  toast.js
│   ├── components/  code-viewer.js  animation-controls.js
│   ├── modules/   (one file per id in §4 — ~30 files)
│   ├── features/  command-palette.js  progress.js  test-yourself.js  gestures.js  tour.js
│   └── app.js
└── scripts/  check-syntax.mjs  verify.mjs  verify-animations.mjs  gen-assets.mjs
```

Script load order in `index.html` (dependency order): **data → core → components → modules → app →
features**. (App must load after modules so the registry is populated; features load after app so the
`DV` accessors exist.)

---

## 13. Style/quality bar

- Match IcebergViz's polish: real typographic hierarchy, tokenized colors, both themes, tabular-nums
  for stats, `overflow-x:auto` on wide content, visible focus states, `prefers-reduced-motion`
  respected. Copy is written from the learner's side; numbers are concrete and consistent.
- Every animated diagram should *show the real mechanism* (the log, the actions, the stats-based
  skipping), not decorative motion. The step `desc` narration is where the teaching happens — make it
  specific (see the Iceberg read-path descs for the target density).
- Keep the two apps feeling like one product family: same shell, same interactions, sibling palettes.

---

*End of spec. Everything needed to build the Delta Lake Visualizer as a faithful twin of the Iceberg
Visualizer is above. When a mechanism is unclear, open the corresponding `iceberg-visualizer/` file
and mirror it — only the content and the brand accent differ.*
