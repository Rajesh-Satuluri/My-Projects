import { supabase } from "./supabase";
import { categories as seedCategories, questions as seedQuestions } from "./seed";
import { createQuestion } from "./db";

// One-time seeding into the logged-in user's Supabase tables. Inserts the 15
// starter categories and the sample questions, mapping seed category ids to the
// newly created category rows. Safe to expose as a button; it no-ops the extras
// if categories already exist by name.
export async function loadStarterData(): Promise<void> {
  const { data: existing } = await supabase.from("categories").select("id, name");
  const byName = new Map((existing ?? []).map((c) => [c.name, c.id as string]));

  // Insert any missing categories.
  const toInsert = seedCategories.filter((c) => !byName.has(c.name));
  if (toInsert.length) {
    const { data: created, error } = await supabase
      .from("categories")
      .insert(
        toInsert.map((c) => ({
          name: c.name,
          description: c.description ?? null,
          sort_order: c.sortOrder,
        }))
      )
      .select("id, name");
    if (error) throw error;
    (created ?? []).forEach((c) => byName.set(c.name, c.id as string));
  }

  // Map seed category id -> real category id via category name.
  const seedIdToName = new Map(seedCategories.map((c) => [c.id, c.name]));

  // Idempotent: skip questions whose text already exists, so re-running only
  // adds new starter questions rather than duplicating.
  const { data: existingQs } = await supabase.from("questions").select("question");
  const existingText = new Set((existingQs ?? []).map((q) => q.question));

  for (const q of seedQuestions) {
    if (existingText.has(q.question)) continue;
    const catName = seedIdToName.get(q.categoryId) ?? "";
    const realCatId = byName.get(catName) ?? "";
    await createQuestion({
      categoryId: realCatId,
      subcategory: q.subcategory,
      question: q.question,
      answer: q.answer,
      difficulty: q.difficulty,
      status: q.status,
      keyPoints: q.keyPoints.map((k) => k.point),
      followUps: q.followUps,
      tags: q.tags,
    });
  }
}
