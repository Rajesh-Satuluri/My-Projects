export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">💪</div>
    <h3>Strong Consistency</h3>
    <p>Every read reflects the latest committed write — used for payments and inventory, never for recommendations.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Distributed — Full animation coming soon</p>
  </div>`;
  return null;
}
