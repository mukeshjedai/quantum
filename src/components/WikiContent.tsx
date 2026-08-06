"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import "katex/dist/katex.min.css";
import styles from "./WikiContent.module.css";

type WikiContentProps = {
  content: string;
  className?: string;
};

/** Convert `\(...\)` and `\[...\]` delimiters to remark-math `$...$` / `$$...$$`. */
function normalizeMathDelimiters(content: string): string {
  let out = content;
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_, math: string) => `$$${math}$$`);
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_, math: string) => `$${math}$`);
  return out;
}

export default function WikiContent({ content, className }: WikiContentProps) {
  const normalized = normalizeMathDelimiters(content);

  return (
    <div className={`${styles.wikiContent} ${className ?? ""}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeSanitize]}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
