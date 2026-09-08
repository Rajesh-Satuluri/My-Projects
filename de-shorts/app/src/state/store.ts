/* Phase 3 — progress store (Zustand). Loads all progress from Dexie once, then
   keeps an in-memory map for instant reads; every rating writes through to Dexie
   so it survives reload/background (spec §7). */
import { create } from "zustand";
import { db, type Progress, type Status } from "./db";
import { grade, type Grade } from "./scheduler";

interface ProgressState {
  loaded: boolean;
  byId: Record<string, Progress>;
  load: () => Promise<void>;
  rate: (conceptId: string, g: Grade) => Promise<Progress>;
  statusOf: (conceptId: string) => Status;
  dueCount: () => number;
  dueConceptIds: () => string[];
}

const now = () => Date.now();

export const useProgress = create<ProgressState>((set, get) => ({
  loaded: false,
  byId: {},

  load: async () => {
    try {
      const rows = await db.progress.toArray();
      const byId: Record<string, Progress> = {};
      for (const r of rows) byId[r.conceptId] = r;
      set({ byId, loaded: true });
    } catch {
      set({ loaded: true }); // private mode / blocked storage: run in-memory
    }
  },

  rate: async (conceptId, g) => {
    const prev = get().byId[conceptId];
    const next = grade(prev, conceptId, g);
    set((s) => ({ byId: { ...s.byId, [conceptId]: next } }));
    try {
      await db.progress.put(next);
    } catch {
      /* ignore persistence failure; state stays in memory */
    }
    if ("vibrate" in navigator) navigator.vibrate(g === "again" ? 30 : 12);
    return next;
  },

  statusOf: (conceptId) => get().byId[conceptId]?.status ?? "unseen",
  dueCount: () => {
    const t = now();
    return Object.values(get().byId).filter((p) => p.status !== "unseen" && p.due <= t).length;
  },
  dueConceptIds: () => {
    const t = now();
    return Object.values(get().byId)
      .filter((p) => p.status !== "unseen" && p.due <= t)
      .sort((a, b) => a.due - b.due)
      .map((p) => p.conceptId);
  },
}));
