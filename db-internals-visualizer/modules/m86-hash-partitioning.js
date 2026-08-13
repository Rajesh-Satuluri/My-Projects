export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🔢</div>
    <h3>Hash Partitioning</h3>
    <p>Hash the key, pick the shard — uniform distribution but no range queries.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Distributed — Full animation coming soon</p>
  </div>`;
  return null;
}
