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
import { codeBlock, richHtmlToMarkdown } from "@/lib/wikiRichPaste";

type PasteNotesBodyEditorProps = {
  id?: string;
  contentFormat?: string;
  value: string;
  onChange: (value: string) => void;
  pageId?: string | null;
  attachments?: WikiAttachment[];
  onAttachmentsChange?: (attachments: WikiAttachment[]) => void;
  disabled?: boolean;
  onStatus?: (message: string) => void;
  onError?: (message: string) => void;
  onHtmlFile?: (file: File) => Promise<void>;
};

type FocusState = {
  blockIndex: number;
  start: number;
  end: number;
};

export default function PasteNotesBodyEditor({
  id,
  contentFormat = "markdown",
  value,
  onChange,
  pageId = null,
  attachments = [],
  onAttachmentsChange,
  disabled = false,
  onStatus,
  onError,
  onHtmlFile,
}: PasteNotesBodyEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageInputId = useId();
  const lastEmitted = useRef(value);
  const focusRef = useRef<FocusState | null>(null);
  const [blocks, setBlocks] = useState<PasteBlock[]>(() => parsePasteBlocks(value));
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [richPaste, setRichPaste] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const isRst = contentFormat === "sphinx_rst";

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

  const insertAtCursor = (text: string) => {
    const focus = focusRef.current;
    const block = focus ? blocks[focus.blockIndex] : null;
    if (focus && block?.type === "text") {
      emit(updateTextBlock(blocks, focus.blockIndex, block.content.slice(0,focus.start)+text+block.content.slice(focus.end)));
      focusRef.current = { ...focus, start: focus.start+text.length, end: focus.start+text.length };
    } else emit(insertTextIntoBlocks(blocks,null,text));
  };
  const selectedText = () => {
    const focus=focusRef.current;
    const block=focus ? blocks[focus.blockIndex] : null;
    return focus && block?.type === "text" ? block.content.slice(focus.start,focus.end) : "";
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
    const clipboardHtml = e.clipboardData.getData("text/html");
    if (richPaste && !isRst && clipboardHtml && e.clipboardData.getData("text/plain").trim()) {
      const markdown = richHtmlToMarkdown(clipboardHtml);
      if (markdown) {
        e.preventDefault();
        const index=blocks.findIndex((_,i)=>i===focusRef.current?.blockIndex);
        if (index>=0) rememberFocus(index,e.currentTarget);
        insertAtCursor(markdown);
        onStatus?.("Pasted formatting as editable Markdown. Use Preview to see the result.");
        return;
      }
    }
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
      <div className={styles.toolbar} role="group" aria-label="Text formatting">
        <button type="button" disabled={disabled || uploading} onClick={()=>insertAtCursor(`**${selectedText() || "bold text"}**`)}>Bold</button>
        <button type="button" disabled={disabled || uploading} onClick={()=>insertAtCursor(`*${selectedText() || "italic text"}*`)}>Italic</button>
        <button type="button" disabled={disabled || uploading || isRst} onClick={()=>insertAtCursor(`\n\n## ${selectedText() || "Heading"}\n\n`)}>Heading</button>
        <button type="button" disabled={disabled || uploading} onClick={()=>insertAtCursor("\n\n"+(selectedText() || "List item").split("\n").map(line=>"- "+line).join("\n")+"\n\n")}>Bullet list</button>
        <button type="button" disabled={disabled || uploading || isRst} onClick={()=>insertAtCursor("\n\n| Column 1 | Column 2 |\n| --- | --- |\n| Value | Value |\n\n")}>Table</button>
        <button type="button" disabled={disabled || uploading} onClick={()=>{setCode(selectedText());setShowCode(true);}}>Add code</button>
        <label style={{display:"inline-flex",alignItems:"center",gap:".4rem"}}><input style={{width:"auto"}} type="checkbox" checked={richPaste && !isRst} disabled={disabled || uploading || isRst} onChange={e=>setRichPaste(e.target.checked)} />Preserve pasted formatting</label>
      </div>
      {isRst && <p className={styles.hint}>RST source is pasted unchanged. Use MyST or Markdown for formatted clipboard paste.</p>}
      {showCode && <section style={{border:"1px solid #cbd5e1",padding:"1rem",borderRadius:8,marginBottom:"1rem"}} aria-label="Insert code block">
        <label>Code language<select value={language} disabled={disabled || uploading} onChange={e=>setLanguage(e.target.value)}>{["python","javascript","typescript","json","bash","sql","html","css","text"].map(lang=><option key={lang} value={lang}>{lang}</option>)}</select></label>
        <label>Code<textarea aria-label="Code to insert" style={{width:"100%",fontFamily:"monospace",whiteSpace:"pre",boxSizing:"border-box"}} rows={8} value={code} disabled={disabled || uploading} onChange={e=>setCode(e.target.value)} placeholder="Paste code here; indentation is preserved." /></label>
        <div className={styles.toolbar}><button type="button" disabled={disabled || uploading || !code.trim()} onClick={()=>{insertAtCursor(codeBlock(code,language,isRst));setShowCode(false);setCode("");onStatus?.("Code block inserted. Preview to check formatting.");}}>Insert code block</button><button type="button" onClick={()=>setShowCode(false)}>Cancel</button></div>
      </section>}
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
          const previousIsImage = blocks[index - 1]?.type === "image";
          const nextIsImage = blocks[index + 1]?.type === "image";
          const placeholder = previousIsImage
            ? "Continue writing below this image…"
            : nextIsImage
              ? "Write text above this image…"
              : hasImages
                ? "Continue writing…"
                : "Paste your notes here…";
          return (
            <textarea
              key={`text-${index}`}
              id={isPrimary ? id : undefined}
              className={`${styles.textarea}${isPrimary && !hasImages ? ` ${styles.textareaPrimary}` : ""}`}
              value={block.content}
              disabled={disabled || uploading}
              rows={Math.max(3, block.content.split("\n").length)}
              placeholder={placeholder}
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
        onHtmlFile={onHtmlFile}
      />

      <p className={styles.hint}>
        Drag and drop images or files anywhere in the editor. Images show inline with resize controls;
        HTML files selected with Upload file create a new wiki page; other files are stored and linked.
      </p>
    </div>
  );
}
