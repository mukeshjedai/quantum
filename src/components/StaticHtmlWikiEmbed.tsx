"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { parseApiError } from "@/lib/api";

export type StaticHtmlAnchor = { source_index: number; url: string; tooltip?: string };
type Props = { documentUrl?: string; pageId: string; title?: string; anchors?: StaticHtmlAnchor[] };
type PendingAnchor = { sourceIndex: number; renderedTarget: Element };

function makeAnchor(owner: Document, url: string, tooltip: string): HTMLElement {
  const sup = owner.createElement("sup");
  const link = owner.createElement("a");
  sup.className = "wiki-static-anchor";
  link.href = url;
  link.title = tooltip || "Linked page";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "↗";
  sup.appendChild(link);
  return sup;
}

/** Static in-page HTML renderer with persistent Ctrl+Shift+1 anchors. */
export default function StaticHtmlWikiEmbed({ documentUrl, pageId, title = "Embedded HTML page", anchors = [] }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const armedUntilRef = useRef(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState<PendingAnchor | null>(null);
  const [url, setUrl] = useState("");
  const [tooltip, setTooltip] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !documentUrl) return;
    const controller = new AbortController();
    const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
    shadow.innerHTML = "<p>Loading embedded page…</p>";

    void fetch(documentUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load HTML (${response.status}).`);
        return response.text();
      })
      .then((html) => {
        const rendered = new DOMParser().parseFromString(html, "text/html");
        Array.from(rendered.body.querySelectorAll("*")).forEach((element, index) => {
          element.setAttribute("data-wiki-source-index", String(index));
        });
        rendered.querySelectorAll("script, base, meta[http-equiv='refresh']").forEach((node) => node.remove());
        rendered.querySelectorAll("*").forEach((element) => {
          for (const attribute of Array.from(element.attributes)) {
            if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
          }
        });
        // Keep the original html/head/body hierarchy. Many exported books and
        // PDF-to-HTML files position text using selectors rooted at html/body;
        // replacing body with a div breaks those coordinates and causes overlap.
        const reset = document.createElement("style");
        reset.textContent = `
          :host { display:block; color:#111827; background:#fff; overflow:auto; }
          .wiki-static-anchor { font-size:.72em; vertical-align:super; margin-left:.15em; }
        `;
        const documentTree = document.importNode(rendered.documentElement, true);
        shadow.replaceChildren(reset, documentTree);
        for (const anchor of anchors) {
          const target = shadow.querySelector(`[data-wiki-source-index="${anchor.source_index}"]`);
          if (target && /^https?:\/\//i.test(anchor.url)) {
            target.appendChild(makeAnchor(document, anchor.url, anchor.tooltip || "Linked page"));
          }
        }
        setError("");
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        shadow.innerHTML = "";
        setError(reason instanceof Error ? reason.message : "Could not load HTML.");
      });
    return () => controller.abort();
  }, [anchors, documentUrl]);

  useEffect(() => {
    const shadow = hostRef.current?.shadowRoot;
    if (!shadow) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey && event.shiftKey && event.code === "Digit1")) return;
      event.preventDefault();
      armedUntilRef.current = Date.now() + 15_000;
      setStatus("Anchor armed — click the HTML content where it should be inserted.");
    };
    const onClick = (event: Event) => {
      if (Date.now() > armedUntilRef.current) return;
      const target = event.composedPath().find(
        (node): node is Element => node instanceof Element && node.hasAttribute("data-wiki-source-index"),
      );
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      armedUntilRef.current = 0;
      const sourceIndex = Number(target.getAttribute("data-wiki-source-index"));
      if (!Number.isInteger(sourceIndex)) return;
      setPending({ sourceIndex, renderedTarget: target });
      setTooltip((target.textContent || "Linked page").trim().slice(0, 240));
      setUrl("");
      setStatus("");
    };
    document.addEventListener("keydown", onKeyDown, true);
    shadow.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      shadow.removeEventListener("click", onClick, true);
    };
  });

  const saveAnchor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pending) return;
    setSaving(true);
    setError("");
    try {
      const parsedUrl = new URL(url.trim());
      if (!/^https?:$/.test(parsedUrl.protocol)) throw new Error("Enter an HTTP or HTTPS URL.");
      const response = await fetch(`/api/wiki/html-app/${pageId}/anchors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_index: pending.sourceIndex,
          url: parsedUrl.href,
          tooltip: tooltip.trim(),
        }),
      });
      if (!response.ok) throw new Error(parseApiError(await response.text()));
      const result = await response.json();
      pending.renderedTarget.appendChild(makeAnchor(
        document,
        String(result.anchor?.url || parsedUrl.href),
        String(result.anchor?.tooltip || tooltip.trim()),
      ));
      setPending(null);
      setUrl("");
      setStatus("Anchor saved. Press Ctrl + Shift + 1 to add another.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save anchor.");
    } finally {
      setSaving(false);
    }
  };

  if (!documentUrl) return <p className="err">Embedded HTML document is unavailable.</p>;
  return <section className="card" aria-label={title}>
    {status ? <p className="muted">{status}</p> : null}
    {error ? <p className="err">{error}</p> : null}
    <div ref={hostRef} />
    {pending ? <div style={{ position:"fixed", inset:0, zIndex:1000, display:"grid", placeItems:"center", background:"rgba(15,23,42,.48)" }}>
      <form className="card" onSubmit={saveAnchor} style={{ width:"min(520px, calc(100vw - 2rem))" }}>
        <h2 style={{ marginTop:0 }}>Insert link anchor</h2>
        <label htmlFor="html-anchor-tooltip">Tooltip</label>
        <input id="html-anchor-tooltip" value={tooltip} onChange={(event) => setTooltip(event.target.value)} />
        <label htmlFor="html-anchor-url" style={{ marginTop:".6rem" }}>URL</label>
        <input id="html-anchor-url" type="url" required autoFocus value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" />
        <div style={{ display:"flex", gap:".5rem", marginTop:".8rem" }}>
          <button type="submit" disabled={saving}>{saving ? "Saving…" : "Insert anchor"}</button>
          <button type="button" disabled={saving} onClick={() => setPending(null)}>Cancel</button>
        </div>
      </form>
    </div> : null}
  </section>;
}
