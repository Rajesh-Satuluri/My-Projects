import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M08 · Governance',
    title: 'Medallion Architecture',
    subtitle: 'Bronze → Silver → Gold: incremental refinement at Amazon\'s data lake',
    tabs: [
      { id: 'overview', label: '🥇 Overview' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-overview').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Medallion Architecture</div>
        <div class="section-desc">Three zones of data quality — Bronze (raw), Silver (clean), Gold (aggregated)</div>
      </div>
      <div class="db-cs-box">
        <div class="db-cs-icon">🥇</div>
        <h3>Full module coming soon</h3>
        <p>Topics: Bronze zone (raw ingestion, no transformation, schema-on-read, infinite retention), Silver zone (deduplication, type casting, joins, schema-on-write, Delta MERGE for upserts), Gold zone (pre-aggregated, BI-ready, optimized for Photon queries), and Amazon's order pipeline as a worked example through all three zones.</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'Why keep Bronze data if it\'s raw and messy?',
      a: 'Bronze is your source of truth and your replay buffer. Three reasons: (1) Reprocessing — if a Silver transformation had a bug, you can re-run it against Bronze without re-ingesting from the source system; (2) Audit — regulators may require the original, unmodified record; (3) Schema evolution — Bronze tolerates changing upstream schemas by storing raw JSON/Avro; Silver handles the transformation logic centrally. Deleting Bronze forces you to re-pull from upstream (Kafka, databases) which may not be possible for old data. Cost argument: Delta Lake on S3 stores Bronze at ~$23/TB/month — cheap enough to retain forever.'
    },
    {
      q: 'How do you prevent duplicate records when writing to Silver with Delta MERGE?',
      a: 'Use MERGE INTO silver_orders USING bronze_batch ON silver_orders.order_id = bronze_batch.order_id WHEN MATCHED AND bronze_batch.updated_at > silver_orders.updated_at THEN UPDATE SET ... WHEN NOT MATCHED THEN INSERT ... The MERGE is idempotent: re-running with the same Bronze batch produces the same Silver state. Key considerations: (1) deduplicate within the batch first (dropDuplicates on order_id, keeping latest updated_at) before the MERGE — Delta MERGE doesn\'t handle duplicates within the source; (2) set spark.databricks.delta.merge.enableLowShuffle.merge=true for large tables to reduce shuffle cost.'
    },
  ]);

  const style = document.createElement('style');
  style.textContent = `.db-cs-box{text-align:center;padding:40px 24px;background:var(--bg2);border:1px dashed var(--border);border-radius:12px}.db-cs-icon{font-size:40px;margin-bottom:12px}.db-cs-box h3{margin-bottom:8px;color:var(--text)}.db-cs-box p{color:var(--text2);font-size:13px;max-width:480px;margin:0 auto;line-height:1.6}`;
  container.appendChild(style);
}
