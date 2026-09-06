# UI / UX & Polish Spec — "Premium Study Tool" Design System

A portable, framework-agnostic specification of every UI/UX and polish decision
built into the **Data Engineering Coding Stack** (an interactive study tool). Hand
this file to another tool/agent as the reference for making a different product
look and feel at the same "$1000 paid subscription" quality.

Nothing here depends on a framework — it's vanilla HTML/CSS/JS. The *values,
patterns, and rules* are what matter; port them into whatever stack you're using
(React, Vue, Tailwind, etc.). All CSS variable names below are the actual tokens
used; copy them verbatim so the system stays internally consistent.

---

## 0. Design philosophy (the "why")

Every rule below serves five principles. When in doubt, optimize for these:

1. **Calm, dark-first surface.** A near-black layered background lets colored
   accents and code carry all the visual energy. Nothing shouts.
2. **One accent, recolored by context.** The whole UI adopts a single accent
   color that changes with the active section/stack. This makes "where am I"
   instant without extra chrome.
3. **Motion confirms, never decorates.** Every animation answers "did my action
   register?" or "where did this come from?" Durations are short (120–320ms).
   Everything respects `prefers-reduced-motion`.
4. **Scannable hierarchy.** Left-edge accent stripes, uppercase micro-labels,
   pill badges, and generous whitespace let the eye triage a dense page fast.
5. **Touch- and keyboard-first, not mouse-only.** 34–44px tap targets, visible
   focus rings, a ⌘K command palette, and full keyboard nav are baseline, not
   extras.

---

## 1. Design tokens (copy verbatim)

Define these as CSS custom properties on `:root`. This is the single source of
truth — components reference tokens, never raw hex.

### 1.1 Color — dark theme (default)

```css
:root {
  /* layered backgrounds: 0 = deepest (page), 3 = highest (raised chips) */
  --bg-0: #0a0e17;   --bg-1: #0e1420;   --bg-2: #131b2b;   --bg-3: #1a2334;
  --border: #223047;        --border-soft: #1a2536;

  /* text ramp: full → secondary → muted */
  --text: #e6edf7;   --text-2: #b3c0d6;   --muted: #7e8da8;

  /* the accent (recolored per context — see §2) */
  --brand: #4f8cff;   --brand-2: #22d3ee;   --brand-glow: rgba(79,140,255,.25);

  /* semantic */
  --green: #34d399;  --amber: #fbbf24;  --red: #fb7185;
  --easy: #34d399;   --medium: #fbbf24; --hard: #fb7185;

  /* code panel stays dark in both themes (a deliberate, readable slab) */
  --code-bg: #0c1017;
  --indent-guide: rgba(255,255,255,.09);

  /* achievement accents — distinct from difficulty green */
  --success: #10b981;  --success-2: #2dd4bf;  --success-glow: rgba(16,185,129,.28);
  /* streak / reward — warm, unmistakable */
  --flame-1: #fbbf24;  --flame-2: #fb5a5a;

  /* section left-edge accent stripes (scannable identity per section type) */
  --stripe-neutral:#33455f; --stripe-logic:#4f8cff; --stripe-code:#22d3ee;
  --stripe-complexity:#fbbf24; --stripe-recognize:#a78bfa;
  --stripe-recall:#f472b6; --stripe-srs:#10b981;

  --shadow: 0 10px 40px rgba(0,0,0,.45);
  --lift:   0 6px 20px rgba(0,0,0,.22);
  --radius: 14px;   --radius-sm: 9px;
}
```

### 1.2 Color — light theme

Light mode is **warm-neutral paper**, not stark blue-white — softer and more
premium. Toggle via `html[data-theme="light"]`. Note the code panel stays dark.

```css
html[data-theme="light"] {
  --bg-0:#f3f1ec; --bg-1:#ffffff; --bg-2:#f7f5f0; --bg-3:#edeae2;
  --border:#e2ded4; --border-soft:#edeae2;
  --text:#1f2430; --text-2:#46505f; --muted:#78808e;
  --brand:#2f6bff; --brand-2:#0e94a6; --brand-glow:rgba(47,107,255,.16);
  --green:#059669; --amber:#b45309; --red:#e11d48;
  --easy:#059669; --medium:#b45309; --hard:#e11d48;
  --code-bg:#0c1017;                 /* code stays dark on purpose */
  --success:#059669; --success-2:#0d9488; --success-glow:rgba(5,150,105,.18);
  --flame-1:#f59e0b; --flame-2:#e11d48;
  --shadow: 0 10px 34px rgba(60,50,30,.10);
}
```

