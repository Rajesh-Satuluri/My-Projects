import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M10 · Orchestration',
    title: 'Workflows & Jobs',
    subtitle: 'Multi-task jobs, task dependencies, parameters, retries, alerts',
    tabs: [
      { id: 'overview', label: '📋 Overview' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-overview').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Databricks Workflows & Jobs</div>
        <div class="section-desc">Production-grade orchestration built into the Lakehouse platform</div>
      </div>
      <div class="db-cs-box">
        <div class="db-cs-icon">📋</div>
        <h3>Full module coming soon</h3>
        <p>Topics: multi-task job DAGs with task dependencies, task types (notebook, Python script, Delta Live Tables pipeline, SQL query, dbt), parameterization with job parameters and dynamic value references, retry policies, email/webhook alerts, job clusters vs existing clusters, and cost attribution via tags.</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'How do Databricks Workflows compare to Apache Airflow for orchestration?',
      a: 'Databricks Workflows is tightly integrated with the Lakehouse: job clusters spin up automatically, Delta Live Tables pipelines are first-class task types, and Unity Catalog lineage is tracked per job run. No separate orchestration infrastructure to manage. Airflow is more flexible for cross-system orchestration (trigger a Databricks job, then an S3 upload, then an API call) and has a larger operator ecosystem. Common pattern: Airflow for cross-system workflows with a DatabricksSubmitRunOperator to trigger Databricks jobs as subtasks, while Databricks Workflows handles all intra-platform dependencies (Bronze → Silver → Gold pipeline).'
    },
    {
      q: 'How do you pass parameters between tasks in a Databricks multi-task job?',
      a: 'Use task values: in an upstream task, dbutils.jobs.taskValues.set(key="output_path", value="/mnt/silver/orders/2024-01-15"). In a downstream task, dbutils.jobs.taskValues.get(taskKey="bronze_ingest", key="output_path"). Task values are strings serialized to the job\'s run state — available to all downstream tasks. For job-level parameters (e.g., run date), pass them as job parameters ({{job.parameters.run_date}}) at job invocation time. These work in notebook widgets, Python argparse, and SQL queries via {{run_date}}. Avoid using shared S3 paths or notebooks as message passing — task values are the proper mechanism.'
    },
  ]);

  const style = document.createElement('style');
  style.textContent = `.db-cs-box{text-align:center;padding:40px 24px;background:var(--bg2);border:1px dashed var(--border);border-radius:12px}.db-cs-icon{font-size:40px;margin-bottom:12px}.db-cs-box h3{margin-bottom:8px;color:var(--text)}.db-cs-box p{color:var(--text2);font-size:13px;max-width:480px;margin:0 auto;line-height:1.6}`;
  container.appendChild(style);
}
