# Interview Prep

Personal interview-preparation dashboard — store, organize, practice and track
interview questions (Data Engineering / o9 Integration).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Phase 1) · Vercel.

## Status

**Phase 0 — template (current).** Full responsive UI running on local seed
data. No database or auth yet.

- Dashboard (counts, categories, recently reviewed)
- Questions list with search + filters (category / difficulty / status / tag)
- Question detail (answer reveal, key-point checklist, follow-ups, tags)
- Categories
- Practice deck (flip through questions, self-check)
- Checklists, Settings placeholders

All data flows through `src/lib/data.ts` — the single seam that Phase 1 swaps
from seed arrays to Supabase queries.

## Run locally

```bash
cd interview-prep
npm install
npm run dev
# http://localhost:3000
```

## Phase 1 — Supabase (next)

1. Create a Supabase project; run `supabase/schema.sql` in the SQL editor.
2. Copy `.env.local.example` → `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`
   and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Add Supabase Auth (email login) and rewrite `src/lib/data.ts` to query
   Supabase. Add create/edit/delete flows so questions are managed from the UI.

## Roadmap

- **Phase 2:** random question, review history, progress stats.
- **Phase 3 (optional):** AI answer evaluation, follow-up generation, mock mode.
