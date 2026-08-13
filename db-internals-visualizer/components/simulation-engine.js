/**
 * SimulationEngine — stepped animation controller for DB Internals visualizer.
 * Stub for Iteration 0; full implementation in Iteration 1.
 */
export class SimulationEngine {
  constructor({ initialState, steps, onRender, onMetrics }) {
    this.initialState = initialState;
    this.steps = steps;
    this.onRender = onRender;
    this.onMetrics = onMetrics;
    this._state = null;
    this._step = -1;
    this._playing = false;
    this._timer = null;
  }

  reset() {
    this._stop();
    this._step = -1;
    this._state = JSON.parse(JSON.stringify(this.initialState));
    this._render();
  }

  play() {
    if (this._playing) return;
    this._playing = true;
    this._tick();
  }

  pause() {
    this._stop();
  }

  next() {
    if (this._step < this.steps.length - 1) {
      this._step++;
      this._apply(this.steps[this._step]);
      this._render();
    }
  }

  previous() {
    if (this._step > 0) {
      this._step--;
      this._rebuildTo(this._step);
      this._render();
    }
  }

  _tick() {
    if (!this._playing) return;
    if (this._step >= this.steps.length - 1) {
      this._playing = false;
      return;
    }
    this.next();
    this._timer = setTimeout(() => this._tick(), this.steps[this._step]?.duration ?? 1200);
  }

  _stop() {
    this._playing = false;
    if (this._timer) clearTimeout(this._timer);
    this._timer = null;
  }

  _apply(step) {
    if (step?.mutate) step.mutate(this._state);
  }

  _rebuildTo(targetStep) {
    this._state = JSON.parse(JSON.stringify(this.initialState));
    for (let i = 0; i <= targetStep; i++) {
      if (this.steps[i]?.mutate) this.steps[i].mutate(this._state);
    }
  }

  _render() {
    if (this.onRender) this.onRender(this._state, this._step, this.steps);
    if (this.onMetrics) this.onMetrics(this._state, this._step);
  }

  static renderControls(container, engine) {
    const ctrl = container.querySelector('.canvas-controls');
    if (!ctrl) return;
    ctrl.innerHTML = `
      <button class="ctrl-btn" id="sim-prev">⏮ Prev</button>
      <button class="ctrl-btn" id="sim-play">▶ Play</button>
      <button class="ctrl-btn" id="sim-pause">⏸ Pause</button>
      <button class="ctrl-btn" id="sim-next">Next ⏭</button>
      <button class="ctrl-btn" id="sim-reset">↺ Reset</button>
      <span class="ctrl-label" id="sim-label">Step 0 / ${engine.steps.length}</span>
    `;
    ctrl.querySelector('#sim-prev').addEventListener('click',  () => engine.previous());
    ctrl.querySelector('#sim-play').addEventListener('click',  () => engine.play());
    ctrl.querySelector('#sim-pause').addEventListener('click', () => engine.pause());
    ctrl.querySelector('#sim-next').addEventListener('click',  () => engine.next());
    ctrl.querySelector('#sim-reset').addEventListener('click', () => engine.reset());
  }

  static renderTimeline(container, engine) {
    const tl = container.querySelector('.sim-timeline');
    if (!tl) return;
    tl.innerHTML = engine.steps.map((_, i) =>
      `<div class="sim-step${i < engine._step ? ' done' : i === engine._step ? ' active' : ''}"
            title="Step ${i+1}" data-step="${i}"></div>`
    ).join('');
    tl.querySelectorAll('.sim-step').forEach(el => {
      el.addEventListener('click', () => {
        const target = +el.dataset.step;
        engine._rebuildTo(target);
        engine._step = target;
        engine._render();
      });
    });
  }
}