**Theme rule:** define the *complete* palette on `:root` (dark). Redefine only
the tokens that change under `html[data-theme="light"]`. Every color a component
uses must resolve to a token so theme switching is free. Persist the choice in
`localStorage` and reflect it in a toggle whose label reads the *action*
("☀ Light theme" / "☾ Dark theme").

### 1.3 Typography

```css
--font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
--mono: "SF Mono", "JetBrains Mono", "Fira Code", ui-monospace, Menlo, Consolas, monospace;
```
- Body: 15px / line-height 1.6, `-webkit-font-smoothing: antialiased`.
- Page title (hero): 27px, weight 750, letter-spacing −0.4px.
- Section head: 15px/700. Card head: 13–15px/800.
- **Micro-labels** (the premium tell): 10.5–11px, weight 700–800, `text-transform:
  uppercase`, `letter-spacing: .5–.7px`, colored `--muted` or `--brand-2`. Use
  these above every value/group.
- Inline `code`: 0.88em mono, `--bg-3` chip with soft border, `--brand-2` text.

### 1.4 Layout tokens

```css
--topbar-h: 56px;   --sidebar-w: 320px;
```
Shell = CSS grid `grid-template-columns: var(--sidebar-w) 1fr`, height
`calc(100vh - var(--topbar-h))`. Sidebar and main each own their scroll.

---

## 2. The recoloring-accent system (signature move)

The single most identity-defining decision: **the entire UI recolors to the
active context.** Set `data-stack` (or a section attribute) on `<body>` and
override just three tokens. Everything — buttons, focus rings, progress bars,
active nav markers, rings — follows because they all reference `--brand`.

```css
body[data-stack="numpy"]  { --brand:#37b24d; --brand-2:#69db7c; --brand-glow:rgba(55,178,77,.35); }
body[data-stack="pandas"] { --brand:#845ef7; --brand-2:#b197fc; --brand-glow:rgba(132,94,247,.35); }
body[data-stack="spark"]  { --brand:#f76707; --brand-2:#ffa94d; --brand-glow:rgba(247,103,7,.35); }
body[data-stack="sql"]    { --brand:#0ca678; --brand-2:#38d9a9; --brand-glow:rgba(12,166,120,.35); }
/* default context keeps the blue from :root */
```

**Rule for porting:** pick one accent per top-level section of your product.
Never hardcode that accent in components — always go through `--brand` /
`--brand-2` / `--brand-glow` so one attribute flip recolors the whole screen.

---

## 3. Motion system

### 3.1 Duration & easing tokens

```css
--dur-fast: 120ms;   /* hovers, taps, color changes */
--dur:      200ms;   /* most transitions */
--dur-slow: 320ms;   /* drawer, sidebar collapse */
--dur-cat:  280ms;   /* accordion expand/collapse */
--ease:     cubic-bezier(.2,.8,.2,1);    /* decelerate — for enters */
--ease-in:  cubic-bezier(.4,0,1,1);      /* accelerate — for exits */
--ease-cat: cubic-bezier(.33,0,.2,1);    /* balanced ease-in-out — visible across whole duration */
```

**Rules:**
- Enters/reveals use `--ease` (decelerate, lands softly).
- Accordions/drawers use `--ease-cat` (motion is visible the whole way, no snap).
- Hover/press feedback uses `--dur-fast`.
- Never animate `width`/`height:auto`/`display`. Animate `transform`, `opacity`,
  or an explicit pixel height (see §3.3).

### 3.2 Universal interactive feedback (apply to ALL controls)

One shared transition on every button/input, plus hover-lift and press-settle:

```css
.btn, .chip, .nav-item, .tab, input, select, textarea /* …all controls */ {
  transition: background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
              color var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease),
              box-shadow var(--dur-fast) var(--ease), filter var(--dur-fast) var(--ease);
}
/* hover: rise + soft shadow on pill buttons */
.pill-btn:hover { transform: translateY(-1px); box-shadow: var(--lift); }
/* press: settle down + barely shrink — tactile */
.btn:active { transform: translateY(1px) scale(.99); }
/* nav rows slide toward the reader on hover */
.nav-item:hover { transform: translateX(3px); }
```

