/* PyRef — PySpark Data */
window.PYREF_PYSPARK = {
  lang:'pyspark', label:'PySpark',
  groups:[
  {
    label:'DataFrame API',
    cats:[
    {
      key:'spark-create', label:'SparkSession & Creation',
      fns:[
      {
        id:'spark-session', name:'SparkSession', purpose:'Entry point to PySpark — create DataFrames, run SQL',
        badge:['pyspark'], snippet:'from pyspark.sql import SparkSession\nspark = SparkSession.builder.getOrCreate()',
        sig:'SparkSession.builder.appName(name).config(key,val).getOrCreate()',
        meta:{ ret:'SparkSession', mut:false, time:'O(1)', space:'O(1)' },
        params:[],
        code:
`from pyspark.sql import SparkSession
from pyspark.sql import functions as F

spark = SparkSession.builder \\
    .appName("MyJob") \\
    .config("spark.sql.shuffle.partitions", "200") \\
    .getOrCreate()

# Read data
df = spark.read.csv("orders.csv", header=True, inferSchema=True)
df = spark.read.parquet("s3://bucket/orders/")
df = spark.read.table("my_catalog.schema.orders")

# Basic info
df.printSchema()           # column names + types
df.count()                 # triggers action, returns row count
df.show(5, truncate=False) # display first 5 rows`,
        related:['df.read','df.write','spark.sql()'],
        tags:['pyspark','session','entry point'],
        interview:[
          'SparkSession is a singleton — getOrCreate() returns existing session if one exists',
          'spark.sql.shuffle.partitions defaults to 200 — tune for your cluster and data size',
          'Databricks: spark is pre-configured; no need to create SparkSession',
        ],
        mistakes:['Calling df.count() frequently — it triggers a full scan. Cache first if used multiple times.'],
        notes:['SparkSession replaced SparkContext + SQLContext in Spark 2.0. Both are still accessible as spark.sparkContext.']
      },
      ]
    },
    {
      key:'spark-transform', label:'Transformations',
      fns:[
      {
        id:'spark-select', name:'select() / withColumn()', purpose:'Choose or compute columns in a DataFrame',
        badge:['pyspark'], snippet:'df.select("col1", F.col("col2") * 2)',
        sig:'df.select(*cols)   df.withColumn(name, col_expr)',
        meta:{ ret:'DataFrame (lazy)', mut:false, time:'O(1) — lazy', space:'O(1) plan only' },
        params:[
          { name:'*cols (select)', type:'str | Column', req:true, desc:'Column names or Column expressions to include.' },
          { name:'name (withColumn)', type:'str', req:true, desc:'New or existing column name.' }
        ],
        code:
`from pyspark.sql import functions as F

df = spark.table("orders")  # 500M rows

# Select columns
df.select("order_id","customer_id","amount")

# Expressions
df.select(
    F.col("amount"),
    (F.col("amount") * 1.1).alias("amount_with_tax"),
    F.upper("status").alias("status_upper")
)

# Add / replace a column
df.withColumn("year", F.year("order_date")) \\
  .withColumn("amount_usd", F.col("amount") / 100)

# Drop a column
df.drop("internal_id", "debug_flag")`,
        related:['df.filter()','df.groupBy()','F.col()'],
        tags:['pyspark','select','columns','lazy'],
        interview:[
          'All transformations are lazy — Spark builds a DAG; only actions trigger computation',
          'withColumn creates a new DataFrame — chain multiple for multiple columns',
          'For many columns, withColumns() (Spark 3.3+) is more efficient than chained withColumn()',
        ],
        mistakes:['Avoid chaining many withColumn() calls in a loop — use select() with a list of expressions for 10+ columns.'],
        notes:['df.select(F.col("*"), new_col) — F.col("*") expands all columns, then adds new_col.']
      },
      {
        id:'spark-filter', name:'filter() / where()', purpose:'Filter rows based on a condition',
        badge:['pyspark'], snippet:'df.filter(F.col("amount") > 1000)',
        sig:'df.filter(condition)   df.where(condition)   — identical',
        meta:{ ret:'DataFrame (lazy)', mut:false, time:'O(1) — lazy, O(n) at execution', space:'O(1)' },
        params:[{ name:'condition', type:'Column | str', req:true, desc:'Boolean column expression or SQL string.' }],
        code:
`from pyspark.sql import functions as F

df = spark.table("orders")

# Column expression
df.filter(F.col("amount") > 1000)
df.filter(F.col("status") == "COMPLETED")

# Multiple conditions
df.filter(
    (F.col("amount") > 100) &
    (F.col("status").isin("COMPLETED","SHIPPED"))
)

# SQL string
df.filter("amount > 100 AND status = 'COMPLETED'")

# Null handling
df.filter(F.col("amount").isNotNull())
df.filter(F.col("customer_id").isNull())

# After filter, count how many passed
df.filter(F.col("amount") > 1000).count()`,
        related:['df.select()','df.groupBy()','df.distinct()'],
        tags:['pyspark','filter','where','SQL'],
        interview:[
          'filter() and where() are identical — alias for SQL familiarity',
          'Avoid using Python operators == and != on columns — use F.col("c") == val',
          'Push filter predicates early in the pipeline — Catalyst optimizer often does this, but explicit is better',
        ],
        mistakes:["df.filter(df.col == None) doesn't work — None != null. Use .isNull()/.isNotNull()."],
        notes:['Spark\'s Catalyst optimizer pushes filters down to data source when using Parquet/Delta — predicate pushdown.']
      },
      {
        id:'spark-groupby', name:'groupBy() / agg()', purpose:'Group rows and apply aggregate functions',
        badge:['pyspark'], snippet:'df.groupBy("dept").agg(F.sum("amount").alias("total"))',
        sig:'df.groupBy(*cols).agg(*exprs)',
        meta:{ ret:'DataFrame (lazy)', mut:false, time:'O(n log n) — shuffle', space:'O(k) — k groups' },
        params:[
          { name:'*cols', type:'str | Column', req:true, desc:'Columns to group by.' },
          { name:'*exprs', type:'Column', req:true, desc:'Aggregate expressions. Can mix functions.' }
        ],
        code:
`from pyspark.sql import functions as F

df = spark.table("orders")  # 500M rows, cols: order_id, customer_id, amount, status, date

# Basic aggregation
df.groupBy("status").count()

# Multiple aggregations
df.groupBy("customer_id").agg(
    F.count("*").alias("num_orders"),
    F.sum("amount").alias("total_spend"),
    F.avg("amount").alias("avg_order"),
    F.max("date").alias("last_order_date")
)

# Group by multiple columns
df.groupBy("year", "month") \\
  .agg(F.sum("amount").alias("monthly_revenue")) \\
  .orderBy("year","month")`,
        related:['df.select()','df.window()','df.pivot()'],
        tags:['pyspark','groupBy','aggregation','SQL GROUP BY'],
        interview:[
          'groupBy triggers a shuffle — one of the most expensive Spark operations',
          'Use F.count("*") to count all rows including nulls; F.count("col") excludes nulls',
          'approx_count_distinct() is faster than countDistinct() for large cardinality',
        ],
        mistakes:['Grouping by high-cardinality columns (e.g. user_id) causes data skew if values are uneven.'],
        notes:['AQE (Adaptive Query Execution) can auto-coalesce shuffle partitions in Spark 3.0+.']
      },
      {
        id:'spark-join', name:'join()', purpose:'Joins two DataFrames on a key',
        badge:['pyspark'], snippet:'df1.join(df2, on="customer_id", how="left")',
        sig:'df.join(other, on=None, how="inner")',
        meta:{ ret:'DataFrame (lazy)', mut:false, time:'O(n log n) sort-merge, O(n) broadcast', space:'O(n)' },
        params:[
          { name:'other', type:'DataFrame', req:true, desc:'Right DataFrame.' },
          { name:'on', type:'str | list | Column', req:true, desc:'Join key column(s).' },
          { name:'how', type:'"inner"|"left"|"right"|"outer"|"semi"|"anti"', default:'"inner"', desc:'Join type.' }
        ],
        code:
`orders    = spark.table("orders")    # 500M rows
customers = spark.table("customers") # 2M rows

# Inner join
orders.join(customers, on="customer_id")

# Left join
orders.join(customers, on="customer_id", how="left")

# Broadcast join — broadcast small table to avoid shuffle
from pyspark.sql.functions import broadcast
orders.join(broadcast(customers), on="customer_id")

# Semi join — keep orders that have a matching customer
orders.join(customers, on="customer_id", how="left_semi")

# Anti join — keep orders with NO matching customer
orders.join(customers, on="customer_id", how="left_anti")`,
        related:['F.broadcast()','df.groupBy()','spark.sql()'],
        tags:['pyspark','join','SQL JOIN','broadcast'],
        interview:[
          'Broadcast join: if one table < ~10MB, broadcast it to avoid shuffle. Auto with spark.sql.autoBroadcastJoinThreshold.',
          'Sort-Merge Join (default for large tables): both sides sorted and merged — O(n log n) shuffle',
          'left_semi is like EXISTS in SQL; left_anti is like NOT EXISTS',
          'Skewed joins: use salting technique or Spark 3 AQE skew join handling',
        ],
        mistakes:['Joining on nullable columns: nulls never match (NULL != NULL) — filter them out before joining if needed.'],
        notes:['Check join type in the physical plan: spark.sql("...").explain() shows SortMergeJoin vs BroadcastHashJoin.']
      },
      {
        id:'spark-window', name:'Window Functions', purpose:'Compute values over a sliding window of rows (rank, lag, running totals)',
        badge:['pyspark'], snippet:'from pyspark.sql.window import Window\nw = Window.partitionBy("dept").orderBy("salary")',
        sig:'Window.partitionBy(*cols).orderBy(*cols).rowsBetween(...)',
        meta:{ ret:'Column expression', mut:false, time:'O(n log n) — sort within partition', space:'O(partition size)' },
        params:[],
        code:
`from pyspark.sql import functions as F
from pyspark.sql.window import Window

df = spark.table("orders")

# Rank within each customer
w = Window.partitionBy("customer_id").orderBy(F.desc("amount"))
df.withColumn("rank", F.rank().over(w)) \\
  .withColumn("dense_rank", F.dense_rank().over(w))

# Running total
w_running = Window.partitionBy("customer_id") \\
                  .orderBy("order_date") \\
                  .rowsBetween(Window.unboundedPreceding, Window.currentRow)
df.withColumn("cumulative_spend", F.sum("amount").over(w_running))

# Lag / Lead (previous / next row's value)
w_order = Window.partitionBy("customer_id").orderBy("order_date")
df.withColumn("prev_amount", F.lag("amount", 1).over(w_order)) \\
  .withColumn("next_amount", F.lead("amount", 1).over(w_order))`,
        related:['df.groupBy()','F.rank()','F.lag()','F.lead()'],
        tags:['pyspark','window functions','rank','lag','running total'],
        interview:[
          'rank() has gaps for ties (1,1,3); dense_rank() has no gaps (1,1,2); row_number() always unique',
          'rowsBetween vs rangeBetween: rows uses physical row offsets; range uses value ranges',
          'Partitioning is critical — windowBy without partitionBy operates on the entire dataset (one partition)',
        ],
        mistakes:['Window functions without partitionBy cause a single shuffle partition — OOM for large data.'],
        notes:['Window functions in Spark correspond directly to SQL OVER (PARTITION BY ... ORDER BY ...) clauses.']
      },
      ]
    },
    {
      key:'spark-io', label:'Read & Write',
      fns:[
      {
        id:'spark-read-write', name:'read / write', purpose:'Load and save DataFrames in various formats',
        badge:['pyspark'], snippet:'df.write.format("delta").mode("overwrite").save(path)',
        sig:'spark.read.format(fmt).option(k,v).load(path)   df.write.format(fmt).mode(m).save(path)',
        meta:{ ret:'DataFrame / None', mut:false, time:'O(n) — I/O bound', space:'O(n)' },
        params:[
          { name:'format', type:'str', req:true, desc:'"parquet","delta","csv","json","orc","avro"' },
          { name:'mode', type:'str', default:'"error"', desc:'"overwrite","append","ignore","error"' }
        ],
        code:
`# Read
df = spark.read.parquet("s3://bucket/orders/")
df = spark.read.format("delta").load("/mnt/delta/orders")
df = spark.read.csv("/path/data.csv", header=True, inferSchema=True)
df = spark.read.table("catalog.schema.orders")

# Write
df.write.parquet("/mnt/parquet/orders/")
df.write.format("delta").mode("overwrite").save("/mnt/delta/orders")
df.write.format("delta").mode("append").partitionBy("year","month") \\
   .save("/mnt/delta/orders")

# Save as table
df.write.format("delta").saveAsTable("my_catalog.schema.orders")`,
        related:['spark.sql()','df.cache()','DeltaTable'],
        tags:['pyspark','I/O','Delta Lake','parquet'],
        interview:[
          'Parquet is columnar — efficient for analytical reads of specific columns',
          'Delta Lake adds ACID transactions, time travel, and MERGE on top of Parquet',
          'partitionBy() in write creates directory partitions — improves filter pushdown on those columns',
        ],
        mistakes:['mode("overwrite") with partitionBy only overwrites matching partitions if you use dynamic partition overwrite config.'],
        notes:['Delta format recommended over plain Parquet on Databricks — adds Z-ordering, liquid clustering, CDC support.']
      },
      ]
    },
    ]
  }
  ]
};
