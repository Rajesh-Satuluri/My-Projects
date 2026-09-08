/**
 * Phase 1 — Encyclopedia parser.
 *
 * Reads content/sources/de_encyclopedia_2025.html (the authoritative DE source)
 * and emits, WITHOUT inventing knowledge:
 *   - content/data/technologies.json  : registry of ranked technologies + priority
 *   - content/data/concepts/<topic>.json : seeded concept STUBS (authoringStatus:"stub")
 *
 * Priority signal (0-100), best-available:
 *   heatmap points (top-50 "most demanded") > demand % from the tech table.
 *
 * Stubs are honest placeholders: real term + topic + priority + provenance from the
 * source, with a source-derived seed definition where the source gives a tooltip,
 * otherwise a TODO. Authoring (real definition/example/visual) happens later by PR.
 *
 * Pure Node (no HTML lib) — the source uses stable class names, so scoped regex is
 * sufficient and dependency-free.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Concept, Difficulty, SourceRef } from "./types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(ROOT, "content/sources/de_encyclopedia_2025.html");
const OUT_DATA = resolve(ROOT, "content/data");
const OUT_CONCEPTS = resolve(OUT_DATA, "concepts");
const SOURCE_NAME = "de_encyclopedia_2025.html";
const CONTENT_VERSION = "2026.09.1";

// ---------- helpers ----------
const html = readFileSync(SRC, "utf-8");
const unescape = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/\s+/g, " ")
    .trim();

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // drop parentheticals e.g. "SQL (Advanced)"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Map a technology / concept term to a topic slug. First match wins. */
const TOPIC_RULES: [RegExp, string][] = [
  [/\bspark\b|pyspark|databricks runtime|catalyst|\brdd\b|\baqe\b|shuffle|broadcast|repartition|coalesce|lazy evaluation|caching|partition|skew/i, "spark"],
  [/kafka|consumer group|\bisr\b|broker|offset|rebalanc/i, "kafka"],
  [/event hubs|pub\/sub|kinesis|flink|streaming|watermark/i, "streaming"],
  [/airflow|composer|dagster|orchestrat|dag|scheduler/i, "orchestration"],
  [/snowflake|redshift|bigquery|synapse|warehouse|olap/i, "warehouse"],
  [/delta lake|iceberg|hudi|lakehouse|open table|medallion/i, "lakehouse"],
  [/\bdbt\b|transformation|analytics engineering/i, "dbt"],
  [/\bsql\b|window function|cte|query optim|index|scd|stored procedure|pl\/sql/i, "sql"],
  [/python|pandas|scala|\bjava\b|shell|bash|\br\b/i, "python"],
  [/star schema|snowflake schema|fact|dimension|data vault|normali|surrogate|grain|data model/i, "data-modeling"],
  [/lambda|kappa|data mesh|architecture|cdc|idempoten/i, "architecture"],
  [/terraform|docker|kubernetes|k8s|jenkins|gitlab|github actions|ci\/cd|ansible|infrastructure as code|blue-green|\bgit\b|github|version control/i, "devops"],
  [/s3|glue|emr|lambda|athena|adf|adls|gcs|aws|azure|gcp|cloud|iam/i, "cloud"],
  [/great expectations|soda|monte carlo|data quality|observability|lineage|purview|collibra|openmetadata|atlan|unity catalog|governance|grafana|prometheus/i, "data-quality"],
  [/postgres|mysql|mongodb|dynamodb|cassandra|redis|clickhouse|teradata|elasticsearch|hbase|database/i, "databases"],
  [/hadoop|hdfs|mapreduce|hive|beam/i, "hadoop"],
  [/parquet|avro|orc|columnar|file format|compression/i, "file-formats"],
  [/fivetran|airbyte|informatica|debezium|ssis|talend|ingestion|etl|elt/i, "ingestion"],
  [/power bi|tableau|looker|superset|quicksight|\bbi\b/i, "bi"],
];
const topicFor = (term: string, hint = ""): string => {
  // Match on the term first — a tech's own name is authoritative. Only fall back
  // to the hint (tooltip/category) when the term alone matches no rule, so that
  // e.g. "Python" (whose tooltip mentions PySpark) is not miscategorised as spark.
  for (const [re, t] of TOPIC_RULES) if (re.test(term)) return t;
  if (hint) for (const [re, t] of TOPIC_RULES) if (re.test(hint)) return t;
  return "general";
};

