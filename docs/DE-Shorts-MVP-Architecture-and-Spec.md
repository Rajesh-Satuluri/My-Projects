# DE Shorts — MVP Architecture & Build Spec (v1.0)

> **Purpose.** This is the single source of truth that reconciles the four prompt
> documents (Master, Architecture-First, AI/FDE, App-Inspirations) into one
> buildable spec. Where the prompts conflict or leave gaps, this document decides.
> Build from this. Update this via PR when a decision changes.
>
> **Status:** Draft for approval. No app code is written until this is approved.
> **Author of record:** anusha.satuluri@demandzen.com
> **Canonical device:** iQOO Neo 6 → design canvas **360 × 800 CSS px**, dark-first.

---

## 0. Guiding decisions (read this first)

These are the load-bearing decisions. Everything downstream follows from them.

1. **Local-first, cloud-optional.** MVP ships 100% offline (IndexedDB). A backend
   (Supabase) is added *only* when auth / cross-device sync / AI features are
   needed. The UI never touches storage directly — it goes through a
   **Repository interface**, so local→cloud is a swap, not a rewrite.
2. **Content is data, authored in git.** Concepts, questions, paths, and the graph
   are versioned JSON in this repo, validated in CI, reviewed by PR. The PR review
   *is* the technical-accuracy gate. No CMS for MVP.
3. **One canonical Concept → many derived views.** A Short, flashcard, MCQ,
   interview question, and review card all generate from one concept record.
   Never author the same knowledge twice.
4. **Vertical slice before breadth.** Build **Kafka** end-to-end at production
   polish (feed → learn → visual → recall → SRS → quiz → weak-area review) before
   authoring any other topic. Prove D1/D7 retention on one technology first.
5. **Do not build two hard engines from scratch.** Use **`ts-fsrs`** for spaced
   repetition. Compute **mastery** as a *separate* explicit formula. They are two
   systems, not one.
6. **The screen defines the content, never the reverse.** Every card has a content
   budget; an automated 360×800 render gate fails the build on overflow. Overflow
   is fixed by rewriting/splitting content, never by shrinking type.
7. **Ruthless MVP scope.** 4 Short types, 3 modes, ~6 SVG templates. The other
   10 short-types / 7 modes are post-MVP and only added when data justifies them.

---

## 1. Tech stack (all free-tier, all proven)

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Vite + React + TypeScript** | SPA app-shell, not SSR. |
| PWA | **vite-plugin-pwa** (Workbox) | Manifest, service worker, offline precache. |
| Gestures | **@use-gesture/react** + **Framer Motion** | Spring-physics swipe at 120Hz. |
| State | **Zustand** | Learning/session state. TanStack Query added with sync. |
| Local persistence | **Dexie.js** (IndexedDB) | Versioned migrations (see §7). LocalStorage for prefs only. |
| SRS | **`ts-fsrs`** | Do not reimplement. Scheduling only. |
| Styling | **Tailwind + CSS variables** | Dark-first tokens; theme via `data-theme`. |
| Diagrams | Hand-rolled **templated SVG** React components | ~6 templates, data-driven. No lib. |
| Content validation | **Ajv** (JSON Schema) + **Playwright** | Schema + 360×800 overflow gate in CI. |
| Backend (later) | **Supabase** free tier | Auth, Postgres+RLS, Realtime, pgvector, Edge Functions. |
| Native wrap (later) | **Capacitor** | Real haptics, store presence, reliable offline. |

**Bundle discipline:** target < 200KB gzipped JS for the app shell (excluding
content JSON, which is code-split per topic and lazy-loaded + SW-cached).

---

## 2. System architecture

```
CONTENT (static, versioned JSON, code-split per topic, CDN + SW-cached)
   concepts.json · questions.json · quick_paths.json · relationships.json
        │  read-only, immutable per content version
        ▼
APP (React PWA)
   Components ─▶ Repository layer ─▶ Dexie (IndexedDB)   ← progress, offline
        │                                   │
        │                                   │ sync when logged in (post-MVP)
        ▼                                   ▼
   Feed ranker · FSRS · Mastery · Session engine   SUPABASE (free)
                                          Auth · Postgres+RLS · Realtime
                                          pgvector (semantic search + tutor)
                                          Edge Functions (LLM key server-side)
```

