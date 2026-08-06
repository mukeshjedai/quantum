"use client";

import { useEffect, useState } from "react";
import styles from "./TranslatorForm.module.css";
import { parseApiError } from "@/lib/api";
import type { JobStatus } from "@/lib/types";

const STAGE_LABEL: Record<string, string> = {
  queued: "Queued",
  start: "Starting",
  download: "Downloading video",
  transcribe: "Reading captions or running speech recognition",
  translate: "Translating (long videos = many minutes)",
  tts: "Synthesizing dubbed audio",
  mux: "Combining video and audio",
  complete: "Complete",
};

export default function TranslatorForm() {
  const [url, setUrl] = useState("");
  const [lang, setLang] = useState("hi");
  const [voice, setVoice] = useState("");
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState("");
  const [isErr, setIsErr] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!jobId || done) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const s = (await res.json()) as JobStatus;
        const overall = (s.progress || 0) * 100;
        const phase = (s.phase_progress || 0) * 100;
        setProgress(overall);
        setPhaseProgress(phase);
        setStatus(STAGE_LABEL[s.stage || ""] || s.stage || "…");
        setDetail(s.detail || "");
        setIsErr(false);

        if (s.status === "done") {
          setDone(true);
          setProgress(100);
          setStatus("Complete.");
          setBusy(false);
          clearInterval(timer);
        }
        if (s.status === "error") {
          setIsErr(true);
          setStatus(s.error || "Error");
          setBusy(false);
          clearInterval(timer);
        }
      } catch {
        /* keep polling */
      }
    }, 250);
    return () => clearInterval(timer);
  }, [jobId, done]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setDone(false);
    setJobId(null);
    setProgress(0);
    setPhaseProgress(0);
    setStatus("Starting job…");
    setDetail("");
    setIsErr(false);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          lang,
          source_lang: "auto",
          voice: voice.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(parseApiError(await res.text()));
      const { job_id } = (await res.json()) as { job_id: string };
      setJobId(job_id);
    } catch (err) {
      setIsErr(true);
      setStatus(err instanceof Error ? err.message : "Error");
      setBusy(false);
    }
  };

  return (
    <div className="wrap wrap--narrow">
      <h1>Translate a YouTube video</h1>
      <p className="lead">
        Paste a link, pick a target language, and get a dubbed MP4 plus translated subtitles.
        Processing runs on the Azure Functions backend.
      </p>
      <div className="card">
        <form onSubmit={onSubmit}>
          <div className="row">
            <label htmlFor="url">YouTube URL</label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              required
            />
          </div>
          <div className="row">
            <label htmlFor="lang">Target language</label>
            <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="hi">Hindi (hi)</option>
              <option value="en">English (en)</option>
              <option value="ja">Japanese (ja)</option>
              <option value="es">Spanish (es)</option>
              <option value="fr">French (fr)</option>
              <option value="de">German (de)</option>
              <option value="ko">Korean (ko)</option>
            </select>
          </div>
          <div className="row">
            <label htmlFor="voice">Edge TTS voice (optional)</label>
            <input
              id="voice"
              type="text"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              placeholder="e.g. hi-IN-MadhurNeural"
            />
          </div>
          <button type="submit" disabled={busy}>
            Translate &amp; dub
          </button>
        </form>

        {status ? (
          <div className={`${styles.status} ${isErr ? styles.err : ""}`}>{status}</div>
        ) : null}
        {detail ? <div className={styles.detail}>{detail}</div> : null}
        {busy || done ? (
          <>
            <div className={styles.bar}>
              <i style={{ width: `${progress}%` }} />
            </div>
            <div className={styles.pct}>
              Overall {progress.toFixed(2)}% · Stage {phaseProgress.toFixed(1)}%
            </div>
          </>
        ) : null}
        {done && jobId ? (
          <div className={styles.links}>
            <a href={`/api/jobs/${jobId}/audio`}>Download Audio (MP3)</a>
            <a href={`/api/jobs/${jobId}/video`}>Download MP4</a>
            <a href={`/api/jobs/${jobId}/subtitles`}>Download SRT</a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
