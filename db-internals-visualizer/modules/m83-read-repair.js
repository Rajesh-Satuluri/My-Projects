export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🔧</div>
    <h3>Read Repair</h3>
    <p>Fix stale replicas lazily during reads — a background convergence mechanism.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Distributed — Full animation coming soon</p>
  </div>`;
  return null;
}