**Repository interfaces (define these before any UI):**

```ts
interface ContentRepository {        // reads static JSON, never writes
  getConcept(id: string): Promise<Concept | null>;
  getConceptsByTopic(topic: string): Promise<Concept[]>;
  getQuickPath(id: string): Promise<QuickPath | null>;
  getQuestions(conceptId: string): Promise<Question[]>;
  getGraph(): Promise<Relationship[]>;
}

interface ProgressRepository {       // MVP: Dexie impl. Later: Supabase impl.
  getState(conceptId: string): Promise<LearningState | null>;
  setState(s: LearningState): Promise<void>;
  dueForReview(now: number): Promise<LearningState[]>;
  logEvent(e: TelemetryEvent): Promise<void>;   // §9
  getMastery(conceptId: string): Promise<MasteryScore | null>;
}
```

The UI imports the *interfaces*. Concrete impls are injected once at boot. This is
the mechanism that satisfies "never couple UI to storage."

---

## 3. Content model (canonical schemas)

### 3.1 Stable IDs (decide now, never change)

Format: `{domain}.{topic}.{slug}` — lowercase, hyphenated, immutable once shipped.
Renames create a new id + a `supersedes` pointer; the old id is never reused.

- Concept: `de.kafka.consumer-group`
- Question: `q.de.kafka.consumer-group.001`
- Quick path: `path.de.kafka-fundamentals`

### 3.2 Concept (the canonical object)

```jsonc
{
  "id": "de.kafka.consumer-group",
  "schemaVersion": 1,
  "contentVersion": "2026.09.1",
  "type": "concept",
  "domain": "data-engineering",
  "topic": "kafka",
  "term": "Consumer Group",
  "difficulty": "core",              // fundamental|core|intermediate|advanced|system-design
  "priority": 82,                    // seeded from encyclopedia demand score (0-100)
  "shortType": "concept",            // concept|why|visual|compare  (MVP set)

  "definition": "≤120 chars. One strong interview-grade sentence.",
  "explanation": "≤280 chars. 2-4 short plain-English sentences.",
  "interviewLine": "≤160 chars. 'Say this in an interview' phrasing.",
  "whyItMatters": "≤200 chars.",
  "commonMistake": "≤200 chars. Optional.",
  "interviewQuestion": "≤160 chars.",

  "example": { "type": "text|sql|python|config", "content": "≤6 visible lines" },

  "visual": {                        // optional; renderer picks a template
    "template": "partition",         // §6
    "data": { /* template-specific */ }
  },

  "prerequisites": ["de.kafka.partition"],
  "relatedConcepts": ["de.kafka.rebalancing", "de.kafka.offset"],
  "nextConcepts": ["de.kafka.rebalancing"],
  "quickPaths": ["path.de.kafka-fundamentals"],
  "tags": ["kafka", "scaling", "interview"],

  "sourceRefs": [
    { "source": "de_encyclopedia_2025.html", "section": "Apache Kafka", "sourceType": "primary" }
  ],
  "provenance": "source-derived"     // source-derived|external|inferred|supplementary
}
```

**Content budgets are enforced** (Ajv `maxLength` + the render gate). If content
exceeds budget: rewrite → shorten → split into another Short → move to expandable.
Never shrink font.

### 3.3 Question

```jsonc
{
  "id": "q.de.kafka.consumer-group.001",
  "schemaVersion": 1,
  "conceptId": "de.kafka.consumer-group",   // REQUIRED — no orphan questions
  "topic": "kafka",
  "difficulty": 3,                           // 1-8 (recognition→senior interview)
  "type": "mcq",                             // MVP: mcq|true-false. Later: scenario|code|order|match
  "stem": "≤180 chars.",
  "options": [
    { "id": "a", "text": "...", "correct": false, "why": "Why this is tempting but wrong." },
    { "id": "b", "text": "...", "correct": true,  "why": "Why this is correct." }
  ],
  "explanation": "≤240 chars. The teaching moment.",
  "sourceRefs": [ /* … */ ]
}
```

### 3.4 Quick Path

