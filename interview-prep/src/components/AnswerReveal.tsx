"use client";

import { useState } from "react";
import Markdown from "./Markdown";

export default function AnswerReveal({ answer }: { answer?: string }) {
  const [shown, setShown] = useState(false);

  if (!answer) return <p className="text-sm text-muted">No answer written yet.</p>;

  return shown ? (
    <Markdown>{answer}</Markdown>
  ) : (
    <button onClick={() => setShown(true)} className="btn btn-outline">
      Show answer
    </button>
  );
}
