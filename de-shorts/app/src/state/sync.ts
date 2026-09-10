/* Cloud sync for progress — offline-first, last-write-wins.
   Dexie remains the source of truth. When a user is signed in we:
     • pull their remote rows and merge (newer updatedAt wins) into local,
     • push local rows up,
   and thereafter push each rating in the background. With no session, or no
   Supabase config, every function here is a harmless no-op. */
import { supabase, cloudEnabled } from "../lib/supabase";
import { db, type Progress } from "./db";

// Remote row shape: the whole Progress object lives in a jsonb `data` column,
// with `updated_at` denormalised for cheap last-write-wins comparison.
interface Row {
  user_id: string;
  concept_id: string;
  data: Progress;
  updated_at: number;
}

export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Merge remote → local and local → remote. Called once after sign-in / load. */
export async function fullSync(): Promise<{ pulled: number; pushed: number } | null> {
  if (!supabase) return null;
  const uid = await currentUserId();
  if (!uid) return null;

  // pull
  const { data: rows, error } = await supabase
    .from("progress")
    .select("concept_id, data, updated_at")
    .returns<Pick<Row, "concept_id" | "data" | "updated_at">[]>();
  if (error) throw error;

  const local = new Map<string, Progress>();
  try {
    for (const p of await db.progress.toArray()) local.set(p.conceptId, p);
  } catch {
    /* storage blocked — merge against empty local */
  }

  const remote = new Map<string, Progress>();
  let pulled = 0;
  for (const r of rows ?? []) {
    remote.set(r.concept_id, r.data);
    const l = local.get(r.concept_id);
    if (!l || r.updated_at > l.updatedAt) {
      try {
        await db.progress.put(r.data);
      } catch {
        /* ignore */
      }
      local.set(r.concept_id, r.data);
      pulled++;
    }
  }

  // push anything local that is newer/absent remotely
  const toPush: Row[] = [];
  for (const [id, p] of local) {
    const r = remote.get(id);
    if (!r || p.updatedAt > r.updatedAt) {
      toPush.push({ user_id: uid, concept_id: id, data: p, updated_at: p.updatedAt });
    }
  }
  let pushed = 0;
  if (toPush.length) {
    const { error: upErr } = await supabase.from("progress").upsert(toPush);
    if (upErr) throw upErr;
    pushed = toPush.length;
  }
  return { pulled, pushed };
}

/** Push a single rating in the background. Never throws — fire and forget. */
export async function pushOne(p: Progress): Promise<void> {
  if (!supabase) return;
  try {
    const uid = await currentUserId();
    if (!uid) return;
    await supabase
      .from("progress")
      .upsert({ user_id: uid, concept_id: p.conceptId, data: p, updated_at: p.updatedAt });
  } catch {
    /* offline / signed-out: local Dexie already has it; next fullSync reconciles */
  }
}

export { cloudEnabled };
