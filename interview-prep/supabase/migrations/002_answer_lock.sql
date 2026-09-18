-- Adds a per-question answer lock. When locked, the answer is read-only in the
-- UI until unlocked; the lock state is stored here so it syncs across devices.
-- Run this once in the Supabase SQL editor if your tables already exist.
alter table questions
  add column if not exists answer_locked boolean not null default false;