### 3.3 Accordion collapse — the buttery pattern (critical)

Animating `height` between `auto` and `0` doesn't work; Safari snaps grid-`fr`
transitions. The robust cross-browser method: **pin the current pixel height,
force a reflow, then transition to the target pixel height, and settle back to
`auto` on `transitionend`.** This handles mid-flight interruption.

```js
function animateCollapse(toggleEl, outer, open) {
  if (!outer) return;
  var startH = outer.getBoundingClientRect().height; // works even mid-animation
  toggleEl.classList.toggle("collapsed", !open);
  outer.style.height = startH + "px";  // auto -> explicit px
  void outer.offsetHeight;             // force reflow so the next change animates
  if (open) {
    outer.style.height = outer.scrollHeight + "px";
    onHeightEnd(outer, function () {   // settle to auto so later content isn't clipped…
      if (!toggleEl.classList.contains("collapsed")) outer.style.height = "auto"; // …unless re-collapsed mid-flight
    });
  } else {
    outer.style.height = "0px";
  }
}
```
CSS side: `.outer { overflow:hidden; transition:height var(--dur-cat) var(--ease-cat); will-change:height; }`
and fade the inner list `opacity` in tandem for extra polish. Rotate the caret
with a class, don't swap the glyph: `.collapsed .caret { transform: rotate(-90deg); }`.

### 3.4 Route/navigation motion

Three coordinated cues on every navigation:

