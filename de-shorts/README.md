# DE Shorts — Content Tooling (Phase 1)

Content-as-data foundation for DE Shorts. **No app UI here** — this is the schema,
validator, and source parser that everything downstream builds on. See the full plan
in [`../docs/DE-Shorts-MVP-Architecture-and-Spec.md`](../docs/DE-Shorts-MVP-Architecture-and-Spec.md).

## What's in here

```
content/
  sources/de_encyclopedia_2025.html   # authoritative DE source (versioned)
  schema/                             # JSON Schemas — the runtime source of truth
    concept.schema.json
    question.schema.json
    quick-path.schema.json
    relationship.schema.json
  data/
    technologies.json                 # generated: ranked technology registry + priority
    concepts/<topic>.json             # generated: seeded concept STUBS
    questions/                        # (authored later)
    quick-paths/                      # (authored later)
tools/
  types.ts                            # TS mirror of the schemas (authoring aid)
  parse-encyclopedia.ts               # source HTML -> technologies + concept stubs
  validate.ts                         # schema + graph-integrity CI gate
```

## Commands

```bash
npm install
npm run parse      # regenerate technologies.json + concepts/*.json from the source
npm run validate   # schema validation + graph integrity (fails CI on error)
npx tsc --noEmit   # typecheck the tools
```

## How it works

**Stable IDs** (`{domain}.{topic}.{slug}`, e.g. `de.kafka.consumer-group`) are
immutable once shipped — user progress keys on them. Renames create a new id +
`supersedes`; ids are never reused.

**Priority (0–100)** is seeded straight from the encyclopedia's own demand signals —
top-50 heatmap points where present, otherwise the demand % from the ranked tech
table. This gives the feed ranker a real importance signal most learning apps lack.

**Stubs are honest.** `parse-encyclopedia.ts` only emits what the source contains:
real term, topic, priority, and provenance, plus a source-derived seed definition
where the source gives a tooltip (otherwise a `TODO` and `provenance: "inferred"`).
Every stub carries `authoringStatus: "stub"`. Real definitions, examples, visuals,
and questions are authored later by PR — which is the technical-accuracy review gate.

> Note: Kafka intentionally produces a single stub — the source lists "Apache Kafka"
> once. The 20-concept Kafka vertical slice (spec §13) is authored from the Kafka
> tool card in a later phase, not invented by the parser.

## Validation gates (CI: `.github/workflows/de-shorts-content.yml`)

- JSON Schema (Ajv) on every concept / question / quick-path / relationship, incl.
  content-length budgets from the spec.
- No duplicate ids.
- **No orphan questions** — every question must reference an existing concept.
- All cross-refs (prerequisites / related / next / quick-path / relationship) resolve.
- No prerequisite cycles.
- Exactly one correct MCQ option.

The 360×800 **render gate** (headless overflow check) is a Phase 2 tool and is not
included here.

## Next (Phase 2)

Card renderer + 360×800 layout grid + the render gate + the 6 SVG templates, then
authoring the Kafka vertical slice against it.
