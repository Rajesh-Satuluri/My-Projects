export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🔄</div>
    <h3>Synchronous Replication</h3>
    <p>Wait for N replicas to acknowledge — strong durability at the cost of higher write latency.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Distributed — Full animation coming soon</p>
  </div>`;
  return null;
}
