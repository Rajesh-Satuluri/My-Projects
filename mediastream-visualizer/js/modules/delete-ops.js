(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'DELETE Overview',
      desc: 'Delta DELETE marks rows for removal in the transaction log',
      detail: 'Delta DELETE does not physically erase data immediately. It reads matching files, rewrites them without the deleted rows, and records "remove" actions in the _delta_log. Old versions remain accessible for time travel until VACUUM.',
    },
    {
      label: 'DELETE Mechanics',
      desc: 'Copy-on-write: matching files are rewritten, non-matching files are untouched',
      detail: 'Files that contain no deleted rows are referenced by the new commit unchanged. Files that contain at least one deleted row are rewritten (filtered). The transaction log records one "remove" and one "add" per rewritten file.',
    },
    {
      label: 'GDPR Delete',
      desc: 'Right-to-erasure: delete user_id=u_847 across all MediaStream tables',
      detail: 'GDPR Article 17 requires erasure within 30 days of request. MediaStream\'s DeletionRequest pipeline issues DELETE against Bronze, Silver, Gold, and ML feature tables. Time-travel versions containing the PII are cleaned by VACUUM RETAIN 0 HOURS after deletion.',
    },
    {
      label: 'Soft Delete',
      desc: 'Logical delete: add is_deleted column, filter on read',
      detail: 'Some pipelines use a soft-delete pattern: set is_deleted=true instead of physically removing rows. Downstream consumers add WHERE NOT is_deleted. Useful when audit trails must be preserved or when DELETE performance is a concern.',
    },
    {
      label: 'Partition Delete',
      desc: 'Drop an entire partition atomically — fastest deletion strategy',
      detail: 'WHEN deleting all rows within a partition (e.g., DROP all data for region=eu-west-1 after a data residency violation), DELETE WHERE partition_col = value skips file rewriting — the transaction log simply marks all partition files as "remove". Instant regardless of partition size.',
    },
    {
      label: 'VACUUM After',
      desc: 'Physically remove deleted file versions with VACUUM',
      detail: 'VACUUM purges Parquet files no longer referenced by any active version. Default retention: 7 days. For GDPR erasure, VACUUM RETAIN 0 HOURS forces immediate physical deletion — requires disabling the retention threshold check.',
    },
  ];

  let _engine = null;

  const DIAGRAMS = [
    // Step 0: DELETE Overview
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Delta DELETE — Soft then Hard Removal</text>
      <!-- SQL -->
      <rect x="15" y="35" width="450" height="42" rx="4" fill="#0f172a" stroke="#ef4444"/>
      <text x="30" y="55" fill="#ef4444" font-size="10" font-weight="bold">DELETE FROM prod.mediastream.user_events_silver</text>
      <text x="30" y="70" fill="#ef4444" font-size="10">WHERE user_id = 'u_847292' AND event_ts &lt; '2024-01-01'</text>
      <!-- Before -->
      <rect x="15" y="90" width="200" height="100" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="115" y="107" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">Before (v41)</text>
      <text x="30" y="122" fill="#38bdf8" font-size="9">part-0041.parquet  → u_847, play, Jan 15</text>
      <text x="30" y="135" fill="#38bdf8" font-size="9">part-0041.parquet  → u_291, play, Jan 14</text>
      <text x="30" y="148" fill="#38bdf8" font-size="9">part-0188.parquet  → u_847, pause, Jan 10</text>
      <text x="30" y="161" fill="#38bdf8" font-size="9">part-0199.parquet  → u_553, seek, Jan 22</text>
      <text x="30" y="175" fill="#38bdf8" font-size="9">part-0199.parquet  → u_847, quit, Jan 22</text>
      <!-- Arrow -->
      <text x="240" y="140" text-anchor="middle" fill="#64748b" font-size="18">→</text>
      <!-- After -->
      <rect x="265" y="90" width="200" height="100" rx="4" fill="#1e293b" stroke="#4ade80"/>
      <text x="365" y="107" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="bold">After (v42)</text>
      <text x="280" y="122" fill="#ef4444" font-size="9" text-decoration="line-through">part-0041 u_847 Jan15</text>
      <text x="280" y="122" fill="#ef4444" dx="155" font-size="8">rewritten</text>
      <text x="280" y="135" fill="#4ade80" font-size="9">part-0041 u_291 Jan14  kept</text>
      <text x="280" y="148" fill="#ef4444" font-size="9" text-decoration="line-through">part-0041 u_847 Jan10</text>
      <text x="280" y="148" fill="#ef4444" dx="155" font-size="8">removed</text>
      <text x="280" y="161" fill="#4ade80" font-size="9">part-0199 u_553 Jan22  unchanged</text>
      <text x="280" y="175" fill="#4ade80" font-size="9">part-0199 u_847 Jan22  kept (≥Jan01)</text>
      <!-- Delta log note -->
      <rect x="15" y="205" width="450" height="70" rx="4" fill="#0f172a" stroke="#334155"/>
      <text x="30" y="223" fill="#64748b" font-size="9">_delta_log/00000...0042.json records:</text>
      <text x="30" y="237" fill="#ef4444" font-size="9">{"remove": {"path": "part-0041.parquet", "deletionTimestamp": 1706054400000}}</text>
      <text x="30" y="251" fill="#ef4444" font-size="9">{"remove": {"path": "part-0188.parquet", "deletionTimestamp": 1706054400000}}</text>
      <text x="30" y="265" fill="#4ade80" font-size="9">{"add":    {"path": "part-0041-v42.parquet"}}  ← rewritten without u_847 Jan15/Jan10</text>
    </svg>`,

    // Step 1: DELETE Mechanics
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Copy-on-Write Mechanics</text>
      <!-- File A has match -->
      <rect x="15" y="38" width="130" height="100" rx="4" fill="#1e293b" stroke="#ef4444"/>
      <text x="80" y="55" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="bold">part-0041.parquet</text>
      <text x="80" y="70" text-anchor="middle" fill="#64748b" font-size="8">Contains deleted rows</text>
      <text x="30" y="85" fill="#ef4444" font-size="8">row1: u_847 Jan15 ← DELETE</text>
      <text x="30" y="98" fill="#4ade80" font-size="8">row2: u_291 Jan14 ← keep</text>
      <text x="30" y="111" fill="#ef4444" font-size="8">row3: u_847 Jan10 ← DELETE</text>
      <text x="80" y="130" text-anchor="middle" fill="#ef4444" font-size="8">MUST BE REWRITTEN</text>
      <!-- File B no match -->
      <rect x="155" y="38" width="130" height="100" rx="4" fill="#1e293b" stroke="#4ade80"/>
      <text x="220" y="55" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">part-0199.parquet</text>
      <text x="220" y="70" text-anchor="middle" fill="#64748b" font-size="8">No deleted rows</text>
      <text x="170" y="85" fill="#4ade80" font-size="8">row1: u_553 Jan22 ← keep</text>
      <text x="170" y="98" fill="#4ade80" font-size="8">row2: u_847 Jan22 ← keep</text>
      <text x="220" y="130" text-anchor="middle" fill="#4ade80" font-size="8">UNTOUCHED (pointer only)</text>
      <!-- New file -->
      <rect x="295" y="38" width="130" height="100" rx="4" fill="#0a1628" stroke="#38bdf8"/>
      <text x="360" y="55" text-anchor="middle" fill="#38bdf8" font-size="9" font-weight="bold">part-0041-v42.parquet</text>
      <text x="360" y="70" text-anchor="middle" fill="#64748b" font-size="8">New file (rewrite of 0041)</text>
      <text x="310" y="85" fill="#4ade80" font-size="8">row1: u_291 Jan14 ← only row</text>
      <text x="360" y="130" text-anchor="middle" fill="#38bdf8" font-size="8">CREATED BY SPARK</text>
      <!-- Transaction log summary -->
      <rect x="15" y="155" width="450" height="70" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="240" y="173" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">Transaction Log Entry v42</text>
      <text x="30" y="188" fill="#ef4444" font-size="9">remove: part-0041.parquet  (now unreferenced — accessible via time-travel until VACUUM)</text>
      <text x="30" y="202" fill="#4ade80" font-size="9">add:    part-0041-v42.parquet  (2 rows deleted, 1 row remains)</text>
      <text x="30" y="216" fill="#64748b" font-size="9">part-0199.parquet stays referenced — not re-added, just kept in the active file list</text>
      <text x="240" y="249" text-anchor="middle" fill="#64748b" font-size="9">Cost: proportional to bytes in rewritten files, NOT total table size</text>
      <text x="240" y="263" text-anchor="middle" fill="#64748b" font-size="9">If user_id is a partition column, ALL files in that partition are marked remove — instant</text>
    </svg>`,

    // Step 2: GDPR Delete
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <defs>
        <linearGradient id="do-gdpr" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ef4444"/>
          <stop offset="100%" stop-color="#f97316"/>
        </linearGradient>
      </defs>
      <rect x="15" y="12" width="450" height="26" rx="4" fill="url(#do-gdpr)"/>
      <text x="240" y="29" text-anchor="middle" fill="white" font-weight="bold" font-size="12">GDPR Right-to-Erasure Pipeline — MediaStream</text>
      <!-- Request -->
      <rect x="15" y="48" width="110" height="55" rx="4" fill="#1e293b" stroke="#ef4444"/>
      <text x="70" y="65" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="bold">Erasure Request</text>
      <text x="70" y="79" text-anchor="middle" fill="#64748b" font-size="8">user_id: u_847292</text>
      <text x="70" y="92" text-anchor="middle" fill="#64748b" font-size="8">SLA: 30 days</text>
      <!-- Tables to delete from -->
      <rect x="145" y="48" width="315" height="55" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="302" y="65" text-anchor="middle" fill="#94a3b8" font-size="9" font-weight="bold">Tables requiring erasure</text>
      <text x="155" y="79" fill="#38bdf8" font-size="8">user_events_bronze</text>
      <text x="155" y="91" fill="#38bdf8" font-size="8">user_events_silver</text>
      <text x="255" y="79" fill="#38bdf8" font-size="8">user_events_gold (aggregates)</text>
      <text x="255" y="91" fill="#38bdf8" font-size="8">rec_features_gold</text>
      <text x="370" y="79" fill="#38bdf8" font-size="8">ml_feature_store</text>
      <text x="370" y="91" fill="#38bdf8" font-size="8">user_profile_silver</text>
      <!-- SQL block -->
      <rect x="15" y="115" width="450" height="85" rx="4" fill="#0f172a" stroke="#334155"/>
      <text x="30" y="131" fill="#64748b" font-size="9">deletion_request_pipeline.py — runs for each GDPR request:</text>
      <text x="30" y="146" fill="#ef4444" font-size="10">DELETE FROM prod.mediastream.user_events_bronze WHERE user_id = :uid;</text>
      <text x="30" y="160" fill="#ef4444" font-size="10">DELETE FROM prod.mediastream.user_events_silver WHERE user_id = :uid;</text>
      <text x="30" y="174" fill="#ef4444" font-size="10">DELETE FROM prod.mediastream.rec_features_gold  WHERE user_id = :uid;</text>
      <text x="30" y="188" fill="#ef4444" font-size="10">-- run for all 6 tables; Unity Catalog lineage resolves full set automatically</text>
      <!-- VACUUM step -->
      <rect x="15" y="210" width="450" height="70" rx="4" fill="#1c0a0a" stroke="#a855f7"/>
      <text x="240" y="228" text-anchor="middle" fill="#a855f7" font-size="10" font-weight="bold">Step 2: VACUUM to purge time-travel copies containing PII</text>
      <text x="30" y="244" fill="#64748b" font-size="9">-- GDPR requires physical erasure, not just logical delete:</text>
      <text x="30" y="258" fill="#a855f7" font-size="10">SET spark.databricks.delta.retentionDurationCheck.enabled = false;</text>
      <text x="30" y="272" fill="#a855f7" font-size="10">VACUUM prod.mediastream.user_events_bronze RETAIN 0 HOURS;</text>
    </svg>`,

    // Step 3: Soft Delete
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Soft Delete Pattern — Logical Removal, Physical Preservation</text>
      <!-- Schema change -->
      <rect x="15" y="38" width="450" height="55" rx="4" fill="#1e293b" stroke="#fbbf24"/>
      <text x="240" y="56" text-anchor="middle" fill="#fbbf24" font-size="10" font-weight="bold">Add is_deleted column to user_events_silver</text>
      <text x="30" y="71" fill="#a855f7" font-size="10">ALTER TABLE prod.mediastream.user_events_silver ADD COLUMN is_deleted BOOLEAN DEFAULT false;</text>
      <text x="30" y="85" fill="#a855f7" font-size="10">ALTER TABLE prod.mediastream.user_events_silver ADD COLUMN deleted_at TIMESTAMP;</text>
      <!-- Update instead of delete -->
      <rect x="15" y="103" width="450" height="55" rx="4" fill="#0f172a" stroke="#334155"/>
      <text x="30" y="120" fill="#64748b" font-size="9">Soft-delete: UPDATE instead of DELETE</text>
      <text x="30" y="135" fill="#38bdf8" font-size="10">UPDATE prod.mediastream.user_events_silver</text>
      <text x="30" y="149" fill="#38bdf8" font-size="10">SET is_deleted = true, deleted_at = current_timestamp()</text>
      <text x="30" y="163" fill="#38bdf8" font-size="10">WHERE user_id = 'u_847292' AND event_ts &lt; '2024-01-01';</text>
      <!-- Read pattern -->
      <rect x="15" y="168" width="450" height="42" rx="4" fill="#1e293b" stroke="#4ade80"/>
      <text x="30" y="184" fill="#64748b" font-size="9">All downstream reads add the soft-delete filter:</text>
      <text x="30" y="198" fill="#4ade80" font-size="10">SELECT * FROM prod.mediastream.user_events_silver WHERE NOT is_deleted;</text>
      <!-- When to use -->
      <rect x="15" y="221" width="215" height="65" rx="4" fill="#1e293b" stroke="#4ade80"/>
      <text x="122" y="238" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">Use soft delete when:</text>
      <text x="30" y="252" fill="#64748b" font-size="8">• Audit trail must be preserved</text>
      <text x="30" y="264" fill="#64748b" font-size="8">• Deletion rate is very high</text>
      <text x="30" y="276" fill="#64748b" font-size="8">• Restore capability needed</text>
      <rect x="250" y="221" width="215" height="65" rx="4" fill="#1e293b" stroke="#ef4444"/>
      <text x="357" y="238" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="bold">Use hard DELETE when:</text>
      <text x="265" y="252" fill="#64748b" font-size="8">• GDPR / right-to-erasure required</text>
      <text x="265" y="264" fill="#64748b" font-size="8">• Storage cost is a concern</text>
      <text x="265" y="276" fill="#64748b" font-size="8">• Query simplicity preferred</text>
    </svg>`,

    // Step 4: Partition Delete
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">Partition Delete — Instant Removal of Entire Partition</text>
      <!-- Scenario -->
      <rect x="15" y="38" width="450" height="42" rx="4" fill="#1c0a0a" stroke="#ef4444"/>
      <text x="240" y="56" text-anchor="middle" fill="#ef4444" font-size="10" font-weight="bold">Scenario: GDPR data residency — must delete all eu-west-1 data older than 90 days</text>
      <text x="240" y="70" text-anchor="middle" fill="#64748b" font-size="9">user_events_silver partitioned by (region, date). eu-west-1 has 1.4B rows across 420 Parquet files.</text>
      <!-- SQL comparison -->
      <rect x="15" y="90" width="215" height="85" rx="4" fill="#1c0a0a" stroke="#ef4444"/>
      <text x="122" y="107" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="bold">Row-by-Row DELETE (slow)</text>
      <text x="30" y="122" fill="#a855f7" font-size="9">DELETE FROM user_events_silver</text>
      <text x="30" y="136" fill="#a855f7" font-size="9">WHERE region = 'eu-west-1'</text>
      <text x="30" y="150" fill="#a855f7" font-size="9">AND date &lt; '2023-10-24';</text>
      <text x="30" y="168" fill="#ef4444" font-size="8">Rewrites 420 files: ~3 hours</text>
      <rect x="250" y="90" width="215" height="85" rx="4" fill="#0a1628" stroke="#4ade80"/>
      <text x="357" y="107" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="bold">Partition Drop (instant)</text>
      <text x="265" y="122" fill="#4ade80" font-size="9">ALTER TABLE user_events_silver</text>
      <text x="265" y="136" fill="#4ade80" font-size="9">DROP PARTITION</text>
      <text x="265" y="150" fill="#4ade80" font-size="9">(region='eu-west-1',</text>
      <text x="265" y="164" fill="#4ade80" font-size="9"> date &lt; '2023-10-24');</text>
      <text x="357" y="168" text-anchor="middle" fill="#4ade80" font-size="8">Marks 420 files "remove": &lt;1s</text>
      <!-- How it works -->
      <rect x="15" y="190" width="450" height="90" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="240" y="208" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">Why Partition Delete Is Instant</text>
      <text x="30" y="224" fill="#64748b" font-size="9">Delta evaluates the predicate against partition directory names, not file contents.</text>
      <text x="30" y="238" fill="#64748b" font-size="9">Files in matching partitions are added to the _delta_log as "remove" actions — no data read.</text>
      <text x="30" y="252" fill="#64748b" font-size="9">The transaction log entry is a list of 420 "remove" JSON objects — written in milliseconds.</text>
      <text x="30" y="266" fill="#4ade80" font-size="9">Storage is reclaimed by VACUUM; time-travel still works back to pre-drop versions.</text>
    </svg>`,

    // Step 5: VACUUM After
    `<svg viewBox="0 0 480 300" font-family="'JetBrains Mono',monospace" font-size="11">
      <text x="240" y="22" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">VACUUM — Physical Purge of Deleted File Versions</text>
      <!-- Timeline -->
      <text x="240" y="48" text-anchor="middle" fill="#64748b" font-size="9">user_events_silver after DELETE v42 — time-travel window</text>
      <line x1="40" y1="70" x2="440" y2="70" stroke="#334155" stroke-width="2"/>
      <circle cx="40" cy="70" r="4" fill="#ef4444"/>
      <text x="40" y="87" text-anchor="middle" fill="#ef4444" font-size="8">v41</text>
      <text x="40" y="98" text-anchor="middle" fill="#64748b" font-size="7">contains u_847</text>
      <text x="40" y="109" text-anchor="middle" fill="#64748b" font-size="7">PII still on disk</text>
      <circle cx="200" cy="70" r="4" fill="#fbbf24"/>
      <text x="200" y="87" text-anchor="middle" fill="#fbbf24" font-size="8">v42 (DELETE)</text>
      <text x="200" y="98" text-anchor="middle" fill="#64748b" font-size="7">u_847 logically removed</text>
      <text x="200" y="109" text-anchor="middle" fill="#64748b" font-size="7">old files still on disk</text>
      <circle cx="440" cy="70" r="4" fill="#4ade80"/>
      <text x="440" y="87" text-anchor="middle" fill="#4ade80" font-size="8">VACUUM</text>
      <text x="440" y="98" text-anchor="middle" fill="#4ade80" font-size="7">physically purges</text>
      <text x="440" y="109" text-anchor="middle" fill="#4ade80" font-size="7">old Parquet files</text>
      <!-- Normal VACUUM -->
      <rect x="15" y="125" width="215" height="80" rx="4" fill="#1e293b" stroke="#fbbf24"/>
      <text x="122" y="143" text-anchor="middle" fill="#fbbf24" font-size="10" font-weight="bold">Normal VACUUM (7-day)</text>
      <text x="30" y="158" fill="#a855f7" font-size="9">VACUUM prod.mediastream.user_events_silver</text>
      <text x="30" y="172" fill="#a855f7" font-size="9">RETAIN 168 HOURS;</text>
      <text x="30" y="186" fill="#64748b" font-size="8">Purges files older than 7 days</text>
      <text x="30" y="199" fill="#64748b" font-size="8">Preserves last 7 days time-travel</text>
      <!-- GDPR VACUUM -->
      <rect x="250" y="125" width="215" height="80" rx="4" fill="#1c0a0a" stroke="#ef4444"/>
      <text x="357" y="143" text-anchor="middle" fill="#ef4444" font-size="10" font-weight="bold">GDPR VACUUM (0 hours)</text>
      <text x="265" y="158" fill="#a855f7" font-size="9">SET spark.databricks.delta</text>
      <text x="265" y="171" fill="#a855f7" font-size="9">  .retentionDurationCheck.enabled</text>
      <text x="265" y="184" fill="#a855f7" font-size="9">  = false;</text>
      <text x="265" y="197" fill="#ef4444" font-size="9">VACUUM … RETAIN 0 HOURS;</text>
      <!-- Warning + schedule -->
      <rect x="15" y="218" width="450" height="67" rx="4" fill="#1e293b" stroke="#334155"/>
      <text x="240" y="235" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">MediaStream VACUUM Schedule</text>
      <text x="30" y="251" fill="#64748b" font-size="9">Nightly 04:00 UTC: VACUUM RETAIN 720 HOURS (30 days) on all Silver/Gold tables</text>
      <text x="30" y="264" fill="#fbbf24" font-size="9">GDPR requests: VACUUM RETAIN 0 HOURS within 24h of DELETE execution</text>
      <text x="30" y="277" fill="#ef4444" font-size="9">⚠ VACUUM RETAIN 0 HOURS is irreversible — disables time-travel to pre-delete state</text>
    </svg>`,
  ];

  function _buildDiagram(si) { return DIAGRAMS[si] || DIAGRAMS[0]; }

  function _updateStep(el, si) {
    el.querySelectorAll('.do-pill').forEach((pill, idx) => {
      pill.classList.toggle('active', idx === si);
      pill.classList.toggle('visited', idx < si);
    });
    const diagram = el.querySelector('#do-diagram');
    if (diagram) diagram.innerHTML = _buildDiagram(si);
    const s = STEPS[si];
    const t = el.querySelector('#do-info-title');
    const b = el.querySelector('#do-info-body');
    const d = el.querySelector('#do-info-detail');
    if (t) t.textContent = s.label;
    if (b) b.textContent = s.desc;
    if (d) d.textContent = s.detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="do-pill${i === 0 ? ' active' : ''}" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
<style>
.do-page { display:flex; flex-direction:column; gap:16px; padding:16px; }
.do-pills { display:flex; flex-wrap:wrap; gap:6px; }
.do-pill {
  padding:4px 12px; border-radius:20px; border:1px solid var(--border);
  background:var(--surface); color:var(--text-muted); font-size:11px;
  cursor:pointer; transition:all .2s;
}
.do-pill.active { border-color:var(--red); color:var(--red); background:rgba(239,68,68,.1); }
.do-pill.visited { border-color:var(--border); color:var(--text-muted); opacity:.6; }
.do-pill:hover { border-color:var(--red); color:var(--red); }
.do-layout { display:grid; grid-template-columns:1fr 280px; gap:16px; }
.do-diagram-wrap { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:8px; }
.do-diagram-wrap svg { width:100%; height:auto; }
.do-info { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:16px; display:flex; flex-direction:column; gap:8px; }
.do-info-title { font-size:16px; font-weight:600; color:var(--red); }
.do-info-body { font-size:13px; color:var(--text); }
.do-info-detail { font-size:12px; color:var(--text-muted); line-height:1.6; }
.do-badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:11px; background:rgba(239,68,68,.15); color:var(--red); border:1px solid rgba(239,68,68,.3); }
@media(max-width:720px){ .do-layout{ grid-template-columns:1fr; } }
</style>
<div class="do-page page-enter">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
    <h2 style="font-size:20px;font-weight:700;color:var(--text);margin:0;">DELETE Operations</h2>
    <span class="do-badge">Write Operation</span>
    <span style="color:var(--text-muted);font-size:12px;">Copy-on-write, GDPR erasure, soft delete, partition drop, VACUUM</span>
  </div>
  <div class="do-pills">${pills}</div>
  <div class="do-layout">
    <div class="do-diagram-wrap"><div id="do-diagram">${_buildDiagram(0)}</div></div>
    <div class="do-info">
      <div class="do-info-title" id="do-info-title">${STEPS[0].label}</div>
      <div class="do-info-body" id="do-info-body">${STEPS[0].desc}</div>
      <div class="do-info-detail" id="do-info-detail">${STEPS[0].detail}</div>
    </div>
  </div>
</div>`;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'do-page page-enter';
    page.innerHTML = _buildHTML();
    container.appendChild(page);

    _engine = new IV.AnimationEngine({
      steps: STEPS.map((s, i) => ({
        label: s.label,
        description: s.desc,
        duration: 2000,
        enter(ctx) {
          const si = i;
          const el = ctx.el;
          _updateStep(el, si);
        },
      })),
    });

    _engine.setContext({ el: container });

    container.querySelectorAll('.do-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['delete-ops'] = {
    id: 'delete-ops',
    title: 'DELETE',
    group: 'Write Operations',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      IV.AnimationControls.hide();
    },
  };
})();
