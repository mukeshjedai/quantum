"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./Boards.module.css";

type Card = { id: string; title: string; description: string; tag: string; due: string };
type Column = { id: string; title: string; color: string; cards: Card[] };
type Board = { title: string; columns: Column[] };

const STORAGE_KEY = "applimit-kanban-board:v1";
const COLORS = ["#64748b", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a"];
const initialBoard: Board = {
  title: "Project board",
  columns: [
    { id: "ideas", title: "Ideas", color: "#64748b", cards: [] },
    { id: "progress", title: "In progress", color: "#2563eb", cards: [] },
    { id: "review", title: "Review", color: "#7c3aed", cards: [] },
    { id: "done", title: "Done", color: "#16a34a", cards: [] },
  ],
};

function safeBoard(raw: string | null): Board {
  if (!raw) return initialBoard;
  try {
    const parsed = JSON.parse(raw) as Board;
    if (!parsed?.title || !Array.isArray(parsed.columns)) return initialBoard;
    return parsed;
  } catch {
    return initialBoard;
  }
}

export default function BoardsPage() {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [loaded, setLoaded] = useState(false);
  const [newColumn, setNewColumn] = useState("");
  const [editing, setEditing] = useState<{ columnId: string; card: Card } | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);

  useEffect(() => {
    setBoard(safeBoard(window.localStorage.getItem(STORAGE_KEY)));
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  }, [board, loaded]);

  const totalCards = useMemo(
    () => board.columns.reduce((count, column) => count + column.cards.length, 0),
    [board.columns],
  );

  const updateColumn = (columnId: string, change: (column: Column) => Column) => {
    setBoard((current) => ({
      ...current,
      columns: current.columns.map((column) => column.id === columnId ? change(column) : column),
    }));
  };

  const addColumn = (event: FormEvent) => {
    event.preventDefault();
    const title = newColumn.trim();
    if (!title) return;
    setBoard((current) => ({
      ...current,
      columns: [...current.columns, { id: crypto.randomUUID(), title, color: COLORS[current.columns.length % COLORS.length], cards: [] }],
    }));
    setNewColumn("");
  };

  const saveCard = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const columnId = editing?.columnId || addingTo;
    if (!columnId) return;
    const card: Card = {
      id: editing?.card.id || crypto.randomUUID(),
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim(),
      tag: String(form.get("tag") || "").trim(),
      due: String(form.get("due") || ""),
    };
    if (!card.title) return;
    updateColumn(columnId, (column) => ({
      ...column,
      cards: editing
        ? column.cards.map((item) => item.id === card.id ? card : item)
        : [...column.cards, card],
    }));
    setEditing(null);
    setAddingTo(null);
  };

  const moveCard = (cardId: string, fromId: string, toId: string) => {
    if (!cardId || !fromId || !toId || fromId === toId) return;
    setBoard((current) => {
      const card = current.columns.find((column) => column.id === fromId)?.cards.find((item) => item.id === cardId);
      if (!card) return current;
      return {
        ...current,
        columns: current.columns.map((column) => {
          if (column.id === fromId) return { ...column, cards: column.cards.filter((item) => item.id !== cardId) };
          if (column.id === toId) return { ...column, cards: [...column.cards, card] };
          return column;
        }),
      };
    });
  };

  const shiftColumn = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= board.columns.length) return;
    setBoard((current) => {
      const columns = [...current.columns];
      [columns[index], columns[target]] = [columns[target], columns[index]];
      return { ...current, columns };
    });
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <input className={styles.boardTitle} value={board.title} aria-label="Board title" onChange={(event) => setBoard({ ...board, title: event.target.value })} />
          <p>{totalCards} {totalCards === 1 ? "card" : "cards"} · Changes save automatically in this browser</p>
        </div>
        <form className={styles.addColumn} onSubmit={addColumn}>
          <input value={newColumn} onChange={(event) => setNewColumn(event.target.value)} placeholder="New column" aria-label="New column name" />
          <button type="submit">＋ Add column</button>
        </form>
      </header>

      <section className={styles.board} aria-label={board.title}>
        {board.columns.map((column, index) => (
          <article
            className={styles.column}
            key={column.id}
            onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add(styles.dragTarget); }}
            onDragLeave={(event) => event.currentTarget.classList.remove(styles.dragTarget)}
            onDrop={(event) => {
              event.preventDefault();
              event.currentTarget.classList.remove(styles.dragTarget);
              moveCard(event.dataTransfer.getData("cardId"), event.dataTransfer.getData("columnId"), column.id);
            }}
          >
            <div className={styles.columnHeader}>
              <span className={styles.dot} style={{ background: column.color }} />
              <input value={column.title} aria-label="Column title" onChange={(event) => updateColumn(column.id, (item) => ({ ...item, title: event.target.value }))} />
              <span className={styles.count}>{column.cards.length}</span>
              <button title="Move column left" disabled={index === 0} onClick={() => shiftColumn(index, -1)}>‹</button>
              <button title="Move column right" disabled={index === board.columns.length - 1} onClick={() => shiftColumn(index, 1)}>›</button>
            </div>

            <div className={styles.cards}>
              {column.cards.map((card) => (
                <button
                  type="button"
                  draggable
                  className={styles.card}
                  key={card.id}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("cardId", card.id);
                    event.dataTransfer.setData("columnId", column.id);
                  }}
                  onClick={() => setEditing({ columnId: column.id, card })}
                >
                  <strong>{card.title}</strong>
                  {card.description ? <span>{card.description}</span> : null}
                  <small>
                    {card.tag ? <em>{card.tag}</em> : null}
                    {card.due ? <time dateTime={card.due}>{card.due}</time> : null}
                  </small>
                </button>
              ))}
            </div>
            <button className={styles.newCard} type="button" onClick={() => setAddingTo(column.id)}>＋ New</button>
            {column.cards.length === 0 ? <p className={styles.empty}>Drop cards here</p> : null}
          </article>
        ))}
      </section>

      {(addingTo || editing) ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => { setAddingTo(null); setEditing(null); }}>
          <form className={styles.modal} onSubmit={saveCard} onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalHead}><h2>{editing ? "Edit card" : "New card"}</h2><button type="button" onClick={() => { setAddingTo(null); setEditing(null); }}>×</button></div>
            <label>Title<input name="title" autoFocus defaultValue={editing?.card.title || ""} required /></label>
            <label>Description<textarea name="description" rows={5} defaultValue={editing?.card.description || ""} /></label>
            <div className={styles.formRow}>
              <label>Tag<input name="tag" placeholder="Research" defaultValue={editing?.card.tag || ""} /></label>
              <label>Due date<input name="due" type="date" defaultValue={editing?.card.due || ""} /></label>
            </div>
            <div className={styles.modalActions}>
              {editing ? <button className={styles.delete} type="button" onClick={() => { updateColumn(editing.columnId, (column) => ({ ...column, cards: column.cards.filter((card) => card.id !== editing.card.id) })); setEditing(null); }}>Delete</button> : null}
              <button className={styles.save} type="submit">Save card</button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
