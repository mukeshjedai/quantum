"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import WikiFolderSelect from "@/components/WikiFolderSelect";
import { parseApiError } from "@/lib/api";

function UploadHtmlInner() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewFilename, setPreviewFilename] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const preview = async () => {
    if (!file) return;
    setBusy(true);
    setErr("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/wiki/html/preview", { method: "POST", body: fd });
      if (!res.ok) throw new Error(parseApiError(await res.text()));
      const data = await res.json();
      setPreviewHtml(data.body_html || "");
      setPreviewFilename(data.filename || file.name);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!previewHtml && !editId) {
      setErr("Preview the HTML file before saving.");
      return;
    }
    setBusy(true);
    setErr("");
    const folderEl = document.getElementById("wiki-folder") as HTMLSelectElement | null;
    try {
      const res = await fetch("/api/wiki/html/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body_html: previewHtml,
          filename: previewFilename || file?.name || "upload.html",
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
      <h1>Upload HTML page</h1>
      <p className="muted">Sanitized HTML stored as a wiki page body.</p>
      <div className="card">
        <label htmlFor="title">Title</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label htmlFor="file" style={{ marginTop: "0.6rem" }}>
          HTML file
        </label>
        <input
          id="file"
          type="file"
          accept=".html,.htm,text/html"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {!editId ? <WikiFolderSelect /> : null}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" onClick={preview} disabled={busy || !file}>
            Preview
          </button>
          <button type="button" onClick={save} disabled={busy}>
            Save
          </button>
        </div>
        {err ? <p className="err">{err}</p> : null}
      </div>
      {previewHtml ? (
        <div className="card" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      ) : null}
    </div>
  );
}

export default function UploadHtmlPage() {
  return (
    <Suspense fallback={<div className="wrap"><p className="muted">Loading…</p></div>}>
      <UploadHtmlInner />
    </Suspense>
  );
}
