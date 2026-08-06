"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import WikiFolderSelect from "@/components/WikiFolderSelect";
import { parseApiError } from "@/lib/api";

function PostNotesEditorInner() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/wiki/pages/${editId}`)
      .then((r) => r.json())
      .then((data) => {
        setTitle(data.page?.title || "");
        setBody(data.page?.body_raw || data.body_markdown || "");
      })
      .catch((e) => setErr(String(e)));
  }, [editId]);

  const save = async () => {
    setBusy(true);
    setErr("");
    setStatus("Saving…");
    const folderEl = document.getElementById("wiki-folder") as HTMLSelectElement | null;
    try {
      const res = await fetch("/api/wiki/post-notes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Untitled",
          body,
          page_id: editId,
          folder_id: folderEl?.value || null,
        }),
      });
      if (!res.ok) throw new Error(parseApiError(await res.text()));
      const data = await res.json();
      setStatus("Saved.");
      if (!editId && data.url) window.location.href = data.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
      setStatus("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap">
      <h1>{editId ? "Edit post notes" : "New post notes"}</h1>
      <p className="muted">Markdown with MathJax and syntax highlighting on view.</p>
      <div className="card">
        <label htmlFor="title">Title</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label htmlFor="body" style={{ marginTop: "0.6rem" }}>
          Body (Markdown)
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ minHeight: 320 }}
        />
        {!editId ? <WikiFolderSelect /> : null}
        <button type="button" onClick={save} disabled={busy}>
          Save
        </button>
        {status ? <p className="muted">{status}</p> : null}
        {err ? <p className="err">{err}</p> : null}
      </div>
    </div>
  );
}

export default function PostNotesEditorPage() {
  return (
    <Suspense fallback={<div className="wrap"><p className="muted">Loading…</p></div>}>
      <PostNotesEditorInner />
    </Suspense>
  );
}
