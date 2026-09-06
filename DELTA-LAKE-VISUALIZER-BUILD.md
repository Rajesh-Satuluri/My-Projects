# Open Table Formats Visualizer — Unified Build Spec & Prompt (Iceberg + Delta)

> **Purpose of this file.** Hand this entire file to a fresh Claude Code (or any capable coding
> agent) session as the build brief. It specifies how to evolve the existing single-format
> **Apache Iceberg Visualizer** (`iceberg-visualizer/`) into a **unified, multi-format
> "Open Table Formats Visualizer"** that teaches **both Iceberg and Delta Lake** in one tool, with a
> **format switcher**, a shared engine/shell, and a **Compare** mode that puts the two formats
> side-by-side. Delta content is built as a structural twin of the Iceberg content.
>
> The existing Iceberg app is the **reference implementation** for *mechanism* (router, engine,
> controls bar, theming, nav, modals, verify scripts). This spec tells you how to (a) generalize it to
> N formats without destabilizing the shipped Iceberg experience, and (b) add Delta as the second
> format plus the comparison layer.
>
> **Chosen architecture: UNIFIED TOOL** (one codebase, one deploy, a format switcher). This supersedes
> the earlier "separate sibling app" idea.
>
> **Companion file:** `UIUX-POLISH-SPEC.md` (same folder) is the normative **premium design system**
> for this tool — read it in full and apply it across the whole app (see §6a). This build spec and the
> polish spec are meant to be used together.

---

## 0. TL;DR — what you are building

One vanilla **HTML/CSS/JS** single-page app (no framework, no build step) that covers **multiple open
table formats**. Ships with two formats — **Iceberg** and **Delta Lake** — behind a top-of-sidebar
**format switcher**, plus a **Compare** section with side-by-side modules. Same app shell, hash router,
`AnimationEngine`, controls bar, command palette, quizzes, interview/study/cheatsheet as today — but
everything is now **format-aware**.

- **Folder:** evolve `iceberg-visualizer/` in place, then **rename** it to `table-formats-visualizer/`
  (see §10 for the URL/redirect plan). All existing Iceberg module files are kept and re-registered
  under the `iceberg` format — **add alongside, don't rewrite**.
- **Neutral namespace:** `window.TableViz` (alias `TV`), with `window.IcebergViz` / `IV` kept as a
  back-compat **alias** (`window.IcebergViz = window.TableViz`) so no existing file breaks.
- **Routing:** hash gains a format segment → `#<format>/<screen>` and `#<format>/<screen>/<step>`
  (e.g. `#iceberg/read-path/3`, `#delta/read-path`, `#compare/read-path`).
- **Brand per format:** Iceberg = blue→purple (unchanged); Delta = red→amber; driven by
  `data-format` on `<html>`. Theme (light/dark) stays orthogonal (`data-theme`).
- **Narrative:** one fictional company, **ShopKart Global E-Commerce**, shared across both formats so
  comparisons and interview answers stay consistent.
- **N-format ready (Hudi later), zero placeholders now:** the whole app is data-driven from a format
  registry. A third format (**Apache Hudi**) is planned but **not built now** — and it must leave **no
  trace in the shipped UI**: no "coming soon" chip, no empty switcher slot, no blank matrix column, no
  Hudi label anywhere. Adding Hudi in future = drop in `formats/hudi.js` + `modules/hudi/*` + data and
  register it; **no core edits**. Until then nothing references it, so nothing shows. See §11a + Appendix A.

**Absolute constraints (do not violate):**
1. Work happens **only** inside the (renamed) visualizer folder. Do **not** modify any other project
   folder. The one shared file you may touch is the deploy workflow (§10) — additively.
