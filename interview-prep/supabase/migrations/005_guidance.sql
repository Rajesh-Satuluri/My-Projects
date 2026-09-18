-- Per-question "what the interviewer is looking for" brief (2–3 lines).
-- Run once in the Supabase SQL editor if your tables already exist.
alter table questions
  add column if not exists guidance text;
