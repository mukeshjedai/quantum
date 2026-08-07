"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import PasteNotesImageBlock from "@/components/PasteNotesImageBlock";
import {
  imageFilesFromClipboard,
  imageFilesFromDataTransfer,
  insertImageIntoBlocks,
  parsePasteBlocks,
  removeImageBlock,
  serializePasteBlocks,
  updateImageBlock,
  updateTextBlock,
  uploadResultToImageBlock,
  uploadWikiImage,
  type PasteBlock,
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

type FocusState = {
  blockIndex: number;
  start: number;
  end: number;
};

export default function PasteNotesBodyEditor({
  id,
  value,
  onChange,
  disabled = false,
  onStatus,
  onError,
}: PasteNotesBodyEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputId = useId();
  const lastEmitted = useRef(value);
  const focusRef = useRef<FocusState | null>(null);
  const [blocks, setBlocks] = useState<PasteBlock[]>(() => parsePasteBlocks(value));
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setBlocks(parsePasteBlocks(value));
      lastEmitted.current = value;
    }
  }, [value]);

  const emit = useCallback(
    (nextBlocks: PasteBlock[]) => {
      setBlocks(nextBlocks);
      const serialized = serializePasteBlocks(nextBlocks);
      lastEmitted.current = serialized;
      onChange(serialized);
    },
    [onChange],
  );

  const rememberFocus = (blockIndex: number, el: HTMLTextAreaElement) => {
    focusRef.current = {
      blockIndex,
      start: el.selectionStart,
      end: el.selectionEnd,
    };
  };

  const uploadImages = useCallback(
    async (files: File[]) => {
      if (!files.length || disabled || uploading) return;
      setUploading(true);
      onError?.("");
      try {
        let nextBlocks = blocks;
        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          onStatus?.(
            files.length > 1
              ? `Uploading image ${i + 1} of ${files.length}…`
              : "Uploading image…",
          );
          const result = await uploadWikiImage(file);
          const imageBlock = uploadResultToImageBlock(result);
          nextBlocks = insertImageIntoBlocks(
            nextBlocks,
            i === 0 ? focusRef.current : null,
            imageBlock,
          );
        }
        emit(nextBlocks);
        onStatus?.(
          files.length > 1 ? `${files.length} images inserted.` : "Image inserted at cursor.",
        );
      } catch (e) {
        onError?.(e instanceof Error ? e.message : "Image upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [blocks, disabled, emit, onError, onStatus, uploading],
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
    const files = imageFilesFromClipboard(e.dataTransfer);
    if (!files.length) return;
    e.preventDefault();
    await uploadImages(files);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    await uploadImages(files);
  };

  const hasImages = blocks.some((block) => block.type === "image");

  return (
    <div
      className={`${styles.wrap}${dragOver ? ` ${styles.dragOverWrap}` : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => void onDrop(e)}
    >
      <div className={styles.blocks}>
        {blocks.map((block, index) => {
          if (block.type === "image") {
            return (
              <PasteNotesImageBlock
                key={`img-${index}-${block.url}`}
                block={block}
                disabled={disabled || uploading}
                onChange={(patch) => emit(updateImageBlock(blocks, index, patch))}
                onRemove={() => emit(removeImageBlock(blocks, index))}
              />
            );
          }

          const isPrimary = index === 0;
          return (
            <textarea
              key={`text-${index}`}
              id={isPrimary ? id : undefined}
              className={`${styles.textarea}${isPrimary && !hasImages ? ` ${styles.textareaPrimary}` : ""}`}
              value={block.content}
              disabled={disabled || uploading}
              rows={Math.max(3, block.content.split("\n").length)}
              placeholder={hasImages ? "Continue writing…" : "Paste your notes here…"}
              onChange={(e) => emit(updateTextBlock(blocks, index, e.target.value))}
              onSelect={(e) => rememberFocus(index, e.currentTarget)}
              onKeyUp={(e) => rememberFocus(index, e.currentTarget)}
              onClick={(e) => rememberFocus(index, e.currentTarget)}
              onFocus={(e) => rememberFocus(index, e.currentTarget)}
              onPaste={(e) => void onPaste(e)}
            />
          );
        })}
      </div>
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
        Images appear inline with a live preview. Drag the corner handle or use the slider to resize.
        You can also drag and drop or paste images into any text area.
      </p>
    </div>
  );
}
