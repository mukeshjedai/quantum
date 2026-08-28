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
  caretRatio: number;
  range: Range;
};

function caretContext(
  event: globalThis.MouseEvent,
  root: HTMLElement,
): Omit<PendingAnchor, "selection"> | null {
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
  const prefix = document.createRange();
  prefix.selectNodeContents(root);
  prefix.setEnd(node, offset);
  const totalLength = root.textContent?.length ?? 0;
  return {
    contextBefore: text.slice(Math.max(0, offset - 160), offset),
    contextAfter: text.slice(offset, offset + 160),
    tooltipText: text.trim().slice(0, 240) || "Wiki anchor",
    caretRatio: totalLength ? prefix.toString().length / totalLength : 0,
    range: (() => {
      const caret = document.createRange();
      caret.setStart(node, offset);
      caret.collapse(true);
      return caret;
    })(),
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
  const selectionRangeRef = useRef<Range | null>(null);
  const [pendingAnchor, setPendingAnchor] = useState<PendingAnchor | null>(null);
  const [anchorUrl, setAnchorUrl] = useState("");
  const [anchorTooltip, setAnchorTooltip] = useState("");
  const [anchorStatus, setAnchorStatus] = useState("");
  const [savingAnchor, setSavingAnchor] = useState(false);

  useEffect(() => {
    const addLink = (href: string, crossOrigin?: string) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const el = document.createElement("link");
      el.rel = "stylesheet";
      el.href = href;
      if (crossOrigin) el.crossOrigin = crossOrigin;
      document.head.appendChild(el);
    };
    addLink("/static/wiki_embed.css");
    if (pageType === "manual") {
      addLink(
        "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css",
        "anonymous",
      );
    }
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
      const selection = window.getSelection();
      selectionRef.current = selection?.toString().trim() ?? "";
      selectionRangeRef.current = selectionRef.current && selection?.rangeCount
        ? selection.getRangeAt(0).cloneRange()
        : null;
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
      const context = selected ? null : caretContext(event, root);
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
        caretRatio: context?.caretRatio ?? 0,
        range: selected && selectionRangeRef.current
          ? (() => {
              const range = selectionRangeRef.current!.cloneRange();
              range.collapse(false);
              return range;
            })()
          : context!.range,
      });
      setAnchorUrl("");
      setAnchorTooltip(selected || context?.tooltipText || "Wiki anchor");
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
          caret_ratio: pendingAnchor.caretRatio,
          tooltip_text: anchorTooltip.trim(),
          url: anchorUrl.trim(),
          auto_fallback_local: true,
        }),
      });
      if (!response.ok) {
        let message = `Could not save anchor (${response.status}).`;
        const text = await response.text();
        try {
          const errorBody = JSON.parse(text);
          if (typeof errorBody?.detail === "string") message = errorBody.detail;
        } catch {
          if (text) message = text;
        }
        if (response.status === 404) {
          message = "The anchor API is not deployed yet. Deploy the latest AppLimit backend and try again.";
        }
        throw new Error(message);
      }
      const result = await response.json();
      const link = document.createElement("a");
      link.className = "wiki-anchor-icon";
      link.href = String(result.anchor_url || anchorUrl.trim());
      link.title = String(result.tooltip || anchorTooltip.trim() || "Linked page");
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "↗";
      pendingAnchor.range.insertNode(link);
      setAnchorStatus("Anchor saved. You can create another anchor now.");
      setPendingAnchor(null);
      setAnchorUrl("");
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
            <label className={styles.anchorLabel}>
              Tooltip text
              <input
                type="text"
                required
                maxLength={240}
                value={anchorTooltip}
                onChange={(event) => setAnchorTooltip(event.target.value)}
                placeholder="Text shown when hovering over the anchor"
              />
            </label>
            <label className={styles.anchorLabel}>
              URL
            <input
              type="url"
              required
              autoFocus
              value={anchorUrl}
              onChange={(event) => setAnchorUrl(event.target.value)}
              placeholder="https://example.com/page"
            />
            </label>
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
