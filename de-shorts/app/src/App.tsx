import { useEffect, useMemo, useRef, useState } from "react";
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

/** One-card-per-swipe pager (Inshorts / Reels style): a single vertical swipe
   moves EXACTLY one card, however hard you fling — we drive the position
   ourselves instead of relying on momentum scroll-snap. Horizontal swipes are
   left to the Card (expand/collapse); an expanded, scrollable body scrolls
   internally until it hits an edge, then the next swipe pages. */
function Feed({ list }: { list: Concept[] }) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number; el: EventTarget | null } | null>(null);
  const wheelLock = useRef(false);

  // reset to the first card whenever the list identity changes (topic switch, jump)
  useEffect(() => { setIndex(0); }, [list]);

  const paginate = (dir: number) =>
    setIndex((i) => Math.max(0, Math.min(list.length - 1, i + dir)));

  // Does an expanded, scrollable card body still have room to scroll in `dir`?
  // If so, let it scroll natively instead of paging.
  const innerConsumes = (target: EventTarget | null, dir: number): boolean => {
    let el = target as HTMLElement | null;
    while (el && el !== containerRef.current) {
      if (el.classList?.contains("card__body") && el.scrollHeight > el.clientHeight + 1) {
        const atTop = el.scrollTop <= 0;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        if (dir > 0 && !atBottom) return true;
        if (dir < 0 && !atTop) return true;
      }
      el = el.parentElement;
    }
    return false;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY, el: e.target };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = startRef.current;
    startRef.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) >= Math.abs(dy)) return; // horizontal -> Card handles expand/collapse
    if (Math.abs(dy) < 45) return;            // too small -> treat as a tap
    const dir = dy < 0 ? 1 : -1;              // swipe up => next card
    if (innerConsumes(s.el, dir)) return;     // reading an expanded card -> let it scroll
    paginate(dir);                            // ONE card, regardless of fling velocity
  };
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 8) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    if (innerConsumes(e.target, dir)) return;
    if (wheelLock.current) return;            // one card per wheel burst
    wheelLock.current = true;
    setTimeout(() => (wheelLock.current = false), 420);
    paginate(dir);
  };

  return (
    <div
      className="pager"
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      <div className="pager__track" style={{ transform: `translateY(${-index * 100}%)` }}>
        {list.map((c, i) => (
          <div key={c.id} className="pager__slot" data-active={i === index}>
            <Card concept={c} onAdvance={() => paginate(1)} />
          </div>
        ))}
      </div>
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
