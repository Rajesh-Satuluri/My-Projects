import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M09 · Governance',
    title: 'Delta Optimizations',
    subtitle: 'OPTIMIZE, ZORDER, liquid clustering, vacuum, auto-compaction',
    tabs: [
      { id: 'overview', label: '🗜️ Overview' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-overview').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Delta Optimizations</div>
        <div class="section-desc">Keeping Delta tables fast as they grow</div>
      </div>
      <div class="db-cs-box">
        <div class="db-cs-icon">🗜️</div>
        <h3>Full module coming soon</h3>
        <p>Topics: OPTIMIZE (compacting small files into 1GB Parquet files), ZORDER BY (co-locating related rows by column value to improve data skipping), liquid clustering (auto-clustering without manual ZORDER), VACUUM (removing old Parquet files no longer referenced by Delta log), and auto-compaction / optimized writes for streaming tables.</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is the small-file problem in Delta Lake and how does OPTIMIZE fix it?',
      a: 'Streaming ingestion and frequent small batch writes create thousands of tiny Parquet files (sometimes a few KB each). Reading a query requires opening each file — O(n) S3 LIST + GET requests, each with ~10ms latency. 10,000 files × 10ms = 100 seconds of overhead before reading a single byte. OPTIMIZE compacts small files into target-size Parquet files (~1GB), dramatically reducing the file count. After OPTIMIZE, a query that scanned 10,000 files might scan 5 — 2000× fewer S3 requests. Run OPTIMIZE on a schedule (nightly or weekly) or use auto-compaction (spark.databricks.delta.autoCompact.enabled=true) for streaming tables.'
    },
    {
      q: 'What is ZORDER and when should you use it instead of partition pruning?',
      a: 'ZORDER BY (col1, col2) reorders rows within Parquet files so related values are co-located, improving data skipping (Delta\'s min/max statistics per file). Use ZORDER when: (1) your query filter columns have high cardinality (user_id, product_id) — traditional partitioning would create millions of tiny partitions; (2) you filter on 2+ correlated columns (date + category). ZORDER is limited to ~4 columns — each additional column gives diminishing returns. Don\'t ZORDER on partition columns — pruning already handles them. Liquid clustering (GA in DBR 13.3+) replaces ZORDER for new tables — it\'s incremental (no full rewrite) and automatically adjusts clustering keys via statistics.'
    },
  ]);

  const style = document.createElement('style');
  style.textContent = `.db-cs-box{text-align:center;padding:40px 24px;background:var(--bg2);border:1px dashed var(--border);border-radius:12px}.db-cs-icon{font-size:40px;margin-bottom:12px}.db-cs-box h3{margin-bottom:8px;color:var(--text)}.db-cs-box p{color:var(--text2);font-size:13px;max-width:480px;margin:0 auto;line-height:1.6}`;
  container.appendChild(style);
}
