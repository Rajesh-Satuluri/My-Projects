export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">💿</div>
    <h3>Disk I/O</h3>
    <p>fsync, O_DIRECT, DMA — how data actually reaches disk and what 'durable' really means for Amazon's payment records.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Storage Engine — Full animation coming soon</p>
  </div>`;
  return null;
}
