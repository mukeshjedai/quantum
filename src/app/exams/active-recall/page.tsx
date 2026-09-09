"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { recallApi } from "./api";
import styles from "./Recall.module.css";

type Summary = { id: string; title: string; prompt_count: number; attempt_count: number; next_review: string | null };

export default function ActiveRecallPage() {
  const [sessions, setSessions] = useState<Summary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { recallApi<{ sessions: Summary[] }>().then(data => setSessions(data.sessions)).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  return <main className={styles.page}>
    <Link href="/exams">← Exams</Link>
    <header className={styles.header}><div><h1>Active recall</h1><p>Retrieve it. Check it. Correct it. Recall it again.</p></div><Link href="/exams/active-recall/new">+ New active recall</Link></header>
    <p className={styles.hint}>Create a session with your own notes or code, or choose “Active recall from this page” on a wiki page. Your sessions and attempts are saved to your account.</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {loading ? <p>Loading sessions…</p> : !error && !sessions.length ? <p>No recall sessions yet. Start with one small topic.</p> : null}
    <div className={styles.grid}>{sessions.map(session => <Link key={session.id} href={`/exams/active-recall/${session.id}`} className={styles.card}>
      <h2>{session.title}</h2><p>{session.prompt_count} prompts · {session.attempt_count} saved rounds</p>
      {session.next_review ? <p className={Date.parse(session.next_review) <= Date.now() ? styles.due : styles.hint}>{Date.parse(session.next_review) <= Date.now() ? "Ready to review" : `Review ${new Date(session.next_review).toLocaleString()}`}</p> : <p>Start your first round →</p>}
    </Link>)}</div>
  </main>;
}
