export function mount(container) {
  container.innerHTML = `
    <div class="welcome-screen">
      <div style="font-size:64px">🔌</div>
      <h2 class="welcome-title" style="font-size:30px;margin-top:20px">Connectors</h2>
      <p class="welcome-sub">Full interactive simulation coming in a future iteration.</p>
      <div class="welcome-meta">
        <span class="badge badge-orange">Coming Soon</span>
      </div>
    </div>`;
}
