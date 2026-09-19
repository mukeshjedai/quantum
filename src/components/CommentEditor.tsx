"use client";

import { useEffect, useRef } from "react";
import styles from "./WikiComments.module.css";

export default function CommentEditor({ value, onChange, label, disabled = false }: { value: string; onChange: (html: string) => void; label: string; disabled?: boolean }) {
  const editor = useRef<HTMLDivElement>(null);
  const selection = useRef<Range | null>(null);
  useEffect(() => {
    if (editor.current && editor.current.innerHTML !== value) editor.current.innerHTML = value;
  }, [value]);
  function remember() {
    const current = window.getSelection();
    if (current?.rangeCount && editor.current?.contains(current.anchorNode)) selection.current = current.getRangeAt(0).cloneRange();
  }
  function change() {
    const el = editor.current;
    if (el) onChange(el.textContent?.trim() ? el.innerHTML : "");
    remember();
  }
  function command(name: string, argument?: string) {
    editor.current?.focus();
    if (selection.current) {
      const current = window.getSelection(); current?.removeAllRanges(); current?.addRange(selection.current);
    }
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(name, false, argument);
    change();
  }
  const buttons = [["Bold", "bold"], ["Italic", "italic"], ["Underline", "underline"], ["Bullet list", "insertUnorderedList"], ["Numbered list", "insertOrderedList"], ["Clear formatting", "removeFormat"]];
  return <div className={styles.editor}>
    <div className={styles.toolbar} role="group" aria-label={`${label} formatting`}>
      {buttons.map(([title, cmd]) => <button key={cmd} type="button" disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={() => command(cmd)}>{title}</button>)}
      {[["Red", "#b91c1c"], ["Black", "#000000"], ["Blue", "#1d4ed8"]].map(([title, color]) => <button key={title} type="button" disabled={disabled} style={{ color }} onMouseDown={e => e.preventDefault()} onClick={() => command("foreColor", color)}>{title}</button>)}
    </div>
    <div ref={editor} role="textbox" aria-label={label} aria-multiline="true" contentEditable={!disabled} suppressContentEditableWarning className={styles.editable} onInput={change} onMouseUp={remember} onKeyUp={remember} onBlur={remember}
      onPaste={e => { e.preventDefault(); command("insertText", e.clipboardData.getData("text/plain")); }} />
  </div>;
}
