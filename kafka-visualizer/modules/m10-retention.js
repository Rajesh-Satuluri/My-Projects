import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { SegmentFill } from '../components/canvas-primitives.js';

const IQ = [
  { q: 'What is log compaction and when should you use it?', a: 'Log compaction retains the latest value for each key, discarding older records with the same key. This is the "table" model: the log becomes a changelog of the current state rather than a history. Use compaction for: change data capture (CDC) topics, materialized views, KTable in Kafka Streams, configuration topics. Do NOT use compaction for: audit logs, analytics topics where history matters. Compaction runs in background threads (log.cleaner.*), guaranteed to complete within log.cleaner.max.compaction.lag.ms.', tip: 'A tombstone record (key with null value) is kept temporarily, then deleted during next compaction — this is how you delete a key from a compacted topic.' },
  { q: 'How does Kafka determine when to delete a log segment?', a: 'Two retention policies: (1) Time-based: log.retention.hours (default 168 = 7 days). Kafka checks segment end time (timestamp of last record in segment). Entire segment is deleted when the segment end time is older than retention. (2) Size-based: log.retention.bytes per partition. Oldest segments deleted until total partition size ≤ limit. Both policies can be active simultaneously (OR logic — whichever triggers first wins). Applies per topic via retention.ms / retention.bytes config override.', tip: 'Retention is per partition, not per topic. A topic with 100 partitions and retention.bytes=1GB can use up to 100GB total.' },
  { q: 'What is the difference between delete and compact cleanup policies?', a: 'delete: segments past retention are permanently deleted. All records for a key are gone. compact: only the most recent record for each key is retained. History is lost but current state is preserved. compact,delete: both policies apply — compaction runs on the active portion, deletion runs on segments past retention. This is useful for topics that need compaction (current-state semantics) but also eventual eviction (e.g., expired customer data for GDPR).', tip: '"compact,delete" is the production-safe setting for changelog topics: you keep current state, but still evict old data within retention bounds.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M10 · Consumer Side',
    title: 'Retention & Compaction',
    subtitle: 'Time/size retention, log compaction, and tombstone records — visualized',
    tabs: [
      { id: 'retention',  label: '🗑️ Retention Policies' },
      { id: 'compaction', label: '🗜️ Log Compaction' },
      { id: 'iq',         label: '🎯 Interview Q&A' },
    ]
  });

  buildRetention(container);
  buildCompaction(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return null;
}

function buildRetention(container) {
  const tab = container.querySelector('#tab-retention');
  tab.innerHTML = `
    <div class="svg-wrap">
      <svg viewBox="0 0 800 380" width="800" height="380" style="font-family:system-ui">

        <!-- Time-based retention -->
        <text x="30" y="35" fill="#94A3B8" font-size="12" font-weight="700">Time-Based Retention (log.retention.hours=168 → 7 days)</text>

        <!-- Segments timeline -->
        ${[0,1,2,3,4,5,6,7].map((d,i) => {
          const x = 30 + i * 92;
          const old = i < 3;
          return `
            <rect x="${x}" y="50" width="80" height="50" rx="6"
              fill="${old ? '#EF444422' : '#1E293B'}"
              stroke="${old ? '#EF4444' : '#334155'}" stroke-width="1.5"/>
            <text x="${x+40}" y="71" text-anchor="middle" fill="${old?'#EF4444':'#94A3B8'}" font-size="10">Day ${d+1}</text>
            <text x="${x+40}" y="87" text-anchor="middle" fill="${old?'#EF4444':'#64748B'}" font-size="9">${old?'DELETED':i===7?'ACTIVE':'sealed'}</text>`;
        }).join('')}

        <text x="30" y="125" fill="#EF4444" font-size="10">Days 1–3: past 7-day window → deleted</text>
        <text x="30" y="141" fill="#94A3B8" font-size="10">Days 4–8: within retention → kept</text>

        <!-- Size-based retention -->
        <text x="30" y="190" fill="#94A3B8" font-size="12" font-weight="700">Size-Based Retention (log.retention.bytes=5GB per partition)</text>

        ${[0,1,2,3,4].map((i) => {
          const x = 30 + i * 152;
          const old = i === 0;
          const sizes = [1.2, 1.5, 0.9, 1.1, 0.6];
          return `
            <rect x="${x}" y="205" width="130" height="60" rx="6"
              fill="${old ? '#EF444422' : '#1E293B'}"
              stroke="${old ? '#EF4444' : '#334155'}" stroke-width="1.5"/>
            <text x="${x+65}" y="226" text-anchor="middle" fill="${old?'#EF4444':'#94A3B8'}" font-size="10">seg-${i} (${sizes[i]}GB)</text>
            <text x="${x+65}" y="244" text-anchor="middle" fill="${old?'#EF4444':'#64748B'}" font-size="9">${old?'→ DELETE (total=6.3GB>5GB)':'keep'}</text>
            <text x="${x+65}" y="260" text-anchor="middle" fill="${old?'#EF4444':'#475569'}" font-size="8">${old?'oldest segment first':''}</text>`;
        }).join('')}

        <!-- compact,delete -->
        <text x="30" y="310" fill="#94A3B8" font-size="12" font-weight="700">cleanup.policy=compact,delete — Both active simultaneously</text>
        <rect x="30" y="325" width="220" height="45" rx="8" fill="#1E293B" stroke="#F59E0B" stroke-width="1.5"/>
        <text x="140" y="345" text-anchor="middle" fill="#F59E0B" font-size="10" font-weight="700">Compacted segment</text>
        <text x="140" y="362" text-anchor="middle" fill="#94A3B8" font-size="9">latest key values only</text>

        <rect x="270" y="325" width="220" height="45" rx="8" fill="#EF444422" stroke="#EF4444" stroke-width="1.5"/>
        <text x="380" y="345" text-anchor="middle" fill="#EF4444" font-size="10" font-weight="700">Beyond retention.ms</text>
        <text x="380" y="362" text-anchor="middle" fill="#94A3B8" font-size="9">deleted regardless of compaction</text>

        <text x="510" y="350" fill="#64748B" font-size="10">= GDPR-safe changelog</text>
      </svg>
    </div>`;
}

