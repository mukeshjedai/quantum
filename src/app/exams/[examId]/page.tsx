"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { parseApiError } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import styles from "./ExamAttempt.module.css";

type Question = { id: string; question: string; options: string[] };
type Answer = { answer: string; correct: boolean; correct_answer: string };
type Exam = { id: string; title: string; question_count: number; questions: Question[]; status: { answers: Record<string, Answer>; current_index: number }; correct_count: number; incorrect_count: number; answered_count: number; completed: boolean };

export default function ExamAttemptPage() {
  const { examId } = useParams<{ examId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [exam, setExam] = useState<Exam | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const load = useCallback(async () => {
    if (authLoading || !user?.email) return;
    const response = await fetch(`/api/exams/${examId}?user_email=${encodeURIComponent(user.email)}`);
    if (!response.ok) throw new Error(parseApiError(await response.text()));
    const data = await response.json();
    setExam(data.exam); setIndex(Math.min(data.exam.status?.current_index || 0, Math.max(0, data.exam.question_count - 1)));
  }, [authLoading, examId, user?.email]);
  useEffect(() => { void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load exam.")); }, [load]);

  const submitAnswer = async (answer: string) => {
    if (!exam || !user?.email) return;
    const question = exam.questions[index];
    if (exam.status.answers[question.id]) return;
    setBusy(true); setError(""); setSaved("");
    try {
      const response = await fetch(`/api/exams/${exam.id}/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question_id: question.id, answer, user_email: user.email, user_name: user.name || "" }) });
      if (!response.ok) throw new Error(parseApiError(await response.text()));
      const data = await response.json();
      setExam((current) => current ? { ...current, ...data.summary, status: { ...current.status, answers: { ...current.status.answers, [question.id]: data.result }, current_index: Math.min(index + 1, current.question_count - 1) } } : current);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not submit answer."); }
    finally { setBusy(false); }
  };

  const saveProgress = async () => {
    if (!exam || !user?.email) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/exams/${exam.id}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_email: user.email, user_name: user.name || "", current_index: index }) });
      if (!response.ok) throw new Error(parseApiError(await response.text()));
      setSaved("Progress saved"); window.setTimeout(() => setSaved(""), 2000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save progress."); }
    finally { setBusy(false); }
  };

  if (error && !exam) return <main className={styles.page}><Link href="/exams">← Exams</Link><p className={styles.error}>{error}</p></main>;
  if (!exam) return <main className={styles.page}><p>Loading exam…</p></main>;
  const question = exam.questions[index];
  const result = exam.status.answers[question.id];
  return <main className={styles.page}>
    <div className={styles.top}><div><Link href="/exams">← All exams</Link><h1>{exam.title}</h1></div><div><button className={styles.save} type="button" onClick={saveProgress} disabled={busy}>Save progress</button>{saved ? <div className={styles.saved}>{saved}</div> : null}</div></div>
    <div className={styles.overview}><span>{exam.question_count} questions</span><span>{exam.answered_count} attempted</span><span>{exam.correct_count} correct</span><span>{exam.incorrect_count} incorrect</span></div>
    {exam.completed ? <section className={styles.result}><h2>Result</h2><strong>{exam.correct_count} / {exam.question_count} correct</strong><p>{Math.round((exam.correct_count / exam.question_count) * 100)}%</p></section> : null}
    <nav className={styles.questionNav} aria-label="Questions">{exam.questions.map((item, questionIndex) => <button type="button" key={item.id} onClick={() => setIndex(questionIndex)} className={`${exam.status.answers[item.id] ? styles.answered : ""} ${questionIndex === index ? styles.current : ""}`.trim()}>{questionIndex + 1}</button>)}</nav>
    <section className={styles.card}>
      <span className={styles.counter}>Question {index + 1} of {exam.question_count}</span><h2 className={styles.question}>{question.question}</h2>
      <div className={styles.options}>{question.options.map((option, optionIndex) => {
        const letter = "ABCD"[optionIndex];
        const optionClass = result ? (result.answer === letter ? (result.correct ? styles.selectedCorrect : styles.selectedIncorrect) : result.correct_answer === letter ? styles.correctAnswer : "") : "";
        return <button type="button" className={`${styles.option} ${optionClass}`} disabled={busy || !!result} onClick={() => submitAnswer(letter)} key={letter}><span className={styles.letter}>{letter}</span><span>{option}</span></button>;
      })}</div>
      {result ? <p className={`${styles.feedback} ${result.correct ? styles.correctFeedback : styles.incorrectFeedback}`}>{result.correct ? "Correct" : `Incorrect — correct answer: ${result.correct_answer}`}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.controls}><button type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>Previous</button><button type="button" disabled={index >= exam.question_count - 1} onClick={() => setIndex((value) => value + 1)}>Next</button></div>
    </section>
  </main>;
}
