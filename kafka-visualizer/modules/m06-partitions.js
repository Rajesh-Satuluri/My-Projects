import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { SparkLine } from '../components/canvas-primitives.js';

const IQ = [
  { q: 'How do you choose the right number of partitions for a topic?', a: 'Target throughput / (partition throughput). Partition throughput: ~10MB/s write, ~50MB/s read per partition (disk I/O bound). Rule of thumb: partition count = max(T/10, desired consumer parallelism). Over-partitioning increases file handles, leader election cost, and end-to-end latency. Under-partitioning limits consumer parallelism. For Amazon orders at 1GB/s: ~100 partitions. Cannot reduce partition count after creation (only increase).', tip: 'Mention: more partitions = more files, more replication traffic, higher minimum latency (each extra partition adds ~1ms to a broker\'s produce loop).' },
  { q: 'What is a hot partition and how do you fix it?', a: 'A hot partition receives disproportionate traffic because many records share the same partition key. E.g., if key=country and 80% of orders are US, partition 0 gets 80% of load. Fix options: (1) Better key — use customer_id or order_id for even distribution. (2) Key salting — append random suffix to key, then strip in consumer. (3) Custom partitioner — route based on business logic. (4) More partitions — doesn\'t help if key cardinality is low.', tip: 'Amazon fraud detection story: keying by payment_method caused hot partition for "credit card". Switched to hash(customer_id) for even distribution.' },
  { q: 'Why does Kafka only guarantee ordering within a partition, not across partitions?', a: 'Each partition is a single ordered log maintained by one leader broker. Ordering across partitions would require a distributed transaction log — prohibitively expensive at scale. For entities that require ordering (e.g., all events for order #12345 in sequence), use the order ID as the partition key: all events route to the same partition and are consumed in order. If you need total ordering across all events, use a single-partition topic (forfeiting parallelism).', tip: 'State the tradeoff explicitly: ordering guarantees come at the cost of parallelism. Single-partition = total order but 1 consumer max.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M06 · Core Internals',
    title: 'Partitions',
    subtitle: 'Distribution, ordering, parallelism, and the hot partition problem — with live throughput monitors',
    tabs: [
      { id: 'balance', label: '⚖️ Load Distribution' },
      { id: 'hot',     label: '🔥 Hot Partition Demo' },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildBalance(container);
  buildHot(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildBalance(container) {
  const tab = container.querySelector('#tab-balance');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <canvas id="part-canvas" width="820" height="360" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="part-uniform">✅ Uniform Keys (order_id)</button>
        <button class="ctrl-btn" id="part-hot">🔥 Hot Keys (country)</button>
        <span class="ctrl-label">Producer partition assignment by key hash</span>
      </div>
    </div>`;

  const canvas = tab.querySelector('#part-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const P_COUNT = 5;
  const sparklines = [];
  const counters = new Array(P_COUNT).fill(0);
  let isHot = false;
  let raf = null;
  let lastT = 0;
  let tick = 0;

  for (let i = 0; i < P_COUNT; i++) {
    sparklines.push(new SparkLine({
      x: 40 + i * 150, y: 50, w: 130, h: 100,
      color: '#FF6900',
      label: `P${i}`,
      maxVal: 200
    }));
  }

  let simTick = 0;

  function simulate() {
    simTick++;
    if (simTick % 30 !== 0) return;
    for (let i = 0; i < P_COUNT; i++) {
      if (isHot) {
        counters[i] = i === 0 ? 150 + Math.random() * 50 : 5 + Math.random() * 15;
      } else {
        counters[i] = 80 + Math.random() * 40;
      }
      sparklines[i].push(counters[i]);
    }
  }

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;

    simulate();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'left';
    ctx.fillText(`Partition Throughput — ${isHot ? '🔥 HOT KEY MODE (country)' : '✅ BALANCED MODE (order_id)'}`, 40, 30);

    sparklines.forEach((sl, i) => {
      if (isHot && i === 0) sl.color = '#EF4444';
      else sl.color = '#FF6900';
      sl.draw(ctx);
    });

    // Labels
    for (let i = 0; i < P_COUNT; i++) {
      ctx.font = '11px system-ui';
      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'center';
      ctx.fillText(`msgs/s: ${Math.round(counters[i])}`, 40 + i * 150 + 65, 175);
      if (isHot && i === 0) {
        ctx.fillStyle = '#EF4444';
        ctx.fillText('HOT!', 40 + i * 150 + 65, 192);
      }
    }

    // Key routing legend
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.fillText(isHot
      ? 'Key: country → 80% traffic has key="US" → all land in P0'
      : 'Key: order_id → high cardinality → murmur2 hash evenly distributes',
      40, 230);

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#part-uniform').addEventListener('click', () => {
    isHot = false;
    tab.querySelector('#part-uniform').classList.add('active');
    tab.querySelector('#part-hot').classList.remove('active');
  });
  tab.querySelector('#part-hot').addEventListener('click', () => {
    isHot = true;
    tab.querySelector('#part-hot').classList.add('active');
    tab.querySelector('#part-uniform').classList.remove('active');
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildHot(container) {
  const tab = container.querySelector('#tab-hot');
  tab.innerHTML = `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Hot Partition Causes and Fixes</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #EF4444">
          <div class="info-card-icon">❌</div>
          <div class="info-card-title">Bad Key: country</div>
          <div class="info-card-body">80% of Amazon orders are US-based. All US orders land in P0. P0 broker is saturated; P1-P4 are idle. Consumer for P0 can't keep up — lag grows.</div>
          <div class="info-card-tag">ANTI-PATTERN</div>
        </div>
        <div class="info-card" style="border-left:3px solid #EF4444">
          <div class="info-card-icon">❌</div>
          <div class="info-card-title">Bad Key: payment_type</div>
          <div class="info-card-body">Amazon Payments: 70% credit card, 20% Prime Wallet, 10% other. Three distinct buckets — maximum 3-way parallelism regardless of partition count.</div>
          <div class="info-card-tag">ANTI-PATTERN</div>
        </div>
        <div class="info-card" style="border-left:3px solid #10B981">
          <div class="info-card-icon">✅</div>
          <div class="info-card-title">Good Key: order_id</div>
          <div class="info-card-body">UUID or monotonic ID — high cardinality, uniform murmur2 hash distribution. All events for order #XYZ land in same partition (ordering preserved). Even load across all partitions.</div>
          <div class="info-card-tag">RECOMMENDED</div>
        </div>
        <div class="info-card" style="border-left:3px solid #10B981">
          <div class="info-card-icon">✅</div>
          <div class="info-card-title">Fix: Key Salting</div>
          <div class="info-card-body">Append random suffix: key = country + ":" + random(0,9). Consumer strips suffix before processing. Trades strict per-country ordering for even distribution. Good for analytics topics.</div>
          <div class="info-card-tag">WORKAROUND</div>
        </div>
        <div class="info-card" style="border-left:3px solid #F59E0B">
          <div class="info-card-icon">⚠️</div>
          <div class="info-card-title">No Key (null)</div>
          <div class="info-card-body">Sticky partitioner: fills one partition batch before moving to next. Even distribution over time but no ordering guarantee. Use for log-style topics where order doesn't matter.</div>
          <div class="info-card-tag">SITUATIONAL</div>
        </div>
        <div class="info-card" style="border-left:3px solid #8B5CF6">
          <div class="info-card-icon">🔧</div>
          <div class="info-card-title">Custom Partitioner</div>
          <div class="info-card-body">Implement Partitioner interface. Route Prime members to dedicated partitions for priority processing. Mix key-based and round-robin logic. Full control at the cost of complexity.</div>
          <div class="info-card-tag">ADVANCED</div>
        </div>
      </div>
    </div>`;
}
