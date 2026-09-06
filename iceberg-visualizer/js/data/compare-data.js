/* ============================================================
   Compare mode dataset — Iceberg vs Delta Lake.
   Single source of truth for the comparison matrix and the
   concept-by-concept side-by-side modules. Kept data-driven so
   a third format (Hudi) could extend the same shape later
   WITHOUT any shipped-UI trace today.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  // Overview matrix — one row per dimension, one cell per format.
  const MATRIX = [
    {
      dim: 'Metadata model',
      iceberg: 'Immutable snapshot tree: metadata.json → manifest list → manifest files → data files.',
      delta:   'Ordered transaction log (_delta_log): JSON commits + periodic Parquet checkpoints.',
    },
    {
      dim: 'Source of truth',
      iceberg: 'The current metadata.json pointer held by the catalog.',
      delta:   'The latest version file in _delta_log (replayed from the last checkpoint).',
    },
    {
      dim: 'Commit mechanism',
      iceberg: 'Atomic swap of the metadata pointer (compare-and-swap) via the catalog.',
      delta:   'Atomic put-if-absent of the next numbered commit file (version N).',
    },
    {
      dim: 'Concurrency',
      iceberg: 'Optimistic concurrency; conflict detection on the pointer swap, then retry.',
      delta:   'Optimistic concurrency; loser of the version race re-reads and retries.',
    },
    {
      dim: 'Row-level deletes',
      iceberg: 'Copy-on-write, or merge-on-read via positional / equality delete files (v2).',
      delta:   'Copy-on-write, or merge-on-read via deletion vectors (row-position bitmaps).',
    },
    {
      dim: 'Schema evolution',
      iceberg: 'Columns tracked by permanent field IDs; add/drop/rename/reorder, safe widening.',
      delta:   'Schema in the metaData action; add is metadata-only; rename/drop need column mapping.',
    },
    {
      dim: 'Partitioning',
      iceberg: 'Hidden partitioning via transforms; partition evolution without rewrite.',
      delta:   'Directory partitioning or generated columns; liquid clustering as the modern default.',
    },
    {
      dim: 'Data skipping',
      iceberg: 'Per-file column stats in manifests; two-level (manifest, then file) pruning.',
      delta:   'Per-file min/max stats in add actions; file pruning after partition pruning.',
    },
    {
      dim: 'Time travel',
      iceberg: 'VERSION AS OF <snapshot-id> or TIMESTAMP AS OF; rollback via RESTORE / procedures.',
      delta:   'VERSION AS OF <n> or TIMESTAMP AS OF; rollback via RESTORE TABLE.',
    },
    {
      dim: 'Retention / cleanup',
      iceberg: 'expire_snapshots + remove_orphan_files; bounds time-travel depth.',
      delta:   'VACUUM removes tombstoned files past retention; bounds time-travel depth.',
    },
    {
      dim: 'Compaction',
      iceberg: 'rewrite_data_files (binpack / sort / zorder) + rewrite_manifests.',
      delta:   'OPTIMIZE (bin-pack) and OPTIMIZE … ZORDER BY; auto-optimize options.',
    },
    {
      dim: 'Engine reach',
      iceberg: 'Broadly engine-neutral: Spark, Flink, Trino, Dremio, Snowflake, BigQuery; REST catalog spec.',
      delta:   'Spark/Databricks-first, broadening via the open protocol, delta-kernel, delta-rs, UniForm.',
    },
    {
      dim: 'Change feed',
      iceberg: 'Read incremental changes between snapshots (changelog scans).',
      delta:   'Change Data Feed: row-level inserts/deletes and update pre/post images.',
    },
    {
      dim: 'Best-fit shops',
      iceberg: 'Multi-engine lakehouses and very large tables that must avoid engine lock-in.',
      delta:   'Databricks-centric platforms wanting the deepest first-party tooling.',
    },
  ];

  // Concept-by-concept side-by-side. Each concept has an Iceberg side
  // and a Delta side (points + a small code/annotation block), plus a
  // shared takeaway line. Points render as bullet lists.
  const CONCEPTS = {
    'metadata-model': {
      title: 'Metadata Model',
      intro: 'How each format records which files and schema make up the table at a given version — the core architectural difference everything else follows from.',
      iceberg: {
        points: [
          'A tree of immutable snapshots. Each write creates a new snapshot.',
          'metadata.json holds schema, partition specs, and the snapshot list.',
          'A manifest list per snapshot points to manifest files; manifests list data files with per-column stats.',
          'Readers walk top-down, pruning at each level — they never open files they can skip.',
        ],
        code: `metadata.json
 └─ snapshot (current)
     └─ manifest-list.avro
         └─ manifest.avro
             └─ data files (.parquet)`,
      },
      delta: {
        points: [
          'An ordered transaction log: one JSON commit per version.',
          'Each commit is a list of actions (protocol, metaData, add, remove, …).',
          'Table state = replay of add/remove actions from the last checkpoint.',
          'A Parquet checkpoint every ~10 commits bounds how much log must be replayed.',
        ],
        code: `_delta_log/
 ...0009.json
 ...0010.checkpoint.parquet
 ...0011.json  ← replay from checkpoint`,
      },
      takeaway: 'Iceberg snapshots point at a file tree; Delta replays a commit log. Both give an immutable, versioned view — one via a pointer swap, the other via the next log file.',
    },
    'writes-deletes': {
      title: 'Writes & Deletes',
      intro: 'Both support full DML. The interesting split is how row-level UPDATE/DELETE avoids rewriting whole files — copy-on-write vs merge-on-read, and the on-disk artifact each uses.',
      iceberg: {
        points: [
          'Copy-on-write rewrites affected files; reads stay clean.',
          'Merge-on-read (v2) writes delete files instead of rewriting.',
          'Positional deletes = (file_path, row_position); equality deletes = column predicates.',
          'Sequence numbers order deletes so they apply only to earlier data files.',
        ],
        code: `-- MoR delete artifacts
positional: {file, pos}
equality:   {customer_id = 7841290}`,
      },
      delta: {
        points: [
          'Copy-on-write rewrites affected files (remove old + add new).',
          'Merge-on-read uses deletion vectors: a bitmap of deleted row positions.',
          'The data file is untouched; reads skip flagged rows.',
          'OPTIMIZE later materializes the deletes by rewriting the file.',
        ],
        code: `-- MoR delete artifact
deletion vector: roaring bitmap
  of deleted row positions in a file`,
      },
      takeaway: 'Same trade-off (cheap writes vs cheap reads), different artifact: Iceberg writes positional/equality delete files; Delta writes a deletion-vector bitmap. Both are compacted away later.',
    },
    'time-travel': {
      title: 'Time Travel & Rollback',
      intro: 'Query the table as it was, and undo a bad batch — both formats do this, with near-identical SQL surface and the same fundamental limit.',
      iceberg: {
        points: [
          'VERSION AS OF <snapshot-id> or TIMESTAMP AS OF <ts>.',
          'Rollback via rollback_to_snapshot / RESTORE — an O(1) metadata operation.',
          'Every snapshot references its own manifests + data files, untouched until expiry.',
          'expire_snapshots bounds how far back you can travel.',
        ],
        code: `SELECT * FROM t VERSION AS OF 9821443008;
CALL sys.rollback_to_snapshot('t', 982…);`,
      },
      delta: {
        points: [
          'VERSION AS OF <n> or TIMESTAMP AS OF <ts>.',
          'Rollback via RESTORE TABLE … TO VERSION AS OF.',
          'Historical files survive because remove is only a tombstone.',
          'VACUUM retention bounds how far back you can travel.',
        ],
        code: `SELECT * FROM t VERSION AS OF 842;
RESTORE TABLE t TO VERSION AS OF 842;`,
      },
      takeaway: 'The syntax and semantics line up almost exactly. In both, retention (expire_snapshots / VACUUM) is what ultimately caps time-travel depth — the files must still exist.',
    },
    'concurrency': {
      title: 'Concurrency Control',
      intro: 'Neither format uses a lock service. Both are optimistic — writers proceed, then reconcile at commit — but the commit primitive differs.',
      iceberg: {
        points: [
          'Writer reads the current snapshot id (the base).',
          'Writes data + manifests speculatively — nothing visible yet.',
          'Commit = compare-and-swap of the metadata pointer via the catalog.',
          'On conflict, re-read and retry; appends almost never conflict.',
        ],
        code: `if current == base:
  swap(base → new)   # commit
else:
  re-read + retry`,
      },
      delta: {
        points: [
          'Writer reads the latest version N (the base).',
          'Stages new data files; nothing visible yet.',
          'Commit = atomic put-if-absent of (N+1).json.',
          'If (N+1) exists, another writer won — re-read and retry as N+2.',
        ],
        code: `put_if_absent(version = N+1)
  ok    → commit
  exists → re-read + retry`,
      },
      takeaway: 'Both are optimistic concurrency control. Iceberg swaps a pointer; Delta claims the next version number. In both, blind appends rarely conflict and the loser simply retries.',
    },
    'layout': {
      title: 'Partitioning & Layout',
      intro: 'How data is physically organized for skipping — and how each format lets you change that organization as the table grows.',
      iceberg: {
        points: [
          'Hidden partitioning: partition by transforms (days, bucket, truncate) on real columns.',
          'Queries filter the natural column; the engine prunes automatically.',
          'Partition evolution changes the spec without rewriting old data.',
          'Sort orders + Z-order (via compaction) tighten multi-column skipping.',
        ],
        code: `PARTITIONED BY (days(event_date))
-- filter event_date → auto-prune`,
      },
      delta: {
        points: [
          'Directory partitioning or generated columns for partition values.',
          'Liquid clustering is the modern default — no rigid partition dirs.',
          'Clustering keys can evolve; data re-clusters incrementally.',
          'OPTIMIZE … ZORDER BY tightens multi-column skipping.',
        ],
        code: `CLUSTER BY (customer_id, order_date)
-- keys can change without full rewrite`,
      },
      takeaway: 'Iceberg leans on hidden partitioning + partition evolution; Delta increasingly leans on liquid clustering. Both aim to avoid the small-file/skew traps of classic Hive partitioning.',
    },
    'ecosystem': {
      title: 'Ecosystem & Engines',
      intro: 'Both are open specs many engines can read — but their centers of gravity differ, which is usually the deciding factor.',
      iceberg: {
        points: [
          'Designed engine-neutral from the start.',
          'Read/write from Spark, Flink, Trino, Dremio, Snowflake, BigQuery, and more.',
          'REST catalog spec decouples engines from any one metastore.',
          'Strong fit where multiple engines share the same tables.',
        ],
        code: `Spark · Flink · Trino · Dremio
Snowflake · BigQuery · (REST catalog)`,
      },
      delta: {
        points: [
          'Spark/Databricks-first, with the deepest first-party tooling.',
          'Open protocol + delta-kernel / delta-rs broaden engine support.',
          'Trino, DuckDB, Polars, Flink read via the protocol.',
          'UniForm can expose Delta tables as Iceberg metadata too.',
        ],
        code: `Spark/Databricks · Trino · DuckDB
Polars · delta-rs · (UniForm → Iceberg)`,
      },
      takeaway: 'Pick Iceberg for multi-engine neutrality at huge scale; pick Delta for a Databricks-centric platform. UniForm increasingly blurs the line by serving both metadata formats.',
    },
  };

  TV.CompareData = { matrix: MATRIX, concepts: CONCEPTS };
})();
