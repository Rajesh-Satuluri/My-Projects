import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { Card } from "./components/Card";
import { TopicGrid } from "./components/TopicGrid";
import { conceptsByTopic, conceptById, type Concept } from "./content/loadContent";
import { useRoute, go } from "./router";
import { useProgress } from "./state/store";

function TopBar({ title, topic }: { title: string; topic?: string }) {
  return (
    <div className="topbar" data-topic={topic}>
      <button className="topbar__back" onClick={() => go.topics()} aria-label="All topics">‹ Topics</button>
      <span className="topbar__title">{title}</span>
    </div>
  );
}

/** Premium one-card-per-swipe pager (Inshorts / Reels feel):
   - the track follows your finger in real time (with rubber-band at the ends)
   - release advances EXACTLY one card by distance OR velocity (a light flick works)
   - a spring settle animates the move; the outgoing card gets subtle depth
   - tap vs swipe is disambiguated by the browser itself: a tap fires a click
     (-> Card expands); a swipe calls preventDefault (no click, just pages)
   Expanded, scrollable cards scroll their body natively instead of paging. */
function Feed({ list }: { list: Concept[] }) {
  const [index, setIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hRef = useRef(0);

  // refs so the (deps:[]) gesture listeners never read stale state
  const indexRef = useRef(0); indexRef.current = index;
  const listRef = useRef(list); listRef.current = list;
  const settleRef = useRef<(i: number) => void>(() => {});

  const measure = () => { hRef.current = containerRef.current?.clientHeight || window.innerHeight; };

  useEffect(() => { setIndex(0); setExpandedId(null); }, [list]);
  useLayoutEffect(() => { measure(); y.set(-index * hRef.current); }, [index, list]);
  useEffect(() => {
    const onResize = () => { measure(); y.set(-indexRef.current * hRef.current); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [y]);

  const settle = (iAbs: number) => {
    const ni = Math.max(0, Math.min(listRef.current.length - 1, iAbs));
    if (ni !== indexRef.current) { setIndex(ni); setExpandedId(null); }
    animate(y, -ni * hRef.current, { type: "spring", stiffness: 520, damping: 44, mass: 0.9 });
  };
  settleRef.current = settle;

  const closestBodyScrollable = (t: EventTarget | null): HTMLElement | null => {
    let n = t as HTMLElement | null;
    while (n && n !== containerRef.current) {
      if (n.classList?.contains("card__body") && n.scrollHeight > n.clientHeight + 1) return n;
      n = n.parentElement;
    }
    return null;
  };
  const inInteractive = (t: EventTarget | null): boolean => {
    let n = t as HTMLElement | null;
    while (n && n !== containerRef.current) {
      if (n.tagName === "BUTTON" || n.tagName === "A") return true;
      n = n.parentElement;
    }
    return false;
  };

  // native (non-passive) touch listeners so we can preventDefault to take over the drag
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const SLOP = 8;      // px before we decide tap vs drag
    const DIST = 46;     // px distance that commits a page
    const VEL = 0.45;    // px/ms flick velocity that commits a page (sensitive)

    type G = {
      x0: number; y0: number; t0: number; ly: number; lt: number; vy: number;
      axis: null | "x" | "y"; mode: "gesture" | "native"; base: number;
      scrollBody: HTMLElement | null;
    };
    let g: G | null = null;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) { g = null; return; }
      const t = e.touches[0];
      measure();
      g = {
        x0: t.clientX, y0: t.clientY, t0: performance.now(),
        ly: t.clientY, lt: performance.now(), vy: 0,
        axis: null,
        // taps/drags on buttons are never ours; body-scroll is decided at axis-lock
        mode: inInteractive(e.target) ? "native" : "gesture",
        base: y.get(),
        scrollBody: closestBodyScrollable(e.target),
      };
    };
    const onMove = (e: TouchEvent) => {
      if (!g || g.mode !== "gesture") return;
      const t = e.touches[0];
      const dx = t.clientX - g.x0, dy = t.clientY - g.y0;
      if (!g.axis) {
        if (Math.hypot(dx, dy) < SLOP) return;
        g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        // a vertical drag that began inside a scrollable body scrolls it natively
        if (g.axis === "y" && g.scrollBody) { g.mode = "native"; return; }
      }
      e.preventDefault(); // committed to OUR gesture -> suppress the trailing click
      if (g.axis === "y") {
        const now = performance.now();
        const dt = now - g.lt || 16;
        g.vy = (t.clientY - g.ly) / dt;
        g.ly = t.clientY; g.lt = now;
        const min = -(listRef.current.length - 1) * hRef.current, max = 0;
        let target = g.base + dy;
        if (target > max) target = max + (target - max) * 0.35;   // rubber-band top
        if (target < min) target = min + (target - min) * 0.35;   // rubber-band bottom
        y.set(target);
      }
    };
    const onEnd = (e: TouchEvent) => {
      const s = g; g = null;
      if (!s || s.mode !== "gesture" || s.axis === null) return; // tap -> let the click expand
      const ct = e.changedTouches[0];
      const dx = (ct?.clientX ?? s.x0) - s.x0;
      const dy = (ct?.clientY ?? s.y0) - s.y0;
      if (s.axis === "y") {
        const commit = Math.abs(dy) > DIST || Math.abs(s.vy) > VEL;
        settleRef.current(indexRef.current + (commit ? (dy < 0 ? 1 : -1) : 0));
      } else {
        // horizontal: left = expand, right = collapse
        const id = listRef.current[indexRef.current]?.id ?? null;
        if (dx < -36) setExpandedId(id);
        else if (dx > 36) setExpandedId(null);
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [y]);

  // desktop wheel: one card per burst (skip if hovering a scrollable body)
  const wheelLock = useRef(false);
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 8) return;
    if (closestBodyScrollable(e.target)) return;
    if (wheelLock.current) return;
    wheelLock.current = true;
    setTimeout(() => (wheelLock.current = false), 380);
    settle(indexRef.current + (e.deltaY > 0 ? 1 : -1));
  };

  return (
    <div className="pager" ref={containerRef} onWheel={onWheel}>
      <motion.div className="pager__track" style={{ y }}>
        {list.map((c, i) => (
          <div key={c.id} className="pager__slot" data-active={i === index}>
            <Card
              concept={c}
              expanded={expandedId === c.id}
              onToggle={() => setExpandedId((prev) => (prev === c.id ? null : c.id))}
              onAdvance={() => settle(index + 1)}
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function TopicFeed({ topic }: { topic: string }) {
  return (
    <div className="screen">
      <TopBar title={topic.replace(/-/g, " ")} topic={topic} />
      <Feed list={conceptsByTopic(topic)} />
    </div>
  );
}

function ConceptView({ id }: { id: string }) {
  const c = conceptById(id);
  if (!c) return <div className="card"><h1 className="card__term">Unknown concept</h1></div>;
  return (
    <div className="screen">
      <TopBar title={c.term} topic={c.topic} />
      <Feed list={[c]} />
    </div>
  );
}

function ReviewView() {
  // select the raw map (stable ref) and derive the due list with useMemo to avoid
  // returning a fresh array from the selector on every render.
  const byId = useProgress((s) => s.byId);
  const list = useMemo(() => {
    const t = Date.now();
    return Object.values(byId)
      .filter((p) => p.status !== "unseen" && p.due <= t)
      .sort((a, b) => a.due - b.due)
      .map((p) => conceptById(p.conceptId))
      .filter(Boolean) as Concept[];
  }, [byId]);
  return (
    <div className="screen">
      <TopBar title={`Review · ${list.length} due`} />
      {list.length === 0 ? (
        <div className="pager">
          <div className="card">
            <h1 className="card__term">Nothing due</h1>
            <p className="card__def">Rate some concepts and they’ll come back here when they’re due.</p>
          </div>
        </div>
      ) : (
        <Feed list={list} />
      )}
    </div>
  );
}

export default function App() {
  const load = useProgress((s) => s.load);
  useEffect(() => { load(); }, [load]);

  const probe = new URLSearchParams(location.search).get("probe");
  if (probe) {
    const c = conceptById(probe);
    return <div className="feed">{c ? <Card concept={c} /> : <div className="card">unknown: {probe}</div>}</div>;
  }
  const route = useRoute();
  if (route.name === "topic") return <TopicFeed topic={route.topic} />;
  if (route.name === "concept") return <ConceptView id={route.id} />;
  if (route.name === "review") return <ReviewView />;
  return <TopicGrid />;
}
