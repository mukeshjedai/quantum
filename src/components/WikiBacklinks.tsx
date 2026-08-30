"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseApiError } from "@/lib/api";
import type { WikiListItem } from "@/lib/types";
import styles from "./WikiBacklinks.module.css";

export type WikiBacklink = { id?: string; source_page_id: string; source_title?: string; keyword?: string; created_at?: string };

export default function WikiBacklinks({ pageId, initialBacklinks = [], canCreate = false }: { pageId: string; initialBacklinks?: WikiBacklink[]; canCreate?: boolean }) {
  const [selection, setSelection] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WikiListItem[]>([]);
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canCreate) return;
    const remember = () => {
      const text = window.getSelection()?.toString().trim() || "";
      if (text && text.length <= 2000) setSelection(text);
    };
    document.addEventListener("mouseup", remember);
    document.addEventListener("keyup", remember);
    return () => { document.removeEventListener("mouseup", remember); document.removeEventListener("keyup", remember); };
  }, [canCreate]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/wiki/list?q=${encodeURIComponent(query)}&limit=20`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not search wiki pages")))
        .then((data) => setResults((Array.isArray(data.items) ? data.items : []).filter((item: WikiListItem) => item.id !== pageId && !["exam", "flashcard_deck"].includes(String(item.page_type)))))
        .catch((reason) => { if (reason?.name !== "AbortError") setError(reason instanceof Error ? reason.message : "Search failed"); });
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, pageId, query]);

  const save = async () => {
    if (!selection || !targetId) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/wiki/link-existing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source_page_id: pageId, target_page_id: targetId, selected_text: selection }) });
      if (!response.ok) throw new Error(parseApiError(await response.text()));
      window.location.reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create keyword link."); setBusy(false); }
  };

  return <section className={styles.root} aria-label="Wiki backlinks">
    <div className={styles.toolbar}>
      {canCreate ? <button type="button" className={styles.linkButton} disabled={!selection} onClick={() => { setOpen(true); setQuery(selection); setTargetId(""); setError(""); }}>🔗 Link keyword</button> : null}
      {canCreate ? <span className={styles.selection}>{selection ? `Selected: “${selection}”` : "Select a keyword in the page content first"}</span> : null}
    </div>
    {initialBacklinks.length ? <details className={styles.backlinks}><summary>Backlinks ({initialBacklinks.length})</summary><ul>{initialBacklinks.map((item, index) => <li key={item.id || `${item.source_page_id}-${index}`}><Link href={`/wiki/${item.source_page_id}`}>{item.source_title || "Source page"}</Link>{item.keyword ? <span className={styles.keyword}> — “{item.keyword}”</span> : null}</li>)}</ul></details> : null}
    {open ? <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}><div className={styles.modal} role="dialog" aria-modal="true" aria-label="Link keyword to wiki page">
      <h2>Link keyword to another page</h2><p className={styles.chosenKeyword}><strong>Keyword:</strong> {selection}</p>
      <label>Find destination page<input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search wiki pages…" /></label>
      <ul className={styles.results}>{results.map((item) => <li key={item.id}><button type="button" className={targetId === item.id ? styles.selected : ""} onClick={() => setTargetId(item.id)}>{item.title || "Untitled"}</button></li>)}</ul>
      {error ? <p className={styles.error}>{error}</p> : null}<div className={styles.actions}><button type="button" onClick={() => setOpen(false)} disabled={busy}>Cancel</button><button type="button" onClick={save} disabled={busy || !targetId}>{busy ? "Linking…" : "Create link and backlink"}</button></div>
    </div></div> : null}
  </section>;
}