1. **Top progress bar** — a 2px gradient bar that shoots to 82%, then 100% + fades.
   Purely perceptual (there's no real load); it makes navigation feel instant-yet-substantial.
   ```js
   function navProgress() {
     var b = el("navProgress"); b.classList.remove("done"); b.classList.add("run");
     b.style.width="0%"; void b.offsetWidth; b.style.width="82%";
     clearTimeout(navProgress._t);
     navProgress._t = setTimeout(function(){ b.style.width="100%"; b.classList.add("done");
       setTimeout(function(){ b.classList.remove("run","done"); b.style.width="0%"; },240); },170);
   }
   ```
   ```css
   .nav-progress{position:fixed;top:0;left:0;height:2px;width:0;z-index:400;
     background:linear-gradient(90deg,var(--brand),var(--brand-2));
     box-shadow:0 0 8px var(--brand-glow);opacity:0;
     transition:width .18s var(--ease),opacity .24s var(--ease);pointer-events:none}
   .nav-progress.run{opacity:1} .nav-progress.done{opacity:0}
   ```
2. **Content rise-in** — the main pane fades up 6px on each route change:
   ```css
   @keyframes mainEnter{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
   .main.main-enter{animation:mainEnter 170ms var(--ease)}
   ```
   Re-trigger by removing the class, forcing reflow (`void m.offsetWidth`), re-adding.
3. **Reading-progress bar** — a thin accent bar just under the top bar that tracks
   scroll depth on long article/"learn" pages only (`transition:width .08s linear`).

Bundle these into one `afterRender()` that also: sets `document.title` from the
page heading, smooth-scrolls the active sidebar item into view, and adds
`title=` tooltips to any nav labels that are truncated (only when
`scrollWidth > clientWidth`).

### 3.5 Reduced motion (non-negotiable)

```css
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{
    animation-duration:.001ms!important; animation-iteration-count:1!important;
    transition-duration:.001ms!important; scroll-behavior:auto!important;
  }
}
```

---

## 4. Component patterns

### 4.1 Top bar

Sticky, 56px, `--bg-1`, bottom border. Left: brand mark (30px gradient-filled
rounded square, `linear-gradient(135deg,var(--brand),var(--brand-2))`, dark glyph
`#06111f`) + wordmark. Center: context/mode switches. Right (`margin-left:auto`,
`flex-wrap`): action buttons that collapse to icon-only on narrow screens (§6).

### 4.2 Buttons

- **Ghost button** (default): `--bg-2` fill, `--border`, `--text-2`; hover →
  `--brand` border + `--text`. Radius 8px.
- **Pill/segmented toggle**: rounded-999px track (`--bg-2`), each segment
  transparent; active segment = solid `--brand`, dark text `#06111f`, glow shadow.
- **Chip button** (filters/toggles): `--bg-2`; `.on` state = `--brand-glow` bg +
  `--brand` border.
- **CTA variants** using `color-mix`: "next" = success-tinted, "due" = brand-tinted.
- **Icon button**: no border, `--text-2`, hover → `--bg-3` bg.

### 4.3 Cards & sections

Sections carry a **left-edge accent stripe** via inset box-shadow keyed to type —
this is the scannability workhorse:
```css
.section{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;
  background:var(--bg-1);box-shadow:inset 3px 0 0 var(--stripe-neutral)}
.section[data-key="logic"]     {box-shadow:inset 3px 0 0 var(--stripe-logic)}
.section[data-key="code"]      {box-shadow:inset 3px 0 0 var(--stripe-code)}
.section[data-key="complexity"]{box-shadow:inset 3px 0 0 var(--stripe-complexity)}
/* …recognize / recall / srs each get their own stripe color */
```
Collapsible header: `--bg-2` bar with a rotating caret; body animates via §3.3.

### 4.4 Sidebar navigation

- Search input + filter-toggle row; collapsible filter panel (animate `max-height`
  + `opacity` + `padding`).
- **Compact category tools bar** with an uppercase label + a single
  expand/collapse-**all** caret button (rotates, doesn't swap glyph).
- Category headers with caret + icon + name + count-pill; body uses §3.3 collapse.
- Nav item: status glyph + title (ellipsis) + optional review/difficulty marker.
  - Hover: `translateX(3px)` + `--bg-2`.
  - Active: `--brand-glow` bg **and** a glowing 3px left accent bar
    (`::before`, `box-shadow:0 0 8px var(--brand-glow)`).
- **Slim per-category progress bar** (3px) under each category header:
  ```css
  .cat-prog{height:3px;border-radius:2px;background:var(--bg-3);margin:0 12px 6px;overflow:hidden}
  .cat-prog>i{display:block;height:100%;background:var(--brand);transition:width var(--dur) var(--ease)}
  ```

### 4.5 Overall progress box

Header row (label + count) → 6px track with a **success-gradient fill** that has a
glow shadow and `transition:width .45s var(--ease)` → footer caption.

### 4.6 Code blocks (premium detail)

Dark slab (`--code-bg`) in *both* themes with a title bar:
- Language label (uppercase mono micro-label) + action group (edited badge / Reset
  / lock-unlock / Copy).
- **VS-Code-style vertical indent guides** at zero added width via inset shadow:
  `.ind-g{box-shadow:inset 1px 0 0 var(--indent-guide)}` — so code never shifts.
- **Editable-in-place**: a `<textarea>` (`.code-edit`) whose metrics *exactly*
  match the read-only `<pre>` so locked↔unlocked never jumps; focus ring via inset
  box-shadow. Edits persist; an "EDITED" pill appears; Reset restores.
- Copy button gives a brightness pulse on `:active`.

### 4.7 Modals / overlays (consistent open choreography)

Every overlay (dashboard, command palette, cross-reference panel, onboarding)
shares the same entrance:
```css
.modal{position:fixed;inset:0;z-index:100;background:rgba(4,7,13,.7);
  display:grid;place-items:center;padding:30px;opacity:0;backdrop-filter:blur(0);
  transition:opacity var(--dur) var(--ease),backdrop-filter var(--dur) var(--ease)}
.modal.open{opacity:1;backdrop-filter:blur(3px)}
.modal.hidden{display:none}
.modal-card{transform:translateY(10px) scale(.985);opacity:.4;
  transition:transform var(--dur) var(--ease),opacity var(--dur) var(--ease)}
.modal.open .modal-card{transform:none;opacity:1}
```
Pattern: toggle `.hidden` to mount, then on next frame toggle `.open` to animate.
Scrim uses a dark translucent wash + **backdrop blur** (the premium tell). Lock
body scroll while open (`body.cmdk-lock{overflow:hidden}`). Trap focus; close on Esc.

### 4.8 Command palette (⌘K)

Full-screen dim + blur; centered 640px box that drops in
(`translateY(-8px) scale(.99)` → `none`, 160ms). Big borderless search input,
scrollable results grouped by uppercase section labels, keyboard-navigable rows
(`.sel` = highlighted), a footer hint row. Supports fuzzy search over all content
+ multi-step "guided path" drill-downs with live progress. This is table-stakes
for feeling like a pro tool.

### 4.9 Data tables

Wrap in `.table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}` so wide
tables scroll inside their box and never widen the page. Mono font, sticky header
(`--bg-2`), row hover `--bg-2`, soft row borders, italic muted "null" cells.

---

## 5. Signature micro-interactions

- **Hamburger → X morph.** 3 `<i>` bars; on open, bar 1 rotates +45° and drops to
  center, bar 2 fades + `scaleX(.4)`, bar 3 rotates −45° to center. Press scales
  the whole icon to .9.
  ```css
  .ham{position:relative;width:18px;height:14px}
  .ham i{position:absolute;left:0;right:0;height:2px;border-radius:2px;background:currentColor;
    transition:transform var(--dur) var(--ease-cat),opacity var(--dur-fast) var(--ease),top var(--dur) var(--ease-cat)}
  .ham i:nth-child(1){top:0} .ham i:nth-child(2){top:6px} .ham i:nth-child(3){top:12px}
  body.sidebar-open .ham i:nth-child(1){top:6px;transform:rotate(45deg)}
  body.sidebar-open .ham i:nth-child(2){opacity:0;transform:scaleX(.4)}
  body.sidebar-open .ham i:nth-child(3){top:6px;transform:rotate(-45deg)}
  ```
- **Single rotating caret for expand/collapse-all** (never swap ▾/▸ glyphs):
  `#toggleAll{transition:transform var(--dur) var(--ease-cat)} #toggleAll.collapsed{transform:rotate(-90deg)}`.
- **Desktop sidebar collapse** animates the grid track width to 0 (sidebar clips
  via `overflow:hidden`) instead of `display:none`, so it glides:
  `.shell{transition:grid-template-columns var(--dur-slow) var(--ease-cat)}
   body.sidebar-collapsed .shell{grid-template-columns:0 1fr}`.
- **Mobile drawer** slides in on `transform:translateX()` with a fading blur
  scrim behind it.
- **"Continue where you left off" resume card** — brand-bordered card with a
  `0 0 0 3px var(--brand-glow)` ring, hover lift; deep-links to last-visited item.
- **Achievement stat tiles** — "Solved" tile gets an emerald wash + `--success-2`
  number; "Streak" tile gets a warm flame gradient with the number rendered as a
  `background-clip:text` gradient (a genuinely premium touch).
- **Review-due chip** — invisible (opacity 0) when nothing's due; when due it fills
  with the brand gradient + glow and lifts on hover. State communicated purely by
  presence.
- **Toast** — bottom-center pill that rises in (`translateY(20px)`→0) + fades,
  auto-dismisses. Use for confirmations ("Copied", "Progress saved").
- **Activity heatmap** — GitHub-style contribution grid, 5 intensity levels
  keyed to the accent (`l0`–`l4`), future cells at opacity 0.
- **Readiness ring** — `conic-gradient(var(--brand) calc(var(--pct)*1%), var(--bg-3) 0)`
  with an inner `::after` circle punched out to make a donut; percentage centered.

---

## 6. Responsive & touch strategy

Breakpoints and rules that keep it flawless on 14"/15.6" laptops and iPad:

- **Never scroll the page sideways.** `body{overflow-x:hidden}`; every wide thing
  (code, tables, modal bodies) scrolls inside its own `overflow-x:auto` box with
  `-webkit-overflow-scrolling:touch`.
- **≤1100px:** toolbar buttons go **icon-only** (hide `.btx` label spans); toolbar
  itself becomes horizontally scrollable so nothing is ever clipped off-screen.
  *(This was a real bug: added buttons overflowed off an iPad and became
  unreachable — icon-collapse + scroll fixed it.)*
- **≤900px:** shell collapses to one column; sidebar becomes a fixed off-canvas
  drawer (86% width, max 340px) toggled by the hamburger; top bar wraps.
- **Touch targets:** `@media (pointer:coarse)` bumps chips/nav/menu items to
  min-height 34–44px (Apple HIG). Cards get min-heights so they stay tappable.
- Reduce hero/heading sizes and section side-margins on small screens.

---

## 7. Accessibility

- **Visible focus rings for keyboard users only:**
  ```css
  :focus-visible{outline:2px solid var(--brand);outline-offset:2px;border-radius:6px}
  button:focus:not(:focus-visible),a:focus:not(:focus-visible){outline:none}
  ```
  (Use `--brand-2` for the ring on dark overlays.)
- `role="dialog"` + `aria-modal="true"` on modals; `aria-label` on every icon-only
  button; `aria-label` on search inputs.
- Focus trap + Esc-to-close on every overlay; restore focus to the trigger on close.
- Honor `prefers-reduced-motion` (§3.5) and `prefers-color-scheme` for default theme.
- Maintain AA contrast: the `--text`/`--text-2`/`--muted` ramp is tuned for it on
  both grounds.

---

## 8. Empty & loading states (don't skip these)

- **Refined empty state:** centered column, 40px icon at 85% opacity, a 17px/700
  headline, a ≤340px muted subline that can include a `<kbd>⌘K</kbd>` hint. Fills
  60vh so it never looks broken.
- **Empty search in nav:** centered, with a 🔍 pseudo-element above the message.
- **Perceived-performance progress bar** (§3.4) stands in for real load latency.

---

## 9. Persistence & state (feel-continuous)

- All progress/preferences in `localStorage` under one namespaced key; wrap every
  read/write in try/catch and render correctly when empty.
- Remember: last-visited item (powers the resume card), theme, collapsed
  categories, per-item notes/edits, spaced-repetition schedule, activity log.
- On navigation, restore scroll/active states so returning feels seamless.

---

## 10. Porting checklist

Give this list to the implementing tool; each item is independently shippable.

- [ ] Install the token set (§1) on `:root` + a `[data-theme="light"]` override.
- [ ] Route every component color through tokens (no raw hex in components).
- [ ] Implement the recoloring-accent system (§2) — one attribute flips the theme.
- [ ] Add the motion tokens + universal control transition + hover-lift/press-settle (§3.1–3.2).
- [ ] Implement the pixel-height accordion pattern (§3.3) — not `height:auto`.
- [ ] Add the 3 route cues: top progress bar, content rise-in, reading progress (§3.4).
- [ ] Gate everything behind `prefers-reduced-motion` (§3.5).
- [ ] Build the modal open-choreography (scrim blur + card rise) and reuse it everywhere (§4.7).
- [ ] Add a ⌘K command palette (§4.8).
- [ ] Left-edge accent stripes on sections; glowing left bar on active nav (§4.3–4.4).
- [ ] Code blocks: dark-in-both-themes, indent guides, edit-in-place, copy pulse (§4.6).
- [ ] Hamburger→X morph + single rotating collapse-all caret + animated sidebar collapse (§5).
- [ ] Resume card, achievement stat tiles, toast, heatmap, readiness ring (§5).
- [ ] Responsive: no h-scroll, ≤1100 icon-only toolbar, ≤900 drawer, coarse-pointer tap sizes (§6).
- [ ] Accessibility: focus-visible rings, ARIA on modals/icon buttons, focus trap+Esc (§7).
- [ ] Refined empty/search-empty states (§8).
- [ ] localStorage persistence for progress/prefs/last-visited (§9).

---

### One-paragraph summary for the receiving tool

> Build a calm, dark-first (with warm-paper light mode) interface driven entirely
> by CSS custom-property tokens. Use a single accent color that recolors the whole
> UI per section by overriding three variables on a `data-` attribute. Keep motion
> short (120–320ms), purposeful, and always disabled under `prefers-reduced-motion`;
> animate `transform`/`opacity`/explicit-pixel-height only. Every control gets one
> shared transition plus a hover-lift and a press-settle. Reuse one modal
> choreography (translucent scrim + backdrop blur + card rise) for all overlays,
> add a ⌘K palette, and lean on scannability devices — left-edge accent stripes,
> uppercase micro-labels, pill badges, glowing active markers, and thin progress
> bars. Make it flawless on laptop and iPad (never scroll sideways; icon-only
> toolbar ≤1100px; off-canvas drawer ≤900px; 34–44px touch targets) and fully
> keyboard-accessible (focus-visible rings, ARIA, focus traps). Persist everything
> to localStorage so the experience feels continuous.
