-- Adds a pin/favorite flag so important questions can sort to the top.
-- Run once in the Supabase SQL editor if your tables already exist.
alter table questions
  add column if not exists pinned boolean not null default false;
