import { useEffect, useMemo, useRef } from "react";
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

/** A vertical scroll-snap feed that scrolls to the next card after a rating. */
function Feed({ list }: { list: Concept[] }) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const advance = (i: number) => {
    const next = refs.current[i + 1];
    if (next) next.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <div className="feed feed--withbar">
      {list.map((c, i) => (
        <div key={c.id} ref={(el) => (refs.current[i] = el)} className="feed__slot">
          <Card concept={c} onAdvance={() => advance(i)} />
        </div>
      ))}
    </div>
  );
}

function TopicFeed({ topic }: { topic: string }) {
  return (
    <>
      <TopBar title={topic.replace(/-/g, " ")} topic={topic} />
      <Feed list={conceptsByTopic(topic)} />
    </>
  );
}

function ConceptView({ id }: { id: string }) {
  const c = conceptById(id);
  if (!c) return <div className="card"><h1 className="card__term">Unknown concept</h1></div>;
  return (
    <>
      <TopBar title={c.term} topic={c.topic} />
      <Feed list={[c]} />
    </>
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
    <>
      <TopBar title={`Review · ${list.length} due`} />
      {list.length === 0 ? (
        <div className="feed feed--withbar">
          <div className="card">
            <h1 className="card__term">Nothing due</h1>
            <p className="card__def">Rate some concepts and they’ll come back here when they’re due.</p>
          </div>
        </div>
      ) : (
        <Feed list={list} />
      )}
    </>
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
