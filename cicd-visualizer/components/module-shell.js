// Shared module scaffolding: header, tabs, and interview Q&A sections.

export function createModuleShell({ tag, title, subtitle, tabs }){
  const wrap = document.createElement('div');
  wrap.className = 'module';

  const head = document.createElement('div');
  head.innerHTML = `
    <div class="module-tag">${tag}</div>
    <h1 class="module-title">${title}</h1>
    <p class="module-subtitle">${subtitle}</p>`;
  wrap.appendChild(head);

  const tabBar = document.createElement('div');
  tabBar.className = 'tabs';
  const panels = document.createElement('div');
  panels.className = 'panels';

  tabs.forEach((t, i) => {
    const tab = document.createElement('div');
    tab.className = 'tab' + (i===0?' active':'');
    tab.textContent = t.label;
    tab.dataset.idx = i;
    tabBar.appendChild(tab);

    const panel = document.createElement('div');
    panel.className = 'tab-panel' + (i===0?' active':'');
    panel.dataset.idx = i;
    if(typeof t.content === 'string') panel.innerHTML = t.content;
    else if(t.content instanceof Node) panel.appendChild(t.content);
    panels.appendChild(panel);
  });

  wrap.appendChild(tabBar);
  wrap.appendChild(panels);
  return wrap;
}

export function initTabs(container, onShow){
  const tabs = container.querySelectorAll('.tab');
  const panels = container.querySelectorAll('.tab-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const idx = tab.dataset.idx;
      tabs.forEach(t => t.classList.toggle('active', t===tab));
      panels.forEach(p => p.classList.toggle('active', p.dataset.idx===idx));
      if(typeof onShow === 'function') onShow(Number(idx));
    });
  });
}

export function createIQSection(questions){
  const wrap = document.createElement('div');
  wrap.className = 'iq-list';
  const chev = '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg>';
  questions.forEach(q => {
    const item = document.createElement('div');
    item.className = 'iq';
    item.innerHTML = `
      <div class="iq-q"><span>${q.q}</span>${chev}</div>
      <div class="iq-a"><div class="iq-a-inner">${q.a}</div></div>`;
    wrap.appendChild(item);
  });
  return wrap;
}

export function initIQ(container){
  container.querySelectorAll('.iq-q').forEach(q => {
    q.addEventListener('click', () => q.parentElement.classList.toggle('open'));
  });
}
