/* ============================================================
   MediaStream Visualizer — Business Domain Data
   MediaStream: a streaming platform (like Netflix/Disney+/Prime)
   180M subscribers · 2.4B events/day · 5 PB Delta Lake
   ============================================================ */

(function () {
  'use strict';

  window.IcebergViz = window.IcebergViz || {};

  window.IcebergViz.Data = {

    mediastream: {
      company: 'MediaStream',
      tagline: 'Powering 180M subscribers with real-time recommendations',
      stats: {
        subscribers: '180M',
        eventsPerDay: '2.4B',
        dataSize: '5 PB',
        tables: '1,200+',
        regions: '42',
        catalogs: 3,
        recommendations_per_day: '900M',
      },

      /* Platform layers */
      layers: {
        bronze: {
          name: 'Bronze',
          color: '#b87333',
          desc: 'Raw ingestion from Kafka — every click, play, pause, seek',
          tables: [
            { name: 'raw_clickstream',       path: 's3://ms-datalake/bronze/clickstream/',    rows: '2.4B/day',   format: 'delta' },
            { name: 'raw_play_events',        path: 's3://ms-datalake/bronze/play_events/',   rows: '800M/day',   format: 'delta' },
            { name: 'raw_search_events',      path: 's3://ms-datalake/bronze/search/',        rows: '120M/day',   format: 'delta' },
            { name: 'raw_ratings',            path: 's3://ms-datalake/bronze/ratings/',       rows: '18M/day',    format: 'delta' },
            { name: 'raw_device_telemetry',   path: 's3://ms-datalake/bronze/telemetry/',     rows: '600M/day',   format: 'delta' },
          ],
        },
        silver: {
          name: 'Silver',
          color: '#c0c0c0',
          desc: 'Cleaned, deduplicated, joined — queryable by analysts',
          tables: [
            { name: 'user_sessions',          path: 's3://ms-datalake/silver/sessions/',      rows: '220M/day',   format: 'delta' },
            { name: 'content_watch_history',  path: 's3://ms-datalake/silver/watch_history/', rows: '800M/day',   format: 'delta' },
            { name: 'search_intent',          path: 's3://ms-datalake/silver/search_intent/', rows: '60M/day',    format: 'delta' },
            { name: 'device_profiles',        path: 's3://ms-datalake/silver/devices/',       rows: '900M total', format: 'delta' },
            { name: 'content_catalog',        path: 's3://ms-datalake/silver/catalog/',       rows: '48M titles', format: 'delta' },
          ],
        },
        gold: {
          name: 'Gold',
          color: '#ffd700',
          desc: 'Aggregated business metrics, dashboards, ML feature inputs',
          tables: [
            { name: 'daily_active_users',     path: 's3://ms-datalake/gold/dau/',             rows: '180M/day',   format: 'delta' },
            { name: 'content_performance',    path: 's3://ms-datalake/gold/content_perf/',    rows: '48M titles', format: 'delta' },
            { name: 'user_preferences',       path: 's3://ms-datalake/gold/preferences/',     rows: '180M users', format: 'delta' },
            { name: 'ab_test_results',        path: 's3://ms-datalake/gold/ab_tests/',        rows: '50M/day',    format: 'delta' },
            { name: 'revenue_summary',        path: 's3://ms-datalake/gold/revenue/',         rows: '1M/day',     format: 'delta' },
          ],
        },
        ml: {
          name: 'ML Features',
          color: '#a855f7',
          desc: 'Feature store tables consumed by recommendation models',
          tables: [
            { name: 'user_embedding_features',   path: 's3://ms-datalake/ml/user_features/', rows: '180M users', format: 'delta' },
            { name: 'content_embedding_features', path: 's3://ms-datalake/ml/item_features/', rows: '48M items', format: 'delta' },
            { name: 'interaction_matrix',        path: 's3://ms-datalake/ml/interactions/',  rows: '2B pairs',   format: 'delta' },
            { name: 'realtime_context',          path: 's3://ms-datalake/ml/realtime/',       rows: '180M/hr',    format: 'delta' },
          ],
        },
      },

      /* Unity Catalog hierarchy */
      unity_catalog: {
        metastore: 'ms-prod-metastore',
        catalogs: [
          {
            name: 'mediastream_prod',
            desc: 'Production data — all Medallion layers',
            schemas: ['bronze', 'silver', 'gold', 'ml_features'],
          },
          {
            name: 'mediastream_dev',
            desc: 'Development and experimentation sandbox',
            schemas: ['sandbox', 'experiments', 'staging'],
          },
          {
            name: 'shared_governance',
            desc: 'Shared reference data and compliance tables',
            schemas: ['content_rights', 'gdpr_requests', 'audit_logs'],
          },
        ],
      },

      /* Production incidents that drove Delta Lake adoption */
      incidents: [
        {
          id: 'INC-2022-003',
          title: 'Recommendation Model Trained on Corrupt Data',
          description: 'A Spark job failed mid-write leaving partial Parquet files. The model training pipeline read the incomplete table and deployed a broken recommendation model to 40M users.',
          resolution: 'Delta Lake ACID transactions — partial writes are invisible',
          color: '#f85149',
        },
        {
          id: 'INC-2022-011',
          title: 'Watch History Table Double-Counted Events',
          description: 'A reprocessing job re-ingested 3 days of clickstream events creating duplicate rows. Revenue reporting overstated by 18% for an entire quarter before detection.',
          resolution: 'MERGE INTO for idempotent upserts with deduplication',
          color: '#f97316',
        },
        {
          id: 'INC-2023-007',
          title: 'Schema Change Broke 23 Downstream Pipelines',
          description: 'A team added a NOT NULL column to content_catalog without coordination. 23 DLT pipelines reading the table failed overnight, killing next-day dashboards.',
          resolution: 'Delta schema evolution + Unity Catalog schema registry',
          color: '#e3b341',
        },
        {
          id: 'INC-2023-019',
          title: 'GDPR Deletion Violated 72-Hour Deadline',
          description: "A user's right-to-erasure request required deleting rows from 14 tables spanning 3 years of partitioned Parquet. Manual process took 6 days — well past legal deadline.",
          resolution: 'DELETE WHERE + time travel + Unity Catalog lineage tracking',
          color: '#a371f7',
        },
        {
          id: 'INC-2024-002',
          title: 'Cold-Start Problem Caused Recommendation Outage',
          description: '180M users saw generic "popular titles" instead of personalized recommendations for 4 hours due to a failed feature table refresh with no fallback snapshot.',
          resolution: 'Delta time travel for fallback snapshots + CDF for incremental updates',
          color: '#58a6ff',
        },
      ],
    },

    /* Delta Lake concept definitions */
    delta: {
      transaction_log: {
        name: '_delta_log',
        desc: 'JSON + Parquet commit history — the source of truth for all Delta tables',
        operations: ['add', 'remove', 'metadata', 'protocol', 'commitInfo', 'cdc'],
        checkpoint_interval: 10,
      },
      acid_properties: [
        { letter: 'A', name: 'Atomicity',   desc: 'All files in a write either commit together or none do. No partial tables.' },
        { letter: 'C', name: 'Consistency', desc: 'Schema and constraints are enforced on every write. Bad data is rejected.' },
        { letter: 'I', name: 'Isolation',   desc: 'Concurrent readers always see a consistent snapshot, never partial writes.' },
        { letter: 'D', name: 'Durability',  desc: 'Once committed to S3 + transaction log, data survives any process failure.' },
      ],
      medallion_layers: [
        { id: 'bronze', name: 'Bronze',     color: '#b87333', icon: '📦', desc: 'Raw, append-only ingestion from source systems. Exactly as received.' },
        { id: 'silver', name: 'Silver',     color: '#c0c0c0', icon: '⚙️', desc: 'Cleaned, validated, conformed. Join-ready for analysts.' },
        { id: 'gold',   name: 'Gold',       color: '#ffd700', icon: '⭐', desc: 'Aggregated business metrics. Dashboard and BI-ready.' },
        { id: 'ml',     name: 'ML Features', color: '#a855f7', icon: '🤖', desc: 'Feature engineering outputs for ML model training and serving.' },
      ],
    },

    /* Unity Catalog concept definitions */
    unity: {
      hierarchy: [
        { level: 0, name: 'Metastore',  desc: 'Root of the Unity Catalog hierarchy. One per Databricks account region.',  icon: '🏛' },
        { level: 1, name: 'Catalog',    desc: 'Top-level namespace. Typically one per environment (prod, dev, shared).',    icon: '📂' },
        { level: 2, name: 'Schema',     desc: 'Logical grouping of tables (like a database). Maps to Medallion layers.',   icon: '📁' },
        { level: 3, name: 'Table',      desc: 'Delta Lake table registered in Unity Catalog with full governance.',        icon: '📋' },
      ],
      features: [
        { name: 'Column-Level Security', icon: '🔒', desc: 'Mask PII fields (email, card_last4) per user/group. Applied transparently at query time.' },
        { name: 'Row-Level Filters',     icon: '🔍', desc: 'Each region team sees only their rows. Same table, filtered view.' },
        { name: 'Data Lineage',          icon: '🔗', desc: 'End-to-end lineage from raw Kafka topic → Gold table → ML feature. Visual graph in UI.' },
        { name: 'Audit Logs',            icon: '📜', desc: 'Every SELECT, INSERT, GRANT is logged. Required for SOC2 and GDPR compliance.' },
        { name: 'Delta Sharing',         icon: '🤝', desc: 'Share live Delta tables with external partners (studios, distributors) without data copies.' },
        { name: 'Change Data Feed',      icon: '📡', desc: 'Stream only changed rows from Silver to Gold, cutting DLT compute cost by 80%.' },
      ],
    },
  };
})();