2. **Never** break an animation's layout. Animation module roots are
   `display:flex; flex-direction:column; height:100%; overflow:hidden`. Never inject scrolling content
   as a flex child. Per-module quizzes live in a **modal appended to `<body>`**, never in the module
   DOM. (This is the #1 mistake from the original build — see §8.)
3. **One AnimationEngine registered at a time.** The controls bar (`TV.AnimationControls`) binds a
   single engine. Compare modules must therefore drive **one** engine that animates both panes in
   lockstep — never two engines competing for the bar (§7).
4. No external runtime dependencies. All CSS/JS local + inlined. Only dev dep is Playwright (verify).
5. **De-risk the shipped Iceberg app:** do the multi-format refactor first with Iceberg as the *only*
   format and get the full verify harness green **before** adding any Delta content (§11).
6. **Everything format-related is derived from the registry, never hardcoded** — the switcher, the set
   of valid route formats, per-format brand CSS, keyboard-shortcut targets, the command palette, and
   the Compare matrix columns/panes all iterate `TV.formats`. Hardcoding "iceberg"/"delta" anywhere the
   registry could drive it is a defect (it's what would force a refactor when Hudi arrives).

---

## 1. Master build prompt (copy-paste this)

> Evolve the existing `iceberg-visualizer/` single-format app into a unified **Open Table Formats
> Visualizer** that teaches both **Apache Iceberg** and **Delta Lake** in one vanilla HTML/CSS/JS app
> (no framework, no build step), with a **format switcher** in the sidebar and a **Compare** section
> for side-by-side modules. Keep the entire existing app shell, hash router, reusable
> `AnimationEngine`, bottom controls bar, command palette, progress meter, first-run tour, keyboard
> shortcuts, and the modal-based per-module quiz — but make all of it **format-aware**.
>
> Generalize the namespace to `window.TableViz` (alias `TV`) and keep `window.IcebergViz`/`IV` as a
> back-compat alias so existing files keep working. Introduce a `TV.formats` registry keyed by format
> id; each format supplies its own nav groups, brand tokens, logo, docs URL, and its own module set
> registered under `TV.modules[format][screenId]`. Extend the hash router to `#<format>/<screen>` and
> `#<format>/<screen>/<step>`. Namespace all persistence by format (`tv-<format>-…`) and make the
> command palette, quiz modal, progress meter, and tour read the **active** format's registry. Drive
> the per-format brand accent (Iceberg blue→purple; Delta red→amber) via a `data-format` attribute on
> `<html>`, orthogonal to the existing `data-theme` light/dark system.
>
> Keep every existing Iceberg module file and re-register it under the `iceberg` format — add
> alongside, do not rewrite. Then add the **Delta Lake** format: re-author 100% of the teaching
> content for Delta's transaction-log model (the `_delta_log` ordered JSON commits + Parquet
> checkpoints, Add/Remove/protocol/metaData actions, data skipping via per-file stats in the log,
> optimistic concurrency control, OPTIMIZE + Z-ORDER + Liquid Clustering, VACUUM, deletion vectors,
> time travel by version/timestamp, schema evolution, generated columns, Change Data Feed, engine
> integrations). The Delta module list and content briefs are in the spec. Then add a **Compare**
> section of single-engine, dual-pane modules (same ShopKart scenario, Iceberg mechanism vs Delta
> mechanism) plus a static format-decision matrix.
>
> Keep the fictional company **ShopKart Global E-Commerce** as the shared narrative. Hard rules:
> (1) touch only the visualizer folder plus the deploy workflow (additively); (2) never inject
> scrolling content into an animation module's `height:100%; overflow:hidden` root — the quiz is a
> body-level modal; (3) only one AnimationEngine is registered with the controls bar at a time, so
> Compare modules use one engine for both panes; (4) no external runtime deps. Do the refactor in
> stages: first generalize to multi-format with Iceberg as the only format and get the ported
> Playwright verify scripts green, then add Delta, then add Compare. Follow the detailed spec below.

---

## 2. Target architecture (multi-format)

### 2.1 Namespace & format registry

```js
window.TableViz = window.TableViz || {};
const TV = window.TableViz;
window.IcebergViz = TV;   // back-compat alias — existing files keep working

TV.formats = {
  iceberg: {
    id: 'iceberg',
    label: 'Apache Iceberg',
    short: 'Iceberg',
    docsUrl: 'https://iceberg.apache.org/docs/latest/',
    logoSvg: `…blue→purple triangle…`,
    navGroups: [ /* the existing Iceberg NAV_GROUPS */ ],
  },
  delta: {
    id: 'delta',
    label: 'Delta Lake',
    short: 'Delta',
    docsUrl: 'https://docs.delta.io/latest/index.html',
    logoSvg: `…red→amber Δ…`,
    navGroups: [ /* the Delta NAV_GROUPS from §4 */ ],
  },
  // 'compare' is a pseudo-format (see §7) with its own navGroups but no brand swap.
};

TV.modules = { iceberg: {}, delta: {}, compare: {} };   // module registry, keyed by format
```

- **Module registration** changes from `IV.modules['read-path'] = mod` to
  `TV.modules['iceberg']['read-path'] = mod`. Add a tiny helper
  `TV.registerModule(format, mod)` and have every module file call it. Existing Iceberg module files
  get a one-line change at the bottom (their internal logic is untouched).
- **Active-format state:** `TV.activeFormat` (default from `tv-format`, else `iceberg`). Accessors
  become format-aware:
  - `TV.getScreens(format = TV.activeFormat)` → screens of that format.
  - `TV.getNavGroups(format = TV.activeFormat)`.
  - `TV.currentScreenId()`, `TV.currentFormat()`.
  - `TV.navigate(format, id, step)` (and a convenience `TV.go(id)` that keeps the active format).

### 2.2 Router (3-segment hash)

Extend `_parseHash` in `app.js` to parse `#<format>/<screen>/<step>`:

```
#                         → active format home (resume: tv-<fmt>-last-screen)
#iceberg                  → iceberg home
#iceberg/read-path        → iceberg read-path
#iceberg/read-path/3      → iceberg read-path, seek step 3
#delta/read-path          → delta read-path
#compare/read-path        → compare read-path
```

Rules:
- If the first segment is a known format id (`iceberg|delta|compare`), it's the format; otherwise treat
  the whole thing as a screen under the active format (back-compat: a bare `#read-path` still resolves
  under the active format — and a redirect stub handles old `/iceberg/#read-path` links, §10).
- Switching format re-points to that format's home (or, if the same screen id exists in the target
  format, keep the screen — nice for Compare→format jumps). Persist `tv-format`.
- `_syncStepToUrl(i)` writes `#<activeFormat>/<screen>/<i>`.

### 2.3 Format switcher (new UI)

A segmented control at the **top of the sidebar**, above search — **built entirely from the registry**,
never a hardcoded list of pills:

```
┌───────────────────────────────────────┐
│  [ Iceberg ] [ Delta ] [ ⇄ Compare ]  │   ← renders one pill per registered format + Compare
└───────────────────────────────────────┘
```

- Render logic: `Object.values(TV.formats).filter(f => f.visible !== false && f.id !== 'compare')`
  → one pill each, then the Compare pill (shown only when ≥2 comparable formats exist). Because it's
  data-driven, **an unregistered format simply doesn't appear** — no "coming soon", no empty slot. When
  Hudi is registered later, its pill appears automatically with zero switcher code changes.
- **Single-format collapse (no empty control):** if only one format is registered (e.g. mid–Stage 1),
  the switcher renders as a **static brand label**, not an orphan single pill — so it never looks
  broken or half-built. It becomes an interactive toggle the moment a 2nd format registers.
- Clicking a pill calls `TV.navigate(format, homeOrSameScreen)`, rebuilds the nav for that format,
  sets `document.documentElement.dataset.format = format` (drives brand tokens), updates the sidebar
  brand (name/logo/tagline), the topbar docs link, and the breadcrumb root.
