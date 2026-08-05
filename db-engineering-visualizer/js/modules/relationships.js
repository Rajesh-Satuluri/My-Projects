/* ============================================================
   Module: Relationships
   Cardinality types with Crow's Foot ERD — ShopFlow schema.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;
  const SVG = IV.SVG;
  const el = SVG.el, esc = SVG.esc;

  /* ── Entity layout positions ──────────────────────────────── */
  const ENTITIES = {
    Customer:  { x: 30,  y: 40,  color: '#3b82f6', w: 110, h: 48 },
    Order:     { x: 200, y: 40,  color: '#8b5cf6', w: 100, h: 48 },
    OrderItem: { x: 370, y: 40,  color: '#ef4444', w: 110, h: 48 },
    Product:   { x: 370, y: 155, color: '#10b981', w: 110, h: 48 },
    Seller:    { x: 200, y: 155, color: '#f59e0b', w: 100, h: 48 },
    Payment:   { x: 200, y: 270, color: '#a855f7', w: 100, h: 48 },
    Inventory: { x: 370, y: 270, color: '#06b6d4', w: 110, h: 48 },
    Review:    { x: 30,  y: 155, color: '#f97316', w: 110, h: 48 },
  };

  /* ── Relationship steps ───────────────────────────────────── */
  const STEPS = [
    {
      id: 'one-to-many-intro',
      label: 'One-to-Many',
      color: '#3b82f6',
      active: ['Customer', 'Order'],
      rels: [{ from: 'Customer', to: 'Order', type: 'ONE_TO_MANY', label: 'places' }],
      what: 'One row in A can relate to many rows in B, but each B row links back to exactly one A.',
      why: 'Most common relationship. One customer can place many orders; each order belongs to one customer.',
      example: 'customer_id FK in orders → customers.customer_id PK',
      sql: 'SELECT c.name, COUNT(o.order_id) AS orders\nFROM customers c\nJOIN orders o ON o.customer_id = c.customer_id\nGROUP BY c.name;',
    },
    {
      id: 'one-to-one',
      label: 'One-to-One',
      color: '#a855f7',
      active: ['Order', 'Payment'],
      rels: [{ from: 'Order', to: 'Payment', type: 'ONE_TO_ONE', label: 'paid via' }],
      what: 'Each row in A corresponds to exactly one row in B and vice-versa.',
      why: 'Separates concerns — payment details are isolated in their own table, keeping orders lean.',
      example: 'payment_id FK UNIQUE in payments → orders.order_id',
      sql: 'SELECT o.order_id, p.method, p.status\nFROM orders o\nJOIN payments p ON p.order_id = o.order_id\nWHERE o.order_id = 5001;',
    },
    {
      id: 'many-to-many',
      label: 'Many-to-Many',
      color: '#ef4444',
      active: ['Order', 'OrderItem', 'Product'],
      rels: [
        { from: 'Order',   to: 'OrderItem', type: 'ONE_TO_MANY', label: 'contains' },
        { from: 'Product', to: 'OrderItem', type: 'ONE_TO_MANY', label: 'referenced in' },
      ],
      what: 'Many rows in A can relate to many rows in B. Requires a bridge (junction) table.',
      why: 'One order can contain many products; one product can appear in many orders. order_items is the bridge.',
      example: 'order_items(order_id FK, product_id FK) bridges orders ↔ products',
      sql: 'SELECT p.name, SUM(oi.quantity) AS total_sold\nFROM products p\nJOIN order_items oi ON oi.product_id = p.product_id\nGROUP BY p.name\nORDER BY total_sold DESC;',
    },
    {
      id: 'seller-product',
      label: 'Seller → Products',
      color: '#f59e0b',
      active: ['Seller', 'Product'],
      rels: [{ from: 'Seller', to: 'Product', type: 'ONE_TO_MANY', label: 'lists' }],
      what: 'A seller lists many products; each product is owned by exactly one seller.',
      why: 'Enforces product ownership — queries can filter by seller and guarantee no orphan listings.',
      example: 'seller_id FK in products → sellers.seller_id PK',
      sql: 'SELECT s.name, COUNT(p.product_id) AS listings\nFROM sellers s\nJOIN products p ON p.seller_id = s.seller_id\nGROUP BY s.name\nORDER BY listings DESC;',
    },
    {
      id: 'product-inventory',
      label: 'Product ↔ Inventory',
      color: '#06b6d4',
      active: ['Product', 'Inventory'],
      rels: [{ from: 'Product', to: 'Inventory', type: 'ONE_TO_ONE', label: 'tracked in' }],
      what: 'Each product has exactly one inventory record; each inventory record tracks exactly one product.',
      why: 'Isolates volatile stock data from stable product attributes — hot-row updates stay in inventory only.',
      example: 'product_id FK UNIQUE in inventory → products.product_id',
      sql: 'SELECT p.name, i.qty_on_hand, i.reorder_point\nFROM products p\nJOIN inventory i ON i.product_id = p.product_id\nWHERE i.qty_on_hand < i.reorder_point;',
    },
    {
      id: 'full-schema',
      label: 'Full ShopFlow ERD',
      color: '#58a6ff',
      active: ['Customer', 'Order', 'OrderItem', 'Product', 'Seller', 'Payment', 'Inventory', 'Review'],
      rels: [
        { from: 'Customer', to: 'Order',     type: 'ONE_TO_MANY', label: 'places' },
        { from: 'Order',    to: 'OrderItem', type: 'ONE_TO_MANY', label: 'contains' },
        { from: 'Product',  to: 'OrderItem', type: 'ONE_TO_MANY', label: 'ref in' },
        { from: 'Seller',   to: 'Product',   type: 'ONE_TO_MANY', label: 'lists' },
        { from: 'Customer', to: 'Review',    type: 'ONE_TO_MANY', label: 'writes' },
        { from: 'Product',  to: 'Review',    type: 'ONE_TO_MANY', label: 'receives' },
        { from: 'Order',    to: 'Payment',   type: 'ONE_TO_ONE',  label: 'paid via' },
        { from: 'Product',  to: 'Inventory', type: 'ONE_TO_ONE',  label: 'tracked' },
      ],
      what: 'The complete ShopFlow entity-relationship diagram — 8 entities, 8 relationships.',
      why: 'Every foreign key was a deliberate design choice: isolate concerns, enforce integrity, enable fast joins.',
      example: '6 ONE_TO_MANY + 2 ONE_TO_ONE. No unresolved M:N (order_items bridges orders ↔ products).',
      sql: 'SELECT c.name, COUNT(o.order_id) orders, SUM(oi.unit_price*oi.quantity) revenue\nFROM customers c\nJOIN orders o     ON o.customer_id  = c.customer_id\nJOIN order_items oi ON oi.order_id = o.order_id\nGROUP BY c.name\nORDER BY revenue DESC\nLIMIT 5;',
    },
  ];

  /* ── SVG helpers ──────────────────────────────────────────── */

  function _cx(e) { return e.x + e.w / 2; }
  function _cy(e) { return e.y + e.h / 2; }

  function _entityBox(name, active, stepColor) {
    const e = ENTITIES[name];
    const isActive = active.indexOf(name) >= 0;
    const fill = isActive ? e.color + '22' : '#0d111788';
    const stroke = isActive ? e.color : '#30363d';
    const textColor = isActive ? e.color : '#484f58';
    return el('g', {}, [
      el('rect', { x: e.x, y: e.y, width: e.w, height: e.h, rx: 8,
        fill: fill, stroke: stroke, 'stroke-width': isActive ? 2 : 1 }),
      el('text', { x: _cx(e), y: e.y + 20,
        'text-anchor': 'middle', fill: textColor,
        'font-size': 11, 'font-family': 'var(--font-mono,monospace)', 'font-weight': 700 },
        esc(name)),
      el('text', { x: _cx(e), y: e.y + 35,
        'text-anchor': 'middle', fill: isActive ? e.color + 'cc' : '#30363d',
        'font-size': 8.5, 'font-family': 'var(--font-mono,monospace)' },
        esc(name.toLowerCase() + '_id PK')),
    ]);
  }

  /* Crow's Foot: draws line from entity A edge toward B edge */
  function _connection(rel) {
    const A = ENTITIES[rel.from];
    const B = ENTITIES[rel.to];
    if (!A || !B) return '';

    const ax = _cx(A), ay = _cy(A);
    const bx = _cx(B), by = _cy(B);

    /* Pick closest edges */
    let x1, y1, x2, y2;
    const dx = bx - ax, dy = by - ay;
    if (Math.abs(dx) > Math.abs(dy)) {
      // horizontal dominant
      x1 = dx > 0 ? A.x + A.w : A.x;
      y1 = ay;
      x2 = dx > 0 ? B.x : B.x + B.w;
      y2 = by;
    } else {
      // vertical dominant
      x1 = ax;
      y1 = dy > 0 ? A.y + A.h : A.y;
      x2 = bx;
      y2 = dy > 0 ? B.y : B.y + B.h;
    }

    const color = '#58a6ff88';
    const parts = [];

    // Path
    const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
    const d = 'M' + x1 + ',' + y1 + ' C' + midX + ',' + y1 + ' ' + midX + ',' + y2 + ' ' + x2 + ',' + y2;
    parts.push(el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.5 }));

    // ONE side: single vertical tick at A end
    const tLen = 6;
    if (Math.abs(dx) > Math.abs(dy)) {
      const dir = dx > 0 ? 1 : -1;
      parts.push(el('line', { x1: x1 + dir * 4, y1: y1 - tLen, x2: x1 + dir * 4, y2: y1 + tLen, stroke: color, 'stroke-width': 1.5 }));
    } else {
      const dir = dy > 0 ? 1 : -1;
      parts.push(el('line', { x1: x1 - tLen, y1: y1 + dir * 4, x2: x1 + tLen, y2: y1 + dir * 4, stroke: color, 'stroke-width': 1.5 }));
    }

    // MANY side: crow's foot at B end
    if (rel.type === 'ONE_TO_MANY') {
      if (Math.abs(dx) > Math.abs(dy)) {
        const dir = dx > 0 ? -1 : 1;
        parts.push(el('line', { x1: x2, y1: y2, x2: x2 + dir * 8, y2: y2 - 7, stroke: color, 'stroke-width': 1.5 }));
        parts.push(el('line', { x1: x2, y1: y2, x2: x2 + dir * 8, y2: y2 + 7, stroke: color, 'stroke-width': 1.5 }));
        parts.push(el('line', { x1: x2 + dir * 8, y1: y2 - tLen, x2: x2 + dir * 8, y2: y2 + tLen, stroke: color, 'stroke-width': 1.5 }));
      } else {
        const dir = dy > 0 ? -1 : 1;
        parts.push(el('line', { x1: x2, y1: y2, x2: x2 - 7, y2: y2 + dir * 8, stroke: color, 'stroke-width': 1.5 }));
        parts.push(el('line', { x1: x2, y1: y2, x2: x2 + 7, y2: y2 + dir * 8, stroke: color, 'stroke-width': 1.5 }));
        parts.push(el('line', { x1: x2 - tLen, y1: y2 + dir * 8, x2: x2 + tLen, y2: y2 + dir * 8, stroke: color, 'stroke-width': 1.5 }));
      }
    } else {
      // ONE_TO_ONE: single tick at B too
      if (Math.abs(dx) > Math.abs(dy)) {
        const dir = dx > 0 ? -1 : 1;
        parts.push(el('line', { x1: x2 + dir * 4, y1: y2 - tLen, x2: x2 + dir * 4, y2: y2 + tLen, stroke: color, 'stroke-width': 1.5 }));
      } else {
        const dir = dy > 0 ? -1 : 1;
        parts.push(el('line', { x1: x2 - tLen, y1: y2 + dir * 4, x2: x2 + tLen, y2: y2 + dir * 4, stroke: color, 'stroke-width': 1.5 }));
      }
    }

    // Label
    parts.push(el('text', { x: midX, y: midY - 4, 'text-anchor': 'middle',
      fill: color, 'font-size': 8, 'font-family': 'var(--font-mono,monospace)' }, esc(rel.label)));

    return el('g', {}, parts);
  }

  function _buildDiagram(si) {
    const step = STEPS[si];
    const entityNames = Object.keys(ENTITIES);

    const connLines = step.rels.map(r => _connection(r));
    const boxes = entityNames.map(n => _entityBox(n, step.active, step.color));

    return el('svg', { viewBox: '0 0 530 340', xmlns: 'http://www.w3.org/2000/svg',
      role: 'img', 'aria-label': step.label + ' relationship diagram' }, [
      el('rect', { width: 530, height: 340, fill: '#0d1117', rx: 8 }),
      el('g', {}, connLines),
      el('g', {}, boxes),
    ]);
  }

  /* ── Module scaffold ──────────────────────────────────────── */
  let _engine = null;

  function _buildHTML() {
    const pills = STEPS.map((s, i) =>
      '<button class="rel-pill step-pill' + (i === 0 ? ' active' : '') + '" data-step="' + i + '">' +
      esc(s.label) + '</button>'
    ).join('');

    const s0 = STEPS[0];

    return [
'<style>',
'.rel-page { display: grid; grid-template-rows: auto 1fr; height: calc(100vh - 52px - 52px); overflow: hidden; padding: 0; gap: 0; min-height: 0; }',
'.rel-header { padding: 20px 28px 16px; border-bottom: 1px solid var(--border-default); background: var(--bg-2); flex-shrink: 0; }',
'.rel-tag { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; padding: 3px 10px; border-radius: 9999px; border: 1px solid; margin-bottom: 8px; }',
'.rel-title { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }',
'.rel-sub { font-size: 13px; color: var(--text-muted); }',
'.rel-body { display: grid; grid-template-columns: 190px 1fr; gap: 0; overflow: hidden; min-height: 0; }',
'.rel-sidebar { border-right: 1px solid var(--border-default); overflow-y: auto; padding: 12px 8px; background: var(--bg-2); }',
'.rel-sidebar .step-pill { display: block; width: 100%; text-align: left; margin-bottom: 4px; }',
'.rel-sidebar .step-pill.active { background: var(--blue-subtle); color: var(--blue); border-color: rgba(88,166,255,.25); }',
'.rel-main { display: flex; flex-direction: column; overflow: hidden; min-height: 0; }',
'.rel-diagram { flex: 1; min-height: 0; position: relative; overflow: hidden; background: var(--bg-1); }',
'.rel-diagram svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; }',
'.rel-info { border-top: 1px solid var(--border-default); padding: 10px 20px 12px; background: var(--bg-2); flex: 0 0 auto; max-height: 195px; overflow-y: auto; }',
'.rel-grid { display: grid; grid-template-columns: auto 1fr; column-gap: 14px; row-gap: 3px; align-items: baseline; }',
'.rel-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); white-space: nowrap; }',
'.rel-val { font-size: 12.5px; color: var(--text-secondary); line-height: 1.4; }',
'.rel-eg { font-family: var(--font-mono); color: var(--text-primary); font-size: 11px; }',
'.rel-sql { font-family: var(--font-mono); color: var(--green,#3fb950); font-size: 10.5px; white-space: pre; background: var(--bg-1); border: 1px solid var(--border-default); border-radius: 6px; padding: 6px 10px; overflow-x: auto; max-height: 72px; overflow-y: auto; }',
'</style>',
'<div class="rel-header">',
'  <div class="rel-tag" style="background:' + s0.color + '1e;color:' + s0.color + ';border-color:' + s0.color + '40;">' + esc(s0.label) + '</div>',
'  <h1 class="rel-title">Relationships</h1>',
'  <p class="rel-sub">How ShopFlow\'s 8 entities connect. Crow\'s Foot notation shows cardinality live on the ERD.</p>',
'</div>',
'<div class="rel-body">',
'  <div class="rel-sidebar"><div class="step-pills" style="flex-direction:column;">' + pills + '</div></div>',
'  <div class="rel-main">',
'    <div class="rel-diagram rel-diagram-slot">' + _buildDiagram(0) + '</div>',
'    <div class="rel-info">',
'      <div class="rel-grid">',
'        <span class="rel-lbl">What</span><span class="rel-val rel-what">' + esc(s0.what) + '</span>',
'        <span class="rel-lbl">Why</span><span class="rel-val rel-why">' + esc(s0.why) + '</span>',
'        <span class="rel-lbl">Example</span><span class="rel-val rel-eg rel-example">' + esc(s0.example) + '</span>',
'        <span class="rel-lbl">SQL</span><span class="rel-val"><pre class="rel-sql rel-sql-slot">' + esc(s0.sql) + '</pre></span>',
'      </div>',
'    </div>',
'  </div>',
'</div>',
    ].join('\n');
  }

  function _updateStep(page, si) {
    const s = STEPS[si];

    page.querySelectorAll('.rel-pill').forEach((elm, i) => {
      elm.classList.toggle('active', i === si);
    });

    const tag = page.querySelector('.rel-tag');
    if (tag) {
      tag.textContent = s.label;
      tag.style.background = s.color + '1e';
      tag.style.color = s.color;
      tag.style.borderColor = s.color + '40';
    }

    const diag = page.querySelector('.rel-diagram-slot');
    if (diag) diag.innerHTML = _buildDiagram(si);

    const set = (sel, val) => { const n = page.querySelector(sel); if (n) n.textContent = val; };
    set('.rel-what', s.what);
    set('.rel-why', s.why);
    set('.rel-example', s.example);
    set('.rel-sql-slot', s.sql);
  }

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'rel-page page-enter';
    page.innerHTML = _buildHTML();
    container.appendChild(page);

    _engine = new IV.AnimationEngine({
      steps: STEPS.map((s, i) => ({
        label: s.label,
        description: s.what,
        duration: 3000,
        enter() { _updateStep(page, i); },
      })),
    });

    page.querySelectorAll('.rel-pill').forEach(elm => {
      elm.addEventListener('click', () => _engine.goto(parseInt(elm.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['relationships'] = {
    id: 'relationships',
    title: 'Relationships',
    group: 'db-design',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      window.IcebergViz.AnimationControls.hide();
    },
  };
})();
