"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./WikiSearch.module.css";
import type { WikiListItem } from "@/lib/types";

function pageTypeLabel(pageType?: string, videoId?: string) {
  if (pageType === "post_notes") return "Post notes";
  if (pageType === "manual") return "Paste notes";
  if (pageType === "html_app") return "Interactive HTML";
  if (pageType === "html") return "HTML page";
  if (videoId) return `Video: ${videoId}`;
  return "Wiki page";
}

export default function WikiSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<WikiListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const fetchSuggestions = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "10" });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/wiki/list?${params}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => fetchSuggestions(query), query.trim() ? 220 : 0);
    return () => window.clearTimeout(t);
  }, [open, query, fetchSuggestions]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    setActiveIdx(-1);
  }, [items, query]);

  const goTo = (id: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/wiki/${id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, items.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && items[activeIdx]) {
        goTo(items[activeIdx].id);
      } else if (query.trim()) {
        setOpen(false);
        router.push(`/wiki?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((v) => !v);
          window.setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        Search wiki
      </button>
      {open ? (
        <div className={styles.popover} role="dialog" aria-label="Search wiki pages">
          <input
            ref={inputRef}
            type="search"
            className={styles.input}
            placeholder="Search by title, terms, video id…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            aria-autocomplete="list"
            aria-controls="wiki-search-list"
          />
          <div className={styles.hint}>
            {loading
              ? "Searching…"
              : query.trim()
                ? `${items.length} suggestion${items.length === 1 ? "" : "s"}`
                : "Suggested pages"}
          </div>
          <ul id="wiki-search-list" className={styles.list} role="listbox">
            {items.map((item, idx) => (
              <li key={item.id} role="option" aria-selected={idx === activeIdx}>
                <button
                  type="button"
                  className={`${styles.item} ${idx === activeIdx ? styles.itemActive : ""}`}
                  onClick={() => goTo(item.id)}
                >
                  <span className={styles.itemTitle}>{item.title || "Untitled"}</span>
                  <span className={styles.itemMeta}>
                    {pageTypeLabel(item.page_type, item.video_id)}
                    {item.created_at ? ` · ${item.created_at.slice(0, 10)}` : ""}
                  </span>
                  {item.summary ? (
                    <span className={styles.itemSummary}>{item.summary}</span>
                  ) : null}
                  {item.tags?.length ? (
                    <span className={styles.itemTags}>{item.tags.join(" · ")}</span>
                  ) : null}
                </button>
              </li>
            ))}
            {!loading && !items.length ? (
              <li className={styles.empty}>No pages found.</li>
            ) : null}
          </ul>
          <div className={styles.footer}>
            <Link href={`/wiki?q=${encodeURIComponent(query.trim())}`} onClick={() => setOpen(false)}>
              View all results
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
