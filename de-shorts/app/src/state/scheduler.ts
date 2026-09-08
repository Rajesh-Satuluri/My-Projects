/* Phase 3 — FSRS scheduling wrapper (spec §4.2). We do NOT reimplement spaced
   repetition; ts-fsrs owns WHEN to review. This maps a user grade to the next
   card state and derives a coarse status the UI shows (algorithm stays hidden). */
import { fsrs, generatorParameters, createEmptyCard, Rating, State, type Card as FsrsCard } from "ts-fsrs";
import type { Progress, Status } from "./db";

const f = fsrs(generatorParameters({ enable_fuzz: true }));

export type Grade = "again" | "hard" | "good" | "easy";
const RATING: Record<Grade, Rating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export const newCard = (): FsrsCard => createEmptyCard(new Date());

/** Derive the coarse status the UI/feed uses from FSRS card state + lapses. */
function deriveStatus(card: FsrsCard, lapses: number): Status {
  if (card.state === State.New) return "unseen";
  if (lapses >= 4) return "weak"; // leech (spec §4.2)
  if (card.state === State.Relearning) return "weak";
  if (card.state === State.Learning) return "learning";
  // Review state: mastered once it is genuinely durable, else learned.
  if (card.stability >= 30) return "mastered";
  return "learned";
}

/** Apply a grade at `now`, returning the new persisted Progress row. */
export function grade(prev: Progress | undefined, conceptId: string, g: Grade, now = new Date()): Progress {
  const card = prev?.fsrs ?? newCard();
  // ts-fsrs `next` accepts its own Grade (Rating minus Manual); our RATING map only
  // ever holds real grades, so this cast is safe.
  const { card: next } = f.next(card, now, RATING[g] as never);
  const lapses = next.lapses ?? 0;
  return {
    conceptId,
    status: deriveStatus(next, lapses),
    fsrs: next,
    reps: next.reps ?? (prev?.reps ?? 0) + 1,
    lapses,
    lastSeen: now.getTime(),
    due: next.due.getTime(),
    updatedAt: now.getTime(),
  };
}
