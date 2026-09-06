import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M06 · Compute',
    title: 'Structured Streaming',
    subtitle: 'Micro-batch and continuous processing, triggers, watermarks, checkpointing',
    tabs: [
      { id: 'overview', label: '🌊 Overview' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-overview').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Structured Streaming</div>
        <div class="section-desc">Incremental query execution on an unbounded DataFrame</div>
      </div>
      <div class="db-cs-box">
        <div class="db-cs-icon">🌊</div>
        <h3>Full module coming soon</h3>
        <p>Topics: Micro-batch vs continuous mode, trigger intervals, watermarks for late data, stateful aggregations (mapGroupsWithState), checkpointing to S3, Kafka source with startingOffsets, Delta Lake as a sink (MERGE with foreachBatch), and Auto Loader for file ingestion.</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'How do watermarks handle late-arriving data in Structured Streaming?',
      a: 'A watermark tells Spark the maximum expected lateness: .withWatermark("event_time", "10 minutes"). Spark tracks the maximum event_time seen across all partitions (the "watermark boundary"). Any event whose event_time is older than (max_event_time - watermark_delay) is considered late and dropped (or handled with dropDuplicates). State for time windows is kept until the watermark passes the window\'s end — then it\'s committed and freed. Without a watermark, Spark keeps state for ALL time, causing unbounded memory growth. Trade-off: a larger watermark = more late data accepted, but more memory held.'
    },
    {
      q: 'What is checkpointing in Structured Streaming and what does it store?',
      a: 'Checkpointing writes streaming query progress to durable storage (S3/ADLS) so a query can restart exactly where it left off after a failure. The checkpoint directory stores: (1) offsets — the source offset range for each micro-batch (e.g., Kafka partition offsets 847,050–847,195); (2) commits — which micro-batches have been successfully written; (3) state — aggregation state (for stateful queries). On restart, Spark reads the latest committed offset and resumes from there. Without checkpointing, a restart starts from scratch (or from latest offset) causing data loss or reprocessing. Location must be stable and unique per query — never share checkpoint dirs between queries.'
    },
  ]);

  const style = document.createElement('style');
  style.textContent = `.db-cs-box{text-align:center;padding:40px 24px;background:var(--bg2);border:1px dashed var(--border);border-radius:12px}.db-cs-icon{font-size:40px;margin-bottom:12px}.db-cs-box h3{margin-bottom:8px;color:var(--text)}.db-cs-box p{color:var(--text2);font-size:13px;max-width:480px;margin:0 auto;line-height:1.6}`;
  container.appendChild(style);
}
