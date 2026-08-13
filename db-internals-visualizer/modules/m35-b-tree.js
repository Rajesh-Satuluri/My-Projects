export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">🌲</div>
    <h3>B-Tree</h3>
    <p>The original balanced tree — internal nodes store data, height is O(log n), all searches traverse root to leaf.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Storage Engine — Full animation coming soon</p>
  </div>`;
  return null;
}
