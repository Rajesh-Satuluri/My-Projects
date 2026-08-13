import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { setupCanvas, palette, loop, drawRoundRect, drawArrow, easeOut, clamp } from '../components/canvas-primitives.js';

export function mount(canvas, { markDone }) {
  const shell = createModuleShell({
    tag: 'Module 12 · Ship & Operate',
    title: 'Interview Simulator',
    subtitle: 'Full CI/CD pipeline overview + 20 interview Q&As covering all 12 modules.',
    tabs: [
      { id: 'anim', label: '📈 Pipeline Map' },
      { id: 'iq',   label: '🎯 20 Questions' },
    ],
  });

  const panels = shell.querySelectorAll('.tab-panel');
  const animPanel = panels[0];
  const iqPanel   = panels[1];

  // Pipeline Map
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const cvs = document.createElement('canvas'); cvs.className = 'stage-canvas';
  wrap.appendChild(cvs);
  const cap = document.createElement('p'); cap.className = 'caption';
  cap.textContent = 'All 12 stages of the OrderFlow CI/CD pipeline.';
  animPanel.appendChild(wrap); animPanel.appendChild(cap);

  const STAGES = [
    { label: 'Source',        icon: '🗂', color: '#10B981' },
    { label: 'CI Trigger',    icon: '⚙️',  color: '#10B981' },
    { label: 'Build & Test',  icon: '🧪', color: '#3B82F6' },
    { label: 'Docker Build',  icon: '📦', color: '#3B82F6' },
    { label: 'Push ECR',      icon: '☁️',  color: '#3B82F6' },
    { label: 'Deploy Dev',    icon: '💻', color: '#8B5CF6' },
    { label: 'Gate: Staging', icon: '🔬', color: '#F59E0B' },
    { label: 'Scan Secrets',  icon: '🔐', color: '#EF4444' },
    { label: 'Data Tests',    icon: '🗄️', color: '#F59E0B' },
    { label: 'Gate: Prod',    icon: '👤', color: '#EF4444' },
    { label: 'Canary Deploy', icon: '🚦', color: '#10B981' },
    { label: 'Observe',       icon: '📡', color: '#10B981' },
  ];

  function runAnim() {
    const { ctx, w, h } = setupCanvas(cvs, 290);
    let prog = 0, done = false;
    const stop = loop((dt) => {
      if (done) return;
      prog = Math.min(1, prog + dt / 4500);
      const p = palette();
      ctx.clearRect(0, 0, w, h);

      const cols = 6, nodeW = (w - 32 - (cols - 1) * 10) / cols;
      const nodeH = 54, startY = 32, xStep = nodeW + 10, yStep = nodeH + 28;

      STAGES.forEach((st, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const nx = 16 + col * xStep, ny = startY + row * yStep;
        const alpha = easeOut(clamp((prog - (i / STAGES.length) * 0.85) / 0.12, 0, 1));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = st.color + '18'; drawRoundRect(ctx, nx, ny, nodeW, nodeH, 7); ctx.fill();
        ctx.strokeStyle = st.color; ctx.lineWidth = 1.5; drawRoundRect(ctx, nx, ny, nodeW, nodeH, 7); ctx.stroke();
        ctx.fillStyle = st.color; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(st.icon, nx + nodeW / 2, ny + 22);
        ctx.fillStyle = p.fg; ctx.font = '600 9px sans-serif';
        ctx.fillText(st.label, nx + nodeW / 2, ny + 38);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;

        if (alpha > 0.1 && i < STAGES.length - 1) {
          const nc = (i + 1) % cols, nr = Math.floor((i + 1) / cols);
          const nx2 = 16 + nc * xStep, ny2 = startY + nr * yStep;
          ctx.globalAlpha = clamp((prog - ((i + 1) / STAGES.length) * 0.85) / 0.12, 0, 1);
          if (nr === row) {
            drawArrow(ctx, nx + nodeW + 2, ny + nodeH / 2, nx2 - 2, ny2 + nodeH / 2, p.muted, 1.2);
          } else {
            ctx.strokeStyle = p.muted; ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(nx + nodeW / 2, ny + nodeH);
            ctx.lineTo(nx + nodeW / 2, ny + nodeH + 8);
            ctx.lineTo(nx2 + nodeW / 2, ny + nodeH + 8);
            ctx.lineTo(nx2 + nodeW / 2, ny2); ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      });

      // Travelling dot
      if (prog > 0.05) {
        const pIdx = Math.min(STAGES.length - 1, Math.floor(prog * STAGES.length * 0.9));
        const col = pIdx % cols, row = Math.floor(pIdx / cols);
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(16 + col * xStep + nodeW / 2, startY + row * yStep + nodeH / 2, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Legend
      const legendY = startY + 2 * yStep + 8;
      [['Foundation','#10B981'],['Package','#3B82F6'],['Promote','#F59E0B'],['Ship','#8B5CF6']].forEach(([g, c], i) => {
        const lx = 16 + i * (w - 32) / 4;
        ctx.fillStyle = c; ctx.fillRect(lx, legendY, 10, 10);
        ctx.fillStyle = p.muted; ctx.font = '10px sans-serif'; ctx.fillText(g, lx + 14, legendY + 10);
      });

      if (prog >= 1 && !done) { done = true; markDone(); }
    });
    return stop;
  }

  let stopAnim = null;
  initTabs(shell, (idx) => {
    if (idx === 0) { if (!stopAnim) stopAnim = runAnim(); }
    else if (stopAnim) { stopAnim(); stopAnim = null; }
  });
  stopAnim = runAnim();

  // 20 Questions
  iqPanel.appendChild(createIQSection([
    { q: 'What is the difference between CI and CD?', a: 'CI automatically builds and tests every push. CD is either Continuous Delivery (code is always releasable, deploy is manual) or Continuous Deployment (every passing build auto-deploys to production).' },
    { q: 'What is trunk-based development?', a: 'All developers commit to a single main branch via short-lived feature branches (< 1 day). It avoids long-running branches and merge conflicts, and is the prerequisite for true continuous deployment.' },
    { q: 'What triggers a GitHub Actions workflow?', a: 'Events: push, pull_request, workflow_dispatch (manual), schedule (cron), repository_dispatch. You can filter on branch name, file paths changed, or PR labels.' },
    { q: 'What is a GitHub Actions runner?', a: 'The compute that executes jobs. GitHub-hosted runners (ubuntu-latest) are ephemeral VMs. Self-hosted runners are your own machines registered for private network access or cost savings.' },
    { q: 'What is a Docker multi-stage build?', a: 'A Dockerfile with multiple FROM instructions. An early stage compiles code; a later stage copies only the binary into a slim base image. Final image is much smaller because build tools are discarded.' },
    { q: 'What is ECR image scanning?', a: 'ECR scans images for OS and library CVEs using Amazon Inspector. You can configure the pipeline to fail if a HIGH severity vulnerability is found before the image is deployed.' },
    { q: 'What is GitOps?', a: 'The desired state of infrastructure and deployments is declared in git. An agent (ArgoCD, Flux) continuously reconciles the cluster to match the git state. Git is the single source of truth.' },
    { q: 'What is a GitHub Actions environment?', a: 'An environment (e.g. production) can have protection rules: required reviewers, wait timers, branch filters. A job targeting the environment is paused until rules are satisfied — this is how manual approval gates work.' },
    { q: 'What is a Terraform workspace?', a: 'A named instance of Terraform state. Different workspaces (dev, staging, prod) maintain independent state files for the same configuration, avoiding duplication.' },
    { q: 'What are the four golden signals of SRE?', a: 'Latency (how long requests take), Traffic (demand on the system), Errors (rate of failed requests), and Saturation (how full the system is). Alerts on these catch most production issues.' },
    { q: 'How do you handle database schema migrations in CI/CD?', a: 'Run migrations before deploying the new application version (for backward-compatible changes) or use expand-contract: first add the new column, deploy, then drop the old column in a second deploy.' },
    { q: 'What is a dead-letter queue?', a: 'Capturing messages that repeatedly fail processing. Instead of crashing or losing data, failed records are routed to the DLQ for inspection and reprocessing.' },
    { q: 'What is DORA\'s deployment frequency metric?', a: 'Elite performers deploy to production multiple times per day. The other DORA metrics are lead time for changes, change failure rate, and mean time to restore.' },
    { q: 'What is a feature branch vs a release branch?', a: 'A feature branch is short-lived (hours/days) branched from main. A release branch cuts from main at a point in time, receives only bug fixes, and is deployed as a stable release.' },
    { q: 'How do you prevent secrets from reaching git?', a: 'Pre-commit hooks with detect-secrets or gitleaks scan staged changes locally. CI adds a second layer. GitHub secret scanning adds a third, post-push layer.' },
    { q: 'What is immutable infrastructure?', a: 'Never mutate running servers; build a new image and replace old instances. Docker + ECS embodies this: every deploy creates a new task from an immutable image tag. Rollback is running the previous tag.' },
    { q: 'What is SLA vs SLO vs SLI?', a: 'SLI is a metric (e.g. error rate). SLO is a target on an SLI (e.g. error rate < 0.1%). SLA is a contractual commitment, often with financial penalties for breaches.' },
    { q: 'What does "shift left" mean in CI/CD?', a: 'Moving quality checks (security scans, linting, type checking, unit tests) earlier in development — to the developer\'s laptop and PR stage — rather than finding issues late in integration or production.' },
    { q: 'How does OIDC replace long-lived AWS credentials in GitHub Actions?', a: 'GitHub Actions requests a signed OIDC token. AWS STS validates it against a configured IAM OIDC provider and issues temporary credentials. No access keys stored anywhere.' },
    { q: 'What is a rollback vs a roll-forward?', a: 'Rollback reverts to the previous known-good version immediately (fast, for critical outages). Roll-forward deploys a hotfix on top of the broken version (preferred when rollback would lose data or break backward compat).' },
  ]));
  initIQ(shell);

  canvas.replaceWith(shell);
  return () => { if (stopAnim) stopAnim(); };
}
