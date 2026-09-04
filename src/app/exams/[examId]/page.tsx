"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { parseApiError } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import styles from "./ExamAttempt.module.css";

type Question = { id: string; type: "mcq" | "long_answer"; question: string; options: string[]; marks: number; model_answer?: string; marking_criteria?: string[] };
type Answer = { answer: string; correct: boolean; correct_answer?: string; awarded_marks?: number; max_marks?: number; feedback?: string; strengths?: string[]; improvements?: string[] };
type Exam = { id: string; title: string; question_count: number; questions: Question[]; status: { answers: Record<string, Answer>; current_index: number }; correct_count: number; incorrect_count: number; answered_count: number; completed: boolean; total_marks: number; awarded_marks: number; percentage: number };

export default function ExamAttemptPage() {
  const { examId } = useParams<{ examId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [exam, setExam] = useState<Exam | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [draft, setDraft] = useState("");
  const [studyMode, setStudyMode] = useState(true);

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
      setDraft("");
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
    <div className={styles.modeSwitch} role="group" aria-label="Exam mode"><button type="button" className={studyMode ? styles.activeMode : ""} onClick={() => setStudyMode(true)}>Study model answers</button><button type="button" className={!studyMode ? styles.activeMode : ""} onClick={() => setStudyMode(false)}>Attempt exam</button></div>
    <div className={styles.overview}><span>{exam.question_count} questions</span><span>{exam.total_marks} total marks</span><span>{exam.answered_count} attempted</span><span>{exam.awarded_marks} marks awarded</span></div>
    {exam.completed ? <section className={styles.result}><h2>Result</h2><strong>{exam.awarded_marks} / {exam.total_marks} marks</strong><p>{exam.percentage}%</p></section> : null}
    <nav className={styles.questionNav} aria-label="Questions">{exam.questions.map((item, questionIndex) => <button type="button" key={item.id} onClick={() => setIndex(questionIndex)} className={`${exam.status.answers[item.id] ? styles.answered : ""} ${questionIndex === index ? styles.current : ""}`.trim()}>{questionIndex + 1}</button>)}</nav>
    <section className={styles.card}>
      <span className={styles.counter}>Question {index + 1} of {exam.question_count} · {question.marks} {question.marks === 1 ? "mark" : "marks"}</span><h2 className={styles.question}>{question.question}</h2>
      {studyMode ? <section className={styles.modelAnswer}><h3>Model answer</h3><p>{question.model_answer || "For multiple-choice questions, attempt the question to reveal the correct answer."}</p>{question.marking_criteria?.length ? <><h4>Marking criteria</h4><ul>{question.marking_criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul></> : null}</section> : question.type === "long_answer" ? <div className={styles.writtenAnswer}><label htmlFor="written-answer">Your answer</label><textarea id="written-answer" value={result?.answer ?? draft} disabled={busy || !!result} onChange={(event) => setDraft(event.target.value)} rows={10} placeholder={`Write your answer for ${question.marks} marks…`} /><button type="button" disabled={busy || !!result || !draft.trim()} onClick={() => submitAnswer(draft)}>{busy ? "AI is marking…" : "Submit for AI marking"}</button></div> : <div className={styles.options}>{question.options.map((option, optionIndex) => {
        const letter = "ABCD"[optionIndex];
        const optionClass = result ? (result.answer === letter ? (result.correct ? styles.selectedCorrect : styles.selectedIncorrect) : result.correct_answer === letter ? styles.correctAnswer : "") : "";
        return <button type="button" className={`${styles.option} ${optionClass}`} disabled={busy || !!result} onClick={() => submitAnswer(letter)} key={letter}><span className={styles.letter}>{letter}</span><span>{option}</span></button>;
      })}</div>}
      {result ? <section className={`${styles.feedback} ${result.correct ? styles.correctFeedback : styles.incorrectFeedback}`}><strong>{question.type === "long_answer" ? `${result.awarded_marks} / ${result.max_marks} marks` : result.correct ? "Correct" : `Incorrect — correct answer: ${result.correct_answer}`}</strong>{result.feedback ? <p>{result.feedback}</p> : null}{result.strengths?.length ? <><h4>Strengths</h4><ul>{result.strengths.map((value) => <li key={value}>{value}</li>)}</ul></> : null}{result.improvements?.length ? <><h4>How to improve</h4><ul>{result.improvements.map((value) => <li key={value}>{value}</li>)}</ul></> : null}{question.type === "long_answer" ? <details><summary>Compare with model answer</summary><p>{question.model_answer}</p></details> : null}</section> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.controls}><button type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>Previous</button><button type="button" disabled={index >= exam.question_count - 1} onClick={() => setIndex((value) => value + 1)}>Next</button></div>
    </section>
  </main>;
}
