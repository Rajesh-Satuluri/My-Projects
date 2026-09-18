-- Answers are read-only by default; you click Edit to make changes.
-- Flip the default for new rows and lock all existing questions.
-- Run once in the Supabase SQL editor.
alter table questions alter column answer_locked set default true;
update questions set answer_locked = true;
