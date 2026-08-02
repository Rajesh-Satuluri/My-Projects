(function () {
  'use strict';
  const IV = window.IcebergViz;

  const STEPS = [
    {
      label: 'VACUUM',
      desc: 'What does VACUUM do in Delta Lake?',
      correct: 'B',
      detail: 'Correct: B — VACUUM physically deletes data files that are no longer part of the current table snapshot AND are older than the retention threshold (default 7 days = 168 hours). It does NOT touch the transaction log (that is controlled by logRetentionDuration). Critical: never VACUUM below your streaming checkpointing window or you risk FileNotFoundException. Always run DRY RUN first to preview deletions.',
    },
    {
      label: 'Retention',
      desc: 'What is the default VACUUM retention period?',
      correct: 'C',
      detail: 'Correct: C — 168 hours (7 days) is the default retention. This protects concurrent readers and streaming jobs that might reference older file versions. Setting it lower than 7 days requires overriding a safety check: SET spark.databricks.delta.retentionDurationCheck.enabled = false. MediaStream uses 72h (Bronze), 336h (Silver/Gold), and 720h (ML) based on SLA requirements.',
    },
    {
      label: 'Z-Ordering',
      desc: 'Z-Ordering is most beneficial for which type of query?',
      correct: 'B',
      detail: 'Correct: B — Z-Ordering maps multi-dimensional data onto a 1D space-filling curve, co-locating rows with similar values in the same files. This dramatically reduces files scanned for queries that filter on multiple columns simultaneously (e.g., WHERE user_id = X AND event_date = Y). At MediaStream: 284,000 → 11 files scanned per user+date query (99.99% reduction).',
    },
    {
      label: 'DLT Expect',
      desc: 'Which DLT expectation silently drops rows that fail the check?',
      correct: 'B',
      detail: 'Correct: B — EXPECT OR DROP drops rows that violate the constraint and increments a quarantine counter. EXPECT (alone) records violations as warnings but lets all rows pass through. EXPECT OR FAIL aborts the entire pipeline run on any violation. MediaStream uses: EXPECT for monitoring (18 constraints), EXPECT OR DROP for quality enforcement (22 constraints), EXPECT OR FAIL for critical keys (7 constraints).',
    },
    {
      label: 'OCC',
      desc: 'What does OCC stand for in Delta Lake concurrency?',
      correct: 'B',
      detail: 'Correct: B — Optimistic Concurrency Control. Writers proceed without locking, then check for conflicts at commit time by inspecting the transaction log for intervening writes. If a conflict is detected, they get a ConcurrentModificationException and must retry. This works well when conflicts are rare (as at MediaStream: 14 concurrent writers, zero conflicts on blind-append tables). Blind appends (INSERT-only) never conflict with each other.',
    },
    {
      label: 'CDF Column',
      desc: 'What column does Change Data Feed add to identify the type of change?',
      correct: 'C',
      detail: 'Correct: C — _change_type column added by CDF contains: "insert" for new rows, "update_preimage" for the row state before an update, "update_postimage" for the row state after an update, and "delete" for deleted rows. Query with: SELECT * FROM table_changes("silver.user_events", 3). MediaStream uses CDF to reduce downstream reprocessing by 94% — only changed rows flow to Gold and ML layers.',
    },
  ];

  const OPTS = [
    ['Compacts small Parquet files into larger ones',
     'Physically deletes obsolete data files past the retention window',
     'Removes entries from the _delta_log transaction log',
     'Encrypts data files for compliance'],
    ['0 hours (immediate deletion)',
     '24 hours (1 day)',
     '168 hours (7 days)',
     '720 hours (30 days)'],
    ['Queries that sort results alphabetically',
     'Multi-column filter queries (WHERE col_a = X AND col_b = Y)',
     'Streaming write throughput',
     'Schema evolution operations'],
    ['EXPECT — warns but keeps all rows',
     'EXPECT OR DROP — silently discards failing rows',
     'EXPECT OR FAIL — aborts the pipeline',
     'CONSTRAINT DROP — not a valid DLT keyword'],
    ['Optional Commit Check',
     'Optimistic Concurrency Control',
     'Object Catalog Cache',
     'Ordered Column Compaction'],
    ['_version — the Delta table version number',
     '_timestamp — when the change was committed',
     '_change_type — insert/update_preimage/update_postimage/delete',
     '_cdf_flag — boolean indicating a changed row'],
  ];

  function _makeDiagram(si) {
    const step = STEPS[si];
    const opts = OPTS[si];
    const correct = step.correct;
    const letters = ['A', 'B', 'C', 'D'];
    const rows = opts.map((o, idx) => {
      const letter = letters[idx];
      const isCorrect = letter === correct;
      const bg = isCorrect ? 'rgba(34,197,94,0.2)' : 'var(--bg-4)';
      const stroke = isCorrect ? '#22c55e' : 'var(--border-subtle)';
      const fill = isCorrect ? '#22c55e' : 'var(--text-muted)';
      const textFill = isCorrect ? '#22c55e' : 'var(--text-secondary)';
      const y = 108 + idx * 42;
      const badgeFill = isCorrect ? '#22c55e' : 'var(--bg-3)';
      const badgeText = isCorrect ? '#fff' : 'var(--text-muted)';
      const checkmark = isCorrect ? ' ✓' : '';
      const shortO = o.length > 55 ? o.slice(0, 53) + '…' : o;
      return `
        <rect x="30" y="${y}" width="420" height="34" rx="6" fill="${bg}" stroke="${stroke}" stroke-width="${isCorrect ? '1.5' : '1'}"/>
        <rect x="38" y="${y + 8}" width="18" height="18" rx="4" fill="${badgeFill}"/>
        <text x="47" y="${y + 21}" text-anchor="middle" fill="${badgeText}" font-size="9" font-weight="700">${letter}</text>
        <text x="66" y="${y + 21}" fill="${textFill}" font-size="8.5">${shortO}${checkmark}</text>
      `;
    }).join('');
    return `<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono',monospace">
      <rect width="480" height="300" fill="var(--bg-2)" rx="10"/>
      <text x="240" y="24" text-anchor="middle" fill="var(--delta)" font-size="11" font-weight="700">Question ${si + 1} of ${STEPS.length}</text>
      <rect x="22" y="34" width="436" height="58" rx="8" fill="rgba(255,107,53,0.1)" stroke="var(--delta)" stroke-width="1.5"/>
      <text x="240" y="54" text-anchor="middle" fill="var(--delta)" font-size="11" font-weight="700">${step.desc}</text>
      <text x="240" y="82" text-anchor="middle" fill="var(--text-muted)" font-size="8.5">Choose the best answer below</text>
      ${rows}
      <text x="240" y="286" text-anchor="middle" fill="var(--text-muted)" font-size="8">Correct answer: ${correct} — see explanation panel below</text>
    </svg>`;
  }

  let _engine = null;

  function _updateStep(el, si) {
    el.querySelectorAll('.qz-pill').forEach(p => {
      const active = parseInt(p.dataset.step, 10) === si;
      p.style.background = active ? 'var(--delta)' : 'var(--surface2)';
      p.style.color = active ? '#fff' : 'var(--text-muted)';
    });
    const diag = el.querySelector('.qz-diagram');
    if (diag) diag.innerHTML = _makeDiagram(si);
    const info = el.querySelector('.qz-info');
    if (info) info.textContent = STEPS[si].detail;
  }

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      `<button class="qz-pill step-pill" data-step="${i}">${s.label}</button>`
    ).join('');
    return `
      <div class="qz-header module-header">
        <div>
          <div class="module-tag" style="background:var(--delta)">LEARNING</div>
          <h2 class="module-title">Quiz Mode</h2>
          <p class="module-subtitle">6 multiple-choice questions on Delta Lake internals — VACUUM, Z-Ordering, DLT, OCC, and CDF</p>
        </div>
      </div>
      <div class="qz-pills step-pills">${pills}</div>
      <div class="qz-diagram diagram-frame"></div>
      <div class="qz-info info-panel" style="border-left:3px solid var(--delta)"></div>
    `;
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'qz-page page-enter';
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
    container.querySelectorAll('.qz-pill').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });
    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz.modules['quiz'] = {
    id: 'quiz', title: 'Quiz Mode', group: 'Learning',
    render: _render,
    destroy() { if (_engine) { _engine.destroy(); _engine = null; } IV.AnimationControls.hide(); },
  };
})();
