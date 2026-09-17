/* ============================================================
   Cloud DE Visualizer — Azure interview questions, topic-wise.
   Sourced from the uploaded mock-interview transcripts, de-duped
   and given tight, interview-recall model answers. Consumed by
   js/modules/_interview-qa.js.

   Shape: [ { id, label, icon?, blurb?, questions:[ { q, a } ] } ]

   Build progress (10 Q&A / iteration):
     Iter 1  — adf-ir (7) + adf-pipeline (3)            ✅
     Iter 2  — adf-pipeline (+4) + storage (5) + synapse (1)
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
      ],
    },
  ];

  TV.AzureInterviewQA = TOPICS;
})();
