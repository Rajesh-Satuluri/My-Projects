"use client";

import { useState } from "react";

export default function AnswerReveal({ answer }: { answer?: string }) {
  const [shown, setShown] = useState(false);

  if (!answer) return <p className="text-sm text-muted">No answer written yet.</p>;

  return shown ? (
    <p className="whitespace-pre-wrap text-[15px] leading-7 text-fgSoft">{answer}</p>
  ) : (
    <button onClick={() => setShown(true)} className="btn btn-outline">
      Show answer
    </button>
  );
}
