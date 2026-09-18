-- Interview Prep — run-everything setup. Safe to run anytime (idempotent).
-- Paste this whole block into Supabase → SQL Editor → New query → Run.

-- Optional columns on questions (features added over time)
alter table questions add column if not exists answer_locked boolean not null default false;
alter table questions add column if not exists pinned        boolean not null default false;
alter table questions add column if not exists guidance      text;

-- Notes (free-form tabbed documents)
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null default 'Untitled',
  body text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table notes enable row level security;

drop policy if exists "notes_select" on notes;
drop policy if exists "notes_insert" on notes;
drop policy if exists "notes_update" on notes;
drop policy if exists "notes_delete" on notes;

create policy "notes_select" on notes for select using (user_id = auth.uid());
create policy "notes_insert" on notes for insert with check (user_id = auth.uid());
create policy "notes_update" on notes for update using (user_id = auth.uid());
create policy "notes_delete" on notes for delete using (user_id = auth.uid());
