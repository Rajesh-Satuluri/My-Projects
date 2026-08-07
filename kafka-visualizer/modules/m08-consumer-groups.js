import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { GlowNode, PulseRing, EventPacket } from '../components/canvas-primitives.js';

const IQ = [
  { q: 'What triggers a consumer group rebalance and what is its impact?', a: 'Rebalance triggers: (1) Consumer joins group, (2) Consumer leaves/crashes (detected after session.timeout.ms), (3) Topic partition count changes, (4) Consumer calls subscribe() with new topics. During a stop-the-world rebalance (eager protocol), ALL consumers stop consuming while partitions are reassigned. For a group consuming 100 partitions with 10 consumers, a single consumer crash pauses all 10 consumers for 1–30 seconds. Cooperative (incremental) rebalancing (default since Kafka 3.1) only revokes partitions that need to move.', tip: 'Tuning: increase heartbeat.interval.ms to reduce false disconnects, decrease session.timeout.ms to speed up failure detection. There is a tradeoff.' },
  { q: 'What is the difference between range and round-robin partition assignment strategies?', a: 'Range (default): assigns partitions consecutively per topic. Consumer 0 gets P0-P2, Consumer 1 gets P3-P5. If consuming multiple topics, C0 always gets the low partitions — uneven if topic partition counts differ. Round-robin: interleaves partitions from all topics across consumers — typically more balanced for multi-topic subscriptions. Sticky: like round-robin but minimizes partition movement on rebalance (consumers keep their current partitions when possible).', tip: 'CooperativeStickyAssignor (Kafka 2.4+) combines sticky assignment with cooperative rebalancing — best of both worlds for production.' },
  { q: 'How does Kafka detect a consumer failure vs. a slow consumer?', a: 'Kafka uses two timeouts: (1) session.timeout.ms (default 45s) — if no heartbeat received within this window, the consumer is declared dead and a rebalance starts. (2) max.poll.interval.ms (default 5 min) — if poll() is not called within this window, the consumer is also declared dead. A slow consumer (processing each batch slowly) will violate max.poll.interval.ms without missing heartbeats. Fix: reduce batch size (max.poll.records), increase max.poll.interval.ms, or move processing to async threads.', tip: 'Separate heartbeat thread from poll thread — heartbeat runs in background, poll triggers processing. Distinguish the two timeout types in interviews.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M08 · Consumer Side',
    title: 'Consumer Groups',
    subtitle: 'Partition assignment, rebalancing strategies, and cooperative vs stop-the-world — animated',
    tabs: [
      { id: 'assign',    label: '👥 Assignment Demo' },
      { id: 'rebalance', label: '⚡ Rebalance Types' },
      { id: 'iq',        label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildAssign(container);
  buildRebalance(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildAssign(container) {
  const tab = container.querySelector('#tab-assign');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <canvas id="cg-canvas" width="820" height="380" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="cg-add">➕ Add Consumer</button>
        <button class="ctrl-btn" id="cg-remove">➖ Remove Consumer</button>
        <button class="ctrl-btn" id="cg-reset">🔄 Reset</button>
        <span class="ctrl-label" id="cg-status">3 consumers, 6 partitions</span>
      </div>
    </div>`;

  const canvas = tab.querySelector('#cg-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const PARTITION_COUNT = 6;
  const PARTITION_COLORS = ['#FF6900','#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444'];
  let consumers = ['C1','C2','C3'];

  let raf = null, lastT = 0;

  function getAssignment() {
    const asgn = {};
    consumers.forEach(c => asgn[c] = []);
    for (let p = 0; p < PARTITION_COUNT; p++) {
      if (consumers.length === 0) break;
      asgn[consumers[p % consumers.length]].push(p);
    }
    return asgn;
  }

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const asgn = getAssignment();

    // Partitions row
    ctx.font = 'bold 11px system-ui';
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'left';
    ctx.fillText(`Topic: orders (${PARTITION_COUNT} partitions)`, 40, 40);

    const PW = 90, PH = 50, PGap = 20;
    const totalW = PARTITION_COUNT * (PW + PGap) - PGap;
    const startX = (canvas.width - totalW) / 2;

    for (let p = 0; p < PARTITION_COUNT; p++) {
      const px = startX + p * (PW + PGap);
      ctx.fillStyle = PARTITION_COLORS[p] + '22';
      ctx.strokeStyle = PARTITION_COLORS[p];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(px, 60, PW, PH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 12px system-ui';
      ctx.fillStyle = PARTITION_COLORS[p];
      ctx.textAlign = 'center';
      ctx.fillText(`P${p}`, px + PW/2, 90);
    }

    // Consumers
    if (consumers.length > 0) {
      const CW = 120, CH = 70;
      const cSpacing = Math.min(160, (canvas.width - 80) / consumers.length);
      const cStart = (canvas.width - cSpacing * (consumers.length - 1) - CW) / 2;

      consumers.forEach((c, ci) => {
        const cx = cStart + ci * cSpacing;
        const cy = 220;
        const myParts = asgn[c] || [];

        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#FF6900';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(cx, cy, CW, CH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 12px system-ui';
        ctx.fillStyle = '#FF6900';
        ctx.textAlign = 'center';
        ctx.fillText(c, cx + CW/2, cy + 22);

        ctx.font = '10px system-ui';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(`owns: P${myParts.join(', P')||'none'}`, cx + CW/2, cy + 40);
        ctx.fillText(`lag: ${(Math.random()*100)|0}`, cx + CW/2, cy + 56);

        // Lines from partitions
        myParts.forEach(p => {
          const px = startX + p * (PW + PGap) + PW/2;
          ctx.beginPath();
          ctx.moveTo(px, 110);
          ctx.lineTo(cx + CW/2, cy);
          ctx.strokeStyle = PARTITION_COLORS[p] + '88';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      });
    }

    const statusEl = tab.querySelector('#cg-status');
    if (statusEl) statusEl.textContent = `${consumers.length} consumer${consumers.length!==1?'s':''}, ${PARTITION_COUNT} partitions — round-robin assignment`;

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#cg-add').addEventListener('click', () => {
    if (consumers.length < 8) consumers.push(`C${consumers.length + 1}`);
  });
  tab.querySelector('#cg-remove').addEventListener('click', () => {
    if (consumers.length > 1) consumers.pop();
  });
  tab.querySelector('#cg-reset').addEventListener('click', () => {
    consumers = ['C1','C2','C3'];
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildRebalance(container) {
  const tab = container.querySelector('#tab-rebalance');
  const rows = [
    ['Protocol', 'Eager (Stop-the-World)', 'Cooperative (Incremental)'],
    ['Default since', 'Kafka 0.9', 'Kafka 3.1 (CooperativeSticky)'],
    ['On rebalance', 'ALL consumers revoke ALL partitions', 'Only moved partitions are revoked'],
    ['Downtime', '1–30 seconds for full group', 'Near-zero (only moved partitions pause)'],
    ['Assignment', 'Full reassignment each rebalance', 'Sticky — minimize changes'],
    ['Use case', 'Simple setups, small groups', 'Large groups, production workloads'],
    ['Config', 'partition.assignment.strategy=RangeAssignor', 'partition.assignment.strategy=CooperativeStickyAssignor'],
  ];
  tab.innerHTML = `
    <div class="compare-table-wrap">
      <div class="section-header"><div class="section-title">Rebalance Protocols</div><div class="section-desc">Eager vs Cooperative — the difference between 30s downtime and near-zero</div></div>
      <table class="compare-table">
        <thead><tr><th>Dimension</th><th>Eager / Stop-the-World</th><th>Cooperative / Incremental</th></tr></thead>
        <tbody>${rows.map(([d,e,c]) => `<tr><td style="font-weight:600;color:var(--text)">${d}</td><td>${e}</td><td style="color:var(--green)">${c}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="scroll-content"><div class="prose">
      <h3>Amazon Prime Day Scenario</h3>
      <p>On Prime Day, the fulfillment consumer group has 200 consumers across 1000 partitions. An auto-scaler adds 50 consumers to handle the spike. With the eager protocol, all 200 existing consumers pause for up to 30 seconds during reassignment — 30,000 orders in limbo.</p>
      <p>With CooperativeStickyAssignor: only the ~250 partitions that need to migrate (from old consumers to the 50 new ones) are briefly paused. The remaining 750 partitions continue processing uninterrupted.</p>
    </div></div>`;
}
