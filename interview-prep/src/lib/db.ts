import { supabase } from "./supabase";
import type { Category, Difficulty, PreparedStatus, Question } from "./types";

// Maps Supabase rows <-> domain types. All calls run as the logged-in user,
// so RLS scopes every row automatically; we set user_id = auth.uid() on insert.

interface QuestionRow {
  id: string;
  category_id: string | null;
  subcategory: string | null;
  question: string;
  answer: string | null;
  difficulty: Difficulty;
  status: PreparedStatus;
  answer_locked: boolean | null;
  pinned: boolean | null;
  created_at: string;
  updated_at: string;
  last_reviewed_at: string | null;
  question_points: { id: string; point: string; sort_order: number; completed: boolean }[];
  follow_up_questions: { id: string; question: string }[];
  question_tags: { tags: { name: string } | null }[];
}

function toQuestion(r: QuestionRow): Question {
  return {
    id: r.id,
    categoryId: r.category_id ?? "",
    subcategory: r.subcategory ?? undefined,
    question: r.question,
    answer: r.answer ?? undefined,
    difficulty: r.difficulty,
    status: r.status,
    answerLocked: r.answer_locked ?? false,
    pinned: r.pinned ?? false,
    keyPoints: [...r.question_points]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => ({ id: p.id, point: p.point, sortOrder: p.sort_order, completed: p.completed })),
    followUps: r.follow_up_questions.map((f) => f.question),
    tags: r.question_tags.map((t) => t.tags?.name).filter((n): n is string => !!n),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    lastReviewedAt: r.last_reviewed_at ?? undefined,
  };
}

const QUESTION_SELECT =
  "*, question_points(*), follow_up_questions(*), question_tags(tags(name))";

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? undefined,
    sortOrder: c.sort_order,
  }));
}

export async function fetchQuestions(): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select(QUESTION_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as QuestionRow[]).map(toQuestion);
}

export async function fetchQuestion(id: string): Promise<Question | null> {
  const { data, error } = await supabase
    .from("questions")
    .select(QUESTION_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toQuestion(data as unknown as QuestionRow) : null;
}

export interface QuestionInput {
  categoryId: string;
  subcategory?: string;
  question: string;
  answer?: string;
  difficulty: Difficulty;
  status: PreparedStatus;
  keyPoints: string[];
  followUps: string[];
  tags: string[];
}

async function resolveTagIds(names: string[]): Promise<string[]> {
  if (!names.length) return [];
  // One query to find existing tags, one upsert for the rest.
  const { data: found } = await supabase.from("tags").select("id, name").in("name", names);
  const byName = new Map((found ?? []).map((t) => [t.name as string, t.id as string]));
  const missing = names.filter((n) => !byName.has(n));
  if (missing.length) {
    const { data: created } = await supabase
      .from("tags")
      .insert(missing.map((name) => ({ name })))
      .select("id, name");
    (created ?? []).forEach((t) => byName.set(t.name as string, t.id as string));
  }
  return names.map((n) => byName.get(n)).filter((id): id is string => !!id);
}

async function replaceChildren(questionId: string, input: QuestionInput) {
  // Clear existing children in parallel.
  await Promise.all([
    supabase.from("question_points").delete().eq("question_id", questionId),
    supabase.from("follow_up_questions").delete().eq("question_id", questionId),
    supabase.from("question_tags").delete().eq("question_id", questionId),
  ]);

  const tagIds = await resolveTagIds(input.tags);

  // Insert new children in parallel (single insert per table).
  await Promise.all([
    input.keyPoints.length
      ? supabase.from("question_points").insert(
          input.keyPoints.map((point, i) => ({
            question_id: questionId,
            point,
            sort_order: i + 1,
            completed: false,
          }))
        )
      : Promise.resolve(),
    input.followUps.length
      ? supabase.from("follow_up_questions").insert(
          input.followUps.map((question) => ({ question_id: questionId, question }))
        )
      : Promise.resolve(),
    tagIds.length
      ? supabase
          .from("question_tags")
          .insert(tagIds.map((tag_id) => ({ question_id: questionId, tag_id })))
      : Promise.resolve(),
  ]);
}

export async function createQuestion(input: QuestionInput): Promise<string> {
  const { data, error } = await supabase
    .from("questions")
    .insert({
      category_id: input.categoryId || null,
      subcategory: input.subcategory || null,
      question: input.question,
      answer: input.answer || null,
      difficulty: input.difficulty,
      status: input.status,
      answer_locked: true, // answers are read-only by default; click Edit to change
    })
    .select("id")
    .single();
  if (error) throw error;
  await replaceChildren(data.id, input);
  return data.id;
}

export async function updateQuestion(id: string, input: QuestionInput): Promise<void> {
  const { error } = await supabase
    .from("questions")
    .update({
      category_id: input.categoryId || null,
      subcategory: input.subcategory || null,
      question: input.question,
      answer: input.answer || null,
      difficulty: input.difficulty,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  await replaceChildren(id, input);
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
}

export async function setStatus(id: string, status: PreparedStatus): Promise<void> {
  const { error } = await supabase
    .from("questions")
    .update({ status, last_reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function saveAnswer(
  id: string,
  answer: string,
  locked?: boolean
): Promise<void> {
  const patch: Record<string, unknown> = {
    answer: answer || null,
    updated_at: new Date().toISOString(),
  };
  if (locked !== undefined) patch.answer_locked = locked;
  const { error } = await supabase.from("questions").update(patch).eq("id", id);
  if (error) throw error;
}

export async function setPinned(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from("questions").update({ pinned }).eq("id", id);
  if (error) throw error;
}

export async function setAnswerLocked(id: string, locked: boolean): Promise<void> {
  const { error } = await supabase
    .from("questions")
    .update({ answer_locked: locked })
    .eq("id", id);
  if (error) throw error;
}

export async function setPointCompleted(pointId: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from("question_points")
    .update({ completed })
    .eq("id", pointId);
  if (error) throw error;
}
