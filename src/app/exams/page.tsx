"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { parseApiError } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import styles from "./Exams.module.css";

type ExamSummary = {
  id: string; title: string; question_count: number; answered_count: number;
  correct_count: number; incorrect_count: number; completed: boolean;
};

export default function ExamsPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const query = user?.email ? `?user_email=${encodeURIComponent(user.email)}` : "";
    const response = await fetch(`/api/exams${query}`);
    if (!response.ok) throw new Error(parseApiError(await response.text()));
    const data = await response.json();
    setExams(Array.isArray(data.exams) ? data.exams : []);
  }, [user?.email]);

  useEffect(() => { void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load exams.")); }, [load]);

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const parsed = JSON.parse(await file.text());
      const questions = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(questions) || !questions.length) throw new Error("JSON must contain a non-empty questions array.");
      const examTitle = title.trim() || (!Array.isArray(parsed) && String(parsed.title || "").trim()) || file.name.replace(/\.json$/i, "");
      const response = await fetch("/api/exams", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: examTitle, questions, source_filename: file.name }),
      });
      if (!response.ok) throw new Error(parseApiError(await response.text()));
      const data = await response.json();
      setExams((current) => [data.exam, ...current]);
      setTitle(""); setFile(null); setMessage(`Created “${data.exam.title}” with ${data.exam.question_count} questions.`);
      const input = document.getElementById("exam-json-file") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create exam.");
    } finally { setBusy(false); }
  };

  return <main className={styles.page}>
    <div className={styles.header}><div><h1>Exams</h1><p className="muted">Create exams from JSON, attempt questions, and resume saved progress.</p></div></div>
    <form className={styles.upload} onSubmit={upload}>
      <h2>Create an exam</h2>
      <div className={styles.uploadRow}>
        <label>Exam title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Uses JSON title or filename if blank" maxLength={200} /></label>
        <label>Questions JSON<input id="exam-json-file" type="file" accept="application/json,.json" required onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
        <button type="submit" disabled={busy || !file}>{busy ? "Creating…" : "Upload and create"}</button>
      </div>
      <p className={styles.hint}>Each question needs <code>question</code>, four <code>options</code>, and <code>correct_answer</code> set to A, B, C, or D. A/B/C/D option columns are also accepted.</p>
      {error ? <p className={styles.error}>{error}</p> : null}{message ? <p className={styles.success}>{message}</p> : null}
    </form>
    {exams.length ? <section className={styles.grid} aria-label="Available exams">{exams.map((exam) => {
      const progress = exam.question_count ? Math.round((exam.answered_count / exam.question_count) * 100) : 0;
      return <Link className={styles.exam} href={`/exams/${exam.id}`} key={exam.id}>
        <h2>{exam.title}</h2><div className={styles.stats}><span>{exam.question_count} questions</span><span>{exam.answered_count} attempted</span>{exam.answered_count ? <span>{exam.correct_count} correct</span> : null}{exam.completed ? <strong>Completed</strong> : null}</div>
        <div className={styles.progress} aria-label={`${progress}% complete`}><span style={{ width: `${progress}%` }} /></div>
      </Link>;
    })}</section> : <p className={styles.empty}>No exams yet. Upload a JSON question file to create one.</p>}
  </main>;
}
