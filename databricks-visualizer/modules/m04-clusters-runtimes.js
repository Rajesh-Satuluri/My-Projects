import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M04 · Compute',
    title: 'Clusters & Runtimes',
    subtitle: 'All-purpose vs job clusters, Databricks Runtime, autoscaling, spot nodes',
    tabs: [
      { id: 'overview', label: '⚙️ Overview' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-overview').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Clusters &amp; Runtimes</div>
        <div class="section-desc">Choosing the right cluster type for each workload</div>
      </div>
      <div class="db-cs-box">
        <div class="db-cs-icon">⚙️</div>
        <h3>Full module coming soon</h3>
        <p>Topics: All-purpose vs job clusters vs SQL Warehouses, Databricks Runtime (DBR) vs ML Runtime, autoscaling configuration, spot instance strategies, cluster policies, instance pools, and DBU cost comparison by cluster type.</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'When should you use a job cluster vs an all-purpose cluster?',
      a: 'Job clusters are ephemeral — they start fresh for each job run and terminate when done. Use them for production scheduled jobs (ETL pipelines, ML training) because: (1) cost is zero when idle; (2) no dependency conflicts from shared state; (3) DBR version is pinned per job. All-purpose clusters are long-running and shared across users/notebooks — use them for interactive exploration, development, and ad-hoc analysis where startup latency (1–5 min) would hurt productivity. Never run production jobs on an all-purpose cluster — idle time is billed continuously.'
    },
    {
      q: 'How does Databricks autoscaling work and what are its limits?',
      a: 'Autoscaling monitors pending tasks in the Spark scheduler. When tasks queue for more than 1 minute (configurable), the cluster adds worker nodes up to max_workers. When nodes are idle for 2+ minutes, they are removed down to min_workers. Caveats: (1) scale-up takes 2–5 minutes (cloud VM provisioning); (2) a task already running on a node will not be interrupted by scale-down; (3) for streaming jobs, autoscaling is less effective because tasks are continuous — use fixed cluster sizes for Structured Streaming. Spot instance autoscaling risks: if spot nodes are preempted, Spark redistributes their tasks but startup lag increases p99 latency.'
    },
  ]);

  const style = document.createElement('style');
  style.textContent = `.db-cs-box{text-align:center;padding:40px 24px;background:var(--bg2);border:1px dashed var(--border);border-radius:12px}.db-cs-icon{font-size:40px;margin-bottom:12px}.db-cs-box h3{margin-bottom:8px;color:var(--text)}.db-cs-box p{color:var(--text2);font-size:13px;max-width:480px;margin:0 auto;line-height:1.6}`;
  container.appendChild(style);
}
