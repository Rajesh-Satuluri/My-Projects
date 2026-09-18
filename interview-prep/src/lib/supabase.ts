import { createClient } from "@supabase/supabase-js";

// Browser Supabase client. The URL and publishable (anon) key are public by
// design — they ship in the client bundle and Row-Level Security is what
// actually protects the data. Values come from NEXT_PUBLIC_* env at build time.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
