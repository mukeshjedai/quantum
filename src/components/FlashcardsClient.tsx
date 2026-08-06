"use client";

import { useState } from "react";
import { parseApiError } from "@/lib/api";
import styles from "./FlashcardsClient.module.css";

interface Flashcard {
  front: string;
  back: string;
}

export default function FlashcardsClient() {
  const [url, setUrl] = useState("");
  const [custom, setCustom] = useState("");
  const [status, setStatus] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [busy, setBusy] = useState(false);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  const generate = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setCards([]);
    setFlipped({});
    setStatus("Generating flashcards...");
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          custom_demand: custom.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(parseApiError(await res.text()));
      const data = await res.json();
      setCards(data.flashcards || []);
      setStatus(`Generated ${data.count || cards.length} flashcards. Click a card to flip.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap">
      <h1>AI Flashcards</h1>
      <div className="card">
        <label htmlFor="url">YouTube URL</label>
        <input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <label style={{ marginTop: "0.5rem" }}>Optional custom demand</label>
        <textarea
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="e.g. create advanced interview style flashcards"
        />
        <button type="button" onClick={generate} disabled={busy}>
          Generate Flashcards
        </button>
        {status ? <p className="muted">{status}</p> : null}
      </div>
      <div className={styles.grid}>
        {cards.map((c, i) => (
          <div
            key={i}
            className={`${styles.flip} ${flipped[i] ? styles.flipped : ""}`}
            onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
          >
            <div>
              <div className={`${styles.side} ${styles.front}`}>
                <strong>Front</strong>
                <p>{c.front}</p>
              </div>
              <div className={`${styles.side} ${styles.back}`}>
                <strong>Back</strong>
                <p>{c.back}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
