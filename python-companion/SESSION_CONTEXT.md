# PyRef — Python Companion: Session Context

> **Purpose of this file**: Handoff context for future Claude Code sessions working on the `python-companion` app inside the `Rajesh-Satuluri/My-Projects` repo. Read this before making any changes.

---

## Live URL

```
https://rajesh-satuluri.github.io/My-Projects/python-companion/
```

Iceberg Visualizer (co-deployed):
```
https://rajesh-satuluri.github.io/My-Projects/
```

---

## Repo & Branch

- **Repo**: `Rajesh-Satuluri/My-Projects`
- **Working branch**: `claude/iceberg-visualizer-v77ua8`
- **Deploy branch**: `gh-pages` (auto-managed by GitHub Actions)
- **Workflow file**: `.github/workflows/deploy-pages.yml`

Push to `claude/iceberg-visualizer-v77ua8` → GitHub Actions runs → deploys to `gh-pages`.

---

## Project Location

```
My-Projects/
├── .github/workflows/deploy-pages.yml   ← deploy workflow
├── iceberg-visualizer/                  ← separate app, deployed at site root
└── python-companion/
    ├── index.html                       ← full self-contained app (~754 lines)
    └── js/data/
        ├── python.js                    ← 93 fn cards, 4320 lines
        ├── numpy.js                     ← 9 fn cards, 362 lines
        ├── pandas.js                    ← 12 fn cards, 509 lines
        └── pyspark.js                   ← 13 fn cards, 606 lines
```

---

## Deploy Workflow

```yaml
# .github/workflows/deploy-pages.yml
- name: Stage site
  run: |
    mkdir -p /tmp/site
    cp -r iceberg-visualizer/. /tmp/site/    # iceberg at root
    cp -r python-companion /tmp/site/        # pyref at /python-companion/

- name: Deploy to gh-pages branch
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: /tmp/site
```

**Critical**: Do NOT use `publish_dir: .` with peaceiris/actions-gh-pages@v3 — it copies the repo's `.git` into the staging clone then deletes it, breaking the push. Always stage to `/tmp/site` first.

---

## App Architecture (`index.html`)

Single-file vanilla JS app — no framework, no build step. All CSS and JS are inline.

### Data loading

Each data file sets a global on `window`:

```js
window.PYREF_PYTHON  = { lang:'python', label:'Python', groups:[...] }
window.PYREF_NUMPY   = { lang:'numpy',  label:'NumPy',  groups:[...] }
window.PYREF_PANDAS  = { lang:'pandas', label:'Pandas', groups:[...] }
window.PYREF_PYSPARK = { lang:'pyspark',label:'PySpark',groups:[...] }
```

The app bridges these into a `LANGS` object:

```js
function loadDataFile(win_key, lang_key) {
  const src = window[win_key];
  if (!src) return;
  LANGS[lang_key] = { label: src.label, groups: src.groups };
}
loadDataFile('PYREF_PYTHON', 'python');
loadDataFile('PYREF_NUMPY',  'numpy');
loadDataFile('PYREF_PANDAS', 'pandas');
loadDataFile('PYREF_PYSPARK','pyspark');
```

### Schema normalization

Data files use `badge:` and `default:` — the app normalizes in `renderCard()`:

```js
const badgeList = fn.badge || fn.badges || [];   // both forms accepted
const defVal = p.def !== undefined ? p.def : p.default;
```

### State

```js
const S = {
  lang: 'python',
  cat: null,
  favs: new Set(JSON.parse(localStorage.getItem('pyref_favs') || '[]')),
  recent: JSON.parse(localStorage.getItem('pyref_recent') || '[]'),
  theme: localStorage.getItem('pyref_theme') || 'auto'
};
```

### Key functions

| Function | Purpose |
|---|---|
| `hl(code)` | Syntax highlighter using KW + BI token sets |
| `renderCard(fn)` | Renders full fn card HTML |
| `buildNav()` | Builds left sidebar from LANGS data |
| `selCat(lang, catKey)` | Selects a category, renders cards |
| `switchLang(lang)` | Switches between python/numpy/pandas/pyspark |
| `toggleCard(id)` | Expand/collapse a card |
| `copyFn(id)` | Copies code snippet to clipboard |
| `toggleFav(id)` | Adds/removes from favs (localStorage) |
| `buildIdx()` | Builds full-text search index |
| `doSearch(q)` | Runs search across all cards |
| `applyTheme(t)` | Applies dark/light/auto theme |
| `cycleTheme()` | Cycles through themes |

