"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./WikiPageTags.module.css";
import { parseApiError } from "@/lib/api";

type WikiPageTagsProps = {
  pageId: string;
  initialTags: string[];
};

function normalizeInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function tagFilterHref(tag: string): string {
  return `/wiki?tag=${encodeURIComponent(tag)}`;
}

export default function WikiPageTags({ pageId, initialTags }: WikiPageTagsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const persist = useCallback(
    async (next: string[], rollback?: string[]) => {
      setBusy(true);
      setErr("");
      try {
        const res = await fetch(`/api/wiki/pages/${pageId}/tags`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: next }),
        });
        if (!res.ok) throw new Error(parseApiError(await res.text()));
        const data = await res.json();
        setTags(data.tags || next);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not save tags.");
        if (rollback !== undefined) setTags(rollback);
      } finally {
        setBusy(false);
      }
    },
    [pageId],
  );

  useEffect(() => {
    const normalized = normalizeInput(draft);
    if (!normalized) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }
    const t = window.setTimeout(() => {
      void fetch(`/api/wiki/tags?q=${encodeURIComponent(normalized)}&limit=8`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { tags?: string[] } | null) => {
          const items = (data?.tags || []).filter((tag) => !tags.includes(tag));
          setSuggestions(items);
          setSuggestOpen(items.length > 0);
          setActiveIdx(-1);
        })
        .catch(() => {
          setSuggestions([]);
          setSuggestOpen(false);
        });
    }, 180);
    return () => window.clearTimeout(t);
  }, [draft, tags]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const applyDraft = async (value: string) => {
    const tag = normalizeInput(value);
    if (!tag) return;
    if (tags.includes(tag)) {
      setDraft("");
      setSuggestOpen(false);
      return;
    }
    if (tags.length >= 32) {
      setErr("Maximum 32 tags per page.");
      return;
    }
    const rollback = tags;
    const next = [...tags, tag];
    setTags(next);
    setDraft("");
    setSuggestOpen(false);
    await persist(next, rollback);
  };

  const addTag = async () => {
    await applyDraft(draft);
  };

  const removeTag = async (tag: string) => {
    const rollback = tags;
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    await persist(next, rollback);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (!suggestOpen || !suggestions.length) return;
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      if (!suggestOpen || !suggestions.length) return;
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        void applyDraft(suggestions[activeIdx]);
      } else {
        void addTag();
      }
      return;
    }
    if (e.key === "Escape") {
      setSuggestOpen(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <span className={styles.label}>Tags</span>
        <div className={styles.tags}>
          {tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              <Link href={tagFilterHref(tag)} className={styles.tagLink} title={`Show all pages tagged “${tag}”`}>
                {tag}
              </Link>
              <button
                type="button"
                className={styles.remove}
                onClick={() => removeTag(tag)}
                disabled={busy}
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
          {tags.length === 0 ? <span className={styles.empty}>No tags yet</span> : null}
        </div>
      </div>
      <div className={styles.addRow} ref={rootRef}>
        <div className={styles.inputWrap}>
          <input
            type="text"
            className={styles.input}
            placeholder="Add tag…"
            value={draft}
            disabled={busy}
            maxLength={48}
            onChange={(e) => {
              setDraft(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => {
              if (suggestions.length) setSuggestOpen(true);
            }}
            onKeyDown={onInputKeyDown}
            aria-autocomplete="list"
            aria-expanded={suggestOpen}
            aria-controls="wiki-tag-suggestions"
          />
          {suggestOpen && suggestions.length ? (
            <ul id="wiki-tag-suggestions" className={styles.suggestList} role="listbox">
              {suggestions.map((tag, idx) => (
                <li key={tag} role="option" aria-selected={idx === activeIdx}>
                  <button
                    type="button"
                    className={`${styles.suggestItem} ${idx === activeIdx ? styles.suggestItemActive : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void applyDraft(tag)}
                  >
                    {tag}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button type="button" className={styles.addBtn} onClick={() => void addTag()} disabled={busy}>
          Add
        </button>
      </div>
      {err ? <p className={styles.err}>{err}</p> : null}
    </div>
  );
}