- `Compare` is styled distinctly (it's a mode, not a format) and does **not** swap the brand accent —
  it uses a neutral/dual accent.
- Keyboard: shortcut targets are generated from the registry (`g i` → Iceberg, `g d` → Delta,
  `g c` → Compare; a future `g u` → Hudi appears automatically). Keep format-relative `g h/w/a/m`.

### 2.4 What stays format-agnostic (copy/keep verbatim)

`animation-engine.js`, `animation-controls.js`, `tooltip.js`, `keyboard.js`, `toast.js`,
`code-viewer.js`, `command-palette.js`, `progress.js`, `test-yourself.js`, `gestures.js`, `tour.js`.
They only change to (a) reference `TV`, (b) read the **active** format's registry via the accessors,
and (c) namespace their localStorage keys by format. The `AnimationEngine` itself does not change.

### 2.5 The module contract (unchanged, now format-scoped)

```js
const mod = {
  id: 'read-path', title: 'Read Path', group: 'read-ops',
  format: 'delta',            // new: which format this module belongs to
  _engine: null,
  render(container) { /* build DOM; wire engine; TV.AnimationControls.register(engine) */ },
  destroy() { /* engine.destroy(); AnimationControls.hide(); remove injected <style> */ },
};
TV.registerModule('delta', mod);
```

- Animated module root = `<prefix>-page page-enter` with `height:100%; overflow:hidden` flex; static
  modules use `.page-enter` and scroll via the bridge CSS
  `#module-container > .page-enter { height:100%; overflow-y:auto }`.
- Unique 2–4 letter class/id prefix per module. **Delta prefixes must not collide with Iceberg's**
  (both apps' CSS is loaded in one page). Suggested: Delta modules use a `d`-prefixed scheme
  (`drp-` delta read-path, `dtl-` delta transaction-log, `dcx-` delta checkpoint, `ddv-` deletion
  vectors, `dlc-` liquid clustering, `dopt-` optimize, `dvac-` vacuum, `dcdf-` change-data-feed…).
  Compare modules use `cmp-`.
- `destroy()` tears down engine, hides controls bar, removes injected `<style id>`.

---

## 3. Iceberg → Delta concept translation map

Re-author Delta content using this. Left = what the Iceberg module teaches; right = the Delta
equivalent.

| Concept | Iceberg | Delta Lake |
|---|---|---|
| Table format core | Metadata tree on object storage | **Transaction log** (`_delta_log/`) on object storage |
| Root pointer | `metadata.json` via catalog | Latest committed version = highest-numbered JSON in `_delta_log` (via catalog/path) |
| Commit unit | New `metadata.json` + snapshot | Ordered JSON commit `00000000000000000000.json`, `...0001.json`, … (one per version) |
| Commit contents | Snapshot → manifest list → manifests | **Actions**: `protocol`, `metaData`, `add` (AddFile), `remove` (RemoveFile), `commitInfo`, `cdc` |
| File tracking | Manifests list data files + stats | `add`/`remove` actions carry path, partitionValues, size, per-column **stats** (min/max/nullCount) |
| Read acceleration | Manifest/partition pruning + column stats | **Log replay** to build current file set + **data skipping** from file stats + partition pruning |
| Metadata compaction | (rewrite metadata) | **Checkpoint** Parquet every N commits (default 10) → readers replay from last checkpoint |
| History | Snapshots | **Table versions** (monotonic) + timestamps (`DESCRIBE HISTORY`) |
| Time travel | `VERSION AS OF` / snapshot id | `VERSION AS OF n` / `TIMESTAMP AS OF t` |
| Delete strategy | Positional/equality delete files (MoR) | **Deletion vectors** (merge-on-read bitmaps) or copy-on-write rewrite |
| Update/Merge | MERGE INTO, UPDATE, DELETE | Same SQL; mechanics = rewrite files or write deletion vectors + new adds |
| Overwrite | INSERT OVERWRITE (partition) | `INSERT OVERWRITE` / `replaceWhere` predicate overwrite |
| Schema evolution | Add/rename/reorder, safe | `ALTER TABLE`, `mergeSchema`, column mapping (id/name mode) |
| Partitioning | Hidden partitioning + transforms | Explicit partition cols + **generated columns**; and **Liquid Clustering** (no physical partitions) |
| Partition change | Partition evolution | **Liquid Clustering** re-clustering / repartition-on-write |
| Layout optimization | (compaction/sorting) | **OPTIMIZE** (bin-packing) + **Z-ORDER BY** + Liquid Clustering |
| Cleanup | Expire snapshots / remove orphans | **VACUUM** (removes unreferenced files past retention, default 7 days) |
| Concurrency | Optimistic, snapshot isolation | **Optimistic concurrency control** — conflict detection on commit + retry; Serializable/WriteSerializable |
| Catalog | Hive/Glue/REST/Nessie | Hive metastore / **Unity Catalog** / path-based |
| Change tracking | (incremental via snapshots) | **Change Data Feed (CDF)** — `_change_data/` + `cdc` actions |
| Interop | — | **Delta UniForm** (expose Delta as Iceberg/Hudi) — natural cross-link back to the Iceberg format |
| Protocol | format-version | **protocol** action: reader/writer versions + **table features** |

**ShopKart incidents, recast for Delta:** concurrent-write corruption → **optimistic concurrency
control + atomic log commit**; 11-hour schema outage → metadata-only **`ALTER TABLE ADD COLUMN`** +
column mapping; add Delta-flavored ones: tiny-file slowdown → **OPTIMIZE + Z-ORDER**; reader latency
as history grows → **checkpoints**.

---

## 4. Delta navigation registry (`TV.formats.delta.navGroups`)

IDs are module ids and the `<screen>` hash segment. Keep existing `_navIcon` names; add path data for
any new icon.

```js
const DELTA_NAV_GROUPS = [
  { id: 'start', label: 'Get Started', items: [
    { id: 'home',         label: 'Home',            icon: 'home',   available: true },
    { id: 'why-delta',    label: 'Why Delta Lake?', icon: 'shield', available: true },
    { id: 'architecture', label: 'Architecture',    icon: 'layers', available: true },
    { id: 'log-explorer', label: 'Transaction Log', icon: 'folder', available: true },
  ]},
  { id: 'write-ops', label: 'Write Operations', items: [
    { id: 'create-table', label: 'CREATE TABLE',    icon: 'table-plus', available: true },
    { id: 'insert',       label: 'INSERT / APPEND', icon: 'arrow-down', available: true },
    { id: 'update',       label: 'UPDATE',          icon: 'pencil',     available: true },
    { id: 'delete',       label: 'DELETE',          icon: 'trash',      available: true },
    { id: 'merge',        label: 'MERGE INTO',      icon: 'merge',      available: true },
    { id: 'overwrite',    label: 'replaceWhere',    icon: 'refresh',    available: true },
  ]},
  { id: 'read-ops', label: 'Read & Query', items: [
    { id: 'read-path',     label: 'Read Path (Log Replay)', icon: 'search', available: true },
    { id: 'write-path',    label: 'Write Path (Commit)',    icon: 'edit',   available: true },
    { id: 'query-planner', label: 'Query Planner',          icon: 'cpu',    available: true },
    { id: 'time-travel',   label: 'Time Travel',            icon: 'clock',  available: true },
  ]},
  { id: 'log', label: 'Log & Schema', items: [
    { id: 'version-explorer',  label: 'Version History',    icon: 'camera',     available: true },
    { id: 'commit-explorer',   label: 'Commit Explorer',    icon: 'list',       available: true },
    { id: 'checkpoint',        label: 'Checkpoints',        icon: 'book',       available: true },
    { id: 'schema-evolution',  label: 'Schema Evolution',   icon: 'columns',    available: true },
    { id: 'partitioning',      label: 'Partitioning & Generated Cols', icon: 'filter', available: true },
    { id: 'liquid-clustering', label: 'Liquid Clustering',  icon: 'git-branch', available: true },
  ]},
  { id: 'advanced', label: 'Advanced Topics', items: [
    { id: 'concurrency',         label: 'Concurrency (OCC)',   icon: 'users',   available: true },
    { id: 'deletion-vectors',    label: 'Deletion Vectors',    icon: 'trash',   available: true },
    { id: 'optimize',            label: 'OPTIMIZE & Z-Order',  icon: 'zap',     available: true },
    { id: 'vacuum',              label: 'VACUUM',              icon: 'tool',    available: true },
    { id: 'change-data-feed',    label: 'Change Data Feed',    icon: 'refresh', available: true },
    { id: 'engine-integrations', label: 'Engine Integrations', icon: 'link',    available: true },
  ]},
  { id: 'learn', label: 'Learn & Practice', items: [
    { id: 'interview',  label: 'Interview Mode', icon: 'message-square', available: true },
    { id: 'quiz',       label: 'Quiz Mode',      icon: 'check-square',   available: true },
    { id: 'study',      label: 'Study Deck',     icon: 'book',           available: true },
    { id: 'cheatsheet', label: 'Cheat Sheets',   icon: 'file-text',      available: true },
  ]},
];
```

**Optional bonus:** `uniform` (Delta UniForm) — a cross-link that shows Delta metadata exposed as
Iceberg, tying the two formats together.

### 4.1 Animated vs. static (Delta)

- **Animated** (SVG + `AnimationEngine`, flex/overflow-hidden root, register controls): `architecture`,
  `create-table`, `insert`, `update`, `delete`, `merge`, `overwrite`, `read-path`, `write-path`,
  `query-planner`, `time-travel`, `version-explorer`, `commit-explorer`, `checkpoint`,
  `schema-evolution`, `partitioning`, `liquid-clustering`, `concurrency`, `deletion-vectors`,
  `optimize`, `vacuum`, `change-data-feed`.
- **Static/interactive**: `home`, `why-delta`, `log-explorer` (click-to-expand tree),
  `engine-integrations`, `interview`, `quiz`, `study`, `cheatsheet`.

---

## 5. Delta per-module content briefs

Each animated module = SVG diagram + step sidebar + ~6–8 `AnimationEngine` steps, each with a
data-rich `{ label, desc }` narration (match the Iceberg read-path density). Keep numbers concrete and
consistent with ShopKart (20M orders/day, 30 countries, 6 PB history, 24,000 files / 38.4 TB table).

- **home** — landing hub (Delta red→amber), "what you'll learn" cards, ShopKart context, progress.
- **why-delta** — problems Delta solves over plain Parquet: ACID via the log, schema evolution, time
  travel, data skipping; the 3 recast ShopKart incidents.
- **architecture** — animate layers: engine → catalog/path → `_delta_log` (JSON commits + checkpoints)
  → Parquet data files; highlight each in turn.
- **log-explorer** — interactive tree of `_delta_log/`: `…0000.json`…`…0010.checkpoint.parquet`,
  `_last_checkpoint`; click a commit to expand its actions.
- **create-table** — write `protocol` + `metaData` → version 0 commit → empty table.
- **insert** — append: new Parquet files → `add` actions in a new commit → version bumps.
- **update** — copy-on-write (`remove` old + `add` new) *and* the deletion-vector path (cross-link).
- **delete** — both strategies; `remove` actions / deletion-vector marking.
- **merge** — MERGE INTO upsert: matched→update, not-matched→insert; add/remove in one atomic commit.
- **overwrite** — `replaceWhere('country = "BR"')`: only matching files removed + replaced.
- **read-path** — the star: query → resolve latest version → **replay log from last checkpoint** →
  **data skipping** via per-file min/max stats → partition pruning → column projection → parallel read
  → results. Reuse the Brazil-2024 / 98.7%-skip framing, but pruning source is **log stats**.
- **write-path** — commit protocol: stage files → attempt commit at version N → optimistic conflict
  check → atomic put of `N.json` → success/retry.
- **query-planner** — predicate pushdown + file-level stat pruning from the log before any data read.
- **time-travel** — `VERSION AS OF` / `TIMESTAMP AS OF`: replay log up to version k; file set differs.
- **version-explorer** — timeline of versions (op, timestamp, added/removed files, cumulative rows).
- **commit-explorer** — deep-dive one JSON commit: pretty-print `add`(+`stats`), `remove`, `commitInfo`.
- **checkpoint** — why checkpoints exist; at version 10 a `.checkpoint.parquet` snapshots cumulative
  state so readers start there + replay the tail; `_last_checkpoint`.
- **schema-evolution** — metadata-only `metaData` action + column mapping; `mergeSchema` on write.
- **partitioning** — partition columns + generated columns; partition pruning.
- **liquid-clustering** — cluster keys, incremental re-clustering on OPTIMIZE, no small-file/skew pain.
- **concurrency** — two ShopKart writers; OCC detects the conflict at commit; one retries; isolation
  levels (Serializable vs WriteSerializable).
- **deletion-vectors** — mark rows in a bitmap instead of rewriting files; readers apply the DV;
  OPTIMIZE later materializes.
- **optimize** — bin-packing (`remove` many + `add` few) + `ZORDER BY (country, order_date)`;
  before/after skip rates.
- **vacuum** — remove files unreferenced past retention (default 7 days); interaction with time travel.
- **change-data-feed** — enable `delta.enableChangeDataFeed`; read row-level changes between versions.
- **engine-integrations** — Spark, Databricks, Trino/Presto, Flink, DuckDB, Polars, delta-rs matrix.

---

## 6. Brand & theming (per-format, orthogonal to light/dark)

- Keep all existing `main.css` tokens and the full light-theme block. **Add** a brand layer driven by
  `data-format`:

```css
/* Iceberg brand (existing) */
:root, :root[data-format="iceberg"] {
  --brand: #4aaeff;
  --brand-glow: rgba(74,174,255,.3);
  --brand-gradient: linear-gradient(135deg,#4aaeff 0%,#a371f7 100%);
}
/* Delta brand */
:root[data-format="delta"] {
  --brand: #ff5a3c;
  --brand-glow: rgba(255,90,60,.3);
  --brand-gradient: linear-gradient(135deg,#ff5a3c 0%,#ffb020 100%);
}
/* Compare mode — neutral/dual */
:root[data-format="compare"] {
  --brand: #8b94a3;
  --brand-gradient: linear-gradient(135deg,#4aaeff 0%,#ff5a3c 100%);
}
```

- **Migrate** existing `--iceberg*` token *usages* to `--brand*` (logo gradient, hero, progress fill,
  active-nav glow). Keep the generic accent tokens (`--blue`, `--green`, `--red`, `--orange`,
  `--purple`, `--yellow`) untouched — animations still use them for state; only the **brand** changes
  per format. Both themes (`data-theme` light/dark) apply on top, unchanged.
- **Sidebar brand** becomes format-driven: name + logo + tagline swap with the format (IcebergViz /
  DeltaViz). Topbar docs link href follows `TV.formats[active].docsUrl`. `<title>` becomes
  "Open Table Formats Visualizer — ShopKart Engineering Handbook"; update meta/OG/Twitter accordingly;
  `theme-color` can stay neutral.
- No-flash `<head>` script reads `tv-theme` **and** `tv-format` and stamps both attributes before
  first paint.

---

## 6a. Premium design system & polish (from `UIUX-POLISH-SPEC.md`)

The whole tool must ship at **"$1000 paid-subscription" quality** per the companion file
**`UIUX-POLISH-SPEC.md`** (in this repo — read it in full; it is normative). Apply that design system
**across the entire unified tool** (Iceberg + Delta + Compare) so there is **one** visual language, not
two. Key reconciliations with this build:

- **Recoloring accent = our per-format brand.** The polish spec's signature move (§2: flip one
  attribute, override `--brand` / `--brand-2` / `--brand-glow`, everything follows) **is exactly** our
  `data-format` brand system. Unify them: there is one recoloring mechanism keyed on
  `data-format` — Iceberg = blue→cyan (`#4f8cff`/`#22d3ee`), Delta = red→amber (`#fb7185`→`#fbbf24`
  family), Compare = neutral/dual. **No component hardcodes an accent** — always through `--brand*`.
  When Hudi lands it's just another `data-format` value → amber→green; zero component changes.
- **Adopt the polish token set as the tool's design tokens** (§1: layered `--bg-0..3`, text ramp,
  motion tokens `--dur-fast/--dur/--dur-slow/--dur-cat` + easings, `--radius`/`--radius-sm`, shadows,
  stripe colors, `--success`/`--flame`, `--code-bg` dark-in-both-themes). Keep the generic **state**
  colors (green/amber/red) for animation semantics. Light theme = warm-paper (§1.2).
