export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">📋</div>
    <h3>Logical Plan</h3>
    <p>The relational algebra tree the optimizer works with — order-independent, no physical operators yet.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Query Engine — Full animation coming soon</p>
  </div>`;
  return null;
}
