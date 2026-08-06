"use client";

import { useEffect, useRef } from "react";
import { loadWikiEmbed, loadWikiPostNotes } from "@/lib/loadWikiModule";
import styles from "./WikiContent.module.css";

type WikiContentProps = {
  content: string;
  /** `manual` = paste notes (markdown-it + KaTeX). `post_notes` = Marked + MathJax. */
  pageType: "manual" | "post_notes";
  className?: string;
};

export default function WikiContent({
  content,
  pageType,
  className,
}: WikiContentProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const errRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const links: HTMLLinkElement[] = [];
    const addLink = (href: string, crossOrigin?: string) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const el = document.createElement("link");
      el.rel = "stylesheet";
      el.href = href;
      if (crossOrigin) el.crossOrigin = crossOrigin;
      document.head.appendChild(el);
      links.push(el);
    };
    addLink("/static/wiki_embed.css");
    if (pageType === "manual") {
      addLink(
        "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css",
        "anonymous",
      );
    }
    return () => links.forEach((el) => el.remove());
  }, [pageType]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    if (errRef.current) {
      errRef.current.hidden = true;
      errRef.current.textContent = "";
    }

    (async () => {
      try {
        if (pageType === "post_notes") {
          const { renderPostNotes } = await loadWikiPostNotes();
          if (cancelled) return;
          await renderPostNotes(root, content);
        } else {
          const { createWikiMarkdown } = await loadWikiEmbed();
          if (cancelled) return;
          const md = await createWikiMarkdown();
          root.innerHTML = md.render(content);
        }
      } catch (e) {
        if (!cancelled && errRef.current) {
          errRef.current.hidden = false;
          errRef.current.textContent =
            e instanceof Error ? e.message : String(e);
        }
      }
    })();

    return () => {
      cancelled = true;
      root.innerHTML = "";
    };
  }, [content, pageType]);

  return (
    <>
      <div
        className={`card wiki-content ${styles.wikiContent} ${className ?? ""}`.trim()}
        ref={rootRef}
      />
      <p ref={errRef} className="err" hidden />
    </>
  );
}
