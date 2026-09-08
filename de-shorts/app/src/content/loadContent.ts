/* Loads concept JSON (content-as-data) at build time via Vite glob.
   Feed shows authored concepts; the render gate can probe any by id. */

export interface ConceptExample { type: string; content: string }
export interface ConceptVisual { template: string; data: Record<string, unknown> }
export interface Concept {
  id: string;
  domain: string;
  topic: string;
  term: string;
  difficulty: string;
  priority: number;
  shortType: string;
  definition: string;
  explanation?: string;
  interviewLine?: string;
  whyItMatters?: string;
  commonMistake?: string;
  interviewQuestion?: string;
  example?: ConceptExample;
  visual?: ConceptVisual;
  prerequisites?: string[];
  relatedConcepts?: string[];
  nextConcepts?: string[];
  authoringStatus: "stub" | "draft" | "reviewed";
}

const modules = import.meta.glob<{ default: Concept[] }>(
  "../../../content/data/concepts/*.json",
  { eager: true },
);

const all: Concept[] = [];
for (const m of Object.values(modules)) all.push(...m.default);

export const allConcepts = all;
export const authoredConcepts = all
  .filter((c) => c.authoringStatus !== "stub")
  .sort((a, b) => b.priority - a.priority);

export const conceptById = (id: string): Concept | undefined =>
  all.find((c) => c.id === id);

export interface TopicMeta {
  topic: string;
  total: number;
  authored: number;
  maxPriority: number;
}

export const topics: TopicMeta[] = (() => {
  const map = new Map<string, Concept[]>();
  for (const c of all) {
    if (!map.has(c.topic)) map.set(c.topic, []);
    map.get(c.topic)!.push(c);
  }
  return [...map.entries()]
    .map(([topic, list]) => ({
      topic,
      total: list.length,
      authored: list.filter((c) => c.authoringStatus !== "stub").length,
      maxPriority: Math.max(...list.map((c) => c.priority)),
    }))
    // topics with authored content first, then by demand priority
    .sort((a, b) => b.authored - a.authored || b.maxPriority - a.maxPriority);
})();

export const conceptsByTopic = (topic: string): Concept[] =>
  all
    .filter((c) => c.topic === topic)
    .sort(
      (a, b) =>
        Number(b.authoringStatus !== "stub") - Number(a.authoringStatus !== "stub") ||
        b.priority - a.priority,
    );
