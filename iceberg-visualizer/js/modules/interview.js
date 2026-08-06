/* ============================================================
   Interview Mode Module
   12 senior-level Apache Iceberg interview questions with
   reveal-on-click answers. Covers fundamentals, ACID, snapshots,
   partitioning, schema evolution, performance, and operations.
   Each answer includes a ShopKart production context.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('iv-int-styles')) return;
    const s = document.createElement('style');
    s.id = 'iv-int-styles';
    s.textContent = `
.int-page {
  display:flex; flex-direction:column; height:100%; overflow:hidden;
}
.int-header {
  padding:16px 24px; border-bottom:1px solid var(--border-default);
  background:var(--bg-2); flex-shrink:0;
  display:flex; align-items:center; justify-content:space-between; gap:16px;
  flex-wrap:wrap;
}
.int-header-left h1 { font-size:18px; font-weight:700; color:var(--text-primary); margin:0 0 4px; }
.int-header-left p { font-size:12px; color:var(--text-muted); margin:0; }
.int-header-right { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.int-progress-text { font-size:12px; color:var(--text-muted); }
.int-btn {
  padding:6px 14px; border-radius:6px; border:1px solid var(--border-default);
  background:var(--bg-3); color:var(--text-secondary); font-size:12px;
  cursor:pointer; transition:background .12s, color .12s;
}
.int-btn:hover { background:var(--bg-4); color:var(--text-primary); }
.int-btn.active { background:rgba(74,174,255,.15); border-color:var(--blue); color:var(--blue); }
.int-body { flex:1; overflow-y:auto; padding:20px 24px; }
.int-qa-list { display:flex; flex-direction:column; gap:14px; max-width:880px; }
.int-card {
  border:1px solid var(--border-default); border-radius:10px;
  background:var(--bg-2); overflow:hidden;
  transition:border-color .15s;
}
.int-card:hover { border-color:var(--blue); }
.int-card.revealed { border-color:var(--border-default); }
.int-q-row {
  display:flex; align-items:flex-start; gap:12px; padding:14px 18px;
  cursor:pointer; user-select:none;
}
.int-q-num {
  width:26px; height:26px; border-radius:50%; background:var(--bg-3);
  border:1.5px solid var(--border-default);
  display:flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:700; color:var(--text-muted);
  flex-shrink:0; margin-top:1px;
}
.int-card.revealed .int-q-num { background:rgba(63,185,80,.15); border-color:var(--green); color:var(--green); }
.int-q-main { flex:1; }
.int-q-text { font-size:14px; font-weight:600; color:var(--text-primary); line-height:1.4; margin-bottom:4px; }
.int-tags { display:flex; gap:6px; flex-wrap:wrap; }
.int-tag {
  font-size:10px; font-weight:700; padding:2px 7px; border-radius:4px;
  text-transform:uppercase; letter-spacing:.04em;
}
.int-tag.beginner     { background:rgba(63,185,80,.15);   color:var(--green); }
.int-tag.intermediate { background:rgba(74,174,255,.15);  color:var(--blue); }
.int-tag.advanced     { background:rgba(163,113,247,.15); color:var(--purple); }
.int-tag.senior       { background:rgba(248,81,73,.15);   color:var(--red); }
.int-q-chevron {
  color:var(--text-muted); flex-shrink:0; transition:transform .2s;
  display:flex; align-items:center; padding-top:2px;
}
.int-card.revealed .int-q-chevron { transform:rotate(180deg); }
.int-answer {
  display:none; border-top:1px solid var(--border-subtle);
  padding:16px 18px; background:var(--bg-1);
}
.int-card.revealed .int-answer { display:block; }
.int-answer-text {
  font-size:13px; color:var(--text-secondary); line-height:1.65;
  margin-bottom:12px;
}
.int-answer-code {
  font-family:var(--font-mono); font-size:11.5px; color:var(--text-secondary);
  background:var(--bg-2); border:1px solid var(--border-subtle);
  border-radius:6px; padding:12px 14px; line-height:1.7;
  white-space:pre; overflow-x:auto; margin-bottom:10px;
}
.int-answer-code .hi-kw  { color:var(--blue); }
.int-answer-code .hi-str { color:var(--green); }
.int-answer-code .hi-num { color:var(--orange); }
.int-answer-code .hi-cm  { color:var(--text-muted); font-style:italic; }
.int-shopkart-note {
  font-size:11.5px; color:var(--text-muted);
  background:rgba(74,174,255,.06); border-left:3px solid var(--blue);
  border-radius:0 6px 6px 0; padding:8px 12px; line-height:1.55;
}
.int-shopkart-note strong { color:var(--blue); }
.int-filter-row {
  display:flex; gap:6px; align-items:center; flex-wrap:wrap;
}
.int-filter-label { font-size:11px; color:var(--text-muted); margin-right:4px; }
.int-empty {
  text-align:center; padding:60px 20px; color:var(--text-muted); font-size:14px;
}
`;
    document.head.appendChild(s);
  }

  /* ── QA Data ─────────────────────────────────────────────── */
  const QA = [
    {
      q: 'What is Apache Iceberg and what problems does it solve compared to a plain Hive table?',
      tags: ['beginner'],
      answer: `Iceberg is an open table format for huge analytic datasets. Unlike Hive tables (which are just a folder of files with a metastore pointer), Iceberg adds:

1. <strong>ACID transactions</strong> — snapshot isolation, no partial reads
2. <strong>Schema evolution</strong> — add/drop/rename/reorder columns safely
3. <strong>Hidden partitioning</strong> — partition by functions (months, buckets) without exposing them in queries
4. <strong>Time travel</strong> — query any past snapshot by timestamp or id
5. <strong>Metadata statistics</strong> — per-file column min/max enables massive file skipping
6. <strong>Concurrent writers</strong> — OCC (optimistic concurrency) instead of table-level locks`,
      code: `<span class="hi-cm">-- Hive table: no ACID, no schema evolution</span>
<span class="hi-kw">CREATE TABLE</span> hive_orders (order_id BIGINT, …)
<span class="hi-kw">LOCATION</span> <span class="hi-str">'s3://bucket/orders/'</span>;
<span class="hi-cm">-- Problem: writers overwrite each other
--          readers see partial results
--          no column stats → full scan always</span>

<span class="hi-cm">-- Iceberg: full ACID + metadata hierarchy</span>
<span class="hi-kw">CREATE TABLE</span> shopkart.orders.events (…)
<span class="hi-kw">USING</span> iceberg
<span class="hi-kw">PARTITIONED BY</span> (<span class="hi-fn">days</span>(event_date))
<span class="hi-kw">TBLPROPERTIES</span>(<span class="hi-str">'format-version'</span>=<span class="hi-str">'2'</span>);`,
      shopkart: '<strong>ShopKart:</strong> Migrated 21.5 billion order rows from Hive to Iceberg in 2021. Hive queries on orders took 4–6 hours; Iceberg queries now return in under 1 second via partition + column stats pruning.',
    },
    {
      q: 'Explain the Iceberg metadata hierarchy: catalog → metadata.json → manifest list → manifest files → data files.',
      tags: ['beginner', 'intermediate'],
      answer: `Iceberg uses a 5-level metadata hierarchy, each level adding resolution:

<strong>1. Catalog</strong> — maps table name → current metadata.json path. No data here.
<strong>2. metadata.json</strong> — holds table schema, partition spec, snapshots list, current-snapshot-id. Usually a few KB.
<strong>3. Manifest list</strong> — one per snapshot. Lists all manifest files for this snapshot with their partition summaries.
<strong>4. Manifest files (.avro)</strong> — lists DataFile entries. Each entry has file path, format, partition, record count, column stats.
<strong>5. Data files (.parquet/.orc/.avro)</strong> — the actual rows.

Query engines walk top-down, pruning at each level. They never read data files they can skip.`,
      code: `<span class="hi-cm">Catalog
  └─ metadata/v00042.metadata.json
       └─ snapshots[current]:
            manifest-list: snap-9821443009.avro
              └─ manifests[]:
                   snap-9821443009-m0.avro
                     └─ data_files[]:
                          event_date=2026-08-01/
                          orders-t0.parquet</span>`,
      shopkart: '<strong>ShopKart:</strong> The orders.events table has 800M data files, ~22K manifest files, and ~1,048 snapshots. Reading a manifest list costs ~2 MB; reading all manifests costs ~200 MB — a tiny fraction of the 6 PB data.',
    },
    {
      q: 'How does Iceberg snapshot isolation work? What guarantees does it provide?',
      tags: ['intermediate'],
      answer: `Every write operation (INSERT, UPDATE, DELETE, MERGE) produces a new immutable snapshot. Readers always read from a specific snapshot — the current one when they started. Key guarantees:

<strong>Isolation:</strong> A reader's snapshot doesn't change during the query, even if writers commit new snapshots concurrently.
<strong>No dirty reads:</strong> A snapshot only becomes "current" after the atomic metadata commit succeeds.
<strong>No lost updates:</strong> Writers use OCC — they commit only if the table's current snapshot matches what they read. If not, they retry.
<strong>Rollback:</strong> Any snapshot can become current again (time travel rollback).`,
      code: `<span class="hi-cm">-- Snapshot timeline</span>
snap_A  → snap_B  → snap_C  (current)
                    ↑ metadata.json
                    "current-snapshot-id": snap_C

<span class="hi-cm">-- Reader R started at snap_B:</span>
<span class="hi-cm">-- Still reads snap_B even after snap_C commits</span>
<span class="hi-cm">-- No partial or torn reads possible</span>

<span class="hi-cm">-- Writer W trying to commit snap_D:</span>
<span class="hi-kw">if</span> current == snap_C:
  commit snap_D  <span class="hi-cm">→ success</span>
<span class="hi-kw">else</span>:
  retry with new snapshot-id`,
      shopkart: '<strong>ShopKart:</strong> The real-time dashboard queries orders.events while Kafka micro-batches write every 30 seconds. Snapshot isolation means the dashboard always sees a consistent picture, never partially-written batches.',
    },
    {
      q: 'What is hidden partitioning and why is it better than Hive-style partitioning?',
      tags: ['intermediate'],
      answer: `<strong>Hive partitioning:</strong> Partition columns are stored in the data and appear in queries. Users must write WHERE event_date_dt = '2026-08-01' exactly as a string; the engine doesn't know that '2026-08-01' maps to partition folder date=2026-08-01.

<strong>Iceberg hidden partitioning:</strong> The partition transform is metadata-only. You define PARTITIONED BY (days(event_date)), but event_date stays as a timestamp column in the data. The engine automatically translates WHERE event_date = '2026-08-01' into a partition prune — no user-facing partition column needed.

Benefits: no accidental full-scans, partition evolution without data rewrite, cleaner query syntax, bucket/truncate/hour transforms.`,
      code: `<span class="hi-cm">-- Hive: partition column in data AND query</span>
<span class="hi-kw">WHERE</span> event_date_part = <span class="hi-str">'2026-08-01'</span>  <span class="hi-cm">← must match exactly</span>
<span class="hi-cm">-- If you filter on event_date_ts → full scan!</span>

<span class="hi-cm">-- Iceberg: partition is hidden</span>
<span class="hi-kw">PARTITIONED BY</span> (<span class="hi-fn">days</span>(event_date))
<span class="hi-kw">WHERE</span> event_date >= <span class="hi-str">'2026-08-01'</span>
  <span class="hi-kw">AND</span> event_date  < <span class="hi-str">'2026-08-02'</span>
<span class="hi-cm">→ Iceberg auto-prunes to 1 day partition
→ No duplicate column in schema</span>`,
      shopkart: '<strong>ShopKart:</strong> Before hidden partitioning, analysts frequently forgot to add the dt partition column and ran multi-hour full scans. After migration, partition pruning is automatic for any event_date predicate.',
    },
    {
      q: 'Explain OCC (Optimistic Concurrency Control) in Iceberg. What happens on a write conflict?',
      tags: ['advanced'],
      answer: `Iceberg uses OCC rather than pessimistic locking. The workflow:

1. Writer reads the current metadata.json, notes current-snapshot-id.
2. Writer writes data files and manifest (no lock held yet).
3. Writer attempts to commit: CAS (compare-and-swap) on metadata.json — succeeds only if current-snapshot-id still matches.
4. If another writer committed first (current-snapshot-id changed), this writer's commit fails.
5. Iceberg retries by re-reading the new metadata and re-applying its changes if compatible (append-only operations almost always succeed; updates/deletes may conflict and throw CommitFailedException).

This means locks are held for milliseconds (~metadata write time only), not during data file writes.`,
      code: `<span class="hi-cm">-- Two concurrent writers: W1 and W2</span>
W1 reads: current = snap_100
W2 reads: current = snap_100

W1 writes files… W2 writes files…

W1 commits: CAS(current=snap_100 → snap_101)
  → success ✓  (first to commit wins)

W2 tries: CAS(current=snap_100 → snap_101)
  → FAIL ✗  (current is now snap_101)

W2 retries: reload metadata (snap_101)
  → re-check: is my write compatible?
  → If append: yes, commit as snap_102 ✓
  → If update same rows: throw CommitFailed`,
      shopkart: '<strong>ShopKart:</strong> The incident SK-2023-0412 was caused by a custom writer that ignored CommitFailedException. It silently discarded retries, losing 2.3 million CDC updates. OCC retry logic must always be implemented correctly.',
    },
    {
      q: 'What is the difference between Copy-on-Write (CoW) and Merge-on-Read (MoR) for DELETE/UPDATE?',
      tags: ['advanced'],
      answer: `Both strategies implement row-level deletes. They trade write cost vs. read cost:

<strong>Copy-on-Write (CoW):</strong> On DELETE/UPDATE, the affected Parquet files are fully rewritten (old rows removed, updated rows included). Reads are fast (no merge needed). Writes are expensive (full file rewrite). Best for low-update-rate, read-heavy tables.

<strong>Merge-on-Read (MoR):</strong> On DELETE/UPDATE, a small delete-file (positional or equality) is written. The original data file is NOT rewritten. Reads must merge data + delete files. Writes are fast. Best for high-update-rate, CDC, and near-real-time ingestion.

Iceberg v2 uses positional delete files (filename + row position) and equality delete files (column-value-based).`,
      code: `<span class="hi-cm">-- Table properties controlling strategy</span>
write.delete.mode  = <span class="hi-str">'copy-on-write'</span>   <span class="hi-cm">← default</span>
write.delete.mode  = <span class="hi-str">'merge-on-read'</span>

<span class="hi-cm">-- CoW DELETE: rewrites file</span>
<span class="hi-cm">   old-file.parquet (1M rows) → DELETED</span>
<span class="hi-cm">   new-file.parquet (999,999) ← written</span>

<span class="hi-cm">-- MoR DELETE: writes delete file only</span>
<span class="hi-cm">   old-file.parquet (1M rows) ← UNTOUCHED</span>
<span class="hi-cm">   old-file-deletes.avro     ← 1 row ref</span>

<span class="hi-cm">-- Compact MoR files with:</span>
<span class="hi-kw">CALL</span> shopkart.system.rewrite_data_files(
  table => <span class="hi-str">'orders.events'</span>,
  strategy => <span class="hi-str">'binpack'</span>
);`,
      shopkart: '<strong>ShopKart:</strong> The CDC upsert pipeline uses MoR for fast writes (30-second latency). A nightly OPTIMIZE job compacts MoR delete files via rewrite_data_files, keeping read performance fast during the day.',
    },
    {
      q: 'How does schema evolution work in Iceberg? What operations are safe vs. unsafe?',
      tags: ['intermediate'],
      answer: `Iceberg identifies columns by unique integer field IDs (not by name or position). This makes schema changes non-destructive:

<strong>Safe operations:</strong>
- ADD column (new field ID; old files return null)
- DROP column (metadata only; old files still have data but it's ignored)
- RENAME column (field ID unchanged; column-stats still valid)
- REORDER columns (field IDs unchanged; no data change)
- WIDEN column type (int→long, float→double, decimal scale increase)

<strong>Unsafe operations:</strong>
- Narrowing types (long→int) — rejected by Iceberg
- Changing semantics without rename — no protection against this

Old data files are NEVER rewritten for schema changes.`,
      code: `<span class="hi-cm">-- Safe schema changes (no data rewrite)</span>
<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
  <span class="hi-kw">ADD COLUMN</span> loyalty_points BIGINT;
<span class="hi-cm">-- old files: loyalty_points = null (safe)</span>

<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
  <span class="hi-kw">DROP COLUMN</span> legacy_flag;
<span class="hi-cm">-- data still in old files; metadata ignores it</span>

<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
  <span class="hi-kw">ALTER COLUMN</span> order_amount TYPE DOUBLE;
<span class="hi-cm">-- widening float → double: safe</span>

<span class="hi-cm">-- Iceberg tracks by field_id, not name/pos:
-- field_id=7 was "amount", rename to "total"
-- Column stats / bloom filters still valid</span>`,
      shopkart: '<strong>ShopKart:</strong> In 2023, 5 new columns were added to orders.events (returns_flag, loyalty_tier, experiment_group, referral_code, app_version) without any downtime or data migration. Old Parquet files simply returned null for the new columns.',
    },
    {
      q: 'How does time travel work in Iceberg? How do you query a specific snapshot?',
      tags: ['intermediate'],
      answer: `Every write creates an immutable snapshot with a timestamp and snapshot-id. Because old snapshots reference their own manifest lists and data files (which are never deleted until explicitly expired), you can query any past state.

Time travel methods:
1. AS OF TIMESTAMP — query the snapshot current at a given time
2. AS OF VERSION — query a specific snapshot-id
3. RESTORE — make a past snapshot the new current snapshot

Snapshots are retained until EXPIRE SNAPSHOTS is run (which removes snapshot metadata and unreferenced data files).`,
      code: `<span class="hi-cm">-- Query snapshot at a specific time</span>
<span class="hi-kw">SELECT</span> * <span class="hi-kw">FROM</span> shopkart.orders.events
<span class="hi-kw">TIMESTAMP AS OF</span> <span class="hi-str">'2026-07-31 23:00:00'</span>;

<span class="hi-cm">-- Query by snapshot-id</span>
<span class="hi-kw">SELECT</span> * <span class="hi-kw">FROM</span> shopkart.orders.events
<span class="hi-kw">VERSION AS OF</span> <span class="hi-num">9821443008</span>;

<span class="hi-cm">-- Rollback to past snapshot (RESTORE)</span>
<span class="hi-kw">CALL</span> shopkart.system.rollback_to_snapshot(
  table => <span class="hi-str">'orders.events'</span>,
  snapshot_id => <span class="hi-num">9821443008</span>
);

<span class="hi-cm">-- List all snapshots</span>
<span class="hi-kw">SELECT</span> * <span class="hi-kw">FROM</span> shopkart.orders.events.snapshots;`,
      shopkart: '<strong>ShopKart:</strong> Incident SK-2023-0412 — a MERGE INTO pipeline wrote 2.3M incorrect updates. Recovered in 4 minutes by running ROLLBACK to the snapshot before the erroneous pipeline started. No data loss, no manual repair.',
    },
    {
      q: 'What is partition evolution? How does Iceberg handle it without data rewrite?',
      tags: ['advanced'],
      answer: `Partition evolution lets you change the partition spec of a table without rewriting existing data. Iceberg achieves this through partition spec versioning:

- Each data file records which partition spec it was written with (spec_id).
- A new partition spec gets a new spec_id.
- Old files are still queryable under the old spec.
- New writes use the new spec.
- Iceberg handles mixed-spec scans transparently.

This means you can switch from PARTITIONED BY (months(event_date)) to PARTITIONED BY (days(event_date)) and old monthly-partitioned files and new daily-partitioned files coexist in the same table.`,
      code: `<span class="hi-cm">-- ShopKart: orders.events partition evolution</span>
<span class="hi-cm">-- Phase 1: monthly (spec_id=0)</span>
<span class="hi-kw">PARTITIONED BY</span> (<span class="hi-fn">months</span>(event_date))

<span class="hi-cm">-- Phase 2: daily after 2025 growth (spec_id=1)</span>
<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
<span class="hi-kw">REPLACE PARTITION FIELD</span>
  <span class="hi-fn">months</span>(event_date)
  <span class="hi-kw">WITH</span> <span class="hi-fn">days</span>(event_date);

<span class="hi-cm">-- Old monthly files: still readable ✓
-- New daily files: written with spec_id=1
-- Engine handles both specs transparently
-- Zero data files rewritten</span>`,
      shopkart: '<strong>ShopKart:</strong> In Jan 2025, orders grew to 20M/day. Monthly partitions caused 300+ MB/query scans. Partition evolution to daily partitions took 1 SQL statement and 0 bytes of data rewrite. Old files remained untouched.',
    },
    {
      q: 'What maintenance operations does Iceberg provide? When should you run them?',
      tags: ['intermediate', 'advanced'],
      answer: `Iceberg provides three main maintenance procedures:

<strong>1. OPTIMIZE / rewrite_data_files</strong> — Compacts small files into larger ones (target ~128–512 MB). Run when many small files accumulate (streaming ingestion, frequent updates). Also merges MoR delete files.

<strong>2. EXPIRE SNAPSHOTS</strong> — Removes old snapshot metadata and unreferenced data files. Run daily with a retention window. Does NOT touch files still referenced by live snapshots.

<strong>3. REMOVE ORPHAN FILES</strong> — Deletes S3/HDFS files that have no metadata entry (left behind by failed writes). Run weekly. Read-only scan of metadata + filesystem diff.

Best practice: run OPTIMIZE daily on streaming tables, EXPIRE SNAPSHOTS daily with 7-day retention, REMOVE ORPHAN FILES weekly.`,
      code: `<span class="hi-cm">-- 1. Compact small files (nightly ETL)</span>
<span class="hi-kw">CALL</span> shopkart.system.rewrite_data_files(
  table    => <span class="hi-str">'orders.events'</span>,
  strategy => <span class="hi-str">'binpack'</span>,
  options  => map(<span class="hi-str">'target-file-size-bytes'</span>,
                  <span class="hi-str">'134217728'</span>) <span class="hi-cm">-- 128 MB</span>
);

<span class="hi-cm">-- 2. Expire old snapshots (daily)</span>
<span class="hi-kw">CALL</span> shopkart.system.expire_snapshots(
  table               => <span class="hi-str">'orders.events'</span>,
  older_than          => <span class="hi-kw">TIMESTAMP</span> <span class="hi-str">'2026-07-25'</span>,
  retain_last         => <span class="hi-num">7</span>
);

<span class="hi-cm">-- 3. Remove orphan files (weekly)</span>
<span class="hi-kw">CALL</span> shopkart.system.remove_orphan_files(
  table  => <span class="hi-str">'orders.events'</span>,
  older_than => <span class="hi-kw">TIMESTAMP</span> <span class="hi-str">'2026-07-25'</span>
);`,
      shopkart: '<strong>ShopKart:</strong> Without EXPIRE SNAPSHOTS, the orders.events metadata directory grew to 900 GB in 6 months (1,048 snapshots × manifests). After enabling daily expiry with 7-day retention, metadata stabilised at ~8 GB.',
    },
    {
      q: 'How does Iceberg handle MERGE INTO for CDC upserts? Walk through the execution.',
      tags: ['advanced', 'senior'],
      answer: `MERGE INTO combines INSERT, UPDATE, and DELETE in a single atomic operation. For CDC upserts:

1. Source table (CDC events) is joined to target table (orders) on match key (order_id).
2. WHEN MATCHED AND source.op='U' → UPDATE target row.
3. WHEN MATCHED AND source.op='D' → DELETE target row.
4. WHEN NOT MATCHED AND source.op='I' → INSERT new row.
5. Iceberg writes the result as: new Parquet data files (updated/inserted rows) + delete files (for CoW: rewritten; for MoR: positional deletes).
6. A new snapshot is committed atomically.

On conflict (another writer committed between read and commit), Iceberg retries if the conflict is on non-overlapping rows.`,
      code: `<span class="hi-cm">-- ShopKart CDC: MySQL binlog → Kafka → Iceberg</span>
<span class="hi-kw">MERGE INTO</span> shopkart.orders.events t
<span class="hi-kw">USING</span> staging.cdc_batch s
  <span class="hi-kw">ON</span> t.order_id = s.order_id
<span class="hi-kw">WHEN MATCHED AND</span> s.op = <span class="hi-str">'U'</span> <span class="hi-kw">THEN</span>
  <span class="hi-kw">UPDATE SET</span>
    t.order_status = s.order_status,
    t.updated_at   = s.updated_at
<span class="hi-kw">WHEN MATCHED AND</span> s.op = <span class="hi-str">'D'</span> <span class="hi-kw">THEN</span>
  <span class="hi-kw">DELETE</span>
<span class="hi-kw">WHEN NOT MATCHED THEN</span>
  <span class="hi-kw">INSERT</span> *;

<span class="hi-cm">-- 5.2M CDC events processed in one MERGE
-- Result: 2.8M updates + 1.1M inserts + 0.3M deletes
-- One new snapshot committed atomically</span>`,
      shopkart: '<strong>ShopKart:</strong> The MySQL binlog-to-Iceberg pipeline runs MERGE INTO every 5 minutes, processing ~5M CDC events per batch. End-to-end CDC latency: 5–8 minutes from MySQL commit to Iceberg visibility.',
    },
    {
      q: 'What is the difference between a positional delete file and an equality delete file in Iceberg v2?',
      tags: ['senior'],
      answer: `Both are MoR delete mechanisms but they identify rows differently:

<strong>Positional delete file:</strong> Identifies rows by (file_path, row_position). Extremely precise. The file stores pairs of (data file path, row index). Only works for deletes on a specific version of a file. Engine must join on file + position.

<strong>Equality delete file:</strong> Identifies rows by column value(s). Stores the delete predicate's key columns (e.g. {order_id: 12345, …}). Engine must test every data file row against the equality condition — more expensive at read time but doesn't depend on row positions.

Positional deletes are preferred for UPDATE and simple DELETE. Equality deletes are used for DELETE WHERE column IN (...) when positions aren't known upfront.`,
      code: `<span class="hi-cm">-- Positional delete file content (Avro)</span>
{
  <span class="hi-str">"file_path"</span>: <span class="hi-str">"s3://…/orders-t0.parquet"</span>,
  <span class="hi-str">"pos"</span>: <span class="hi-num">41231</span>
}
<span class="hi-cm">-- Row at position 41231 in that file is deleted</span>

<span class="hi-cm">-- Equality delete file content (Avro)</span>
{
  <span class="hi-str">"order_id"</span>: <span class="hi-num">9000012345</span>,
  <span class="hi-str">"event_date"</span>: <span class="hi-str">"2026-08-01"</span>
}
<span class="hi-cm">-- Any row with order_id=9000012345 is deleted
-- Engine scans all matching files and filters</span>

<span class="hi-cm">-- Table property to prefer positional deletes:</span>
write.delete.mode = <span class="hi-str">'merge-on-read'</span>
write.pos-delete.enabled = <span class="hi-kw">true</span>`,
      shopkart: '<strong>ShopKart:</strong> The GDPR "right to be forgotten" workflow uses equality delete files (delete by customer_id). The CDC upsert pipeline uses positional deletes (faster write, precise row targeting). Both coexist in the same table.',
    },
  ];

  /* ── Render ──────────────────────────────────────────────── */
  function _render(container) {
    _injectStyles();

    let activeFilter = 'all';
    let revealCount = 0;

    function _buildList() {
      const filtered = QA.filter(qa =>
        activeFilter === 'all' || qa.tags.includes(activeFilter)
      );
      if (!filtered.length) return '<div class="int-empty">No questions match this filter.</div>';
      return `<div class="int-qa-list">${filtered.map((qa, i) => {
        const gi = QA.indexOf(qa);
        return `<div class="int-card" data-idx="${gi}">
          <div class="int-q-row">
            <div class="int-q-num">${i + 1}</div>
            <div class="int-q-main">
              <div class="int-q-text">${qa.q}</div>
              <div class="int-tags">
                ${qa.tags.map(t => `<span class="int-tag ${t}">${t}</span>`).join('')}
              </div>
            </div>
            <div class="int-q-chevron">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12">
                <path d="M2 4l4 4 4-4"/>
              </svg>
            </div>
          </div>
          <div class="int-answer">
            <div class="int-answer-text">${qa.answer}</div>
            ${qa.code ? `<div class="int-answer-code">${qa.code}</div>` : ''}
            <div class="int-shopkart-note">${qa.shopkart}</div>
          </div>
        </div>`;
      }).join('')}</div>`;
    }

    container.innerHTML = `
<div class="int-page">
  <div class="int-header">
    <div class="int-header-left">
      <h1>Interview Mode</h1>
      <p>Apache Iceberg — 12 senior-level questions. Click any question to reveal the answer.</p>
    </div>
    <div class="int-header-right">
      <div class="int-filter-row">
        <span class="int-filter-label">Filter:</span>
        <button class="int-btn active" data-filter="all">All</button>
        <button class="int-btn" data-filter="beginner">Beginner</button>
        <button class="int-btn" data-filter="intermediate">Intermediate</button>
        <button class="int-btn" data-filter="advanced">Advanced</button>
        <button class="int-btn" data-filter="senior">Senior</button>
      </div>
      <span class="int-progress-text" id="int-progress">0 / ${QA.length} revealed</span>
    </div>
  </div>
  <div class="int-body" id="int-body">
    ${_buildList()}
  </div>
</div>`;

    function _updateProgress() {
      const revealed = container.querySelectorAll('.int-card.revealed').length;
      const prog = container.querySelector('#int-progress');
      if (prog) prog.textContent = `${revealed} / ${QA.length} revealed`;
    }

    container.querySelector('#int-body').addEventListener('click', (e) => {
      const card = e.target.closest('.int-card');
      if (!card) return;
      card.classList.toggle('revealed');
      _updateProgress();
    });

    container.querySelectorAll('.int-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.int-btn[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        container.querySelector('#int-body').innerHTML = _buildList();
        _updateProgress();
        container.querySelector('#int-body').addEventListener('click', (e) => {
          const card = e.target.closest('.int-card');
          if (!card) return;
          card.classList.toggle('revealed');
          _updateProgress();
        });
      });
    });
  }

  IV.modules['interview'] = {
    id: 'interview',
    title: 'Interview Mode',
    group: 'learn',
    render: _render,
    destroy() {},
  };
})();
