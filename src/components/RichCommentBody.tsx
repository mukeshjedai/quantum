"use client";

import { useEffect, useRef } from "react";
import { loadWikiEmbed } from "@/lib/loadWikiModule";
import styles from "./WikiComments.module.css";

/** Interpret pasted Markdown/math, retaining the editor's explicit inline formatting. */
export function commentMarkdown(html: string): { markdown: string; restore: (html: string) => string } {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tokens: [string, string][] = [];
  const prefix = `COMMENT${crypto.randomUUID().replaceAll("-", "")}TOKEN`;
  function token(value: string) {
    const key = `${prefix}${tokens.length}END`;
    tokens.push([key, value]); return key;
  }
  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (!(node instanceof Element)) return "";
    const tag = node.tagName.toLowerCase();
    if (["script", "style", "iframe", "object"].includes(tag)) return "";
    const body = Array.from(node.childNodes).map(walk).join("");
    if (tag === "br") return "\n";
    if (tag === "pre") return `\n\n${"`".repeat(Math.max(3, ...(node.textContent?.match(/`+/g) || []).map(x => x.length + 1)))}\n${node.textContent}\n${"`".repeat(Math.max(3, ...(node.textContent?.match(/`+/g) || []).map(x => x.length + 1)))}\n\n`;
    if (tag === "li") return `\n${node.parentElement?.tagName === "OL" ? "1." : "-"} ${body.trim()}\n`;
    if (tag === "ul" || tag === "ol") return `\n${body}\n`;
    const safe = doc.createElement(["b", "strong", "i", "em", "u", "s", "code"].includes(tag) ? tag : "span");
    // Copy only explicit text formatting, never event handlers, links or arbitrary CSS.
    const source = node as HTMLElement;
    for (const key of ["color", "font-weight", "font-style", "text-decoration", "text-decoration-line"]) {
      const value = source.style?.getPropertyValue(key);
      if (value) safe.style.setProperty(key, value);
    }
    const formatted = safe.tagName !== "SPAN" || safe.hasAttribute("style");
    const result = formatted ? token(safe.outerHTML.replace(/<\/[^>]+>$/, "")) + body + token(`</${safe.tagName.toLowerCase()}>`) : body;
    return ["div", "p", "blockquote"].includes(tag) ? `\n${result}\n` : result;
  }
  return { markdown: Array.from(doc.body.childNodes).map(walk).join(""), restore: value => tokens.reduce((result, [key, markup]) => result.replaceAll(key, markup), value) };
}

export default function RichCommentBody({ html }: { html: string }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    if (!document.querySelector('link[data-comment-math]')) {
      const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"; css.dataset.commentMath = "true"; document.head.appendChild(css);
    }
    const source = commentMarkdown(html);
    loadWikiEmbed().then(module => module.renderWikiMarkdown(source.markdown)).then(rendered => {
      if (!cancelled && root.current) root.current.innerHTML = source.restore(rendered);
    }).catch(() => { if (!cancelled && root.current) root.current.textContent = new DOMParser().parseFromString(html, "text/html").body.textContent; });
    return () => { cancelled = true; };
  }, [html]);
  return <div ref={root} className={styles.richBody} />;
}
