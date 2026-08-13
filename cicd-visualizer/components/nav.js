export const MODULES = [
  { id:'m01', label:'What is CI/CD', icon:'\u{1F680}', group:'Foundation', desc:'Why continuous delivery exists' },
  { id:'m02', label:'Source Control Flow', icon:'\u{1F33F}', group:'Foundation', desc:'Branches, PRs, trunk-based dev' },
  { id:'m03', label:'GitHub Actions Anatomy', icon:'\u{2699}\u{FE0F}', group:'Foundation', desc:'Triggers, jobs, steps, runners' },
  { id:'m04', label:'Build & Test Stage', icon:'\u{1F9EA}', group:'Foundation', desc:'The test pyramid, pass/fail gates' },
  { id:'m05', label:'Docker & Containers', icon:'\u{1F4E6}', group:'Package & Promote', desc:'Image layers, caching, registry' },
  { id:'m06', label:'Environment Strategy', icon:'\u{1F3D7}\u{FE0F}', group:'Package & Promote', desc:'Dev → Staging → Prod gates' },
  { id:'m07', label:'Secrets & Config', icon:'\u{1F510}', group:'Package & Promote', desc:'Vaults, env injection, scanning' },
  { id:'m08', label:'Data Pipeline CI/CD', icon:'\u{1F5C4}\u{FE0F}', group:'Package & Promote', desc:'Schema tests, dbt, dead-letters' },
  { id:'m09', label:'Deploy Strategies', icon:'\u{1F6A6}', group:'Ship & Operate', desc:'Canary, blue/green, rollback' },
  { id:'m10', label:'Observability & Alerts', icon:'\u{1F4E1}', group:'Ship & Operate', desc:'Metrics, alerts, auto-rollback' },
  { id:'m11', label:'Infrastructure as Code', icon:'\u{1F9F1}', group:'Ship & Operate', desc:'Terraform plan/apply in pipeline' },
  { id:'m12', label:'Interview Simulator', icon:'\u{1F3AF}', group:'Ship & Operate', desc:'20 CI/CD interview Q&As' },
];

const GROUP_ORDER = ['Foundation','Package & Promote','Ship & Operate'];

const CHECK_SVG = '<svg class="nav-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';

export function renderNav(activeId, done, onSelect){
  const list = document.getElementById('nav-list');
  list.innerHTML = '';
  for(const group of GROUP_ORDER){
    const label = document.createElement('div');
    label.className = 'nav-group-label';
    label.textContent = group;
    list.appendChild(label);
    for(const m of MODULES.filter(x => x.group === group)){
      const item = document.createElement('div');
      item.className = 'nav-item' + (m.id===activeId?' active':'') + (done.has(m.id)?' done':'');
      item.innerHTML = `<span class="nav-icon">${m.icon}</span><span class="nav-label">${m.label}</span>${CHECK_SVG}`;
      item.addEventListener('click', () => onSelect(m.id));
      list.appendChild(item);
    }
  }
}

export function updateProgress(done){
  const count = done.size;
  const total = MODULES.length;
  document.getElementById('progress-count').textContent = `${count} / ${total}`;
  document.getElementById('progress-fill').style.width = `${(count/total)*100}%`;
}