```jsonc
{
  "id": "path.de.kafka-fundamentals",
  "schemaVersion": 1,
  "title": "Kafka Fundamentals",
  "topic": "kafka",
  "durationMin": 15,
  "difficulty": "core",
  "objective": "≤160 chars. What you'll be able to do after.",
  "conceptIds": ["de.kafka.why", "de.kafka.topic", "de.kafka.partition", "..."],
  "quizConceptIds": ["de.kafka.partition", "de.kafka.consumer-group", "..."]  // 5-Q end quiz pool
}
```

### 3.5 Relationship (the graph, stored as data)

```jsonc
{ "from": "de.kafka.consumer-group", "rel": "requires", "to": "de.kafka.partition" }
// rel ∈ requires | relates-to | next | compares-with | enables (DE→AI cross-links)
```

Cross-domain DE→AI links use `enables` (e.g. `de.kafka.topic -enables-> ai.rag.streaming-ingestion`).

---

## 4. Learning state, mastery, and SRS (three distinct systems)

### 4.1 Learning state (per user × concept, in Dexie)

```jsonc
{
  "conceptId": "de.kafka.consumer-group",
  "status": "unseen",   // unseen|in_progress|learned|review_due|weak|mastered
  "bookmarked": false,
  "fsrs": { /* opaque ts-fsrs card state: stability, difficulty, due, reps, lapses */ },
  "lastSeen": 0,
  "updatedAt": 0
}
```

### 4.2 SRS (ts-fsrs) — decides WHEN to review

On each self-rating, feed the grade into `ts-fsrs`:

- **Again** → lapse, short interval (~1 day)
- **Hard / Good / Easy** → FSRS computes next `due`

Expose to the user only counts: *Due today · Learning · Strong · Weak*. Never show
FSRS internals. Fallback interval ladder if we ever disable FSRS: 1→3→7→14→30 days.

**Leech rule:** if `lapses ≥ 4`, mark concept `weak` and trigger the *repair* flow
(§8.3) instead of re-showing the same card.

### 4.3 Mastery score — decides HOW WELL the user knows it (dashboard + readiness)

Separate from FSRS. Computed from telemetry, range 0–100:

```
mastery = 100 * (
    0.35 * recallAccuracy        // correct / attempts on this concept's questions
  + 0.20 * retention             // FSRS stability, normalized 0..1
  + 0.20 * applicationAccuracy   // accuracy on difficulty ≥ 4 questions
  + 0.15 * speedFactor           // 1 - clamp(medianLatency / target, 0, 1)
  + 0.10 * interviewSelfRate     // 0..1 from interview-mode self-rating (post-MVP: 0)
)
```

Concept states derived from mastery: `< 40` weak · `40–74` learning · `≥ 75 &&
FSRS stable` mastered. **Interview readiness** for a topic = weighted mean of its
concepts' mastery, weighted by `priority`.

---

## 5. The feed ranker (deterministic, testable, debuggable)

Home is not a catalog. It answers "what should I learn *right now*." Score every
candidate concept; show highest. **No randomness except one tie-break slot.**

```
score(concept) =
    1000 * isDueReview            // overdue reviews always first
  +  600 * isWeak
  +  400 * isActivePathNext
  +  300 * isUnmetPrerequisite    // prereq of something user is trying to learn
  +  200 * (priority/100) * isUnseen
  +  100 * isRelatedToLastLearned
  +   40 * interviewModeBoost     // if onboarding = "interview soon"
  -  800 * isMasteredRecently     // suppress, don't delete (§ "don't re-show")
```

Ship a **debug overlay** (dev builds) that prints the score breakdown per card, so
"why did this surface?" is always answerable. Learned concepts are suppressed from
the auto feed but always reachable via Topic pages / search (intentional revisit).

---

## 6. Visual system (6 SVG templates, data-driven)

Each template is a React component taking typed `data`; concepts reference a
template by name. **No hand-drawn one-offs.** MVP templates:

1. `flow` — vertical stages with arrows (ETL, RAG pipeline)
2. `partition` — segmented blocks distributed to consumers (Kafka, sharding)
3. `before-after` — two-column contrast (small-files, optimization)
4. `comparison` — labeled 2-way table (OLTP/OLAP, ETL/ELT)
5. `timeline` — ordered events (offsets, SCD2, watermarks)
6. `tree` — hierarchy (Spark driver→executors, knowledge graph)