function buildCompaction(container) {
  const tab = container.querySelector('#tab-compaction');
  tab.innerHTML = `
    <div class="svg-wrap">
      <svg viewBox="0 0 800 400" width="800" height="400" style="font-family:system-ui">

        <text x="30" y="30" fill="#94A3B8" font-size="12" font-weight="700">Log Compaction — Before</text>

        <!-- Before: all records -->
        ${[
          { k:'user:1', v:'Alice',    off:0,  color:'#3B82F6' },
          { k:'user:2', v:'Bob',      off:1,  color:'#10B981' },
          { k:'user:1', v:'Alicia',   off:2,  color:'#3B82F6', old:true },
          { k:'user:3', v:'Carol',    off:3,  color:'#F59E0B' },
          { k:'user:2', v:'Bobby',    off:4,  color:'#10B981', old:true },
          { k:'user:1', v:'Ali',      off:5,  color:'#3B82F6', old:true },
          { k:'user:2', v:'null(🪦)', off:6,  color:'#EF4444', tomb:true },
          { k:'user:4', v:'Dave',     off:7,  color:'#8B5CF6' },
        ].map((r, i) => `
          <rect x="${30 + i*92}" y="50" width="80" height="60" rx="6"
            fill="${r.old||r.tomb ? '#1E293B' : r.color+'22'}"
            stroke="${r.old ? '#334155' : r.tomb ? '#EF4444' : r.color}"
            stroke-width="${r.old ? 1 : 1.5}"
            stroke-dasharray="${r.old ? '4,3' : '0'}"/>
          <text x="${30 + i*92 + 40}" y="71" text-anchor="middle" fill="${r.old?'#475569':r.color}" font-size="9">${r.k}</text>
          <text x="${30 + i*92 + 40}" y="85" text-anchor="middle" fill="${r.old?'#475569':r.tomb?'#EF4444':'#94A3B8'}" font-size="9">${r.v}</text>
          <text x="${30 + i*92 + 40}" y="100" text-anchor="middle" fill="#475569" font-size="8">off:${r.off}</text>
          ${r.old ? `<text x="${30 + i*92 + 40}" y="118" text-anchor="middle" fill="#EF4444" font-size="8">stale</text>` : ''}
        `).join('')}

        <text x="30" y="155" fill="#94A3B8" font-size="10">Stale keys (dashed) will be removed. Tombstone (null value) marks key:user:2 for deletion.</text>

        <!-- Arrow -->
        <text x="370" y="200" text-anchor="middle" fill="#FF6900" font-size="20">↓</text>
        <text x="450" y="204" fill="#FF6900" font-size="12" font-weight="700">Compaction runs</text>

        <text x="30" y="240" fill="#94A3B8" font-size="12" font-weight="700">After Compaction</text>

        ${[
          { k:'user:1', v:'Ali',  off:5,  color:'#3B82F6' },
          { k:'user:3', v:'Carol',off:3,  color:'#F59E0B' },
          { k:'user:4', v:'Dave', off:7,  color:'#8B5CF6' },
        ].map((r, i) => `
          <rect x="${30 + i*110}" y="260" width="90" height="60" rx="6"
            fill="${r.color+'22'}" stroke="${r.color}" stroke-width="1.5"/>
          <text x="${30 + i*110 + 45}" y="281" text-anchor="middle" fill="${r.color}" font-size="10">${r.k}</text>
          <text x="${30 + i*110 + 45}" y="296" text-anchor="middle" fill="#94A3B8" font-size="10">${r.v}</text>
          <text x="${30 + i*110 + 45}" y="311" text-anchor="middle" fill="#475569" font-size="8">off:${r.off}</text>
        `).join('')}

        <rect x="360" y="260" width="120" height="60" rx="6" fill="#EF444411" stroke="#EF4444" stroke-width="1" stroke-dasharray="4,3"/>
        <text x="420" y="284" text-anchor="middle" fill="#EF4444" font-size="9">user:2 tombstone</text>
        <text x="420" y="300" text-anchor="middle" fill="#EF4444" font-size="9">retained briefly</text>
        <text x="420" y="316" text-anchor="middle" fill="#475569" font-size="8">then deleted</text>

        <text x="30" y="370" fill="#10B981" font-size="11">✅ Compacted log = current state of all keys. user:1 history gone, latest "Ali" remains.</text>
        <text x="30" y="387" fill="#10B981" font-size="11">✅ user:2 deleted (tombstone processed). Partition size reduced ~60%.</text>
      </svg>
    </div>`;
}
