export function mount(container) {
  container.innerHTML = `<div class="coming-soon">
    <div class="coming-soon-icon">💭</div>
    <h3>Page Cache</h3>
    <p>OS page cache vs DB buffer pool — why databases bypass the OS cache and manage memory themselves.</p>
    <p style="margin-top:8px;font-size:11px;opacity:.5">Storage Engine — Full animation coming soon</p>
  </div>`;
  return null;
}
