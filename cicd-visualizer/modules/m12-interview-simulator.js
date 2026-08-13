import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { setupCanvas, palette, loop, drawRoundRect, drawArrow, easeOut, clamp } from '../components/canvas-primitives.js';

export function mount(canvas, { markDone }) {
  const shell = createModuleShell({
    tag: 'Module 12 · Ship & Operate',
    title: 'Interview Simulator',
    subtitle: 'Full CI/CD pipeline overview + 20 interview Q&As covering all 12 modules.',
    tabs: [
      { id: 'anim', label: '📈 Pipeline Map' },
      { id: 'iq', label: '🎯 20 Questions' },
    ],
  });

  // ── Pipeline Map (animation canvas) ──
  const wrap = document.createElement('div');
  wrap.className = 'canvas-wrap';
  const cvs = document.createElement('canvas');
  cvs.className = 'stage-canvas';
  wrap.appendChild(cvs);
  const cap = document.createElement('p');
  cap.className = 'caption';
  cap.textContent = 'All 12 stages of the OrderFlow CI/CD pipeline — hover or scroll to explore.';
  wrap.appendChild(cap);
  const animPanel = shell.querySelector('[data-panel="anim"]');
  animPanel.appendChild(wrap);

  const STAGES = [
    { label: 'Source',        icon: '🗂', color: '#10B981', group: 'Foundation' },
    { label: 'CI Trigger',    icon: '⚙️',  color: '#10B981', group: 'Foundation' },
    { label: 'Build & Test',  icon: '🧪', color: '#3B82F6', group: 'Foundation' },
    { label: 'Docker Build',  icon: '📦', color: '#3B82F6', group: 'Package' },
    { label: 'Push ECR',      icon: '☁️',  color: '#3B82F6', group: 'Package' },
    { label: 'Deploy Dev',    icon: '💻', color: '#8B5CF6', group: 'Promote' },
    { label: 'Gate: Staging', icon: '🔬', color: '#F59E0B', group: 'Promote' },
    { label: 'Scan Secrets',  icon: '🔐', color: '#EF4444', group: 'Promote' },
    { label: 'Data Tests',    icon: '🗄️', color: '#F59E0B', group: 'Promote' },
    { label: 'Gate: Prod',    icon: '👤', color: '#EF4444', group: 'Ship' },
    { label: 'Canary Deploy', icon: '🚦', color: '#10B981', group: 'Ship' },
    { label: 'Observe',       icon: '📡', color: '#10B981', group: 'Ship' },
  ];

  function runAnim() {
    const { ctx, w, h } = setupCanvas(cvs, 290);
    let prog = 0, done = false;
    const stop = loop((dt) => {
      if (done) return;
      prog = Math.min(1, prog + dt / 4500);

      const p = palette();
      ctx.clearRect(0, 0, w, h);

      const cols = 6;
      const rows = 2;
      const nodeW = (w - 32 - (cols - 1) * 10) / cols;
      const nodeH = 54;
      const startY = 32;
      const xStep = nodeW + 10;
      const yStep = nodeH + 28;

      STAGES.forEach((st, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const nx = 16 + col * xStep;
        const ny = startY + row * yStep;
        const appeared = prog >= (i / STAGES.length) * 0.85;
        const alpha = appeared ? easeOut(clamp((prog - (i / STAGES.length) * 0.85) / 0.12, 0, 1)) : 0;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = st.color + '18';
        drawRoundRect(ctx, nx, ny, nodeW, nodeH, 7);
        ctx.fill();
        ctx.strokeStyle = st.color;
        ctx.lineWidth = 1.5;
        drawRoundRect(ctx, nx, ny, nodeW, nodeH, 7);
        ctx.stroke();

        ctx.fillStyle = st.color;
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(st.icon, nx + nodeW / 2, ny + 22);
        ctx.fillStyle = p.fg;
        ctx.font = '600 9px sans-serif';
        ctx.fillText(st.label, nx + nodeW / 2, ny + 38);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;

        // Arrow to next
        if (appeared && i < STAGES.length - 1) {
          const nextCol = (i + 1) % cols;
          const nextRow = Math.floor((i + 1) / cols);
          const nx2 = 16 + nextCol * xStep;
          const ny2 = startY + nextRow * yStep;
          const arrowAlpha = clamp((prog - ((i + 1) / STAGES.length) * 0.85) / 0.12, 0, 1);
          ctx.globalAlpha = arrowAlpha;

          if (nextRow === row) {
            // Same row: horizontal arrow
            drawArrow(ctx, nx + nodeW + 2, ny + nodeH / 2, nx2 - 2, ny2 + nodeH / 2, p.muted, 1.2);
          } else {
            // Row wrap: L-shaped arrow down then right
            const midX = nx + nodeW / 2;
            ctx.strokeStyle = p.muted;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(midX, ny + nodeH);
            ctx.lineTo(midX, ny + nodeH + 8);
            ctx.lineTo(nx2 + nodeW / 2, ny + nodeH + 8);
            ctx.lineTo(nx2 + nodeW / 2, ny2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      });

      // Packet
      if (prog > 0.05) {
        const pIdx = Math.min(STAGES.length - 1, Math.floor(prog * STAGES.length * 0.9));
        const st = STAGES[pIdx];
        const col = pIdx % cols;
        const row = Math.floor(pIdx / cols);
        const nx = 16 + col * xStep + nodeW / 2;
        const ny = startY + row * yStep + nodeH / 2;
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(nx, ny, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Legend
      const legendY = startY + rows * yStep + 8;
      const groups = ['Foundation', 'Package', 'Promote', 'Ship'];
      const gColors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];
      groups.forEach((g, i) => {
        const lx = 16 + i * (w - 32) / 4;
        ctx.fillStyle = gColors[i];
        ctx.fillRect(lx, legendY, 10, 10);
        ctx.fillStyle = p.muted;
        ctx.font = '10px sans-serif';
        ctx.fillText(g, lx + 14, legendY + 10);
      });

      if (prog >= 1 && !done) { done = true; markDone(); }
    });
    return stop;
  }

  let stopAnim = null;
  initTabs(shell, (id) => {
    if (id === 'anim') { if (!stopAnim) stopAnim = runAnim(); }
    else if (stopAnim) { stopAnim(); stopAnim = null; }
  });
  stopAnim = runAnim();

  // ── 20 Interview Questions ──
  const iqPanel = shell.querySelector('[data-panel="iq"]');
  const iq = createIQSection([
    { q: 'What is the difference between CI and CD?', a: 'CI (Continuous Integration) automatically builds and tests every code push to catch integration issues early. CD is either Continuous Delivery (code is always releasable, deploy is a human decision) or Continuous Deployment (every passing build auto-deploys to production).' },
    { q: 'What is trunk-based development?', a: 'All developers commit to a single main branch (trunk) via short-lived feature branches (< 1 day). It avoids long-running branches and merge conflicts, and is the prerequisite for true continuous deployment.' },
    { q: 'What triggers a GitHub Actions workflow?', a: 'Events: push, pull_request, workflow_dispatch (manual), schedule (cron), repository_dispatch (external webhook). You can filter on branch name, file paths changed, or PR labels.' },
    { q: 'What is a GitHub Actions runner?', a: 'The compute that executes jobs. GitHub-hosted runners (ubuntu-latest, windows-latest, macos-latest) are ephemeral VMs. Self-hosted runners are your own machines registered with GitHub for private network access or cost savings.' },
    { q: 'What is a Docker multi-stage build?', a: 'A Dockerfile with multiple FROM instructions. An early stage (e.g. builder) compiles code; a later stage copies only the compiled binary into a slim base image. The final image is much smaller because build tools are discarded.' },
    { q: 'What is ECR image scanning?', a: 'ECR can scan images for OS and library CVEs using Clair or Amazon Inspector. You can configure the pipeline to fail if a HIGH severity vulnerability is found before the image is deployed.' },
    { q: 'What is GitOps?', a: 'A pattern where the desired state of infrastructure and application deployments is declared in git. An agent (ArgoCD, Flux) continuously reconciles the cluster to match the git state. Git is the single source of truth.' },
    { q: 'What is a GitHub Actions environment?', a: 'An environment (e.g. production) can have protection rules: required reviewers, wait timers, and branch filters. A job that targets the environment is paused until the rules are satisfied — this is how manual approval gates work.' },
    { q: 'What is a Terraform workspace?', a: 'A named instance of Terraform state. Different workspaces (dev, staging, prod) maintain independent state files for the same configuration, enabling the same HCL to manage multiple environments without duplication.' },
    { q: 'What is the four golden signals of SRE?', a: 'Latency (how long requests take), Traffic (demand on the system), Errors (rate of failed requests), and Saturation (how full the system is). Alerts on these signals catch most production issues.' },
    { q: 'How do you handle database schema migrations in CI/CD?', a: 'Run migrations as a pipeline step before deploying the new application version (for backward-compatible changes) or use expand-contract: first expand (add the new column), deploy, then contract (drop the old column) in a second deploy.' },
    { q: 'What is a dead-letter queue used for?', a: 'Capturing messages that repeatedly fail processing — schema mismatches, downstream timeouts, poison pills. Instead of crashing the consumer or losing data, failed records are routed to the DLQ for inspection and reprocessing.' },
    { q: 'What is DORA\'s key metric for deployment frequency?', a: 'Elite performers deploy to production multiple times per day. The other DORA metrics are lead time for changes, change failure rate, and mean time to restore — together they measure software delivery performance.' },
    { q: 'What is a feature branch vs a release branch?', a: 'A feature branch is short-lived, branched from main for a single task, and merged within hours/days. A release branch cuts from main at a point in time, receives only bug fixes, and is deployed as a stable release — used when you can\'t deploy continuously.' },
    { q: 'How do you prevent secrets from reaching git?', a: 'Pre-commit hooks with tools like detect-secrets or gitleaks scan staged changes locally before commit. CI adds a second layer: the pipeline fails on a secret match. GitHub secret scanning adds a third, post-push layer.' },
    { q: 'What is immutable infrastructure?', a: 'Never mutate running servers; instead, build a new image and replace the old instances. Docker + ECS embodies this: every deploy creates a new task from an immutable image tag. Rollback is running the previous image tag.' },
    { q: 'What is an SLA vs an SLO vs an SLI?', a: 'SLI (Service Level Indicator) is a metric (e.g. error rate). SLO (Service Level Objective) is a target on an SLI (e.g. error rate < 0.1%). SLA (Service Level Agreement) is a contractual commitment, often with financial penalties for breaches.' },
    { q: 'What does "shift left" mean in CI/CD?', a: 'Moving quality checks (security scans, linting, type checking, unit tests) earlier in the development process — to the developer\'s laptop and PR stage — rather than finding issues late in integration or production.' },
    { q: 'How does OIDC replace long-lived AWS credentials in GitHub Actions?', a: 'GitHub Actions can request a signed OIDC token from GitHub\'s identity provider. AWS STS validates the token against a configured IAM OIDC provider and issues temporary credentials. No access keys are stored anywhere.' },
    { q: 'What is a rollback vs a roll-forward?', a: 'Rollback reverts to the previous known-good version immediately (fast, low risk for critical outages). Roll-forward deploys a hotfix on top of the broken version (preferred when rollback would lose data or break backward compat). Most teams default to rollback for speed.' },
  ]);
  iqPanel.appendChild(iq);
  initIQ(shell);

  canvas.replaceWith(shell);
  return () => { if (stopAnim) stopAnim(); };
}
