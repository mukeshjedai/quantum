"use client";

import { useEffect, useRef } from "react";

type SphinxWikiContentProps = {
  html: string;
  preview?: boolean;
};

export default function SphinxWikiContent({ html, preview = false }: SphinxWikiContentProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host.shadowRoot || host.attachShadow({ mode: "open" });
    root.replaceChildren();

    const theme = document.createElement("link");
    theme.rel = "stylesheet";
    theme.href = "/api/wiki/sphinx/theme.css";

    const shell = document.createElement("div");
    shell.className = "wy-nav-content";
    const article = document.createElement("article");
    article.className = "rst-content sphinx-content";
    article.innerHTML = html;
    shell.appendChild(article);
    root.append(theme, shell);
  }, [html]);

  return (
    <div
      ref={hostRef}
      className={preview ? "sphinx-host" : "card sphinx-host"}
      aria-label="Sphinx documentation content"
    />
  );
}
