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
        display: grid !important;
        grid-template-columns: minmax(210px, 250px) minmax(0, 1fr);
        position: relative !important;
        width: 100% !important;
        height: auto !important;
        min-height: 32rem;
        overflow: clip;
      }
      .wy-nav-side {
        position: sticky !important;
        inset: auto !important;
        top: 1rem !important;
        align-self: start;
        width: auto !important;
        height: min(42rem, calc(100vh - 2rem)) !important;
        min-height: 0 !important;
        overflow: hidden;
        z-index: 1 !important;
      }
      .wy-side-scroll {
        position: static !important;
        width: 100% !important;
        height: 100% !important;
        overflow-y: auto !important;
      }
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
      @media (max-width: 1100px) {
        .wy-grid-for-nav { display: block !important; }
        .wy-nav-side {
          position: relative !important;
          top: auto !important;
          width: 100% !important;
          height: auto !important;
          max-height: 18rem;
        }
        .wy-side-scroll { max-height: 18rem; }
        .wy-nav-content { padding: 1.25rem !important; }
      }
    `;

    const shell = document.createElement("div");
    shell.className = "wy-grid-for-nav";

    const side = document.createElement("nav");
    side.className = "wy-nav-side";
    side.setAttribute("aria-label", "Documentation navigation");
    side.innerHTML = `
      <div class="wy-side-scroll">
        <div class="wy-side-nav-search">
          <div class="icon icon-home"></div>
          <div role="search"><input type="search" placeholder="Search this page" aria-label="Search this page" /></div>
        </div>
        <div class="wy-menu wy-menu-vertical"><p class="caption">On this page</p><ul></ul></div>
      </div>`;

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
    const home = side.querySelector(".icon-home");
    if (home) home.textContent = title;

    const headings = [...article.querySelectorAll<HTMLElement>("h1, h2, h3")];
    const toc = side.querySelector("ul");
    headings.forEach((heading, index) => {
      if (!heading.id) heading.id = `section-${index + 1}`;
      const permalink = document.createElement("a");
      permalink.className = "headerlink";
      permalink.href = `#${heading.id}`;
      permalink.title = "Permalink to this heading";
      permalink.textContent = "¶";
      heading.appendChild(permalink);
      const item = document.createElement("li");
      item.className = `toctree-l${Math.max(1, Number(heading.tagName.slice(1)))}`;
      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.textContent = heading.childNodes[0]?.textContent || heading.textContent || "Section";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        heading.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      item.appendChild(link);
      toc?.appendChild(item);
    });

    const search = side.querySelector<HTMLInputElement>('input[type="search"]');
    search?.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      toc?.querySelectorAll("li").forEach((item) => {
        (item as HTMLElement).hidden = Boolean(query) && !item.textContent?.toLowerCase().includes(query);
      });
    });

    rst.append(breadcrumbs, article);
    content.appendChild(rst);
    contentWrap.appendChild(content);
    shell.append(side, contentWrap);
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
