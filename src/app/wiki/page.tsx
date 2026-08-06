"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function WikiIndexInner() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<
    { id: string; title?: string; page_type?: string; video_id?: string; summary?: string; created_at?: string }[]
  >([]);
  const [backend, setBackend] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!q) {
      setResults([]);
      return;
    }
    fetch(`/api/wiki/list?q=${encodeURIComponent(q)}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.items || []);
        setBackend(data.backend || "");
        setErr(data.warning || "");
      })
      .catch((e) => setErr(String(e)));
  }, [q]);

  return (
    <div className="wrap">
      <h1 style={{ margin: "0 0 0.75rem" }}>Wiki</h1>
      <p className="muted">
        {backend ? `Storage backend: ${backend}` : null}
        {" · "}Use the left sidebar to browse folders and create files
        {" · "}
        <Link href="/wiki/paste">Paste notes</Link>
        {" · "}
        <Link href="/wiki/post-notes">Post notes</Link>
        {" · "}
        <Link href="/wiki/html-workspace">HTML workspace</Link>
      </p>
      {err ? <p className="muted" style={{ fontSize: "0.85rem" }}>{err}</p> : null}

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          window.location.href = `/wiki?q=${encodeURIComponent(query)}`;
        }}
      >
        <label htmlFor="wiki-search">Search wiki pages</label>
        <input
          id="wiki-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, video id, terms..."
        />
        <button type="submit">Search</button>
      </form>

      {q ? (
        <>
          <h2 style={{ margin: "1.5rem 0 0.5rem", fontSize: "1rem", fontWeight: 650 }}>
            Search results
          </h2>
          {!results.length ? <p className="muted">No wiki pages found.</p> : null}
          {results.map((r) => (
            <div key={r.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <strong>
                  <Link href={`/wiki/${r.id}`}>{r.title}</Link>
                </strong>
                <span className="muted">{r.created_at}</span>
              </div>
              <div className="muted">
                {r.page_type === "post_notes"
                  ? "Post notes"
                  : r.page_type === "manual"
                    ? "Paste notes"
                    : r.page_type === "html_app"
                      ? "Interactive HTML"
                      : r.page_type === "html"
                        ? "HTML page"
                        : `Video: ${r.video_id}`}
              </div>
              <p style={{ margin: "0.5rem 0 0" }}>{r.summary}</p>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

export default function WikiIndexPage() {
  return (
    <Suspense fallback={<div className="wrap"><p className="muted">Loading…</p></div>}>
      <WikiIndexInner />
    </Suspense>
  );
}
