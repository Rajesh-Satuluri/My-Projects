/* DE Shorts — card renderer (spec §5/§7). Progressive disclosure: definition +
   visual always; tap to reveal why / example / common mistake / interview question.
   Layout is enforced by the 360x800 grid + the render gate. */
import { useState } from "react";
import type { Concept } from "../content/loadContent";
import { Visual } from "./visuals";

function Section({
  label,
  children,
  variant,
}: {
  label: string;
  children: React.ReactNode;
  variant?: "interview";
}) {
  if (!children) return null;
  return (
    <div className={"section" + (variant ? " section--interview" : "")}>
      <div className="section__label">{label}</div>
      <div className="section__body">{children}</div>
    </div>
  );
}

export function Card({ concept }: { concept: Concept }) {
  const [expanded, setExpanded] = useState(false);
  const c = concept;
  return (
    <article
      className="card"
      data-topic={c.topic}
      data-card-id={c.id}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="card__meta">
        <span className="card__topic-dot" />
        <span>{c.topic}</span>
        <span className="card__difficulty">{c.difficulty}</span>
      </div>

      <div>
        <h1 className="card__term">{c.term}</h1>
        <p className="card__def">{c.definition}</p>
      </div>

      <div className="card__body">
        {c.visual && (
          <div className="card__visual">
            <Visual template={c.visual.template} data={c.visual.data} />
          </div>
        )}

        {!expanded ? (
          <>
            {c.whyItMatters && (
              <Section label="Why it matters">{c.whyItMatters}</Section>
            )}
          </>
        ) : (
          <div className="card__expand">
            {c.explanation && <Section label="Explanation">{c.explanation}</Section>}
            {c.example && (
              <Section label="Example">
                {c.example.type === "text" ? (
                  c.example.content
                ) : (
                  <pre className="code">{c.example.content}</pre>
                )}
              </Section>
            )}
            {c.whyItMatters && <Section label="Why it matters">{c.whyItMatters}</Section>}
            {c.commonMistake && <Section label="Watch out">{c.commonMistake}</Section>}
            {c.interviewLine && (
              <Section label="Say this in an interview" variant="interview">
                {c.interviewLine}
              </Section>
            )}
            {c.interviewQuestion && (
              <Section label="Interview question">{c.interviewQuestion}</Section>
            )}
          </div>
        )}
      </div>

      <div className="card__actions" onClick={(e) => e.stopPropagation()}>
        {!expanded && <span className="expand-hint">Tap to expand · swipe ↑ next</span>}
        {expanded && (
          <>
            <button className="btn btn--ghost">Review again</button>
            <button className="btn btn--primary">Knew it</button>
          </>
        )}
      </div>
    </article>
  );
}
