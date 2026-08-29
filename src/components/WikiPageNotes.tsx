"use client";

import { FormEvent, useEffect, useState } from "react";
import { parseApiError } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import WikiContent from "./WikiContent";
import styles from "./WikiPageNotes.module.css";

type PageNote = {
  id: string;
  title: string;
  body: string;
  author_name?: string;
  created_at?: string;
};

export default function WikiPageNotes({ pageId }: { pageId: string }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<PageNote[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(`/api/wiki/pages/${pageId}/notes`)
      .then(async (response) => {
        if (!response.ok) throw new Error(parseApiError(await response.text()));
        return response.json();
      })
      .then((data) => setNotes(Array.isArray(data.notes) ? data.notes : []))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load notes."));
  }, [pageId]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/wiki/pages/${pageId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          author_name: user?.name || user?.email || "Anonymous",
          author_email: user?.email || "",
        }),
      });
      if (!response.ok) throw new Error(parseApiError(await response.text()));
      const data = await response.json();
      const savedNotes = Array.isArray(data.notes) ? data.notes : [...notes, data.note];
      setNotes(savedNotes);
      if (data.note?.id) setExpanded((current) => new Set(current).add(data.note.id));
      setTitle("");
      setBody("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save note.");
    } finally {
      setBusy(false);
    }
  };

  const toggleNote = (id: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <>
      <button type="button" className={styles.tab} onClick={() => setIsOpen((value) => !value)} aria-expanded={isOpen}>
        {isOpen ? "Close notes" : `Notes${notes.length ? ` (${notes.length})` : ""}`}
      </button>
      <aside className={`${styles.panel} ${isOpen ? styles.open : ""}`} aria-label="Page notes" aria-hidden={!isOpen}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Page notes</h2>
            <span>{notes.length} {notes.length === 1 ? "note" : "notes"}</span>
          </div>
          <button type="button" className={styles.closeButton} onClick={() => setIsOpen(false)} aria-label="Close notes">×</button>
        </div>
        <form className={styles.form} onSubmit={save}>
          <label>
            Unique title
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="Note title" required />
          </label>
          <label>
            Note
            <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={50000} placeholder="Write a note for this page…" required />
          </label>
          <button type="submit" disabled={busy || !title.trim() || !body.trim()}>{busy ? "Saving…" : "Save note"}</button>
        </form>
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.noteList}>
          {notes.length ? [...notes].reverse().map((note) => {
            const isExpanded = expanded.has(note.id);
            return <article className={styles.note} key={note.id}>
              <button type="button" className={styles.noteTitle} onClick={() => toggleNote(note.id)} aria-expanded={isExpanded}>
                <span>{note.title}</span><span>{isExpanded ? "−" : "+"}</span>
              </button>
              {isExpanded ? <div className={styles.noteDetails}>
                <WikiContent content={note.body} pageType="manual" className={styles.noteBody} />
                <small>{note.author_name || "Anonymous"}{note.created_at ? ` · ${new Date(note.created_at).toLocaleString()}` : ""}</small>
              </div> : null}
            </article>;
          }) : <p className={styles.empty}>No notes yet.</p>}
        </div>
      </aside>
    </>
  );
}
