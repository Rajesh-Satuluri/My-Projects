/* ============================================================
   Apache Hudi question bank — per-screen MCQs, format-keyed.
   Shape: TV.QuestionBank.hudi[screenId] = [{ q, options, correct,
   explanation, difficulty }]. Grown per partition; the
   Test-Yourself modal shows its button only where a bank exists.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});
  TV.QuestionBank = TV.QuestionBank || {};
  TV.QuestionBank.hudi = TV.QuestionBank.hudi || {};

  Object.assign(TV.QuestionBank.hudi, {
    'why-hudi': [
      {
        q: 'What is Apache Hudi optimized for that sets it apart from a plain columnar table?',
        options: ['Batch-only appends', 'Record-level upserts and incremental processing', 'Graph queries', 'Full-text search'],
        correct: 1,
        explanation: 'Hudi is record-key centric: upserts, deletes, and incremental queries are first-class, which is why it shines for streaming/CDC ingestion.',
        difficulty: 'basic',
      },
      {
        q: 'Where does Hudi record every action taken on a table?',
        options: ['A Hive table', 'The timeline under .hoodie/', 'Each Parquet footer', 'A manifest list'],
        correct: 1,
        explanation: 'The timeline in .hoodie/ is an ordered log of instants (action + state + time) — the source of truth for the table’s history.',
        difficulty: 'basic',
      },
    ],
    'architecture': [
      {
        q: 'A Hudi file slice consists of what?',
        options: ['Only a Parquet base file', 'A base Parquet file plus any Avro log files since the last compaction', 'Two Parquet files', 'A JSON commit'],
        correct: 1,
        explanation: 'A file slice is one version of a file group: the base Parquet file and the row-based Avro log files written against it (for MoR).',
        difficulty: 'intermediate',
      },
    ],
    'table-types': [
      {
        q: 'How does a Merge-on-Read (MoR) table handle an update?',
        options: ['Rewrites the base file immediately', 'Appends the change to an Avro log file, merged on read', 'Ignores it until VACUUM', 'Creates a new table'],
        correct: 1,
        explanation: 'MoR appends updates to log files (cheap writes) and merges them with the base file at read time, until compaction materializes a new base file.',
        difficulty: 'intermediate',
      },
      {
        q: 'Copy-on-Write (CoW) trades which way?',
        options: ['Cheap writes, costly reads', 'Costly writes (rewrite base files), fast clean reads', 'No time travel', 'No indexing'],
        correct: 1,
        explanation: 'CoW rewrites the affected base files on every write, so reads are clean columnar scans with no merge — at the cost of heavier writes.',
        difficulty: 'intermediate',
      },
    ],
    'upsert': [
      {
        q: 'During an upsert, what does Hudi use to find which file group a record key belongs to?',
        options: ['A full table scan', 'The index (Bloom / bucket / record-level)', 'The Parquet footer', 'The catalog'],
        correct: 1,
        explanation: 'The index maps record keys to file groups, so an upsert can locate and update the right files instead of scanning everything.',
        difficulty: 'intermediate',
      },
    ],
  });
})();