- **Motion system (§3):** universal control transition + hover-lift + press-settle on every control;
  the **pixel-height accordion** for nav groups (replaces the current grid-rows collapse); the three
  **route cues** (top nav-progress bar, content rise-in, reading-progress bar on long/reading screens);
  everything gated behind `prefers-reduced-motion`. Note: this must **not** interfere with the
  `AnimationEngine` step animations inside modules — the route cues are shell-level only.
- **Components (§4):** unified **modal choreography** (scrim + backdrop blur + card rise) reused by the
  command palette, the Test-Yourself quiz modal, the shortcuts modal, and any new overlay; premium
  code blocks (dark slab, uppercase language micro-label, indent guides, copy-pulse) for the
  code-viewer; left-edge **accent stripes** on sections; **uppercase micro-labels** above values;
  glowing active-nav bar + **slim per-category progress bars**.
- **Micro-interactions (§5):** hamburger→X morph, single rotating collapse-all caret, animated desktop
  sidebar collapse (grid track → 0), mobile drawer slide + blur scrim, toast confirmations, refined
  empty/search-empty states.
- **Learning-UX surfaces (§5, §4.5):** overall progress box (success-gradient), **resume "continue
  where you left off" card**, **achievement stat tiles** (visited/mastered + streak with flame
  `background-clip:text` gradient), **activity heatmap**, **readiness ring** (quiz mastery per format),
  **review-due chip**. These read per-format progress from `localStorage` (`tv-<format>-…`).