Rules: ≤ 6 labels, min label 12px, must render legibly in dark **and** light, must
fit 360px width with zero horizontal page scroll. Validated by the render gate.

---

## 7. Persistence, versioning & migrations (get right now)

- **Dexie schema versioning** from day one. Every store change ships a migration.
- **Content versioning:** `contentVersion` stamped on every record. Progress keys
  on *stable concept id*, never on array index or content hash — so shipping edited
  content never orphans history.
- **Superseding content:** an edited concept keeps its id; a *replaced* concept gets
  a new id + `supersedes`. A migration remaps progress if needed.
- **LocalStorage** holds only lightweight prefs (theme, onboarding answers, daily goal).
- **Offline:** Workbox precaches app shell + active topic JSON + SVG. Study works on
  a plane. Progress writes are local-first; sync (post-MVP) is last-write-wins per
  concept with `updatedAt`.

---

## 8. Core interaction flows

### 8.1 The learning loop (per card)
`Discover → Read (definition) → Visualize → Tap-expand (why/example/interview) →
Self-rate (Again/Hard/Good/Easy) → Swipe up → Next`

Gestures (swipe-first, **not** swipe-only — every action also has a visible control):
swipe↑ next · swipe↓ previous · tap expand · long-press bookmark · tap diagram zoom.
Respect `prefers-reduced-motion`; honor Android safe areas (28–32dp top, 24dp bottom);
use `100dvh`.

### 8.2 Quick Path → quiz → weak-area review
`Path cover → ordered Shorts → "Quick Path complete" → 5-question quiz →
results (know / review split) → "Review weak concepts" opens exactly those Shorts.`

### 8.3 Wrong-answer → repair loop (the strongest mechanic)
Wrong answer → show *why B was tempting* + correct rationale → "Review [concept]" →
re-teach (visual + simpler recall + example) → schedule via FSRS → offer retry.
On leech (≥4 lapses): check prerequisite mastery; if a prereq is weak, teach the
prereq first. Never re-show the identical failed card 10×.

---

## 9. Telemetry (build from day one, even offline)

The entire "mastery / weak areas / readiness" value prop is only as good as the
event data. Log locally now; ship to Supabase later. Minimal event:

```jsonc
{ "ts": 0, "type": "answer|reveal|self_rate|card_view|card_expand|session_start|session_end",
  "conceptId": "…", "questionId": "…", "value": "correct|wrong|good|again|…",
  "latencyMs": 0, "sessionId": "…" }
```

Instrument activation explicitly: fire a `readiness_reached` event the first time a
user gets a topic readiness score — that's the North-Star activation metric.

---

## 10. Backend (Supabase) — when, and exactly what

**MVP: none.** Add Supabase at the first of: (a) users ask for cross-device, (b) you
want the AI tutor, (c) you add accounts/paywall. Setup ≈ 1 hour, $0.

- **Auth:** magic-link + Google OAuth (free ≤ 50k MAU).
- **Postgres + RLS:** mirror the Dexie shapes; RLS so a user reads only their rows.
  Tables: `users, user_progress, review_state, mastery, quiz_attempts, bookmarks,
  notes, study_sessions, daily_stats`. Content stays static JSON (not in DB) unless/
  until a CMS is needed.
- **pgvector (free, strategic):** embed concepts → semantic search + a *grounded* AI
  tutor that retrieves from your own encyclopedia (you dogfood the RAG you teach).
