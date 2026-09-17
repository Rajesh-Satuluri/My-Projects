/* ============================================================
   Cloud DE Visualizer — Azure ↔ Databricks equivalence layer
   (Block D). An honest capability matrix plus deep-dive concept
   pages. Each side references the service page id so cells link,
   and every mapping carries a DIRECT / CLOSE / PARTIAL / NONE
   rating with a one-line note explaining the nuance.

   Rating meaning:
     DIRECT  — effectively the same capability / interop-native
     CLOSE   — same job, different model; maps cleanly with caveats
     PARTIAL — overlapping but meaningfully different scope/layer
     NONE    — no real first-party counterpart in that ecosystem
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  // az / db: { svc, id? }  — id (when present) deep-links to the page.
  const MATRIX = [
    { cap: 'Lake storage',            concept: 'storage-format',
      az: { svc: 'ADLS Gen2', id: 'adls-gen2' },
      db: { svc: 'ADLS via UC External Locations', id: 'unity-catalog' },
      rating: 'DIRECT',  note: 'Databricks stores its data on ADLS too — same physical lake.' },
    { cap: 'Open table format (ACID)', concept: 'storage-format',
      az: { svc: 'Parquet / Delta on the lake' },
      db: { svc: 'Delta Lake', id: 'delta-lake' },
      rating: 'PARTIAL', note: 'Azure-native has no managed table format; you use Delta/Parquet yourself.' },
    { cap: 'Batch orchestration',     concept: 'orchestration',
      az: { svc: 'Azure Data Factory', id: 'data-factory' },
      db: { svc: 'Databricks Workflows', id: 'workflows' },
      rating: 'CLOSE',   note: 'ADF = broad connectors + orchestration; Workflows = Databricks-native DAGs.' },
    { cap: 'Declarative ETL pipelines', concept: 'ingestion',
      az: { svc: 'ADF Mapping Data Flows', id: 'data-factory' },
      db: { svc: 'Delta Live Tables', id: 'delta-live-tables' },
      rating: 'PARTIAL', note: 'Both low-code transforms, but DLT adds quality expectations + streaming tables.' },
    { cap: 'Incremental file ingestion', concept: 'ingestion',
      az: { svc: 'ADF + Event/Storage triggers', id: 'data-factory' },
      db: { svc: 'Auto Loader', id: 'auto-loader' },
      rating: 'CLOSE',   note: 'Auto Loader tracks processed files with exactly-once state; ADF uses watermarks/triggers.' },
    { cap: 'Streaming ingress (broker)', concept: 'streaming',
      az: { svc: 'Azure Event Hubs', id: 'event-hubs' },
      db: { svc: '— (consumes a broker)' },
      rating: 'NONE',    note: 'Databricks has no message broker; it reads Event Hubs/Kafka. Different layer.' },
    { cap: 'Stream processing',       concept: 'streaming',
      az: { svc: 'Azure Stream Analytics', id: 'stream-analytics' },
      db: { svc: 'Structured Streaming', id: 'structured-streaming' },
      rating: 'CLOSE',   note: 'ASA = serverless SQL, low-ops; Structured Streaming = code-first, more powerful.' },
    { cap: 'CDC handling',            concept: 'cdc',
      az: { svc: 'SQL CDC / Change Tracking', id: 'azure-sql' },
      db: { svc: 'Change Data Feed / APPLY CHANGES', id: 'change-data-feed' },
      rating: 'CLOSE',   note: 'Azure CDC is source-side (in the DB); CDF is table-side (in Delta).' },
    { cap: 'MPP data warehouse',      concept: 'warehouse',
      az: { svc: 'Synapse dedicated SQL pool', id: 'synapse-analytics' },
      db: { svc: 'Databricks SQL', id: 'databricks-sql' },
      rating: 'CLOSE',   note: 'Synapse loads its own MPP storage; DBSQL queries Delta in place via Photon.' },
    { cap: 'Serverless lake SQL',     concept: 'warehouse',
      az: { svc: 'Synapse Serverless SQL', id: 'synapse-serverless' },
      db: { svc: 'Databricks SQL (Serverless)', id: 'databricks-sql' },
      rating: 'CLOSE',   note: 'Both query lake files on demand; DBSQL is Delta-native, Synapse is T-SQL over files.' },
    { cap: 'Managed Spark',           concept: 'warehouse',
      az: { svc: 'Synapse Spark / HDInsight' },
      db: { svc: 'Clusters + Photon', id: 'clusters' },
      rating: 'CLOSE',   note: 'Databricks Spark (Runtime + Photon) is the more optimized, feature-rich engine.' },
    { cap: 'Data governance / catalog', concept: 'governance',
      az: { svc: 'Microsoft Purview', id: 'purview' },
      db: { svc: 'Unity Catalog', id: 'unity-catalog' },
      rating: 'PARTIAL', note: 'Purview = estate-wide scan/catalog; UC = enforcement engine on the lakehouse.' },
    { cap: 'Identity & access',       concept: 'identity-secrets',
      az: { svc: 'Entra ID + RBAC', id: 'entra-id' },
      db: { svc: 'UC grants (Entra identities)', id: 'unity-catalog' },
      rating: 'CLOSE',   note: 'UC syncs identities from Entra via SCIM, then adds its own fine-grained grants.' },
    { cap: 'Secrets management',      concept: 'identity-secrets',
      az: { svc: 'Azure Key Vault', id: 'key-vault' },
      db: { svc: 'Databricks Secrets (KV-backed)', id: 'unity-catalog' },
      rating: 'DIRECT',  note: 'A Databricks secret scope backs directly onto Azure Key Vault.' },
    { cap: 'ML lifecycle',            concept: null,
      az: { svc: 'Azure Machine Learning' },
      db: { svc: 'MLflow', id: 'mlflow' },
      rating: 'CLOSE',   note: 'Azure ML also uses MLflow under the hood — the tracking/registry API is shared.' },
    { cap: 'Cross-org data sharing',  concept: null,
      az: { svc: 'Azure Data Share' },
      db: { svc: 'Delta Sharing', id: 'delta-sharing' },
      rating: 'CLOSE',   note: 'Delta Sharing is an open protocol, no-copy, cross-platform; Data Share copies snapshots.' },
    { cap: 'Monitoring & ops',        concept: null,
      az: { svc: 'Azure Monitor + Log Analytics', id: 'azure-monitor' },
      db: { svc: 'System tables + cluster metrics' },
      rating: 'PARTIAL', note: 'Databricks emits its own telemetry; on Azure it can also route to Azure Monitor.' },
  ];

  // Deep-dive concept pages: two-sided comparison + verdict.
  const CONCEPTS = [
    {
      id: 'storage-format', title: 'Lake storage & table format', rating: 'PARTIAL',
      intro: 'Both stacks physically store data on Azure Data Lake Storage. The difference is the table layer: Azure-native gives you files, while Databricks adds Delta Lake — an ACID table format — natively.',
      azure: { label: 'Azure-native',
        points: [
          'ADLS Gen2 is the lake: hierarchical namespace, POSIX ACLs, cheap object storage.',
          'No first-party managed table format — you store Parquet (or Delta) files and manage them yourself.',
          'Synapse dedicated pool has its own MPP storage, separate from the lake.',
          'Serverless SQL queries the files in place; there is no built-in ACID/transaction layer.',
        ] },
      databricks: { label: 'Databricks',
        points: [
          'Uses the same ADLS storage — governed through Unity Catalog external locations.',
          'Delta Lake is native: a transaction log over Parquet gives ACID, time travel, MERGE and schema evolution.',
          'One governed copy of data serves engineering, SQL and ML — the "lakehouse".',
          'Data skipping + OPTIMIZE/liquid clustering make lake queries warehouse-fast.',
        ] },
      verdict: 'Same lake, different table layer. Databricks’ Delta makes the lake transactional; Azure-native leaves ACID to you unless you adopt Delta or load into Synapse.',
    },
    {
      id: 'orchestration', title: 'Orchestration', rating: 'CLOSE',
      intro: 'Both can schedule and monitor pipelines with dependencies, retries and alerts. ADF leads with connectors and cross-service reach; Workflows leads with Databricks-native, code-friendly DAGs.',
      azure: { label: 'Azure Data Factory',
        points: [
          '100+ connectors and hybrid reach (Self-hosted IR to on-prem).',
          'Orchestrates across the whole Azure estate, not just Databricks.',
          'Tumbling-window triggers with dependencies + automatic backfill.',
          'Often lands raw data and then triggers Databricks for the transform.',
        ] },
      databricks: { label: 'Databricks Workflows',
        points: [
          'Native multi-task DAGs of notebooks, DLT, SQL, Python and dbt.',
          'No separate scheduler to run; task values pass data between tasks.',
          'Repair-run re-executes only failed/downstream tasks.',
          'Runs on isolated job clusters or serverless.',
        ] },
      verdict: 'For Databricks-centric pipelines, Workflows removes a whole system. For orchestrating many non-Databricks Azure services, ADF wins — and the common hybrid is ADF orchestrating overall while triggering Databricks Workflows for compute.',
    },
    {
      id: 'ingestion', title: 'Ingestion & transformation', rating: 'CLOSE',
      intro: 'Getting raw data into the lake and shaping it. Azure leans on ADF (copy + Mapping Data Flows); Databricks leans on Auto Loader + Delta Live Tables for incremental, quality-checked pipelines.',
      azure: { label: 'Azure (ADF)',
        points: [
          'Copy Activity moves data from 100+ sources into ADLS Bronze.',
          'Mapping Data Flows: visual, code-free Spark transforms.',
          'Incremental loads via watermark columns / tumbling windows.',
          'Event/storage triggers fire pipelines when files land.',
        ] },
      databricks: { label: 'Databricks (Auto Loader + DLT)',
        points: [
          'Auto Loader incrementally ingests new files with exactly-once state + schema evolution.',
          'DLT declares streaming tables + materialized views with data-quality expectations.',
          'APPLY CHANGES INTO handles CDC/SCD without hand-written MERGE.',
          'Built-in lineage, retries and an event log per pipeline.',
        ] },
      verdict: 'ADF is the stronger connector/orchestration layer; Auto Loader + DLT is the stronger incremental, quality-gated transform layer. Many platforms use ADF to land data and DLT to refine it.',
    },
    {
      id: 'streaming', title: 'Streaming', rating: 'CLOSE',
      intro: 'Real-time has two parts: the broker that buffers events, and the engine that processes them. Azure supplies both (Event Hubs + Stream Analytics); Databricks supplies the engine (Structured Streaming) and consumes a broker.',
      azure: { label: 'Azure (Event Hubs + ASA)',
        points: [
          'Event Hubs: managed partitioned log, Kafka-compatible, with Capture to ADLS.',
          'Stream Analytics: serverless SQL with temporal windows, low-ops.',
          'Great for standard windowed analytics and IoT with minimal code.',
          'Exactly-once to selected sinks; scale via Streaming Units.',
        ] },
      databricks: { label: 'Databricks (Structured Streaming)',
        points: [
          'No broker — reads Event Hubs / Kafka into a streaming DataFrame.',
          'Code-first (Python/Scala/SQL), far more flexible than ASA.',
          'Exactly-once via checkpoints + transactional Delta sinks.',
          'Stateful ops, stream-stream joins, ML, arbitrary transforms.',
        ] },
      verdict: 'You still need Event Hubs (or Kafka) as the broker even with Databricks. Choose Stream Analytics for simple SQL real-time; choose Structured Streaming for rich, large or Delta-native streaming.',
    },
    {
      id: 'warehouse', title: 'Warehouse & SQL serving', rating: 'CLOSE',
      intro: 'Serving curated data to BI at concurrency. Synapse dedicated pool is a classic provisioned MPP warehouse; Databricks SQL serves the lakehouse directly on Delta with Photon.',
      azure: { label: 'Azure Synapse',
        points: [
          'Dedicated SQL pool: MPP across 60 distributions, tuned via distribution keys.',
          'Loads data into its own storage; pause to save compute cost.',
          'Serverless SQL for pay-per-TB ad-hoc queries over lake files.',
          'Bundles Spark pools + pipelines in one workspace.',
        ] },
      databricks: { label: 'Databricks SQL',
        points: [
          'Queries Gold Delta tables in place — no ETL into warehouse storage.',
          'Photon-accelerated SQL warehouses; serverless start in seconds.',
          'One governed copy of data for engineering, SQL and ML.',
          'Unity Catalog grants/masks/row-filters apply to every query.',
        ] },
      verdict: 'Synapse is the classic provisioned MPP warehouse (great when you want dedicated, tuned storage). DBSQL keeps one lakehouse copy and serves it fast via Photon. Both serve BI at scale; the choice is lakehouse-unification vs dedicated-warehouse.',
    },
    {
      id: 'governance', title: 'Governance & catalog', rating: 'PARTIAL',
      intro: 'These overlap but sit at different layers. Purview is an estate-wide catalog that scans many sources; Unity Catalog is the enforcement engine that governs lakehouse data at query time.',
      azure: { label: 'Microsoft Purview',
        points: [
          'Scans ADLS, SQL, Synapse, Power BI and on-prem into a Data Map.',
          'Auto-classifies sensitive data (PII) across the estate.',
          'Cross-system lineage for impact analysis.',
          'Discovery/glossary layer — not a query-time access enforcer.',
        ] },
      databricks: { label: 'Unity Catalog',
        points: [
          'Account-level metastore; three-level namespace (catalog.schema.table).',
          'ANSI GRANTs + row-level security + column masking, enforced in the query plan.',
          'Automatic column/table lineage across notebooks, jobs, dashboards.',
          'Governs storage access via credentials + external locations.',
        ] },
      verdict: 'They are complementary, not interchangeable. UC enforces access + lineage inside Databricks; Purview catalogs and classifies the whole Azure estate. Enterprises often run both, bridged by connectors.',
    },
    {
      id: 'identity-secrets', title: 'Identity & secrets', rating: 'CLOSE',
      intro: 'Who you are and what secrets you can use. Databricks builds on Azure’s identity (Entra) and secret store (Key Vault) rather than replacing them.',
      azure: { label: 'Azure-native',
        points: [
          'Entra ID authenticates users, service principals and managed identities.',
          'Azure RBAC authorizes at resource scope; ADLS adds POSIX ACLs.',
          'Key Vault stores secrets/keys/certs, access governed by Entra.',
          'Managed identities give passwordless service access.',
        ] },
      databricks: { label: 'Databricks',
        points: [
          'UC syncs identities from Entra via SCIM — same users/groups.',
          'UC grants add fine-grained, engine-enforced access on data objects.',
          'Databricks secret scopes back directly onto Azure Key Vault.',
          'Managed identity / service credentials reach ADLS via UC.',
        ] },
      verdict: 'Databricks does not fork identity — it consumes Entra and Key Vault, then layers UC grants on top. Secrets are a DIRECT mapping (KV-backed scopes); access control is CLOSE (Entra identities + UC’s own grants).',
    },
    {
      id: 'cdc', title: 'Change data capture', rating: 'CLOSE',
      intro: 'Capturing and applying row-level changes. Azure captures at the source database; Databricks captures at the Delta table and applies changes declaratively.',
      azure: { label: 'Azure (SQL CDC / Change Tracking)',
        points: [
          'CDC/Change Tracking in Azure SQL surfaces inserts/updates/deletes.',
          'ADF/Databricks pulls only changed rows into Bronze.',
          'Source-side: the change record lives in the operational DB.',
          'Watermarks track the last extracted position.',
        ] },
      databricks: { label: 'Databricks (CDF / APPLY CHANGES)',
        points: [
          'Change Data Feed emits row-level changes from a Delta table.',
          'DLT APPLY CHANGES INTO maintains SCD type 1/2 automatically.',
          'Table-side: changes are read between Delta versions.',
          'Drives efficient incremental Silver → Gold propagation.',
        ] },
      verdict: 'Different capture points: Azure CDC reads changes out of the source database; Delta CDF reads changes out of a lakehouse table. In a full pipeline you often use both — SQL CDC to ingest, CDF to propagate downstream.',
    },
  ];

  // Migration / design scenarios — the "design a stack" interview format.
  // Each: prompt, the recommended answer, the mapping steps, and the trap.
  const SCENARIOS = [
    {
      id: 's-adf-synapse-to-dbx',
      title: 'An ADF + Synapse team moves to Databricks',
      prompt: 'Your company runs nightly ADF pipelines that load an Azure Synapse dedicated SQL pool serving Power BI. Leadership wants to move to Databricks. What maps to what, and what do you keep?',
      answer: 'Keep ADLS as the lake and keep Power BI. Replace Synapse serving with Databricks SQL over Gold Delta tables; move ETL from ADF Data Flows into Auto Loader + Delta Live Tables; replace ADF orchestration with Databricks Workflows (or keep ADF as the top-level orchestrator triggering Databricks). Govern with Unity Catalog.',
      steps: [
        { from: 'ADLS Gen2 (lake)', to: 'ADLS Gen2 — unchanged', note: 'Databricks uses the same storage via UC external locations.' },
        { from: 'ADF orchestration', to: 'Databricks Workflows (or ADF triggers Databricks)', note: 'Native DAGs; hybrid keeps ADF if many non-Databricks sources remain.' },
        { from: 'ADF Mapping Data Flows', to: 'Auto Loader + Delta Live Tables', note: 'Incremental ingest + quality-gated transforms.' },
        { from: 'Synapse dedicated pool', to: 'Databricks SQL over Gold Delta', note: 'No separate warehouse copy; Photon serves BI.' },
        { from: 'Power BI', to: 'Power BI — unchanged', note: 'Repoint to a Databricks SQL warehouse.' },
      ],
      trap: 'Don’t claim you "replace Event Hubs with Databricks" — this is batch. And don’t forget governance: moving to Databricks means adopting Unity Catalog, not just moving compute.',
    },
    {
      id: 's-realtime-dashboard',
      title: 'Real-time revenue dashboard',
      prompt: 'You need a live revenue dashboard: millions of order events per second, 5-minute rolling revenue by category, on Azure. Design the pipeline. When would you use Databricks instead of Stream Analytics?',
      answer: 'Event Hubs ingests the stream. For a simple windowed aggregation, Azure Stream Analytics (tumbling 5-min window) → Power BI is the low-ops choice. Also enable Event Hubs Capture → ADLS Bronze for the cold path. Use Databricks Structured Streaming instead when you need rich transforms, ML, joins to reference data, or a Delta sink feeding the lakehouse.',
      steps: [
        { from: 'Order events', to: 'Azure Event Hubs', note: 'Partitioned by orderId for ordering; Kafka-compatible.' },
        { from: 'Hot path', to: 'Stream Analytics (5-min tumbling) → Power BI', note: 'Serverless SQL, exactly-once to sink.' },
        { from: 'Cold path', to: 'Event Hubs Capture → ADLS Bronze (Parquet)', note: 'Zero-code archival for reprocessing.' },
        { from: 'When complex', to: 'Databricks Structured Streaming → Delta Silver', note: 'Code-first, stateful, ML, Delta-native.' },
      ],
      trap: 'A common miss: saying "Databricks ingests the events." Databricks has no broker — you still need Event Hubs (or Kafka) in front of it.',
    },
    {
      id: 's-onprem-sql-to-lake',
      title: 'Ingest an on-prem SQL Server into the lake',
      prompt: 'You must land 300 tables from an on-prem SQL Server into an Azure lakehouse nightly, incrementally. Design it.',
      answer: 'Use ADF with a Self-hosted Integration Runtime to reach on-prem. A metadata-driven pipeline (control table + parameters) copies only changed rows — via CDC/Change Tracking or a watermark column — into ADLS Bronze as Parquet. Then Auto Loader + DLT (or a Databricks job) MERGE changes into Silver Delta. Secrets in Key Vault, access via managed identity, governed by Unity Catalog.',
      steps: [
        { from: 'On-prem SQL Server', to: 'ADF Self-hosted IR', note: 'Reaches sources behind the firewall.' },
        { from: '300 tables', to: 'Metadata-driven ADF pipeline', note: 'One parameterized pipeline + control table.' },
        { from: 'Incremental', to: 'CDC / Change Tracking / watermark', note: 'Only changed rows, not full reloads.' },
        { from: 'Bronze → Silver', to: 'Auto Loader + DLT MERGE (or APPLY CHANGES)', note: 'Exactly-once, quality-checked.' },
      ],
      trap: 'Forgetting the Self-hosted IR (you can’t reach on-prem with Azure IR), or proposing full-table reloads of 300 tables nightly instead of incremental extraction.',
    },
    {
      id: 's-governance',
      title: 'Govern PII across lake + warehouse',
      prompt: 'Compliance asks: where does PII live across our Azure + Databricks estate, who can see it, and what feeds this regulated report? Which tools answer this?',
      answer: 'Use both governance tools at their right layers. Microsoft Purview scans the whole estate (ADLS, SQL, Synapse, Power BI, on-prem) to classify PII and give cross-system lineage for the report. Unity Catalog enforces access inside Databricks with column masking + row filters at query time and gives lakehouse lineage. Purview answers "where + what feeds this"; UC answers "who can see it in Databricks and is it masked".',
      steps: [
        { from: '"Where is PII?"', to: 'Purview scan + classification', note: 'Estate-wide auto-classification.' },
        { from: '"What feeds the report?"', to: 'Purview cross-system lineage', note: 'Impact analysis across tools.' },
        { from: '"Who can see it?"', to: 'Unity Catalog grants', note: 'Enforced in the query plan.' },
        { from: '"Is it masked?"', to: 'UC column masking + row filters', note: 'Dynamic by querying principal.' },
      ],
      trap: 'Treating Purview and Unity Catalog as interchangeable. They’re complementary — Purview catalogs/classifies the estate; UC enforces access inside Databricks.',
    },
  ];

  TV.Equivalences = { MATRIX, CONCEPTS, SCENARIOS };
})();
