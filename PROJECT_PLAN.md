# Apache Iceberg Visualizer — Project Plan

## Project Overview
A professional interactive learning application that teaches Apache Iceberg visually.
Stack: Vanilla HTML/CSS/JS only. Entry point: `iceberg-visualizer/index.html`.
Primary source of truth: Apache Iceberg Engineering Handbook (ShopKart, Volumes I–IV).

---

## Architecture Decisions

### File Organization
```
iceberg-visualizer/
├── index.html                    # Shell, loads all scripts in order
├── css/
│   ├── main.css                  # Design tokens, typography, reset
│   ├── layout.css                # Sidebar, topbar, content, controls
│   ├── components.css            # Buttons, cards, badges, tooltips
│   └── animations.css            # Keyframes, animation-specific styles
├── js/
│   ├── app.js                    # Bootstrap, router, navigation builder
│   ├── core/
│   │   ├── animation-engine.js   # Reusable step-player (play/pause/step/speed)
│   │   ├── tooltip.js            # Hover tooltip system
│   │   └── keyboard.js           # Global keyboard shortcuts
│   ├── components/
│   │   ├── animation-controls.js # Play/pause/step/speed UI bar
│   │   └── code-viewer.js        # Syntax-highlighted code blocks
│   ├── data/
│   │   ├── shopkart-data.js      # ALL ShopKart metadata from handbook
│   │   └── iceberg-concepts.js   # Concept definitions, interview Q&A
│   └── modules/
│       ├── home.js
│       ├── why-iceberg.js
│       ├── architecture.js
│       ├── metadata-explorer.js
│       └── [future modules]
└── assets/
    └── icons/
```

### Global Namespace
All code lives under `window.IcebergViz` to avoid collisions.

### Module Contract
Every module exports:
```javascript
{
  id: string,
  title: string,
  group: string,
  render(container: HTMLElement): void,
  destroy(): void
}
```

### Routing
Hash-based: `#home`, `#architecture`, etc.
Router calls `module.destroy()` before loading the next module.

### Animation Engine
`AnimationEngine` class with: `play()`, `pause()`, `reset()`, `next()`, `prev()`, `setSpeed(n)`.
Steps have `enter(ctx)` and optional `exit(ctx)` for reverse animation.

---

## Navigation Groups & Modules

| Group | Module | ID | Status |
|---|---|---|---|
| Foundations | Home | home | ✅ Iteration 1 |
| Foundations | Why Iceberg | why-iceberg | ✅ Iteration 1 |
| Foundations | Architecture | architecture | ✅ Iteration 1 |
| Metadata | Metadata Explorer | metadata-explorer | ✅ Iteration 1 |
| Metadata | Snapshot Explorer | snapshot-explorer | 🔲 Iteration 2 |
| Metadata | Manifest Explorer | manifest-explorer | 🔲 Iteration 2 |
| Operations | CREATE TABLE | create-table | 🔲 Iteration 2 |
| Operations | INSERT | insert | 🔲 Iteration 2 |
| Operations | UPDATE | update | 🔲 Iteration 3 |
| Operations | DELETE | delete | 🔲 Iteration 3 |
| Operations | MERGE | merge | 🔲 Iteration 3 |
| Operations | OVERWRITE | overwrite | 🔲 Iteration 3 |
| Operations | APPEND | append | 🔲 Iteration 3 |
| Query Engine | Read Path | read-path | 🔲 Iteration 4 |
| Query Engine | Write Path | write-path | 🔲 Iteration 4 |
| Query Engine | Query Planner | query-planner | 🔲 Iteration 4 |
| Schema | Schema Evolution | schema-evolution | 🔲 Iteration 2 |
| Schema | Hidden Partitioning | hidden-partitioning | 🔲 Iteration 2 |
| Schema | Partition Evolution | partition-evolution | 🔲 Iteration 2 |
| Advanced | Time Travel | time-travel | 🔲 Iteration 3 |
| Advanced | Concurrency Simulator | concurrency | 🔲 Iteration 4 |
| Advanced | Catalog Explorer | catalog-explorer | 🔲 Iteration 3 |
| Integrations | Engine Integrations | engines | 🔲 Iteration 4 |
| Maintenance | Maintenance Operations | maintenance | 🔲 Iteration 4 |
| Performance | Performance Simulator | performance | 🔲 Iteration 5 |
| Learn | Interview Mode | interview | 🔲 Iteration 5 |
| Learn | Quiz Mode | quiz | 🔲 Iteration 5 |
| Learn | Cheat Sheets | cheatsheets | 🔲 Iteration 5 |

---

## Iteration Log

### Iteration 1 — Foundation + Core Modules
**Date:** 2026-08-01
**Completed:**
- Full CSS design system (dark theme, glassmorphism, animation styles)
- Animation Engine (reusable step-player)
- Tooltip system
- Keyboard shortcuts system
- Animation controls component
- Code viewer with syntax highlighting (JSON, SQL, Python)
- ShopKart data layer (all metadata from handbook)
- Home module (hero, stats, feature grid, learning path)
- Why Iceberg module (animated 5 problems, 3 innovations, comparison table)
- Architecture module (interactive SVG hierarchy + query path animation)
- Metadata Explorer module (S3 tree + content viewer)

**Architectural decisions made:**
- Hash routing (no build tools)
- Module pattern with destroy() lifecycle
- AnimationEngine class decoupled from DOM
- All ShopKart data centralized in shopkart-data.js
- CSS custom properties used for all theming (easy future dark/light toggle)

**Technical debt:**
- Code viewer syntax highlighting is regex-based (not a full parser)
- Animation reversal (prev step) resets container instead of true reverse

**Next iteration:**
- Snapshot Explorer, Manifest Explorer
- Schema Evolution, Hidden Partitioning, Partition Evolution
- CREATE TABLE and INSERT operations with full file-creation animations

---

## Design System Reference

### Colors
- `--bg-1`: #0d1117 (main background)
- `--bg-2`: #161b22 (sidebar, cards)
- `--bg-3`: #21262d (elevated surfaces)
- `--accent-blue`: #58a6ff
- `--accent-orange`: #f97316 (Iceberg brand)
- `--accent-green`: #3fb950
- `--accent-red`: #f85149
- `--accent-purple`: #a371f7

### Typography
- UI: system-ui, -apple-system, "Segoe UI"
- Mono: "SF Mono", "Cascadia Code", "Fira Code", Consolas

### Spacing
- Base unit: 4px
- Common: 8, 12, 16, 24, 32, 48, 64px
