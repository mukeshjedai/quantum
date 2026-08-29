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
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
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
      if (data.note?.id) setSelectedNoteId(data.note.id);
      setTitle("");
      setBody("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save note.");
    } finally {
      setBusy(false);
    }
  };

  const orderedNotes = [...notes].reverse();
  const selectedNote = notes.find((note) => note.id === selectedNoteId) || null;

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
          <div className={styles.listStatus}>{notes.length} {notes.length === 1 ? "entry" : "entries"} returned</div>
          {notes.length ? <div className={styles.tableWrap}>
            <table className={styles.notesTable}>
              <thead><tr><th>Note title</th><th>Author</th><th>Created</th></tr></thead>
              <tbody>{orderedNotes.map((note) => {
                const isSelected = selectedNoteId === note.id;
                return <tr className={isSelected ? styles.selectedRow : ""} key={note.id}>
                  <td><button type="button" className={styles.rowButton} onClick={() => setSelectedNoteId(isSelected ? null : note.id)} aria-pressed={isSelected}>{note.title}</button></td>
                  <td>{note.author_name || "Anonymous"}</td>
                  <td>{note.created_at ? new Date(note.created_at).toLocaleDateString() : "—"}</td>
                </tr>;
              })}</tbody>
            </table>
          </div> : <p className={styles.empty}>No notes yet.</p>}
          {selectedNote ? <article className={styles.noteDetails}>
            <div className={styles.detailHeader}>
              <h3>{selectedNote.title}</h3>
              <button type="button" onClick={() => setSelectedNoteId(null)} aria-label="Close selected note">×</button>
            </div>
            <WikiContent content={selectedNote.body} pageType="manual" className={styles.noteBody} />
            <small>{selectedNote.author_name || "Anonymous"}{selectedNote.created_at ? ` · ${new Date(selectedNote.created_at).toLocaleString()}` : ""}</small>
          </article> : null}
        </div>
      </aside>
    </>
  );
}
