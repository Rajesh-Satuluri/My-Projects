/* DE Shorts — 6 reusable SVG visual templates (spec §6).
   Data-driven, ≤6 labels, legible in dark & light (uses currentColor + var(--accent)),
   fits 360px width with no horizontal page scroll. Concepts reference a template
   by name; the renderer dispatches here. No hand-drawn one-offs. */
import type { CSSProperties } from "react";

const W = 320;
const box: CSSProperties = { color: "var(--text-2)" };
const label = { fill: "var(--text-1)", fontSize: 13, fontFamily: "var(--font)" } as const;
const sub = { fill: "var(--text-3)", fontSize: 12, fontFamily: "var(--font)" } as const;
const stroke = "var(--border-strong)";
const accent = "var(--accent)";

type Data = Record<string, unknown>;
const asStrings = (v: unknown, fallback: string[] = []): string[] =>
  Array.isArray(v) ? v.map(String).slice(0, 6) : fallback;

/** flow — vertical stages with arrows (ETL, RAG pipeline). data: { steps: string[] } */
function Flow({ data }: { data: Data }) {
  const steps = asStrings(data.steps, ["Source", "Transform", "Load"]);
  const h = 20 + steps.length * 54;
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" role="img" style={box}>
      {steps.map((s, i) => {
        const y = 12 + i * 54;
        return (
          <g key={i}>
            <rect x={70} y={y} width={180} height={38} rx={9} fill="var(--surface-2)" stroke={stroke} />
            <text x={W / 2} y={y + 24} textAnchor="middle" {...label}>{s}</text>
            {i < steps.length - 1 && (
              <path d={`M${W / 2} ${y + 38} L${W / 2} ${y + 54}`} stroke={accent} strokeWidth={2} markerEnd="url(#a)" />
            )}
          </g>
        );
      })}
      <defs>
        <marker id="a" markerWidth={8} markerHeight={8} refX={4} refY={4} orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill={accent} />
        </marker>
      </defs>
    </svg>
  );
}

/** partition — one producer feeding N partitions distributed to consumers.
    data: { partitions?: number, consumers?: string[] } */
