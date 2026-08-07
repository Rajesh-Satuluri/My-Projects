import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  { q: 'How does KRaft replace ZooKeeper in Kafka?', a: 'KRaft uses a Raft-based consensus protocol built into Kafka itself. A small quorum of controller brokers (typically 3) maintain the cluster metadata log — topic/partition state, ISR lists, broker registrations. The active controller is the Raft leader. On controller failure, Raft elects a new leader in under 1 second. No ZooKeeper process, no separate cluster to operate. Metadata is stored as Kafka records in the __cluster_metadata topic, enabling snapshots and fast recovery.', tip: 'KRaft removes the 200k partition limit (ZK bottleneck) and achieves sub-second failover. Know that controllers can be combined with brokers (combined mode) or separate (dedicated mode).' },
  { q: 'What is an ISR and why does it matter for durability?', a: 'ISR (In-Sync Replicas) is the set of follower replicas that are caught up with the leader within replica.lag.time.max.ms (default 30s). When acks=all, the producer only receives acknowledgement after all ISR members have written the record. If a follower falls behind (slow disk, GC pause, network) it is removed from the ISR. A partition is unavailable for acks=all producers if ISR drops below min.insync.replicas.', tip: 'Say: ISR is the dynamic set of replicas that are eligible to become leader — it is the safety fence between "committed" and "durable".' },
  { q: 'Walk me through what happens when a Kafka broker dies.', a: 'The controller detects the dead broker via ZooKeeper session expiry (or Raft heartbeat timeout in KRaft). For each partition where the dead broker was leader, the controller selects the first replica in the ISR list as new leader and updates metadata. Clients (producers and consumers) fetch new metadata on the next request and reconnect to the new leader. Total failover time: typically 1–10 seconds with KRaft, up to 60s with ZooKeeper.', tip: 'Know the difference between clean shutdown (preferred leader election, fast) vs hard kill (ISR-based election, slower). unclean.leader.election.enable=false prevents data loss at the cost of availability.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M03 · Foundation',
    title: 'Kafka Architecture',
    subtitle: 'Brokers, controllers, topics, partitions, replication — how it all fits together',
    tabs: [
      { id: 'diagram',  label: '🏗️ Cluster Diagram' },
      { id: 'kraft',    label: '🔑 KRaft vs ZooKeeper' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  buildDiagram(container);
  buildKraft(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return null;
}

function buildDiagram(container) {
  const tab = container.querySelector('#tab-diagram');
  tab.innerHTML = `
    <div class="svg-wrap">
      <svg viewBox="0 0 860 480" width="860" height="480" style="font-family:system-ui">
        <defs>
          <marker id="a3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#475569"/>
          </marker>
          <marker id="a3r" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#FF6900"/>
          </marker>
        </defs>

        <!-- Producers -->
        <rect x="10" y="60" width="110" height="50" rx="8" fill="#1E293B" stroke="#FF6900" stroke-width="1.5"/>
        <text x="65" y="82" text-anchor="middle" fill="#FF6900" font-size="11" font-weight="700">Producer</text>
        <text x="65" y="98" text-anchor="middle" fill="#94A3B8" font-size="9">Order Service</text>

        <rect x="10" y="130" width="110" height="50" rx="8" fill="#1E293B" stroke="#FF6900" stroke-width="1.5"/>
        <text x="65" y="152" text-anchor="middle" fill="#FF6900" font-size="11" font-weight="700">Producer</text>
        <text x="65" y="168" text-anchor="middle" fill="#94A3B8" font-size="9">Payment Service</text>

        <!-- Arrows to cluster -->
        <line x1="120" y1="85" x2="200" y2="120" stroke="#FF6900" stroke-width="1.5" marker-end="url(#a3r)"/>
        <line x1="120" y1="155" x2="200" y2="200" stroke="#FF6900" stroke-width="1.5" marker-end="url(#a3r)"/>

        <!-- Cluster box -->
        <rect x="200" y="60" width="400" height="340" rx="12" fill="#0F172A" stroke="#334155" stroke-width="2"/>
        <text x="400" y="85" text-anchor="middle" fill="#475569" font-size="11" font-weight="700" letter-spacing="1">KAFKA CLUSTER</text>

        <!-- Broker 1 (controller+leader) -->
        <rect x="220" y="100" width="110" height="130" rx="8" fill="#1E293B" stroke="#FF6900" stroke-width="2"/>
        <text x="275" y="120" text-anchor="middle" fill="#FF6900" font-size="10" font-weight="800">Broker 1</text>
        <rect x="228" y="127" width="94" height="14" rx="4" fill="#FF690022"/>
        <text x="275" y="138" text-anchor="middle" fill="#FF6900" font-size="9">★ Controller</text>
        <text x="275" y="158" text-anchor="middle" fill="#94A3B8" font-size="9">orders P0 (L)</text>
        <text x="275" y="173" text-anchor="middle" fill="#94A3B8" font-size="9">payments P0 (L)</text>
        <text x="275" y="188" text-anchor="middle" fill="#64748B" font-size="9">orders P1 (F)</text>
        <text x="275" y="210" text-anchor="middle" fill="#475569" font-size="8">L=leader F=follower</text>

        <!-- Broker 2 -->
        <rect x="345" y="100" width="110" height="130" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
        <text x="400" y="120" text-anchor="middle" fill="#E2E8F0" font-size="10" font-weight="800">Broker 2</text>
        <text x="400" y="145" text-anchor="middle" fill="#94A3B8" font-size="9">orders P1 (L)</text>
        <text x="400" y="160" text-anchor="middle" fill="#64748B" font-size="9">orders P0 (F)</text>
        <text x="400" y="175" text-anchor="middle" fill="#64748B" font-size="9">payments P0 (F)</text>

        <!-- Broker 3 -->
        <rect x="470" y="100" width="110" height="130" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
        <text x="525" y="120" text-anchor="middle" fill="#E2E8F0" font-size="10" font-weight="800">Broker 3</text>
        <text x="525" y="145" text-anchor="middle" fill="#94A3B8" font-size="9">orders P2 (L)</text>
        <text x="525" y="160" text-anchor="middle" fill="#64748B" font-size="9">orders P1 (F)</text>

        <!-- Topics -->
        <rect x="220" y="255" width="360" height="50" rx="8" fill="#0A0E1A" stroke="#334155"/>
        <text x="260" y="276" fill="#FF6900" font-size="10" font-weight="700">orders</text>
        <text x="260" y="292" fill="#64748B" font-size="9">3 partitions · RF=3 · retention=7d</text>

        <rect x="220" y="315" width="360" height="50" rx="8" fill="#0A0E1A" stroke="#334155"/>
        <text x="260" y="336" fill="#3B82F6" font-size="10" font-weight="700">payments</text>
        <text x="260" y="352" fill="#64748B" font-size="9">1 partition · RF=3 · retention=30d</text>

        <!-- Arrows to consumers -->
        <line x1="600" y1="160" x2="680" y2="120" stroke="#475569" stroke-width="1.5" marker-end="url(#a3)"/>
        <line x1="600" y1="200" x2="680" y2="240" stroke="#475569" stroke-width="1.5" marker-end="url(#a3)"/>

        <!-- Consumer Groups -->
        <rect x="680" y="80" width="140" height="80" rx="8" fill="#1E293B" stroke="#10B981" stroke-width="1.5"/>
        <text x="750" y="103" text-anchor="middle" fill="#10B981" font-size="10" font-weight="700">Consumer Group</text>
        <text x="750" y="118" text-anchor="middle" fill="#94A3B8" font-size="9">fulfillment</text>
        <text x="750" y="135" text-anchor="middle" fill="#64A3B8" font-size="9">3 consumers</text>
        <text x="750" y="150" text-anchor="middle" fill="#64748B" font-size="8">1 per partition</text>

        <rect x="680" y="200" width="140" height="80" rx="8" fill="#1E293B" stroke="#8B5CF6" stroke-width="1.5"/>
        <text x="750" y="223" text-anchor="middle" fill="#8B5CF6" font-size="10" font-weight="700">Consumer Group</text>
        <text x="750" y="238" text-anchor="middle" fill="#94A3B8" font-size="9">fraud-detection</text>
        <text x="750" y="255" text-anchor="middle" fill="#64A3B8" font-size="9">1 consumer</text>
        <text x="750" y="270" text-anchor="middle" fill="#64748B" font-size="8">reads all partitions</text>

        <!-- Schema Registry -->
        <rect x="680" y="320" width="140" height="60" rx="8" fill="#1E293B" stroke="#F59E0B" stroke-width="1.5"/>
        <text x="750" y="345" text-anchor="middle" fill="#F59E0B" font-size="10" font-weight="700">Schema Registry</text>
        <text x="750" y="362" text-anchor="middle" fill="#94A3B8" font-size="9">Avro · Protobuf</text>

        <line x1="680" y1="350" x2="602" y2="350" stroke="#F59E0B" stroke-width="1" stroke-dasharray="4,3"/>
      </svg>
    </div>
    <div class="scroll-content">
      <div class="prose">
        <h3>How the pieces connect</h3>
        <p>Producers write to <strong>topic-partition leaders</strong> on specific brokers. Followers replicate asynchronously (or synchronously if acks=all). The controller broker manages partition leadership assignments. Consumer groups pull from leaders, each consumer owning a subset of partitions.</p>
        <p>In Amazon's cluster, the <code>orders</code> topic has 3 partitions spread across 3 brokers with RF=3 — every record is on every broker. Killing any one broker causes zero data loss and only 1–5s of unavailability while the controller reassigns leadership.</p>
      </div>
    </div>`;
}

function buildKraft(container) {
  const tab = container.querySelector('#tab-kraft');
  const rows = [
    ['Metadata store', 'External ZooKeeper (3–5 nodes)', 'Built-in Raft quorum (3 controllers)'],
    ['Controller failover', '30–60 seconds', '<1 second'],
    ['Max partitions', '~200,000 (ZK limit)', 'Millions (tested 3.3M)'],
    ['Operational cost', 'Run ZK cluster separately', 'Kafka manages itself'],
    ['Startup time', 'Load all ZK state at boot', 'Snapshot + delta log replay'],
    ['Metadata consistency', 'ZK watches, eventual', 'Strong (Raft log)'],
    ['GA since', '—', 'Kafka 3.3 (Oct 2022)'],
    ['ZK deprecated', '—', 'Kafka 3.5 (soft), 4.0 (removed)'],
  ];
  tab.innerHTML = `
    <div class="compare-table-wrap">
      <div class="section-header"><div class="section-title">KRaft vs ZooKeeper</div><div class="section-desc">Why Kafka replaced its external coordinator</div></div>
      <table class="compare-table">
        <thead><tr><th>Dimension</th><th>ZooKeeper Mode</th><th>KRaft Mode</th></tr></thead>
        <tbody>${rows.map(([d,z,k]) => `<tr><td style="font-weight:600;color:var(--text)">${d}</td><td>${z}</td><td style="color:var(--green)">${k}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;
}
