export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🐟</div>
    <h3>Raft Concepts</h3>
    <p>Leader election, log replication, safety — the understandable consensus algorithm used in etcd and TiKV.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Distributed — Full animation coming soon</p>
  </div>`;
  return null;
}
