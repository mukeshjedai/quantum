"use client";

import { useEffect, useRef, useState } from "react";

type StaticHtmlWikiEmbedProps = {
  documentUrl?: string;
  title?: string;
};

/** Render uploaded HTML as static, style-isolated content inside the Wiki DOM. */
export default function StaticHtmlWikiEmbed({
  documentUrl,
  title = "Embedded HTML page",
}: StaticHtmlWikiEmbedProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !documentUrl) return;
    const controller = new AbortController();
    let shadow = host.shadowRoot;
    if (!shadow) shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = "<p>Loading embedded page…</p>";

    void fetch(documentUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load HTML (${response.status}).`);
        return response.text();
      })
      .then((html) => {
        const parsed = new DOMParser().parseFromString(html, "text/html");

        // Static embeds retain document markup and styling but cannot execute
        // scripts or inline handlers in the parent Wiki application.
        parsed.querySelectorAll("script, base, meta[http-equiv='refresh']").forEach((node) => node.remove());
        parsed.querySelectorAll("*").forEach((element) => {
          for (const attribute of Array.from(element.attributes)) {
            if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
          }
        });

        const styles = Array.from(
          parsed.head.querySelectorAll('style, link[rel="stylesheet"]'),
        ).map((node) => node.outerHTML).join("\n");
        shadow!.innerHTML = `
          <style>
            :host { display: block; color: #111827; background: #fff; }
            *, *::before, *::after { box-sizing: border-box; }
            img, video, svg, canvas { max-width: 100%; height: auto; }
          </style>
          ${styles}
          <div class="uploaded-html-root">${parsed.body.innerHTML}</div>
        `;
        setError("");
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        const message = reason instanceof Error ? reason.message : "Could not load HTML.";
        shadow!.innerHTML = "";
        setError(message);
      });

    return () => controller.abort();
  }, [documentUrl]);

  if (!documentUrl) return <p className="err">Embedded HTML document is unavailable.</p>;
  return (
    <section className="card" aria-label={title}>
      {error ? <p className="err">{error}</p> : null}
      <div ref={hostRef} />
    </section>
  );
}
