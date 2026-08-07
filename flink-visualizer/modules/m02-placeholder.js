export function mount(container) {
  container.innerHTML = `
    <div class="welcome-screen">
      <div style="font-size:64px">🌊</div>
      <h2 class="welcome-title" style="font-size:30px;margin-top:20px">Streaming Fundamentals</h2>
      <p class="welcome-sub">Batch vs Micro-batch vs True Streaming — with live event river simulation.<br>Coming in Iteration 2.</p>
      <div class="welcome-meta">
        <span class="badge badge-blue">Event River Animation</span>
        <span class="badge badge-green">Speed Control</span>
        <span class="badge badge-orange">Time Mode Toggle</span>
      </div>
    </div>`;
}
