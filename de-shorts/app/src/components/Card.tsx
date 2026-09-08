/* DE Shorts — card renderer (spec §5/§7). Progressive disclosure: definition +
   visual always; tap to reveal why / example / common mistake / interview question.
   Layout is enforced by the 360x800 grid + the render gate. */
import { useState } from "react";
import type { Concept } from "../content/loadContent";
import { conceptById } from "../content/loadContent";
import { go } from "../router";
import { Visual } from "./visuals";

/** Clickable chips that jump to related concepts — including ones in other topics. */
function JumpChips({ ids }: { ids: string[] }) {
  const resolved = ids.map((id) => conceptById(id)).filter(Boolean) as Concept[];
  if (resolved.length === 0) return null;
  return (
    <div className="chips">
      {resolved.map((c) => (
        <button
          key={c.id}
          className="chip"
          data-topic={c.topic}
          onClick={(e) => {
            e.stopPropagation();
            go.concept(c.id);
          }}
        >
          {c.term}
          <span className="chip__topic">{c.topic}</span>
        </button>
      ))}
    </div>
  );
}

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
  const isStub = c.authoringStatus === "stub";
  const jumps = [
    ...(c.prerequisites ?? []),
    ...(c.relatedConcepts ?? []),
    ...(c.nextConcepts ?? []),
  ];
  return (
    <article
      className={"card" + (isStub ? " card--stub" : "")}
      data-topic={c.topic}
      data-card-id={c.id}
      onClick={() => !isStub && setExpanded((v) => !v)}
    >
      <div className="card__meta">
        <span className="card__topic-dot" />
        <span>{c.topic}</span>
        {isStub && <span className="badge-stub">Placeholder</span>}
        <span className="card__difficulty">{c.difficulty}</span>
      </div>

      <div>
        <h1 className="card__term">{c.term}</h1>
        <p className="card__def">{c.definition}</p>
      </div>

      <div className="card__body">
        {isStub && (
          <div className="stub-note">
            <p>Not yet authored — this topic ships placeholders so navigation can be validated.</p>
            <p className="stub-note__seed">Seed priority {c.priority}/100 · from the encyclopedia.</p>
          </div>
        )}

        {c.visual && (
          <div className="card__visual">
            <Visual template={c.visual.template} data={c.visual.data} />
          </div>
        )}

        {!isStub &&
          (!expanded ? (
            c.whyItMatters && <Section label="Why it matters">{c.whyItMatters}</Section>
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
              {jumps.length > 0 && (
                <div className="section">
                  <div className="section__label">Jump to</div>
                  <JumpChips ids={jumps} />
                </div>
              )}
            </div>
          ))}
      </div>

      <div className="card__actions" onClick={(e) => e.stopPropagation()}>
        {isStub && <span className="expand-hint">Placeholder · swipe ↑ next</span>}
        {!isStub && !expanded && <span className="expand-hint">Tap to expand · swipe ↑ next</span>}
        {!isStub && expanded && (
          <>
            <button className="btn btn--ghost">Review again</button>
            <button className="btn btn--primary">Knew it</button>
          </>
        )}
      </div>
    </article>
  );
}
