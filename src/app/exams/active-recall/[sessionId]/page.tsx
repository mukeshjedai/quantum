"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { recallApi, RecallAttempt, RecallSession } from "../api";
import styles from "../Recall.module.css";

type Stage = "study" | "recall" | "compare" | "saved";

export default function RecallSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<RecallSession | null>(null);
  const [attempts, setAttempts] = useState<RecallAttempt[]>([]);
  const [responses, setResponses] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>("study");
  const [corrections, setCorrections] = useState("");
  const [rating, setRating] = useState("again");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    recallApi<{ session: RecallSession; attempts: RecallAttempt[] }>(`/${sessionId}`).then(data => {
      if (cancelled) return;
      setSession(data.session); setAttempts(data.attempts); setResponses(data.session.prompts.map(() => ""));
      setStage(data.attempts.length ? "recall" : "study"); setStartedAt(Date.now());
    }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [sessionId]);
  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  const hasResponse = responses.some(response => response.trim());
  useEffect(() => {
    if (!hasResponse || stage === "saved") return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasResponse, stage]);

  function startRecall() {
    setResponses(session!.prompts.map(() => "")); setCorrections(""); setRating("again");
    setError(""); setStage("recall"); setStartedAt(Date.now()); setElapsed(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function saveRound() {
    setBusy(true); setError("");
    try {
      const data = await recallApi<{ attempt: RecallAttempt }>(`/${sessionId}/attempts`, { responses, corrections, rating });
      setAttempts(current => [data.attempt, ...current]); setStage("saved");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save this round."); }
    finally { setBusy(false); }
  }

  if (!session) return <main className={styles.page}><Link href="/exams/active-recall">← Active recall</Link><p role={error ? "alert" : "status"}>{error || "Loading session…"}</p></main>;
  return <main className={styles.page}>
    <Link href="/exams/active-recall" onClick={event => { if (hasResponse && stage !== "saved" && !window.confirm("Leave without saving this recall round?")) event.preventDefault(); }}>← Active recall</Link>
    <h1>{session.title}</h1>
    <ol className={styles.steps}>{(["study", "recall", "compare", "saved"] as Stage[]).map((item, i) => <li key={item} aria-current={stage === item ? "step" : undefined}>{i + 1}. {({ study: "Study", recall: "Recall without notes", compare: "Compare & correct", saved: "Review & retry" })[item]}</li>)}</ol>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {stage === "study" && <section className={styles.card}>
      <h2>Study a small chunk</h2><p>Read for 5–10 minutes. Focus on the meaning and sequence before the exact wording.</p>
      <p className={styles.hint}>Study time: {Math.floor(elapsed / 60)}m {elapsed % 60}s</p>
      <pre className={styles.reference}>{session.reference}</pre>
      <button type="button" onClick={startRecall}>Hide reference and start recall</button>
    </section>}
    {stage === "recall" && <section className={`${styles.card} ${styles.form}`}>
      <h2>Retrieve it without looking</h2><p>The reference is hidden. Explain, write code, or reconstruct the equation from memory. Try for 10–20 seconds before checking; incomplete answers are useful.</p>
      <p className={styles.hint}>Recall time: {Math.floor(elapsed / 60)}m {elapsed % 60}s. You can start with a 30-second explanation, then reconstruct the details.</p>
      {session.prompts.map((prompt, i) => <label key={i}>{i + 1}. {prompt}<textarea rows={6} maxLength={20000} value={responses[i] || ""} onChange={event => setResponses(current => current.map((value, index) => index === i ? event.target.value : value))} placeholder="Write what you remember, or write ‘I couldn't recall this’ after trying." /></label>)}
      <button type="button" disabled={!hasResponse} onClick={() => setStage("compare")}>Check against reference</button>
      <p className={styles.hint}>Write at least one response before revealing the reference.</p>
    </section>}
    {stage === "compare" && <>
      <section className={styles.card}><h2>Compare with the original</h2><p>Your original answers are kept unchanged. Identify the missing or incorrect parts below.</p>
        {session.prompts.map((prompt, i) => <div key={i}><h3>{prompt}</h3><pre className={styles.reference}>{responses[i] || "No response"}</pre></div>)}
        <h3>Reference</h3><pre className={styles.reference}>{session.reference}</pre>
        {session.source_page_id && <Link href={`/wiki/${session.source_page_id}`} target="_blank" rel="noopener noreferrer">Open source wiki page ↗</Link>}
      </section>
      <section className={`${styles.card} ${styles.form}`}><h2>Correct only what you missed</h2>
        <label>Corrections and missing steps<textarea rows={5} maxLength={20000} value={corrections} onChange={e => setCorrections(e.target.value)} placeholder="For example: zero_grad clears accumulated gradients; backward calculates gradients, step updates parameters." /></label>
        <label>How much did you recall?<select value={rating} onChange={e => setRating(e.target.value)}><option value="again">Need another try — review in 15 minutes</option><option value="partial">Partly remembered — review tomorrow</option><option value="remembered">Remembered confidently — review in 3 days</option></select></label>
        <p className={styles.hint}>This is your self-assessment, not an AI score. Review times are suggestions shown in Active recall; no notification is sent.</p>
        <button type="button" onClick={saveRound} disabled={busy}>{busy ? "Saving…" : "Save this round"}</button>
      </section>
    </>}
    {stage === "saved" && <section className={styles.card}>
      <h2>Round saved</h2><p role="status">Suggested next review: {new Date(attempts[0].next_review).toLocaleString()}.</p>
      <p>Hide the corrections and reproduce it again. If you need another try, returning in 10–20 minutes can help you test retrieval.</p>
      <div className={styles.actions}><button type="button" onClick={startRecall}>Hide answers and retry now</button><Link href="/exams/active-recall">Back to sessions</Link></div>
      <details className={styles.card}><summary>Previous rounds ({attempts.length})</summary>{attempts.map(attempt => <section key={attempt.id}><h3>{new Date(attempt.created_at).toLocaleString()} · {attempt.rating}</h3>{attempt.responses.map((response, i) => <div key={i}><strong>{session.prompts[i]}</strong><pre className={styles.reference}>{response || "No response"}</pre></div>)}<p>Corrections</p><pre className={styles.reference}>{attempt.corrections || "None recorded"}</pre></section>)}</details>
    </section>}
  </main>;
}
