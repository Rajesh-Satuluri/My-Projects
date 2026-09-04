/* ============================================================
   Question Bank — per-screen MCQs, keyed by screen id.
   Shape: { screenId: [{ q, options, correct, explanation, difficulty }] }
   difficulty: 'basic' | 'intermediate' | 'advanced'
   Consumed by the Study Deck (js/modules/study.js) and Quiz Mode.
   ============================================================ */
window.IcebergViz = window.IcebergViz || {};

window.IcebergViz.QuestionBank = {
  'why-iceberg': [
    {
      q: 'What core problem does Apache Iceberg solve that plain Parquet-on-S3 does not?',
      options: [
        'Faster column compression',
        'ACID transactions, schema/partition evolution, and time travel on object storage',
        'A new columnar file format that replaces Parquet',
        'A distributed query engine',
      ],
      correct: 1,
      explanation: 'Iceberg is a table format. It adds ACID commits, safe schema/partition evolution, and time travel over immutable files on object storage — it is not a storage or query engine.',
      difficulty: 'basic',
    },
    {
      q: 'Why does directory-listing-based partitioning (Hive-style) break down at scale?',
      options: [
        'S3 charges per byte listed',
        'Listing millions of directories/files is O(n) and dominates query planning',
        'Parquet footers become too large',
        'It cannot store column statistics',
      ],
      correct: 1,
      explanation: 'Hive relies on listing directories to find files, which is O(n) and slow on object stores. Iceberg keeps a metadata tree so planning reads only metadata — a 6 PB table plans as fast as a 10 GB one.',
      difficulty: 'intermediate',
    },
  ],

  architecture: [
    {
      q: 'What are the five layers of the Iceberg metadata hierarchy, top to bottom?',
      options: [
        'metadata.json → catalog → manifest list → manifest → data files',
        'Catalog → metadata.json → manifest list → manifest files → data files',
        'Catalog → snapshot → schema → partition spec → data files',
        'Data files → manifests → manifest list → metadata.json → catalog',
      ],
      correct: 1,
      explanation: 'Catalog points to the current metadata.json, which references a manifest list (snap-*.avro) per snapshot, which lists manifest files, which list the data files. Each layer carries statistics for pruning.',
      difficulty: 'basic',
    },
    {
      q: 'Which layer enables skipping whole groups of files without opening any manifest?',
      options: [
        'The Parquet footer',
        'The manifest list (snap-*.avro), via partition-level stats',
        'The catalog',
        'metadata.json',
      ],
      correct: 1,
      explanation: 'The manifest list stores partition-range stats per manifest, so the planner can skip entire manifests before ever opening one.',
      difficulty: 'intermediate',
    },
  ],

  'metadata-explorer': [
    {
      q: 'Which file is the "brain" of an Iceberg table, holding schema, snapshots, and the current-snapshot-id?',
      options: ['manifest list (.avro)', 'a manifest file (.avro)', 'metadata.json', 'the catalog entry'],
      correct: 2,
      explanation: 'metadata.json holds the schema, partition specs, sort orders, snapshot log, and current-snapshot-id. The catalog only maps the table name to the current metadata.json location.',
      difficulty: 'basic',
    },
  ],

  'create-table': [
    {
      q: 'When you CREATE TABLE in Iceberg, what does the catalog store?',
      options: [
        'The full table data',
        'A pointer to the current metadata.json location',
        'The manifest list only',
        'A copy of the schema as SQL DDL',
      ],
      correct: 1,
      explanation: 'The catalog maps table identifier → current metadata.json path. Committing a change is an atomic swap of that pointer.',
      difficulty: 'basic',
    },
  ],

  insert: [
    {
      q: 'A successful INSERT into an Iceberg table produces what?',
      options: [
        'An in-place edit of existing data files',
        'New data files + a new snapshot committed atomically',
        'A row-level update to metadata.json only',
        'A lock on the table until the writer finishes',
      ],
      correct: 1,
      explanation: 'Writers stage new data files and metadata, then atomically commit a new snapshot. Readers always see a fully committed snapshot — never partial writes.',
      difficulty: 'basic',
    },
    {
      q: 'Two INSERTs commit concurrently. How does Iceberg keep them consistent without a lock service?',
      options: [
        'It serializes writes through the catalog queue',
        'Optimistic concurrency: each swaps the metadata pointer; the loser retries',
        'It merges both writers\' files automatically',
        'The second write is silently dropped',
      ],
      correct: 1,
      explanation: 'Iceberg uses optimistic concurrency. Each writer attempts an atomic compare-and-swap of the metadata pointer; on conflict the loser re-reads current state and retries.',
      difficulty: 'advanced',
    },
  ],

  delete: [
    {
      q: 'In Copy-on-Write (CoW) DELETE mode, what happens to an affected data file?',
      options: [
        'A small delete file is written next to it',
        'The whole file is rewritten without the deleted rows',
        'Rows are tombstoned in the Parquet footer',
        'Nothing — only metadata.json changes',
      ],
      correct: 1,
      explanation: 'CoW rewrites the entire affected data file minus the deleted rows: fast reads, expensive writes. Merge-on-Read instead writes small delete files and resolves them at read time.',
      difficulty: 'intermediate',
    },
  ],

  merge: [
    {
      q: 'What makes MERGE INTO powerful for upserts in Iceberg?',
      options: [
        'It bypasses snapshots for speed',
        'It matches source vs target and applies insert/update/delete in one atomic commit',
        'It locks the target table during execution',
        'It only supports append-only inserts',
      ],
      correct: 1,
      explanation: 'MERGE INTO expresses matched/not-matched clauses (update, delete, insert) and commits them as one atomic snapshot — the standard upsert/CDC pattern.',
      difficulty: 'intermediate',
    },
  ],

  'schema-evolution': [
    {
      q: 'How can Iceberg rename a column without rewriting any data files?',
      options: [
        'It rewrites Parquet footers lazily',
        'Columns are tracked by permanent integer IDs, not names',
        'It keeps a name-mapping table in the catalog',
        'It cannot — renames require a full rewrite',
      ],
      correct: 1,
      explanation: 'Each column gets a permanent ID at creation. Readers resolve by ID, so renames, reorders, and type widening are metadata-only operations.',
      difficulty: 'intermediate',
    },
  ],

  'hidden-partitioning': [
    {
      q: 'With hidden partitioning, how does a user get partition pruning on a daily partition?',
      options: [
        'They must filter on a synthetic event_day column',
        'They filter on the raw timestamp; Iceberg applies the day() transform automatically',
        'They must add a PARTITION hint to the query',
        'Pruning only works if the data is pre-sorted',
      ],
      correct: 1,
      explanation: 'Iceberg stores the partition transform (e.g. day(ts)) and derives partition values itself, so filtering on the business column prunes partitions with no extra user column.',
      difficulty: 'intermediate',
    },
  ],

  'partition-evolution': [
    {
      q: 'What happens to existing data when you change a table\'s partition spec?',
      options: [
        'All data is rewritten under the new spec',
        'Old files keep the old spec; new writes use the new spec, both queryable',
        'The table must be recreated',
        'Old data becomes unreadable',
      ],
      correct: 1,
      explanation: 'Partition evolution is metadata-only. Old manifests describe files under the old spec; new writes use the new spec. The planner translates predicates per-spec at query time.',
      difficulty: 'advanced',
    },
  ],

  'snapshot-explorer': [
    {
      q: 'What is an Iceberg snapshot?',
      options: [
        'A cached query result',
        'An immutable pointer to the complete table state at a point in time',
        'A backup copy of all data files',
        'The Parquet row group index',
      ],
      correct: 1,
      explanation: 'Every write creates a new immutable snapshot atomically. Snapshots enable isolation, time travel, and rollback.',
      difficulty: 'basic',
    },
  ],

  'time-travel': [
    {
      q: 'How is a rollback to a previous snapshot an O(1) operation?',
      options: [
        'It restores data files from a backup',
        'It only rewrites metadata.json to point at the old snapshot id',
        'It replays the write log in reverse',
        'It re-runs all past transactions',
      ],
      correct: 1,
      explanation: 'Snapshots are immutable and retained, so rollback just repoints current-snapshot-id in a new metadata.json — no data movement.',
      difficulty: 'intermediate',
    },
  ],

  'read-path': [
    {
      q: 'Put the read path in order: (1) manifests, (2) catalog, (3) manifest list, (4) metadata.json, (5) data files.',
      options: [
        '2 → 4 → 3 → 1 → 5',
        '4 → 2 → 3 → 1 → 5',
        '2 → 3 → 4 → 1 → 5',
        '1 → 2 → 3 → 4 → 5',
      ],
      correct: 0,
      explanation: 'Catalog → metadata.json (current snapshot) → manifest list (skip manifests by partition) → manifests (skip files by column stats) → qualifying data files.',
      difficulty: 'advanced',
    },
  ],

  'query-planner': [
    {
      q: 'A Spark query spends 45 minutes just planning. Most likely cause?',
      options: [
        'Too few executors',
        'Manifest explosion from many tiny streaming commits',
        'Parquet compression set too high',
        'The catalog is unreachable',
      ],
      correct: 1,
      explanation: 'Millions of small manifests from frequent micro-batches blow up planning. Fix with rewriteManifests / compaction and fewer, larger commits.',
      difficulty: 'advanced',
    },
  ],

  concurrency: [
    {
      q: 'Iceberg\'s optimistic concurrency means a losing writer will…',
      options: [
        'Corrupt the table',
        'Re-read the latest metadata and retry its commit',
        'Block until the winner finishes',
        'Silently discard its data',
      ],
      correct: 1,
      explanation: 'The atomic pointer swap has exactly one winner; the loser retries against the new current state (or fails per its conflict policy). No central lock is needed.',
      difficulty: 'intermediate',
    },
  ],

  maintenance: [
    {
      q: 'Which maintenance action reduces the number of small data files to speed up reads?',
      options: ['expireSnapshots', 'rewriteDataFiles (compaction)', 'removeOrphanFiles', 'rewriteManifests'],
      correct: 1,
      explanation: 'rewriteDataFiles compacts many small files into fewer large ones (a replace snapshot). rewriteManifests consolidates manifests; expireSnapshots/removeOrphanFiles reclaim storage.',
      difficulty: 'intermediate',
    },
  ],
};

/* Per-screen Q&A collector: prefer a curated Q&A bank (none yet), else
   derive from the quiz bank (question + explanation-as-answer). Consumed
   by the Study Deck and available to any module that wants inline Q&A. */
window.IcebergViz.QABank = window.IcebergViz.QABank || {};
window.IcebergViz.collectQA = function (screenId) {
  const curated = window.IcebergViz.QABank[screenId];
  if (curated && curated.length) return curated.slice();
  const qb = window.IcebergViz.QuestionBank[screenId] || [];
  return qb.map(x => ({ q: x.q, a: x.explanation, difficulty: x.difficulty }));
};
