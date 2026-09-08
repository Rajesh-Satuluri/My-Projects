import { Card } from "./Card";
import { authoredConcepts, conceptById } from "../content/loadContent";

/** Feed of authored concepts. `?probe=<id>` renders a single card for the gate. */
export function CardFeed() {
  const probe = new URLSearchParams(location.search).get("probe");
  if (probe) {
    const c = conceptById(probe);
    return <div className="feed">{c ? <Card concept={c} /> : <div className="card">unknown: {probe}</div>}</div>;
  }
  return (
    <div className="feed">
      {authoredConcepts.length === 0 && (
        <div className="card"><h1 className="card__term">No authored concepts yet</h1>
          <p className="card__def">Author the Kafka slice to populate the feed.</p></div>
      )}
      {authoredConcepts.map((c) => <Card key={c.id} concept={c} />)}
    </div>
  );
}
