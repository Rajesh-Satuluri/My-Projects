import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { GlowNode, PulseRing, EventPacket } from '../components/canvas-primitives.js';

const IQ = [
  { q: 'What is the difference between replication factor and ISR?', a: 'Replication factor (RF) is the static number of replicas (leader + followers) configured at topic creation. ISR (In-Sync Replicas) is the dynamic subset that is currently caught up with the leader. RF=3 means there are always 3 replicas; ISR might be {0,1,2} normally, {0,1} if broker 2 is lagging. A partition is considered committed only when all ISR members have written the record (with acks=all). ISR never exceeds RF.', tip: 'Know: replica.lag.time.max.ms (default 30s) — a follower is removed from ISR if it hasn\'t sent a fetch request or has not caught up within this window.' },
  { q: 'What happens when min.insync.replicas is violated?', a: 'If the number of ISR replicas falls below min.insync.replicas, the partition becomes read-only for acks=all producers. A NotEnoughReplicasException is thrown. The partition remains readable by consumers (they can still fetch committed data). With RF=3, min.insync.replicas=2: you can tolerate one broker failure without producer blocking. With min.insync.replicas=1 (default), you can lose data even with acks=all if the ISR contains only the leader and it fails.', tip: 'Amazon production setting: RF=3, min.insync.replicas=2, acks=all. This means: 2 brokers must be alive and in-sync for writes to succeed.' },
  { q: 'Explain unclean leader election and when you would enable it.', a: 'If all ISR members are dead, unclean leader election promotes an out-of-sync replica (one that is behind in offsets) as the new leader. This recovers availability at the cost of data loss — records that were on the old leader but not yet replicated are permanently lost. unclean.leader.election.enable=false (default since 0.11) prevents this, keeping the partition unavailable until an ISR member recovers. Enable only for availability-critical, loss-tolerant topics (e.g., metrics, logs) — never for financial transactions.', tip: 'This is the classic availability vs. durability tradeoff in distributed systems — explicitly connects to CAP theorem.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M07 · Core Internals',
    title: 'Replication',
    subtitle: 'Leader/follower replication, ISR, and what happens when a broker dies — kill-broker simulation',
    tabs: [
      { id: 'sim',  label: '💀 Kill-Broker Simulation' },
      { id: 'flow', label: '🔄 Replication Flow' },
      { id: 'iq',   label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildSim(container);
  buildFlow(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildSim(container) {
  const tab = container.querySelector('#tab-sim');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <canvas id="repl-canvas" width="820" height="400" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="repl-kill">💀 Kill Leader (Broker 1)</button>
        <button class="ctrl-btn" id="repl-restore">🔄 Restore Broker 1</button>
        <span class="ctrl-label" id="repl-status">All replicas in ISR. RF=3, acks=all.</span>
      </div>
    </div>`;

  const canvas = tab.querySelector('#repl-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const BROKERS = [
    { id: 0, label: 'Broker 1', x: 180, y: 180, role: 'leader', alive: true },
    { id: 1, label: 'Broker 2', x: 420, y: 100, role: 'follower', alive: true },
    { id: 2, label: 'Broker 3', x: 420, y: 260, role: 'follower', alive: true },
  ];

  const nodes = BROKERS.map(b => new GlowNode({ x: b.x, y: b.y, r: 38, color: b.role === 'leader' ? '#FF6900' : '#3B82F6', label: b.label, active: true }));
  const rings = [];
  const packets = [];

  let phase = 'normal'; // 'normal' | 'killing' | 'recovery' | 'stable'
  let phaseTimer = 0;
  let raf = null;
  let lastT = 0;
  let tick = 0;

  function spawnReplication() {
    if (BROKERS[0].alive) {
      [1, 2].forEach(i => {
        if (BROKERS[i].alive) {
          packets.push(new EventPacket({
            label: 'data',
            color: '#FF6900',
            path: [{ x: BROKERS[0].x, y: BROKERS[0].y }, { x: BROKERS[i].x, y: BROKERS[i].y }],
            speed: 1.2,
          }));
        }
      });
    }
  }

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    tick++;

    if (tick % 90 === 0 && phase === 'normal') spawnReplication();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw replication lines
    [1, 2].forEach(i => {
      ctx.beginPath();
      ctx.moveTo(BROKERS[0].x, BROKERS[0].y);
      ctx.lineTo(BROKERS[i].x, BROKERS[i].y);
      ctx.strokeStyle = BROKERS[0].alive && BROKERS[i].alive ? '#FF690033' : '#1E293B';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Controller → leader arrow
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.fillText('Controller', 650, 180);
    ctx.fillText('assigns leader', 650, 194);
    ctx.beginPath();
    ctx.moveTo(620, 186); ctx.lineTo(BROKERS[1].x + 40, BROKERS[1].y);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Nodes
    nodes.forEach((n, i) => {
      n.active = BROKERS[i].alive;
      n.color = BROKERS[i].role === 'leader' ? '#FF6900' : '#3B82F6';
      if (!BROKERS[i].alive) n.color = '#475569';
      n.update(dt);
      n.draw(ctx);

      // Role label
      ctx.font = 'bold 10px system-ui';
      ctx.fillStyle = BROKERS[i].alive ? (BROKERS[i].role === 'leader' ? '#FF6900' : '#3B82F6') : '#475569';
      ctx.textAlign = 'center';
      ctx.fillText(BROKERS[i].role.toUpperCase(), BROKERS[i].x, BROKERS[i].y + 58);

      if (!BROKERS[i].alive) {
        ctx.font = 'bold 20px system-ui';
        ctx.fillStyle = '#EF4444';
        ctx.fillText('✕', BROKERS[i].x, BROKERS[i].y + 8);
      }
    });

    // ISR status
    const isr = BROKERS.filter(b => b.alive).map(b => `B${b.id + 1}`).join(', ');
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'left';
    ctx.fillText(`ISR: {${isr}}`, 40, 350);
    const leader = BROKERS.find(b => b.role === 'leader' && b.alive);
    ctx.fillText(`Leader: ${leader ? leader.label : 'None (partition offline!)'}`, 40, 368);

    rings.forEach(r => { r.update(dt); r.draw(ctx); });
    packets.forEach(p => { p.update(dt); p.draw(ctx); });
    while (packets.length > 20) packets.shift();

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  const statusEl = tab.querySelector('#repl-status');

  tab.querySelector('#repl-kill').addEventListener('click', () => {
    BROKERS[0].alive = false;
    BROKERS[0].role = 'dead';
    nodes[0].active = false;

    setTimeout(() => {
      // Broker 2 becomes new leader
      BROKERS[1].role = 'leader';
      statusEl.textContent = '⚡ Broker 1 dead! Controller elected Broker 2 as new leader. ISR={B2,B3}.';
      rings.push(new PulseRing({ x: BROKERS[1].x, y: BROKERS[1].y, color: '#FF6900', maxR: 60 }));
    }, 1500);
  });

  tab.querySelector('#repl-restore').addEventListener('click', () => {
    BROKERS[0].alive = true;
    BROKERS[0].role = 'follower';
    statusEl.textContent = '✅ Broker 1 rejoined as follower. Catching up to ISR. RF=3 restored.';
    rings.push(new PulseRing({ x: BROKERS[0].x, y: BROKERS[0].y, color: '#10B981', maxR: 60 }));
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildFlow(container) {
  const tab = container.querySelector('#tab-flow');
  tab.innerHTML = `
    <div class="svg-wrap">
      <svg viewBox="0 0 760 360" width="760" height="360" style="font-family:system-ui">
        <defs>
          <marker id="aR" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#FF6900"/>
          </marker>
          <marker id="aB" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#3B82F6"/>
          </marker>
        </defs>

        <!-- Producer -->
        <rect x="20" y="155" width="100" height="50" rx="8" fill="#1E293B" stroke="#FF6900" stroke-width="1.5"/>
        <text x="70" y="180" text-anchor="middle" fill="#FF6900" font-size="11" font-weight="700">Producer</text>
        <text x="70" y="196" text-anchor="middle" fill="#94A3B8" font-size="9">acks=all</text>

        <!-- Leader -->
        <rect x="200" y="130" width="120" height="100" rx="8" fill="#1E293B" stroke="#FF6900" stroke-width="2"/>
        <text x="260" y="155" text-anchor="middle" fill="#FF6900" font-size="11" font-weight="800">Broker 1</text>
        <text x="260" y="170" text-anchor="middle" fill="#94A3B8" font-size="9">LEADER</text>
        <rect x="215" y="177" width="90" height="20" rx="4" fill="#0A0E1A" stroke="#334155"/>
        <text x="260" y="191" text-anchor="middle" fill="#FF6900" font-size="9">off:142 ▼ append</text>
        <text x="260" y="218" text-anchor="middle" fill="#64748B" font-size="8">writes local log</text>

        <!-- Follower 1 -->
        <rect x="420" y="80" width="120" height="80" rx="8" fill="#1E293B" stroke="#3B82F6" stroke-width="1.5"/>
        <text x="480" y="108" text-anchor="middle" fill="#3B82F6" font-size="11" font-weight="800">Broker 2</text>
        <text x="480" y="123" text-anchor="middle" fill="#94A3B8" font-size="9">FOLLOWER</text>
        <rect x="435" y="130" width="90" height="20" rx="4" fill="#0A0E1A" stroke="#334155"/>
        <text x="480" y="144" text-anchor="middle" fill="#3B82F6" font-size="9">fetch → replicate</text>

        <!-- Follower 2 -->
        <rect x="420" y="200" width="120" height="80" rx="8" fill="#1E293B" stroke="#3B82F6" stroke-width="1.5"/>
        <text x="480" y="228" text-anchor="middle" fill="#3B82F6" font-size="11" font-weight="800">Broker 3</text>
        <text x="480" y="243" text-anchor="middle" fill="#94A3B8" font-size="9">FOLLOWER</text>
        <rect x="435" y="250" width="90" height="20" rx="4" fill="#0A0E1A" stroke="#334155"/>
        <text x="480" y="264" text-anchor="middle" fill="#3B82F6" font-size="9">fetch → replicate</text>

        <!-- Producer → Leader -->
        <line x1="120" y1="180" x2="198" y2="180" stroke="#FF6900" stroke-width="2" marker-end="url(#aR)"/>
        <text x="154" y="173" fill="#FF6900" font-size="9">produce</text>

        <!-- Leader → Followers -->
        <line x1="320" y1="160" x2="418" y2="120" stroke="#3B82F6" stroke-width="1.5" marker-end="url(#aB)"/>
        <line x1="320" y1="200" x2="418" y2="240" stroke="#3B82F6" stroke-width="1.5" marker-end="url(#aB)"/>
        <text x="350" y="130" fill="#3B82F6" font-size="9">replicate</text>
        <text x="350" y="235" fill="#3B82F6" font-size="9">replicate</text>

        <!-- ACK back -->
        <line x1="418" y1="115" x2="322" y2="158" stroke="#10B981" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#aG2)"/>
        <line x1="418" y1="245" x2="322" y2="202" stroke="#10B981" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#aG2)"/>
        <text x="340" y="148" fill="#10B981" font-size="9">ack</text>
        <text x="340" y="252" fill="#10B981" font-size="9">ack</text>

        <!-- Leader → Producer ACK -->
        <line x1="200" y1="193" x2="122" y2="193" stroke="#10B981" stroke-width="2" stroke-dasharray="4,3" marker-end="url(#aG2)"/>
        <text x="150" y="208" fill="#10B981" font-size="9">acks=all ✓</text>

        <!-- High-water mark note -->
        <rect x="580" y="155" width="160" height="70" rx="8" fill="#1E293B" stroke="#F59E0B" stroke-width="1"/>
        <text x="660" y="178" text-anchor="middle" fill="#F59E0B" font-size="10" font-weight="700">High-Water Mark</text>
        <text x="660" y="195" text-anchor="middle" fill="#94A3B8" font-size="9">Highest offset all ISR</text>
        <text x="660" y="209" text-anchor="middle" fill="#94A3B8" font-size="9">members have written.</text>
        <text x="660" y="223" text-anchor="middle" fill="#94A3B8" font-size="9">Consumers only see ≤ HWM.</text>

        <defs>
          <marker id="aG2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#10B981"/>
          </marker>
        </defs>
      </svg>
    </div>`;
}
