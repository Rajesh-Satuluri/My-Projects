import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M02 · Foundation',
    title: 'Lakehouse Architecture',
    subtitle: 'Data warehouse + data lake unified: Delta Lake, Unity Catalog, Photon',
    tabs: [
      { id: 'overview', label: '🏛️ Overview' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-overview').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Lakehouse Architecture</div>
        <div class="section-desc">One platform — lake economics, warehouse reliability</div>
      </div>
      <div class="db-cs-box">
        <div class="db-cs-icon">🏛️</div>
        <h3>Full module coming soon</h3>
        <p>Topics: Delta Lake metadata layer, Unity Catalog 3-level namespace (catalog.schema.table), Photon vectorized runtime, multi-workload compute (SQL, ML, Streaming), and the Amazon data platform architecture.</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'How does the Lakehouse differ from a traditional Kappa or Lambda architecture?',
      a: 'Lambda has a separate batch layer and speed layer — two codepaths, two sets of business logic to keep in sync. Kappa unifies them with streaming-only but requires reprocessing from a log for historical queries. The Lakehouse unifies by storing all data in Delta Lake tables that support both batch and streaming reads/writes via a single engine (Databricks), with no reprocessing required — historical data is already in the same format. Time travel gives you point-in-time queries without a separate batch layer.'
    },
    {
      q: 'What is the role of the Delta transaction log?',
      a: 'The _delta_log directory contains JSON files, one per commit, that record every change to the table (which Parquet files were added/removed, schema changes, statistics). Readers reconstruct the current table state by replaying the log. After 10 commits, a Parquet checkpoint file is written to speed up log replay. This log is the source of ACID guarantees, time travel, and audit history — it\'s what turns a directory of Parquet files into a managed table.'
    },
  ]);

  const style = document.createElement('style');
  style.textContent = `.db-cs-box{text-align:center;padding:40px 24px;background:var(--bg2);border:1px dashed var(--border);border-radius:12px}.db-cs-icon{font-size:40px;margin-bottom:12px}.db-cs-box h3{margin-bottom:8px;color:var(--text)}.db-cs-box p{color:var(--text2);font-size:13px;max-width:480px;margin:0 auto;line-height:1.6}`;
  container.appendChild(style);
}
