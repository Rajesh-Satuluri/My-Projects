import type { Category, Question } from "./types";
import { categories as seedCategories, questions as seedQuestions } from "./seed";

// Single data-access seam. Phase 0 reads from the local seed arrays.
// Phase 1 replaces the bodies here with Supabase queries — no page or
// component needs to change, because they only ever call these functions.

export function getCategories(): Category[] {
  return [...seedCategories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getCategory(id: string): Category | undefined {
  return seedCategories.find((c) => c.id === id);
}

export function getQuestions(): Question[] {
  return seedQuestions;
}

export function getQuestion(id: string): Question | undefined {
  return seedQuestions.find((q) => q.id === id);
}

export interface QuestionFilters {
  categoryId?: string;
  difficulty?: string;
  status?: string;
  tag?: string;
  search?: string;
}

export function filterQuestions(filters: QuestionFilters): Question[] {
  const search = filters.search?.trim().toLowerCase();
  return getQuestions().filter((q) => {
    if (filters.categoryId && q.categoryId !== filters.categoryId) return false;
    if (filters.difficulty && q.difficulty !== filters.difficulty) return false;
    if (filters.status && q.status !== filters.status) return false;
    if (filters.tag && !q.tags.includes(filters.tag)) return false;
    if (search) {
      const haystack = [
        q.question,
        q.answer ?? "",
        q.keyPoints.map((k) => k.point).join(" "),
        q.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export interface DashboardStats {
  total: number;
  prepared: number;
  toReview: number;
  perCategory: { category: Category; count: number }[];
  recentlyReviewed: Question[];
}

export function getDashboardStats(): DashboardStats {
  const all = getQuestions();
  const prepared = all.filter((q) => q.status === "Prepared").length;
  const cats = getCategories();
  const perCategory = cats.map((category) => ({
    category,
    count: all.filter((q) => q.categoryId === category.id).length,
  }));
  const recentlyReviewed = [...all]
    .filter((q) => q.lastReviewedAt)
    .sort((a, b) => (b.lastReviewedAt! > a.lastReviewedAt! ? 1 : -1))
    .slice(0, 5);
  return {
    total: all.length,
    prepared,
    toReview: all.length - prepared,
    perCategory,
    recentlyReviewed,
  };
}

export function getAllTags(): string[] {
  const set = new Set<string>();
  getQuestions().forEach((q) => q.tags.forEach((t) => set.add(t)));
  return [...set].sort();
}
