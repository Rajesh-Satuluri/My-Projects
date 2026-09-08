/**
 * DE Shorts — canonical content types (Phase 1).
 * Mirrors content/schema/*.json. Keep the two in sync; the JSON Schemas are the
 * runtime source of truth (validated in CI), these types are the authoring aid.
 * See docs/DE-Shorts-MVP-Architecture-and-Spec.md §3.
 */

export type Domain = "data-engineering" | "ai";
export type Difficulty =
  | "fundamental"
  | "core"
  | "intermediate"
  | "advanced"
  | "system-design";
export type ShortType = "concept" | "why" | "visual" | "compare";
export type Provenance =
  | "source-derived"
  | "external"
  | "inferred"
  | "supplementary";
export type VisualTemplate =
  | "flow"
  | "partition"
  | "before-after"
  | "comparison"
  | "timeline"
  | "tree";
export type RelationKind =
  | "requires"
  | "relates-to"
  | "next"
  | "compares-with"
  | "enables";

export interface SourceRef {
  source: string;
  section: string;
  sourceType: "primary" | "secondary";
}

export interface ConceptExample {
  type: "text" | "sql" | "python" | "config";
  content: string;
}

export interface ConceptVisual {
  template: VisualTemplate;
  data: Record<string, unknown>;
}

export interface Concept {
  id: string;
  schemaVersion: number;
  contentVersion: string;
  type: "concept";
  domain: Domain;
  topic: string;
  term: string;
  difficulty: Difficulty;
  priority: number; // 0-100, seeded from encyclopedia demand score
  shortType: ShortType;

  definition: string;
  explanation?: string;
  interviewLine?: string;
  whyItMatters?: string;
  commonMistake?: string;
  interviewQuestion?: string;

  example?: ConceptExample;
  visual?: ConceptVisual;

  prerequisites: string[];
  relatedConcepts: string[];
  nextConcepts: string[];
  quickPaths: string[];
  tags: string[];

  sourceRefs: SourceRef[];
  provenance: Provenance;

  /** Authoring status. `stub` = seeded but not yet written; excluded from render gate. */
  authoringStatus: "stub" | "draft" | "reviewed";
  supersedes?: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  correct: boolean;
  why: string;
}

export interface Question {
  id: string;
  schemaVersion: number;
  conceptId: string;
  topic: string;
  difficulty: number; // 1-8
  type: "mcq" | "true-false";
  stem: string;
  options: QuestionOption[];
  explanation: string;
  sourceRefs: SourceRef[];
}

export interface QuickPath {
  id: string;
  schemaVersion: number;
  title: string;
  topic: string;
  durationMin: number;
  difficulty: Difficulty;
  objective: string;
  conceptIds: string[];
  quizConceptIds: string[];
}

export interface Relationship {
  from: string;
  rel: RelationKind;
  to: string;
}
