/* Supabase client — optional, offline-first.
   The whole cloud layer is *opt-in*: if the env vars are absent the client is
   null and every sync call is a silent no-op, so the app behaves exactly like
   the local-only build (Dexie/IndexedDB stays the source of truth).
   The publishable key (sb_publishable_…) is designed to be shipped in the
   browser; Row Level Security on the `progress` table is what keeps it safe. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

/** True when cloud sync is configured for this build. */
export const cloudEnabled = supabase !== null;