- **Responsive & a11y (§6–§7):** never scroll the page sideways; ≤1100px icon-only toolbar (scrollable);
  ≤900px off-canvas drawer; 34–44px coarse-pointer targets; `:focus-visible` rings; ARIA on modals +
  icon buttons; focus trap + Esc + focus restore on every overlay. (The current app already does much
  of this — upgrade it to the spec's exact patterns/values.)

**Apply-once, inherit-everywhere:** because all of the above lives in shared CSS + shared feature
files, building it in Phase A on the Iceberg-only app means **Delta and Compare inherit the full
premium system for free** when they're added. That's why the design-system work is front-loaded.

**One decision this raises (see §14):** whether Phase A **re-tokenizes** the shipped Iceberg app to the
polish palette (a deliberate unified visual refresh — recommended, since we're building a new
"Open Table Formats" identity) **or** layers the polish patterns on the existing Iceberg tokens (keeps
today's exact Iceberg look). Recommended: **re-tokenize to one system**, with before/after screenshot
review in the design-system iteration so nothing regresses.

---

## 7. Compare mode (the headline feature)

A pseudo-format `compare` with its own nav group of **dual-pane** modules. The point: same ShopKart
scenario, Iceberg mechanism on the left, Delta mechanism on the right.

**Critical constraint:** only one engine may bind the controls bar. So each Compare module builds a
**single** `AnimationEngine` whose steps drive **both** SVG panes in lockstep (one step = advance both
diagrams to the equivalent stage). Never instantiate two engines in one screen.

Suggested Compare nav (`TV.formats.compare.navGroups`):

```
Compare
  ├─ overview            (static: side-by-side format decision matrix)
  ├─ read-path           (dual-pane: manifest pruning  vs  log-replay + stats skipping)
  ├─ deletes             (dual-pane: delete files       vs  deletion vectors)
  ├─ time-travel         (dual-pane: snapshots          vs  versions/timestamps)
  ├─ schema-evolution    (dual-pane: metadata swap      vs  metaData action + column mapping)
  ├─ concurrency         (dual-pane: snapshot isolation vs  optimistic concurrency control)
  └─ maintenance         (dual-pane: compaction/expire  vs  OPTIMIZE/Z-ORDER/VACUUM)
```

- `overview` is a static, scrollable decision matrix. **Columns are data-driven** —
  `TV.formats` filtered to `comparable !== false` — so it renders **exactly 2 columns now** (Iceberg,
  Delta) and **3 automatically** when Hudi registers, with **no blank/"coming soon" column ever**.
  Rows = capabilities: ACID, time travel, delete strategy, layout optimization, catalog options,
  ecosystem, streaming/CDC, interop. Plus a "when to choose which" guide — paywall-worthy, interview-grade.
- **N-pane, single-engine dual-view:** each Compare module renders **one pane per comparable format**
  (2 today, 3 later) in a responsive `grid` (`grid-template-columns: repeat(auto-fit, minmax(…))`) so
  the layout is balanced at 2 and at 3 with no empty cell. A **single** `AnimationEngine` drives all
  panes in lockstep (one step advances every pane to the equivalent stage). Build the pane list from
  the registry — never hardcode "left = iceberg, right = delta". A pane's diagram comes from a
  per-format `comparePane(step, ctx)` contributed by that format's module (or a compact purpose-built
  twin). Step narration explains *the difference at each stage*.
- Compare modules use the `cmp-` prefix and a neutral/dual accent. Test-Yourself banks live under
  `TV.QuestionBank.compare[id]` with "which format does X" questions (author them so a 3rd option can
  be added later without rewrites).

---

## 8. The animation-layout rule (read twice)

The biggest failure in the original build: injecting quiz/extra content **into** a module whose root is
`height:100%; overflow:hidden` flex — it squishes/collapses the animation. **Never do this.**

- Per-module quizzes are a **modal appended to `document.body`** (`.ty-modal`), opened by the topbar
  `#quiz-toggle` button, owned by `test-yourself.js`. It reads the **active format's** bank
  (`TV.QuestionBank[TV.activeFormat][id]`), grades inline, stores best score at
  `tv-<format>-quiz-<id>`, closes on Esc/backdrop, restores focus, and **never** touches
  `#module-container`. The enforcing CSS is `#quiz-toggle[hidden]{display:none!important}` (because
  `.btn-icon` sets its own `display`).
- `#quiz-toggle` is `hidden` by default; `syncButton()` on `app:navigate` shows it only when a bank
  exists for the current format+screen.
- Reading modules that scroll use the `.page-enter` root + the bridge CSS.
- Do **not** reintroduce the deleted in-flow `pager.js`.

---

## 9. Data & learn layers (per format)

- **`js/data/shopkart-data.js`** — one shared `TV.Data` company/incident set; format-specific
  `resolution` text where relevant.
- **Concepts:** `js/data/iceberg-concepts.js` (existing) + new `js/data/delta-concepts.js`, each under
  `TV.Concepts[format]`.
- **Question banks:** `TV.QuestionBank = { iceberg:{…}, delta:{…}, compare:{…} }`, shape per screen
  `[{ q, options, correct, explanation, difficulty }]`. Match/exceed Iceberg's ~43 Qs for Delta;
  add ~15 comparison Qs.
- **Interview:** the interview module reads the active format's `QA` list (author ~24 Delta Q&As:
  log internals, checkpoints, OCC/isolation, DV vs COW, OPTIMIZE/Z-order/liquid clustering, VACUUM +
  time-travel, CDF, schema evolution + column mapping, Delta vs Iceberg vs Hudi, protocol/table
  features). Plus a dedicated **"Iceberg vs Delta"** interview set under Compare.