const difficultyFor = (priority: number): Difficulty =>
  priority >= 85 ? "core" : priority >= 60 ? "intermediate" : "advanced";

const sourceRef = (section: string): SourceRef => ({
  source: SOURCE_NAME,
  section,
  sourceType: "primary",
});

// ---------- 1. technology table: name + tooltip + demand % ----------
interface Tech {
  term: string;
  tooltip: string;
  demandPct: number | null;
  heatPts: number | null;
  category: string | null;
  topic: string;
  priority: number;
}

const techRe =
  /<td class="tech-name"(?:[^>]*data-tooltip="([^"]*)")?[^>]*>([^<]+)<\/td>\s*<td class="pct"[^>]*>(\d+)%/g;
const techs = new Map<string, Tech>();
for (const m of html.matchAll(techRe)) {
  const tooltip = unescape(m[1] ?? "");
  const term = unescape(m[2]);
  const demandPct = Number(m[3]);
  const topic = topicFor(term, tooltip);
  techs.set(term, {
    term,
    tooltip,
    demandPct,
    heatPts: null,
    category: null,
    topic,
    priority: demandPct,
  });
}

// ---------- 2. heatmap: name + points (stronger priority signal) ----------
const heatRe =
  /<div class="heat-name">([^<]+)<\/div>\s*<div class="heat-score"[^>]*>(\d+)pts/g;
for (const m of html.matchAll(heatRe)) {
  const term = unescape(m[1]);
  const pts = Number(m[2]);
  const existing = techs.get(term);
  if (existing) {
    existing.heatPts = pts;
    existing.priority = pts; // points are already 0-100 and rank-aware
  } else {
    const topic = topicFor(term);
    techs.set(term, {
      term,
      tooltip: "",
      demandPct: null,
      heatPts: pts,
      category: null,
      topic,
      priority: pts,
    });
  }
}

// ---------- 3. tool cards: category + description for major technologies ----------
const toolRe =
  /<[^>]*class="tool-name"[^>]*>([^<]+)<[\s\S]*?class="tool-category"[^>]*>([^<]+)<[\s\S]*?class="tool-desc"[^>]*>([^<]+)</g;
const toolDesc = new Map<string, { category: string; desc: string }>();
for (const m of html.matchAll(toolRe)) {
  const name = unescape(m[1]);
  toolDesc.set(name, { category: unescape(m[2]), desc: unescape(m[3]) });
  const t = techs.get(name);
  if (t) t.category = unescape(m[2]);
}

// ---------- 4. "Most Asked Concepts by Category" → concept stubs ----------
// Format in source: "<emoji> <Topic> — Hot Topics <comma,separated,concepts>."
interface HotConcept {
  term: string;
  topic: string;
  category: string;
}
const hotConcepts: HotConcept[] = [];
{
  const start = html.indexOf("Most Asked Concepts by Category");
  const end = html.indexOf("Learning Roadmap", start);
  const seg = unescape(html.slice(start, end > 0 ? end : start + 4000).replace(/<[^>]+>/g, " "));
  // split on "— Hot Topics"
  const parts = seg.split(/—\s*Hot Topics/);
  // parts[0] ends with the first category label; each subsequent chunk starts with concepts then next label
  for (let i = 1; i < parts.length; i++) {
    // category label is the trailing words of the previous chunk
    const labelMatch = parts[i - 1].match(/([A-Za-z/ ]+)\s*$/);
    const label = (labelMatch?.[1] ?? "").trim().replace(/^[^A-Za-z]+/, "");
    const body = parts[i];
    // concepts run until the next category label (next capitalized "X — ") or sentence end
    let conceptsRaw = body.split(/\.\s|(?=[A-Z][A-Za-z/ ]+$)/)[0];
    // strip parentheticals BEFORE splitting so "Window functions (ROW_NUMBER, LAG)"
    // stays one concept instead of fracturing on the commas inside the parens.
    conceptsRaw = conceptsRaw.replace(/\([^)]*\)/g, "");
    for (const raw of conceptsRaw.split(",")) {
      const term = raw.replace(/[()]/g, "").trim();
      if (term.length < 3 || term.length > 55) continue;
      if (/hot topics|section|roadmap/i.test(term)) continue;
      hotConcepts.push({ term, topic: topicFor(term, label), category: label });
    }
  }
}

