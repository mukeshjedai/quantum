"use client";

import { useState } from "react";
import WikiFolderSelect from "@/components/WikiFolderSelect";
import { parseApiError } from "@/lib/api";
import styles from "./InsightsPage.module.css";

interface InsightResult {
  title?: string;
  video_id?: string;
  transcript?: string;
  terminologies?: string[];
  concepts?: { name: string; explanation: string }[];
  important_points?: string[];
}

export default function InsightsClient() {
  const [url, setUrl] = useState("");
  const [custom, setCustom] = useState("");
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [data, setData] = useState<InsightResult | null>(null);
  const [busy, setBusy] = useState(false);

  const analyze = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setErr("");
    setStatus("Analyzing video…");
    setData(null);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          custom_demand: custom.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(parseApiError(await res.text()));
      const j = await res.json();
      setData(j);
      setStatus("Analysis complete.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      setStatus("");
    } finally {
      setBusy(false);
    }
  };

  const saveWiki = async () => {
    if (!data) return;
    const folderEl = document.getElementById("wiki-folder") as HTMLSelectElement | null;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/wiki/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title || "Untitled insights",
          video_id: data.video_id,
          transcript: data.transcript,
          terminologies: data.terminologies,
          concepts: data.concepts,
          important_points: data.important_points,
          folder_id: folderEl?.value || null,
        }),
      });
      if (!res.ok) throw new Error(parseApiError(await res.text()));
      const saved = await res.json();
      setStatus(`Wiki page saved: ${saved.url}`);
      window.location.href = saved.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap">
      <h1>YouTube Transcript Insights</h1>
      <p className="lead">
        Paste a YouTube link to extract transcript, key terminologies, concepts, and important points.
      </p>
      <div className="card">
        <label htmlFor="url">YouTube URL</label>
        <input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <label htmlFor="custom" style={{ marginTop: "0.6rem" }}>
          Custom AI demand (optional)
        </label>
        <textarea
          id="custom"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Examples: Explain this like I am 12, compare with real-world examples..."
        />
        <WikiFolderSelect />
        <button type="button" onClick={analyze} disabled={busy}>
          Analyze Video
        </button>
        {data ? (
          <button type="button" onClick={saveWiki} disabled={busy} style={{ marginLeft: "0.5rem" }}>
            Create Wiki Page
          </button>
        ) : null}
        {status ? <p className="muted">{status}</p> : null}
        {err ? <p className="err">{err}</p> : null}
      </div>

      {data ? (
        <div className={styles.grid}>
          <div className="card">
            <h2 className={styles.sectionTitle}>Terminologies</h2>
            <ul className={styles.list}>
              {(data.terminologies || []).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h2 className={styles.sectionTitle}>Concepts</h2>
            {(data.concepts || []).map((c) => (
              <div key={c.name} className={styles.concept}>
                <b>{c.name}</b>
                <p>{c.explanation}</p>
              </div>
            ))}
          </div>
          <div className="card">
            <h2 className={styles.sectionTitle}>Important points</h2>
            <ul className={styles.list}>
              {(data.important_points || []).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h2 className={styles.sectionTitle}>Transcript</h2>
            <div className={styles.transcript}>{data.transcript}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
