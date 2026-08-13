export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">📏</div>
    <h3>Range Partitioning</h3>
    <p>Split by key range — great for date-range scans but risks hot spots on sequential keys.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Distributed — Full animation coming soon</p>
  </div>`;
  return null;
}