// ---------- build concept stubs ----------
const conceptsById = new Map<string, Concept>();
const addStub = (
  term: string,
  topic: string,
  priority: number,
  section: string,
  seedDef: string,
) => {
  const id = `de.${topic}.${slug(term)}`;
  if (!/^de\.[a-z0-9-]+\.[a-z0-9-]+$/.test(id)) return; // skip un-sluggable
  if (conceptsById.has(id)) {
    // keep the higher priority signal
    const cur = conceptsById.get(id)!;
    if (priority > cur.priority) cur.priority = priority;
    return;
  }
  const definition = (seedDef || `TODO: define ${term}.`).slice(0, 120);
  conceptsById.set(id, {
    id,
    schemaVersion: 1,
    contentVersion: CONTENT_VERSION,
    type: "concept",
    domain: "data-engineering",
    topic,
    term,
    difficulty: difficultyFor(priority),
    priority: Math.round(priority),
    shortType: "concept",
    definition,
    prerequisites: [],
    relatedConcepts: [],
    nextConcepts: [],
    quickPaths: [],
    tags: [topic],
    sourceRefs: [sourceRef(section)],
    provenance: seedDef ? "source-derived" : "inferred",
    authoringStatus: "stub",
  });
};

// technology overview concepts
for (const t of techs.values()) {
  const seed = t.tooltip || toolDesc.get(t.term)?.desc || "";
  addStub(t.term, t.topic, t.priority, t.category ?? t.term, seed);
}
// hot-topic concepts (priority inherits the category's strongest tech, else 70)
const topicPeak = new Map<string, number>();
for (const t of techs.values())
  topicPeak.set(t.topic, Math.max(topicPeak.get(t.topic) ?? 0, t.priority));
for (const h of hotConcepts) {
  const p = Math.min(90, (topicPeak.get(h.topic) ?? 70) - 5); // slightly below the tech itself
  addStub(h.term, h.topic, p, `Most Asked Concepts · ${h.category}`, "");
}

// ---------- write outputs ----------
mkdirSync(OUT_CONCEPTS, { recursive: true });

const techRegistry = [...techs.values()].sort((a, b) => b.priority - a.priority);
writeFileSync(
  resolve(OUT_DATA, "technologies.json"),
  JSON.stringify(techRegistry, null, 2) + "\n",
);

const byTopic = new Map<string, Concept[]>();
for (const c of conceptsById.values()) {
  if (!byTopic.has(c.topic)) byTopic.set(c.topic, []);
  byTopic.get(c.topic)!.push(c);
}
for (const [topic, list] of byTopic) {
  list.sort((a, b) => b.priority - a.priority);
  writeFileSync(
    resolve(OUT_CONCEPTS, `${topic}.json`),
    JSON.stringify(list, null, 2) + "\n",
  );
}

// ---------- report ----------
const total = conceptsById.size;
console.log(`\nDE Shorts — encyclopedia parse report`);
console.log(`  source            : ${SOURCE_NAME}`);
console.log(`  technologies      : ${techs.size}`);
console.log(`  hot-topic concepts: ${hotConcepts.length}`);
console.log(`  concept stubs     : ${total} across ${byTopic.size} topics`);
console.log(`\n  topics:`);
for (const [topic, list] of [...byTopic].sort((a, b) => b[1].length - a[1].length))
  console.log(`    ${topic.padEnd(16)} ${String(list.length).padStart(3)} stubs`);
console.log(`\n  top 15 by priority:`);
for (const c of [...conceptsById.values()].sort((a, b) => b.priority - a.priority).slice(0, 15))
  console.log(`    ${String(c.priority).padStart(3)}  ${c.id.padEnd(34)} ${c.term}`);
console.log(`\n  wrote content/data/technologies.json + content/data/concepts/*.json\n`);
