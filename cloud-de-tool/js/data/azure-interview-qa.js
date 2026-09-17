/* ============================================================
   Cloud DE Visualizer — Azure interview questions, topic-wise.
   Sourced from the uploaded mock-interview transcripts, de-duped
   and given tight, interview-recall model answers. Consumed by
   js/modules/_interview-qa.js.

   Shape: [ { id, label, icon?, blurb?, questions:[ { q, a } ] } ]

   Build progress (10 Q&A / iteration):
     Iter 1  — adf-ir (7) + adf-pipeline (3)            ✅
     Iter 2  — adf-pipeline (+4) + storage (5) + synapse (1)  ✅
     Iter 3  — synapse (+3) + security (4) + monitoring (2) + scenario (1)
     Iter 4  — scenario / system design + CI/CD (~5)
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  const TOPICS = [
    {
      id: 'adf-ir',
      label: 'ADF — Integration Runtime & Ingestion',
      icon: 'arrow-down',
      blurb: 'The single most-asked Azure Data Factory area: how data physically moves from on-prem into the cloud, and how you make that copy fast and reliable.',
      questions: [
        { q: 'How do you move data from an on-prem source to the cloud using ADF?',
          a: 'Install a Self-hosted Integration Runtime (SHIR) on a machine inside the on-prem network and register it in ADF. Point the source linked service at that SHIR, then a Copy activity pulls the data out through the firewall and lands it in ADLS Gen2 or Blob.' },
        { q: 'Why is the auto-resolve (Azure) Integration Runtime not enough — why do you need a Self-hosted IR?',
          a: 'The Azure IR can only reach public cloud endpoints. On-prem servers sit behind a corporate firewall on a private network, so only a SHIR running inside that network can open the outbound connection and read the source. The Azure IR simply cannot see it.' },
        { q: 'A pipeline copying an on-prem DB to ADLS is running too slowly. How do you troubleshoot it?',
          a: 'Work through the layers: (1) has the data volume grown, (2) is the SHIR node CPU/memory saturated, (3) is the source DB slow (missing indexes, locks), (4) are the copy DIU and parallel-copy / degree-of-parallelism settings too low, (5) is the network the bottleneck. Tune whichever layer is actually pegged.' },
        { q: 'What is DIU and how does it affect copy performance?',
          a: 'Data Integration Units are the compute — CPU, memory and network — allocated to a Copy activity on the Azure IR. Increasing DIU adds parallel throughput and normally shortens the copy, up to the point where the source, sink, or network becomes the new limit. (DIU applies to the Azure IR, not the SHIR.)' },
        { q: 'What does the Get Metadata activity do, and when do you use it?',
          a: 'It returns properties of a dataset — child items, file name, size, last-modified, existence, and column schema — before you process it. Typical uses: enumerate files to drive a ForEach loop, or validate with an If Condition that the expected file actually arrived.' },
        { q: 'What are storage event triggers and when would you use them?',
          a: 'An event trigger starts a pipeline on a Blob/ADLS "blob created" or "blob deleted" event, so ingestion fires the instant a file lands rather than waiting for a schedule. It is the event-driven alternative to a scheduled or tumbling-window trigger for file-arrival pipelines.' },
        { q: 'How do you ensure only one instance of a pipeline runs at any given time?',
          a: 'Set the pipeline concurrency to 1 (or use a tumbling-window trigger with concurrency 1). ADF then queues any subsequent runs until the active run finishes, so you never get overlapping executions.' },
      ],
    },
    {
      id: 'adf-pipeline',
      label: 'ADF — Pipelines, Triggers & Orchestration',
      icon: 'git-branch',
      blurb: 'Building real ADF pipelines: metadata-driven copies, incremental loads, scheduling and failure alerting.',
      questions: [
        { q: 'How do you copy 100 tables from on-prem SQL to ADLS with a single pipeline?',
          a: 'Make it metadata-driven: a Lookup reads the table list (e.g. from information_schema.tables or a control table), a ForEach iterates it, and inside the loop one parameterized Copy activity templatizes the source table and sink path. Everything runs through the SHIR, with watermark logic added if you need incremental.' },
        { q: 'How do you load only incremental data when each table has a different high-watermark column?',
          a: 'Keep a control table of (table_name, watermark_column, last_value). Per table, two Lookups read the column name + last stored value and the current MAX(col); the Copy query filters WHERE col > last_value. After a successful load you update last_value. Parameterizing the column name lets one pipeline serve tables with different watermark columns.' },
        { q: 'How do you send an email when a pipeline fails?',
          a: 'Two common ways: wire the activities’ failure path to a Web or Logic App activity that calls an email/Teams endpoint, or configure an Azure Monitor alert on the pipeline "Failed" run metric that notifies through an Action Group. The Logic App route gives you a richer, custom message.' },
        { q: 'How do you run a pipeline only on the last working day of each month?',
          a: 'A schedule trigger cannot express "last working day" directly. Keep a small calendar file/table listing each month’s last working day, run a plain daily trigger, and add a Lookup + If Condition so the pipeline only proceeds when today matches a date in the calendar.' },
        { q: 'A ForEach copying many tables fails halfway — how do you re-run only the failed tables?',
          a: 'Log each table’s success (to a log file, control table, or ADF variable) as it completes. On rerun, read the log and build the ForEach list from the tables not yet marked successful, so completed tables are skipped and only the failures reprocess.' },
        { q: 'What trigger types does ADF support and when do you use each?',
          a: 'Schedule (wall-clock recurrence), Tumbling Window (fixed non-overlapping slices with dependencies, backfill and concurrency control), Storage Event (blob created/deleted), and Custom Event (via Event Grid). Use tumbling for backfills/dependencies, event for file-arrival, and schedule for simple recurrence.' },
        { q: 'A pipeline fails after loading 500k of 1M rows. Does ADF roll back, and how do you recover?',
          a: 'ADF does not auto-rollback a partial Copy. Make the load idempotent: stage into a temp table/partition and swap on success, or add a pre-step that deletes the target partition (DELETE WHERE load_date = today) before reloading — so a rerun never double-counts.' },
      ],
    },
    {
      id: 'storage',
      label: 'ADLS & Storage',
      icon: 'folder',
      blurb: 'The storage layer under every Azure lakehouse: Blob vs ADLS Gen2, the hierarchical namespace, and how compute reaches and secures the data.',
      questions: [
        { q: 'What is the difference between Blob Storage and ADLS Gen2?',
          a: 'ADLS Gen2 is Blob Storage with the Hierarchical Namespace enabled. That adds true directories with atomic folder rename/move plus POSIX ACLs, making it analytics-optimized. Plain Blob is a flat object store, better for unstructured/backup data. Same underlying platform — Gen2 layers analytics features on top.' },
        { q: 'What does the Hierarchical Namespace add, and why does it matter for analytics?',
          a: 'It gives real directories instead of flat key prefixes, so folder operations (rename/move/delete) are atomic and cheap, and you get directory-level POSIX ACLs. That makes partitioned folder layouts and fine-grained path security work efficiently — essential for a Spark/lakehouse workload.' },
        { q: 'What is the difference between ADLS Gen1 and Gen2?',
          a: 'Gen1 was a standalone HDFS-like service; Gen2 is built on Blob Storage with the hierarchical namespace, so you inherit Blob’s tiering, redundancy and cost model plus the analytics features. Gen2 is the current standard and Gen1 is retired — always design on Gen2.' },
        { q: 'How does Databricks access ADLS Gen2 — mount vs direct access?',
          a: 'Either mount the container once to a DBFS path (dbutils.fs.mount) so notebooks use a friendly /mnt path, or access directly via the abfss:// URI with credentials in Spark config. Modern practice under Unity Catalog is direct access through external locations / storage credentials rather than mounts.' },
        { q: 'How do you give a service passwordless, least-privilege access to ADLS?',
          a: 'Use a managed identity (or service principal) and grant it an Azure RBAC role such as Storage Blob Data Reader/Contributor, optionally narrowed with POSIX ACLs on specific folders. No account keys or SAS tokens in pipelines — any secret that is genuinely needed lives in Key Vault.' },
      ],
    },
    {
      id: 'synapse',
      label: 'Synapse & Serving Layer',
      icon: 'cpu',
      blurb: 'The warehouse / serving side: what Synapse is, its pool types, and how BI reaches the curated data.',
      questions: [
        { q: 'What does Azure Synapse Analytics do, and where does it fit in a DE architecture?',
          a: 'Synapse is an integrated analytics platform: a dedicated SQL pool (MPP data warehouse), serverless SQL (query lake files on demand), Spark pools, and pipelines. It typically sits as the serving/warehouse layer — curated Gold data is loaded into a dedicated pool or queried serverless, then consumed by Power BI.' },
      ],
    },
  ];

  TV.AzureInterviewQA = TOPICS;
})();
