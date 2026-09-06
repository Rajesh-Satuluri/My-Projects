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
    {
      q: 'Why does metadata-first design beat Hive-style directory listing at scale?',
      options: [
        'It compresses data better',
        'Planning reads a small metadata tree instead of an O(n) listing of millions of files/directories',
        'It uses fewer columns',
        'It avoids Parquet',
      ],
      correct: 1,
      explanation: 'Hive must list directories to discover files — O(n) and slow on object stores. Iceberg records every file with stats in metadata, so planning is metadata-only and independent of table size.',
      difficulty: 'advanced',
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
    {
      q: 'In Merge-on-Read, how do position deletes differ from equality deletes?',
      options: [
        'They are identical',
        'Position deletes target (file_path, row position); equality deletes match column values across files',
        'Position deletes rewrite data files',
        'Equality deletes are JSON',
      ],
      correct: 1,
      explanation: 'Position deletes point at exact rows in specific files (precise, cheap). Equality deletes specify values (e.g. customer_id=X) and apply wherever they match — ideal for CDC/GDPR without knowing row positions.',
      difficulty: 'advanced',
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
    {
      q: 'MERGE INTO is the canonical pattern for which workload?',
      options: [
        'Full table scans',
        'CDC upserts — insert new, update changed, optionally delete — in one atomic commit',
        'Compaction',
        'Schema migration',
      ],
      correct: 1,
      explanation: 'MERGE matches a source change feed against the target and applies insert/update/delete atomically — the standard change-data-capture / upsert workflow.',
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
    {
      q: 'Which schema change is NOT guaranteed safe in Iceberg?',
      options: ['Adding an optional column', 'Renaming a column', 'Widening int → long', 'Narrowing long → int'],
      correct: 3,
      explanation: 'Add, drop, rename, reorder, and widening promotions (int→long, float→double, decimal precision increase) are safe. Narrowing a type (long→int) can lose data and is not a safe evolution.',
      difficulty: 'advanced',
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
    {
      q: 'Which is NOT a standard Iceberg partition transform?',
      options: ['bucket(N, col)', 'truncate(W, col)', 'day / month / year / hour', 'sort(col)'],
      correct: 3,
      explanation: 'Partition transforms are identity, bucket, truncate, and the temporal year/month/day/hour. Sorting is a sort order, not a partition transform.',
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
    {
      q: 'Which SQL reads the table as of a past state?',
      options: [
        'SELECT ... AS PAST',
        'SELECT ... VERSION AS OF <snapshot-id>  /  TIMESTAMP AS OF <ts>',
        'SELECT ... ROLLBACK',
        'SELECT ... SNAPSHOT()',
      ],
      correct: 1,
      explanation: 'Time travel uses VERSION AS OF <snapshot-id> or TIMESTAMP AS OF <timestamp> (syntax varies slightly by engine). It reads the historical snapshot without changing the current pointer.',
      difficulty: 'basic',
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
    {
      q: 'How does column-level pruning inside a manifest skip files?',
      options: [
        'It reads every Parquet footer first',
        'It compares the predicate to each file’s min/max/null stats and drops files that cannot match',
        'It uses the catalog',
        'It scans the manifest list only',
      ],
      correct: 1,
      explanation: 'Each manifest entry carries per-column lower/upper bounds and null counts, so the planner eliminates non-matching files before opening any data file.',
      difficulty: 'intermediate',
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
    {
      q: 'What does expireSnapshots do, and what is the risk of an aggressive retention window?',
      options: [
        'Deletes data files immediately on every commit',
        'Removes old snapshots + their now-unreferenced files; too-short retention breaks time travel and in-flight readers',
        'Compacts manifests only',
        'Rewrites the schema',
      ],
      correct: 1,
      explanation: 'expireSnapshots drops snapshots older than the retention window and garbage-collects files no live snapshot references. Set it too aggressively and you lose time-travel history and can pull files out from under long-running readers.',
      difficulty: 'advanced',
    },
  ],

  update: [
    {
      q: 'In Copy-on-Write mode, an UPDATE that touches rows in one data file causes what?',
      options: [
        'A delete file is written next to the original',
        'The entire data file is rewritten with the updated rows; old file dropped from the new manifest',
        'metadata.json is edited in place',
        'Only the changed rows are patched inside the Parquet file',
      ],
      correct: 1,
      explanation: 'Copy-on-Write rewrites the whole affected data file with the new values. Fast reads (no merge), expensive writes. Merge-on-Read instead writes a delete file + a small data file and resolves them at read time.',
      difficulty: 'intermediate',
    },
    {
      q: 'A Merge-on-Read UPDATE produces which files?',
      options: [
        'Only a rewritten data file',
        'A delete file (invalidating the old rows) plus a new data file with the updated rows',
        'Only a new metadata.json',
        'A manifest list only',
      ],
      correct: 1,
      explanation: 'MoR marks the old rows deleted via a delete file and appends the new versions in a new data file. Cheap writes, but reads must merge deletes — which is why you periodically compact.',
      difficulty: 'advanced',
    },
  ],

  overwrite: [
    {
      q: 'On a partitioned table, dynamic INSERT OVERWRITE replaces what?',
      options: [
        'The entire table',
        'Only the partitions produced by the query',
        'Nothing — it always appends',
        'The metadata.json but no data',
      ],
      correct: 1,
      explanation: 'Dynamic overwrite (partitionOverwriteMode=dynamic) replaces only the partitions the incoming data lands in, leaving other partitions untouched. Static overwrite replaces everything matching the overwrite filter.',
      difficulty: 'intermediate',
    },
    {
      q: 'Why is INSERT OVERWRITE safe for readers mid-operation?',
      options: [
        'It locks the table',
        'It commits a new snapshot atomically — readers see the old or new state, never a partial one',
        'It pauses all queries',
        'It writes to a temp table first, then renames directories',
      ],
      correct: 1,
      explanation: 'Like every Iceberg write, overwrite is an atomic snapshot commit. There is no window where a reader sees half-replaced data.',
      difficulty: 'basic',
    },
  ],

  append: [
    {
      q: 'What makes a "fast append" cheap compared with other writes?',
      options: [
        'It rewrites all manifests each time',
        'It adds new data files and a new manifest without rewriting existing manifests',
        'It skips the snapshot commit',
        'It edits data files in place',
      ],
      correct: 1,
      explanation: 'Fast append only writes new manifest entries for the added files and inherits the parent snapshot’s existing manifests, so the commit stays O(new files) rather than O(table).',
      difficulty: 'intermediate',
    },
    {
      q: 'Frequent streaming appends can hurt query performance because they',
      options: [
        'Corrupt the schema',
        'Create many small files and manifests, inflating planning time until compaction',
        'Delete old snapshots',
        'Disable partition pruning',
      ],
      correct: 1,
      explanation: 'Each micro-batch commit adds files and manifests. Without periodic rewriteDataFiles / rewriteManifests, the metadata explodes and planning slows — the classic streaming-into-Iceberg pitfall.',
      difficulty: 'intermediate',
    },
  ],

  'write-path': [
    {
      q: 'Put the Iceberg write path in order.',
      options: [
        'Commit metadata → write data files → write manifests',
        'Stage data files → write manifest file(s) → write manifest list → atomically swap metadata pointer',
        'Swap metadata pointer → write data → write manifests',
        'Write manifest list → stage data → commit',
      ],
      correct: 1,
      explanation: 'A writer first stages data files, then writes manifest file(s) describing them, then a manifest list for the new snapshot, then commits by atomically swapping the catalog’s current-metadata pointer.',
      difficulty: 'advanced',
    },
    {
      q: 'The "commit" in an Iceberg write is precisely',
      options: [
        'Flushing Parquet files to S3',
        'The atomic compare-and-swap of the catalog pointer to the new metadata.json',
        'Writing the manifest list',
        'Acquiring a table lock',
      ],
      correct: 1,
      explanation: 'Data and metadata are written speculatively; the transaction becomes real only when the catalog pointer is atomically swapped. That single atomic operation is the commit.',
      difficulty: 'intermediate',
    },
  ],

  'catalog-explorer': [
    {
      q: 'What does a REST catalog offer over a Hive Metastore?',
      options: [
        'It stores the actual data',
        'A vendor-neutral HTTP API for catalog + commit operations, enabling managed, multi-engine catalogs',
        'Faster Parquet compression',
        'Automatic compaction',
      ],
      correct: 1,
      explanation: 'The REST catalog spec decouples engines from a specific metastore implementation. Providers (Tabular/Polaris/Unity/Nessie) implement the API, and any Iceberg engine can talk to it.',
      difficulty: 'intermediate',
    },
    {
      q: 'The single responsibility every Iceberg catalog must provide is',
      options: [
        'Running queries',
        'Mapping a table identifier to its current metadata.json and performing the atomic commit swap',
        'Storing column statistics',
        'Compacting data files',
      ],
      correct: 1,
      explanation: 'A catalog resolves table name → current metadata pointer and guarantees the atomic swap on commit. Everything else (Glue, Hive, Nessie, REST, JDBC, Hadoop) is an implementation of that contract.',
      difficulty: 'basic',
    },
  ],

  performance: [
    {
      q: 'Where does Iceberg’s biggest query-planning speedup come from?',
      options: [
        'Compressing data more aggressively',
        'Pruning files via partition + column stats in metadata, avoiding directory listing and file scans',
        'Caching query results',
        'Running on more executors',
      ],
      correct: 1,
      explanation: 'Planning reads only metadata and skips non-matching manifests (partition stats) and files (column min/max/null stats). A 6 PB table plans as fast as a small one because no O(n) listing happens.',
      difficulty: 'advanced',
    },
    {
      q: 'A table has millions of tiny files and slow queries. Best first fix?',
      options: [
        'Add more partitions',
        'Compact with rewriteDataFiles (and rewriteManifests), targeting a sensible file size',
        'Drop column statistics',
        'Switch to Hive tables',
      ],
      correct: 1,
      explanation: 'Small-file problems are solved by compaction (rewriteDataFiles to ~128–512 MB targets) plus manifest consolidation. This cuts both open costs and planning time.',
      difficulty: 'intermediate',
    },
  ],

  'manifest-explorer': [
    {
      q: 'What does a single manifest FILE store for each data file it lists?',
      options: [
        'The full rows',
        'Path, partition values, record count, and column stats (min/max/null counts) + status',
        'Only the file path',
        'The table schema',
      ],
      correct: 1,
      explanation: 'A manifest file lists DataFile entries with per-column min/max/null stats, partition tuple, record/file counts, and ADDED/EXISTING/DELETED status — this is what powers file-level pruning.',
      difficulty: 'intermediate',
    },
    {
      q: 'How does the manifest LIST differ from a manifest FILE?',
      options: [
        'They are the same thing',
        'The list points to manifests with partition-level summaries; a manifest file points to data files with column-level stats',
        'The list stores data; the file stores schema',
        'The list is JSON; the file is CSV',
      ],
      correct: 1,
      explanation: 'The manifest list (snap-*.avro, one per snapshot) enables manifest-level pruning by partition range; each manifest file then enables file-level pruning by column stats. Two resolution levels.',
      difficulty: 'basic',
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
