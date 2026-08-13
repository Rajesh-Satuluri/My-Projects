export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🔄</div>
    <h3>Table Scan</h3>
    <p>Sequential read through every page in a heap file — when it's faster than an index, and when it kills performance.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Query Engine — Full animation coming soon</p>
  </div>`;
  return null;
}
