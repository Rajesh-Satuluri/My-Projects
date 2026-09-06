export const MODULES = [
  // ── Foundation ──────────────────────────────────────────────────────────
  { id:'m01', label:'Why Databricks',        icon:'🏗️', group:'Foundation',        desc:'From Spark\'s academic roots to the Lakehouse — why Databricks exists' },
  { id:'m02', label:'Lakehouse Architecture',icon:'🏛️', group:'Foundation',        desc:'Data warehouse + data lake unified: Delta Lake, Unity Catalog, Photon' },
  { id:'m03', label:'Delta Lake Internals',  icon:'Δ',  group:'Foundation',        desc:'Transaction log, snapshots, schema enforcement, ACID on object storage' },
  // ── Compute ─────────────────────────────────────────────────────────────
  { id:'m04', label:'Clusters & Runtimes',   icon:'⚙️', group:'Compute',           desc:'All-purpose vs job clusters, Databricks Runtime, autoscaling, spot nodes' },
  { id:'m05', label:'Photon Engine',         icon:'⚡', group:'Compute',           desc:'Vectorized C++ engine — column batches, cache-friendly ops, vs JVM Spark' },
  { id:'m06', label:'Structured Streaming',  icon:'🌊', group:'Compute',           desc:'Micro-batch and continuous processing, triggers, watermarks, checkpointing' },
  // ── Storage & Governance ─────────────────────────────────────────────────
  { id:'m07', label:'Unity Catalog',         icon:'🗂️', group:'Governance',        desc:'3-level namespace, fine-grained access, data lineage, Delta Sharing' },
  { id:'m08', label:'Medallion Architecture',icon:'🥇', group:'Governance',        desc:'Bronze → Silver → Gold: incremental refinement at Amazon\'s data lake' },
  { id:'m09', label:'Delta Optimizations',   icon:'🗜️', group:'Governance',        desc:'OPTIMIZE, ZORDER, liquid clustering, vacuum, auto-compaction' },
  // ── Jobs & Orchestration ─────────────────────────────────────────────────
  { id:'m10', label:'Workflows & Jobs',      icon:'📋', group:'Orchestration',     desc:'Multi-task jobs, task dependencies, parameters, retries, alerts' },
  { id:'m11', label:'MLflow & Model Serving',icon:'🤖', group:'Orchestration',     desc:'Experiment tracking, model registry, real-time serving endpoints' },
  // ── Operations ──────────────────────────────────────────────────────────
  { id:'m12', label:'Cost & Performance',    icon:'💰', group:'Operations',        desc:'DBU pricing, cluster rightsizing, spot vs on-demand, cost attribution' },
  { id:'m13', label:'Interview Q&A',         icon:'🎯', group:'Operations',        desc:'Senior / staff level Databricks & Lakehouse interview prep' },
];

const GROUP_ORDER = ['Foundation', 'Compute', 'Governance', 'Orchestration', 'Operations'];

export function renderNav(activeId, done) {
  const nav = document.getElementById('nav-list');
  if (!nav) return;
  const groups = {};
  MODULES.forEach(m => {
    if (!groups[m.group]) groups[m.group] = [];
    groups[m.group].push(m);
  });
  nav.innerHTML = GROUP_ORDER.map(g => `
    <div class="nav-group">
      <div class="nav-group-label">${g}</div>
      ${(groups[g] || []).map(m => `
        <a href="#${m.id}" class="nav-item${m.id === activeId ? ' active' : ''}${done.has(m.id) ? ' done' : ''}" data-id="${m.id}">
          <span class="nav-icon">${m.icon}</span>
          <span class="nav-label">${m.label}</span>
          ${done.has(m.id) ? '<span class="nav-check">✓</span>' : ''}
        </a>
      `).join('')}
    </div>
  `).join('');
}

export function updateProgress(done) {
  const fill = document.getElementById('progress-fill');
  const count = document.getElementById('progress-count');
  if (fill) fill.style.width = `${(done.size / MODULES.length) * 100}%`;
  if (count) count.textContent = `${done.size} / ${MODULES.length}`;
}
