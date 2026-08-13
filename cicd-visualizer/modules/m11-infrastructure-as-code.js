import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { setupCanvas, palette, loop, drawRoundRect, easeOut, clamp } from '../components/canvas-primitives.js';

export function mount(canvas, { markDone }) {
  const shell = createModuleShell({
    tag: 'Module 11 · Ship & Operate',
    title: 'Infrastructure as Code',
    subtitle: 'Terraform plan reveals 3 resources to add + 1 to change. Apply runs in the CI pipeline.',
    tabs: [
      { id: 'anim',    label: '▶ Animation' },
      { id: 'concept', label: '📖 Concept' },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ],
  });

  const panels = shell.querySelectorAll('.tab-panel');
  const animPanel    = panels[0];
  const conceptPanel = panels[1];
  const iqPanel      = panels[2];

  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const cvs = document.createElement('canvas'); cvs.className = 'stage-canvas';
  wrap.appendChild(cvs);
  const ctrl = document.createElement('div'); ctrl.className = 'canvas-controls';
  const replayBtn = document.createElement('button');
  replayBtn.className = 'btn'; replayBtn.textContent = '↺ Replay';
  ctrl.appendChild(replayBtn);
  const cap = document.createElement('p'); cap.className = 'caption';
  cap.textContent = 'Left: terraform plan output streams. Right: resource boxes appear as created or changed.';
  animPanel.appendChild(wrap); animPanel.appendChild(ctrl); animPanel.appendChild(cap);

  const PLAN_LINES = [
    { text: '# aws_ecr_repository.fraud_score',  type: 'add',  t: 0.05 },
    { text: '+ resource will be created',         type: 'add',  t: 0.10 },
    { text: '# aws_ecs_service.fraud_score',      type: 'add',  t: 0.18 },
    { text: '+ resource will be created',         type: 'add',  t: 0.23 },
    { text: '# aws_cloudwatch_alarm.err_rate',    type: 'chg',  t: 0.30 },
    { text: '~ threshold: 2 -> 1.5',              type: 'chg',  t: 0.35 },
    { text: '# aws_iam_role.fraud_task_role',     type: 'add',  t: 0.43 },
    { text: '+ resource will be created',         type: 'add',  t: 0.48 },
    { text: 'Plan: 3 to add, 1 to change',        type: 'sum',  t: 0.56 },
    { text: 'Applying...',                         type: 'sum',  t: 0.64 },
    { text: 'Apply complete! 3 added, 1 changed', type: 'done', t: 0.80 },
  ];
  const RESOURCES = [
    { label: 'ECR repo',    detail: 'fraud-score',      color: '#3B82F6', t: 0.10 },
    { label: 'ECS service', detail: 'fraud-score svc',  color: '#10B981', t: 0.25 },
    { label: 'CW Alarm',    detail: 'err_rate < 1.5%',  color: '#F59E0B', t: 0.38 },
    { label: 'IAM role',    detail: 'fraud_task_role',  color: '#8B5CF6', t: 0.50 },
  ];

  function runAnim() {
    const { ctx, w, h } = setupCanvas(cvs, 320);
    let prog = 0, done = false;
    const stop = loop((dt) => {
      if (done) return;
      prog = Math.min(1, prog + dt / 7000);
      const p = palette();
      ctx.clearRect(0, 0, w, h);

      const splitX = w * 0.48, leftW = splitX - 20;
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; drawRoundRect(ctx, 12, 12, leftW, h - 24, 8); ctx.fill();
      ctx.fillStyle = p.muted; ctx.font = '600 11px monospace';
      ctx.fillText('🗘 terraform plan / apply', 22, 30);

      PLAN_LINES.filter(l => prog >= l.t).forEach((line, i) => {
        const color = line.type === 'add' ? '#10B981' : line.type === 'chg' ? '#F59E0B' : line.type === 'done' ? '#10B981' : p.fg;
        ctx.fillStyle = color; ctx.font = '10px monospace';
        ctx.fillText(line.text, 20, 48 + i * 19);
      });

      const rsX = splitX + 8, rsW = w - splitX - 20;
      ctx.fillStyle = p.muted; ctx.font = '600 11px sans-serif'; ctx.fillText('AWS resources', rsX, 26);

      const rH = 48;
      RESOURCES.forEach((res, i) => {
        if (prog < res.t) return;
        const ra = easeOut(clamp((prog - res.t) / 0.10, 0, 1));
        const ry = 36 + i * (rH + 8);
        ctx.globalAlpha = ra;
        ctx.fillStyle = res.color + '18'; drawRoundRect(ctx, rsX, ry, rsW, rH, 7); ctx.fill();
        ctx.strokeStyle = res.color; ctx.lineWidth = 1.5; drawRoundRect(ctx, rsX, ry, rsW, rH, 7); ctx.stroke();
        ctx.fillStyle = res.color; ctx.font = '700 11px sans-serif';
        ctx.fillText((res.color === '#F59E0B' ? '~ ' : '+ ') + res.label, rsX + 8, ry + 19);
        ctx.fillStyle = p.muted; ctx.font = '10px sans-serif'; ctx.fillText(res.detail, rsX + 8, ry + 35);
        ctx.globalAlpha = 1;
      });

      if (prog >= 0.80) {
        const ba = easeOut(clamp((prog - 0.80) / 0.10, 0, 1)); ctx.globalAlpha = ba;
        ctx.fillStyle = '#10B98130'; drawRoundRect(ctx, 16, h - 34, w - 32, 26, 6); ctx.fill();
        ctx.fillStyle = '#10B981'; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('✅ Apply complete! 3 added, 1 changed — infrastructure is code', w / 2, h - 16);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }
      if (prog >= 1 && !done) { done = true; markDone(); }
    });
    replayBtn.onclick = () => { prog = 0; done = false; };
    return stop;
  }

  let stopAnim = null;
  initTabs(shell, (idx) => {
    if (idx === 0) { if (!stopAnim) stopAnim = runAnim(); }
    else if (stopAnim) { stopAnim(); stopAnim = null; }
  });
  stopAnim = runAnim();

  conceptPanel.innerHTML = `<div class="prose">
    <h3>What is Infrastructure as Code?</h3>
    <p>IaC means describing your AWS resources (ECR repo, ECS service, IAM role, CloudWatch alarms)
    in version-controlled Terraform HCL files rather than clicking through the console. The files
    live in git, are reviewed in PRs, and are applied by the CI pipeline.</p>
    <h3>terraform plan</h3>
    <p>Before making any changes, Terraform compares the desired state (your .tf files) against the
    current state (a state file in S3). It prints a diff: "3 to add, 1 to change, 0 to destroy."
    The plan runs on every PR so reviewers see exactly what will change.</p>
    <h3>terraform apply in CI</h3>
    <p>On merge to main, the pipeline runs <code>terraform apply -auto-approve</code> using an IAM
    role assumed via OIDC with GitHub Actions — no human credentials stored in secrets.</p>
    <h3>State management</h3>
    <p>Terraform state is stored in an S3 bucket with a DynamoDB lock table to prevent two pipeline
    runs from applying simultaneously and corrupting state.</p>
  </div>`;

  iqPanel.appendChild(createIQSection([
    { q: 'What is the difference between terraform plan and apply?', a: 'Plan is a dry run showing what would change. Apply executes it. In CI you run plan on PR and apply on merge to main, with human review gating the apply.' },
    { q: 'What is Terraform state?', a: 'A JSON file mapping your .tf resources to real AWS resources. It\'s the source of truth for what Terraform has created. Stored in S3 with DynamoDB locking so pipelines share the same view.' },
    { q: 'What is the OIDC GitHub Actions + IAM role pattern?', a: 'GitHub Actions requests a signed OIDC token from GitHub\'s identity provider. AWS STS validates it and issues temporary credentials. Zero long-lived access keys stored in GitHub.' },
    { q: 'What does idempotent mean in the context of IaC?', a: 'Running terraform apply twice produces the same result as once. If the resource matches the desired state, Terraform makes no changes. This makes pipelines safe to re-run.' },
    { q: 'What is drift detection?', a: 'Drift is when real infrastructure diverges from the Terraform state — e.g. someone manually changed a security group. A scheduled terraform plan in CI detects and alerts on drift.' },
  ]));
  initIQ(shell);

  canvas.replaceWith(shell);
  return () => { if (stopAnim) stopAnim(); };
}