- **Quiz / Study / Cheatsheet:** format-aware; Delta cheat sheet covers `DESCRIBE HISTORY`,
  `VERSION AS OF`, `OPTIMIZE … ZORDER BY`, `VACUUM`, `MERGE`, `replaceWhere`, CDF, table properties,
  `_delta_log` anatomy.

---

## 10. Deploy integration & URL plan (additive)

The repo deploys the whole portfolio to GitHub Pages via `.github/workflows/deploy-pages.yml`
(`peaceiris/actions-gh-pages@v3`, `gh-pages`, `keep_files:false` → must stage **every** project).

Plan:
1. **Rename** `iceberg-visualizer/` → `table-formats-visualizer/` (git mv). Update the workflow block
   that placed `/iceberg` to place the unified app. **Recommended URL: `/lakehouse/`** (or
   `/table-formats/`), because the tool is no longer Iceberg-only.
2. **Preserve old links:** stage a tiny **redirect stub at `/iceberg/index.html`** that
   `location.replace('../lakehouse/#iceberg/home')` (and forwards any hash). This keeps the existing
   portfolio card / bookmarks working. (Alternatively keep deploying at `/iceberg/` and skip the
   redirect — simpler but the path name lies about the content. Pick one; redirect is cleaner.)
3. In the workflow, replace the iceberg staging block:
   ```bash
   rm -rf /tmp/site/lakehouse
   cp -r table-formats-visualizer /tmp/site/lakehouse
   rm -rf /tmp/site/lakehouse/{node_modules,scripts,.verify-artifacts,package.json,package-lock.json,.gitignore,*.md}
   # redirect stub for old links
   mkdir -p /tmp/site/iceberg && cat > /tmp/site/iceberg/index.html <<'HTML'
   <!doctype html><meta charset=utf-8><script>
   location.replace('../lakehouse/'+ (location.hash || '#iceberg/home'));
   </script>
   HTML
   ```
   Keep the syntax gate: `node table-formats-visualizer/scripts/check-syntax.mjs`.
4. **Portfolio card:** update root `index.html` — the "Iceberg" card becomes **"Open Table Formats
   (Iceberg + Delta)"** pointing at `lakehouse/`, with a dual blue/red accent.
