import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M11 · Orchestration',
    title: 'MLflow & Model Serving',
    subtitle: 'Experiment tracking, model registry, real-time serving endpoints',
    tabs: [
      { id: 'overview', label: '🤖 Overview' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-overview').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">MLflow & Model Serving</div>
        <div class="section-desc">Track experiments → register models → serve with one click</div>
      </div>
      <div class="db-cs-box">
        <div class="db-cs-icon">🤖</div>
        <h3>Full module coming soon</h3>
        <p>Topics: MLflow tracking (run, experiment, metric, param, artifact), Model Registry (Staging/Production aliases), Unity Catalog integration for model governance, Model Serving endpoints (provisioned throughput vs pay-per-token), Feature Store for training/serving consistency, and A/B testing via endpoint traffic splitting.</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is the training-serving skew problem and how does Databricks Feature Store solve it?',
      a: 'Training-serving skew: the feature computation logic used during model training diverges from what\'s computed at inference time — causing silent accuracy degradation in production. Feature Store solves this by defining features once as Python functions, storing precomputed values in a Delta table (offline store), and using the same function definition to compute features at inference time (online store lookup or real-time computation). The model is trained with Feature Store\'s log_model which embeds the feature lookup logic in the model artifact — at serving time, the endpoint automatically retrieves the right features using the same code. One definition, two uses.'
    },
    {
      q: 'How does MLflow Model Registry\'s alias system work in production deployments?',
      a: 'Model Registry stores every logged model version with immutable metadata (run ID, training date, metrics). Aliases are mutable pointers to versions: @champion points to v12 (current production), @challenger points to v13 (being tested). Serving endpoints reference an alias, not a version number — so you can promote v13 to @champion without changing the endpoint configuration. Rollback is instant: point @champion back to v12. In Unity Catalog-integrated registry, models live in catalog.schema.model_name, and GRANT on the model controls who can promote or serve it — the same governance model as tables.'
    },
  ]);

  const style = document.createElement('style');
  style.textContent = `.db-cs-box{text-align:center;padding:40px 24px;background:var(--bg2);border:1px dashed var(--border);border-radius:12px}.db-cs-icon{font-size:40px;margin-bottom:12px}.db-cs-box h3{margin-bottom:8px;color:var(--text)}.db-cs-box p{color:var(--text2);font-size:13px;max-width:480px;margin:0 auto;line-height:1.6}`;
  container.appendChild(style);
}
