import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M12 · Operations',
    title: 'Cost & Performance',
    subtitle: 'DBU pricing, cluster rightsizing, spot vs on-demand, cost attribution',
    tabs: [
      { id: 'overview', label: '💰 Overview' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-overview').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Cost & Performance Optimization</div>
        <div class="section-desc">Control DBU spend without sacrificing reliability</div>
      </div>
      <div class="db-cs-box">
        <div class="db-cs-icon">💰</div>
        <h3>Full module coming soon</h3>
        <p>Topics: DBU pricing model (how DBU rates vary by cluster type and tier), spot instance strategy (60–80% cost reduction, preemption handling), cluster rightsizing (worker count vs core count vs memory vs SSD), auto-termination, instance pools to reduce startup time, cost attribution via tags, and Databricks cost monitoring with system tables.</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'A Databricks job that used to run in 30 minutes now takes 3 hours. What do you check first?',
      a: '1. Spark UI → Stages: find the longest stage. 2. Check for a data skew: one task takes 10× longer than others — add salting or repartition by a better key. 3. Check for spill: if tasks are spilling to disk (Spark UI → Summary Metrics → Spill), the executor memory is too small — increase driver/executor memory or switch to a memory-optimized instance type. 4. Check for new small-file explosion: if input has grown from 100 files to 100,000, OPTIMIZE the source table. 5. Check shuffle size: a large SortMergeJoin with a skewed key can cause OOM; switch to a broadcast join if one side is <10GB (spark.sql.autoBroadcastJoinThreshold). 6. Check for added Python UDFs — replace with Spark SQL built-ins or Pandas UDFs.'
    },
    {
      q: 'When should you use spot instances and what\'s the right fallback strategy?',
      a: 'Use spot for: batch ETL jobs (interruptible), ML training (checkpoint-based recovery), OPTIMIZE/VACUUM runs. Don\'t use spot for: Structured Streaming jobs (preemption causes checkpoint recovery latency), interactive clusters (kills in-progress notebooks). Fallback strategy: set on-demand as fallback in the cluster\'s spot bid configuration. Databricks supports mixed pools — e.g., 80% spot workers + 1 on-demand driver. If spot is preempted, Databricks automatically requests on-demand replacements. For critical jobs, use on-demand for the driver and spot for workers — losing a worker triggers task rescheduling; losing the driver kills the job.'
    },
  ]);

  const style = document.createElement('style');
  style.textContent = `.db-cs-box{text-align:center;padding:40px 24px;background:var(--bg2);border:1px dashed var(--border);border-radius:12px}.db-cs-icon{font-size:40px;margin-bottom:12px}.db-cs-box h3{margin-bottom:8px;color:var(--text)}.db-cs-box p{color:var(--text2);font-size:13px;max-width:480px;margin:0 auto;line-height:1.6}`;
  container.appendChild(style);
}
