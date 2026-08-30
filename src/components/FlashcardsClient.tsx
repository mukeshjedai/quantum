"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { parseApiError } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import styles from "./FlashcardsClient.module.css";

type Flashcard = { id: string; front: string; back: string };
type DeckSummary = {
  id: string; title: string; card_count: number; seen_count: number; mastered_count: number;
  current_index: number; progress_percent: number; completed: boolean;
};
type DeckDetail = DeckSummary & {
  cards: Flashcard[];
  status: { current_index: number; seen_card_ids: string[]; mastered_card_ids: string[] };
};

export default function FlashcardsClient() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [active, setActive] = useState<DeckDetail | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const userQuery = user?.email ? `?user_email=${encodeURIComponent(user.email)}` : "";
  const loadDecks = useCallback(async () => {
    const query = user?.email ? `?user_email=${encodeURIComponent(user.email)}` : "";
    const response = await fetch(`/api/flashcards/decks${query}`);
    if (!response.ok) throw new Error(parseApiError(await response.text()));
    const data = await response.json();
    setDecks(Array.isArray(data.decks) ? data.decks : []);
  }, [user?.email]);

  useEffect(() => { void loadDecks().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load flashcards.")); }, [loadDecks]);

  const createDeck = async (deckTitle: string, cards: unknown[], sourceFilename = "") => {
    const response = await fetch("/api/flashcards/decks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: deckTitle, cards, source_filename: sourceFilename }),
    });
    if (!response.ok) throw new Error(parseApiError(await response.text()));
    const data = await response.json();
    setDecks((current) => [data.deck, ...current.filter((deck) => deck.id !== data.deck.id)]);
    return data.deck as DeckSummary;
  };

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const parsed = JSON.parse(await file.text());
      const cards = Array.isArray(parsed) ? parsed : parsed.cards || parsed.flashcards;
      if (!Array.isArray(cards) || !cards.length) throw new Error("JSON must be an array or contain a non-empty cards/flashcards array.");
      const deckTitle = title.trim() || (!Array.isArray(parsed) && String(parsed.title || "").trim()) || file.name.replace(/\.json$/i, "");
      const deck = await createDeck(deckTitle, cards, file.name);
      setMessage(`Created “${deck.title}” with ${deck.card_count} cards.`);
      setTitle(""); setFile(null);
      const input = document.getElementById("flashcard-json-file") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create flashcards."); }
    finally { setBusy(false); }
  };

  const generate = async () => {
    if (!url.trim()) return;
    setBusy(true); setError(""); setMessage("Generating flashcards…");
    try {
      const response = await fetch("/api/flashcards", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), custom_demand: custom.trim() || null }),
      });
      if (!response.ok) throw new Error(parseApiError(await response.text()));
      const data = await response.json();
      const deck = await createDeck(title.trim() || `Video ${data.video_id}`, data.flashcards || []);
      setMessage(`Generated and saved “${deck.title}” with ${deck.card_count} cards.`);
      setUrl(""); setCustom(""); setTitle("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not generate flashcards."); }
    finally { setBusy(false); }
  };

  const openDeck = async (id: string) => {
    setError(""); setMessage("Loading deck…");
    try {
      const response = await fetch(`/api/flashcards/decks/${encodeURIComponent(id)}${userQuery}`);
      if (!response.ok) throw new Error(parseApiError(await response.text()));
      const data = await response.json();
      setActive(data.deck); setFlipped(false); setMessage("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not open deck."); }
  };

  const saveProgress = async (deck: DeckDetail, index: number, seen: string[], mastered: string[]) => {
    if (!user?.email) throw new Error("Sign in to save flashcard progress.");
    const response = await fetch(`/api/flashcards/decks/${encodeURIComponent(deck.id)}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_email: user.email, user_name: user.name || "", current_index: index, seen_card_ids: seen, mastered_card_ids: mastered }),
    });
    if (!response.ok) throw new Error(parseApiError(await response.text()));
    const data = await response.json();
    setDecks((current) => current.map((item) => item.id === deck.id ? data.deck : item));
  };

  const updateStudy = (index: number, seen: string[], mastered: string[]) => {
    if (!active) return;
    const next = { ...active, current_index: index, seen_count: seen.length, mastered_count: mastered.length, progress_percent: active.card_count ? Math.round(mastered.length / active.card_count * 100) : 0, completed: mastered.length >= active.card_count, status: { current_index: index, seen_card_ids: seen, mastered_card_ids: mastered } };
    setActive(next); setFlipped(false);
    void saveProgress(next, index, seen, mastered).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not save progress."));
  };

  const flipCard = () => {
    if (!active?.cards.length) return;
    const card = active.cards[active.current_index];
    const nextFlipped = !flipped;
    setFlipped(nextFlipped);
    if (nextFlipped && !active.status.seen_card_ids.includes(card.id)) {
      const seen = [...active.status.seen_card_ids, card.id];
      const next = { ...active, seen_count: seen.length, status: { ...active.status, seen_card_ids: seen } };
      setActive(next);
      void saveProgress(next, active.current_index, seen, active.status.mastered_card_ids).catch(() => {});
    }
  };

  const rate = (mastered: boolean) => {
    if (!active) return;
    const card = active.cards[active.current_index];
    const seen = active.status.seen_card_ids.includes(card.id) ? active.status.seen_card_ids : [...active.status.seen_card_ids, card.id];
    const masteredIds = mastered ? [...new Set([...active.status.mastered_card_ids, card.id])] : active.status.mastered_card_ids.filter((id) => id !== card.id);
    updateStudy((active.current_index + 1) % active.cards.length, seen, masteredIds);
  };

  const card = active?.cards[active.current_index];
  return <main className={styles.page}>
    <header className={styles.header}><div><h1>Flashcards</h1><p>Upload JSON, study by flipping cards, and resume your saved progress.</p></div></header>
    <section className={styles.creators}>
      <form className={styles.createCard} onSubmit={upload}>
        <h2>Upload a JSON deck</h2>
        <label>Deck title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Uses JSON title or filename if blank" maxLength={200} /></label>
        <label>Flashcards JSON<input id="flashcard-json-file" type="file" accept="application/json,.json" required onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
        <button type="submit" disabled={busy || !file}>{busy ? "Creating…" : "Upload and create"}</button>
        <p className={styles.hint}>Use <code>{`{"title":"Biology","cards":[{"front":"Cell?","back":"Basic unit of life"}]}`}</code>. Question/answer and term/definition keys are also accepted.</p>
      </form>
      <section className={styles.createCard}>
        <h2>Generate from YouTube</h2>
        <label>YouTube URL<input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" /></label>
        <label>Optional instructions<textarea rows={2} value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Create advanced exam-ready cards" /></label>
        <button type="button" onClick={generate} disabled={busy || !url.trim()}>{busy ? "Working…" : "Generate and save"}</button>
      </section>
    </section>
    {error ? <p className={styles.error}>{error}</p> : null}{message ? <p className={styles.success}>{message}</p> : null}

    {active && card ? <section className={styles.study}>
      <div className={styles.studyHead}><div><button className={styles.backButton} type="button" onClick={() => setActive(null)}>← All decks</button><h2>{active.title}</h2></div><span>{active.mastered_count}/{active.card_count} mastered</span></div>
      <div className={styles.progress} aria-label={`${active.progress_percent}% mastered`}><span style={{ width: `${active.progress_percent}%` }} /></div>
      <p className={styles.counter}>Card {active.current_index + 1} of {active.card_count} · Click to flip</p>
      <button type="button" className={`${styles.flip} ${flipped ? styles.flipped : ""}`} onClick={flipCard} aria-label={flipped ? `Answer: ${card.back}` : `Question: ${card.front}`}>
        <span className={`${styles.side} ${styles.front}`}><small>Question</small><strong>{card.front}</strong></span>
        <span className={`${styles.side} ${styles.back}`}><small>Answer</small><strong>{card.back}</strong></span>
      </button>
      <div className={styles.studyActions}>
        <button type="button" onClick={() => updateStudy((active.current_index - 1 + active.cards.length) % active.cards.length, active.status.seen_card_ids, active.status.mastered_card_ids)}>← Previous</button>
        <button type="button" className={styles.again} onClick={() => rate(false)}>Review again</button>
        <button type="button" className={styles.know} onClick={() => rate(true)}>I know this</button>
        <button type="button" onClick={() => updateStudy((active.current_index + 1) % active.cards.length, active.status.seen_card_ids, active.status.mastered_card_ids)}>Next →</button>
      </div>
    </section> : <section>
      <h2 className={styles.libraryTitle}>Your flashcard decks</h2>
      {decks.length ? <div className={styles.library}>{decks.map((deck) => <button type="button" className={styles.deck} key={deck.id} onClick={() => void openDeck(deck.id)}>
        <div><h3>{deck.title}</h3>{deck.completed ? <strong className={styles.complete}>Completed</strong> : null}</div>
        <p>{deck.card_count} cards · {deck.seen_count} reviewed · {deck.mastered_count} mastered</p>
        <div className={styles.progress}><span style={{ width: `${deck.progress_percent}%` }} /></div><small>{deck.progress_percent}% mastered</small>
      </button>)}</div> : <p className={styles.empty}>No flashcard decks yet. Upload a JSON file or generate one from a video.</p>}
    </section>}
  </main>;
}
