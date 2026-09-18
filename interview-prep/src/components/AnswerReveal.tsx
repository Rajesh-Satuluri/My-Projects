"use client";

import { useState } from "react";

export default function AnswerReveal({ answer }: { answer?: string }) {
  const [shown, setShown] = useState(false);

  if (!answer) return <p className="text-sm text-muted">No answer written yet.</p>;

  return shown ? (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
  ) : (
    <button
      onClick={() => setShown(true)}
      className="rounded-md border px-3 py-1.5 text-sm hover:bg-[var(--bg)]"
    >
      Show answer
    </button>
  );
}
