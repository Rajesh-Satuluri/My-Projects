import type { Question } from "./types";

// Light spaced-repetition heuristic: a question is "due" if it has never been
// reviewed, or was last reviewed more than REVIEW_DAYS ago.
export const REVIEW_DAYS = 3;

export function isDue(q: Question, now: number = Date.now()): boolean {
  if (!q.lastReviewedAt) return true;
  const last = new Date(q.lastReviewedAt).getTime();
  return now - last > REVIEW_DAYS * 24 * 60 * 60 * 1000;
}

export function daysAgoLabel(iso?: string): string {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