---

## Data Schema (fn card)

```js
{
  id: 'str-join',                          // unique, kebab-case
  name: 'str.join()',                      // display name
  purpose: 'one-line description',
  badge: ['builtin', 'method'],            // see badge list below
  snippet: "', '.join(words)",             // short example shown in collapsed state
  sig: 'str.join(iterable) → str',        // type signature
  meta: {
    ret: 'str',
    mut: false,                            // mutates input?
    time: 'O(n)',
    space: 'O(n)'
  },
  params: [
    {
      name: 'iterable',
      type: 'Iterable[str]',
      req: true,                           // required parameter
      desc: 'All elements must be strings'
    },
    {
      name: 'sep',
      type: 'str',
      default: "''",                       // use `default:` NOT `def:` in data files
      desc: 'Separator inserted between items'
    }
  ],
  code: `...multi-line code block...`,    // template literal; use \\ for Python backslashes
  related: ['str-split', 'str-format'],   // other card ids
  tags: ['string', 'join', 'separator'],
  interview: [
    'Avoid + concatenation in loops — join is O(n), repeated + is O(n²)',
  ],
  mistakes: ['Passing non-string iterables raises TypeError.'],
  notes: ['str.join() is called on the separator, not the list.']
}
```

### Valid badge values

| Badge | Color | Meaning |
|---|---|---|
| `builtin` | blue | Python built-in |
| `method` | teal | Method on an object |
| `mut` | orange | Mutates in-place |
| `safe` | green | Returns new object |
| `func` | purple | Standalone function |
| `lazy` | yellow | Lazy/iterator |
| `o1` | green | O(1) time |
| `on` | yellow | O(n) time |
| `numpy` | amber | NumPy-specific |
| `pandas` | emerald | Pandas-specific |
| `pyspark` | orange | PySpark-specific |

---

## Data File Structure (LANGS hierarchy)

```
window.PYREF_PYTHON = {
  lang: 'python',
  label: 'Python',
  groups: [
    {
      label: 'Standard Library',          // group label (sidebar section header)
      cats: [
        {
          key: 'builtins',                // category key (used in URL/state)
          label: 'Built-in Functions',
          fns: [ ...cards... ],           // array of fn card objects
          notes: ['footer note for this category']
        },
        ...
      ]
    },
    ...
  ]
}
```

---

## Current Card Inventory

### python.js — 93 fn cards

**Group: Standard Library**

| Category key | Cards |
|---|---|
| `builtins` | enumerate, zip, map, filter, sorted, range, len, isinstance, any-all, sum-min-max, hasattr-getattr, callable |
| `collections` | counter, defaultdict, deque, itertools-chain, itertools-product, itertools-combinations, itertools-islice, itertools-groupby, heapq-basics, functools-lru-cache, functools-partial, math-basics, random-basics, json-basics, os-sys-basics |

**Group: Core Python**

| Category key | Cards |
|---|---|
| `variables` | var-int-float, var-bool-none, var-type-convert, var-unpack, var-scope |
| `strings` | str-join, str-split, str-strip, str-replace, str-find, str-count, str-format, str-starts-ends, **str-case**, **str-check**, **str-slice**, **str-bytes** |
| `lists` | list-append-extend, list-pop, list-sort, list-comprehension, **list-insert-del**, **list-copy**, **list-index-count**, **list-reverse**, **list-stack**, **list-nested** |
| `dicts` | dict-get, dict-items, dict-update, dict-setdefault, **dict-comprehension**, **dict-merge**, **dict-pop**, **dict-fromkeys**, **dict-ordering**, **dict-patterns** |
| `sets` | set-add-discard, set-ops, set-comprehension, set-subset, set-update |
| `tuples` | tuple-basics, tuple-unpack, tuple-named, tuple-methods, tuple-zip, tuple-as-key |
| `functions` | fn-args, lambda, generator |
| `classes` | class-basics, class-dataclass, class-property, class-inheritance |
| `algorithms` | bisect, re-basics, re-groups, exceptions-basics, context-manager, decorators-basics, pathlib-basics |

**Group: Interview Patterns**

| Category key | Cards |
|---|---|
| `two-pointers` | two-pointers |
| `bfs-dfs` | bfs-dfs-basics |
| `dp-memoize` | dp-basics |
| `bit-tricks` | bit-ops |

> **Bold** = added in Iteration 2 (this session). Non-bold = added in Iteration 1 or prior sessions.

