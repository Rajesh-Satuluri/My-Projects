export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">♻️</div>
    <h3>Buffer Pool Replacement</h3>
    <p>LRU, Clock, LRU-K — which frame to evict when the buffer pool is full during a Prime Day traffic spike.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Storage Engine — Full animation coming soon</p>
  </div>`;
  return null;
}
