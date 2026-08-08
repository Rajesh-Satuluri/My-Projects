import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M03 · Foundation',
    title: 'Delta Lake Internals',
    subtitle: 'Transaction log, snapshots, schema enforcement, ACID on object storage',
    tabs: [
      { id: 'overview', label: 'Δ Overview' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-overview').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Delta Lake Internals</div>
        <div class="section-desc">How ACID works on S3 — transaction log, snapshots, and conflict detection</div>
      </div>
      <div class="db-cs-box">
        <div class="db-cs-icon">Δ</div>
        <h3>Full module coming soon</h3>
        <p>Topics: _delta_log structure, Parquet checkpoint files, optimistic concurrency control, schema enforcement vs schema evolution, MERGE internals, time travel with VERSION AS OF / TIMESTAMP AS OF, and RESTORE.</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'How does Delta Lake prevent two concurrent writers from corrupting a table?',
      a: 'Delta Lake uses optimistic concurrency control. Each writer reads the current log version, performs its work, then attempts to write the next commit file (e.g., 0000000005.json). If another writer already wrote that file, the second writer gets a conflict exception and must re-read the table state and retry. For non-overlapping changes (e.g., INSERT to different partitions), Delta can detect this and allow both to succeed. For overlapping changes, one writer must retry. This avoids pessimistic locking (no global lock held during the write) while still preventing corruption.'
    },
    {
      q: 'What is schema enforcement vs schema evolution in Delta Lake?',
      a: 'Schema enforcement (default) rejects writes whose schema does not match the table schema — protecting downstream consumers from unexpected nulls or type changes. Schema evolution (opt-in via mergeSchema=true) automatically adds new columns to the table schema when they appear in the incoming data. You can never silently change a column\'s type — that requires explicit ALTER TABLE. Schema enforcement catches bugs early; schema evolution handles graceful additions. Both rely on the schema stored in the transaction log.'
    },
  ]);

  const style = document.createElement('style');
  style.textContent = `.db-cs-box{text-align:center;padding:40px 24px;background:var(--bg2);border:1px dashed var(--border);border-radius:12px}.db-cs-icon{font-size:40px;margin-bottom:12px}.db-cs-box h3{margin-bottom:8px;color:var(--text)}.db-cs-box p{color:var(--text2);font-size:13px;max-width:480px;margin:0 auto;line-height:1.6}`;
  container.appendChild(style);
}
