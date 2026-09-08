/* DE Shorts — card renderer (spec §5/§7) with Phase 3 interactions:
   - swipe physics (framer-motion): drag right = Good, left = Again
   - four FSRS rating buttons (swipe-first, not swipe-only — spec §35)
   - persisted status chip + next-review feedback
   Layout still enforced by the 360x800 grid + render gate. */
import { useState } from "react";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import type { Concept } from "../content/loadContent";
import { conceptById } from "../content/loadContent";
import { go } from "../router";
import { useProgress } from "../state/store";
import type { Grade } from "../state/scheduler";
import { Visual } from "./visuals";

const humanIn = (dueMs: number): string => {
  const d = dueMs - Date.now();
  const day = 86400000;
  if (d <= 0) return "now";
  if (d < day) return `${Math.max(1, Math.round(d / 3600000))}h`;
  return `${Math.round(d / day)}d`;
};

function JumpChips({ ids }: { ids: string[] }) {
  const resolved = ids.map((id) => conceptById(id)).filter(Boolean) as Concept[];
  if (resolved.length === 0) return null;
  return (
    <div className="chips">
      {resolved.map((c) => (
        <button key={c.id} className="chip" data-topic={c.topic}
          onClick={(e) => { e.stopPropagation(); go.concept(c.id); }}>
          {c.term}
          <span className="chip__topic">{c.topic}</span>
        </button>
      ))}
    </div>
  );
}

function Section({ label, children, variant }: { label: string; children: React.ReactNode; variant?: "interview" }) {
  if (!children) return null;
  return (
    <div className={"section" + (variant ? " section--interview" : "")}>
      <div className="section__label">{label}</div>
      <div className="section__body">{children}</div>
    </div>
  );
}

export function Card({ concept, onAdvance }: { concept: Concept; onAdvance?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const c = concept;
  const isStub = c.authoringStatus === "stub";
  const rate = useProgress((s) => s.rate);
  const status = useProgress((s) => s.byId[c.id]?.status ?? "unseen");
  const dueMs = useProgress((s) => s.byId[c.id]?.due);
  const [flash, setFlash] = useState<string | null>(null);

  const x = useMotionValue(0);
  const leftGlow = useTransform(x, [-140, 0], [0.5, 0]);
  const rightGlow = useTransform(x, [0, 140], [0, 0.5]);

  const jumps = [...(c.prerequisites ?? []), ...(c.relatedConcepts ?? []), ...(c.nextConcepts ?? [])];

  async function doRate(g: Grade) {
    const p = await rate(c.id, g);
    setFlash(`${g === "again" ? "Review" : "Scheduled"} · next in ${humanIn(p.due)}`);
    setTimeout(() => { setFlash(null); onAdvance?.(); }, 650);
  }

  function onDragEnd(_e: unknown, info: PanInfo) {
    if (isStub) return;
    if (info.offset.x > 110) doRate("good");
    else if (info.offset.x < -110) doRate("again");
  }

  const statusLabel: Record<string, string> = {
    learning: "Learning", review_due: "Due", weak: "Weak", learned: "Learned", mastered: "Mastered",
  };

  return (
    <motion.article
      className={"card" + (isStub ? " card--stub" : "")}
      data-topic={c.topic}
      data-card-id={c.id}
      onClick={() => !isStub && setExpanded((v) => !v)}
      style={{ x }}
      drag={isStub ? false : "x"}
      dragSnapToOrigin
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      onDragEnd={onDragEnd}
    >
      <motion.div className="swipe-glow swipe-glow--again" style={{ opacity: leftGlow }} />
      <motion.div className="swipe-glow swipe-glow--good" style={{ opacity: rightGlow }} />

      <div className="card__meta">
        <span className="card__topic-dot" />
        <span>{c.topic}</span>
        {isStub && <span className="badge-stub">Placeholder</span>}
        {!isStub && status !== "unseen" && (
          <span className={"status-chip status-chip--" + status}>{statusLabel[status]}</span>
        )}
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
                  {c.example.type === "text" ? c.example.content : <pre className="code">{c.example.content}</pre>}
                </Section>
              )}
              {c.whyItMatters && <Section label="Why it matters">{c.whyItMatters}</Section>}
              {c.commonMistake && <Section label="Watch out">{c.commonMistake}</Section>}
              {c.interviewLine && (
                <Section label="Say this in an interview" variant="interview">{c.interviewLine}</Section>
              )}
              {c.interviewQuestion && <Section label="Interview question">{c.interviewQuestion}</Section>}
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
        {isStub ? (
          <span className="expand-hint">Placeholder · swipe ↑ next</span>
        ) : flash ? (
          <span className="flash">{flash}</span>
        ) : !expanded ? (
          <span className="expand-hint">
            {dueMs !== undefined ? `Next review ${humanIn(dueMs)} · ` : ""}Tap to expand · swipe ↑ next
          </span>
        ) : (
          <div className="rate-row">
            <button className="rate rate--again" onClick={() => doRate("again")}>Again</button>
            <button className="rate rate--hard" onClick={() => doRate("hard")}>Hard</button>
            <button className="rate rate--good" onClick={() => doRate("good")}>Good</button>
            <button className="rate rate--easy" onClick={() => doRate("easy")}>Easy</button>
          </div>
        )}
      </div>
    </motion.article>
  );
}