5. Do **not** remove or alter any other project's staging (`keep_files:false` wipes anything not
   staged). Verify by reading the `gh-pages` branch via the GitHub tools after the Action runs
   (outbound to github.io is blocked in-sandbox — don't curl the live URL).

---

## 11. Build plan — atomic iterations

Each iteration is **small, self-contained, and ends green** (all three verify scripts + syntax gate
pass, both themes, no regressions) and is committed separately. No iteration leaves the app in a
half-built or placeholder state. Phases A–D group them; within a phase, order matters.

### Phase A — Foundation: multi-format core + premium design system (Iceberg only, risk isolation)

*No new teaching content and no placeholders in this phase — but it DOES include a deliberate visual
upgrade to the polish design system (§6a), verified with before/after screenshots so nothing regresses.*

- **IT-1 · Namespace generalization.** Introduce `window.TableViz` (`TV`) with `window.IcebergViz = TV`
  (+ `IV` alias). No behavioral change. *Verify: full harness green.*
- **IT-2 · Format registry + registration.** Add `TV.formats` (only `iceberg`), `TV.registerModule`,
  format-keyed `TV.modules`; convert each Iceberg module's registration line; make
  `getScreens/getNavGroups/currentScreenId` format-aware. *Verify: green.*
- **IT-3 · 3-segment router + per-format persistence.** Parse `#<format>/<screen>/<step>`; keep bare
  `#screen` working; namespace localStorage to `tv-<format>-…` with one-time `iv-…` migration;
  `_syncStepToUrl` writes the format segment. *Verify: deep-links, resume, back-compat green.*
- **IT-4 · Design tokens + recoloring system (§1–§2, §6a).** Install the polish token set (layered bg,
  text ramp, motion tokens + easings, radius/shadow scale, stripe/success/flame, dark `--code-bg`),
  warm-paper light theme, and unify recoloring so `data-format` drives `--brand/--brand-2/--brand-glow`
  (Iceberg = blue→cyan). Route every color through tokens. *Verify: both themes; screenshot review.*
- **IT-5 · Motion & choreography (§3, §4.7).** Universal control transition + hover-lift/press-settle;
  pixel-height accordion for nav groups; the three route cues (nav-progress bar, content rise-in,
  reading-progress); unified modal choreography (scrim blur + card rise) applied to command palette +
  quiz modal + shortcuts modal; all gated behind `prefers-reduced-motion`; must not touch in-module
  `AnimationEngine` timing. *Verify: `verify` + `verify:anim` green.*
- **IT-6 · Premium shell components + micro-interactions (§4.3–4.4, §4.6, §5, §8).** Left-edge section
  stripes + uppercase micro-labels; glowing active-nav bar + slim per-category progress bars;
  hamburger→X morph; animated sidebar collapse (grid track→0); premium code-viewer (dark slab, indent
  guides, copy-pulse); toast; refined empty/search-empty states. *Verify: green.*
- **IT-7 · Format switcher + responsive/a11y pass (§2, §6, §7).** Registry-driven switcher styled as the
  premium segmented pill (single-format collapse → static brand label, never an empty control);
  ≤1100px icon-only scrollable toolbar; ≤900px off-canvas drawer; coarse-pointer 34–44px targets;
  `:focus-visible` rings, ARIA, focus trap/Esc/restore on every overlay. *Verify: green — closes Phase
  A with the full premium system on the shipped Iceberg app, zero placeholders.*

### Phase B — Delta format (partitioned; inherits the whole design system for free)

Phase B is split into **6 partitions**, each = one Delta nav group fully built, verified green in both
formats, committed, and deployed. Within a partition, build module-by-module running `check` +
`verify:anim` after each so a regression is caught at the module that caused it.

**No-placeholder rule for Phase B (important).** Delta is registered from B1 but kept
`visible: false` (hidden from the switcher) while it is incomplete, so the **shipped UI never shows a
partial Delta** (no half-empty nav, no "coming soon"). Each partition is still deployable (Iceberg is
unaffected) and reviewed via local screenshots (temporarily enabling Delta in the screenshot run).
Delta is flipped `visible: true` only in **B6**, when it is complete — that is the moment the switcher
becomes a live Iceberg⇄Delta toggle in production.
*(Alternative if you prefer to watch it grow live: "reveal-and-grow" — flip `visible:true` at B1 and
grow Delta's `navGroups` group-by-group so only built screens ever appear. Also placeholder-free.
Decide at B1.)*

- **B1 · Foundation + Get Started.** `formats/delta.js` (brand red→amber, Δ logo, docsUrl,
  `visible:false`), `js/data/delta-concepts.js`, ShopKart Delta resolutions, `TV.QuestionBank.delta = {}`;
  **extend the verify harness to sweep every registered format** (so hidden Delta is verified too).
  Modules: `home`, `why-delta`, `architecture` (animated), `log-explorer` (interactive log tree).
  *Verify: both formats green; red→amber recoloring confirmed by screenshot.*
- **B2 · Write Operations.** `create-table`, `insert`, `update`, `delete`, `merge`, `overwrite`
  (all animated: log commits with add/remove actions; DV vs copy-on-write where relevant).
  *Verify: `verify:anim` green for Delta write ops.*
- **B3 · Read & Query.** `read-path` (star: log-replay from checkpoint + data skipping via file stats),
  `write-path` (commit protocol + optimistic conflict), `query-planner`, `time-travel`
  (`VERSION/TIMESTAMP AS OF`). *Verify.*
- **B4 · Log & Schema.** `version-explorer`, `commit-explorer` (pretty-printed action JSON),
  `checkpoint` (why checkpoints exist), `schema-evolution`, `partitioning` + generated columns,
  `liquid-clustering`. *Verify.*
- **B5 · Advanced Topics.** `concurrency` (OCC + isolation levels), `deletion-vectors`,
  `optimize` (bin-pack + Z-ORDER), `vacuum`, `change-data-feed`, `engine-integrations`. *Verify.*
- **B6 · Learn & Practice + reveal.** Delta `question-bank` (all screens), `interview` (~24 Q&A),
  `quiz` (~22), `study`, `cheatsheet`; wire Test-Yourself banks. **Flip Delta `visible: true`** →
  switcher becomes a live 2-way toggle. *Verify: full sweep green across both formats; quiz-modal
  contract green; switcher toggles brand + nav + docs correctly.*

### Phase C — Compare mode (registry-driven, N-pane ready)

- **IT-15 · Compare scaffold + decision matrix.** `formats/compare.js`, `overview` (data-driven columns
  = comparable formats → 2 now, 3-ready), Compare nav group. *Verify: exactly 2 balanced columns, no
  blank cell.*
- **IT-16 · Compare dynamics I.** N-pane single-engine `read-path`, `deletes`, `time-travel`. *Verify:
  panes advance in lockstep from one engine; `verify:anim`.*
- **IT-17 · Compare dynamics II + banks.** `schema-evolution`, `concurrency`, `maintenance`;
  `TV.QuestionBank.compare`. *Verify: full sweep green across iceberg + delta + compare.*

### Phase D — Learning-UX premium surfaces (cross-format study-tool polish, §4.5 + §5)

- **IT-18 · Progress, mastery & motivation surfaces.** Overall progress box (success-gradient);
  resume "continue where you left off" card; achievement stat tiles (visited/mastered + streak with
  flame `background-clip:text` gradient); activity heatmap; readiness ring (per-format quiz mastery);
  review-due chip. All read per-format `localStorage`; surfaced on each format's home + study deck via
  shared components (so both formats get them at once). *(Full spaced-repetition scheduling is optional
  — flagged, not required.)* *Verify: green in both formats.*

### Phase E — Ship

- **IT-19 · Deploy + portfolio + redirect (§10).** `git mv` folder → `table-formats-visualizer/`;
  update workflow to publish at `/lakehouse/` (or chosen path) + `/iceberg/` redirect stub; update the
  portfolio card. Push to the designated branch; verify `gh-pages` via GitHub tools. (PR only if asked.)

Within IT-10..IT-13, build modules in the group's listed order, running `check` + `verify:anim` after
each module so a regression is caught at the module that caused it.

---

## 11a. Adding a format later (Hudi) — the extension contract

This is the acceptance test for "N-format ready." When Hudi is built in a future session, it must be
achievable with **only** these additions and **no edits to core files** (`app.js` router/switcher,
engine, controls, features, verify harness structure):

1. Add `js/formats/hudi.js` → `TV.formats.hudi = { id, label:'Apache Hudi', short:'Hudi', visible:true,
   comparable:true, docsUrl, logoSvg (amber/green brand), navGroups }`.
2. Add `js/modules/hudi/*` module files, each `TV.registerModule('hudi', mod)`.
3. Add `js/data/hudi-concepts.js` and `TV.QuestionBank.hudi = {…}`; extend ShopKart resolutions.
4. Add `:root[data-format="hudi"]` brand tokens; add its `<script>` tags to `index.html`.
5. Register `comparePane` contributions for Compare modules that should include Hudi.

Then: the switcher shows a Hudi pill automatically, the decision matrix grows a Hudi column, Compare
modules render a third pane, keyboard adds `g u`, and the verify sweep picks Hudi up because it
iterates `TV.formats`. **If any of the above requires touching a core file, the abstraction in Phase A
is wrong — fix it in Phase A, not by special-casing Hudi.** Nothing about Hudi is built or surfaced now.

---

## 12. Verification harness (must pass before "done")

Port and generalize the three scripts:

- **`check-syntax.mjs`** — parse every `js/**/*.js`. `npm run check`.
- **`verify.mjs`** — Playwright sweep across **every format × every screen × 2 themes × 3 viewports**.
  Asserts: no console errors, no horizontal overflow, no empty module, drawer works, deep-links +
  resume, palette + progress render, nav collapse persists, a11y basics, **format switcher** works
  (switching rebuilds nav, swaps brand, updates docs link, routes to that format), and the
  **Test-Yourself modal** contract (button shows on a banked screen, hidden on a deliberately bankless
  screen, opens/grades/Esc-closes, nothing injected into `#module-container`). Update screen lists to
  both formats' nav.
- **`verify-animations.mjs`** — drive **every animated screen in every format** (and Compare's
  dual-pane modules) through real Play/Next/Prev/Reset/speed; assert Next advances, reaches final,
  Reset→idle, Play auto-advances (`setSpeed(8)`), Pause holds, label/counter update, no console
  errors, and — for Compare — **both panes advance in lockstep from one engine**.

Playwright Chromium is at `/opt/pw-browsers/chromium-*/chrome-linux/chrome`
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`); use `executablePath` if the pinned build differs — do
**not** run `playwright install`. Verify scripts set `tv-<format>-tour-done='1'` before asserting so
the tour overlay doesn't block hit-testing.

**Definition of done:** all three scripts green across both formats + Compare; all JS syntax-clean;
both themes correct in both brands; every animated module (and every Compare pane pair) passes the
driver; no animation layout disturbed by the quiz modal; old `/iceberg/` links redirect.

---

## 13. File inventory (after unification)

```
table-formats-visualizer/            (renamed from iceberg-visualizer/)
├── index.html                       (format switcher added; scripts list grows)
├── manifest.json  package.json  assets/
├── css/  main.css (tokens + per-format brand + light theme)  layout.css  components.css
│         animations.css  responsive.css  enhancements.css (+ format-switcher, .ty-modal)  print.css
├── js/
│   ├── data/  shopkart-data.js  iceberg-concepts.js  delta-concepts.js  question-bank.js
│   ├── core/  animation-engine.js  tooltip.js  keyboard.js  toast.js
│   ├── components/  code-viewer.js  animation-controls.js
│   ├── formats/                     (NEW) iceberg.js  delta.js  compare.js  (format registry entries)
│   ├── modules/
│   │   ├── iceberg/  (existing ~30 module files, moved here or kept + re-registered)
│   │   ├── delta/    (~30 new module files, §4–5)
│   │   └── compare/  (~7 dual-pane + overview, §7)
│   ├── features/  command-palette.js  progress.js  test-yourself.js  gestures.js  tour.js
│   └── app.js                        (router + format switcher + registries)
└── scripts/  check-syntax.mjs  verify.mjs  verify-animations.mjs  gen-assets.mjs
```

Script load order: **data → core → components → formats → modules(iceberg, delta, compare) → app →
features.** (App after modules so registries are populated; features after app so `TV` accessors
exist.)

---

## 14. Quality bar & the one open decision

**Quality bar:** match the existing app's polish — real typographic hierarchy, tokenized colors, both
themes in both brands, tabular-nums for stats, `overflow-x:auto` on wide content, visible focus,
`prefers-reduced-motion` respected. Diagrams show the *real* mechanism (the log, the actions, the
stats-based skipping), not decoration. Step narration is where the teaching happens — keep it specific.

**Open decisions:**
1. **Design-system re-tokenization (affects IT-4, i.e. early Phase A).** Re-tokenize the whole tool to
   the `UIUX-POLISH-SPEC.md` palette as one unified system (**recommended** — new "Open Table Formats"
   identity, screenshot-reviewed) vs. layer the polish patterns on today's exact Iceberg tokens.
2. **Deploy URL (affects IT-19 only).** **`/lakehouse/` with an `/iceberg/` redirect** (recommended)
   vs. keeping the `/iceberg/` path.

Neither blocks starting Phase A; #1 is settled at IT-4 and #2 at IT-19.

---

---

## Appendix A — Apache Hudi content plan (FUTURE — do not build or surface now)

Planned only, so the architecture accommodates it and a future session has the content ready. **Build
nothing Hudi in this effort; show nothing Hudi in the UI.** When the time comes, follow §11a.

**Brand:** amber→green gradient (`--brand` ≈ `#f6a821 → #4c9a2a`), distinct from Iceberg blue→purple
and Delta red→amber. Logo: a stylized "H"/timeline mark.

**Concept map (Hudi vs the shared ShopKart scenario):**

| Concept | Hudi mechanism |
|---|---|
| Table format core | **Timeline** in `.hoodie/` — an ordered log of *instants* (actions with states requested→inflight→completed) |
| Table types | **Copy-on-Write (CoW)** (rewrite base files) vs **Merge-on-Read (MoR)** (base Parquet + row-based **log files**, merged at read/compaction) |
| Commit unit | Timeline instants: `commit` (CoW), `deltacommit` (MoR), plus `compaction`, `clustering`, `clean`, `rollback`, `savepoint` |
| File layout | **File groups** / **file slices**: a base file + its log files, grouped by a **record key** |
| Record identity | **Record key + precombine** → native, efficient **upserts**; **record-level index** (Bloom, HBase, bucket, RLI) locates keys fast |
| Read acceleration | Partition pruning + column stats + **metadata table** (files/column_stats/record_index partitions) |
| Time travel | Query as of an instant / timestamp; incremental reads |
| Incremental query | **Native incremental pulls** — read only records changed after an instant (Hudi's signature feature) |
| Layout optimization | **Compaction** (MoR log→base), **clustering** (sort/z-order rewrite), **cleaning** (retain N commits) |
| Concurrency | OCC (external lock provider) + MVCC across readers/writers/table-services; **non-blocking concurrency control** (newer) |
| Cleanup | **Cleaner** service (commit retention) |
| Catalog | Hive metastore / Glue / catalog sync |
| Interop | Read via Onetable/**XTable** (Hudi↔Iceberg↔Delta) |

**Module list (mirror the 6-group nav):** home, why-hudi, architecture (timeline + `.hoodie`),
timeline-explorer (↔ log/metadata explorer), create-table, insert/upsert, update, delete, merge,
overwrite; read-path (index → file slices → merge), write-path (upsert commit), query-planner,
time-travel + **incremental-query** (Hudi-unique); instant-explorer, file-slices, compaction,
clustering, schema-evolution, partitioning; concurrency (OCC/NBCC), cow-vs-mor (Hudi-unique headline),
cleaning, metadata-table, record-index, engine-integrations; interview, quiz, study, cheatsheet.

**Animated vs static:** same split philosophy as Iceberg/Delta (operations + read/write/timeline
dynamics animated; home/why/explorers/learn static). Prefixes: `h`-scheme (`htl-` timeline,
`hfs-` file-slices, `hcmp-`… careful vs compare — use `hcpt-` compaction, `hclu-` clustering,
`hri-` record-index).

**Compare additions when Hudi lands:** the decision matrix gains a Hudi column automatically; add Hudi
`comparePane` contributions to read-path (index-based vs manifest vs log-replay), deletes, time-travel,
and a new Compare row for **incremental queries** and **CoW vs MoR** (Hudi's differentiators).

---

*End of spec. This unifies Iceberg and Delta into one format-aware, N-format-ready tool with a Compare
mode — with Apache Hudi planned (Appendix A) but entirely absent from the shipped UI until built. When
a mechanism is unclear, open the corresponding existing module and mirror it — only the content, the
per-format brand, and the added format/compare layers differ.*
