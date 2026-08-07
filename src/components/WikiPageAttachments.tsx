"use client";

import { useCallback, useId, useRef, useState } from "react";
import {
  allFilesFromDataTransfer,
  deleteWikiPageFile,
  formatFileSize,
  mergeAttachments,
  uploadWikiFile,
} from "@/lib/wikiFiles";
import type { WikiAttachment } from "@/lib/types";
import styles from "./WikiPageAttachments.module.css";

type WikiPageAttachmentsProps = {
  pageId?: string | null;
  attachments: WikiAttachment[];
  onChange?: (attachments: WikiAttachment[]) => void;
  onInsertLink?: (markdown: string) => void;
  disabled?: boolean;
  compact?: boolean;
};

export default function WikiPageAttachments({
  pageId,
  attachments,
  onChange,
  onInsertLink,
  disabled = false,
  compact = false,
}: WikiPageAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || disabled || busy) return;
      setBusy(true);
      setErr("");
      try {
        const uploaded: WikiAttachment[] = [];
        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          const result = await uploadWikiFile(file, pageId || undefined);
          uploaded.push(result);
          if (onInsertLink && result.markdown) onInsertLink(result.markdown);
        }
        onChange?.(mergeAttachments(attachments, uploaded));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "File upload failed.");
      } finally {
        setBusy(false);
      }
    },
    [attachments, busy, disabled, onChange, onInsertLink, pageId],
  );

  const onDragOver = (e: React.DragEvent) => {
    if (disabled || busy) return;
    if (!e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    await uploadFiles(allFilesFromDataTransfer(e.dataTransfer));
  };

  const removeFile = async (fileId: string) => {
    if (disabled || busy) return;
    setBusy(true);
    setErr("");
    try {
      if (pageId) {
        const next = await deleteWikiPageFile(pageId, fileId);
        onChange?.(next);
      } else {
        onChange?.(attachments.filter((item) => item.id !== fileId));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not remove file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h3 className={styles.title}>Files</h3>
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.uploadBtn}
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            Upload file
          </button>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            className={styles.hiddenInput}
            multiple
            disabled={disabled || busy}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = "";
              void uploadFiles(files);
            }}
          />
        </div>
      </div>

      <div
        className={`${styles.dropZone}${dragOver ? ` ${styles.dropZoneActive}` : ""}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(e) => void onDrop(e)}
      >
        <p className={styles.dropText}>
          {compact
            ? "Drag files here or use Upload file."
            : "Drag and drop files here to attach them to this page. Files are stored in wiki storage and linked from the page."}
        </p>
      </div>

      {attachments.length ? (
        <ul className={styles.list}>
          {attachments.map((file) => (
            <li key={file.id} className={styles.item}>
              <div className={styles.itemMain}>
                <a className={styles.itemName} href={file.url} download={file.filename}>
                  {file.filename}
                </a>
                <span className={styles.itemMeta}>
                  {formatFileSize(file.size)}
                  {file.uploaded_at ? ` · ${file.uploaded_at}` : ""}
                </span>
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                disabled={disabled || busy}
                onClick={() => void removeFile(file.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No files attached yet.</p>
      )}

      {err ? <p className={styles.err}>{err}</p> : null}
    </div>
  );
}
