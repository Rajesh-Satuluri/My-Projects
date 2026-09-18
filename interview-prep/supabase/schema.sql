-- Interview Prep — Supabase schema (Phase 1 reference; not applied in Phase 0).
-- Run this in the Supabase SQL editor once the project exists.
-- RLS scopes every row to the authenticated user (personal single-user tool).

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  category_id uuid references categories(id) on delete set null,
  subcategory text,
  question text not null,
  answer text,
  difficulty text not null default 'Medium' check (difficulty in ('Easy','Medium','Hard')),
  status text not null default 'Not Prepared' check (status in ('Prepared','Not Prepared')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_reviewed_at timestamptz
);

create table if not exists question_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  question_id uuid not null references questions(id) on delete cascade,
  point text not null,
  sort_order int not null default 0,
  completed boolean not null default false
);

create table if not exists follow_up_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  question_id uuid not null references questions(id) on delete cascade,
  question text not null
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  unique (user_id, name)
);

create table if not exists question_tags (
  question_id uuid not null references questions(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (question_id, tag_id)
);

-- Row Level Security
alter table categories enable row level security;
alter table questions enable row level security;
alter table question_points enable row level security;
alter table follow_up_questions enable row level security;
alter table tags enable row level security;
alter table question_tags enable row level security;

-- Direct-ownership tables: user can see/modify only their own rows.
do $$
declare t text;
begin
  foreach t in array array['categories','questions','question_points','follow_up_questions','tags']
  loop
    execute format($f$
      create policy "own_rows_select" on %1$I for select using (user_id = auth.uid());
      create policy "own_rows_insert" on %1$I for insert with check (user_id = auth.uid());
      create policy "own_rows_update" on %1$I for update using (user_id = auth.uid());
      create policy "own_rows_delete" on %1$I for delete using (user_id = auth.uid());
    $f$, t);
  end loop;
end $$;

-- Join table: ownership derived from the parent question.
create policy "qt_all" on question_tags for all
  using (exists (select 1 from questions q where q.id = question_id and q.user_id = auth.uid()))
  with check (exists (select 1 from questions q where q.id = question_id and q.user_id = auth.uid()));
