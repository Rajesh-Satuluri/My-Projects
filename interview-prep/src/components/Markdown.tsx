"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders Markdown with styling that matches the app's design tokens.
// Used for question answers and guidance — supports headings, lists,
// GitHub-flavored tables, fenced code blocks (great for ASCII diagrams),
// inline code, bold/italic, links and blockquotes.
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="md text-[15px] leading-7 text-fgSoft">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="mt-5 mb-2 text-lg font-semibold text-fg first:mt-0" {...p} />,
          h2: (p) => <h2 className="mt-5 mb-2 text-base font-semibold text-fg first:mt-0" {...p} />,
          h3: (p) => <h3 className="mt-4 mb-1.5 text-sm font-semibold uppercase tracking-wide text-muted first:mt-0" {...p} />,
          p: (p) => <p className="my-2.5 first:mt-0 last:mb-0" {...p} />,
          ul: (p) => <ul className="my-2.5 list-disc space-y-1 pl-5" {...p} />,
          ol: (p) => <ol className="my-2.5 list-decimal space-y-1 pl-5" {...p} />,
          li: (p) => <li className="leading-6" {...p} />,
          a: (p) => <a className="text-accent underline underline-offset-2" target="_blank" rel="noreferrer" {...p} />,
          strong: (p) => <strong className="font-semibold text-fg" {...p} />,
          blockquote: (p) => (
            <blockquote className="my-3 border-l-2 border-l-accent pl-3 text-muted" {...p} />
          ),
          hr: () => <hr className="my-4 border-[var(--border)]" />,
          code: ({ className, children, ...rest }) => {
            const isBlock = /language-/.test(className ?? "");
            if (isBlock) {
              return (
                <code className={`${className ?? ""} font-mono text-[13px] leading-6`} {...rest}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded bg-[var(--panel-2)] px-1.5 py-0.5 font-mono text-[0.85em] text-fg"
                {...rest}
              >
                {children}
              </code>
            );
          },
          pre: (p) => (
            <pre
              className="my-3 overflow-x-auto rounded-lg border bg-[var(--panel-2)]/60 p-3 text-fg"
              {...p}
            />
          ),
          table: (p) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...p} />
            </div>
          ),
          thead: (p) => <thead className="bg-[var(--panel-2)]/60" {...p} />,
          th: (p) => (
            <th className="border border-[var(--border)] px-3 py-1.5 text-left font-semibold text-fg" {...p} />
          ),
          td: (p) => <td className="border border-[var(--border)] px-3 py-1.5 align-top" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
