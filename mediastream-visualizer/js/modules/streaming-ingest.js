(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'Kafka Source',
      desc: 'MediaStream clickstream: 2.4B events/day from 42 regions',
      detail: 'Kafka topic ms-clickstream-events carries user interaction events — play, pause, seek, quality-change — at 27,778 events/second peak. Each message is a JSON payload ~420 bytes.',
    },
    {
      label: 'Structured Streaming',
      desc: 'Spark Structured Streaming reads Kafka as an unbounded table',
      detail: 'readStream.format("kafka") creates a streaming DataFrame. Each micro-batch reads a range of Kafka offsets and processes them atomically. The schema is inferred from the JSON value field.',
    },
    {
      label: 'Bronze Write',
      desc: 'Raw events land in Delta Bronze — exactly-once via WAL',
      detail: 'Delta\'s Write-Ahead Log enables exactly-once semantics. Spark checkpoints the last committed Kafka offset in HDFS/S3. On restart, it replays only un-committed offsets — no duplicates.',
    },
    {
      label: 'Checkpointing',
      desc: 'Checkpoint directory stores streaming state durably',
      detail: 'The checkpoint path stores: (1) last committed offsets per Kafka partition, (2) streaming query metadata, (3) WAL of pending micro-batches. Recovery replays from the last committed offset.',
    },
    {
      label: 'Trigger Policies',
      desc: 'Three trigger modes for different latency requirements',
      detail: 'ProcessingTime("1 minute") for Bronze ingestion. AvailableNow() for Silver transformations scheduled by Airflow. Continuous("100ms") for near-real-time alerting on fraud detection.',
    },
    {
      label: 'Exactly-Once',
      desc: 'Delta + Kafka offset tracking guarantees no data loss or duplication',
      detail: 'The guarantee: if Kafka has offsets 100–200, Delta will contain exactly those events after recovery from any failure — no duplicates from retries, no gaps from lost writes.',
    },
    {
      label: 'Bronze Schema',
      desc: 'Raw Bronze table: minimal transformation, all fields preserved',
      detail: 'Bronze retains every raw field plus ingestion metadata: _kafka_offset, _kafka_partition, _ingest_ts. Schema enforcement is relaxed (mergeSchema=true) to accommodate producer changes.',
    },
  ];

  let _engine = null;

  const DIAGRAMS = [
    // Step 0: Kafka Source
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <defs>
        <linearGradient id="si-g0" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ef4444"/>
          <stop offset="100%" stop-color="#f97316"/>
        </linearGradient>
      </defs>
      <rect x="15" y="15" width="450" height="35" rx="4" fill="url(#si-g0)"/>
      <text x="240" y="37" text-anchor="middle" fill="white" font-weight="bold" font-size="13">Kafka Topic: ms-clickstream-events</text>
      <!-- Partitions -->
      <text x="240" y="68" text-anchor="middle" fill="#94a3b8" font-size="10">12 partitions × 42 regions = 504 total partitions</text>
      <rect x="20" y="76" width="85" height="50" rx="3" fill="#1e293b" stroke="#ef4444"/>
      <text x="62" y="94" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="bold">P-0  us-east</text>
      <text x="62" y="108" text-anchor="middle" fill="#64748b" font-size="8">offset 9,241,883</text>
      <text x="62" y="120" text-anchor="middle" fill="#94a3b8" font-size="8">8,400 msg/s</text>
      <rect x="112" y="76" width="85" height="50" rx="3" fill="#1e293b" stroke="#f97316"/>
      <text x="154" y="94" text-anchor="middle" fill="#f97316" font-size="9" font-weight="bold">P-1  us-west</text>
      <text x="154" y="108" text-anchor="middle" fill="#64748b" font-size="8">offset 7,892,441</text>
      <text x="154" y="120" text-anchor="middle" fill="#94a3b8" font-size="8">6,200 msg/s</text>
      <rect x="204" y="76" width="85" height="50" rx="3" fill="#1e293b" stroke="#fbbf24"/>
      <text x="246" y="94" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">P-2  eu-west</text>
      <text x="246" y="108" text-anchor="middle" fill="#64748b" font-size="8">offset 6,103,221</text>
      <text x="246" y="120" text-anchor="middle" fill="#94a3b8" font-size="8">5,100 msg/s</text>
      <rect x="296" y="76" width="85" height="50" rx="3" fill="#1e293b" stroke="#a855f7"/>
      <text x="338" y="94" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">P-3  ap-south</text>
      <text x="338" y="108" text-anchor="middle" fill="#64748b" font-size="8">offset 4,871,009</text>
      <text x="338" y="120" text-anchor="middle" fill="#94a3b8" font-size="8">4,900 msg/s</text>
      <text x="395" y="100" fill="#64748b" font-size="10">…</text>
      <text x="430" y="100" fill="#64748b" font-size="9">+38</text>
      <!-- Event payload -->
      <rect x="20" y="145" width="440" height="120" rx="4" fill="#0f172a" stroke="#334155"/>
      <text x="40" y="163" fill="#64748b" font-size="9">Sample message — partition 0, offset 9241883:</text>
      <text x="40" y="178" fill="#a855f7" font-size="10">{"user_id": "u_84729201", "event_type": "play",</text>
      <text x="40" y="192" fill="#a855f7" font-size="10"> "content_id": "c_stranger_things_s4e9",</text>
      <text x="40" y="206" fill="#a855f7" font-size="10"> "session_id": "sess_abc123", "region": "us-east-1",</text>
      <text x="40" y="220" fill="#4ade80" font-size="10"> "event_ts": "2024-01-24T14:32:07.441Z",</text>
      <text x="40" y="234" fill="#94a3b8" font-size="10"> "device_type": "smart_tv", "quality_bitrate_kbps": 8000}</text>
      <text x="40" y="253" fill="#64748b" font-size="9">Peak throughput: 27,778 events/s  •  Avg size: 420 bytes  •  Retention: 7 days</text>
    </svg>`,

    // Step 1: Structured Streaming
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Spark Structured Streaming — Kafka as Unbounded Table</text>
      <!-- Code block -->
      <rect x="15" y="35" width="450" height="160" rx="4" fill="#0f172a" stroke="#334155"/>
      <text x="30" y="55" fill="#64748b" font-size="9">bronze_ingest.py — Structured Streaming job</text>
      <text x="30" y="70" fill="#a855f7" font-size="10">from pyspark.sql import SparkSession</text>
      <text x="30" y="84" fill="#a855f7" font-size="10">from pyspark.sql.functions import from_json, col, current_timestamp</text>
      <text x="30" y="98" fill="#64748b" font-size="10"> </text>
      <text x="30" y="112" fill="#38bdf8" font-size="10">df_raw = spark.readStream \</text>
      <text x="30" y="126" fill="#38bdf8" font-size="10">    .format("kafka") \</text>
      <text x="30" y="140" fill="#38bdf8" font-size="10">    .option("kafka.bootstrap.servers", KAFKA_BROKERS) \</text>
      <text x="30" y="154" fill="#38bdf8" font-size="10">    .option("subscribe", "ms-clickstream-events") \</text>
      <text x="30" y="168" fill="#38bdf8" font-size="10">    .option("startingOffsets", "latest") \</text>
      <text x="30" y="182" fill="#38bdf8" font-size="10">    .load()</text>
      <!-- Model diagram -->
      <rect x="15" y="207" width="450" height="78" rx="4" fill="#1e293b" stroke="#38bdf8"/>
      <text x="240" y="224" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="bold">Kafka as Unbounded Streaming Table</text>
      <line x1="15" y1="229" x2="465" y2="229" stroke="#334155"/>
      <!-- "table" columns -->
      <text x="30" y="244" fill="#64748b" font-size="9">key</text>
      <text x="90" y="244" fill="#64748b" font-size="9">value (JSON)</text>
      <text x="230" y="244" fill="#64748b" font-size="9">topic</text>
      <text x="300" y="244" fill="#64748b" font-size="9">partition</text>
      <text x="370" y="244" fill="#64748b" font-size="9">offset</text>
      <text x="430" y="244" fill="#64748b" font-size="9">timestamp</text>
      <line x1="15" y1="248" x2="465" y2="248" stroke="#334155" stroke-dasharray="3,3"/>
      <text x="30" y="262" fill="#94a3b8" font-size="9">u_847…</text>
      <text x="90" y="262" fill="#94a3b8" font-size="9">{user_id,event_type…}</text>
      <text x="230" y="262" fill="#94a3b8" font-size="9">ms-click…</text>
      <text x="300" y="262" fill="#94a3b8" font-size="9">0</text>
      <text x="370" y="262" fill="#94a3b8" font-size="9">9241883</text>
      <text x="430" y="262" fill="#94a3b8" font-size="9">14:32:07</text>
      <text x="30" y="276" fill="#4ade80" font-size="9">new rows…</text>
      <text x="90" y="276" fill="#4ade80" font-size="9">→ continuously appended as micro-batches arrive</text>
    </svg>`,

    // Step 2: Bronze Write
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Delta Bronze Write — Exactly-Once via WAL</text>
      <!-- Code -->
      <rect x="15" y="35" width="450" height="110" rx="4" fill="#0f172a" stroke="#334155"/>
      <text x="30" y="53" fill="#64748b" font-size="9">Write stream to Delta Bronze:</text>
      <text x="30" y="67" fill="#4ade80" font-size="10">query = df_parsed.writeStream \</text>
      <text x="30" y="81" fill="#4ade80" font-size="10">    .format("delta") \</text>
      <text x="30" y="95" fill="#4ade80" font-size="10">    .outputMode("append") \</text>
      <text x="30" y="109" fill="#4ade80" font-size="10">    .option("checkpointLocation", CHECKPOINT_PATH) \</text>
      <text x="30" y="123" fill="#4ade80" font-size="10">    .trigger(processingTime="1 minute") \</text>
      <text x="30" y="137" fill="#4ade80" font-size="10">    .start("s3://ms-data-lake/bronze/user_events/")</text>
      <!-- Flow diagram -->
      <rect x="15" y="158" width="100" height="55" rx="4" fill="#1e293b" stroke="#ef4444"/>
      <text x="65" y="178" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="bold">Kafka</text>
      <text x="65" y="193" text-anchor="middle" fill="#64748b" font-size="8">offsets</text>
      <text x="65" y="206" text-anchor="middle" fill="#64748b" font-size="8">100–200</text>
      <line x1="116" y1="185" x2="140" y2="185" stroke="#4ade80" stroke-width="1.5" marker-end="url(#si-a2)"/>
      <defs><marker id="si-a2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#4ade80"/></marker></defs>
      <rect x="143" y="158" width="100" height="55" rx="4" fill="#1e293b" stroke="#38bdf8"/>
      <text x="193" y="178" text-anchor="middle" fill="#38bdf8" font-size="9" font-weight="bold">Spark</text>
      <text x="193" y="193" text-anchor="middle" fill="#64748b" font-size="8">micro-batch</text>
      <text x="193" y="206" text-anchor="middle" fill="#64748b" font-size="8">1 min</text>
      <line x1="244" y1="185" x2="268" y2="185" stroke="#4ade80" stroke-width="1.5" marker-end="url(#si-a2)"/>
      <rect x="271" y="158" width="100" height="55" rx="4" fill="#1e293b" stroke="#4ade80"/>
      <text x="321" y="178" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">Delta WAL</text>
      <text x="321" y="193" text-anchor="middle" fill="#64748b" font-size="8">_delta_log</text>
      <text x="321" y="206" text-anchor="middle" fill="#64748b" font-size="8">commit JSON</text>
      <line x1="372" y1="185" x2="396" y2="185" stroke="#4ade80" stroke-width="1.5" marker-end="url(#si-a2)"/>
      <rect x="399" y="158" width="68" height="55" rx="4" fill="#1e293b" stroke="#ff6b35"/>
      <text x="433" y="178" text-anchor="middle" fill="#ff6b35" font-size="9" font-weight="bold">Bronze</text>
      <text x="433" y="193" text-anchor="middle" fill="#64748b" font-size="8">Parquet</text>
      <text x="433" y="206" text-anchor="middle" fill="#64748b" font-size="8">files</text>
      <text x="240" y="240" text-anchor="middle" fill="#64748b" font-size="9">Delta records offset range 100–200 in commit JSON</text>
      <text x="240" y="255" text-anchor="middle" fill="#4ade80" font-size="9">On restart: reads checkpoint → replays only uncommitted offsets → no duplicates</text>
      <text x="240" y="270" text-anchor="middle" fill="#64748b" font-size="9">Kafka retention: 7 days  •  Bronze retention: 90 days  •  checkpoint: S3 durable</text>
    </svg>`,

    // Step 3: Checkpointing
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Checkpoint Directory — Durable Streaming State</text>
      <!-- Directory tree -->
      <rect x="15" y="35" width="210" height="145" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="120" y="53" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">s3://ms-checkpoints/bronze/</text>
      <line x1="15" y1="58" x2="225" y2="58" stroke="#334155"/>
      <text x="30" y="73" fill="#38bdf8" font-size="9">commits/</text>
      <text x="45" y="86" fill="#64748b" font-size="8">  ├─ 0     (batch 0 metadata)</text>
      <text x="45" y="99" fill="#64748b" font-size="8">  ├─ 1     (batch 1 metadata)</text>
      <text x="45" y="112" fill="#64748b" font-size="8">  └─ 421   (latest batch)</text>
      <text x="30" y="127" fill="#38bdf8" font-size="9">offsets/</text>
      <text x="45" y="140" fill="#64748b" font-size="8">  ├─ 0     {P0:100, P1:50, …}</text>
      <text x="45" y="153" fill="#64748b" font-size="8">  └─ 421   {P0:9241883, …}</text>
      <text x="30" y="168" fill="#38bdf8" font-size="9">metadata  (query config)</text>
      <!-- What's stored -->
      <rect x="235" y="35" width="230" height="145" rx="4" fill="#0f172a" stroke="#4ade80"/>
      <text x="350" y="53" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">offsets/421 content</text>
      <line x1="235" y1="58" x2="465" y2="58" stroke="#334155"/>
      <text x="250" y="73" fill="#64748b" font-size="8">v1</text>
      <text x="250" y="87" fill="#a855f7" font-size="9">{"batchWatermarkMs":0,</text>
      <text x="250" y="100" fill="#a855f7" font-size="9"> "batchTimestampMs":1706054400000}</text>
      <text x="250" y="114" fill="#38bdf8" font-size="9">{"ms-clickstream-events":{</text>
      <text x="250" y="127" fill="#38bdf8" font-size="9">  "0":9241883,</text>
      <text x="250" y="140" fill="#38bdf8" font-size="9">  "1":7892441,</text>
      <text x="250" y="153" fill="#38bdf8" font-size="9">  "2":6103221,</text>
      <text x="250" y="166" fill="#38bdf8" font-size="9">  ...</text>
      <text x="250" y="173" fill="#38bdf8" font-size="9">}}</text>
      <!-- Recovery flow -->
      <rect x="15" y="192" width="450" height="80" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="240" y="210" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">Failure Recovery Sequence</text>
      <text x="30" y="227" fill="#64748b" font-size="9">1. Driver restarts → reads checkpoint/metadata for query config</text>
      <text x="30" y="241" fill="#64748b" font-size="9">2. Reads checkpoint/offsets/421 → knows last committed Kafka offsets per partition</text>
      <text x="30" y="255" fill="#64748b" font-size="9">3. Seeks Kafka to offset+1 per partition → reads only un-committed events</text>
      <text x="30" y="269" fill="#4ade80" font-size="9">4. Writes batch 422 to Delta → exactly the events that were missing, no duplicates</text>
    </svg>`,

    // Step 4: Trigger Policies
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Three Trigger Modes for Different Latency Tiers</text>
      <!-- Bronze -->
      <rect x="15" y="35" width="140" height="130" rx="4" fill="#1e293b" stroke="#ff6b35"/>
      <text x="85" y="53" text-anchor="middle" fill="#ff6b35" font-size="10" font-weight="bold">Bronze Ingest</text>
      <rect x="25" y="60" width="120" height="20" rx="3" fill="#0f172a"/>
      <text x="85" y="74" text-anchor="middle" fill="#4ade80" font-size="9">ProcessingTime("1 minute")</text>
      <text x="85" y="92" text-anchor="middle" fill="#94a3b8" font-size="9">Latency: ~60 s</text>
      <text x="85" y="106" text-anchor="middle" fill="#94a3b8" font-size="9">Use case:</text>
      <text x="85" y="119" text-anchor="middle" fill="#64748b" font-size="8">Raw event ingest</text>
      <text x="85" y="132" text-anchor="middle" fill="#64748b" font-size="8">Cost-optimized</text>
      <text x="85" y="145" text-anchor="middle" fill="#64748b" font-size="8">Large micro-batches</text>
      <text x="85" y="158" text-anchor="middle" fill="#64748b" font-size="8">2.4B events/day</text>
      <!-- Silver -->
      <rect x="170" y="35" width="140" height="130" rx="4" fill="#1e293b" stroke="#38bdf8"/>
      <text x="240" y="53" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="bold">Silver Transform</text>
      <rect x="180" y="60" width="120" height="20" rx="3" fill="#0f172a"/>
      <text x="240" y="74" text-anchor="middle" fill="#4ade80" font-size="9">AvailableNow()</text>
      <text x="240" y="92" text-anchor="middle" fill="#94a3b8" font-size="9">Latency: on-demand</text>
      <text x="240" y="106" text-anchor="middle" fill="#94a3b8" font-size="9">Use case:</text>
      <text x="240" y="119" text-anchor="middle" fill="#64748b" font-size="8">Airflow-triggered</text>
      <text x="240" y="132" text-anchor="middle" fill="#64748b" font-size="8">Processes backlog</text>
      <text x="240" y="145" text-anchor="middle" fill="#64748b" font-size="8">then terminates</text>
      <text x="240" y="158" text-anchor="middle" fill="#64748b" font-size="8">scheduled every 5 min</text>
      <!-- Alerting -->
      <rect x="325" y="35" width="140" height="130" rx="4" fill="#1e293b" stroke="#a855f7"/>
      <text x="395" y="53" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">Fraud Alerts</text>
      <rect x="335" y="60" width="120" height="20" rx="3" fill="#0f172a"/>
      <text x="395" y="74" text-anchor="middle" fill="#4ade80" font-size="9">Continuous("100ms")</text>
      <text x="395" y="92" text-anchor="middle" fill="#94a3b8" font-size="9">Latency: ~100 ms</text>
      <text x="395" y="106" text-anchor="middle" fill="#94a3b8" font-size="9">Use case:</text>
      <text x="395" y="119" text-anchor="middle" fill="#64748b" font-size="8">Account takeover</text>
      <text x="395" y="132" text-anchor="middle" fill="#64748b" font-size="8">detection</text>
      <text x="395" y="145" text-anchor="middle" fill="#64748b" font-size="8">Dedicated cluster</text>
      <text x="395" y="158" text-anchor="middle" fill="#64748b" font-size="8">Pagerduty alert</text>
      <!-- Notes -->
      <rect x="15" y="180" width="450" height="100" rx="4" fill="#0a1628" stroke="#334155"/>
      <text x="240" y="198" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">MediaStream Streaming Pipeline Topology</text>
      <text x="30" y="215" fill="#64748b" font-size="9">Kafka  →  Bronze (1 min)  →  Silver (5 min via AvailableNow)  →  Gold (hourly)</text>
      <text x="30" y="229" fill="#64748b" font-size="9">                         →  Fraud detection (100ms Continuous, separate cluster)</text>
      <text x="30" y="243" fill="#fbbf24" font-size="9">Cost tip: AvailableNow terminates the cluster when backlog is caught up — no idle DBUs.</text>
      <text x="30" y="257" fill="#64748b" font-size="9">Bronze → Silver triggers daily model retraining when Silver row count crosses 2B.</text>
      <text x="30" y="271" fill="#64748b" font-size="9">Checkpoint paths on S3 with versioning enabled — survives Spark driver restarts.</text>
    </svg>`,

    // Step 5: Exactly-Once
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <defs>
        <linearGradient id="si-eo" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff6b35"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
      </defs>
      <rect x="15" y="12" width="450" height="26" rx="4" fill="url(#si-eo)"/>
      <text x="240" y="29" text-anchor="middle" fill="white" font-weight="bold" font-size="12">Exactly-Once Guarantee — What It Means</text>
      <!-- Three scenarios -->
      <rect x="15" y="48" width="140" height="130" rx="4" fill="#1e293b" stroke="#4ade80"/>
      <text x="85" y="65" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">Happy Path</text>
      <text x="85" y="80" text-anchor="middle" fill="#64748b" font-size="9">Kafka: 100–200</text>
      <text x="85" y="94" text-anchor="middle" fill="#64748b" font-size="9">Spark reads batch</text>
      <text x="85" y="108" text-anchor="middle" fill="#64748b" font-size="9">Delta commits v42</text>
      <text x="85" y="122" text-anchor="middle" fill="#64748b" font-size="9">Checkpoint writes</text>
      <text x="85" y="136" text-anchor="middle" fill="#64748b" font-size="9">offset = 200</text>
      <text x="85" y="155" text-anchor="middle" fill="#4ade80" font-size="9">✓ Events 100–200</text>
      <text x="85" y="170" text-anchor="middle" fill="#4ade80" font-size="9">exactly in Delta</text>

      <rect x="170" y="48" width="140" height="130" rx="4" fill="#1e293b" stroke="#fbbf24"/>
      <text x="240" y="65" text-anchor="middle" fill="#fbbf24" font-size="10" font-weight="bold">Driver Crash</text>
      <text x="240" y="80" text-anchor="middle" fill="#64748b" font-size="9">Kafka: 100–200</text>
      <text x="240" y="94" text-anchor="middle" fill="#64748b" font-size="9">Spark starts write</text>
      <text x="240" y="108" text-anchor="middle" fill="#64748b" font-size="9">CRASH mid-write</text>
      <text x="240" y="122" text-anchor="middle" fill="#64748b" font-size="9">Delta aborts v42</text>
      <text x="240" y="136" text-anchor="middle" fill="#64748b" font-size="9">Checkpoint = 99</text>
      <text x="240" y="150" text-anchor="middle" fill="#fbbf24" font-size="9">Restart: re-reads</text>
      <text x="240" y="163" text-anchor="middle" fill="#4ade80" font-size="9">100–200 → writes</text>
      <text x="240" y="175" text-anchor="middle" fill="#4ade80" font-size="9">exactly once ✓</text>

      <rect x="325" y="48" width="140" height="130" rx="4" fill="#1e293b" stroke="#ef4444"/>
      <text x="395" y="65" text-anchor="middle" fill="#ef4444" font-size="10" font-weight="bold">Late Commit</text>
      <text x="395" y="80" text-anchor="middle" fill="#64748b" font-size="9">Kafka: 100–200</text>
      <text x="395" y="94" text-anchor="middle" fill="#64748b" font-size="9">Spark writes data</text>
      <text x="395" y="108" text-anchor="middle" fill="#64748b" font-size="9">Delta commits v42</text>
      <text x="395" y="122" text-anchor="middle" fill="#64748b" font-size="9">Checkpoint FAILS</text>
      <text x="395" y="136" text-anchor="middle" fill="#64748b" font-size="9">Restart: re-reads</text>
      <text x="395" y="150" text-anchor="middle" fill="#64748b" font-size="9">100–200 again</text>
      <text x="395" y="163" text-anchor="middle" fill="#fbbf24" font-size="9">Delta idempotent</text>
      <text x="395" y="175" text-anchor="middle" fill="#4ade80" font-size="9">rejects dupe ✓</text>
      <!-- Summary -->
      <rect x="15" y="192" width="450" height="80" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="240" y="210" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">The Guarantee</text>
      <text x="30" y="227" fill="#4ade80" font-size="9">Every event in Kafka offsets 100–200 appears in Delta exactly once.</text>
      <text x="30" y="242" fill="#64748b" font-size="9">No matter when the failure occurs — before, during, or after write — Delta + checkpoint</text>
      <text x="30" y="256" fill="#64748b" font-size="9">together prevent both data loss (at-least-once without dedup) and duplication.</text>
      <text x="30" y="270" fill="#fbbf24" font-size="9">MediaStream: zero duplicate events since adopting Structured Streaming + Delta in 2022.</text>
    </svg>`,

    // Step 6: Bronze Schema
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Bronze Table Schema — Raw + Ingestion Metadata</text>
      <rect x="15" y="35" width="450" height="195" rx="4" fill="#1e293b" stroke="#ff6b35"/>
      <!-- header -->
      <text x="35" y="55" fill="#64748b" font-size="10">COLUMN NAME</text>
      <text x="195" y="55" fill="#64748b" font-size="10">TYPE</text>
      <text x="285" y="55" fill="#64748b" font-size="10">NULLABLE</text>
      <text x="370" y="55" fill="#64748b" font-size="10">SOURCE</text>
      <line x1="15" y1="60" x2="465" y2="60" stroke="#334155"/>
      <!-- Event columns -->
      <text x="35" y="76" fill="#38bdf8" font-size="10">user_id</text>
      <text x="195" y="76" fill="#a855f7" font-size="10">STRING</text>
      <text x="285" y="76" fill="#fbbf24" font-size="10">YES</text>
      <text x="370" y="76" fill="#64748b" font-size="9">Kafka JSON</text>
      <text x="35" y="92" fill="#38bdf8" font-size="10">event_type</text>
      <text x="195" y="92" fill="#a855f7" font-size="10">STRING</text>
      <text x="285" y="92" fill="#fbbf24" font-size="10">YES</text>
      <text x="370" y="92" fill="#64748b" font-size="9">Kafka JSON</text>
      <text x="35" y="108" fill="#38bdf8" font-size="10">content_id</text>
      <text x="195" y="108" fill="#a855f7" font-size="10">STRING</text>
      <text x="285" y="108" fill="#fbbf24" font-size="10">YES</text>
      <text x="370" y="108" fill="#64748b" font-size="9">Kafka JSON</text>
      <text x="35" y="124" fill="#38bdf8" font-size="10">event_ts</text>
      <text x="195" y="124" fill="#a855f7" font-size="10">TIMESTAMP</text>
      <text x="285" y="124" fill="#fbbf24" font-size="10">YES</text>
      <text x="370" y="124" fill="#64748b" font-size="9">Kafka JSON</text>
      <text x="35" y="140" fill="#38bdf8" font-size="10">region</text>
      <text x="195" y="140" fill="#a855f7" font-size="10">STRING</text>
      <text x="285" y="140" fill="#fbbf24" font-size="10">YES</text>
      <text x="370" y="140" fill="#64748b" font-size="9">Kafka JSON</text>
      <!-- Ingestion metadata (highlighted) -->
      <line x1="15" y1="148" x2="465" y2="148" stroke="#334155" stroke-dasharray="3,3"/>
      <text x="35" y="165" fill="#4ade80" font-size="10">_kafka_offset</text>
      <text x="195" y="165" fill="#a855f7" font-size="10">LONG</text>
      <text x="285" y="165" fill="#4ade80" font-size="10">NO</text>
      <text x="370" y="165" fill="#4ade80" font-size="9">added by Spark</text>
      <text x="35" y="181" fill="#4ade80" font-size="10">_kafka_partition</text>
      <text x="195" y="181" fill="#a855f7" font-size="10">INT</text>
      <text x="285" y="181" fill="#4ade80" font-size="10">NO</text>
      <text x="370" y="181" fill="#4ade80" font-size="9">added by Spark</text>
      <text x="35" y="197" fill="#4ade80" font-size="10">_ingest_ts</text>
      <text x="195" y="197" fill="#a855f7" font-size="10">TIMESTAMP</text>
      <text x="285" y="197" fill="#4ade80" font-size="10">NO</text>
      <text x="370" y="197" fill="#4ade80" font-size="9">current_timestamp()</text>
      <text x="35" y="218" fill="#64748b" font-size="9">partitioned by (region, date(event_ts))  •  mergeSchema=true  •  ~130 GB/day</text>
      <text x="240" y="252" text-anchor="middle" fill="#64748b" font-size="9">_kafka_offset enables replay audit: know exactly which Kafka message each row came from</text>
      <text x="240" y="267" text-anchor="middle" fill="#64748b" font-size="9">_ingest_ts vs event_ts delta = ingestion lag metric — monitored in Grafana (SLA: &lt;90s)</text>
    </svg>`,
  ];

  function _buildDiagram(si) { return DIAGRAMS[si] || DIAGRAMS[0]; }

  function _updateStep(el, si) {
    el.querySelectorAll('.si-pill').forEach((pill, idx) => {
      pill.classList.toggle('active', idx === si);
      pill.classList.toggle('visited', idx < si);
    });
    const diagram = el.querySelector('#si-diagram');
    if (diagram) diagram.innerHTML = _buildDiagram(si);
    const s = STEPS[si];
    const t = el.querySelector('#si-info-title');
    const b = el.querySelector('#si-info-body');
    const d = el.querySelector('#si-info-detail');
    if (t) t.textContent = s.label;
    if (b) b.textContent = s.desc;
    if (d) d.textContent = s.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="si-pill${i === 0 ? ' active' : ''}" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
<style>
.si-page { display:flex; flex-direction:column; gap:16px; padding:16px; }
.si-pills { display:flex; flex-wrap:wrap; gap:6px; }
.si-pill {
  padding:4px 12px; border-radius:20px; border:1px solid var(--border);
  background:var(--surface); color:var(--text-muted); font-size:11px;
  cursor:pointer; transition:all .2s;
}
.si-pill.active { border-color:var(--delta); color:var(--delta); background:rgba(255,107,53,.1); }
.si-pill.visited { border-color:var(--border); color:var(--text-muted); opacity:.6; }
.si-pill:hover { border-color:var(--delta); color:var(--delta); }
.si-layout { display:grid; grid-template-columns:1fr 280px; gap:16px; }
.si-diagram-wrap { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:8px; }
.si-diagram-wrap svg { width:100%; height:auto; }
.si-info { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:16px; display:flex; flex-direction:column; gap:8px; }
.si-info-title { font-size:16px; font-weight:600; color:var(--delta); }
.si-info-body { font-size:13px; color:var(--text); }
.si-info-detail { font-size:12px; color:var(--text-muted); line-height:1.6; }
.si-badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:11px; background:rgba(255,107,53,.15); color:var(--delta); border:1px solid rgba(255,107,53,.3); }
@media(max-width:720px){ .si-layout{ grid-template-columns:1fr; } }
</style>
<div class="si-page page-enter">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
    <h2 style="font-size:20px;font-weight:700;color:var(--text);margin:0;">Streaming Ingest</h2>
    <span class="si-badge">Write Operation</span>
    <span style="color:var(--text-muted);font-size:12px;">Kafka → Delta Bronze: 2.4B events/day, exactly-once semantics</span>
  </div>
  <div class="si-pills">${pills}</div>
  <div class="si-layout">
    <div class="si-diagram-wrap"><div id="si-diagram">${_buildDiagram(0)}</div></div>
    <div class="si-info">
      <div class="si-info-title" id="si-info-title">${STEPS[0].label}</div>
      <div class="si-info-body" id="si-info-body">${STEPS[0].desc}</div>
      <div class="si-info-detail" id="si-info-detail">${STEPS[0].detail}</div>
    </div>
  </div>
</div>`;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'si-page page-enter';
    page.innerHTML = _buildHTML();
    container.appendChild(page);

    _engine = new IV.AnimationEngine({
      steps: STEPS.map((s, i) => ({
        label: s.label,
        description: s.desc,
        duration: 2000,
        enter(ctx) {
          const si = i;
          const el = ctx.el;
          _updateStep(el, si);
        },
      })),
    });

    _engine.setContext({ el: container });

    container.querySelectorAll('.si-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['streaming-ingest'] = {
    id: 'streaming-ingest',
    title: 'Streaming Ingest',
    group: 'Write Operations',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
