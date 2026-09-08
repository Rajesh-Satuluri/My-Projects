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
