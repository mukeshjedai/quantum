"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { recallApi, RecallSession } from "../api";
import styles from "../Recall.module.css";

type Question = { question: string; answer: string };

export default function NewActiveRecallPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [reference, setReference] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [count, setCount] = useState(7);
  const [generatedReference, setGeneratedReference] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
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
      const data = await recallApi<{ session: RecallSession }>("", { title, reference, prompts: questions.map(q => q.question), answer_keys: questions.map(q => q.answer), source_page_id: sourceId });
      router.push(`/exams/active-recall/${data.session.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save session."); setBusy(false); }
  }
  async function generate() {
    setGenerating(true); setBusy(true); setError("");
    try {
      const data = await recallApi<{ questions: Question[] }>("/generate", { reference, count });
      setQuestions(data.questions); setGeneratedReference(reference);
      setNotice(`Generated ${data.questions.length} questions. Review or edit them before starting. Answer keys stay hidden until comparison.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not generate questions."); }
    finally { setGenerating(false); setBusy(false); }
  }
  const stale = generatedReference !== null && generatedReference !== reference;
  function editQuestion(index: number, key: keyof Question, value: string) {
    setQuestions(current => current.map((q, i) => i === index ? { ...q, [key]: value } : q));
  }
  return <main className={styles.page}><Link href="/exams/active-recall">← Active recall</Link><h1>New active recall</h1>
    <p>Choose something you can study in 5–10 minutes. The reference will be hidden when you begin recall.</p>
    {notice && <p className={styles.hint}>{notice}</p>}{error && <p role="alert" className={styles.error}>{error}</p>}
    <form className={`${styles.card} ${styles.form}`} onSubmit={create}>
      <label>Topic<input required maxLength={200} value={title} disabled={busy} onChange={e => setTitle(e.target.value)} placeholder="NARMA-10 recurrence or training-loop logic" /></label>
      <label>Reference notes, equation, or code<textarea required rows={12} value={reference} disabled={busy} onChange={e => setReference(e.target.value)} /></label>
      <p className={styles.hint}>{reference.length.toLocaleString()} / 100,000 characters. Paste text directly, or start from a wiki page.</p>
      <label>Number of AI questions<select value={count} disabled={busy} onChange={e => setCount(Number(e.target.value))}>{[3,5,7,10,12].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      <button type="button" disabled={busy || reference.trim().length < 30 || reference.length > 30000} onClick={generate}>{generating ? "Writing your question paper…" : questions.length ? "Regenerate recall questions" : "Generate recall questions"}</button>
      <p className={styles.hint}>AI generation sends this passage to OpenAI and supports 30–30,000 characters. It creates questions about meaning, relationships, prediction and reconstruction. Short passages may produce fewer questions. Regenerating replaces the current question draft.</p>
      {stale && <p role="alert" className={styles.error}>The reference changed after generation. Regenerate the questions or <button type="button" disabled={busy} onClick={() => setGeneratedReference(reference)}>confirm I reviewed the questions and keys against the updated reference</button>.</p>}
      {questions.map((q,i) => <section key={i} className={styles.card}>
        <label>Question {i+1}<textarea aria-label={`Question ${i+1}`} required rows={4} maxLength={1000} disabled={busy} value={q.question} onChange={e => editQuestion(i,"question",e.target.value)} /></label>
        <details><summary>Review or edit answer key {i+1}</summary><label>Answer key {i+1}<textarea aria-label={`Answer key ${i+1}`} rows={5} maxLength={8000} disabled={busy} value={q.answer} onChange={e => editQuestion(i,"answer",e.target.value)} /></label></details>
        <button type="button" disabled={busy} onClick={() => setQuestions(current => current.filter((_,index) => index !== i))}>Remove question {i+1}</button>
      </section>)}
      <button type="button" disabled={busy || questions.length >= 30} onClick={() => setQuestions(current => [...current,{question:"",answer:""}])}>+ Add a question manually</button>
      <p className={styles.hint}>AI answers can be mistaken. Review the keys for accuracy. Manual questions can use the reference without a separate key.</p>
      <button disabled={busy || stale || !questions.length || questions.some(q => !q.question.trim()) || !title.trim() || !reference.trim() || reference.length > 100000} type="submit">{busy && !generating ? "Preparing…" : "Save and start recall"}</button>
    </form>
  </main>;
}
