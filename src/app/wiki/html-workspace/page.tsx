"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import WikiFolderSelect from "@/components/WikiFolderSelect";
import { parseApiError } from "@/lib/api";

function HtmlWorkspaceInner() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!file) {
      setErr("Choose an HTML file.");
      return;
    }
    setBusy(true);
    setErr("");
    setStatus("Uploading…");
    const folderEl = document.getElementById("wiki-folder") as HTMLSelectElement | null;
    try {
      const prep = await fetch("/api/wiki/html-app/prepare-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          file_size: file.size,
          title: title.trim(),
          page_id: editId,
        }),
      });
      if (!prep.ok) throw new Error(parseApiError(await prep.text()));
      const prepData = await prep.json();
      const put = await fetch(prepData.upload_url, {
        method: "PUT",
        headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": "text/html" },
        body: file,
      });
      if (!put.ok) throw new Error("Blob upload failed.");
      const fin = await fetch("/api/wiki/html-app/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_id: prepData.page_id,
          title: title.trim(),
          filename: file.name,
          folder_id: folderEl?.value || null,
        }),
      });
      if (!fin.ok) throw new Error(parseApiError(await fin.text()));
      const finData = await fin.json();
      window.location.href = finData.url || `/wiki/${prepData.page_id}`;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
      setStatus("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap">
      <h1>HTML workspace</h1>
      <p className="muted">Upload interactive HTML apps (large files upload directly to Azure Blob).</p>
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
        <button type="button" onClick={upload} disabled={busy}>
          {editId ? "Replace file" : "Upload"}
        </button>
        {status ? <p className="muted">{status}</p> : null}
        {err ? <p className="err">{err}</p> : null}
      </div>
    </div>
  );
}

export default function HtmlWorkspacePage() {
  return (
    <Suspense fallback={<div className="wrap"><p className="muted">Loading…</p></div>}>
      <HtmlWorkspaceInner />
    </Suspense>
  );
}
