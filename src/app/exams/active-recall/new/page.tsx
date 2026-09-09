"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { recallApi, RecallSession } from "../api";
import styles from "../Recall.module.css";

const defaultPrompts = "Meaning: Explain this topic in your own words. What do the key terms or variables mean?\nConnection: Why are these steps needed? What comes before and after, and what would break if a step were removed?\nProduction: Reconstruct the equation, diagram, or code from memory. Dry-run it with simple values.";

export default function NewActiveRecallPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [reference, setReference] = useState("");
  const [prompts, setPrompts] = useState(defaultPrompts);
  const [sourceId, setSourceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const wiki = new URLSearchParams(window.location.search).get("wiki");
    if (!wiki) return;
    let cancelled = false;
    setBusy(true);
    recallApi<{ title: string; reference: string; truncated: boolean }>(`/source/${encodeURIComponent(wiki)}`).then(data => {
      if (cancelled) return;
      setTitle(data.title); setReference(data.reference); setSourceId(wiki);
      setNotice(data.truncated ? "This is the first part of a long page. Keep only the passage you want to practise (up to 100,000 characters)." : "Reference copied from the wiki. Keep a small passage or code block for this session.");
    }).catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, []);
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const data = await recallApi<{ session: RecallSession }>("", { title, reference, prompts: prompts.split("\n").map(p => p.trim()).filter(Boolean), source_page_id: sourceId });
      router.push(`/exams/active-recall/${data.session.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save session."); setBusy(false); }
  }
  return <main className={styles.page}><Link href="/exams/active-recall">← Active recall</Link><h1>New active recall</h1>
    <p>Choose something you can study in 5–10 minutes. The reference will be hidden when you begin recall.</p>
    {notice && <p className={styles.hint}>{notice}</p>}{error && <p role="alert" className={styles.error}>{error}</p>}
    <form className={`${styles.card} ${styles.form}`} onSubmit={create}>
      <label>Topic<input required maxLength={200} value={title} disabled={busy} onChange={e => setTitle(e.target.value)} placeholder="NARMA-10 recurrence or training-loop logic" /></label>
      <label>Reference notes, equation, or code<textarea required rows={12} value={reference} disabled={busy} onChange={e => setReference(e.target.value)} /></label>
      <p className={styles.hint}>{reference.length.toLocaleString()} / 100,000 characters. Paste text directly, or start from a wiki page.</p>
      <label>Recall prompts — one per line<textarea required rows={7} value={prompts} disabled={busy} onChange={e => setPrompts(e.target.value)} /></label>
      <p className={styles.hint}>Start with meaning → connections → production. Add your own questions such as “Why clear gradients?” or “Write the loop without looking.” Maximum 30 prompts.</p>
      <button disabled={busy || !title.trim() || !reference.trim() || reference.length > 100000} type="submit">{busy ? "Preparing…" : "Save and start recall"}</button>
    </form>
  </main>;
}
