export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">⏳</div>
    <h3>Asynchronous Replication</h3>
    <p>Commit locally, replicate later — lower latency, but replicas can lag behind.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Distributed — Full animation coming soon</p>
  </div>`;
  return null;
}
