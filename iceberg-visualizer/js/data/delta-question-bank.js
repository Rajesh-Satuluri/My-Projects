/* ============================================================
   Delta Lake question bank — per-screen MCQs, format-keyed.
   Shape: TV.QuestionBank.delta[screenId] = [{ q, options, correct,
   explanation, difficulty }]. Populated per partition; the
   Test-Yourself modal shows its button only where a bank exists.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});
  TV.QuestionBank = TV.QuestionBank || {};
  TV.QuestionBank.delta = TV.QuestionBank.delta || {};

  Object.assign(TV.QuestionBank.delta, {
    'why-delta': [
      {
        q: 'What is the single source of truth for a Delta Lake table?',
        options: ['A Hive metastore row', 'The _delta_log transaction log', 'The newest Parquet file', 'A manifest list file'],
        correct: 1,
        explanation: 'Delta’s _delta_log — ordered JSON commits plus periodic Parquet checkpoints — defines exactly which files and schema make up the table at each version.',
        difficulty: 'basic',
      },
      {
        q: 'How does Delta give ACID guarantees on object storage?',
        options: ['Row locking in S3', 'Atomic creation of the next numbered commit file in _delta_log', 'A background daemon', 'Renaming the whole table directory'],
        correct: 1,
        explanation: 'A writer commits by atomically creating version N’s JSON. If two writers race, only one wins version N; the other detects the conflict and retries — snapshot isolation without corruption.',
        difficulty: 'intermediate',
      },
    ],
    'architecture': [
      {
        q: 'A Delta reader with no checkpoint present must do what to learn the current file set?',
        options: ['Read every Parquet footer', 'Replay all JSON commits from version 0', 'Ask the catalog for the file list', 'List the directory'],
        correct: 1,
        explanation: 'Without a checkpoint the reader replays the ordered JSON commits from 0, applying add/remove actions. Checkpoints exist precisely to bound this replay.',
        difficulty: 'intermediate',
      },
    ],
  });
})();
