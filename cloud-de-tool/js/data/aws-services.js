/* ============================================================
   Cloud DE Visualizer — AWS service catalogue.
   Interview-critical AWS data services, each with six depth
   levels (What / Why / How / DE Use Case / Integrations /
   Runtime) plus key facts and interview Q&A. Consumed by
   _service-detail.js (renderer) and formats/aws.js (nav).

   Build progress:
     S1 ✅ S3, Glue Data Catalog
     S2 ✅ Glue ETL, Lake Formation
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  const AWS_SERVICES = [
    /* ── STORAGE ─────────────────────────────────────────── */
    {
      id: 's3', name: 'Amazon S3', category: 'storage',
      aka: 'Simple Storage Service — the object store the whole AWS lake sits on',
      tagline: 'The default data lake on AWS: virtually unlimited object storage with eleven 9s of durability, where nearly every analytics engine reads and writes its data.',
      keyFacts: [
        { k: 'Model', v: 'Flat object store (key = prefix)' },
        { k: 'Durability', v: '99.999999999% (11 nines)' },
        { k: 'Consistency', v: 'Strong read-after-write' },
        { k: 'Classes', v: 'Standard / IA / Glacier / Intelligent-Tiering' },
      ],
      what: {
        lead: 'S3 stores objects (bytes + metadata) inside buckets under a flat key namespace. There are no real folders — a "path" like orders/2024/01/file.parquet is just a slash-delimited object key, and the console fakes folders from those prefixes.',
        bullets: [
          { h: 'Buckets and keys', d: 'A bucket is a globally-named container; every object is addressed by its key. Analytics layouts encode partitions into the key (e.g. dt=2024-01-01/) so engines can prune by prefix.' },
          { h: 'Storage classes', d: 'Standard for hot data, Standard-IA / One Zone-IA for infrequent access, Glacier / Glacier Deep Archive for cold history, and Intelligent-Tiering to move objects automatically based on access.' },
          { h: 'Strong consistency', d: 'Since 2020 S3 is strongly read-after-write consistent for all operations — a written or overwritten object is immediately readable, which removed a whole class of eventual-consistency bugs in Spark commit.' },
        ],
      },
      why: {
        lead: 'Analytics needs a place to keep enormous volumes of raw and refined data cheaply, durably, and decoupled from compute. S3 gives object-storage economics with the durability and throughput to be the single source of truth that every engine — EMR, Athena, Redshift Spectrum, Glue, and external Spark — reads from.',
        bullets: [
          { h: 'Decoupled storage & compute', d: 'Clusters are ephemeral; the data lives on S3 and outlives any one engine, so you spin compute up and down without moving data.' },
          { h: 'Cheap and elastic', d: 'Pennies per GB with no capacity planning, plus lifecycle rules and tiering to push cold data down automatically.' },
          { h: 'Durable by design', d: 'Objects are redundantly stored across multiple Availability Zones (for the multi-AZ classes), giving eleven 9s of durability without any effort.' },
        ],
      },
      how: {
        lead: 'Clients address data as s3://bucket/key (or the s3a:// scheme from Spark). Access is granted through IAM policies, bucket policies, and optionally S3 Access Points; encryption is applied server-side with SSE-S3 or SSE-KMS keys.',
        bullets: [
          { h: 'Partitioned key layout', d: 'Writing Hive-style partitions (col=value/) into the key lets Athena, Glue, and Spark prune scans to only the prefixes they need — the single biggest cost lever on S3-backed queries.' },
          { h: 'Event notifications', d: 'S3 can fire events on object creation to Lambda, SQS, SNS, or EventBridge — the trigger that kicks off event-driven ingestion the moment a file lands.' },
          { h: 'Lifecycle & tiering', d: 'Lifecycle rules transition objects Standard → IA → Glacier after N days and expire old versions, cutting storage cost without any code.' },
        ],
        code: {
          lang: 'spark (s3a path)',
          text: "df = spark.read.parquet(\n  \"s3a://shopkart-lake/bronze/orders/\"\n)\ndf.write.mode(\"overwrite\").partitionBy(\"dt\").parquet(\n  \"s3a://shopkart-lake/silver/orders/\"\n)",
        },
      },
      deUseCase: {
        lead: 'S3 is the storage foundation under essentially every AWS pipeline — the landing zone for ingestion and the physical home of the Bronze/Silver/Gold (raw/clean/curated) tables.',
        bullets: [
          { h: 'Landing + medallion lake', d: 'Kinesis Firehose, DMS, or Glue land raw files in a Bronze prefix; Glue/EMR Spark refine into Silver and Gold on the same bucket.' },
          { h: 'Query-in-place tables', d: 'Athena, Redshift Spectrum, and EMR read S3 directly through Glue Data Catalog table definitions — no load step, you query the files where they sit.' },
        ],
      },
      integrations: [
        { id: 'glue-catalog', label: 'Glue Data Catalog', note: 'catalogs S3 tables' },
        { id: 'glue-etl', label: 'Glue ETL', note: 'reads / writes lake data' },
        { id: 'lake-formation', label: 'Lake Formation', note: 'governs access to S3 data' },
        { label: 'Athena', note: 'serverless SQL over S3' },
        { label: 'EMR / external Spark', note: 'reads via s3a://' },
      ],
      runtime: {
        lead: 'At runtime S3 delivers massive parallel throughput — thousands of requests per second per prefix — so readers fan out across many objects at once. Because it is object storage, there is no folder rename: Spark job commit copies objects, which is why committers (and table formats like Iceberg/Delta) matter for performance.',
        bullets: [
          { h: 'Throughput scales with prefixes', d: 'Request rate scales per prefix, so spreading data across many key prefixes (partitions) increases parallel read/write throughput.' },
          { h: 'No atomic directory rename', d: 'Unlike a filesystem, "renaming" a prefix means copy-then-delete of every object — the reason S3-optimized committers and manifest-based table formats exist.' },
          { h: 'Strong consistency', d: 'Read-after-write and list-after-write are strongly consistent, so pipelines no longer need the eventual-consistency workarounds older tooling carried.' },
        ],
      },
      interview: [
        { q: 'Is S3 a filesystem? Why does that matter for Spark?', a: 'No — S3 is a flat object store where keys only look like paths. There are no real directories, so there is no atomic folder rename. Spark commits output by writing to a temp location then "renaming" it, which on S3 is a copy-then-delete of every object. That is slow and historically non-atomic, which is why S3-optimized committers and table formats (Iceberg/Delta/Hudi) that commit via a manifest instead of a rename are important.' },
        { q: 'How do you make S3-backed queries cheap and fast?', a: 'Partition the data by encoding partition columns into the key (dt=2024-01-01/), store it in a columnar format (Parquet/ORC) with compression, and keep file sizes reasonable (avoid the small-files problem). Engines like Athena then prune to only the relevant prefixes and read only the needed columns, so you scan far less data — and on Athena you literally pay per byte scanned.' },
        { q: 'How would you trigger a pipeline when a file lands in S3?', a: 'Enable S3 event notifications on object-created events and route them to Lambda, SQS, SNS, or EventBridge. EventBridge is the most flexible target — it can filter and fan out to Step Functions, Glue, or a Lambda that starts the ingestion job the moment the object appears.' },
        { q: 'What storage classes would you use across a data lake lifecycle?', a: 'Standard for hot working data, Standard-IA for data accessed occasionally, and Glacier / Glacier Deep Archive for cold history you rarely read. Intelligent-Tiering is the safe default when access patterns are unknown — it moves objects between tiers automatically. Lifecycle rules automate the transitions and expire old object versions.' },
      ],
    },

    /* ── GOVERNANCE / CATALOG ────────────────────────────── */
    {
      id: 'glue-catalog', name: 'AWS Glue Data Catalog', category: 'governance',
      aka: 'The Hive-compatible metastore for the whole AWS analytics stack',
      tagline: 'The central metadata repository that turns files on S3 into queryable tables — one schema definition shared by Athena, Redshift Spectrum, EMR, and Glue.',
      keyFacts: [
        { k: 'Role', v: 'Central Hive-compatible metastore' },
        { k: 'Holds', v: 'Databases, tables, schemas, partitions' },
        { k: 'Populated by', v: 'Crawlers, DDL, or the API' },
        { k: 'Consumed by', v: 'Athena, Redshift Spectrum, EMR, Glue' },
      ],
      what: {
        lead: 'The Glue Data Catalog is a managed, Hive-metastore-compatible repository of table metadata. It stores where the data lives (the S3 location), its schema (columns and types), its format (Parquet/CSV/JSON), and its partitions — but never the data itself, which stays on S3.',
        bullets: [
          { h: 'Databases and tables', d: 'Metadata is organized into databases (logical groupings) containing tables, each pointing at an S3 prefix with a defined schema and SerDe.' },
          { h: 'Crawlers', d: 'A crawler scans an S3 path, infers the schema and partitions, and creates/updates the table definition automatically — the usual way tables appear in the catalog.' },
          { h: 'Partitions', d: 'The catalog tracks each partition (dt=2024-01-01/) and its location, so query engines can prune to the partitions they need without listing S3.' },
        ],
      },
      why: {
        lead: 'Without a shared catalog, every engine would need its own copy of "what tables exist and what shape they are." The Glue Data Catalog gives the whole stack a single source of schema truth, so a table defined once is instantly queryable by Athena, Redshift Spectrum, and EMR — and governed centrally by Lake Formation.',
        bullets: [
          { h: 'One schema, many engines', d: 'Define orders once; Athena, Spectrum, and Spark all read the same definition — no schema drift between tools.' },
          { h: 'Schema-on-read over the lake', d: 'It layers table semantics on top of raw S3 files, so you get SQL tables without loading data into a warehouse.' },
          { h: 'The governance anchor', d: 'Lake Formation permissions are expressed against catalog databases/tables/columns, so the catalog is where fine-grained access control attaches.' },
        ],
      },
      how: {
        lead: 'Tables get into the catalog three ways: a crawler that infers schema from S3, DDL run through Athena (CREATE EXTERNAL TABLE), or direct API/IaC calls. Once registered, engines resolve a table name to its S3 location, format, and partition list at query time.',
        bullets: [
          { h: 'Crawler-driven', d: 'Point a crawler at s3://.../orders/, schedule it, and it keeps the schema and partition list current as new data arrives.' },
          { h: 'Partition management', d: 'New partitions are registered by re-crawling, by MSCK REPAIR TABLE / ALTER TABLE ADD PARTITION, or via partition projection (Athena computes partitions from a pattern, skipping the catalog entirely for high-cardinality cases).' },
          { h: 'Schema evolution', d: 'Crawlers can be configured to add new columns while preserving existing ones, so appended data with extra fields does not break existing tables.' },
        ],
        code: {
          lang: 'sql (Athena DDL)',
          text: "CREATE EXTERNAL TABLE orders (\n  order_id string, amount double\n)\nPARTITIONED BY (dt string)\nSTORED AS PARQUET\nLOCATION 's3://shopkart-lake/silver/orders/';\n\nMSCK REPAIR TABLE orders;  -- discover partitions",
        },
      },
      deUseCase: {
        lead: 'The Data Catalog is the metadata backbone of an AWS lakehouse — the layer that makes S3 files behave like a database and the point where governance and discovery live.',
        bullets: [
          { h: 'Unified lake metastore', d: 'Bronze/Silver/Gold tables are all registered here, so analysts query them by name in Athena and engineers read the same tables from Glue/EMR jobs.' },
          { h: 'Feeds serverless SQL', d: 'Athena has no storage of its own — it reads table definitions straight from the catalog, making the catalog a hard dependency for serverless querying.' },
        ],
      },
      integrations: [
        { id: 's3', label: 'Amazon S3', note: 'tables point at S3 paths' },
        { id: 'glue-etl', label: 'Glue ETL', note: 'reads/writes catalog tables' },
        { id: 'lake-formation', label: 'Lake Formation', note: 'governs catalog objects' },
        { label: 'Athena', note: 'query engine over the catalog' },
        { label: 'Redshift Spectrum / EMR', note: 'read catalog tables' },
      ],
      runtime: {
        lead: 'At query time an engine calls the catalog to resolve the table to its S3 location and prune partitions before it reads a single byte. The catalog itself is a metadata service, so it is fast and cheap — the heavy lifting is the S3 scan it directs.',
        bullets: [
          { h: 'Partition pruning', d: 'The engine asks the catalog only for partitions matching the WHERE clause, so it lists and scans a fraction of the lake.' },
          { h: 'Metadata scale', d: 'Tables with millions of partitions strain metastore lookups; partition projection sidesteps this by computing partitions from a pattern instead of storing them.' },
        ],
      },
      interview: [
        { q: 'What is the Glue Data Catalog and what does it store?', a: 'It is a managed, Hive-metastore-compatible metadata repository. It stores databases, table definitions (schema, columns, types), the data format/SerDe, the S3 location, and the partition list — but not the data itself, which stays on S3. It gives the whole AWS analytics stack (Athena, Redshift Spectrum, EMR, Glue) a single shared source of schema truth.' },
        { q: 'How do new partitions become visible to Athena?', a: 'Several ways: re-run the crawler, run MSCK REPAIR TABLE (or ALTER TABLE ADD PARTITION for a specific one), or use partition projection. Projection is best for high-cardinality/date partitions — you describe the partition pattern in table properties and Athena computes the partitions at query time instead of reading them from the catalog, avoiding both the metadata bloat and the repair step.' },
        { q: 'What is the difference between the Data Catalog and Lake Formation?', a: 'The Data Catalog holds the metadata — what tables exist and their schema. Lake Formation is the governance layer on top: it defines who can access which databases, tables, columns, and rows in that catalog. The catalog answers "what is here"; Lake Formation answers "who is allowed to see it."' },
      ],
    },

    /* ── INGESTION & ETL ─────────────────────────────────── */
    {
      id: 'glue-etl', name: 'AWS Glue ETL', category: 'ingest-etl',
      aka: 'Serverless Spark for extract-transform-load jobs',
      tagline: 'Fully managed, serverless Apache Spark for ETL — you write the transform, AWS provisions and tears down the cluster, and you pay only for the DPU-seconds the job runs.',
      keyFacts: [
        { k: 'Engine', v: 'Managed Apache Spark (serverless)' },
        { k: 'Billing unit', v: 'DPU-hour (4 vCPU + 16 GB)' },
        { k: 'Languages', v: 'PySpark, Scala' },
        { k: 'Key feature', v: 'Job bookmarks (incremental)' },
      ],
      what: {
        lead: 'Glue ETL runs Apache Spark jobs without any cluster to manage. You supply a PySpark or Scala script; Glue spins up workers, runs the job, and shuts them down. It adds a Glue-specific layer — DynamicFrames, job bookmarks, and native Data Catalog integration — on top of ordinary Spark.',
        bullets: [
          { h: 'Serverless Spark', d: 'No cluster provisioning, patching, or scaling to manage — you choose a worker type and number, and Glue handles the rest.' },
          { h: 'DynamicFrame vs DataFrame', d: 'A DynamicFrame is Glue’s schema-flexible wrapper that tolerates inconsistent/semi-structured data (it can hold multiple types per field via a choice type); you convert to a Spark DataFrame with toDF() when you want full Spark SQL.' },
          { h: 'Job bookmarks', d: 'Glue tracks what data a job has already processed, so a scheduled run picks up only new files/rows — built-in incremental processing without you managing watermarks.' },
        ],
      },
      why: {
        lead: 'Teams want Spark ETL without operating Spark. Glue removes the cluster lifecycle entirely and bills per second of DPU usage, so intermittent or bursty ETL is cheap and there is nothing idle to pay for. Its catalog integration and bookmarks solve two chores — schema management and incrementality — that you would otherwise hand-build.',
        bullets: [
          { h: 'No cluster ops', d: 'No sizing, patching, or idle clusters; ideal for scheduled and event-driven jobs that do not run continuously.' },
          { h: 'Pay per use', d: 'Billed in DPU-seconds (with a short minimum), so you pay only while the job actually runs.' },
          { h: 'Batteries included', d: 'Native Data Catalog reads/writes, bookmarks for incrementality, and Glue Studio’s visual authoring cut the boilerplate of a raw Spark setup.' },
        ],
      },
      how: {
        lead: 'You define a job with a script, a worker type (Standard, G.1X, G.2X, or G.025X for streaming), and a worker count; Glue translates that into DPUs and runs it. Sources and sinks are typically Data Catalog tables or S3 paths, and bookmarks make reruns incremental.',
        bullets: [
          { h: 'Worker types → DPUs', d: 'G.1X = 1 DPU (4 vCPU/16 GB) per worker, G.2X = 2 DPU; more/bigger workers = more parallelism and memory. This is the main tuning knob.' },
          { h: 'Read the catalog, write the lake', d: 'Jobs commonly read a catalog table (create_dynamic_frame.from_catalog), transform, and write Parquet back to S3, updating the catalog.' },
          { h: 'Glue Studio & triggers', d: 'Studio provides a visual DAG that generates the script; jobs are started on a schedule, by a Glue trigger/workflow, or from EventBridge/Step Functions.' },
        ],
        code: {
          lang: 'python (Glue PySpark)',
          text: "dyf = glueContext.create_dynamic_frame.from_catalog(\n    database=\"lake\", table_name=\"orders\",\n    transformation_ctx=\"orders\")   # ctx enables bookmarks\n\ndf = dyf.toDF().filter(\"amount > 0\")\n\ndf.write.mode(\"append\").partitionBy(\"dt\") \\\n  .parquet(\"s3://shopkart-lake/silver/orders/\")",
        },
      },
      deUseCase: {
        lead: 'Glue ETL is the workhorse transform layer of a serverless AWS pipeline — the Bronze→Silver→Gold refinement engine that reads raw lake files, cleans and conforms them, and writes curated tables back.',
        bullets: [
          { h: 'Medallion refinement', d: 'Scheduled jobs read raw Bronze files, apply cleaning/joins/aggregations, and land Silver/Gold Parquet — with bookmarks ensuring each run processes only new data.' },
          { h: 'Catalog-driven ELT', d: 'Jobs read and write Data Catalog tables so the output is immediately queryable in Athena and Redshift Spectrum.' },
        ],
      },
      integrations: [
        { id: 's3', label: 'Amazon S3', note: 'source and sink' },
        { id: 'glue-catalog', label: 'Glue Data Catalog', note: 'table metadata' },
        { id: 'lake-formation', label: 'Lake Formation', note: 'enforces access in jobs' },
        { label: 'Step Functions / EventBridge', note: 'orchestrate & trigger' },
        { label: 'Redshift / RDS (JDBC)', note: 'read/write via connections' },
      ],
      runtime: {
        lead: 'At runtime a Glue job is a real Spark application: a driver plans the DAG and executors run tasks across the DPUs you allocated. Performance and cost come down to right-sizing workers, avoiding shuffle-heavy skew, and controlling output file sizes — the same tuning as any Spark job.',
        bullets: [
          { h: 'Parallelism = workers × cores', d: 'More/bigger workers give more executor cores and memory; too few causes spills and OOM, too many wastes DPU-seconds.' },
          { h: 'Cold start', d: 'Serverless jobs carry a provisioning delay per run; Glue offers a warm-pool/streaming path (G.025X) for latency-sensitive work.' },
          { h: 'Small files & shuffle', d: 'Repartition/coalesce before writing to avoid thousands of tiny S3 objects, and watch skewed joins that stall on one executor.' },
        ],
      },
      interview: [
        { q: 'What is the difference between a DynamicFrame and a DataFrame in Glue?', a: 'A DynamicFrame is Glue’s own abstraction built for messy, semi-structured data: it does not require a fixed schema up front and can hold multiple types for a field via a "choice" type, with resolveChoice() to reconcile them. A Spark DataFrame requires a settled schema and gives you the full Spark SQL API and optimizer. In practice you often read as a DynamicFrame to tolerate dirty input, then toDF() to a DataFrame for the heavy transformations.' },
        { q: 'How do Glue job bookmarks work and why are they useful?', a: 'Bookmarks persist state about what a job has already processed — which S3 files or which JDBC row ranges — keyed by a transformation_ctx. On the next run the job reads only new data, giving built-in incremental processing without you tracking watermarks or last-modified timestamps yourself. They must be enabled on the job and each source needs a transformation context to be bookmarked.' },
        { q: 'How is Glue ETL billed and when is it the right choice?', a: 'It bills per DPU-hour (a DPU is 4 vCPU + 16 GB), metered in seconds with a short minimum, so you pay only while the job runs. That makes it ideal for scheduled, bursty, or event-driven ETL where a persistent cluster would sit idle. For long-running, very large, or highly custom Spark workloads where you want full cluster control and cheaper steady-state compute, EMR is often more cost-effective.' },
        { q: 'How would you make a Glue job process only new data each run?', a: 'Enable job bookmarks and give each source a transformation_ctx so Glue tracks processed files/rows. Alternatively, drive incrementality from partitions — push down a predicate on the date partition (push_down_predicate) so the job reads only the latest dt=… partitions from the catalog, which also cuts S3 scan cost.' },
      ],
    },

    /* ── GOVERNANCE / SECURITY ───────────────────────────── */
    {
      id: 'lake-formation', name: 'AWS Lake Formation', category: 'governance',
      aka: 'Centralized, fine-grained permissions for the S3 data lake',
      tagline: 'The governance layer over the lake: define who can access which databases, tables, columns, and rows once — and have Athena, Redshift Spectrum, EMR, and Glue all enforce it.',
      keyFacts: [
        { k: 'Purpose', v: 'Fine-grained lake access control' },
        { k: 'Granularity', v: 'DB / table / column / row / cell' },
        { k: 'Model', v: 'Grant/revoke on catalog objects' },
        { k: 'Enforced by', v: 'Athena, Spectrum, EMR, Glue' },
      ],
      what: {
        lead: 'Lake Formation is a governance service that centralizes permissions for data registered in the Glue Data Catalog. Instead of hand-crafting IAM and S3 bucket policies for every consumer, you grant SQL-like permissions (SELECT, DESCRIBE, ALTER) on catalog databases, tables, and columns — and Lake Formation enforces them across the integrated engines.',
        bullets: [
          { h: 'Grant/revoke model', d: 'Permissions read like database GRANTs: grant SELECT on lake.orders (specific columns) to an IAM principal, and revoke to remove it.' },
          { h: 'Column, row, and cell security', d: 'Beyond table-level, it supports column filtering, row-level filters (data filters), and cell-level masking so different teams see different slices of the same table.' },
          { h: 'Centralized location registration', d: 'You register S3 locations with Lake Formation, which then brokers access to that data on behalf of the query engines.' },
        ],
      },
      why: {
        lead: 'Securing a lake with raw IAM/S3 policies does not scale: object-level policies cannot express "team A sees these columns, team B sees these rows," and every new engine needs its own grants. Lake Formation moves access control up to the catalog so it is defined once, expressed in business terms, and enforced consistently everywhere.',
        bullets: [
          { h: 'Fine-grained without IAM sprawl', d: 'Column/row/cell rules are impossible with bucket policies alone; Lake Formation makes them declarative and central.' },
          { h: 'One policy, all engines', d: 'The same grant is honored by Athena, Redshift Spectrum, EMR, and Glue — no per-tool re-implementation.' },
          { h: 'Auditable governance', d: 'Central permissions plus tag-based access control (LF-Tags) make it feasible to govern hundreds of tables and prove who can see what.' },
        ],
      },
      how: {
        lead: 'You register S3 data locations with Lake Formation, define permissions on catalog objects (directly or via LF-Tags), and consumers query through the integrated engines. At query time the engine asks Lake Formation to authorize and it returns only the permitted columns/rows via temporary, scoped credentials.',
        bullets: [
          { h: 'LF-Tags (tag-based access)', d: 'Attach tags like sensitivity=pii to databases/tables/columns and grant on the tag; new objects that inherit the tag are governed automatically — the scalable model for large catalogs.' },
          { h: 'Data filters', d: 'Row-level and column-level filters are named objects you attach to a grant, so "region = EU only" or "hide the ssn column" becomes reusable policy.' },
          { h: 'Credential vending', d: 'When enforcement is on, engines receive short-lived credentials scoped to exactly the permitted data instead of broad S3 access.' },
        ],
        code: {
          lang: 'sql-like (LF grant)',
          text: "-- Column-restricted grant to an analyst role\nGRANT SELECT (order_id, amount, dt)\n  ON TABLE lake.orders\n  TO ROLE 'analyst';\n\n-- Row filter: EU rows only\nCREATE DATA FILTER eu_only\n  ON lake.orders  ROW FILTER region = 'EU';",
        },
      },
      deUseCase: {
        lead: 'Lake Formation is how a data platform enforces least-privilege on a shared lake — the control plane that lets many teams query the same catalog while each sees only what it is entitled to.',
        bullets: [
          { h: 'PII column protection', d: 'Grant analysts SELECT on all columns except the PII ones, while a compliance role sees them — enforced identically in Athena and Spectrum.' },
          { h: 'Cross-account data sharing', d: 'Share governed catalog tables to other AWS accounts without copying data, with permissions still enforced by Lake Formation.' },
        ],
      },
      integrations: [
        { id: 'glue-catalog', label: 'Glue Data Catalog', note: 'objects it governs' },
        { id: 's3', label: 'Amazon S3', note: 'registered lake locations' },
        { id: 'glue-etl', label: 'Glue ETL', note: 'jobs honor grants' },
        { label: 'Athena / Redshift Spectrum', note: 'enforce column/row rules' },
        { label: 'IAM / Identity Center', note: 'principals grants apply to' },
      ],
      runtime: {
        lead: 'At runtime Lake Formation sits in the authorization path: the query engine submits the principal and requested table, Lake Formation evaluates grants (including LF-Tags and data filters) and returns scoped, temporary credentials plus the allowed column/row set. Only the permitted data is read from S3.',
        bullets: [
          { h: 'Enforcement point', d: 'Column and row filtering is applied before results leave the engine, so a filtered column is never returned to an unauthorized user.' },
          { h: 'Hybrid access mode', d: 'Lake Formation and IAM permissions can coexist during migration; you move tables to LF enforcement incrementally rather than all at once.' },
        ],
      },
      interview: [
        { q: 'What problem does Lake Formation solve that IAM and S3 policies cannot?', a: 'IAM and bucket policies control access at the object/prefix level — they cannot express column-, row-, or cell-level security, and they force you to re-grant for every engine. Lake Formation moves access control up to the Glue Data Catalog so you grant SQL-style permissions (including specific columns and row filters) once, in business terms, and every integrated engine (Athena, Spectrum, EMR, Glue) enforces them consistently.' },
        { q: 'What are LF-Tags and why do they matter at scale?', a: 'LF-Tags are tag-based access control: you attach tags like sensitivity=pii or domain=finance to databases, tables, or columns, then grant permissions on the tag rather than on each object. New or changed objects that carry the tag are governed automatically, so you manage a handful of tag policies instead of thousands of per-table grants — the only practical model for a large, growing catalog.' },
        { q: 'How does Lake Formation enforce row- and column-level security at query time?', a: 'You define data filters (named column projections and row-filter expressions) and attach them to a grant. When a governed engine runs a query, it authorizes with Lake Formation, which returns short-lived scoped credentials plus the allowed columns and a row predicate. The engine applies the column projection and row filter before returning results, so unauthorized columns/rows never reach the user.' },
      ],
    },
  ];

  TV.AwsServices = AWS_SERVICES;
})();
