export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">👑</div>
    <h3>Leader Election</h3>
    <p>Bully algorithm, Raft election — choosing a single coordinator for writes in a replicated group.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Distributed — Full animation coming soon</p>
  </div>`;
  return null;
}
