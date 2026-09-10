/* Topic grid — the cross-topic jump surface. Lists every topic (from generated
   stubs + authored content), showing readiness. Tapping a topic enters its feed.
   This validates navigation across topics before any topic beyond Kafka is authored. */
import { topics } from "../content/loadContent";
import { go } from "../router";
import { useProgress } from "../state/store";
import { Account } from "./Account";

export function TopicGrid() {
  const due = useProgress((s) => s.dueCount());
  return (
    <div className="grid-screen">
      <header className="grid-header">
        <h1 className="grid-title">DE Shorts</h1>
        <p className="grid-sub">{topics.length} topics · pick one to jump in</p>
        <Account />
      </header>
      {due > 0 && (
        <button className="review-banner" onClick={() => go.review()}>
          {due} due for review
          <span className="review-banner__go">Start ›</span>
        </button>
      )}
      <div className="topic-grid">
        {topics.map((t) => (
          <button
            key={t.topic}
            className="topic-tile"
            data-topic={t.topic}
            onClick={() => go.topic(t.topic)}
          >
            <span className="topic-tile__dot" />
            <span className="topic-tile__name">{t.topic.replace(/-/g, " ")}</span>
            <span className="topic-tile__meta">
              {t.authored > 0 ? (
                <span className="pill pill--ready">{t.authored} ready</span>
              ) : (
                <span className="pill pill--stub">{t.total} placeholder</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
