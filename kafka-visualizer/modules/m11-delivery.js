import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { EventPacket, drawRoundRect } from '../components/canvas-primitives.js';

const IQ = [
  { q: 'How does Kafka achieve exactly-once semantics (EOS)?', a: 'EOS requires two components: (1) Idempotent producer: each producer gets a PID (producer ID) and sends a monotonic sequence number per partition. The broker deduplicates retries using (PID, partition, sequence). (2) Transactions: group produce + consumer offset commit into an atomic transaction using beginTransaction() / commitTransaction(). Consumers must use isolation.level=read_committed to skip uncommitted records. Together: consume-transform-produce is atomic — either all succeeds or none is visible.', tip: 'EOS is only "exactly-once within Kafka." If the Kafka consumer writes to an external system (e.g., DynamoDB), that write must also be idempotent. The Kafka guarantee ends at the Kafka sink.' },
  { q: 'What is the difference between at-least-once and at-most-once delivery?', a: 'At-most-once: commit offset before processing. If consumer crashes, records are lost (never reprocessed). Zero duplicates, possible data loss. At-least-once: commit offset after processing. If consumer crashes before commit, records are reprocessed. Possible duplicates, no data loss. Which is worse depends on the domain: for financial transactions, data loss is unacceptable → at-least-once. For sensor data where loss is acceptable but duplicates cause double-billing → at-most-once.', tip: 'Amazon: payment events use EOS (financial). Clickstream events use at-least-once (duplicates deduped in Redshift UPSERT). Sensor telemetry uses at-most-once (latest value overwrites).' },
  { q: 'What is the transaction coordinator in Kafka and what is its role?', a: 'The transaction coordinator is a broker-side component that manages transaction state. Each transactional producer is assigned a coordinator based on its transactional.id hash. The coordinator maintains a transaction log (__transaction_state, 50 partitions). State machine: ONGOING → PREPARE_COMMIT → COMMIT (or PREPARE_ABORT → ABORT). On producer failure, the coordinator waits transaction.timeout.ms and then aborts. Consumers filter uncommitted records by checking the transaction markers (COMMIT/ABORT records written to the log).', tip: 'Mention the two-phase commit: first, coordinator writes prepare, then writes the transaction marker to each involved partition. Consumers see the marker and skip or include records.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M11 · Delivery',
    title: 'Delivery Guarantees',
    subtitle: 'At-most-once, at-least-once, exactly-once — animated 3-lane comparison',
    tabs: [
      { id: 'lanes', label: '🛡️ 3-Lane Comparison' },
      { id: 'eos',   label: '⚛️ EOS Deep Dive' },
      { id: 'iq',    label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildLanes(container);
  buildEOS(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildLanes(container) {
  const tab = container.querySelector('#tab-lanes');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <canvas id="dlv-canvas" width="820" height="420" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="dlv-crash">💥 Simulate Crash</button>
        <button class="ctrl-btn" id="dlv-reset">🔄 Reset</button>
        <span class="ctrl-label">Watch what happens to each delivery semantic on crash</span>
      </div>
    </div>`;

  const canvas = tab.querySelector('#dlv-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const LANES = [
    { y: 80,  label: 'At-Most-Once',  color: '#EF4444', commit: 'before', desc: 'Commit offset → process → crash → LOST' },
    { y: 200, label: 'At-Least-Once', color: '#F59E0B', commit: 'after',  desc: 'Process → commit offset → crash → REPROCESS (duplicate)' },
    { y: 320, label: 'Exactly-Once',  color: '#10B981', commit: 'atomic', desc: 'Atomic transaction: process + commit = one unit' },
  ];

  const packets = [];
  let crashed = false;
  let raf = null, lastT = 0, tick = 0;

  function spawnPackets() {
    packets.length = 0;
    LANES.forEach((lane, li) => {
      packets.push(new EventPacket({
        label: `msg-${li+1}`,
        color: lane.color,
        path: [
          { x: 60,  y: lane.y + 30 },
          { x: 280, y: lane.y + 30 },
          { x: 500, y: lane.y + 30 },
          { x: 720, y: lane.y + 30 },
        ],
        speed: 0.8,
      }));
    });
  }

  spawnPackets();

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    tick++;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    LANES.forEach(lane => {
      // Lane box
      drawRoundRect(ctx, 30, lane.y, 760, 100, 10, '#1E293B', lane.color + '44');

      ctx.font = 'bold 12px system-ui';
      ctx.fillStyle = lane.color;
      ctx.textAlign = 'left';
      ctx.fillText(lane.label, 50, lane.y + 22);

      ctx.font = '10px system-ui';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(lane.desc, 50, lane.y + 82);

      // Stage markers
      const stages = ['Producer', 'Commit Offset', 'Process', 'Done'];
      const xs = [60, 280, 500, 720];
      stages.forEach((s, i) => {
        ctx.font = '9px system-ui';
        ctx.fillStyle = '#475569';
        ctx.textAlign = 'center';
        ctx.fillText(s, xs[i], lane.y + 55);
        ctx.beginPath();
        ctx.arc(xs[i], lane.y + 30, 5, 0, Math.PI * 2);
        ctx.fillStyle = lane.color + '66';
        ctx.fill();
      });

      // Crash marker
      if (crashed) {
        const crashX = lane.commit === 'before' ? 370 : lane.commit === 'after' ? 370 : 600;
        ctx.font = 'bold 16px system-ui';
        ctx.fillStyle = '#EF4444';
        ctx.textAlign = 'center';
        ctx.fillText('💥', crashX, lane.y + 35);

        if (lane.commit === 'before') {
          ctx.fillStyle = '#EF4444';
          ctx.font = 'bold 10px system-ui';
          ctx.fillText('LOST!', crashX + 50, lane.y + 35);
        } else if (lane.commit === 'after') {
          ctx.fillStyle = '#F59E0B';
          ctx.fillText('RETRY', crashX + 50, lane.y + 35);
        } else {
          ctx.fillStyle = '#10B981';
          ctx.fillText('ABORT TX', crashX + 60, lane.y + 35);
        }
      }
    });

    packets.forEach(p => { if (!crashed) p.update(dt); p.draw(ctx); });

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#dlv-crash').addEventListener('click', () => { crashed = true; });
  tab.querySelector('#dlv-reset').addEventListener('click', () => { crashed = false; spawnPackets(); });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildEOS(container) {
  const tab = container.querySelector('#tab-eos');
  tab.innerHTML = `
    <div class="svg-wrap">
      <svg viewBox="0 0 800 400" width="800" height="400" style="font-family:system-ui">
        <text x="30" y="30" fill="#94A3B8" font-size="12" font-weight="700">Exactly-Once Semantics — Component Map</text>

        <!-- Idempotent Producer -->
        <rect x="30" y="50" width="200" height="100" rx="10" fill="#1E293B" stroke="#FF6900" stroke-width="2"/>
        <text x="130" y="76" text-anchor="middle" fill="#FF6900" font-size="11" font-weight="800">Idempotent Producer</text>
        <text x="130" y="96" text-anchor="middle" fill="#94A3B8" font-size="9">PID: 12345</text>
        <text x="130" y="112" text-anchor="middle" fill="#94A3B8" font-size="9">Sequence: 0, 1, 2, 3…</text>
        <text x="130" y="128" text-anchor="middle" fill="#94A3B8" font-size="9">enable.idempotence=true</text>
        <text x="130" y="144" text-anchor="middle" fill="#64748B" font-size="8">Broker deduplicates retries</text>

        <!-- Transaction Coordinator -->
        <rect x="300" y="50" width="200" height="100" rx="10" fill="#1E293B" stroke="#8B5CF6" stroke-width="2"/>
        <text x="400" y="76" text-anchor="middle" fill="#8B5CF6" font-size="11" font-weight="800">Tx Coordinator</text>
        <text x="400" y="96" text-anchor="middle" fill="#94A3B8" font-size="9">transactional.id = "order-proc"</text>
        <text x="400" y="112" text-anchor="middle" fill="#94A3B8" font-size="9">ONGOING → COMMIT</text>
        <text x="400" y="128" text-anchor="middle" fill="#94A3B8" font-size="9">__transaction_state</text>
        <text x="400" y="144" text-anchor="middle" fill="#64748B" font-size="8">2-phase commit protocol</text>

        <!-- Consumer -->
        <rect x="570" y="50" width="200" height="100" rx="10" fill="#1E293B" stroke="#10B981" stroke-width="2"/>
        <text x="670" y="76" text-anchor="middle" fill="#10B981" font-size="11" font-weight="800">EOS Consumer</text>
        <text x="670" y="96" text-anchor="middle" fill="#94A3B8" font-size="9">isolation.level=</text>
        <text x="670" y="112" text-anchor="middle" fill="#94A3B8" font-size="9">read_committed</text>
        <text x="670" y="128" text-anchor="middle" fill="#94A3B8" font-size="9">Skips ABORT records</text>
        <text x="670" y="144" text-anchor="middle" fill="#64748B" font-size="8">Only sees committed txns</text>

        <!-- Flow -->
        <text x="30" y="195" fill="#94A3B8" font-size="11" font-weight="700">Transaction Flow</text>

        ${[
          '1. producer.initTransactions() — register with coordinator',
          '2. producer.beginTransaction()',
          '3. producer.send(output-topic, transformed-record)',
          '4. producer.sendOffsetsToTransaction(offsets, consumer-group)',
          '5. producer.commitTransaction() — coordinator writes COMMIT marker',
          '6. Consumer sees COMMIT marker → includes records in its view',
        ].map((step, i) => `
          <rect x="30" y="${210 + i*28}" width="740" height="22" rx="5"
            fill="${i===4||i===5 ? '#10B98111' : '#1E293B'}"
            stroke="${i===4||i===5 ? '#10B981' : '#334155'}" stroke-width="1"/>
          <text x="44" y="${225 + i*28}" fill="${i===4||i===5 ? '#10B981' : '#94A3B8'}" font-size="10">${step}</text>
        `).join('')}

        <text x="30" y="392" fill="#F59E0B" font-size="10">⚠️ On crash: coordinator aborts after transaction.timeout.ms (default 1min). Consumers never see partial results.</text>
      </svg>
    </div>`;
}
