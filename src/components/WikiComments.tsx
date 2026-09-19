"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseApiError } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import RichCommentBody from "./RichCommentBody";
import CommentEditor from "./CommentEditor";
import WikiContent from "./WikiContent";
import styles from "./WikiComments.module.css";

type CommentColor = "red" | "black" | "blue";
type WikiComment = {
  content_format?: "markdown" | "html";
  color?: CommentColor;
  updated_at?: string;
  id: string;
  parent_id?: string | null;
  body: string;
  author_name?: string;
  author_email?: string;
  author_picture?: string;
  created_at?: string;
};

function CommentItem({
  comment,
  childrenByParent,
  collapsed,
  toggleCollapsed,
  replyingTo,
  setReplyingTo,
  submitReply,
  editComment,
  userEmail,
  busy,
}: {
  comment: WikiComment;
  childrenByParent: Map<string, WikiComment[]>;
  collapsed: Set<string>;
  toggleCollapsed: (id: string) => void;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  submitReply: (parentId: string, body: string, color: CommentColor) => Promise<void>;
  editComment: (id: string, body: string, color: CommentColor) => Promise<void>;
  userEmail: string;
  busy: boolean;
}) {
  const replies = childrenByParent.get(comment.id) || [];
  const isCollapsed = collapsed.has(comment.id);
  const [reply, setReply] = useState("");
  const replyColor: CommentColor = "black";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const draftColor: CommentColor = "black";
  const renderedBody = useRef<HTMLDivElement>(null);
  const canEdit = !!userEmail && comment.author_email?.toLowerCase() === userEmail.toLowerCase();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reply.trim()) return;
    try { await submitReply(comment.id, reply, replyColor); setReply(""); } catch { /* keep draft */ }
  };
  return <li className={styles.comment}>
    <div className={styles.meta}>
      {comment.author_picture ? <img className={styles.avatar} src={comment.author_picture} alt="" referrerPolicy="no-referrer" /> : null}
      <span className={styles.author}>{comment.author_name || comment.author_email || "Anonymous"}</span>
      <span>{comment.created_at ? new Date(comment.created_at).toLocaleString() : ""}</span>
    </div>
    {!isCollapsed ? (
      <div ref={renderedBody}>{comment.content_format === "html" ? <RichCommentBody html={comment.body} /> : <div className={styles[comment.color || "black"]}><WikiContent
        content={comment.body}
        pageType="manual"
        className={styles.body}
      /></div>}</div>
    ) : null}
    {comment.updated_at && <span className={styles.summary}>Edited {new Date(comment.updated_at).toLocaleString()}</span>}
    {!isCollapsed && editing && <form className={styles.replyForm} onSubmit={async e => { e.preventDefault(); try { await editComment(comment.id, draft, draftColor); setEditing(false); } catch { /* keep draft */ } }}>
      <CommentEditor label="Edit comment" value={draft} onChange={setDraft} disabled={busy} />
      <div className={styles.actions}><button disabled={busy || !draft.trim()}>Save changes</button><button type="button" disabled={busy} onClick={() => setEditing(false)}>Cancel</button></div>
    </form>}
    <div className={styles.actions}>
      {!isCollapsed && canEdit && !editing && <button type="button" className={styles.smallButton} onClick={() => { setDraft(comment.content_format === "html" ? comment.body : `<div style="color:${comment.color || "black"}">${renderedBody.current?.querySelector(".wiki-content")?.innerHTML || renderedBody.current?.firstElementChild?.firstElementChild?.innerHTML || ""}</div>`); setEditing(true); }}>Edit</button>}
      <button type="button" className={styles.smallButton} onClick={() => toggleCollapsed(comment.id)}>
        {isCollapsed ? `▶ Expand${replies.length ? ` (${replies.length})` : ""}` : "▼ Collapse"}
      </button>
      {!isCollapsed ? <button type="button" className={styles.smallButton} onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>Reply</button> : null}
    </div>
    {!isCollapsed && replyingTo === comment.id ? <form className={styles.replyForm} onSubmit={submit}>
      <CommentEditor label="Reply" value={reply} onChange={setReply} disabled={busy} />
      <div className={styles.actions}>
        <button type="submit" disabled={busy || !reply.trim()}>Post reply</button>
        <button type="button" disabled={busy} onClick={() => setReplyingTo(null)}>Cancel</button>
      </div>
    </form> : null}
    {!isCollapsed && replies.length ? <ul className={styles.children}>
      {replies.map((replyComment) => <CommentItem key={replyComment.id} comment={replyComment} childrenByParent={childrenByParent} collapsed={collapsed} toggleCollapsed={toggleCollapsed} replyingTo={replyingTo} setReplyingTo={setReplyingTo} submitReply={submitReply} editComment={editComment} userEmail={userEmail} busy={busy} />)}
    </ul> : null}
  </li>;
}

