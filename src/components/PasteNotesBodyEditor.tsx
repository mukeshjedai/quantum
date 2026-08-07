"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import PasteNotesImageBlock from "@/components/PasteNotesImageBlock";
import WikiPageAttachments from "@/components/WikiPageAttachments";
import {
  allFilesFromDataTransfer,
  isImageFile,
  mergeAttachments,
  uploadWikiFile,
} from "@/lib/wikiFiles";
import type { WikiAttachment } from "@/lib/types";
import {
  imageFilesFromClipboard,
  insertImageIntoBlocks,
  insertTextIntoBlocks,
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
  pageId?: string | null;
  attachments?: WikiAttachment[];
  onAttachmentsChange?: (attachments: WikiAttachment[]) => void;
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
  pageId = null,
  attachments = [],
  onAttachmentsChange,
  disabled = false,
  onStatus,
  onError,
}: PasteNotesBodyEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageInputId = useId();
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

  const uploadAttachmentFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || disabled || uploading) return;
      setUploading(true);
      onError?.("");
      try {
        let nextBlocks = blocks;
        const uploaded: WikiAttachment[] = [];
        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          onStatus?.(
            files.length > 1
              ? `Uploading file ${i + 1} of ${files.length}…`
              : "Uploading file…",
          );
          const result = await uploadWikiFile(file, pageId || undefined);
          uploaded.push(result);
          nextBlocks = insertTextIntoBlocks(
            nextBlocks,
            i === 0 ? focusRef.current : null,
            result.markdown,
          );
        }
        emit(nextBlocks);
        onAttachmentsChange?.(mergeAttachments(attachments, uploaded));
        onStatus?.(
          files.length > 1 ? `${files.length} files attached.` : "File attached and linked in notes.",
        );
      } catch (e) {
        onError?.(e instanceof Error ? e.message : "File upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [
      attachments,
      blocks,
      disabled,
      emit,
      onAttachmentsChange,
      onError,
      onStatus,
      pageId,
      uploading,
    ],
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter(isImageFile);
      const others = files.filter((file) => !isImageFile(file));
      if (images.length) await uploadImages(images);
      if (others.length) await uploadAttachmentFiles(others);
    },
    [uploadAttachmentFiles, uploadImages],
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
    const files = allFilesFromDataTransfer(e.dataTransfer);
    if (!files.length) return;
    await handleFiles(files);
  };

  const onPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled || uploading) return;
    const files = imageFilesFromClipboard(e.clipboardData);
    if (!files.length) return;
    e.preventDefault();
    await handleFiles(files);
  };

  const onImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    await handleFiles(files);
  };

  const insertAttachmentLink = useCallback(
    (markdown: string) => {
      emit(insertTextIntoBlocks(blocks, focusRef.current, markdown));
    },
    [blocks, emit],
  );

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
          onClick={() => imageInputRef.current?.click()}
        >
          Upload image
        </button>
        <input
          ref={imageInputRef}
          id={imageInputId}
          type="file"
          className={styles.hiddenInput}
          accept="image/*,.gif,.apng,.avif"
          multiple
          onChange={(e) => void onImageChange(e)}
        />
      </div>

      <WikiPageAttachments
        pageId={pageId}
        attachments={attachments}
        onChange={onAttachmentsChange}
        onInsertLink={insertAttachmentLink}
        disabled={disabled || uploading}
        compact
      />

      <p className={styles.hint}>
        Drag and drop images or files anywhere in the editor. Images show inline with resize controls;
        other files are stored on the page and linked in your notes.
      </p>
    </div>
  );
}
