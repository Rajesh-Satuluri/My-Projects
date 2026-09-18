-- Free-form notes (tabs), each an unbounded document. Run once in the SQL editor.
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

create policy "notes_select" on notes for select using (user_id = auth.uid());
create policy "notes_insert" on notes for insert with check (user_id = auth.uid());
create policy "notes_update" on notes for update using (user_id = auth.uid());
create policy "notes_delete" on notes for delete using (user_id = auth.uid());