function Partition({ data }: { data: Data }) {
  const n = Math.min(6, Math.max(2, Number(data.partitions) || 3));
  const consumers = asStrings(data.consumers, []);
  const cellW = (W - 40) / n;
  return (
    <svg viewBox={`0 0 ${W} 160`} width="100%" role="img" style={box}>
      <rect x={110} y={8} width={100} height={30} rx={8} fill="var(--surface-2)" stroke={stroke} />
      <text x={W / 2} y={28} textAnchor="middle" {...label}>{String(data.source ?? "Producer")}</text>
      {Array.from({ length: n }).map((_, i) => {
        const x = 20 + i * cellW;
        return (
          <g key={i}>
            <path d={`M${W / 2} 38 L${x + cellW / 2} 60`} stroke={accent} strokeWidth={1.5} />
            <rect x={x + 4} y={62} width={cellW - 8} height={34} rx={7}
                  fill="color-mix(in srgb, var(--accent) 16%, var(--surface-2))" stroke={accent} />
            <text x={x + cellW / 2} y={83} textAnchor="middle" {...sub}>P{i}</text>
          </g>
        );
      })}
      {consumers.map((c, i) => {
        const x = 20 + (i * (W - 40)) / Math.max(1, consumers.length) + (W - 40) / consumers.length / 2;
        return (
          <g key={i}>
            <path d={`M${x} 96 L${x} 118`} stroke={stroke} strokeWidth={1.5} />
            <rect x={x - 42} y={120} width={84} height={30} rx={8} fill="var(--surface-2)" stroke={stroke} />
            <text x={x} y={140} textAnchor="middle" {...sub}>{c}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** before-after — two-column contrast. data: { before:{title,items[]}, after:{...} } */
function BeforeAfter({ data }: { data: Data }) {
  const b = (data.before ?? {}) as Data;
  const a = (data.after ?? {}) as Data;
  const bi = asStrings(b.items, []);
  const ai = asStrings(a.items, []);
  const col = (x: number, title: string, items: string[], hot: boolean) => (
    <g>
      <rect x={x} y={8} width={140} height={140} rx={12}
            fill="var(--surface-1)" stroke={hot ? accent : stroke} />
      <text x={x + 70} y={30} textAnchor="middle" {...label} fontWeight={700}>{title}</text>
      {items.map((it, i) => (
        <text key={i} x={x + 70} y={54 + i * 22} textAnchor="middle" {...sub}>{it}</text>
      ))}
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} 156`} width="100%" role="img" style={box}>
      {col(6, String(b.title ?? "Before"), bi, false)}
      {col(174, String(a.title ?? "After"), ai, true)}
      <path d="M150 78 L172 78" stroke={accent} strokeWidth={2} markerEnd="url(#ba)" />
      <defs>
        <marker id="ba" markerWidth={8} markerHeight={8} refX={4} refY={4} orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill={accent} />
        </marker>
      </defs>
    </svg>
  );
}

/** comparison — labeled 2-way table. data: { a:string, b:string, rows:[[l,r],...] } */
function Comparison({ data }: { data: Data }) {
  const rows = (Array.isArray(data.rows) ? data.rows : []).slice(0, 5) as unknown[];
  const h = 44 + rows.length * 30;
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" role="img" style={box}>
      <text x={90} y={20} textAnchor="middle" {...label} fontWeight={700} fill={accent}>{String(data.a ?? "A")}</text>
      <text x={230} y={20} textAnchor="middle" {...label} fontWeight={700}>{String(data.b ?? "B")}</text>
      <line x1={W / 2} y1={30} x2={W / 2} y2={h - 6} stroke={stroke} />
      {rows.map((r, i) => {
        const [l, rr] = (Array.isArray(r) ? r : ["", ""]) as string[];
        const y = 50 + i * 30;
        return (
          <g key={i}>
            <text x={90} y={y} textAnchor="middle" {...sub}>{String(l)}</text>
            <text x={230} y={y} textAnchor="middle" {...sub}>{String(rr)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** timeline — ordered events left→right. data: { events: string[] } */
function Timeline({ data }: { data: Data }) {
  const ev = asStrings(data.events, ["t0", "t1", "t2"]);
  const gap = (W - 40) / Math.max(1, ev.length - 1);
  return (
    <svg viewBox={`0 0 ${W} 110`} width="100%" role="img" style={box}>
      <line x1={20} y1={40} x2={W - 20} y2={40} stroke={stroke} strokeWidth={2} />
      {ev.map((e, i) => {
        const x = 20 + i * gap;
        return (
          <g key={i}>
            <circle cx={x} cy={40} r={6} fill={accent} />
            <text x={x} y={i % 2 ? 68 : 22} textAnchor="middle" {...sub}>{e}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** tree — root with children (driver→executors, hierarchy). data: { root, children[] } */
function Tree({ data }: { data: Data }) {
  const children = asStrings(data.children, ["A", "B", "C"]);
  const cw = (W - 20) / children.length;
  return (
    <svg viewBox={`0 0 ${W} 150`} width="100%" role="img" style={box}>
      <rect x={110} y={8} width={100} height={32} rx={9} fill="var(--surface-2)" stroke={accent} />
      <text x={W / 2} y={29} textAnchor="middle" {...label}>{String(data.root ?? "Root")}</text>
      {children.map((c, i) => {
        const x = 10 + i * cw + cw / 2;
        return (
          <g key={i}>
            <path d={`M${W / 2} 40 L${x} 96`} stroke={stroke} strokeWidth={1.5} />
            <rect x={x - cw / 2 + 6} y={98} width={cw - 12} height={40} rx={8} fill="var(--surface-1)" stroke={stroke} />
            <text x={x} y={122} textAnchor="middle" {...sub}>{c}</text>
          </g>
        );
      })}
    </svg>
  );
}

const REGISTRY = {
  flow: Flow,
  partition: Partition,
  "before-after": BeforeAfter,
  comparison: Comparison,
  timeline: Timeline,
  tree: Tree,
} as const;

export type VisualTemplate = keyof typeof REGISTRY;

export function Visual({ template, data }: { template: string; data: Data }) {
  const C = REGISTRY[template as VisualTemplate];
  if (!C) return null;
  return <C data={data} />;
}
