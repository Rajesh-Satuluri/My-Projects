/* Phase 3 — local persistence (spec §7). Dexie/IndexedDB is the MVP ProgressRepository.
   Keyed on stable concept id so shipping new content never orphans progress.
   Versioned so schema changes migrate instead of wiping. */
import Dexie, { type Table } from "dexie";
import type { Card as FsrsCard } from "ts-fsrs";

export type Status = "unseen" | "learning" | "review_due" | "weak" | "learned" | "mastered";

export interface Progress {
  conceptId: string; // primary key
  status: Status;
  fsrs: FsrsCard; // opaque ts-fsrs card state (due/stability/difficulty/reps/lapses…)
  reps: number;
  lapses: number;
  lastSeen: number;
  due: number; // ms epoch, denormalised from fsrs.due for fast querying
  updatedAt: number;
}

class DeShortsDB extends Dexie {
  progress!: Table<Progress, string>;
  constructor() {
    super("de-shorts");
    this.version(1).stores({
      // indexes: pk conceptId, plus due & status for feed/review queries
      progress: "conceptId, due, status",
    });
  }
}

export const db = new DeShortsDB();