export default function WikiComments({ pageId }: { pageId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<WikiComment[]>([]);
  const [body, setBody] = useState("");
  const color: CommentColor = "black";
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sortOrder, setSortOrder] = useState<"oldest" | "newest">("oldest");

  useEffect(() => {
    void fetch(`/api/wiki/pages/${pageId}/comments`)
      .then(async (response) => {
        if (!response.ok) throw new Error(parseApiError(await response.text()));
        return response.json();
      })
      .then((data) => setComments(Array.isArray(data.comments) ? data.comments : []))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load comments."));
  }, [pageId]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, WikiComment[]>();
    for (const comment of comments) {
      const key = comment.parent_id || "__root__";
      const group = map.get(key) || [];
      group.push(comment);
      map.set(key, group);
    }
    const direction = sortOrder === "oldest" ? 1 : -1;
    for (const group of map.values()) {
      group.sort((left, right) => {
        const leftTime = left.created_at ? Date.parse(left.created_at) : 0;
        const rightTime = right.created_at ? Date.parse(right.created_at) : 0;
        return direction * (leftTime - rightTime);
      });
    }
    return map;
  }, [comments, sortOrder]);

  const post = useCallback(async (commentBody: string, parentId?: string, commentColor: CommentColor = "black") => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/wiki/pages/${pageId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: commentBody,
          content_format: "html",
          color: commentColor,
          parent_id: parentId || null,
          author_name: user?.name || user?.email || "Anonymous",
          author_email: user?.email || "",
          author_picture: user?.picture || "",
        }),
      });
      if (!response.ok) throw new Error(parseApiError(await response.text()));
      const data = await response.json();
      setComments(Array.isArray(data.comments) ? data.comments : [...comments, data.comment]);
      setReplyingTo(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not post comment.");
      throw reason;
    } finally {
      setBusy(false);
    }
  }, [comments, pageId, user]);

  const editComment = async (id: string, text: string, selectedColor: CommentColor) => {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/wiki/pages/${pageId}/comments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text, color: selectedColor, content_format: "html" }) });
      if (!response.ok) throw new Error(parseApiError(await response.text()));
      const data = await response.json(); setComments(data.comments);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not edit comment."); throw reason; }
    finally { setBusy(false); }
  };
  const submitTopLevel = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    try {
      await post(body, undefined, color);
      setBody("");
    } catch { /* error is shown in the section */ }
  };
  const roots = childrenByParent.get("__root__") || [];
  return <section className={`card ${styles.root}`}>
    <div className={styles.header}>
      <div>
        <h2 className={styles.heading}>Comments</h2>
        <span className={styles.summary}>
          {comments.length} {comments.length === 1 ? "comment" : "comments"} in {roots.length} {roots.length === 1 ? "thread" : "threads"}
        </span>
      </div>
      {comments.length ? <div className={styles.organizeControls} aria-label="Organize comments">
        <label className={styles.sortLabel}>
          Sort
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "oldest" | "newest")}>
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
        <button type="button" className={styles.controlButton} onClick={() => setCollapsed(new Set())}>Expand all</button>
        <button type="button" className={styles.controlButton} onClick={() => setCollapsed(new Set(comments.map((comment) => comment.id)))}>Collapse all</button>
      </div> : null}
    </div>
    <form className={styles.composer} onSubmit={submitTopLevel}>
      <CommentEditor label="New comment" value={body} onChange={setBody} disabled={busy} />
      <button type="submit" disabled={busy || !body.trim()}>Post comment</button>
    </form>
    {error ? <p className={styles.error}>{error}</p> : null}
    {roots.length ? <ul className={styles.thread}>
      {roots.map((comment) => <CommentItem key={comment.id} comment={comment} childrenByParent={childrenByParent} collapsed={collapsed} toggleCollapsed={(id) => setCollapsed((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} replyingTo={replyingTo} setReplyingTo={setReplyingTo} submitReply={(parentId, replyBody, replyColor) => post(replyBody, parentId, replyColor)} editComment={editComment} userEmail={user?.email || ""} busy={busy} />)}
    </ul> : <p className={styles.empty}>No comments yet. Start the discussion.</p>}
  </section>;
}
