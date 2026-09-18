/* ============================================================
   Cloud DE Visualizer — AWS interview questions, topic-wise.
   Detailed model answers in the same voice as the Azure and
   Databricks banks. Consumed by js/modules/_interview-qa.js.

   Shape: [ { id, label, icon?, blurb?, questions:[ { q, a } ] } ]

   Build progress (20 Q&A / iteration):
     Iter 1  — s3 (10) + glue (10)                       ✅  [20]
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  const TOPICS = [
    {
      id: 's3',
      label: 'S3 & Lake Storage',
      icon: 'folder',
      blurb: 'The storage foundation of every AWS pipeline: how S3 behaves as an object store, why that matters for Spark, and how to make lake queries fast and cheap.',
      questions: [
        { q: 'Is S3 a filesystem? Why does that distinction matter for Spark jobs?',
          a: 'No — S3 is a flat object store. Keys like orders/2024/01/file.parquet only look like paths; there are no real directories and no atomic folder rename. Spark commits output by writing to a temp location then renaming it to the final path, and on S3 a "rename" is a copy-then-delete of every object — slow, and historically non-atomic (partial failures could leave garbage). That is exactly why S3-optimized committers (like the magic/directory committers) and manifest-based table formats (Iceberg, Delta, Hudi) exist: they commit by writing a metadata pointer instead of renaming files.' },
        { q: 'How do you make queries over S3 data fast and cheap?',
          a: 'Three levers. First, partition the data by encoding partition columns into the key (dt=2024-01-01/region=EU/) so engines prune to only the relevant prefixes. Second, use a compressed columnar format (Parquet or ORC) so the engine reads only the needed columns, compressed. Third, control file sizes — avoid the small-files problem (thousands of tiny objects kill throughput and metadata performance) by compacting to ~128 MB–1 GB files. On Athena and Spectrum you literally pay per byte scanned, so these directly cut cost as well as latency.' },
        { q: 'What is the small files problem and how do you fix it?',
          a: 'When a job writes thousands of tiny objects (e.g. one file per micro-batch or per task), every read pays per-object overhead: S3 list/GET latency, task scheduling, and metadata lookups dominate over actual data reading, and queries slow dramatically. Fixes: repartition/coalesce before writing to produce fewer, larger files; run periodic compaction jobs (or OPTIMIZE on Delta/Iceberg tables); and for streaming, batch with a larger trigger interval or use a table format that auto-compacts.' },
        { q: 'Walk through the S3 storage classes and when you would use each.',
          a: 'S3 Standard for hot, frequently-accessed working data. Standard-IA (Infrequent Access) for data read occasionally but needing fast retrieval — cheaper storage, small retrieval fee. One Zone-IA for infrequent data you can afford to lose an AZ of (cheaper, single AZ). Glacier Instant/Flexible Retrieval and Glacier Deep Archive for cold history you rarely touch, trading retrieval latency for very low storage cost. Intelligent-Tiering is the safe default when access patterns are unknown — it moves objects between tiers automatically based on usage. Lifecycle rules automate transitions (Standard → IA → Glacier) and expire old data/versions.' },
        { q: 'How would you trigger a pipeline the moment a file lands in S3?',
          a: 'Enable S3 event notifications for the s3:ObjectCreated events on the bucket/prefix and route them to a target: Lambda (run code immediately), SQS (buffer for a consumer), SNS (fan-out), or EventBridge. EventBridge is the most flexible — it can filter on key patterns and fan out to Step Functions, Glue, or a Lambda that starts the ingestion job. This is the event-driven alternative to polling or a fixed schedule.' },
        { q: 'S3 used to be eventually consistent. What is the situation now, and why did it matter?',
          a: 'Since December 2020, S3 provides strong read-after-write consistency for all operations — a new or overwritten object, and list operations, are immediately consistent. Previously, eventual consistency meant a freshly written file might not appear in a listing right away, which broke Spark/Hadoop jobs that write then immediately list output (people used tools like S3Guard/EMRFS consistent view to work around it). Now those workarounds are unnecessary, though the lack of atomic rename (a separate issue) still makes committers and table formats important.' },
        { q: 'How do you secure data in S3?',
          a: 'Layers: block public access at the account/bucket level by default; use IAM policies (identity-based) and bucket policies (resource-based) to grant least-privilege access, with S3 Access Points to give different apps scoped entry points to a shared bucket. Encrypt at rest with SSE-S3 (S3-managed keys) or SSE-KMS (customer-managed KMS keys, with key policies and audit trail); enforce encryption in transit with TLS. For fine-grained analytics access (column/row level), layer Lake Formation on top of the Glue Catalog rather than trying to express that in bucket policies.' },
        { q: 'How does S3 throughput scale, and how does key design affect it?',
          a: 'S3 scales request rate per prefix — roughly 3,500 write and 5,500 read requests per second per prefix — and there is no limit on the number of prefixes. So spreading data across many prefixes (which good partitioning naturally does) increases the parallel throughput readers and writers can achieve. Modern S3 auto-scales and you rarely need the old "random hash prefix" trick, but the principle holds: many prefixes = more parallelism; a single hot prefix can bottleneck.' },
        { q: 'What is S3 versioning and when is it useful in a data platform?',
          a: 'Versioning keeps every version of an object rather than overwriting in place, so you can recover from accidental deletes or overwrites (a delete just adds a delete marker). In a data platform it protects raw/landing data and enables point-in-time recovery, but it also multiplies storage cost, so pair it with lifecycle rules to expire noncurrent versions after N days. Note that table formats like Delta/Iceberg provide their own time-travel/versioning at the table level, which is usually the better mechanism for analytics tables.' },
        { q: 'How would you design an S3 layout for a medallion (Bronze/Silver/Gold) lake?',
          a: 'Typically one bucket per environment (or per domain) with top-level prefixes for each layer: /bronze (raw, immutable landing — often partitioned by ingestion date and source), /silver (cleaned, conformed, deduplicated — partitioned by business date), /gold (curated aggregates/marts for BI). Within each, use Hive-style partitions (dt=…/), store Parquet, and register tables in the Glue Catalog. Keep raw data immutable so you can always reprocess, and separate write permissions per layer (ingestion writes Bronze, ETL writes Silver/Gold) via IAM/Lake Formation.' },
      ],
    },
    {
      id: 'glue',
      label: 'AWS Glue — Catalog & ETL',
      icon: 'arrow-down',
      blurb: 'The metadata backbone and serverless Spark engine of the AWS lakehouse: crawlers, the Data Catalog, DynamicFrames, bookmarks, and how partitions become queryable.',
      questions: [
        { q: 'What is the Glue Data Catalog and what does it actually store?',
          a: 'It is a managed, Hive-metastore-compatible metadata repository. It stores databases, table definitions (columns and types), the data format/SerDe, the S3 location, and the partition list — but never the data itself, which stays on S3. It gives the whole AWS analytics stack (Athena, Redshift Spectrum, EMR, Glue) a single shared source of schema truth, so a table defined once is queryable everywhere without schema drift, and it is the object model Lake Formation attaches permissions to.' },
        { q: 'What does a Glue crawler do, and what are its downsides?',
          a: 'A crawler scans an S3 path (or JDBC source), infers the schema and partitions, and creates or updates the table definition in the catalog automatically. It is convenient for discovering data. Downsides: schema inference can guess wrong types (e.g. everything as string, or an int that should be bigint), it can misinterpret partitions, and running it constantly on huge buckets is slow and costs money. For stable schemas, many teams prefer explicit DDL or defining tables via IaC and skip crawlers, or run them narrowly and on schedule.' },
        { q: 'How do new partitions become visible to Athena/Glue queries?',
          a: 'Several ways: re-run the crawler; run MSCK REPAIR TABLE (scans S3 and adds all missing partitions) or ALTER TABLE ADD PARTITION for a specific one; call the Glue API/batch_create_partition from a job; or use partition projection. Projection is best for high-cardinality or date partitions — you describe the partition pattern in table properties and Athena computes partitions at query time instead of reading them from the catalog, avoiding both metastore bloat and the repair step.' },
        { q: 'What is the difference between a DynamicFrame and a Spark DataFrame in Glue?',
          a: 'A DynamicFrame is Glue’s own abstraction for messy, semi-structured data: it does not need a fixed schema up front and can hold multiple types for a field via a "choice" type, which you reconcile with resolveChoice(). It also has Glue-specific transforms (ApplyMapping, Relationalize) and integrates with bookmarks and the catalog. A Spark DataFrame needs a settled schema and gives you the full Spark SQL API and Catalyst optimizer. In practice you often read dirty input as a DynamicFrame, then toDF() to a DataFrame for the heavy transformations, and convert back if needed for a Glue sink.' },
        { q: 'How do Glue job bookmarks work and why are they useful?',
          a: 'Bookmarks persist state about what a job has already processed — which S3 files (by path/timestamp) or which JDBC key ranges — keyed by a transformation_ctx on each source. On the next run the job reads only new data, giving built-in incremental processing without you tracking watermarks yourself. Requirements: enable bookmarks on the job, give each source a transformation_ctx, and ensure primary keys/sort columns for JDBC. Watch out: bookmarks can behave unexpectedly if you rename sources or reprocess, and you can reset them when you need a full re-run.' },
        { q: 'How is Glue ETL billed, and when would you pick it over EMR?',
          a: 'Glue bills per DPU-hour (a DPU is 4 vCPU + 16 GB), metered in seconds with a short minimum, so you pay only while the job runs. Pick Glue for serverless convenience: short, bursty, or event-driven ETL where you do not want to manage a cluster, and where catalog integration and bookmarks save work. Pick EMR when you need control the serverless service does not give — specific Spark/Hive versions, custom libraries/configs, interactive or long-running clusters, or the lowest cost on very large steady batch via transient Spot clusters. Rule of thumb: Glue for convenience, EMR for control and large-scale cost efficiency.' },
        { q: 'How do you make a Glue job process only new data each run?',
          a: 'Two complementary approaches. Enable job bookmarks with a transformation_ctx on each source so Glue tracks processed files/rows automatically. Or drive incrementality from partitions using a push_down_predicate (e.g. only read dt >= yesterday) so the job reads only the latest partitions from the catalog — this also cuts S3 scan cost because unneeded partitions are never listed or read. For CDC-style sources, combine a bookmark on the raw changes with a MERGE into the target Delta/Iceberg table.' },
        { q: 'What worker types does Glue offer and how do you size a job?',
          a: 'Standard, G.1X (1 DPU = 4 vCPU/16 GB per worker — the common default), G.2X (2 DPU, more memory per worker — for memory-heavy or shuffle-heavy jobs), and G.025X (fractional, for low-volume streaming). Sizing is the main tuning knob: more/bigger workers give more executor cores and memory (more parallelism, fewer spills), but too many waste DPU-seconds on a small job. You right-size by watching for spills/OOM (go bigger, e.g. G.2X) versus under-utilization (fewer workers), and by fixing skew and small-file output rather than just throwing DPUs at it.' },
        { q: 'What is the relationship between the Glue Data Catalog and Lake Formation?',
          a: 'The Data Catalog holds the metadata — what tables exist and their schema. Lake Formation is the governance layer on top: it defines who can access which databases, tables, columns, and rows in that catalog, and enforces those grants across Athena, Spectrum, EMR, and Glue. The catalog answers "what is here"; Lake Formation answers "who is allowed to see it." You register S3 locations with Lake Formation and grant SQL-style permissions (including column and row filters) rather than hand-writing IAM/bucket policies.' },
        { q: 'How would you orchestrate and monitor Glue jobs in a pipeline?',
          a: 'For orchestration: Glue Workflows/triggers for simple Glue-only chains; Step Functions (startJobRun.sync) for AWS-native, event-driven DAGs with built-in retries and branching; or MWAA (Airflow) for complex, code-first, schedule-heavy pipelines using the GlueJobOperator plus sensors. For monitoring: enable job metrics and continuous CloudWatch logs, use the Spark UI/Glue job run insights to diagnose skew, spills, and stage times, set up CloudWatch alarms on failures/duration, and wire failure notifications through SNS. Bookmarks plus idempotent writes make reruns safe.' },
      ],
    },
  ];

  TV.AwsInterviewQA = TOPICS;
})();
