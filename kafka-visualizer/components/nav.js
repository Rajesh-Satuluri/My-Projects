export const MODULES = [
  // ── Foundation ───────────────────────────────────────────────────────────
  { id:'m01', label:'Why Kafka',               icon:'📜', group:'Foundation',   desc:'LinkedIn origins, messaging history, event streaming need' },
  { id:'m02', label:'Messaging Fundamentals',  icon:'📨', group:'Foundation',   desc:'Producers, brokers, topics, consumers, pub/sub vs queue' },
  { id:'m03', label:'Kafka Architecture',      icon:'🏗️', group:'Foundation',   desc:'Giant interactive cluster diagram — every component clickable' },
  // ── Core Internals ───────────────────────────────────────────────────────
  { id:'m04', label:'Producer Deep Dive',      icon:'⚡', group:'Core Internals', desc:'Serializer → Partitioner → Batch → acks — fully animated' },
  { id:'m05', label:'Broker Internals',        icon:'🖥️', group:'Core Internals', desc:'Log segments, page cache, index files, replication' },
  { id:'m06', label:'Partitions',              icon:'🗂️', group:'Core Internals', desc:'Distribution, ordering, parallelism, hot partition' },
  { id:'m07', label:'Replication',             icon:'🔁', group:'Core Internals', desc:'Leader, ISR, follower lag — kill a broker and watch recovery' },
  // ── Consumer Side ────────────────────────────────────────────────────────
  { id:'m08', label:'Consumer Groups',         icon:'👥', group:'Consumer Side', desc:'Assignment, rebalancing, cooperative vs stop-the-world' },
  { id:'m09', label:'Offsets',                 icon:'📍', group:'Consumer Side', desc:'Committed vs current, lag, replay, seek controls' },
  { id:'m10', label:'Retention & Compaction',  icon:'🗑️', group:'Consumer Side', desc:'Time/size retention, log compaction, tombstone records' },
  // ── Delivery ─────────────────────────────────────────────────────────────
  { id:'m11', label:'Delivery Guarantees',     icon:'🛡️', group:'Delivery',      desc:'At-most-once, at-least-once, exactly-once — live 3-lane comparison' },
  // ── Ecosystem ────────────────────────────────────────────────────────────
  { id:'m12', label:'Kafka Connect',           icon:'🔌', group:'Ecosystem',     desc:'Source & sink connectors, SMT, dead-letter queue' },
  { id:'m13', label:'Kafka Streams',           icon:'🌊', group:'Ecosystem',     desc:'DSL builder — map, filter, aggregate, join, state store' },
  { id:'m14', label:'Schema Registry',         icon:'📋', group:'Ecosystem',     desc:'Avro/Protobuf/JSON, backward/forward/full compatibility' },
  // ── Operations ───────────────────────────────────────────────────────────
  { id:'m15', label:'Security',                icon:'🔐', group:'Operations',    desc:'TLS handshake, SASL, ACL matrix, encrypted tunnel' },
  { id:'m16', label:'Monitoring',              icon:'📊', group:'Operations',    desc:'Live Grafana-style dashboard — lag, throughput, ISR, disk' },
  { id:'m17', label:'Performance Tuning',      icon:'🚀', group:'Operations',    desc:'Producer/consumer/broker configs with animated impact meters' },
  // ── Advanced ─────────────────────────────────────────────────────────────
  { id:'m18', label:'Failure Simulation',      icon:'💥', group:'Advanced',      desc:'Kill producers, brokers, leaders — watch recovery cascade' },
  { id:'m19', label:'Amazon Pipeline',         icon:'🛒', group:'Advanced',      desc:'End-to-end: order → Kafka → 8 services → Snowflake → BI' },
];

const GROUP_ORDER = ['Foundation','Core Internals','Consumer Side','Delivery','Ecosystem','Operations','Advanced'];

export function renderNav(activeId, done) {
  const nav = document.getElementById('nav-list');
  if (!nav) return;

  const groups = {};
  MODULES.forEach(m => {
    if (!groups[m.group]) groups[m.group] = [];
    groups[m.group].push(m);
  });

  nav.innerHTML = GROUP_ORDER.map(g => `
    <div class="nav-group">
      <div class="nav-group-label">${g}</div>
      ${(groups[g] || []).map(m => `
        <a href="#${m.id}" class="nav-item${m.id === activeId ? ' active' : ''}${done.has(m.id) ? ' done' : ''}" data-id="${m.id}">
          <span class="nav-icon">${m.icon}</span>
          <span class="nav-label">${m.label}</span>
          ${done.has(m.id) ? '<span class="nav-check">✓</span>' : ''}
        </a>
      `).join('')}
    </div>
  `).join('');
}

export function updateProgress(done) {
  const fill = document.getElementById('progress-fill');
  const count = document.getElementById('progress-count');
  if (fill) fill.style.width = `${(done.size / MODULES.length) * 100}%`;
  if (count) count.textContent = `${done.size} / ${MODULES.length}`;
}
