/* ============================================================
   Module: Normalization
   0NF → 1NF → 2NF → 3NF on ShopFlow's orders_flat table.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;
  const SVG = IV.SVG;
  const el = SVG.el, esc = SVG.esc;

  const T_H = 22, R_H = 15;   // title height, row height

  /* ── Draw a compact table ────────────────────────────────── */
  function _tbl(name, cols, x, y, w, accent) {
    const h = T_H + cols.length * R_H;
    const parts = [];
    parts.push(el('rect', { x: x, y: y, width: w, height: T_H, rx: 5,
      fill: accent + '22', stroke: accent + '55' }));
    parts.push(el('text', { x: x + 7, y: y + 15, fill: accent,
      'font-size': 10, 'font-family': 'var(--font-mono,monospace)', 'font-weight': 700 }, esc(name)));
    parts.push(el('rect', { x: x, y: y + T_H, width: w, height: h - T_H,
      fill: '#161b22', stroke: '#30363d' }));
    cols.forEach(function (col, i) {
      var ry = y + T_H + i * R_H;
      if (i % 2) parts.push(el('rect', { x: x + 1, y: ry, width: w - 2, height: R_H, fill: '#1c212866' }));
      var tc = col.tag === 'PK' ? '#f59e0b' : col.tag === 'FK' ? '#8b5cf6' : (col.color || '#6e7681');
      var nc = col.tag === 'PK' ? '#e6edf3' : col.tag === 'FK' ? '#d2bfff' : (col.color ? '#e6edf3' : '#8b949e');
      if (col.tag) {
        parts.push(el('text', { x: x + 6, y: ry + 11, fill: tc,
          'font-size': 7.5, 'font-family': 'var(--font-mono,monospace)', 'font-weight': 700 }, esc(col.tag)));
        parts.push(el('text', { x: x + 25, y: ry + 11, fill: nc,
          'font-size': 8.5, 'font-family': 'var(--font-mono,monospace)' }, esc(col.name)));
      } else {
        parts.push(el('text', { x: x + 8, y: ry + 11, fill: nc,
          'font-size': 8.5, 'font-family': 'var(--font-mono,monospace)' }, esc(col.name)));
      }
    });
    return el('g', {}, parts);
  }

  /* ── Draw a bezier arrow ─────────────────────────────────── */
  function _arrow(x1, y1, x2, y2, color) {
    color = color || '#58a6ff88';
    var mx = (x1 + x2) / 2;
    var d = 'M' + x1 + ',' + y1 + ' C' + mx + ',' + y1 + ' ' + mx + ',' + y2 + ' ' + x2 + ',' + y2;
    var dx = x2 - mx, dy = 0, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;
    var pts = x2 + ',' + y2 + ' ' + (x2 - 7 * ux - 4 * uy) + ',' + (y2 - 7 * uy + 4 * ux) +
              ' ' + (x2 - 7 * ux + 4 * uy) + ',' + (y2 - 7 * uy - 4 * ux);
    return el('g', {}, [
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.5 }),
      el('polygon', { points: pts, fill: color }),
    ]);
  }

  /* ── Vertical arrow (for cross-row links) ────────────────── */
  function _varrow(x1, y1, x2, y2, color) {
    color = color || '#58a6ff88';
    var my = (y1 + y2) / 2;
    var d = 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + my + ' ' + x2 + ',' + my + ' ' + x2 + ',' + y2;
    var dx = 0, dy = y2 - my, len = Math.abs(dy) || 1;
    var ux = dx / len, uy = dy / len;
    var pts = x2 + ',' + y2 + ' ' + (x2 - 4) + ',' + (y2 - 7) + ' ' + (x2 + 4) + ',' + (y2 - 7);
    return el('g', {}, [
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.5 }),
      el('polygon', { points: pts, fill: color }),
    ]);
  }

  function _badge(x, y, w, text, color) {
    return el('g', {}, [
      el('rect', { x: x, y: y, width: w, height: 20, rx: 4, fill: color + '22', stroke: color + '55' }),
      el('text', { x: x + 8, y: y + 14, fill: color,
        'font-size': 10, 'font-family': 'var(--font-mono,monospace)', 'font-weight': 700 }, esc(text)),
    ]);
  }

  /* ── Diagram 0: Unnormalized ─────────────────────────────── */
  function _diag0() {
    var cols = [
      { name: 'order_id',          tag: 'PK' },
      { name: 'order_date',        color: '#3b82f6' },
      { name: 'customer_id',       color: '#f59e0b' },
      { name: 'customer_name',     color: '#f59e0b' },
      { name: 'customer_email',    color: '#f59e0b' },
      { name: 'customer_city',     color: '#f59e0b' },
      { name: 'product_id',        color: '#10b981' },
      { name: 'product_name',      color: '#10b981' },
      { name: 'product_category',  color: '#10b981' },
      { name: 'seller_id',         color: '#a855f7' },
      { name: 'seller_name',       color: '#a855f7' },
      { name: 'qty',               color: '#ef4444' },
      { name: 'unit_price',        color: '#ef4444' },
      { name: 'discount',          color: '#ef4444' },
    ];
    var tableBottom = 38 + T_H + cols.length * R_H;
    var groupY = [
      { y: 38 + T_H + 0.5 * R_H,  label: 'ORDER',          color: '#3b82f6' },
      { y: 38 + T_H + 3.5 * R_H,  label: 'CUSTOMER  ⚠',   color: '#f59e0b' },
      { y: 38 + T_H + 7.5 * R_H,  label: 'PRODUCT  ⚠',    color: '#10b981' },
      { y: 38 + T_H + 10 * R_H,   label: 'SELLER  ⚠',     color: '#a855f7' },
      { y: 38 + T_H + 12.5 * R_H, label: 'LINE ITEM',      color: '#ef4444' },
    ];
    var parts = [
      _badge(14, 10, 310, '500M rows x 14 cols — everything in one table', '#ef4444'),
      _tbl('orders_flat', cols, 14, 36, 345, '#ef4444'),
    ];
    groupY.forEach(function (g) {
      parts.push(el('text', { x: 372, y: g.y + 4,
        fill: g.color, 'font-size': 9, 'font-family': 'var(--font-sans,sans-serif)', 'font-weight': 700 }, esc(g.label)));
    });
    // redundancy bracket
    var bTop = 38 + T_H + 2 * R_H, bBot = 38 + T_H + 9 * R_H;
    parts.push(el('line', { x1: 364, y1: bTop, x2: 364, y2: bBot, stroke: '#f59e0b55', 'stroke-width': 1.5 }));
    parts.push(el('text', { x: 369, y: bTop + (bBot - bTop) / 2 - 5,
      fill: '#f59e0b88', 'font-size': 8, 'font-family': 'var(--font-sans,sans-serif)' }, 'repeats per'));
    parts.push(el('text', { x: 369, y: bTop + (bBot - bTop) / 2 + 7,
      fill: '#f59e0b88', 'font-size': 8, 'font-family': 'var(--font-sans,sans-serif)' }, 'every order'));
    return el('g', {}, parts);
  }

  /* ── Diagram 1: 1NF ─────────────────────────────────────── */
  function _diag1() {
    var cols = [
      { name: 'order_id',         tag: 'PK' },
      { name: 'product_id',       tag: 'PK' },
      { name: 'order_date',       color: '#3b82f6' },
      { name: 'customer_id' },
      { name: 'customer_name',    color: '#f59e0b' },
      { name: 'customer_email',   color: '#f59e0b' },
      { name: 'customer_city',    color: '#f59e0b' },
      { name: 'product_name',     color: '#10b981' },
      { name: 'product_category', color: '#10b981' },
      { name: 'seller_id' },
      { name: 'seller_name',      color: '#a855f7' },
      { name: 'qty' },
      { name: 'unit_price' },
      { name: 'discount' },
    ];
    var partialY = 36 + T_H + 4 * R_H;
    var parts = [
      _badge(14, 10, 280, 'PK set — 1NF satisfied. Partial deps remain.', '#f59e0b'),
      _tbl('orders_flat', cols, 14, 36, 345, '#f59e0b'),
    ];
    // Partial dep bracket on right
    parts.push(el('line', { x1: 363, y1: partialY, x2: 363, y2: partialY + 3 * R_H,
      stroke: '#f59e0b88', 'stroke-width': 1.5 }));
    parts.push(el('text', { x: 368, y: partialY + 1.2 * R_H,
      fill: '#f59e0b', 'font-size': 8.5, 'font-family': 'var(--font-sans,sans-serif)' }, 'depends only'));
    parts.push(el('text', { x: 368, y: partialY + 2.2 * R_H,
      fill: '#f59e0b', 'font-size': 8.5, 'font-family': 'var(--font-sans,sans-serif)' }, 'on customer_id'));
    // Partial dep bracket: product cols
    var pY = 36 + T_H + 7 * R_H;
    parts.push(el('line', { x1: 363, y1: pY, x2: 363, y2: pY + 2 * R_H,
      stroke: '#10b98188', 'stroke-width': 1.5 }));
    parts.push(el('text', { x: 368, y: pY + R_H,
      fill: '#10b981', 'font-size': 8.5, 'font-family': 'var(--font-sans,sans-serif)' }, 'product_id only'));
    return el('g', {}, parts);
  }

  /* ── Diagram 2: 2NF ─────────────────────────────────────── */
  function _diag2() {
    var oCols = [
      { name: 'order_id',       tag: 'PK' },
      { name: 'customer_id' },
      { name: 'customer_name',  color: '#f59e0b' },
      { name: 'customer_email', color: '#f59e0b' },
      { name: 'customer_city',  color: '#f59e0b' },
      { name: 'order_date' },
    ];
    var iCols = [
      { name: 'order_id',   tag: 'FK' },
      { name: 'product_id', tag: 'FK' },
      { name: 'qty' },
      { name: 'unit_price' },
      { name: 'discount' },
    ];
    var pCols = [
      { name: 'product_id',       tag: 'PK' },
      { name: 'seller_id' },
      { name: 'seller_name',      color: '#a855f7' },
      { name: 'product_name' },
      { name: 'product_category' },
    ];
    var ox = 12, ow = 163;
    var ix = 192, iw = 148;
    var px = 358, pw = 162;
    var ty = 38;
    var parts = [
      _badge(14, 10, 280, '2NF: partial deps split into 3 tables', '#f59e0b'),
      _tbl('orders', oCols, ox, ty, ow, '#8b5cf6'),
      _tbl('order_items', iCols, ix, ty, iw, '#ef4444'),
      _tbl('products', pCols, px, ty, pw, '#10b981'),
      // order_items.order_id → orders
      _arrow(ix, ty + T_H + 0.5 * R_H, ox + ow, ty + T_H * 0.5, '#8b5cf666'),
      // order_items.product_id → products
      _arrow(ix + iw, ty + T_H + R_H * 1.5, px, ty + T_H * 0.5, '#10b98166'),
    ];
    // Transitive dep note
    var noteY = ty + T_H + oCols.length * R_H + 14;
    parts.push(_badge(ox, noteY, ow, 'still: customer_name', '#f59e0b'));
    parts.push(el('text', { x: ox + 8, y: noteY + 30,
      fill: '#f59e0b88', 'font-size': 8.5, 'font-family': 'var(--font-sans,sans-serif)' },
      'transitive: depends on customer_id'));
    return el('g', {}, parts);
  }

  /* ── Diagram 3: 3NF ─────────────────────────────────────── */
  function _diag3() {
    var cCols = [{ name: 'customer_id', tag: 'PK' }, { name: 'name' }, { name: 'email' }, { name: 'city' }];
    var oCols = [{ name: 'order_id', tag: 'PK' }, { name: 'customer_id', tag: 'FK' }, { name: 'order_date' }];
    var iCols = [{ name: 'order_id', tag: 'FK' }, { name: 'product_id', tag: 'FK' }, { name: 'qty' }, { name: 'unit_price' }, { name: 'discount' }];
    var sCols = [{ name: 'seller_id', tag: 'PK' }, { name: 'seller_name' }];
    var pCols = [{ name: 'product_id', tag: 'PK' }, { name: 'seller_id', tag: 'FK' }, { name: 'product_name' }, { name: 'category' }];

    var cx = 12, cw = 135, cy = 38;
    var ox = 163, ow = 128, oy = 38;
    var ix = 307, iw = 145, iy = 38;
    var sx = 12, sw = 118, sy = 180;
    var px = 146, pw = 155, py = 180;

    var iBottom = iy + T_H + iCols.length * R_H;

    var parts = [
      _badge(14, 10, 270, '3NF: transitive deps removed — 5 clean tables', '#10b981'),
      _tbl('customers', cCols, cx, cy, cw, '#3b82f6'),
      _tbl('orders', oCols, ox, oy, ow, '#8b5cf6'),
      _tbl('order_items', iCols, ix, iy, iw, '#ef4444'),
      _tbl('sellers', sCols, sx, sy, sw, '#f59e0b'),
      _tbl('products', pCols, px, py, pw, '#10b981'),
      // orders → customers
      _arrow(ox, oy + T_H + R_H * 1.5, cx + cw, cy + T_H * 0.5, '#3b82f666'),
      // order_items → orders
      _arrow(ix, iy + T_H + R_H * 0.5, ox + ow, oy + T_H * 0.5, '#8b5cf666'),
      // order_items → products (cross-row)
      _varrow(ix + iw * 0.65, iBottom, px + pw * 0.65, py, '#10b98166'),
      // products → sellers
      _arrow(px, py + T_H + R_H * 1.5, sx + sw, sy + T_H * 0.5, '#f59e0b66'),
    ];
    return el('g', {}, parts);
  }

  /* ── Diagram 4: Result with stats ───────────────────────── */
  function _diag4() {
    var cCols = [{ name: 'customer_id', tag: 'PK' }, { name: 'name' }, { name: 'email' }, { name: 'city' }];
    var oCols = [{ name: 'order_id', tag: 'PK' }, { name: 'customer_id', tag: 'FK' }, { name: 'order_date' }];
    var iCols = [{ name: 'order_id', tag: 'FK' }, { name: 'product_id', tag: 'FK' }, { name: 'qty' }, { name: 'unit_price' }, { name: 'discount' }];
    var sCols = [{ name: 'seller_id', tag: 'PK' }, { name: 'seller_name' }];
    var pCols = [{ name: 'product_id', tag: 'PK' }, { name: 'seller_id', tag: 'FK' }, { name: 'product_name' }, { name: 'category' }];

    var cx = 12, cw = 135, cy = 32;
    var ox = 163, ow = 128, oy = 32;
    var ix = 307, iw = 145, iy = 32;
    var sx = 12, sw = 118, sy = 168;
    var px = 146, pw = 155, py = 168;

    var iBottom = iy + T_H + iCols.length * R_H;
    var statsY = 262;

    var parts = [
      _badge(14, 6, 200, '5 tables, zero redundancy', '#3b82f6'),
      _tbl('customers', cCols, cx, cy, cw, '#3b82f6'),
      _tbl('orders', oCols, ox, oy, ow, '#8b5cf6'),
      _tbl('order_items', iCols, ix, iy, iw, '#ef4444'),
      _tbl('sellers', sCols, sx, sy, sw, '#f59e0b'),
      _tbl('products', pCols, px, py, pw, '#10b981'),
      _arrow(ox, oy + T_H + R_H * 1.5, cx + cw, cy + T_H * 0.5, '#3b82f666'),
      _arrow(ix, iy + T_H + R_H * 0.5, ox + ow, oy + T_H * 0.5, '#8b5cf666'),
      _varrow(ix + iw * 0.65, iBottom, px + pw * 0.65, py, '#10b98166'),
      _arrow(px, py + T_H + R_H * 1.5, sx + sw, sy + T_H * 0.5, '#f59e0b66'),
    ];

    var statsData = [
      { label: 'Storage', val: '50GB → 8GB', color: '#3b82f6', x: 14 },
      { label: 'Update 1 customer', val: '47M rows → 1 row', color: '#10b981', x: 175 },
      { label: 'Anomalies', val: 'eliminated', color: '#a855f7', x: 370 },
    ];
    statsData.forEach(function (s) {
      parts.push(el('rect', { x: s.x, y: statsY, width: 155, height: 30, rx: 5,
        fill: s.color + '15', stroke: s.color + '44' }));
      parts.push(el('text', { x: s.x + 8, y: statsY + 12,
        fill: s.color, 'font-size': 8.5, 'font-family': 'var(--font-sans,sans-serif)', 'font-weight': 700 }, esc(s.label)));
      parts.push(el('text', { x: s.x + 8, y: statsY + 25,
        fill: s.color, 'font-size': 10.5, 'font-family': 'var(--font-mono,monospace)', 'font-weight': 700 }, esc(s.val)));
    });

    return el('g', {}, parts);
  }

  /* ── Steps ───────────────────────────────────────────────── */
  var DIAGRAMS = [_diag0, _diag1, _diag2, _diag3, _diag4];

  var STEPS = [
    {
      id: 'unnormalized', label: 'Unnormalized', color: '#ef4444', nf: '0NF',
      what: 'All 14 columns in one flat table — order, customer, product, and seller data mixed together.',
      why: 'ShopFlow\'s first attempt. 500M rows × 14 cols = 50GB/day. Customer data copied on every order row.',
      example: 'orders_flat(order_id, order_date, customer_id, customer_name, customer_email, ...)',
      trade: 'Update anomaly: change Alice\'s email = UPDATE 47M rows. Delete order = lose customer info.',
    },
    {
      id: '1nf', label: '1NF', color: '#f59e0b', nf: '1NF',
      what: 'Atomic values, no repeating groups, a defined primary key. Each cell holds exactly one value.',
      why: 'orders_flat had atomic values already; the key step is declaring PK (order_id, product_id).',
      example: 'PRIMARY KEY (order_id, product_id)',
      trade: 'Partial dependencies remain. customer_name depends only on customer_id, not the full key.',
    },
    {
      id: '2nf', label: '2NF', color: '#f59e0b', nf: '2NF',
      what: '1NF + every non-key column depends on the WHOLE primary key, not just part of it.',
      why: 'Split: (qty, price, discount) stay with (order_id, product_id). Customer and product data move out.',
      example: 'orders(order_id PK)  +  order_items(order_id FK, product_id FK)  +  products(product_id PK)',
      trade: 'Transitive deps remain in orders: customer_name → customer_id → order_id.',
    },
    {
      id: '3nf', label: '3NF', color: '#10b981', nf: '3NF',
      what: '2NF + no transitive dependencies. Every non-key column depends directly on the PK.',
      why: 'customer_name → customer_id is transitive. Extract customers. Same for sellers inside products.',
      example: 'customers(customer_id PK, name, email, city)  ←FK in orders',
      trade: 'Reads need JOINs. For analytics, intentionally denormalize back into a star schema.',
    },
    {
      id: 'result', label: 'Result', color: '#3b82f6', nf: 'Done',
      what: 'Five focused tables, each with one job: customers, sellers, products, orders, order_items.',
      why: 'Zero update anomalies. 50GB/day → 8GB. Updating a customer touches 1 row, not 47M.',
      example: 'UPDATE customers SET email=\'new@x.com\' WHERE customer_id=1001;  — 1 row changed',
      trade: 'Analytics require JOINs. For OLAP, denormalize into fact + dimension tables (the next module).',
    },
  ];

  function _buildDiagram(si) {
    return el('svg', { viewBox: '0 0 540 310', xmlns: 'http://www.w3.org/2000/svg',
      role: 'img', 'aria-label': STEPS[si].label + ' normalization diagram' }, [
      el('rect', { width: 540, height: 310, fill: '#0d1117', rx: 8 }),
      DIAGRAMS[si](),
    ]);
  }

  /* ── Module scaffold ──────────────────────────────────────── */
  var _engine = null;

  function _buildHTML() {
    var pills = STEPS.map(function (s, i) {
      return '<button class="norm-pill step-pill' + (i === 0 ? ' active' : '') +
             '" data-step="' + i + '">' + esc(s.label) + '</button>';
    }).join('');

    var s0 = STEPS[0];

    return [
'<style>',
'.norm-page { display: grid; grid-template-rows: auto 1fr; height: calc(100vh - 52px - 52px); overflow: hidden; padding: 0; gap: 0; min-height: 0; }',
'.norm-header { padding: 20px 28px 16px; border-bottom: 1px solid var(--border-default); background: var(--bg-2); flex-shrink: 0; }',
'.norm-tag { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; padding: 3px 10px; border-radius: 9999px; border: 1px solid; margin-bottom: 8px; }',
'.norm-nf-badge { display: inline-block; font-size: 10px; font-weight: 700; font-family: var(--font-mono); padding: 2px 8px; border-radius: 4px; background: var(--bg-3); color: var(--text-muted); margin-left: 8px; vertical-align: middle; }',
'.norm-title { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }',
'.norm-sub { font-size: 13px; color: var(--text-muted); }',
'.norm-body { display: grid; grid-template-columns: 155px 1fr; gap: 0; overflow: hidden; min-height: 0; }',
'.norm-sidebar { border-right: 1px solid var(--border-default); overflow-y: auto; padding: 12px 8px; background: var(--bg-2); }',
'.norm-sidebar .step-pill { display: block; width: 100%; text-align: left; margin-bottom: 4px; }',
'.norm-sidebar .step-pill.active { background: var(--blue-subtle); color: var(--blue); border-color: rgba(88,166,255,.25); }',
'.norm-main { display: flex; flex-direction: column; overflow: hidden; min-height: 0; }',
'.norm-diagram { flex: 1; min-height: 0; position: relative; overflow: hidden; background: var(--bg-1); }',
'.norm-diagram svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; }',
'.norm-info { border-top: 1px solid var(--border-default); padding: 10px 20px 12px; background: var(--bg-2); flex: 0 0 auto; max-height: 175px; overflow-y: auto; }',
'.norm-grid { display: grid; grid-template-columns: auto 1fr; column-gap: 14px; row-gap: 3px; align-items: baseline; }',
'.norm-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); white-space: nowrap; }',
'.norm-val { font-size: 12.5px; color: var(--text-secondary); line-height: 1.4; }',
'.norm-eg { font-family: var(--font-mono); color: var(--text-primary); font-size: 11px; }',
'</style>',
'<div class="norm-header">',
'  <div>',
'    <span class="norm-tag" style="background:' + s0.color + '1e;color:' + s0.color + ';border-color:' + s0.color + '40;">' + esc(s0.label) + '</span>',
'    <span class="norm-nf-badge norm-nf-slot">' + esc(s0.nf) + '</span>',
'  </div>',
'  <h1 class="norm-title">Normalization</h1>',
'  <p class="norm-sub">Eliminating redundancy in ShopFlow\'s <code>orders_flat</code> table — 0NF through 3NF.</p>',
'</div>',
'<div class="norm-body">',
'  <div class="norm-sidebar"><div class="step-pills" style="flex-direction:column;">' + pills + '</div></div>',
'  <div class="norm-main">',
'    <div class="norm-diagram norm-diagram-slot">' + _buildDiagram(0) + '</div>',
'    <div class="norm-info">',
'      <div class="norm-grid">',
'        <span class="norm-lbl">What</span><span class="norm-val norm-what">' + esc(s0.what) + '</span>',
'        <span class="norm-lbl">Why</span><span class="norm-val norm-why">' + esc(s0.why) + '</span>',
'        <span class="norm-lbl">Example</span><span class="norm-val norm-eg norm-example">' + esc(s0.example) + '</span>',
'        <span class="norm-lbl">Trade-off</span><span class="norm-val norm-trade">' + esc(s0.trade) + '</span>',
'      </div>',
'    </div>',
'  </div>',
'</div>',
    ].join('\n');
  }

  function _updateStep(page, si) {
    var s = STEPS[si];

    page.querySelectorAll('.norm-pill').forEach(function (elm, i) {
      elm.classList.toggle('active', i === si);
    });

    var tag = page.querySelector('.norm-tag');
    if (tag) { tag.textContent = s.label; tag.style.background = s.color + '1e'; tag.style.color = s.color; tag.style.borderColor = s.color + '40'; }

    var nf = page.querySelector('.norm-nf-slot');
    if (nf) nf.textContent = s.nf;

    var diag = page.querySelector('.norm-diagram-slot');
    if (diag) diag.innerHTML = _buildDiagram(si);

    function _set(sel, val) { var n = page.querySelector(sel); if (n) n.textContent = val; }
    _set('.norm-what', s.what);
    _set('.norm-why', s.why);
    _set('.norm-example', s.example);
    _set('.norm-trade', s.trade);
  }

  function _render(container) {
    container.innerHTML = '';
    var page = document.createElement('div');
    page.className = 'norm-page page-enter';
    page.innerHTML = _buildHTML();
    container.appendChild(page);

    _engine = new IV.AnimationEngine({
      steps: STEPS.map(function (s, i) {
        return {
          label: s.label,
          description: s.what,
          duration: 3200,
          enter: function () { _updateStep(page, i); },
        };
      }),
    });

    page.querySelectorAll('.norm-pill').forEach(function (elm) {
      elm.addEventListener('click', function () { _engine.goto(parseInt(elm.dataset.step, 10)); });
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['normalization'] = {
    id: 'normalization',
    title: 'Normalization',
    group: 'db-design',
    render: _render,
    destroy: function () {
      if (_engine) { _engine.destroy(); _engine = null; }
      window.IcebergViz.AnimationControls.hide();
    },
  };
})();