### numpy.js — 9 fn cards
`np-array`, `np-reshape`, `np-slice`, `np-where`, `np-sort`, `np-linalg`, `np-vectorize`, `np-random`, `np-stack`

### pandas.js — 12 fn cards
`pd-dataframe`, `pd-loc-iloc`, `pd-groupby`, `pd-apply`, `pd-missing`, `pd-pivot`, `pd-datetime`, `pd-merge`, `pd-value-counts`, `pd-astype`, `pd-cut`, `pd-assign-pipe`

### pyspark.js — 13 fn cards
`spark-session`, `spark-select`, `spark-filter`, `spark-groupby`, `spark-join`, `spark-window`, `spark-when`, `spark-udf`, `spark-perf`, `spark-array-struct`, `spark-schema`, `spark-read-write`, `spark-delta-merge`

---

## What Was Done This Session

1. **Iteration 2** — Added 16 fn cards to `python.js`:
   - Strings +4: `str-case`, `str-check`, `str-slice`, `str-bytes`
   - Lists +6: `list-insert-del`, `list-copy`, `list-index-count`, `list-reverse`, `list-stack`, `list-nested`
   - Dicts +6: `dict-comprehension`, `dict-merge`, `dict-pop`, `dict-fromkeys`, `dict-ordering`, `dict-patterns`

2. **Created `python-companion/index.html`** — full self-contained app (CSS + HTML + JS, no build step)

3. **Copied data files** from `origin/claude/python-pyspark-companion` branch:
   - `python-companion/js/data/numpy.js`
   - `python-companion/js/data/pandas.js`
   - `python-companion/js/data/pyspark.js`

4. **Deployed to GitHub Pages** — updated workflow, fixed staging bug, confirmed live

---

## Pending Work (Planned Iterations)

The original plan has 13 iterations for Phase 1 (Python + NumPy), then Phases 2–6 for Pandas/PySpark expansion.

### Remaining Python iterations (3–13)

| Iter | Target category | Cards to add |
|---|---|---|
| 3 | `functions` | closures, *args/**kwargs deep-dive, first-class functions |
| 4 | `classes` | dunder methods, slots, ABC, mixins |
| 5 | `sets` | frozenset, set math patterns |
| 6 | `tuples` | namedtuple vs dataclass comparison |
| 7 | `algorithms` | more bisect patterns, sorting tricks |
| 8 | `exceptions` | custom exceptions, exception chaining, ExceptionGroup |
| 9 | `context-managers` | contextlib, async context managers |
| 10 | `decorators` | @staticmethod, @classmethod, wraps, stacking |
| 11 | `pathlib` | glob, rglob, stat, file ops |
| 12 | `itertools` | more combinations: pairwise, batched (3.12+) |
| 13 | `interview patterns` | sliding window, monotonic stack, union-find, trie |

### NumPy iterations (planned)

Add cards for: `np-ufunc`, `np-broadcast`, `np-einsum`, `np-masked`, `np-fft`, `np-io`

### Future phases

- **Phase 2**: Pandas expansion (~20 more cards: window functions, explode, json_normalize, styler)
- **Phase 3**: PySpark expansion (~15 more cards: streaming, ml pipeline, catalog)
- **Phase 4**: Recipe/comparison data files (side-by-side Python vs Pandas vs PySpark)
- **Phase 5**: Recipe view UI in index.html
- **Phase 6**: Polish — search improvements, keyboard nav, mobile layout

---

## Key Gotchas

1. **`badge:` not `badges:`** — data files use `badge:['builtin']`; the app normalizes both forms
2. **`default:` not `def:`** — params use `default:'value'`; the app normalizes both forms
3. **Template literals + Python backslashes** — use `\\` inside template literal code blocks wherever Python needs a single `\` (e.g., `\\n`, `\\t`, `re.search(r'\\d+')`)
4. **JS syntax validation** before committing: `node -e "const vm=require('vm'),fs=require('fs'); new vm.Script(fs.readFileSync('python-companion/js/data/python.js','utf8')); console.log('OK')"`
5. **Card IDs** use `id:` field, **category keys** use `key:` field — these are different things
6. **Data file globals** — each file sets `window.PYREF_<LANG>` (not a module export)

---

## Git History (this session)

```
7481559  Fix deploy workflow: stage files to /tmp/site before gh-pages push
0637685  Add python-companion app and update deploy workflow to publish full site
2cd0040  feat(python-data): add iter1+2 — Variables, Tuples, Sets, Strings, Lists, Dicts expansions
```
