(() => {
  const IV = window.IcebergViz;

  const CSS = `
.sn-wrap { display:flex; flex-direction:column; gap:12px; padding:16px; font-family:'JetBrains Mono',monospace; }
.sn-tag  { display:inline-block; background:var(--delta); color:#fff; font-size:10px; font-weight:700;
           letter-spacing:.08em; padding:2px 8px; border-radius:3px; align-self:flex-start; }
.sn-h1   { font-size:18px; font-weight:700; color:var(--fg,#e2e8f0); margin:0; }
.sn-sub  { font-size:12px; color:var(--muted,#94a3b8); margin:0; }
.sn-body { display:flex; flex-direction:column; gap:10px; }
.sn-card { background:var(--surface2,#1e293b); border:1px solid var(--border,#334155); border-radius:8px; padding:12px 14px; }
.sn-card-h { font-size:12px; font-weight:700; color:var(--delta); margin:0 0 6px; text-transform:uppercase; letter-spacing:.06em; }
.sn-row  { display:flex; gap:10px; }
.sn-row .sn-card { flex:1; }
.sn-txt  { font-size:12px; color:var(--fg,#e2e8f0); line-height:1.55; margin:0; }
.sn-code { font-size:11px; color:#7dd3fc; white-space:pre; line-height:1.5; margin:0; }
.sn-stat { font-size:22px; font-weight:800; color:var(--delta); }
.sn-stat-lbl { font-size:11px; color:var(--muted,#94a3b8); margin-top:2px; }
.sn-tbl  { width:100%; border-collapse:collapse; font-size:11px; }
.sn-tbl th { color:var(--muted,#94a3b8); font-weight:600; text-align:left; padding:4px 8px; border-bottom:1px solid var(--border,#334155); }
.sn-tbl td { color:var(--fg,#e2e8f0); padding:4px 8px; border-bottom:1px solid #1e293b; }
.sn-tbl tr:last-child td { border-bottom:none; }
.sn-ok   { color:#4ade80; }
.sn-warn { color:#fbbf24; }
.sn-bad  { color:#f87171; }
.sn-pill { display:inline-block; font-size:10px; font-weight:700; padding:1px 7px; border-radius:10px;
           background:#1e3a5f; color:#7dd3fc; border:1px solid #2563eb; margin:2px 2px 0 0; }
.sn-timeline { display:flex; flex-direction:column; gap:4px; }
.sn-ver-row  { display:flex; align-items:center; gap:8px; }
.sn-ver-box  { font-size:10px; font-weight:700; padding:3px 8px; border-radius:4px; min-width:60px; text-align:center; }
.sn-ver-arrow { color:var(--muted,#94a3b8); flex:1; border-top:1px dashed #334155; }
.sn-ver-lbl  { font-size:10px; color:var(--fg,#e2e8f0); min-width:160px; }
`;

  const STEPS = [
    {
      title: 'What Is Snapshot Isolation?',
      render(container) {
        container.innerHTML = `
<div class="sn-wrap">
  <span class="sn-tag">READ OPS</span>
  <p class="sn-h1">Snapshot Isolation</p>
  <p class="sn-sub">Consistent reads in a concurrent world</p>
  <div class="sn-body">
    <div class="sn-card">
      <p class="sn-card-h">Definition</p>
      <p class="sn-txt">Snapshot isolation guarantees that a transaction reads a consistent snapshot of the data as it existed at the start of the transaction — no matter what other writers do concurrently. Once you start reading version N, you only ever see version N data.</p>
    </div>
    <div class="sn-row">
      <div class="sn-card">
        <p class="sn-card-h">Without It</p>
        <p class="sn-txt">Dirty reads, non-repeatable reads, phantom rows. A query that takes 30s might see different versions of different partitions.</p>
        <p class="sn-bad" style="font-size:11px;margin-top:6px">Result: inconsistent aggregates</p>
      </div>
      <div class="sn-card">
        <p class="sn-card-h">With It</p>
        <p class="sn-txt">Every query sees an atomic snapshot. A 30-minute ETL reads the exact same version of every file it touches, even as writers commit new versions.</p>
        <p class="sn-ok" style="font-size:11px;margin-top:6px">Result: always-consistent reads</p>
      </div>
    </div>
    <div class="sn-card">
      <p class="sn-card-h">Delta's Implementation</p>
      <p class="sn-txt">Delta resolves the table snapshot at query planning time by reading the latest transaction log version. All file references are locked to that version for the duration of the query. Writers create new versions atomically via log appends — they never mutate files the reader holds.</p>
    </div>
  </div>
</div>`;
      }
    },
    {
      title: 'Delta Implementation: Read at Version N',
      render(container) {
        container.innerHTML = `
<div class="sn-wrap">
  <span class="sn-tag">READ OPS</span>
  <p class="sn-h1">Read at Version N</p>
  <p class="sn-sub">How Delta locks a consistent snapshot</p>
  <div class="sn-body">
    <div class="sn-card">
      <p class="sn-card-h">Snapshot Resolution</p>
      <pre class="sn-code">-- At query start, Delta resolves version N:
-- 1. Read _delta_log/00000000000000000N.json
-- 2. Collect all 'add' actions → active file list
-- 3. All reads use only those files

-- Even if writer commits version N+1 mid-query,
-- the reader keeps working with version N files.</pre>
    </div>
    <div class="sn-card">
      <p class="sn-card-h">Timeline</p>
      <div class="sn-timeline">
        <div class="sn-ver-row">
          <div class="sn-ver-box" style="background:#1e3a5f;color:#7dd3fc;border:1px solid #2563eb">v12</div>
          <div class="sn-ver-arrow"></div>
          <div class="sn-ver-lbl">Query A starts — locked to v12</div>
        </div>
        <div class="sn-ver-row">
          <div class="sn-ver-box" style="background:#1c3a1c;color:#4ade80;border:1px solid #166534">v13</div>
          <div class="sn-ver-arrow"></div>
          <div class="sn-ver-lbl">Writer commits v13 (Query A unaffected)</div>
        </div>
        <div class="sn-ver-row">
          <div class="sn-ver-box" style="background:#1c3a1c;color:#4ade80;border:1px solid #166534">v14</div>
          <div class="sn-ver-arrow"></div>
          <div class="sn-ver-lbl">Writer commits v14 (Query A unaffected)</div>
        </div>
        <div class="sn-ver-row">
          <div class="sn-ver-box" style="background:#1e3a5f;color:#7dd3fc;border:1px solid #2563eb">v12</div>
          <div class="sn-ver-arrow"></div>
          <div class="sn-ver-lbl">Query A completes — saw only v12</div>
        </div>
        <div class="sn-ver-row">
          <div class="sn-ver-box" style="background:#3a1c1c;color:#f87171;border:1px solid #991b1b">v15</div>
          <div class="sn-ver-arrow"></div>
          <div class="sn-ver-lbl">Query B starts — locked to v15 (latest)</div>
        </div>
      </div>
    </div>
    <div class="sn-card">
      <p class="sn-card-h">Time Travel Read</p>
      <pre class="sn-code">-- Explicitly read at a specific version
SELECT * FROM silver.user_events VERSION AS OF 12;

-- Or by timestamp
SELECT * FROM silver.user_events
TIMESTAMP AS OF '2025-06-01 00:00:00';</pre>
    </div>
  </div>
</div>`;
      }
    },
    {
      title: 'Read-Write Concurrency',
      render(container) {
        container.innerHTML = `
<div class="sn-wrap">
  <span class="sn-tag">READ OPS</span>
  <p class="sn-h1">Read-Write Concurrency</p>
  <p class="sn-sub">Readers and writers never block each other</p>
  <div class="sn-body">
    <div class="sn-card">
      <p class="sn-card-h">No Read Locks</p>
      <p class="sn-txt">Delta readers never acquire locks on files. A writer can commit a new version while dozens of readers are running. Each reader holds an immutable reference to the file list at its snapshot version.</p>
    </div>
    <div class="sn-card">
      <p class="sn-card-h">Optimistic Concurrency Control (OCC)</p>
      <p class="sn-txt">Writers use OCC — they attempt to commit, and Delta checks for conflicts at commit time. If two writers modified overlapping files, one retries. Readers are never involved in this conflict resolution.</p>
      <pre class="sn-code">-- Writer conflict resolution:
-- Writer A: writes part-001.parquet, commits v13 ✓
-- Writer B: also targeting part-001.parquet
--   → detects conflict at commit time
--   → retries with updated snapshot ✓</pre>
    </div>
    <div class="sn-row">
      <div class="sn-card">
        <p class="sn-card-h">Concurrent ops OK</p>
        <span class="sn-pill">READ + WRITE</span>
        <span class="sn-pill">READ + READ</span>
        <span class="sn-pill">WRITE + WRITE (diff files)</span>
        <span class="sn-pill">OPTIMIZE + READ</span>
      </div>
      <div class="sn-card">
        <p class="sn-card-h">Conflict → Retry</p>
        <span class="sn-pill sn-warn">WRITE + WRITE (same files)</span>
        <span class="sn-pill sn-warn">DELETE + UPDATE (overlap)</span>
      </div>
    </div>
  </div>
</div>`;
      }
    },
    {
      title: 'MVCC Model',
      render(container) {
        container.innerHTML = `
<div class="sn-wrap">
  <span class="sn-tag">READ OPS</span>
  <p class="sn-h1">MVCC Model</p>
  <p class="sn-sub">Multi-Version Concurrency Control in Delta Lake</p>
  <div class="sn-body">
    <div class="sn-card">
      <p class="sn-card-h">How MVCC Works in Delta</p>
      <p class="sn-txt">Delta's MVCC is file-level, not row-level. Rather than versioning individual rows in-place, Delta creates new Parquet files for each write and records the new version in the transaction log. Old files remain on disk for the snapshot retention window.</p>
    </div>
    <div class="sn-card">
      <p class="sn-card-h">Version History on Disk</p>
      <svg viewBox="0 0 460 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:460px">
        <rect x="4" y="8" width="452" height="104" rx="6" fill="#1e293b" stroke="#334155"/>
        <!-- log files -->
        <rect x="14" y="20" width="78" height="36" rx="4" fill="#0f172a" stroke="#475569"/>
        <text x="53" y="34" font-family="'JetBrains Mono',monospace" font-size="8" fill="#94a3b8" text-anchor="middle">000000012.json</text>
        <text x="53" y="46" font-family="'JetBrains Mono',monospace" font-size="8" fill="#7dd3fc" text-anchor="middle">v12 adds/removes</text>

        <rect x="100" y="20" width="78" height="36" rx="4" fill="#0f172a" stroke="#475569"/>
        <text x="139" y="34" font-family="'JetBrains Mono',monospace" font-size="8" fill="#94a3b8" text-anchor="middle">000000013.json</text>
        <text x="139" y="46" font-family="'JetBrains Mono',monospace" font-size="8" fill="#7dd3fc" text-anchor="middle">v13 adds/removes</text>

        <rect x="186" y="20" width="78" height="36" rx="4" fill="#0f172a" stroke="#475569"/>
        <text x="225" y="34" font-family="'JetBrains Mono',monospace" font-size="8" fill="#94a3b8" text-anchor="middle">000000014.json</text>
        <text x="225" y="46" font-family="'JetBrains Mono',monospace" font-size="8" fill="#7dd3fc" text-anchor="middle">v14 adds/removes</text>

        <!-- parquet files row -->
        <text x="14" y="76" font-family="'JetBrains Mono',monospace" font-size="8" fill="#94a3b8">Parquet files (all versions coexist until VACUUM):</text>
        <text x="14" y="90" font-family="'JetBrains Mono',monospace" font-size="8" fill="#4ade80">part-v12-001.parquet</text>
        <text x="170" y="90" font-family="'JetBrains Mono',monospace" font-size="8" fill="#4ade80">part-v13-001.parquet</text>
        <text x="326" y="90" font-family="'JetBrains Mono',monospace" font-size="8" fill="#4ade80">part-v14-001.parquet</text>
        <text x="14" y="104" font-family="'JetBrains Mono',monospace" font-size="8" fill="#94a3b8">(v12 reader references v12 file; v14 reader references v14 file)</text>
      </svg>
    </div>
    <div class="sn-card">
      <p class="sn-card-h">Retention & VACUUM</p>
      <pre class="sn-code">-- Default retention: 7 days
-- Snapshots older than 7 days are cleaned by VACUUM

VACUUM silver.user_events RETAIN 168 HOURS; -- 7 days
-- NEVER run VACUUM with 0 hours — breaks concurrent reads</pre>
    </div>
  </div>
</div>`;
      }
    },
    {
      title: 'Serializable vs Snapshot Isolation',
      render(container) {
        container.innerHTML = `
<div class="sn-wrap">
  <span class="sn-tag">READ OPS</span>
  <p class="sn-h1">Isolation Levels</p>
  <p class="sn-sub">Snapshot vs Serializable — choose the right trade-off</p>
  <div class="sn-body">
    <div class="sn-card">
      <p class="sn-card-h">Isolation Levels Available</p>
      <table class="sn-tbl">
        <tr><th>Level</th><th>Prevents</th><th>Allows</th><th>Default</th></tr>
        <tr><td><b>Snapshot</b></td><td>Dirty read, non-repeatable read, phantom (within snapshot)</td><td>Write skew in theory</td><td class="sn-ok">Default for reads</td></tr>
        <tr><td><b>Serializable</b></td><td>All anomalies including write skew</td><td>—</td><td>Default for writes</td></tr>
      </table>
    </div>
    <div class="sn-card">
      <p class="sn-card-h">Configure Write Isolation</p>
      <pre class="sn-code">-- Default: Serializable (safest for writes)
ALTER TABLE silver.user_events
SET TBLPROPERTIES (
  'delta.isolationLevel' = 'Serializable'
);

-- Snapshot: higher write throughput, safe when
-- write-skew anomalies are acceptable
ALTER TABLE silver.user_events
SET TBLPROPERTIES (
  'delta.isolationLevel' = 'WriteSerializable'
);
-- WriteSerializable = serializable for blind appends,
-- snapshot for read-modify-write operations</pre>
    </div>
    <div class="sn-card">
      <p class="sn-card-h">WriteSerializable (Recommended)</p>
      <p class="sn-txt">The Databricks default for Delta tables. Serializable for writes that don't read existing data (appends). Snapshot isolation for writes that read-modify-write. Best balance of safety and throughput for most pipelines.</p>
    </div>
  </div>
</div>`;
      }
    },
    {
      title: 'MediaStream Concurrent Access',
      render(container) {
        container.innerHTML = `
<div class="sn-wrap">
  <span class="sn-tag">READ OPS</span>
  <p class="sn-h1">MediaStream Concurrent Access</p>
  <p class="sn-sub">Snapshot isolation in production pipelines</p>
  <div class="sn-body">
    <div class="sn-card">
      <p class="sn-card-h">gold.daily_kpis — Peak Concurrency Pattern</p>
      <table class="sn-tbl">
        <tr><th>Concurrent Operation</th><th>Result</th><th>Notes</th></tr>
        <tr>
          <td>Dashboard queries (×50)</td>
          <td class="sn-ok">All read v47 consistently</td>
          <td>Locked at query-start snapshot</td>
        </tr>
        <tr>
          <td>ETL writing v48</td>
          <td class="sn-ok">Writes succeed</td>
          <td>No read lock to contend with</td>
        </tr>
        <tr>
          <td>ML feature extraction</td>
          <td class="sn-ok">Reads v47 start to finish</td>
          <td>Consistent despite 40-min runtime</td>
        </tr>
        <tr>
          <td>OPTIMIZE runs</td>
          <td class="sn-ok">Succeeds, new v49</td>
          <td>Readers still see v47/v48</td>
        </tr>
      </table>
    </div>
    <div class="sn-row">
      <div class="sn-card">
        <p class="sn-card-h">Zero Stale Reads</p>
        <div style="text-align:center;padding:6px 0">
          <div class="sn-stat">0</div>
          <div class="sn-stat-lbl">inconsistent read incidents<br>since Delta migration</div>
        </div>
      </div>
      <div class="sn-card">
        <p class="sn-card-h">Concurrent Writers</p>
        <div style="text-align:center;padding:6px 0">
          <div class="sn-stat">12</div>
          <div class="sn-stat-lbl">peak simultaneous ETL writers<br>zero blocking observed</div>
        </div>
      </div>
    </div>
    <div class="sn-card">
      <p class="sn-card-h">Retention Policy</p>
      <pre class="sn-code">-- Retain 14 days for ML re-training reproducibility
ALTER TABLE gold.daily_kpis
SET TBLPROPERTIES (
  'delta.logRetentionDuration' = 'interval 14 days',
  'delta.deletedFileRetentionDuration' = 'interval 14 days'
);</pre>
    </div>
  </div>
</div>`;
      }
    },
  ];

  const styleId = 'sn-styles';

  window.IcebergViz.modules['snapshot-isolation'] = {
    id: 'snapshot-isolation',
    title: 'Snapshot Isolation',
    group: 'Read Operations',
    render(container) {
      if (!document.getElementById(styleId)) {
        const s = document.createElement('style');
        s.id = styleId;
        s.textContent = CSS;
        document.head.appendChild(s);
      }

      const engine = new IV.AnimationEngine({ steps: STEPS });
      engine.setContext({ el: container });

      STEPS.forEach((s, i) => {
        s.render = ((orig, idx) => function(el) {
          orig.call(this, el);
          engine.goto(idx);
        })(s.render, i);
      });

      const firstStep = STEPS[0];
      firstStep.render(container);
      IV.AnimationControls.register(engine);
    },
    destroy() {
      IV.AnimationControls.hide();
    }
  };
})();
