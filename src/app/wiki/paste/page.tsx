"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PasteNotesBodyEditor from "@/components/PasteNotesBodyEditor";
import WikiFolderSelect from "@/components/WikiFolderSelect";
import { parseApiError } from "@/lib/api";

function PasteNotesEditorInner() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/wiki/pages/${editId}`)
      .then((r) => r.json())
      .then((data) => {
        setTitle(data.page?.title || "");
        setBody(data.page?.body_raw || "");
      })
      .catch((e) => setErr(String(e)));
  }, [editId]);

  const runPreview = async () => {
    setBusy(true);
    setErr("");
    setStatus("");
    try {
      const res = await fetch("/api/wiki/manual/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error(parseApiError(await res.text()));
      const data = await res.json();
      setPreview(data.markdown || "");
      setStatus("Preview updated.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setErr("");
    setStatus("");
    const folderEl = document.getElementById("wiki-folder") as HTMLSelectElement | null;
    try {
      const res = await fetch("/api/wiki/manual/save", {
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
      window.location.href = data.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap">
      <h1>{editId ? "Edit paste notes" : "Paste notes"}</h1>
      <p className="muted">
        Paste Markdown-style notes with math, embeds, and images. Drag images into the editor or paste
        them from the clipboard.
      </p>
      <div className="card">
        <label htmlFor="title">Title</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label htmlFor="body" style={{ marginTop: "0.6rem" }}>
          Notes
        </label>
        <PasteNotesBodyEditor
          id="body"
          value={body}
          onChange={setBody}
          disabled={busy}
          onStatus={setStatus}
          onError={setErr}
        />
        {!editId ? <WikiFolderSelect /> : null}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.55rem" }}>
          <button type="button" onClick={runPreview} disabled={busy}>
            Preview
          </button>
          <button type="button" onClick={save} disabled={busy}>
            Save
          </button>
        </div>
        {status ? <p className="muted">{status}</p> : null}
        {err ? <p className="err">{err}</p> : null}
      </div>
      {preview ? (
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Preview markdown</h2>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{preview}</pre>
        </div>
      ) : null}
    </div>
  );
}

export default function PasteNotesEditorPage() {
  return (
    <Suspense fallback={<div className="wrap"><p className="muted">Loading…</p></div>}>
      <PasteNotesEditorInner />
    </Suspense>
  );
}
