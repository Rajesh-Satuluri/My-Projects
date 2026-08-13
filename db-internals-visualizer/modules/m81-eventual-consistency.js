export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🌊</div>
    <h3>Eventual Consistency</h3>
    <p>All replicas converge eventually — the model behind Amazon's shopping cart and DynamoDB.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Distributed — Full animation coming soon</p>
  </div>`;
  return null;
}