- **Edge Functions:** the only place LLM API keys live. Powers tutor, free-text
  answer grading, and system-design evaluation — all post-MVP, all pay-per-use so
  $0 until invoked. (For any LLM work, follow the repo's `claude-api` guidance.)

Sync model: local-first, background push on change, last-write-wins per concept.

---

## 11. Content pipeline & CI gates

```
de_encyclopedia_2025.html
   → parse (Node script) → seed concept stubs (term, topic, priority from demand score)
   → author (fill schema, write example/visual/questions) via PR
   → CI: Ajv schema validation
   → CI: graph checks (no orphans, no dup ids, no prerequisite cycles, valid refs)
   → CI: Playwright render gate @ 360/375/390/412 → fail on overflow/clip/tiny-font
   → merge → build code-split content bundles → deploy
```

The encyclopedia's 81 ranked technologies + 50 heatmapped concepts + demand scores
seed **priority** directly — a signal most learning apps never have. Use it.

---

## 12. Design system (dark-first, premium, adult)

- **Type:** Inter (SF Pro is not licensable for redistribution). One ramp:
  32/24/20/17/15/13. Min body 15px; **never** below 13px to fit content.
- **Color = meaning:** one accent per topic (SQL / Spark / Kafka / Cloud / AI …),
  set as CSS variables. No decorative rainbow.
- **Depth via blur/translucency/layering**, not card+giant-shadow.
- **Base dark:** `#0B0B0C`. Light mode supported, dark is primary.
- **Motion:** spring physics (Framer Motion), time-based not fixed-60fps, subtle.
- **Accessibility:** large tap targets (≥44px), high contrast, screen-reader labels,
  reduced-motion, visible focus. Premium includes accessibility.

---

## 13. Kafka vertical slice (build THIS first)

**~20 Shorts** (author in this order, using encyclopedia's Kafka tool card as source):

1. Why Kafka exists · 2. Topic · 3. Partition · 4. Offset · 5. Producer ·
6. Consumer · 7. Consumer Group · 8. Rebalancing · 9. Replication · 10. ISR ·
11. Retention · 12. Log compaction · 13. Delivery semantics · 14. Exactly-once ·
15. Consumer lag · 16. Broker · 17. Partition strategy (visual) ·
18. Kafka vs RabbitMQ (compare) · 19. Kafka vs Kinesis (compare) ·
20. Kafka → AI streaming ingestion (DE→AI cross-link).

**1 Quick Path:** `Kafka Fundamentals` (15 min) sequencing the above.
**~40 MCQs:** 2 per concept, spanning difficulty 1–5, each with per-option `why` +
explanation, each mapped to its `conceptId`.

**Definition of done for the slice:** feed → learn → visual → self-rate → FSRS
review → 5-Q quiz → weak-area review, all passing the 360×800 render gate, offline,
state-persistent across refresh/background, at production polish. Measure D1/D7.

---

## 14. Scope: in vs. out for MVP

**In:** swipe feed · 4 short types (concept/why/visual/compare) · expandable cards ·
6 SVG templates · learning state · deterministic feed ranker · FSRS review ·
wrong-answer→review loop · topic + quiz for Kafka · bookmarks · search · streak ·
daily goal · time tracking · dark mode · PWA/offline · share-card export (pulled
early for growth) · telemetry.

**Out (post-MVP, add on evidence):** the other 10 short-types · 7 extra modes ·
interview simulator · interactive system-design evaluator · AI tutor · free-text
grading · Supabase/auth/sync · leaderboards/XP · notifications · AI domain content.

---

## 15. Phased plan

| Phase | Deliverable | Backend |
|---|---|---|
| **0** | This spec approved | — |
| **1** | Content schema + Ajv + ID scheme + parse encyclopedia → seed stubs | — |
| **2** | App shell: card renderer + 360×800 grid + render gate + 6 SVG templates | — |
| **3** | Gesture/animation engine + 4 short types | — |
| **4** | **Kafka slice** authored + learning state + FSRS + wrong-answer loop | — |
| **5** | Telemetry + mastery formula + My Knowledge + readiness (Kafka) | — |
| **6** | PWA/offline + share-card + polish → **ship, measure D1/D7** | — |
| **7** | Scale content to remaining DE topics | — |
| **8** | Supabase: auth → sync | Supabase |
| **9** | AI tutor + system-design eval via Edge Functions + pgvector; AI/FDE domain | Supabase |

---

## 16. Open decisions for the founder (need answers before Phase 1)

1. **Reach:** Android-first PWA only, or Capacitor wrap early for iOS haptics + store?
2. **Monetization seam:** free MVP now, paywall designed-but-dormant, or no commerce yet?
3. **AI content timing:** DE-only through Phase 7, or interleave AI/FDE sooner?
4. **Team:** solo/AI-built, or multiple engineers (changes CMS-vs-git tradeoff)?
5. **Brand name / accent palette:** lock the per-topic color system now (cheap later pain).
```
