/* ============================================================
   Cloud DE Visualizer — Azure interview questions, topic-wise.
   Sourced from the uploaded mock-interview transcripts, de-duped
   and given tight, interview-recall model answers. Consumed by
   js/modules/_interview-qa.js.

   Shape: [ { id, label, icon?, blurb?, questions:[ { q, a } ] } ]

   Build progress (10 Q&A / iteration):
     Iter 1  — adf-ir (7) + adf-pipeline (3)            ✅
     Iter 2  — adf-pipeline (+4) + storage (5) + synapse (1)  ✅
     Iter 3  — synapse (+3) + security (4) + monitoring (2) + scenario (1)  ✅
     Iter 4  — scenario (+2) + cicd/design (3)          ✅  [Azure core complete: 35]

   ADF deep-dive expansion (curated ~100 ADF Q&A, tagged by concept):
     ADF-1  — adf-fundamentals (10)                     ✅
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  const TOPICS = [
    {
      id: 'adf-fundamentals',
      label: 'ADF — Fundamentals & vs SSIS/Databricks',
      icon: 'book',
      blurb: 'The opening questions of almost every Azure Data Factory interview: what ADF is, its building blocks, and how it sits next to SSIS, Databricks and Synapse. Get these crisp and you set the tone for the rest of the round.',
      questions: [
        { q: 'What is Azure Data Factory and what problem does it solve?',
          tags: ['Core Concept', 'Architecture', 'ELT'],
          a: 'Azure Data Factory is Azure’s fully managed, serverless data-integration service. It solves the problem of getting data out of many disparate sources — on-prem databases, SaaS APIs, files, cloud stores — into a central place, and orchestrating the steps that clean and reshape it, without you having to run or maintain your own scheduler and servers. You build pipelines of activities that copy, transform and control the flow, then schedule or trigger them and monitor every run from one place. In practice it is the control plane of an Azure data platform: it lands raw data in the lake and orchestrates the Spark or SQL jobs that build the curated layers.' },
        { q: 'What are the core components (building blocks) of ADF?',
          tags: ['Core Concept', 'Architecture'],
          a: 'Five components matter. A pipeline is a logical grouping of activities that together perform a task. An activity is a single step — copy data, run a notebook, run a stored procedure, loop or branch. A dataset is a named view of the data an activity points at — a table or a file path with a format. A linked service is the connection definition — which storage account or database, plus how to authenticate. And the Integration Runtime is the compute that actually executes the activity. Triggers sit on top and decide when a pipeline runs. If you can explain those, you have explained ADF.' },
        { q: 'What is the difference between a linked service and a dataset?',
          tags: ['Linked Service', 'Dataset', 'Core Concept'],
          a: 'A linked service is the connection — it tells ADF which resource to connect to and how to authenticate, for example “this ADLS Gen2 account using a managed identity” or “this Azure SQL database with credentials pulled from Key Vault”. A dataset is the specific object inside that connection — a particular table, or a folder plus file format within the storage account. The relationship is one-to-many: one linked service is reused by many datasets. The simplest way to say it: a linked service is the server, a dataset is the file or table sitting on it.' },
        { q: 'What is the difference between a pipeline and an activity?',
          tags: ['Pipeline', 'Activity', 'Core Concept'],
          a: 'A pipeline is the unit of orchestration and deployment — a DAG of steps that you schedule, parameterize, trigger and monitor as one thing. An activity is a single step inside that pipeline: the smallest unit of work, such as a Copy, a Data Flow, a Lookup or a ForEach. You don’t run an activity on its own; you run the pipeline, and it executes its activities in the order set by their dependencies. So the pipeline is the “what to do and when”, and the activity is each individual thing being done.' },
        { q: 'What are the main types of activities in ADF?',
          tags: ['Activity', 'Control Flow', 'Data Movement'],
          a: 'They fall into three groups. Data movement is essentially the Copy activity, which moves data from a source to a sink. Data transformation activities run compute to reshape data — Mapping Data Flows, a Databricks notebook or jar, a stored procedure, an HDInsight job or an Azure Function. Control flow activities direct the pipeline itself — ForEach, If Condition, Switch, Until, Wait, Lookup, Get Metadata, Set/Append Variable and Execute Pipeline. In an interview it lands better to name one or two from each group than to try to list them all.' },
        { q: 'Is ADF an ETL or an ELT tool?',
          tags: ['ETL', 'ELT', 'Design'],
          a: 'It supports both, but the modern pattern is ELT. In classic ETL you transform data in flight before landing it, which ADF can do with Mapping Data Flows. In ELT — preferred at scale — ADF extracts and loads raw data into the lake or warehouse first, then pushes the transformation down to where the data already lives, typically Databricks or Synapse SQL. ELT wins because it uses the elastic compute of the destination, keeps the raw data available for reprocessing, and avoids moving data twice. So in most designs ADF owns the extract, load and orchestration, and the transform happens downstream.' },
        { q: 'What is the difference between ADF and SSIS?',
          tags: ['Comparison', 'SSIS', 'Migration'],
          a: 'SSIS is the on-prem, server-based ETL tool that ships with SQL Server; ADF is its cloud-native, serverless successor. SSIS runs on a machine you provision and patch, while ADF is fully managed and scales on demand. SSIS transforms data on that box; ADF orchestrates and can push transformation out to Spark or SQL. ADF also brings 100+ cloud connectors, Git and CI/CD integration, and event and tumbling-window triggers out of the box. They are not mutually exclusive — you can lift existing SSIS packages into the cloud by running them on the Azure-SSIS Integration Runtime, which is a very common migration step.' },
        { q: 'How do ADF and Azure Databricks relate — when do you use each?',
          tags: ['Comparison', 'Databricks', 'Orchestration'],
          a: 'They are complementary, not competing. ADF is the orchestrator and connector layer — it schedules, moves data with 100+ connectors, handles retries and monitoring, and triggers other services. Databricks is the transformation engine — a Spark platform for heavy, code-based data engineering and ML. The standard architecture is that ADF lands raw data in the lake and then calls Databricks notebooks or jobs to do the actual Spark transformation, passing parameters in. ADF’s own Mapping Data Flows can transform too, but for complex logic, large volumes, or anything the team wants expressed in code, the transformation goes to Databricks while ADF stays the control plane.' },
        { q: 'What is the difference between ADF and Synapse Pipelines?',
          tags: ['Comparison', 'Synapse', 'Architecture'],
          a: 'Synapse Pipelines are essentially the same pipeline engine as ADF, embedded inside Azure Synapse Analytics — the authoring canvas, activities and Integration Runtimes are nearly identical. The difference is context and scope. Standalone ADF fits when orchestration is your main need and your platform spans many services. Synapse Pipelines fit when you are already all-in on Synapse and want ingestion, Spark, serverless SQL and the warehouse under one workspace and one security model. The caveats: Synapse Pipelines lack a few ADF features such as the SSIS IR and cross-region data flows, and standalone ADF has a broader CI/CD story. Functionally, if you know one you know the other.' },
        { q: 'What is the difference between control flow and data flow in ADF?',
          tags: ['Control Flow', 'Data Flow', 'Core Concept'],
          a: 'Control flow is the orchestration logic of a pipeline — the sequencing, looping and branching between activities: ForEach, If Condition, Until, dependencies, parameters and variables. It decides what runs, in what order and under what conditions, but it does not itself transform row-level data. A data flow — specifically a Mapping Data Flow — is where the actual row-by-row transformation happens: joins, aggregates, derived columns and filters, all compiled to Spark and run on a managed cluster. A clean one-liner for interviews: control flow moves the pipeline along, data flow moves and reshapes the data.' },
      ],
    },
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
          a: 'Synapse is an integrated analytics platform that bundles several engines behind one workspace: a dedicated SQL pool (an MPP data warehouse), serverless SQL (pay-per-query over files already in the lake), Apache Spark pools, and Synapse Pipelines (essentially ADF). In a lakehouse it usually plays the serving/warehouse role — curated Gold data is either loaded into a dedicated pool for fast, concurrent BI, or left in the lake and queried with serverless SQL — and Power BI sits on top. The value is that ingestion, big-data processing, warehousing and serving live in one governed workspace instead of four separate services.' },
        { q: 'What is the difference between a Synapse dedicated SQL pool and a serverless SQL pool?',
          a: 'A dedicated SQL pool is a provisioned MPP warehouse: you pre-buy compute in DWUs, data is physically stored and distributed across 60 nodes, and it delivers fast, highly concurrent queries — but you pay for it whether or not it is running, so it suits stable, heavy BI workloads. Serverless SQL has no infrastructure to manage: it queries Parquet/CSV/Delta files in ADLS on demand and bills per terabyte scanned, which is ideal for ad-hoc exploration, lightweight transforms, or querying the lake without loading it first. Rule of thumb: dedicated for predictable production warehouses, serverless for exploratory or intermittent access where you do not want idle cost.' },
        { q: 'In a Synapse dedicated pool, how do you avoid expensive data movement on a large fact-to-dimension join?',
          a: 'Data movement happens when matching rows for a join live on different distributions and Synapse has to shuffle them across nodes. The fix is choosing distributions deliberately: HASH-distribute the large fact table on the join key so rows that join land on the same distribution, and REPLICATE small dimension tables so a full copy sits on every node and the join stays local. Reserve ROUND_ROBIN for staging/loading where there is no obvious key. Combined with up-to-date statistics and columnstore indexes, co-locating the join key is the single biggest MPP tuning lever.' },
        { q: 'When would you choose Databricks over Synapse (and vice versa)?',
          a: 'They overlap but lean different ways. Databricks is a Spark-first lakehouse — code-centric (PySpark/SQL/Scala), Delta-native, strong for large-scale ETL, streaming, ML and data-science collaboration. Synapse is warehouse-first and T-SQL–centric, with the tightest integration into the Azure/Power BI/BI-analyst world and a familiar SQL surface. Many real architectures use both: Databricks does the heavy medallion ETL and writes Delta/Gold, and Synapse (or Databricks SQL) serves it to Power BI. Pick by team skills and workload — Spark/ML/streaming leans Databricks, SQL-warehouse-and-BI leans Synapse.' },
      ],
    },
    {
      id: 'security',
      label: 'Security & Governance',
      icon: 'shield',
      blurb: 'Keeping the platform secure and compliant: secrets, identity vs permissions, cataloguing, and PII handling — a favourite area for senior-level probing.',
      questions: [
        { q: 'How do you pass credentials securely in ADF and Databricks?',
          a: 'Never hard-code secrets in pipeline JSON, notebooks, or configs. Store them in Azure Key Vault and reference them indirectly: in ADF via a Key Vault linked service so linked-service passwords resolve at runtime, and in Databricks via a Key Vault-backed secret scope read with dbutils.secrets.get(). Better still, avoid stored secrets entirely where you can by authenticating services with a managed identity, so there is no password to leak or rotate. Access to the vault itself is then controlled by RBAC and audited.' },
        { q: 'How does authentication differ from authorization on Azure, and which services provide each?',
          a: 'Authentication answers "who are you" and is handled by Microsoft Entra ID (formerly Azure AD), which issues the identity/token for users, groups, service principals and managed identities. Authorization answers "what are you allowed to do" and is handled by Azure RBAC — role assignments scoped to a subscription, resource group, or resource. On ADLS the two combine: Entra proves identity, RBAC grants coarse storage roles, and POSIX ACLs on directories/files add fine-grained path-level control on top. Keeping the two concepts separate is exactly what interviewers listen for.' },
        { q: 'What is Microsoft Purview and how does it relate to Unity Catalog?',
          a: 'Purview is an estate-wide data governance service: it scans sources across Azure, on-prem and other clouds to build a data map — catalogue, business glossary, automated classification of sensitive data, and end-to-end lineage. Unity Catalog governs inside the Databricks lakehouse specifically, enforcing table/column/row permissions, masking and lineage at query time. They are complementary layers rather than competitors: Purview gives the organisation-wide "what data exists and where did it come from" view, while Unity Catalog is the enforcement point that actually allows or blocks a query in Databricks. Rated PARTIAL in the cross-cloud matrix for that reason.' },
        { q: 'How do you handle PII, data masking and GDPR compliance in a pipeline?',
          a: 'Start by classifying and tagging sensitive columns (Purview or Unity Catalog tags) so you know where PII lives. Apply the least-privilege principle: encrypt at rest and in transit (default on ADLS), restrict access with RBAC/ACLs, and expose sensitive fields through dynamic data masking or column-level masks and row-level security so most consumers never see raw values. For GDPR specifics, keep lineage to prove where personal data flows, support deletion/"right to be forgotten" — which Delta makes feasible via DELETE + VACUUM — and pseudonymise or hash identifiers in lower environments. The theme is: classify, minimise exposure, encrypt, mask, and be able to audit and delete.' },
      ],
    },
    {
      id: 'monitoring',
      label: 'Monitoring & Ops',
      icon: 'sliders',
      blurb: 'How you observe pipelines in production and debug failures — the operational maturity questions.',
      questions: [
        { q: 'Which Azure services do you use to monitor pipelines and inspect logs?',
          a: 'Azure Monitor is the umbrella platform for metrics, alerts and dashboards; Log Analytics is the query store underneath it, where you route diagnostic logs and run KQL queries. For data workloads you send ADF and Databricks diagnostic settings into a Log Analytics workspace, then build alert rules (e.g. on pipeline "Failed" runs or job duration) that notify through Action Groups — email, Teams, SMS, or a webhook. ADF also has its own Monitor tab for per-run/per-activity status, and Databricks surfaces the Spark UI and job run history for job-level detail.' },
        { q: 'A production job fails intermittently — what is your approach to monitor and debug it?',
          a: 'First make failures observable: ensure diagnostic logs flow to Log Analytics and that an alert fires on failure so you are not finding out from users. When one fires, reproduce the timeline from the run history — which activity/stage failed, with what error — and pull the detailed logs (ADF activity output, or the Spark UI / driver+executor logs in Databricks) to find the root cause. Classify it: data issue (bad/late/skewed input), resource issue (OOM, under-sized cluster), or transient (throttling, a flaky dependency). Then fix at the right layer — add data-quality checks and retries for data/transient problems, right-size or tune compute for resource problems — rather than just re-running blind.' },
      ],
    },
    {
      id: 'scenario',
      label: 'Scenario & System Design',
      icon: 'git-branch',
      blurb: 'End-to-end pipeline design prompts — the whiteboard questions where you show you can wire the Azure services together.',
      questions: [
        { q: 'Design a real-time pipeline: on-prem SQL Server → ADLS → Databricks → Power BI, with email alerts on failure.',
          a: 'Capture changes at the source with CDC (SQL Server change tracking / CDC, or a tool like Debezium) rather than re-reading whole tables, and land the change events into ADLS Gen2 as a Bronze layer — either through Event Hubs for a truly streaming feed or an ADF/SHIR pull for micro-batch. Databricks then processes it with the medallion pattern: Structured Streaming or Auto Loader ingests Bronze, cleans and de-dupes into Silver Delta tables, and aggregates business metrics into Gold. Power BI connects to a Databricks SQL warehouse (or Synapse) over the Gold tables, using DirectQuery or short refreshes so the dashboard reflects new data quickly. For reliability, orchestrate with Databricks Workflows or ADF, add data-quality expectations (DLT) between layers, and wire failure paths to an alert — an Azure Monitor rule or Logic App — that emails the on-call. Call out the trade-off explicitly: true streaming (Event Hubs + Structured Streaming) for seconds-level latency, micro-batch (ADF + scheduled jobs) when a few minutes is acceptable and simpler to run.' },
        { q: 'Design a pipeline that pulls from an API every 5 minutes into ADLS, then builds Bronze/Silver/Gold Delta tables, with email on failure.',
          a: 'A scheduled trigger (ADF or Databricks Workflows) fires every 5 minutes and calls the API — a Copy activity or a small notebook — landing the raw JSON into ADLS Gen2 as the Bronze layer, partitioned by ingestion time. A Databricks job (ideally Auto Loader or DLT) then picks up only the new Bronze files, parses/cleans/de-dupes them into Silver Delta tables, and a second step aggregates business metrics into Gold fact tables. Chain the steps as a Workflow so Silver waits on Bronze and Gold on Silver, add DLT expectations for data quality between layers, and rely on checkpoints so each run processes only new data. Wire the job’s failure path to an Azure Monitor alert or Logic App that emails the on-call. Note the trade-off: a 5-minute micro-batch is simpler and cheaper than true streaming and is the right choice unless you genuinely need sub-minute latency.' },
        { q: 'How would you migrate a 1 TB on-prem database (or Spark workload) to Azure?',
          a: 'Split it into a one-time historical load plus ongoing incremental. For the 1 TB history, use ADF with a Self-hosted IR to bulk-copy into ADLS Gen2 — maximising DIU and parallel copy, staging as Parquet/Delta; if the network is the bottleneck, use partitioned parallel copies or physically ship data with Azure Data Box. Then stand up incremental/CDC so daily deltas flow via watermark queries or change tracking rather than reloading everything. If it is a Spark workload moving to Databricks, lift the code onto Databricks clusters, repoint storage to ADLS (abfss / Unity Catalog external locations), convert tables to Delta, and re-tune cluster sizing and partitioning for the new environment. Finally validate with row counts/checksums between source and target, run old and new in parallel for a cutover window, then switch consumers over.' },
      ],
    },
    {
      id: 'cicd',
      label: 'CI/CD & Design Principles',
      icon: 'git-branch',
      blurb: 'Getting code to production safely, and the principles behind a well-designed pipeline — the senior/lead-level questions.',
      questions: [
        { q: 'How do you promote ADF pipelines from Dev to QA/Prod (CI/CD)?',
          a: 'Connect the Dev factory to a Git repo (Azure DevOps or GitHub) so work happens on feature and collaboration branches, never directly in the live service. Publishing generates ARM templates on the adf_publish branch, and a release pipeline deploys those templates to QA and Prod. Environment-specific values — linked-service endpoints, Key Vault URIs, storage accounts — are parameterised and supplied per stage, so the same template promotes cleanly, with approval gates between environments. The point interviewers listen for: no manual editing in higher environments; everything flows through source control and automated deployment.' },
        { q: 'How do you do CI/CD for Databricks notebooks and jobs?',
          a: 'Keep notebooks and code in Git (Databricks Repos integrates directly) and package shared logic as libraries/wheels. A CI pipeline runs unit tests (e.g. pytest over your PySpark logic) and builds the artifact on each pull request; a CD pipeline deploys through the Databricks CLI / REST API or Databricks Asset Bundles, updating job definitions and cluster configs per environment. Secrets come from Key Vault-backed secret scopes, and environment differences (paths, catalog names) are parameterised. So the flow is Git → build/test → deploy jobs — the same discipline as ADF, applied to Spark code.' },
        { q: 'What are the key design principles when designing a data pipeline?',
          a: 'Idempotency first — a rerun produces the same result with no duplicates, so failures are safe to retry. Prefer incremental processing over full reloads to control cost and time. Separate concerns into layers (medallion: raw / clean / curated) so each stage has one responsibility and is independently debuggable. Build in data-quality checks and schema enforcement, and make it observable with logging, lineage and failure alerting. Keep it modular and parameterised so one pipeline serves many tables, and design for scale and cost (right-sized compute, sensible partitioning, auto-termination). In one line: reliable, incremental, layered, observable, and cost-efficient.' },
      ],
    },
  ];

  TV.AzureInterviewQA = TOPICS;
})();
