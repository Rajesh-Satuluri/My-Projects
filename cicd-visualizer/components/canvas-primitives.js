// Shared canvas helpers for CI/CD module animations.
// Colors are read from CSS variables so light/dark themes stay in sync.

export function palette(){
  const cs = getComputedStyle(document.documentElement);
  const g = n => cs.getPropertyValue(n).trim();
  return {
    bg: g('--bg2'), bg3: g('--bg3'), border: g('--border'),
    text: g('--text'), text2: g('--text2'), text3: g('--text3'),
    accent: g('--accent'), accent2: g('--accent2'),
    green: g('--green'), amber: g('--amber'), red: g('--red'),
    blue: g('--blue'), purple: g('--purple'),
  };
}

export function setupCanvas(canvas, cssHeight){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 900;
  const h = cssHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

export const easeInOut = t => t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
export const easeOut = t => 1 - Math.pow(1-t, 3);
export const easeCubicOut = t => 1 - Math.pow(1-t, 3);
export const easeElasticOut = t => {
  if(t===0||t===1) return t;
  const c4 = (2*Math.PI)/3;
  return Math.pow(2,-10*t)*Math.sin((t*10-0.75)*c4)+1;
};
export const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
export const lerp = (a,b,t) => a + (b-a)*t;

export function drawRoundRect(ctx, x, y, w, h, r){
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

export function drawArrow(ctx, x1, y1, x2, y2, color, width=2, head=8){
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  const a = Math.atan2(y2-y1, x2-x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head*Math.cos(a - Math.PI/6), y2 - head*Math.sin(a - Math.PI/6));
  ctx.lineTo(x2 - head*Math.cos(a + Math.PI/6), y2 - head*Math.sin(a + Math.PI/6));
  ctx.closePath(); ctx.fill();
}

export function drawNode(ctx, x, y, w, h, opts={}){
  const p = opts.palette || palette();
  const fill = opts.fill || p.bg3;
  const stroke = opts.stroke || p.border;
  drawRoundRect(ctx, x, y, w, h, opts.radius ?? 12);
  if(opts.glow){
    ctx.save();
    ctx.shadowColor = opts.glow; ctx.shadowBlur = opts.glowBlur ?? 18;
    ctx.fillStyle = fill; ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = fill; ctx.fill();
  }
  ctx.lineWidth = opts.lineWidth ?? 1.5; ctx.strokeStyle = stroke; ctx.stroke();
  if(opts.icon){
    ctx.font = `${opts.iconSize||22}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(opts.icon, x+w/2, y+h/2 - (opts.label?9:0));
  }
  if(opts.label){
    ctx.fillStyle = opts.labelColor || p.text;
    ctx.font = `600 ${opts.labelSize||12}px system-ui`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(opts.label, x+w/2, y+h/2 + (opts.icon?15:0));
  }
}

export function drawPacket(ctx, x, y, r, color, label){
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = 16;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  if(label){
    ctx.fillStyle = '#04120C';
    ctx.font = `700 ${r*0.9}px system-ui`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(label, x, y);
  }
}

export function drawPulse(ctx, x, y, t, color, maxR=40){
  const r = t * maxR;
  ctx.save();
  ctx.globalAlpha = clamp(1 - t, 0, 1);
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}

export function drawText(ctx, text, x, y, opts={}){
  const p = opts.palette || palette();
  ctx.fillStyle = opts.color || p.text2;
  ctx.font = `${opts.weight||500} ${opts.size||12}px ${opts.mono?'ui-monospace,monospace':'system-ui'}`;
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = opts.baseline || 'alphabetic';
  ctx.fillText(text, x, y);
}

export function loop(onFrame){
  let raf, last = null, start = null, stopped = false;
  function frame(ts){
    if(stopped) return;
    if(start===null){ start = ts; last = ts; }
    const dt = (ts - last)/1000;
    const elapsed = (ts - start)/1000;
    last = ts;
    onFrame(dt, elapsed);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => { stopped = true; cancelAnimationFrame(raf); };
}
