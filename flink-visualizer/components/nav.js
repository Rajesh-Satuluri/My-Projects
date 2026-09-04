export const MODULES = [
  // Group: Foundation
  { id: 'm01', title: 'Why Apache Flink',       icon: '⚡', group: 'Foundation',    num: '01' },
  { id: 'm02', title: 'Streaming Fundamentals',  icon: '🌊', group: 'Foundation',    num: '02' },
  // Group: Architecture
  { id: 'm03', title: 'Flink Architecture',      icon: '🏛️', group: 'Architecture',  num: '03' },
  { id: 'm04', title: 'Job Lifecycle',           icon: '🔄', group: 'Architecture',  num: '04' },
  { id: 'm05', title: 'Parallelism',             icon: '⚙️', group: 'Architecture',  num: '05' },
  { id: 'm06', title: 'Data Flow',               icon: '➡️', group: 'Architecture',  num: '06' },
  { id: 'm07', title: 'Operators',               icon: '🔧', group: 'Architecture',  num: '07' },
  // Group: Time & Windows
  { id: 'm08', title: 'Time Concepts',           icon: '⏱️', group: 'Time & Windows', num: '08' },
  { id: 'm09', title: 'Watermarks',              icon: '💧', group: 'Time & Windows', num: '09' },
  { id: 'm10', title: 'Windows',                 icon: '🪟', group: 'Time & Windows', num: '10' },
  // Group: State & Fault Tolerance
  { id: 'm11', title: 'State Management',        icon: '🗄️', group: 'State & Fault',  num: '11' },
  { id: 'm12', title: 'Checkpointing',           icon: '✅', group: 'State & Fault',  num: '12' },
  { id: 'm13', title: 'Savepoints',              icon: '💾', group: 'State & Fault',  num: '13' },
  { id: 'm14', title: 'Fault Tolerance',         icon: '🛡️', group: 'State & Fault',  num: '14' },
  { id: 'm15', title: 'Backpressure',            icon: '🌡️', group: 'State & Fault',  num: '15' },
  // Group: APIs & Connectors
  { id: 'm16', title: 'Connectors',              icon: '🔌', group: 'APIs & Connectors', num: '16' },
  { id: 'm17', title: 'Flink SQL',               icon: '📊', group: 'APIs & Connectors', num: '17' },
  { id: 'm18', title: 'Performance',             icon: '🚀', group: 'APIs & Connectors', num: '18' },
  { id: 'm19', title: 'Uber Pipeline',           icon: '🗺️', group: 'End-to-End',     num: '19' },
];

export function renderNav(activeId, doneSet) {
  const list = document.getElementById('nav-list');
  if (!list) return;

  const groups = [...new Set(MODULES.map(m => m.group))];
  list.innerHTML = groups.map(group => {
    const items = MODULES.filter(m => m.group === group);
    return `
      <div class="nav-group-header">${group}</div>
      ${items.map(m => `
        <div class="nav-item ${m.id === activeId ? 'active' : ''} ${doneSet.has(m.id) ? 'done' : ''}"
             data-module="${m.id}" role="button" tabindex="0">
          <span class="nav-icon">${m.icon}</span>
          <span class="nav-label">${m.title}</span>
          <span class="nav-number">${m.num}</span>
        </div>
      `).join('')}
    `;
  }).join('') + `
    <div class="nav-group-header">Review</div>
    <div class="nav-item ${activeId === 'study' ? 'active' : ''}" data-module="study" role="button" tabindex="0">
      <span class="nav-icon">📚</span>
      <span class="nav-label">Study Hub</span>
      <span class="nav-number">★</span>
    </div>`;

  list.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.module;
      window.location.hash = id;
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const id = el.dataset.module;
        window.location.hash = id;
      }
    });
  });
}

export function updateProgress(doneSet) {
  const count = document.getElementById('progress-count');
  const fill  = document.getElementById('progress-fill');
  if (count) count.textContent = `${doneSet.size} / ${MODULES.length}`;
  if (fill)  fill.style.width  = `${(doneSet.size / MODULES.length) * 100}%`;
}
