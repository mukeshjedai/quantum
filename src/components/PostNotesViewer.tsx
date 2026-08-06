"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

export default function PostNotesViewer({ markdown }: { markdown: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const errRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    const script = document.createElement("script");
    script.type = "module";
    script.textContent = `
      import { renderPostNotes } from "/static/wiki_post_notes.js";
      renderPostNotes(document.getElementById("post-notes-root"), ${JSON.stringify(markdown)})
        .catch((e) => {
          const err = document.getElementById("post-notes-err");
          if (err) { err.hidden = false; err.textContent = String(e); }
        });
    `;
    root.id = "post-notes-root";
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      script.remove();
      if (!cancelled) root.innerHTML = "";
    };
  }, [markdown]);

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js" strategy="beforeInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" strategy="lazyOnload" />
      <link rel="stylesheet" href="/static/wiki_embed.css" />
      <div className="card wiki-content" ref={rootRef} id="post-notes-root" />
      <p id="post-notes-err" ref={errRef} className="err" hidden />
    </>
  );
}
