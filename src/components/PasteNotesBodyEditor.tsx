"use client";

import { useCallback, useId, useRef, useState } from "react";
import {
  imageFilesFromClipboard,
  imageFilesFromDataTransfer,
  insertAtCursor,
  uploadWikiImage,
} from "@/lib/wikiPasteEditor";
import styles from "./PasteNotesBodyEditor.module.css";

type PasteNotesBodyEditorProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onStatus?: (message: string) => void;
  onError?: (message: string) => void;
};

export default function PasteNotesBodyEditor({
  id,
  value,
  onChange,
  disabled = false,
  onStatus,
  onError,
}: PasteNotesBodyEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputId = useId();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const insertMarkdown = useCallback(
    (markdown: string) => {
      const el = textareaRef.current;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? value.length;
      const { value: next, cursor } = insertAtCursor(value, start, end, markdown, false);
      onChange(next);
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(cursor, cursor);
      });
    },
    [onChange, value],
  );

  const uploadImages = useCallback(
    async (files: File[]) => {
      if (!files.length || disabled || uploading) return;
      setUploading(true);
      onError?.("");
      try {
        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          onStatus?.(
            files.length > 1
              ? `Uploading image ${i + 1} of ${files.length}…`
              : "Uploading image…",
          );
          const result = await uploadWikiImage(file);
          insertMarkdown(result.markdown || `![image](${result.url})`);
        }
        onStatus?.(
          files.length > 1 ? `${files.length} images inserted.` : "Image inserted at cursor.",
        );
      } catch (e) {
        onError?.(e instanceof Error ? e.message : "Image upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [disabled, insertMarkdown, onError, onStatus, uploading],
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled || uploading) return;
    if (!e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(false);
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const files = imageFilesFromDataTransfer(e.dataTransfer);
    if (!files.length) return;
    await uploadImages(files);
  };

  const onPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled || uploading) return;
    const files = imageFilesFromClipboard(e.clipboardData);
    if (!files.length) return;
    e.preventDefault();
    await uploadImages(files);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    await uploadImages(files);
  };

  return (
    <div
      className={styles.wrap}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => void onDrop(e)}
    >
      <textarea
        ref={textareaRef}
        id={id}
        className={`${styles.textarea}${dragOver ? ` ${styles.dragOver}` : ""}`}
        value={value}
        disabled={disabled || uploading}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => void onPaste(e)}
      />
      <div className={styles.toolbar}>
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload image
        </button>
        <input
          ref={fileInputRef}
          id={uploadInputId}
          type="file"
          className={styles.hiddenInput}
          accept="image/*,.gif,.apng,.avif"
          multiple
          onChange={(e) => void onFileChange(e)}
        />
      </div>
      <p className={styles.hint}>
        Drag and drop images onto the editor, paste from clipboard, or use Upload image. Images are
        stored and inserted as markdown at the cursor.
      </p>
    </div>
  );
}
