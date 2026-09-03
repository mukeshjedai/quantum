"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PasteNotesBodyEditor from "@/components/PasteNotesBodyEditor";
import WikiContent from "@/components/WikiContent";
import WikiFolderSelect from "@/components/WikiFolderSelect";
import { parseApiError } from "@/lib/api";
import type { WikiAttachment } from "@/lib/types";

function PasteNotesEditorInner() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contentFormat, setContentFormat] = useState<"markdown" | "sphinx">("markdown");
  const [attachments, setAttachments] = useState<WikiAttachment[]>([]);
  const [preview, setPreview] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
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
        setContentFormat(data.page?.content_format === "sphinx" ? "sphinx" : "markdown");
        setAttachments(data.attachments || data.page?.attachments || []);
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
        body: JSON.stringify({ body, content_format: contentFormat }),
      });
      if (!res.ok) throw new Error(parseApiError(await res.text()));
      const data = await res.json();
      setPreview(data.markdown || "");
      setPreviewHtml(data.html || "");
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
          content_format: contentFormat,
          page_id: editId,
          folder_id: folderEl?.value || null,
          attachments,
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

  const createWikiFromHtml = async (file: File) => {
    setBusy(true);
    setErr("");
    setStatus("Preparing HTML upload…");
    const folderEl = document.getElementById("wiki-folder") as HTMLSelectElement | null;
    try {
      const prepareResponse = await fetch("/api/wiki/html-app/prepare-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          file_size: file.size,
          kind: "general",
        }),
      });
      if (!prepareResponse.ok) {
        throw new Error(parseApiError(await prepareResponse.text()));
      }
      const prepared = await prepareResponse.json();
      if (!prepared.upload_url) throw new Error("Direct HTML upload is unavailable.");

      setStatus("Uploading original HTML…");
      const uploadResponse = await fetch(prepared.upload_url, {
        method: "PUT",
        headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": "text/html" },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error("HTML file upload failed.");

      setStatus("Creating embedded wiki page…");
      const saveResponse = await fetch("/api/wiki/html-app/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_id: prepared.page_id,
          title: "",
          filename: file.name,
          kind: "general",
          folder_id: folderEl?.value || null,
        }),
      });
      if (!saveResponse.ok) throw new Error(parseApiError(await saveResponse.text()));
      const created = await saveResponse.json();
      window.location.href = created.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "HTML wiki creation failed");
      setStatus("");
      setBusy(false);
    }
  };

  return (
    <div className="wrap">
      <h1>{editId ? "Edit paste notes" : "Paste notes"}</h1>
      <p className="muted">
        Paste Markdown-style notes with math and embeds. Drag images or files into the editor — images
        preview inline; other files are stored on the page.
      </p>
      <div className="card">
        <label htmlFor="title">Title</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label htmlFor="content-format" style={{ marginTop: "0.6rem" }}>
          Page format
        </label>
        <select
          id="content-format"
          value={contentFormat}
          onChange={(event) => {
            setContentFormat(event.target.value === "sphinx" ? "sphinx" : "markdown");
            setPreview("");
            setPreviewHtml("");
          }}
          disabled={busy}
        >
          <option value="markdown">Wiki Markdown + math</option>
          <option value="sphinx">Sphinx / MyST documentation</option>
        </select>
        {contentFormat === "sphinx" ? (
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            Supports MyST headings, links, code fences, tables, directives, and dollar-delimited math.
          </p>
        ) : null}
        <label htmlFor="body" style={{ marginTop: "0.6rem" }}>
          Notes
        </label>
        <PasteNotesBodyEditor
          id="body"
          value={body}
          onChange={setBody}
          pageId={editId}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          disabled={busy}
          onStatus={setStatus}
          onError={setErr}
          onHtmlFile={createWikiFromHtml}
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
      {preview || previewHtml ? (
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Preview</h2>
          {previewHtml ? (
            <div className="wiki-content sphinx-content" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <WikiContent content={preview} pageType="manual" />
          )}
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
