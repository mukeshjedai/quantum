"use client";

import { useEffect, useRef } from "react";

type SphinxWikiContentProps = {
  html: string;
  title?: string;
  preview?: boolean;
};

export default function SphinxWikiContent({ html, title = "Documentation", preview = false }: SphinxWikiContentProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host.shadowRoot || host.attachShadow({ mode: "open" });
    root.replaceChildren();

    const theme = document.createElement("link");
    theme.rel = "stylesheet";
    theme.href = "/api/wiki/sphinx/theme.css";

    const layout = document.createElement("style");
    layout.textContent = `
      :host {
        display: block;
        min-width: 0;
        width: 100%;
      }
      *, *::before, *::after { box-sizing: border-box; }
      .wy-grid-for-nav {
        display: block !important;
        position: relative !important;
        width: 100% !important;
        height: auto !important;
      }
      .wy-nav-side, .wy-nav-top { display: none !important; }
      .wy-nav-content-wrap {
        margin-left: 0 !important;
        min-width: 0;
        width: auto !important;
      }
      .wy-nav-content {
        margin: 0 !important;
        padding: 2rem clamp(1rem, 3vw, 3rem) !important;
        max-width: none !important;
        min-width: 0;
      }
      .rst-content, .sphinx-content { min-width: 0; max-width: 100%; }
      .sphinx-content { line-height: 1.65; overflow-wrap: anywhere; }
      .sphinx-content pre, .sphinx-content table, .sphinx-content .math {
        max-width: 100%;
        overflow-x: auto;
      }
      .sphinx-content pre {
        white-space: pre !important;
        overflow-wrap: normal !important;
        word-break: normal !important;
        line-height: 1.5;
        padding: 1rem !important;
      }
      .sphinx-content pre code {
        display: block;
        width: max-content;
        min-width: 100%;
        white-space: inherit !important;
        overflow-wrap: normal !important;
        word-break: normal !important;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        font-size: 0.875rem;
      }
      .sphinx-content img { max-width: 100%; height: auto; }
      .wy-breadcrumbs { padding-left: 0 !important; }
      @media (max-width: 700px) {
        .wy-nav-content { padding: 1rem !important; }
      }
    `;

    const shell = document.createElement("div");
    shell.className = "wy-grid-for-nav";

    const contentWrap = document.createElement("section");
    contentWrap.className = "wy-nav-content-wrap";
    const content = document.createElement("div");
    content.className = "wy-nav-content";
    const rst = document.createElement("div");
    rst.className = "rst-content";
    const breadcrumbs = document.createElement("div");
    breadcrumbs.setAttribute("role", "navigation");
    breadcrumbs.setAttribute("aria-label", "Page navigation");
    breadcrumbs.innerHTML = `<ul class="wy-breadcrumbs"><li>Wiki</li><li></li></ul><hr />`;
    const article = document.createElement("article");
    article.className = "document sphinx-content";
    article.innerHTML = html;
    const documentHeading = article.querySelector<HTMLElement>("h1");
    if (documentHeading?.textContent?.replace(/¶/g, "").trim().toLocaleLowerCase() === title.trim().toLocaleLowerCase()) {
      documentHeading.remove();
    }
    const titleNodes = breadcrumbs.querySelectorAll("li");
    titleNodes[1].textContent = title;
    article.addEventListener("click", (event) => {
      const link = (event.target as Element).closest("a[href^='#']");
      const fragment = link?.getAttribute("href")?.slice(1);
      if (!fragment) return;
      let id: string;
      try { id = decodeURIComponent(fragment); } catch { return; }
      const target = root.getElementById(id);
      if (target) { event.preventDefault(); target.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });

    rst.append(breadcrumbs, article);
    content.appendChild(rst);
    contentWrap.appendChild(content);
    shell.append(contentWrap);
    root.append(theme, layout, shell);
  }, [html, title]);

  return (
    <div
      ref={hostRef}
      className={preview ? "sphinx-host" : "card sphinx-host"}
      aria-label="Sphinx documentation content"
    />
  );
}
