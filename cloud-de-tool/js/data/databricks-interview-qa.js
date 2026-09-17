/* ============================================================
   Cloud DE Visualizer — Databricks interview questions, topic-wise.
   Sourced from the uploaded mock-interview transcripts, de-duped
   and given tight, interview-recall model answers. Consumed by
   js/modules/_interview-qa.js.

   Shape: [ { id, label, icon?, blurb?, questions:[ { q, a } ] } ]

   Build progress (10 Q&A / iteration): topics populated from
   Iteration 5 onward (Spark architecture, transformations, joins,
   partitioning, memory/OOM, caching, Delta Lake, file formats,
   streaming, optimization, Unity Catalog / DBU / workflows,
   PySpark coding). Empty until then.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  const TOPICS = [];

  TV.DatabricksInterviewQA = TOPICS;
})();
