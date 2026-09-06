import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M05 · Compute',
    title: 'Photon Engine',
    subtitle: 'Vectorized C++ engine — column batches, cache-friendly ops, vs JVM Spark',
    tabs: [
      { id: 'overview', label: '⚡ Overview' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-overview').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Photon Engine</div>
        <div class="section-desc">Why rewriting Spark's execution layer in C++ made queries 2–4× faster</div>
      </div>
      <div class="db-cs-box">
        <div class="db-cs-icon">⚡</div>
        <h3>Full module coming soon</h3>
        <p>Topics: Vectorized execution model (column batches vs row-at-a-time), SIMD CPU instructions, cache-friendly memory layout, JVM overhead elimination, which operators are Photon-native, query plan stages, and benchmark comparisons against vanilla Spark and Trino.</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is vectorized execution and why is it faster than row-at-a-time processing?',
      a: 'Vectorized execution processes data in column-oriented batches (e.g., 1,024 rows at once for a single column) rather than one complete row at a time. Benefits: (1) CPU SIMD instructions (AVX-512) apply one operation to 8–16 values simultaneously; (2) a column of integers is contiguous in memory — cache-friendly, no pointer chasing; (3) tight C++ loops with no JVM overhead (no GC pauses, no boxing of primitives). JVM Spark processes each row through a virtual function dispatch chain — slow for tight aggregation loops. Photon re-implements operators (scan, filter, hash join, aggregate) in native C++ with vectorized loops, yielding 2–4× speedups on SQL-heavy workloads.'
    },
    {
      q: 'Which workloads benefit most from Photon, and which do not?',
      a: 'Photon shines on SQL/BI workloads: large scans with filters, hash aggregations (GROUP BY), hash joins, and sort operations — all hot paths in Photon\'s vectorized operators. It also speeds up Delta MERGE and OPTIMIZE. Photon does NOT help with: (1) Python UDFs — Python code runs outside Photon, serialization is the bottleneck; (2) complex Spark ML pipelines (e.g., gradient boosting iterations); (3) custom RDD operations written in Scala. The rule of thumb: if the query plan shows mostly standard SQL operators (Scan, HashAggregate, SortMergeJoin), Photon will accelerate it. If the plan has PythonUDF or ArrowEvalPython nodes, Photon\'s impact is minimal.'
    },
  ]);

  const style = document.createElement('style');
  style.textContent = `.db-cs-box{text-align:center;padding:40px 24px;background:var(--bg2);border:1px dashed var(--border);border-radius:12px}.db-cs-icon{font-size:40px;margin-bottom:12px}.db-cs-box h3{margin-bottom:8px;color:var(--text)}.db-cs-box p{color:var(--text2);font-size:13px;max-width:480px;margin:0 auto;line-height:1.6}`;
  container.appendChild(style);
}
