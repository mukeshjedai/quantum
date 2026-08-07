"use client";

import { useCallback, useState } from "react";
import styles from "./WikiPageTags.module.css";
import { parseApiError } from "@/lib/api";

type WikiPageTagsProps = {
  pageId: string;
  initialTags: string[];
};

function normalizeInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function WikiPageTags({ pageId, initialTags }: WikiPageTagsProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [draft, setDraft] = useState("");
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

  const addTag = async () => {
    const tag = normalizeInput(draft);
    if (!tag) return;
    if (tags.includes(tag)) {
      setDraft("");
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
    await persist(next, rollback);
  };

  const removeTag = async (tag: string) => {
    const rollback = tags;
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    await persist(next, rollback);
  };

  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <span className={styles.label}>Tags</span>
        <div className={styles.tags}>
          {tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
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
      <div className={styles.addRow}>
        <input
          type="text"
          className={styles.input}
          placeholder="Add tag…"
          value={draft}
          disabled={busy}
          maxLength={48}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addTag();
            }
          }}
        />
        <button type="button" className={styles.addBtn} onClick={() => void addTag()} disabled={busy}>
          Add
        </button>
      </div>
      {err ? <p className={styles.err}>{err}</p> : null}
    </div>
  );
}
