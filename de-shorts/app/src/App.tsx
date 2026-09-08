import { Card } from "./components/Card";
import { TopicGrid } from "./components/TopicGrid";
import { conceptsByTopic, conceptById } from "./content/loadContent";
import { useRoute, go } from "./router";

function TopBar({ title, topic }: { title: string; topic?: string }) {
  return (
    <div className="topbar" data-topic={topic}>
      <button className="topbar__back" onClick={() => go.topics()} aria-label="All topics">
        ‹ Topics
      </button>
      <span className="topbar__title">{title}</span>
    </div>
  );
}

function TopicFeed({ topic }: { topic: string }) {
  const list = conceptsByTopic(topic);
  return (
    <>
      <TopBar title={topic.replace(/-/g, " ")} topic={topic} />
      <div className="feed feed--withbar">
        {list.map((c) => (
          <Card key={c.id} concept={c} />
        ))}
      </div>
    </>
  );
}

function ConceptView({ id }: { id: string }) {
  const c = conceptById(id);
  if (!c)
    return (
      <div className="card">
        <h1 className="card__term">Unknown concept</h1>
      </div>
    );
  return (
    <>
      <TopBar title={c.term} topic={c.topic} />
      <div className="feed feed--withbar">
        <Card concept={c} />
      </div>
    </>
  );
}

export default function App() {
  // render gate probes a single authored card via ?probe=<id>
  const probe = new URLSearchParams(location.search).get("probe");
  if (probe) {
    const c = conceptById(probe);
    return (
      <div className="feed">
        {c ? <Card concept={c} /> : <div className="card">unknown: {probe}</div>}
      </div>
    );
  }
  const route = useRoute();
  if (route.name === "topic") return <TopicFeed topic={route.topic} />;
  if (route.name === "concept") return <ConceptView id={route.id} />;
  return <TopicGrid />;
}
