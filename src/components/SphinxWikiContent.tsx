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
    root.append(theme, shell);
  }, [html, title]);

  return (
    <div
      ref={hostRef}
      className={preview ? "sphinx-host" : "card sphinx-host"}
      aria-label="Sphinx documentation content"
    />
  );
}
