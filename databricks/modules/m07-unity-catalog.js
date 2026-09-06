import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M07 · Governance',
    title: 'Unity Catalog',
    subtitle: '3-level namespace, fine-grained access, data lineage, Delta Sharing',
    tabs: [
      { id: 'overview', label: '🗂️ Overview' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-overview').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Unity Catalog</div>
        <div class="section-desc">Centralized governance for all data and AI assets across clouds</div>
      </div>
      <div class="db-cs-box">
        <div class="db-cs-icon">🗂️</div>
        <h3>Full module coming soon</h3>
        <p>Topics: 3-level namespace (catalog.schema.table), metastore architecture, GRANT/REVOKE at column and row level, row filters, column masks, data lineage graph (table-to-table, notebook-to-table), audit logs, Delta Sharing protocol, and external locations.</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'How does Unity Catalog\'s 3-level namespace differ from the legacy 2-level Hive metastore?',
      a: 'Legacy Hive metastore: database.table — one metastore per workspace, no cross-workspace governance. Unity Catalog: catalog.schema.table — one metastore shared across all workspaces in an account. A catalog maps to a business domain (e.g., prod, staging, analytics). A schema groups related tables. Tables live at the deepest level. Cross-workspace sharing: grant SELECT on prod.orders.transactions TO analytics_team — the team\'s workspace can read production data without copying it. Legacy required manual replication or separate ETL jobs.'
    },
    {
      q: 'What is Delta Sharing and how does it differ from copying data?',
      a: 'Delta Sharing is an open protocol for sharing live Delta Lake data without copying it. The data provider grants read access to specific tables; the recipient queries the provider\'s S3 files directly (pre-signed URLs) via any client (Spark, Pandas, Power BI). Data is never duplicated — the recipient always reads the latest version. Permissions are revocable instantly. Contrast with copying: ETL jobs are needed, data becomes stale immediately, and revoking access requires deleting the copy. Delta Sharing is governed by Unity Catalog — each share, recipient, and access grant is audited.'
    },
  ]);

  const style = document.createElement('style');
  style.textContent = `.db-cs-box{text-align:center;padding:40px 24px;background:var(--bg2);border:1px dashed var(--border);border-radius:12px}.db-cs-icon{font-size:40px;margin-bottom:12px}.db-cs-box h3{margin-bottom:8px;color:var(--text)}.db-cs-box p{color:var(--text2);font-size:13px;max-width:480px;margin:0 auto;line-height:1.6}`;
  container.appendChild(style);
}
