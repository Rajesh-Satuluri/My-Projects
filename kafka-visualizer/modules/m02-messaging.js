import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  { q: 'What is the difference between a Kafka topic and a partition?', a: 'A topic is a logical channel — a named category of related events. A partition is the physical unit of storage and parallelism. Each topic is split into N partitions (configurable at creation). Each partition is an ordered, immutable sequence of records stored on a single broker. Parallelism scales with partition count: a consumer group can have at most one consumer per partition.', tip: 'Say "topic is the API, partition is the implementation" — topics are how you address data, partitions are how Kafka distributes and stores it.' },
  { q: 'What is the role of a Kafka broker?', a: 'A broker is a server process that stores and serves partitions. Each partition has a leader broker (handles all reads and writes) and optional follower brokers (replicate data for durability). In KRaft mode, 3 brokers in the controller quorum also manage metadata. A cluster can have 1 to thousands of brokers.', tip: 'Emphasize: a broker can be simultaneously a leader for some partitions and a follower for others — load is balanced across the cluster.' },
  { q: 'How does Kafka differ from pub/sub systems like Google Pub/Sub or SNS?', a: 'Kafka retains messages durably and consumers pull at their own pace. Pub/Sub systems typically push messages and delete on delivery. Kafka supports multiple independent consumer groups reading the same data; Pub/Sub fan-out requires creating separate subscriptions. Kafka provides strict partition-level ordering; Pub/Sub offers best-effort ordering. Kafka replay is native; Pub/Sub requires separate dead-letter management.', tip: 'For Amazon context: SNS+SQS is push-based fan-out (SNS) + competing consumers (SQS). Kafka unifies both patterns and adds durability.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M02 · Foundation',
    title: 'Messaging Fundamentals',
    subtitle: 'Producers, brokers, topics, consumers — the vocabulary of Kafka',
    tabs: [
      { id: 'concepts', label: '📖 Core Concepts' },
      { id: 'flow',     label: '🔄 Message Flow' },
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
    { icon: '📤', title: 'Producer', tag: 'Write Path', body: 'Publishes records to topics. Controls partitioning via key hashing or custom logic. Batches records and compresses before sending. Configures acks (0, 1, all) for durability guarantees.' },
    { icon: '📋', title: 'Topic', tag: 'Logical Channel', body: 'Named stream of related events. Immutable log — records are appended, never updated in place. Topics are split into partitions for parallelism. Configurable retention (time or size).' },
    { icon: '🗂️', title: 'Partition', tag: 'Physical Unit', body: 'Ordered, immutable sequence of records. Each partition assigned to one leader broker. Consumers in a group get exclusive ownership of partitions. Partition count = max consumer parallelism.' },
    { icon: '🖥️', title: 'Broker', tag: 'Storage Node', body: 'Kafka server that stores partitions on disk. Each partition has one leader and N-1 followers. Brokers handle produce, fetch, and metadata requests. KRaft controllers manage metadata quorum.' },
    { icon: '📥', title: 'Consumer', tag: 'Read Path', body: 'Pulls records from topic partitions. Maintains an offset — the position of the next record to read. Can replay by seeking to earlier offsets. Part of a consumer group for load-balanced consumption.' },
    { icon: '👥', title: 'Consumer Group', tag: 'Parallelism Unit', body: 'Named set of consumers sharing a topic subscription. Each partition assigned to exactly one consumer. Multiple groups can read same topic independently — zero contention.' },
    { icon: '🔑', title: 'Record Key', tag: 'Routing', body: 'Optional byte[] key that determines partition assignment. Records with the same key always land in the same partition — guaranteeing order for a given entity (e.g., user_id, order_id).' },
    { icon: '📍', title: 'Offset', tag: 'Position Pointer', body: 'Monotonically increasing integer per partition. Consumers commit offsets to track progress. Enables at-least-once, at-most-once, or exactly-once semantics based on when offset is committed.' },
  ];
  tab.innerHTML = `<div class="info-grid">${items.map(c => `
    <div class="info-card">
      <div class="info-card-icon">${c.icon}</div>
      <div class="info-card-title">${c.title}</div>
      <div class="info-card-tag">${c.tag}</div>
      <div class="info-card-body" style="margin-top:8px">${c.body}</div>
    </div>`).join('')}</div>`;
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
        </defs>

        <!-- Producer -->
        <rect x="20" y="130" width="120" height="80" rx="10" fill="#1E293B" stroke="#FF6900" stroke-width="1.5"/>
        <text x="80" y="165" text-anchor="middle" fill="#FF6900" font-weight="700" font-size="12">Producer</text>
        <text x="80" y="182" text-anchor="middle" fill="#94A3B8" font-size="10">Amazon Order</text>
        <text x="80" y="196" text-anchor="middle" fill="#94A3B8" font-size="10">Service</text>

        <!-- Broker -->
        <rect x="220" y="80" width="380" height="180" rx="10" fill="#0F172A" stroke="#334155" stroke-width="1.5"/>
        <text x="410" y="105" text-anchor="middle" fill="#64748B" font-size="10" font-weight="700">BROKER · Topic: orders</text>

        <!-- Partition 0 -->
        <rect x="240" y="115" width="340" height="36" rx="6" fill="#1E293B" stroke="#334155"/>
        <text x="252" y="138" fill="#94A3B8" font-size="10">P0</text>
        <rect x="270" y="120" width="36" height="26" rx="3" fill="#FF690033" stroke="#FF6900" stroke-width="1"/>
        <text x="288" y="137" text-anchor="middle" fill="#FF6900" font-size="9">off:5</text>
        <rect x="310" y="120" width="36" height="26" rx="3" fill="#FF690033" stroke="#FF6900" stroke-width="1"/>
        <text x="328" y="137" text-anchor="middle" fill="#FF6900" font-size="9">off:6</text>
        <rect x="350" y="120" width="36" height="26" rx="3" fill="#FF6900" stroke="#FF6900" stroke-width="1"/>
        <text x="368" y="137" text-anchor="middle" fill="#fff" font-size="9">off:7</text>
        <text x="398" y="137" fill="#64748B" font-size="10">← new record</text>

        <!-- Partition 1 -->
        <rect x="240" y="157" width="340" height="36" rx="6" fill="#1E293B" stroke="#334155"/>
        <text x="252" y="180" fill="#94A3B8" font-size="10">P1</text>
        <rect x="270" y="162" width="36" height="26" rx="3" fill="#3B82F633" stroke="#3B82F6" stroke-width="1"/>
        <text x="288" y="179" text-anchor="middle" fill="#3B82F6" font-size="9">off:3</text>
        <rect x="310" y="162" width="36" height="26" rx="3" fill="#3B82F633" stroke="#3B82F6" stroke-width="1"/>
        <text x="328" y="179" text-anchor="middle" fill="#3B82F6" font-size="9">off:4</text>

        <!-- Partition 2 -->
        <rect x="240" y="199" width="340" height="36" rx="6" fill="#1E293B" stroke="#334155"/>
        <text x="252" y="222" fill="#94A3B8" font-size="10">P2</text>
        <rect x="270" y="204" width="36" height="26" rx="3" fill="#10B98133" stroke="#10B981" stroke-width="1"/>
        <text x="288" y="221" text-anchor="middle" fill="#10B981" font-size="9">off:1</text>

        <!-- Arrow producer → broker -->
        <line x1="140" y1="170" x2="218" y2="140" stroke="#FF6900" stroke-width="1.5" marker-end="url(#arr)"/>
        <text x="168" y="148" fill="#FF6900" font-size="9">produce</text>

        <!-- Consumer A -->
        <rect x="660" y="100" width="120" height="70" rx="10" fill="#1E293B" stroke="#FF6900" stroke-width="1.5"/>
        <text x="720" y="128" text-anchor="middle" fill="#FF6900" font-weight="700" font-size="12">Consumer A</text>
        <text x="720" y="144" text-anchor="middle" fill="#94A3B8" font-size="10">Inventory</text>
        <text x="720" y="158" text-anchor="middle" fill="#94A3B8" font-size="9">Group: fulfillment</text>

        <!-- Consumer B -->
        <rect x="660" y="190" width="120" height="70" rx="10" fill="#1E293B" stroke="#3B82F6" stroke-width="1.5"/>
        <text x="720" y="218" text-anchor="middle" fill="#3B82F6" font-weight="700" font-size="12">Consumer B</text>
        <text x="720" y="234" text-anchor="middle" fill="#94A3B8" font-size="10">Fraud Detect</text>
        <text x="720" y="248" text-anchor="middle" fill="#94A3B8" font-size="9">Group: fraud</text>

        <!-- Arrows broker → consumers -->
        <line x1="580" y1="133" x2="658" y2="133" stroke="#FF6900" stroke-width="1.5" marker-end="url(#arr)"/>
        <line x1="580" y1="175" x2="658" y2="218" stroke="#3B82F6" stroke-width="1.5" marker-end="url(#arr)"/>

        <text x="608" y="126" fill="#FF6900" font-size="9">fetch P0</text>
        <text x="600" y="202" fill="#3B82F6" font-size="9">fetch all Px</text>
      </svg>
    </div>
    <div class="scroll-content">
      <div class="prose">
        <h3>Amazon Order Flow</h3>
        <p>The Amazon Order Service produces <code>OrderPlaced</code> events to the <code>orders</code> topic. The partition key is <code>customer_id</code>, so all events for a given customer land in the same partition — preserving per-customer order.</p>
        <p>Two independent consumer groups subscribe: <strong>fulfillment</strong> (picks/packs/ships) and <strong>fraud</strong> (real-time ML scoring). Each group reads the topic independently — fulfillment reading P0, fraud reading all partitions. Neither knows the other exists.</p>
      </div>
    </div>`;
}
