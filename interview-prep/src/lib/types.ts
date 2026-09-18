export type Difficulty = "Easy" | "Medium" | "Hard";
export type PreparedStatus = "Prepared" | "Not Prepared";

export interface Category {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
}

export interface KeyPoint {
  id: string;
  point: string;
  sortOrder: number;
  completed: boolean;
}

export interface Question {
  id: string;
  categoryId: string;
  subcategory?: string;
  question: string;
  answer?: string;
  guidance?: string;
  difficulty: Difficulty;
  status: PreparedStatus;
  answerLocked: boolean;
  pinned: boolean;
  keyPoints: KeyPoint[];
  followUps: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
}
