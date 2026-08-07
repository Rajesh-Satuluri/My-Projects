import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'What is the difference between a Kafka topic and a partition?',
    a: 'A topic is a logical channel — a named category of related events. A partition is the physical unit of storage and parallelism. Amazon analogy: the <code>orders</code> topic is the concept of "every order ever placed on Amazon". The 3 partitions (P0, P1, P2) are the actual storage bins on disk — each is a separate ordered log on a separate broker. You write to and read from the <code>orders</code> topic as a logical address, but Kafka physically routes you to exactly one partition. Partition count sets max parallelism: 3 partitions → max 3 consumers in a group can work in parallel.',
    tip: 'Say "topic is the API, partition is the implementation" — topics are how you address data, partitions are how Kafka distributes and stores it.'
  },
  {
    q: 'What is the role of a Kafka broker?',
    a: 'A broker is a Kafka server that stores partitions on disk and handles produce/fetch requests. Each partition has one leader broker (all reads and writes go here) and N-1 follower brokers (silent copies for durability). Amazon analogy: Broker 1 is the leader for orders-P0. Every order event that hashes to P0 is written to Broker 1 first. Brokers 2 and 3 quietly replicate P0. If Broker 1 crashes mid-Prime Day, the controller promotes Broker 2 to leader for P0 in ~1 second — zero data loss, zero missed orders.',
    tip: 'A broker can simultaneously be a leader for some partitions and a follower for others. Leadership is per-partition, not per-broker.'
  },
  {
    q: 'How does Kafka differ from pub/sub systems like Google Pub/Sub or SNS?',
    a: 'Kafka retains messages durably; consumers pull at their own pace. Push-based pub/sub (SNS, Google Pub/Sub) delivers and typically deletes. Amazon\'s own SNS+SQS: SNS fans out to SQS queues, each queue gets one copy, and once consumed the message is gone. With Kafka: the fulfillment, fraud-detection, and notifications consumer groups all read the same <code>orders</code> topic independently — no separate fan-out wiring needed. If fraud-detection crashes and restarts, it replays from its last offset — it doesn\'t miss a single order. That durable, replayable log is Kafka\'s core difference.',
    tip: 'SNS+SQS is push-based fan-out + competing consumers. Kafka unifies both patterns, adds durable replay, and gives strict per-partition ordering.'
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M02 · Foundation',
    title: 'Messaging Fundamentals',
    subtitle: 'Producers, brokers, topics, consumers — every concept explained through Amazon\'s order system',
    tabs: [
      { id: 'concepts', label: '📖 Core Concepts' },
      { id: 'flow',     label: '🔄 Message Journey' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  buildConcepts(container);
  buildFlow(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return null;
}

function buildConcepts(container) {
  const tab = container.querySelector('#tab-concepts');
  const items = [
    {
      icon: '📤',
      title: 'Producer',
      tag: 'Write Path',
      body: `A service that <strong>writes events into Kafka</strong> — it picks the topic, optionally sets a key, and publishes.
        <div class="example-block">
          <span class="example-label">Amazon</span>
          The <strong>Order Service</strong> is a producer. The moment you click Buy Now, it creates one JSON event
          — <code>{orderId, product, price, userId}</code> — and publishes it to the <code>orders</code> topic in ~2ms.
          It doesn't call Inventory or Fulfillment. It just writes one event and returns "Order Confirmed" to your browser.
          The <strong>Payment Service</strong> is a separate producer that publishes to the <code>payments</code> topic
          when your card is charged. Producers never talk to consumers directly.
        </div>`
    },
    {
      icon: '📋',
      title: 'Topic',
      tag: 'Logical Channel',
      body: `A <strong>named, append-only log</strong> of related events. Records are never updated in place — only appended.
        <div class="example-block">
          <span class="example-label">Amazon</span>
          <code>orders</code> is a topic. Every Buy Now click from every Amazon customer worldwide adds one event
          to the end of this log. Order #847,230 sits at offset 847,230 — forever. It doesn't move, doesn't get overwritten.
          The log is retained for 7 days, then old events are pruned. Amazon has hundreds of topics:
          <code>orders</code>, <code>payments</code>, <code>inventory-updates</code>, <code>click-events</code>, <code>returns</code>.
          Each is a completely independent stream.
        </div>`
    },
    {
      icon: '🗂️',
      title: 'Partition',
      tag: 'Physical Unit',
      body: `The actual storage unit inside a topic. Each partition is an <strong>ordered, immutable sequence</strong> on one broker.
        <div class="example-block">
          <span class="example-label">Amazon</span>
          The <code>orders</code> topic has 3 partitions. Amazon keys every order event by <code>customer_id</code>.
          So all orders from customer <code>U-88234</code> always land in <strong>P2</strong> (deterministic hash).
          This guarantees her orders are processed in the exact sequence she placed them — Order #1 before Order #2, always.
          3 partitions also means 3 consumers can work in parallel: one consumer per partition.
        </div>`
    },
    {
      icon: '🖥️',
      title: 'Broker',
      tag: 'Storage Node',
      body: `A Kafka <strong>server that stores partitions</strong> on disk. Each partition has one leader broker and N-1 followers.
        <div class="example-block">
          <span class="example-label">Amazon</span>
          <strong>Broker 1</strong> is the leader for orders-P0. Every order event hashed to P0 is written to Broker 1 first.
          Brokers 2 and 3 quietly replicate P0 in the background. If Broker 1 crashes mid-Prime Day,
          the controller promotes Broker 2 as leader for P0 in ~1 second. No orders are lost. No offsets reset.
          No engineer is woken up to manually recover data.
        </div>`
    },
    {
      icon: '📥',
      title: 'Consumer',
      tag: 'Read Path',
      body: `A service that <strong>pulls records from a partition</strong>. It tracks its position using an offset and moves forward one record at a time.
        <div class="example-block">
          <span class="example-label">Amazon</span>
          One instance of the <strong>Fulfillment Service</strong> is a consumer. It reads order #847,231 from P0:
          checks Seattle warehouse stock, creates a shipping label, schedules UPS pickup.
          Then it commits offset 847,232 — "I've handled everything up to 847,231, give me 847,232 next."
          Kafka never pushes. Consumers pull at whatever rate they can handle.
        </div>`
    },
    {
      icon: '👥',
      title: 'Consumer Group',
      tag: 'Parallelism Unit',
      body: `A named set of consumers <strong>sharing the work</strong> of reading a topic — each partition is owned by exactly one consumer in the group.
        <div class="example-block">
          <span class="example-label">Amazon</span>
          The <code>fulfillment</code> group has 3 instances — one reads P0, one reads P1, one reads P2. 3× throughput.
          The <code>fraud-detection</code> group has 1 instance reading all 3 partitions by itself.
          The <code>notifications</code> group sends "Order Confirmed" emails.
          All three groups read the exact same <code>orders</code> topic simultaneously and
          <strong>completely independently</strong>. Adding a new group never affects the others.
        </div>`
    },
    {
      icon: '🔑',
      title: 'Record Key',
      tag: 'Partition Router',
      body: `An optional field on each event that <strong>determines partition assignment</strong> via consistent hash. Same key → always same partition.
        <div class="example-block">
          <span class="example-label">Amazon</span>
          Order Service sets <code>key = customer_id</code>. Customer <code>U-88234</code> hashes to P2.
          Customer <code>U-00123</code> hashes to P0. This matters for ordering: within P2,
          all of U-88234's orders arrive in the exact sequence she placed them —
          so Fulfillment never processes Order #2 before Order #1 for the same customer.
          If no key is set, Kafka round-robins across partitions (no ordering guarantee).
        </div>`
    },
    {
      icon: '📍',
      title: 'Offset',
      tag: 'Position Pointer',
      body: `A <strong>monotonically increasing integer</strong> per partition that marks exactly where a record lives. Consumers commit offsets to track progress.
        <div class="example-block">
          <span class="example-label">Amazon</span>
          Your iPhone 15 Pro order is at <strong>offset 847,231</strong> in P2.
          Fulfillment Service committed offset 847,231 — it handled your order.
          Fraud Detection is at 847,198 — 33 events behind due to a GC pause, but it'll catch up.
          Notifications is at 847,231 — on time, sent your email.
          Each group's offset is <strong>completely independent</strong>. Fraud Detection lagging
          doesn't slow Fulfillment by even 1ms.
        </div>`
    },
  ];

  tab.innerHTML = `
    <style>
      .example-block {
        margin-top: 10px;
        padding: 10px 12px;
        background: #0A0E1A;
        border-left: 3px solid #FF6900;
        border-radius: 0 6px 6px 0;
        font-size: 12px;
        color: #94A3B8;
        line-height: 1.65;
      }
      .example-label {
        display: inline-block;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
        color: #FF6900;
        background: #FF690018;
        border-radius: 4px;
        padding: 1px 6px;
        margin-bottom: 6px;
      }
      .example-block code {
        background: #1E293B;
        padding: 1px 4px;
        border-radius: 3px;
        color: #06B6D4;
        font-size: 11px;
      }
    </style>
    <div class="info-grid">${items.map(c => `
      <div class="info-card">
        <div class="info-card-icon">${c.icon}</div>
        <div class="info-card-title">${c.title}</div>
        <div class="info-card-tag">${c.tag}</div>
        <div class="info-card-body" style="margin-top:8px">${c.body}</div>
      </div>`).join('')}
    </div>`;
}

function buildFlow(container) {
  const tab = container.querySelector('#tab-flow');
  tab.innerHTML = `
    <div class="svg-wrap">
      <svg viewBox="0 0 800 340" width="800" height="340" style="font-family:system-ui">
        <defs>
          <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#FF6900"/>
          </marker>
          <marker id="arr-b" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#3B82F6"/>
          </marker>
          <marker id="arr-g" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#10B981"/>
          </marker>
          <marker id="arr-p" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#8B5CF6"/>
          </marker>
        </defs>

        <!-- Producer -->
        <rect x="10" y="110" width="130" height="80" rx="10" fill="#1E293B" stroke="#FF6900" stroke-width="1.5"/>
        <text x="75" y="140" text-anchor="middle" fill="#FF6900" font-weight="700" font-size="11">Producer</text>
        <text x="75" y="156" text-anchor="middle" fill="#94A3B8" font-size="9">Order Service</text>
        <text x="75" y="170" text-anchor="middle" fill="#64748B" font-size="8">key = customer_id</text>
        <text x="75" y="182" text-anchor="middle" fill="#64748B" font-size="8">acks = all</text>

        <!-- Arrow producer → broker -->
        <line x1="140" y1="150" x2="200" y2="135" stroke="#FF6900" stroke-width="1.5" marker-end="url(#arr)"/>
        <text x="155" y="135" fill="#FF6900" font-size="8">publish</text>

        <!-- Broker box -->
        <rect x="200" y="60" width="380" height="210" rx="10" fill="#0F172A" stroke="#334155" stroke-width="1.5"/>
        <text x="390" y="82" text-anchor="middle" fill="#475569" font-size="10" font-weight="700">BROKER  ·  Topic: orders  (RF = 3)</text>

        <!-- Partition 0 -->
        <rect x="218" y="92" width="344" height="38" rx="6" fill="#1E293B" stroke="#334155"/>
        <text x="230" y="114" fill="#94A3B8" font-size="9" font-weight="700">P0</text>
        <rect x="250" y="97" width="34" height="28" rx="3" fill="#FF690022" stroke="#FF6900" stroke-width="1"/>
        <text x="267" y="115" text-anchor="middle" fill="#FF6900" font-size="8">847,229</text>
        <rect x="288" y="97" width="34" height="28" rx="3" fill="#FF690022" stroke="#FF6900" stroke-width="1"/>
        <text x="305" y="115" text-anchor="middle" fill="#FF6900" font-size="8">847,230</text>
        <rect x="326" y="97" width="34" height="28" rx="3" fill="#FF6900" stroke="#FF6900"/>
        <text x="343" y="115" text-anchor="middle" fill="#fff" font-size="8">847,231</text>
        <text x="368" y="112" fill="#64748B" font-size="8">← U-00123's order</text>

        <!-- Partition 1 -->
        <rect x="218" y="136" width="344" height="38" rx="6" fill="#1E293B" stroke="#334155"/>
        <text x="230" y="158" fill="#94A3B8" font-size="9" font-weight="700">P1</text>
        <rect x="250" y="141" width="34" height="28" rx="3" fill="#3B82F622" stroke="#3B82F6" stroke-width="1"/>
        <text x="267" y="159" text-anchor="middle" fill="#3B82F6" font-size="8">440,101</text>
        <rect x="288" y="141" width="34" height="28" rx="3" fill="#3B82F622" stroke="#3B82F6" stroke-width="1"/>
        <text x="305" y="159" text-anchor="middle" fill="#3B82F6" font-size="8">440,102</text>

        <!-- Partition 2 -->
        <rect x="218" y="180" width="344" height="38" rx="6" fill="#1E293B" stroke="#334155"/>
        <text x="230" y="202" fill="#94A3B8" font-size="9" font-weight="700">P2</text>
        <rect x="250" y="185" width="34" height="28" rx="3" fill="#10B98122" stroke="#10B981" stroke-width="1"/>
        <text x="267" y="203" text-anchor="middle" fill="#10B981" font-size="8">623,450</text>
        <text x="310" y="202" fill="#64748B" font-size="8">← U-88234's orders (your iPhone)</text>

        <!-- Consumer A - fulfillment -->
        <rect x="640" y="60" width="150" height="65" rx="8" fill="#1E293B" stroke="#FF6900" stroke-width="1.5"/>
        <text x="715" y="83" text-anchor="middle" fill="#FF6900" font-weight="700" font-size="10">Fulfillment</text>
        <text x="715" y="98" text-anchor="middle" fill="#94A3B8" font-size="9">group: fulfillment</text>
        <text x="715" y="112" text-anchor="middle" fill="#64748B" font-size="8">offset 847,231 on P0</text>

        <!-- Consumer B - fraud -->
        <rect x="640" y="140" width="150" height="65" rx="8" fill="#1E293B" stroke="#8B5CF6" stroke-width="1.5"/>
        <text x="715" y="163" text-anchor="middle" fill="#8B5CF6" font-weight="700" font-size="10">Fraud Detection</text>
        <text x="715" y="178" text-anchor="middle" fill="#94A3B8" font-size="9">group: fraud-detection</text>
        <text x="715" y="192" text-anchor="middle" fill="#F59E0B" font-size="8">offset 847,198 — lagging</text>

        <!-- Consumer C - notifications -->
        <rect x="640" y="220" width="150" height="65" rx="8" fill="#1E293B" stroke="#10B981" stroke-width="1.5"/>
        <text x="715" y="243" text-anchor="middle" fill="#10B981" font-weight="700" font-size="10">Notifications</text>
        <text x="715" y="258" text-anchor="middle" fill="#94A3B8" font-size="9">group: notifications</text>
        <text x="715" y="272" text-anchor="middle" fill="#64748B" font-size="8">offset 847,231 on P0</text>

        <!-- Arrows broker → consumers -->
        <line x1="562" y1="115" x2="638" y2="95"  stroke="#FF6900" stroke-width="1.5" marker-end="url(#arr)"/>
        <line x1="562" y1="150" x2="638" y2="172" stroke="#8B5CF6" stroke-width="1.5" marker-end="url(#arr-p)"/>
        <line x1="562" y1="195" x2="638" y2="248" stroke="#10B981" stroke-width="1.5" marker-end="url(#arr-g)"/>

        <text x="575" y="100" fill="#FF6900" font-size="8">fetch P0</text>
        <text x="565" y="165" fill="#8B5CF6" font-size="8">fetch all</text>
        <text x="565" y="230" fill="#10B981" font-size="8">fetch P0</text>
      </svg>
    </div>

    <div class="scroll-content">
      <!-- Journey header -->
      <div style="background:#111827;border:1px solid #1E293B;border-radius:14px;padding:20px 24px;margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748B;margin-bottom:8px">Tracing one event end-to-end</div>
        <div style="font-size:17px;font-weight:800;color:#F1F5F9;margin-bottom:4px">Order AMZ-24601 — iPhone 15 Pro, $999</div>
        <div style="font-size:13px;color:#94A3B8">Customer U-00123 clicks Buy Now. Here is what each Kafka concept does, in sequence.</div>
      </div>

      <!-- Journey steps -->
      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:28px">

        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="flex-shrink:0;min-width:90px;text-align:right">
            <span style="background:#FF6900;color:#000;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px">PRODUCER</span>
          </div>
          <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:10px;padding:14px 16px">
            <div style="font-size:13px;font-weight:600;color:#F1F5F9;margin-bottom:4px">Order Service publishes the event</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.65">Creates <code style="background:#0A0E1A;padding:1px 4px;border-radius:3px;color:#06B6D4">{orderId:"AMZ-24601", product:"iPhone 15 Pro", price:999, userId:"U-00123"}</code> and calls <code style="background:#0A0E1A;padding:1px 4px;border-radius:3px;color:#06B6D4">producer.send("orders", key="U-00123", value=event)</code>. Done in ~2ms. Doesn't call any downstream service.</div>
          </div>
        </div>

        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="flex-shrink:0;min-width:90px;text-align:right">
            <span style="background:#06B6D4;color:#000;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px">RECORD KEY</span>
          </div>
          <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:10px;padding:14px 16px">
            <div style="font-size:13px;font-weight:600;color:#F1F5F9;margin-bottom:4px">Key <code style="background:#0A0E1A;padding:1px 4px;border-radius:3px;color:#06B6D4">"U-00123"</code> routes to P0</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.65">Kafka hashes <code style="background:#0A0E1A;padding:1px 4px;border-radius:3px;color:#06B6D4">"U-00123"</code> → picks Partition 0. All future orders from U-00123 will always go to P0. This guarantees their orders are fulfilled in sequence — first order first, second order second.</div>
          </div>
        </div>

        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="flex-shrink:0;min-width:90px;text-align:right">
            <span style="background:#3B82F6;color:#fff;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px">TOPIC / PARTITION</span>
          </div>
          <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:10px;padding:14px 16px">
            <div style="font-size:13px;font-weight:600;color:#F1F5F9;margin-bottom:4px">Appended to <code style="background:#0A0E1A;padding:1px 4px;border-radius:3px;color:#06B6D4">orders-P0</code> at offset 847,231</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.65">The event joins the end of the P0 log as a permanent, immutable record at offset 847,231. It will never move, never be updated. Orders 847,229 and 847,230 sit before it forever.</div>
          </div>
        </div>

        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="flex-shrink:0;min-width:90px;text-align:right">
            <span style="background:#475569;color:#fff;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px">BROKER</span>
          </div>
          <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:10px;padding:14px 16px">
            <div style="font-size:13px;font-weight:600;color:#F1F5F9;margin-bottom:4px">Broker 1 writes it, Brokers 2 & 3 replicate</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.65">Broker 1 (P0 leader) receives the write and replicates to Brokers 2 and 3. With <code style="background:#0A0E1A;padding:1px 4px;border-radius:3px;color:#06B6D4">acks=all</code>, the Order Service gets confirmation only after all three have written it. Your order is durable before "Order Confirmed" appears on screen.</div>
          </div>
        </div>

        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="flex-shrink:0;min-width:90px;text-align:right">
            <span style="background:#10B981;color:#000;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px">CONSUMER GROUP</span>
          </div>
          <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:10px;padding:14px 16px">
            <div style="font-size:13px;font-weight:600;color:#F1F5F9;margin-bottom:4px">3 groups read offset 847,231 — independently</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.65">
              <strong style="color:#FF6900">Fulfillment</strong> reads P0, picks the iPhone from the Seattle warehouse, generates a shipping label.<br>
              <strong style="color:#8B5CF6">Fraud Detection</strong> reads P0, runs its ML model — score 0.12 (legit). No flag.<br>
              <strong style="color:#10B981">Notifications</strong> reads P0, fires the "Order Confirmed" email + push notification.<br>
              All three run in parallel. None knows the others exist.
            </div>
          </div>
        </div>

        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="flex-shrink:0;min-width:90px;text-align:right">
            <span style="background:#F59E0B;color:#000;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px">OFFSET</span>
          </div>
          <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:10px;padding:14px 16px">
            <div style="font-size:13px;font-weight:600;color:#F1F5F9;margin-bottom:4px">Each group commits its own offset — completely independent</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.65">Fulfillment commits offset 847,232 (processed yours, ready for the next). Fraud Detection commits 847,199 (it was 33 events behind — GC pause — but it's catching up). Neither affects the other. If Fraud Detection crashes right now, it restarts at 847,199 and replays from there. Zero orders missed.</div>
          </div>
        </div>

      </div>

      <!-- Kafka ↔ Amazon cheat sheet -->
      <div style="background:#111827;border:1px solid #1E293B;border-radius:14px;padding:20px 24px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748B;margin-bottom:14px">Kafka concept → Amazon analog</div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="border-bottom:1px solid #1E293B">
                <th style="text-align:left;color:#64748B;padding:8px 12px;font-size:10px;letter-spacing:.06em;text-transform:uppercase">Kafka Term</th>
                <th style="text-align:left;color:#64748B;padding:8px 12px;font-size:10px;letter-spacing:.06em;text-transform:uppercase">Amazon Analog</th>
                <th style="text-align:left;color:#64748B;padding:8px 12px;font-size:10px;letter-spacing:.06em;text-transform:uppercase">What it does in the order flow</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid #0F172A"><td style="padding:10px 12px;color:#F1F5F9;font-weight:700">Producer</td><td style="padding:10px 12px;color:#FF6900">Order Service, Payment Service</td><td style="padding:10px 12px;color:#94A3B8">Publishes one event per customer action — Buy Now, card charged, return requested</td></tr>
              <tr style="border-bottom:1px solid #0F172A"><td style="padding:10px 12px;color:#F1F5F9;font-weight:700">Topic</td><td style="padding:10px 12px;color:#FF6900"><code style="background:#0A0E1A;color:#06B6D4;padding:1px 4px;border-radius:3px">orders</code>, <code style="background:#0A0E1A;color:#06B6D4;padding:1px 4px;border-radius:3px">payments</code>, <code style="background:#0A0E1A;color:#06B6D4;padding:1px 4px;border-radius:3px">returns</code></td><td style="padding:10px 12px;color:#94A3B8">Named channel that collects all events of a type from all producers globally</td></tr>
              <tr style="border-bottom:1px solid #0F172A"><td style="padding:10px 12px;color:#F1F5F9;font-weight:700">Partition</td><td style="padding:10px 12px;color:#FF6900">P0 = US-West · P1 = US-East · P2 = Intl</td><td style="padding:10px 12px;color:#94A3B8">Physical storage bin; orders within a partition stay in the exact sequence they arrived</td></tr>
              <tr style="border-bottom:1px solid #0F172A"><td style="padding:10px 12px;color:#F1F5F9;font-weight:700">Broker</td><td style="padding:10px 12px;color:#FF6900">Kafka server in Amazon us-east-1 datacenter</td><td style="padding:10px 12px;color:#94A3B8">Holds partitions on disk; leader handles writes, followers keep safe copies</td></tr>
              <tr style="border-bottom:1px solid #0F172A"><td style="padding:10px 12px;color:#F1F5F9;font-weight:700">Consumer</td><td style="padding:10px 12px;color:#FF6900">One Fulfillment Service instance reading P0</td><td style="padding:10px 12px;color:#94A3B8">Pulls the next order event, processes it, commits the offset</td></tr>
              <tr style="border-bottom:1px solid #0F172A"><td style="padding:10px 12px;color:#F1F5F9;font-weight:700">Consumer Group</td><td style="padding:10px 12px;color:#FF6900">All 3 Fulfillment Service instances together</td><td style="padding:10px 12px;color:#94A3B8">Splits the partitions — 3 consumers, 3 partitions, 3× throughput</td></tr>
              <tr style="border-bottom:1px solid #0F172A"><td style="padding:10px 12px;color:#F1F5F9;font-weight:700">Record Key</td><td style="padding:10px 12px;color:#FF6900"><code style="background:#0A0E1A;color:#06B6D4;padding:1px 4px;border-radius:3px">customer_id = "U-88234"</code></td><td style="padding:10px 12px;color:#94A3B8">Routes all orders from one customer to the same partition, preserving sequence</td></tr>
              <tr><td style="padding:10px 12px;color:#F1F5F9;font-weight:700">Offset</td><td style="padding:10px 12px;color:#FF6900">Position 847,231 in P0</td><td style="padding:10px 12px;color:#94A3B8">Bookmark — each group knows exactly which event to read next; safe restart point</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}
