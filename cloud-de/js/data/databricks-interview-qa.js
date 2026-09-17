/* ============================================================
   Cloud DE Visualizer — Databricks interview questions, topic-wise.
   Sourced from the uploaded mock-interview transcripts, de-duped
   and given tight, interview-recall model answers. Consumed by
   js/modules/_interview-qa.js.

   Shape: [ { id, label, icon?, blurb?, questions:[ { q, a } ] } ]

   Build progress (10 Q&A / iteration):
     Iter 5  — spark-arch (10)                          ✅
     Iter 6  — transformations (6) + joins (4)          ✅ (transformations 6, joins started)
     Iter 7  — joins (+5)                               ✅ (joins 9)
     Later   — partitioning, memory/OOM, caching, delta, file-formats,
               streaming, optimization, unity/DBU/workflows, pyspark-coding
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  const TOPICS = [
    {
      id: 'spark-arch',
      label: 'Spark Architecture & Basics',
      icon: 'cpu',
      blurb: 'The foundation every Databricks/Spark interview starts from: how a Spark application is structured and executed, and the core abstractions.',
      questions: [
        { q: 'Explain the Spark architecture (driver, executors, cluster manager).',
          a: 'A Spark application has one driver and many executors, coordinated by a cluster manager. The driver runs your main program, hosts the SparkSession, builds the logical plan/DAG, and schedules work. The cluster manager (YARN, Kubernetes, standalone, or Databricks’ own) allocates worker resources and launches executors. Executors are JVM processes on worker nodes that actually run tasks over partitions and hold cached data in memory. The driver splits each job into stages at shuffle boundaries and each stage into tasks (one per partition), ships tasks to executors, and gathers results. Knowing driver-vs-executor matters: driver-side work like collect() can OOM the driver, while transformations run distributed on the executors.' },
        { q: 'What is the difference between RDD, DataFrame and Dataset — and why doesn’t Dataset work in Python?',
          a: 'RDD is the low-level distributed collection: type-safe and functional but unoptimised, because Spark can’t see inside your lambdas. DataFrame is a distributed table of named columns that goes through the Catalyst optimizer and Tungsten execution, so it is far faster and is the default for most work. Dataset adds compile-time type safety on top of those optimisations — but only in JVM languages (Scala/Java). It doesn’t exist in Python because Python is dynamically typed, so there is no compile-time type to enforce; in PySpark a "Dataset" is just a DataFrame of Rows. Use DataFrames by default and drop to RDDs only when you need low-level control.' },
        { q: 'What is the difference between transformations and actions, and why is Spark lazy?',
          a: 'Transformations (map, filter, join, groupBy, select) define a new dataset from an existing one but don’t execute — they just extend the DAG. Actions (count, collect, show, write, take) trigger execution. Spark is lazy: it waits until an action to build and optimise the whole plan, which lets Catalyst reorder filters, prune columns, and fuse narrow steps into a single stage instead of materialising every intermediate. The practical consequence: nothing runs until you call an action, so chaining many transformations costs nothing until then.' },
        { q: 'What is a DAG and how is it built?',
          a: 'The DAG (Directed Acyclic Graph) is Spark’s logical plan of all transformations leading up to an action — nodes are datasets, edges are operations. When an action fires, the DAG scheduler splits the graph into stages at shuffle (wide-dependency) boundaries, and each stage becomes a set of tasks that run without a shuffle. It is acyclic because data flows forward with no loops. The DAG is what enables both optimisation and fault recovery — Spark can rebuild a lost partition by replaying its lineage.' },
        { q: 'What are partitions, how are they created, and how many for a 100 MB file?',
          a: 'A partition is the unit of parallelism — a chunk of data that one task processes on one core. On read, Spark splits files by block size: with the common 128 MB default a 100 MB file is a single partition, while a 300 MB file is about three. For shuffles, the count is governed by spark.sql.shuffle.partitions (default 200). Too few partitions underutilise the cluster and risk OOM/skew; too many create scheduling overhead and tiny tasks — so matching partition count to data size and core count is a core tuning lever.' },
        { q: 'What is the difference between client mode and cluster mode?',
          a: 'The difference is where the driver runs. In client mode the driver runs on the machine that submitted the job (an edge node or your notebook), which is convenient for interactive work but means the submitting machine must stay connected for the whole job. In cluster mode the driver runs inside the cluster on a worker node managed by the cluster manager, which is more robust for production and long-running jobs because it doesn’t depend on the client staying up. Log access and networking differ accordingly.' },
        { q: 'How does Spark handle failures? Is there a concept of partial upload?',
          a: 'Spark is fault-tolerant through lineage: because any partition can be recomputed from its parent transformations in the DAG, when an executor or task dies the scheduler simply re-runs the lost tasks on another executor, retrying up to spark.task.maxFailures. There is no "partial upload" to resume — a failed task is recomputed from scratch, not continued. For writes, use atomic/idempotent sinks (Delta commits are atomic) so a retried or failed job never leaves half-written, duplicated data.' },
        { q: 'How does the Catalyst optimizer work internally?',
          a: 'Catalyst is Spark SQL’s optimiser. It parses your DataFrame/SQL into an unresolved logical plan, resolves it against the catalog, applies rule-based optimisations (predicate pushdown, column pruning, constant folding, filter reordering), then uses cost-based optimisation to generate several physical plans and pick the cheapest. Tungsten then performs whole-stage code generation to run it efficiently on the JVM. The takeaway: DataFrames are fast precisely because Catalyst can see and rewrite the plan — something it cannot do for opaque RDD lambdas.' },
        { q: 'How does in-memory computation differ from MapReduce?',
          a: 'MapReduce writes intermediate results to disk (HDFS) between every map and reduce step, so iterative or multi-stage jobs pay heavy disk I/O. Spark keeps intermediate data in memory across stages and only spills to disk when it must, so multi-step and iterative workloads (joins, ML) run far faster. Spark also offers a richer API — DataFrames, SQL, streaming — and DAG-based execution instead of rigid map-then-reduce. That in-memory model is the main reason Spark largely displaced MapReduce.' },
        { q: 'What is the role of YARN, and what other resource managers are there?',
          a: 'The cluster manager allocates CPU/memory across the cluster and launches executors per application. YARN is Hadoop’s resource manager and the classic on-prem choice; alternatives are Spark standalone, Kubernetes, Mesos (legacy), and on Databricks a managed cluster manager. It sits between the driver and the physical nodes: the driver requests resources, the manager grants containers, and executors start inside them. On Databricks you don’t manage YARN yourself — the platform provisions clusters — but the concept (something schedules executors onto nodes) is identical.' },
      ],
    },
    {
      id: 'transformations',
      label: 'Transformations & Shuffle',
      icon: 'activity',
      blurb: 'Narrow vs wide transformations and the shuffle — the mental model behind almost every Spark optimisation question.',
      questions: [
        { q: 'Define narrow vs wide transformations, with examples.',
          a: 'A narrow transformation (map, filter, union, select) computes each output partition from a single input partition, so no data moves across the network and Spark pipelines these within one stage. A wide transformation (groupBy, join, reduceByKey, distinct, repartition) needs data from many input partitions to build each output partition, which forces a shuffle and a new stage. Narrow is cheap and local; wide is expensive because of the shuffle. Knowing which operations shuffle is the foundation of Spark tuning.' },
        { q: 'What is a shuffle and why is it expensive?',
          a: 'A shuffle is the redistribution of data across partitions and executors so that rows sharing a key end up together — required by wide transformations like joins and groupBy. It is expensive because it writes intermediate data to disk, serialises it, sends it over the network, and re-reads it on the other side, all far slower than in-memory compute. Shuffles are also where skew and OOM tend to bite. That is why most optimisation — broadcast joins, pre-partitioning, reducing wide ops — aims to minimise shuffle.' },
        { q: 'How many stages does a single wide transformation introduce?',
          a: 'Each wide transformation (each shuffle boundary) adds one stage. So a job with one wide transformation such as reduceByKey has two stages: everything before the shuffle is stage 1 and everything after it is stage 2. In general, number of stages is roughly number of shuffles + 1. You can confirm this in the Spark UI, where stage boundaries line up exactly with shuffles.' },
        { q: 'What is the difference between reduceByKey and groupByKey?',
          a: 'Both group values by key, but reduceByKey combines values locally on each partition (a map-side combine) before the shuffle, so far less data crosses the network. groupByKey shuffles all the raw values first and combines afterwards, moving much more data and being far more likely to OOM on a hot key. So for aggregations prefer reduceByKey / aggregateByKey — or the DataFrame groupBy().agg(), which Catalyst optimises similarly — over groupByKey.' },
        { q: 'What is the difference between map, flatMap and mapPartitions?',
          a: 'map applies a function to each element and produces exactly one output per input. flatMap applies a function that can return zero or many elements and flattens the result — used for things like splitting lines into words. mapPartitions runs the function once per partition (given an iterator over its rows) rather than once per row, which is more efficient when there is per-partition setup cost such as opening a DB connection. All three are narrow transformations.' },
        { q: 'What is predicate pushdown (and column pruning)?',
          a: 'Predicate pushdown means Spark pushes filter conditions down to the data source so less data is read in the first place. With columnar formats like Parquet/ORC and Delta, Spark skips whole row groups/files using min-max statistics; against a database source it sends the WHERE clause to the DB. Column pruning is the sibling optimisation — reading only the columns you actually select. Catalyst applies both automatically, and they are a big reason Parquet + Spark is fast; you help by filtering early and partitioning sensibly.' },
      ],
    },
    {
      id: 'joins',
      label: 'Joins & Skew',
      icon: 'git-branch',
      blurb: 'Join strategies, when Spark picks each, and how you tame the two things that wreck joins — shuffle and skew.',
      questions: [
        { q: 'What join strategies does Spark have?',
          a: 'Broadcast Hash Join ships a small table to every executor so the join is local with no shuffle — the fastest when one side is small. Shuffle Sort-Merge Join is the default for two large tables: both sides are shuffled on the key, sorted, and merged. Shuffle Hash Join shuffles then builds a hash table on one side (used when a side is smallish but not broadcastable and sorting is undesirable). Broadcast Nested Loop / Cartesian is the fallback for non-equi and cross joins and is very expensive. With AQE, Spark picks the strategy from runtime size estimates.' },
        { q: 'When do you use a broadcast join, what is the threshold, and how do you enable/disable it?',
          a: 'Use a broadcast join when one side is small enough to fit in each executor’s memory — Spark auto-broadcasts tables under spark.sql.autoBroadcastJoinThreshold (default 10 MB). You can force it with broadcast(df) or the /*+ BROADCAST */ hint, or disable auto-broadcast by setting the threshold to -1. The benefit is avoiding a shuffle of the big table; the danger is broadcasting something too large, which OOMs the executors (or the driver that first collects it) — so reserve it for genuinely small dimension tables.' },
        { q: 'What is the difference between a shuffle hash join and a sort-merge join?',
          a: 'Both shuffle both sides on the join key. Sort-merge join then sorts each partition and merges them — robust for very large data and the default. Shuffle hash join instead builds an in-memory hash table from one side and probes it with the other, skipping the sort; it can be faster when one side is much smaller but still too big to broadcast, provided that side fits in memory. Sort-merge is preferred at large scale because it doesn’t require holding a whole side in memory.' },
        { q: 'Both tables are large so broadcast is impossible — how do you optimise the join?',
          a: 'Reduce the shuffle and the skew. Filter and aggregate each side before the join to shrink it, and select only the columns you need. Pre-partition or bucket both tables on the join key so matching rows are co-located and the shuffle is cheaper (or avoided on repeated joins). Handle skew with salting or AQE skew-join handling, ensure enough shuffle partitions, and enable AQE so Spark can coalesce and adapt at runtime. In short: shrink the data, co-locate on the key, and deal with skew.' },
        { q: 'What is data skew in a join, and how does salting fix it?',
          a: 'Skew is when a few keys hold a disproportionate share of rows, so one or two tasks do most of the work while the rest finish early — the classic "one partition holding 90% of the data", causing long tails and OOM. Salting fixes it by appending a random suffix (0..N) to the hot key on the large side and exploding the small side to match all salt values, spreading the hot key across N partitions. AQE in Spark 3 can also split skewed partitions automatically. The interviewer wants: spot skew in the Spark UI (one very long task), then salt or enable AQE skew join.' },
        { q: 'What is a broadcast variable, and how is it different from a broadcast join?',
          a: 'A broadcast variable is a general Spark feature: you broadcast a read-only value — a lookup map, config, or small dataset — to every executor once, so tasks reuse it instead of shipping it with each task. A broadcast join is the specific case where Spark broadcasts a small table to perform a join without shuffling the big one. Same underlying idea (send data once to all executors), different scope: one is a manual API for any value, the other an automatic join strategy.' },
        { q: 'What is Adaptive Query Execution (AQE) and how does it help joins?',
          a: 'AQE (Spark 3+) re-optimises the plan at runtime using actual shuffle statistics instead of only compile-time estimates. It does three main things: coalesces small shuffle partitions to avoid tiny tasks, converts a sort-merge join to a broadcast join when a side turns out small enough, and splits skewed partitions to balance the load. Enable it with spark.sql.adaptive.enabled=true (on by default in recent and Databricks runtimes). It is a go-to answer for "how do you optimise" because it fixes partition sizing and skew automatically.' },
        { q: 'What is liquid clustering and how does it help joins?',
          a: 'Liquid clustering is a newer Delta/Databricks feature that replaces static partitioning and Z-ordering with a flexible clustering scheme: you declare clustering keys and Databricks organises the data files by them, so queries and joins that filter on those keys read far less data. Unlike hive-style partitioning it avoids the small-file and over-partitioning problems and lets you change keys without rewriting the table. It helps joins and filters by improving data skipping on the clustered columns.' },
        { q: 'What is the output of an inner join vs a left join, and how do row counts behave with duplicate keys?',
          a: 'An inner join returns only rows whose key exists in both tables; a left join returns every row from the left table plus matched right rows, with nulls where there is no match. Row counts multiply on duplicate keys: if a key appears twice on the left and three times on the right, an inner join emits 2×3 = 6 rows for that key. So a join can increase the row count — a common gotcha interviewers check by handing you small sample tables and asking for the exact output.' },
      ],
    },
  ];

  TV.DatabricksInterviewQA = TOPICS;
})();
