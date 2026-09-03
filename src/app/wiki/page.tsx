"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { WikiListItem } from "@/lib/types";

function pageTypeLabel(pageType?: string, videoId?: string) {
  if (pageType === "post_notes") return "Post notes";
  if (pageType === "manual") return "Paste notes";
  if (pageType === "html_app") return "Interactive HTML";
  if (pageType === "html") return "HTML page";
  if (videoId) return `Video: ${videoId}`;
  return "Wiki page";
}

function WikiIndexInner() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const tag = searchParams.get("tag") || "";
  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<WikiListItem[]>([]);
  const [backend, setBackend] = useState("");
  const [err, setErr] = useState("");
  const [activeTag, setActiveTag] = useState("");

  useEffect(() => {
    setQuery(q);
  }, [q]);

  useEffect(() => {
    const params = new URLSearchParams({ limit: "200" });
    if (q.trim()) params.set("q", q.trim());
    if (tag.trim()) params.set("tag", tag.trim());
    fetch(`/api/wiki/list?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const items = Array.isArray(data.items) ? data.items : [];
        setResults(items.sort((a: WikiListItem, b: WikiListItem) =>
          String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" })
        ));
        setBackend(data.backend || "");
        setActiveTag(data.tag || tag.trim());
        setErr(data.warning || "");
      })
      .catch((e) => setErr(String(e)));
  }, [q, tag]);

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
        {" · "}
        <Link href="/wiki/graph">Knowledge graph</Link>
      </p>
      {err ? <p className="muted" style={{ fontSize: "0.85rem" }}>{err}</p> : null}

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          const params = new URLSearchParams();
          if (query.trim()) params.set("q", query.trim());
          if (tag.trim()) params.set("tag", tag.trim());
          const suffix = params.toString() ? `?${params.toString()}` : "";
          window.location.href = `/wiki${suffix}`;
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

      <>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.5rem 0 0.5rem", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 650 }}>
              {activeTag ? `Pages tagged “${activeTag}”` : q ? "Search results" : "All wiki pages — alphabetical index"}
            </h2>
            {activeTag ? (
              <Link href={q ? `/wiki?q=${encodeURIComponent(q)}` : "/wiki"} className="muted" style={{ fontSize: "0.85rem" }}>
                Clear tag filter
              </Link>
            ) : null}
          </div>
          {!results.length ? <p className="muted">No wiki pages found.</p> : null}
          {results.map((r, index) => (
            <div key={r.id} className="card" style={{ display: "grid", gridTemplateColumns: "2.5rem minmax(0, 1fr)", gap: "0.75rem" }}>
              <strong className="muted" aria-hidden="true">{index + 1}.</strong>
              <div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <strong>
                  <Link href={`/wiki/${r.id}`}>{r.title}</Link>
                </strong>
                <span className="muted">{r.created_at}</span>
              </div>
              <div className="muted">{pageTypeLabel(r.page_type, r.video_id)}</div>
              {r.tags?.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.45rem" }}>
                  {r.tags.map((t) => (
                    <Link
                      key={t}
                      href={`/wiki?tag=${encodeURIComponent(t)}`}
                      style={{
                        display: "inline-block",
                        padding: "0.15rem 0.5rem",
                        borderRadius: 999,
                        background: "#000",
                        color: "#fff",
                        fontSize: "0.75rem",
                        textDecoration: "none",
                      }}
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              ) : null}
              <p style={{ margin: "0.5rem 0 0" }}>{r.summary}</p>
              </div>
            </div>
          ))}
        </>
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
