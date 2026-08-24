"use client";

import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import { loadWikiEmbed, loadWikiPostNotes } from "@/lib/loadWikiModule";
import styles from "./WikiContent.module.css";

type WikiContentProps = {
  content: string;
  /** `manual` = paste notes (markdown-it + KaTeX). `post_notes` = Marked + MathJax. */
  pageType: "manual" | "post_notes";
  className?: string;
  /** When true, run /api/wiki/manual/preview normalization before rendering manual notes. */
  normalizeManual?: boolean;
  /** Enables native Ctrl+Shift+1 anchor insertion on a saved manual page. */
  pageId?: string;
};

type PendingAnchor = {
  selection: string;
  contextBefore: string;
  contextAfter: string;
  tooltipText: string;
};

function caretContext(event: globalThis.MouseEvent): Omit<PendingAnchor, "selection"> | null {
  const documentWithCaret = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const position = documentWithCaret.caretPositionFromPoint?.(event.clientX, event.clientY);
  const range = position ? null : documentWithCaret.caretRangeFromPoint?.(event.clientX, event.clientY);
  const node = position?.offsetNode ?? range?.startContainer;
  const offset = position?.offset ?? range?.startOffset ?? 0;
  if (node?.nodeType !== Node.TEXT_NODE) return null;
  const text = node.nodeValue ?? "";
  if (!text) return null;
  return {
    contextBefore: text.slice(Math.max(0, offset - 160), offset),
    contextAfter: text.slice(offset, offset + 160),
    tooltipText: text.trim().slice(0, 240) || "Wiki anchor",
  };
}

export default function WikiContent({
  content,
  pageType,
  className,
  normalizeManual = false,
  pageId,
}: WikiContentProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const errRef = useRef<HTMLParagraphElement>(null);
  const armedUntilRef = useRef(0);
  const selectionRef = useRef("");
  const [pendingAnchor, setPendingAnchor] = useState<PendingAnchor | null>(null);
  const [anchorUrl, setAnchorUrl] = useState("");
  const [anchorStatus, setAnchorStatus] = useState("");
  const [savingAnchor, setSavingAnchor] = useState(false);

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
          let markdown = content;
          if (normalizeManual) {
            const res = await fetch("/api/wiki/manual/preview", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ body: content }),
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            markdown = data.markdown || content;
          }
          const { renderWikiMarkdown } = await loadWikiEmbed();
          if (cancelled) return;
          root.innerHTML = await renderWikiMarkdown(markdown);
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
  }, [content, pageType, normalizeManual]);

  useEffect(() => {
    if (!pageId || pageType !== "manual") return;
    const root = rootRef.current;
    if (!root) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey && event.shiftKey && event.code === "Digit1")) return;
      event.preventDefault();
      selectionRef.current = window.getSelection()?.toString().trim() ?? "";
      armedUntilRef.current = Date.now() + 15_000;
      setAnchorStatus(
        selectionRef.current
          ? "Anchor armed — click the selected text."
          : "Anchor armed — click where the link should be inserted.",
      );
    };

    const onClick = (event: globalThis.MouseEvent) => {
      if (event.button !== 0 || Date.now() > armedUntilRef.current) return;
      const selected = selectionRef.current;
      const context = selected ? null : caretContext(event);
      if (!selected && !context) {
        setAnchorStatus("Click directly beside text in the page.");
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      armedUntilRef.current = 0;
      setPendingAnchor({
        selection: selected,
        contextBefore: context?.contextBefore ?? "",
        contextAfter: context?.contextAfter ?? "",
        tooltipText: selected || context?.tooltipText || "Wiki anchor",
      });
      setAnchorUrl("");
      setAnchorStatus("");
    };

    document.addEventListener("keydown", onKeyDown, true);
    root.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      root.removeEventListener("click", onClick, true);
    };
  }, [pageId, pageType]);

  const saveAnchor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingAnchor || !pageId) return;
    setSavingAnchor(true);
    setAnchorStatus("");
    try {
      const response = await fetch("/api/wiki/anchor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_id: pageId,
          selected_text: pendingAnchor.selection,
          context_before: pendingAnchor.contextBefore,
          context_after: pendingAnchor.contextAfter,
          tooltip_text: pendingAnchor.tooltipText,
          url: anchorUrl.trim(),
          auto_fallback_local: true,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      setAnchorStatus("Anchor saved. Refreshing…");
      setPendingAnchor(null);
      window.setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      setAnchorStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingAnchor(false);
    }
  };

  return (
    <>
      <div
        className={`card wiki-content ${styles.wikiContent} ${className ?? ""}`.trim()}
        ref={rootRef}
      />
      <p ref={errRef} className="err" hidden />
      {anchorStatus ? <div className={styles.anchorToast}>{anchorStatus}</div> : null}
      {pendingAnchor ? (
        <div className={styles.anchorOverlay} role="presentation" onMouseDown={(event: MouseEvent) => {
          if (event.target === event.currentTarget) setPendingAnchor(null);
        }}>
          <form className={styles.anchorModal} onSubmit={saveAnchor}>
            <h2>Insert link anchor</h2>
            <p>Paste the URL to attach at the clicked text position.</p>
            <p className={styles.anchorTooltip}>Tooltip: {pendingAnchor.tooltipText}</p>
            <input
              type="url"
              required
              autoFocus
              value={anchorUrl}
              onChange={(event) => setAnchorUrl(event.target.value)}
              placeholder="https://example.com/page"
            />
            <div className={styles.anchorActions}>
              <button type="button" onClick={() => setPendingAnchor(null)}>Cancel</button>
              <button type="submit" disabled={savingAnchor}>
                {savingAnchor ? "Saving…" : "Insert anchor"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
