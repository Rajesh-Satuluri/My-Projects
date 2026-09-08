/**
 * Phase 1 — Content validator (CI gate).
 *
 * 1. JSON Schema validation (Ajv) of every concept / question / quick-path / relationship.
 * 2. Graph/referential integrity checks:
 *      - duplicate ids
 *      - questions referencing a non-existent concept (no orphan questions)
 *      - relationships / prerequisites / related / next / quickPath refs that don't resolve
 *      - prerequisite cycles
 *      - exactly one correct MCQ option
 *
 * Exits non-zero on any error, so it can gate CI. Warnings do not fail the build.
 * The 360x800 render gate is a separate Phase 2 tool and is intentionally not here.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { Concept, Question, QuickPath, Relationship } from "./types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SCHEMA = resolve(ROOT, "content/schema");
const DATA = resolve(ROOT, "content/data");
const CONCEPTS = resolve(DATA, "concepts");
const QUESTIONS = resolve(DATA, "questions");
const PATHS = resolve(DATA, "quick-paths");
const RELS = resolve(DATA, "relationships.json");

const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf-8"));
const loadSchema = (name: string) => readJson<object>(resolve(SCHEMA, name));
const listJson = (dir: string): string[] =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => resolve(dir, f)) : [];

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const vConcept = ajv.compile(loadSchema("concept.schema.json"));
const vQuestion = ajv.compile(loadSchema("question.schema.json"));
const vPath = ajv.compile(loadSchema("quick-path.schema.json"));
const vRel = ajv.compile(loadSchema("relationship.schema.json"));

const validateAll = <T>(v: ValidateFunction, items: T[], label: (t: T) => string, file: string) => {
  for (const it of items) {
    if (!v(it)) {
      for (const e of v.errors ?? [])
        err(`schema  ${file} :: ${label(it)} ${e.instancePath} ${e.message}`);
    }
  }
};

// ---------- load ----------
const concepts: Concept[] = [];
for (const f of listJson(CONCEPTS)) concepts.push(...readJson<Concept[]>(f).map((c) => ({ ...c, __file: f } as any)));
const questions: Question[] = [];
for (const f of listJson(QUESTIONS)) questions.push(...readJson<Question[]>(f).map((q) => ({ ...q, __file: f } as any)));
const paths: QuickPath[] = [];
for (const f of listJson(PATHS)) paths.push(...readJson<QuickPath[]>(f).map((p) => ({ ...p, __file: f } as any)));
const rels: Relationship[] = existsSync(RELS) ? readJson<Relationship[]>(RELS) : [];

// strip helper field before schema validation
const clean = <T>(x: T): T => {
  const { __file, ...rest } = x as any;
  return rest as T;
};

// ---------- 1. schema ----------
validateAll(vConcept, concepts.map(clean), (c) => (c as Concept).id, "concepts");
validateAll(vQuestion, questions.map(clean), (q) => (q as Question).id, "questions");
validateAll(vPath, paths.map(clean), (p) => (p as QuickPath).id, "quick-paths");
validateAll(vRel, rels, (r) => `${r.from}->${r.to}`, "relationships.json");

// ---------- 2. graph / referential ----------
const conceptIds = new Set<string>();
for (const c of concepts) {
  if (conceptIds.has(c.id)) err(`dup     concept id ${c.id}`);
  conceptIds.add(c.id);
}
const has = (id: string) => conceptIds.has(id);

// question integrity
const qIds = new Set<string>();
for (const q of questions) {
  if (qIds.has(q.id)) err(`dup     question id ${q.id}`);
  qIds.add(q.id);
  if (!has(q.conceptId)) err(`orphan  question ${q.id} -> unknown concept ${q.conceptId}`);
  if (q.type === "mcq") {
    const correct = q.options.filter((o) => o.correct).length;
    if (correct !== 1) err(`mcq     question ${q.id} has ${correct} correct options (need 1)`);
  }
}

// concept cross-refs
const checkRefs = (c: Concept, field: keyof Concept, ids: string[]) => {
  for (const id of ids) if (!has(id)) warn(`ref     concept ${c.id}.${String(field)} -> unknown ${id}`);
};
const pathIds = new Set(paths.map((p) => p.id));
for (const c of concepts) {
  checkRefs(c, "prerequisites", c.prerequisites);
  checkRefs(c, "relatedConcepts", c.relatedConcepts);
  checkRefs(c, "nextConcepts", c.nextConcepts);
  for (const p of c.quickPaths) if (paths.length && !pathIds.has(p)) warn(`ref     concept ${c.id}.quickPaths -> unknown ${p}`);
}

// quick-path refs
for (const p of paths) {
  for (const id of p.conceptIds) if (!has(id)) err(`ref     quick-path ${p.id} -> unknown concept ${id}`);
  for (const id of p.quizConceptIds) if (!has(id)) err(`ref     quick-path ${p.id} quiz -> unknown concept ${id}`);
}

// relationship refs
for (const r of rels) {
  if (!has(r.from)) warn(`ref     relationship from -> unknown ${r.from}`);
  if (!has(r.to)) warn(`ref     relationship to -> unknown ${r.to}`);
}

// prerequisite cycle detection (DFS over prerequisites edges)
{
  const adj = new Map<string, string[]>();
  for (const c of concepts) adj.set(c.id, c.prerequisites.filter(has));
  const state = new Map<string, 0 | 1 | 2>(); // 0=unvisited,1=in-stack,2=done
  const stack: string[] = [];
  const dfs = (n: string): boolean => {
    state.set(n, 1);
    stack.push(n);
    for (const m of adj.get(n) ?? []) {
      if (state.get(m) === 1) {
        err(`cycle   prerequisite cycle: ${[...stack.slice(stack.indexOf(m)), m].join(" -> ")}`);
        return true;
      }
      if (!state.get(m) && dfs(m)) return true;
    }
    stack.pop();
    state.set(n, 2);
    return false;
  };
  for (const c of concepts) if (!state.get(c.id)) dfs(c.id);
}

// ---------- report ----------
const stubs = concepts.filter((c) => c.authoringStatus === "stub").length;
console.log(`\nDE Shorts — content validation`);
console.log(`  concepts   : ${concepts.length} (${stubs} stub, ${concepts.length - stubs} authored)`);
console.log(`  questions  : ${questions.length}`);
console.log(`  quick-paths: ${paths.length}`);
console.log(`  relationships: ${rels.length}`);
if (warnings.length) {
  console.log(`\n  ${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, 40)) console.log(`    ⚠ ${w}`);
  if (warnings.length > 40) console.log(`    … +${warnings.length - 40} more`);
}
if (errors.length) {
  console.log(`\n  ${errors.length} ERROR(s):`);
  for (const e of errors.slice(0, 60)) console.log(`    ✗ ${e}`);
  if (errors.length > 60) console.log(`    … +${errors.length - 60} more`);
  console.log(`\n  FAILED\n`);
  process.exit(1);
}
console.log(`\n  OK — no errors\n`);
