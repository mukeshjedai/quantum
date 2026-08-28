"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { parseApiError } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import styles from "./WikiComments.module.css";

type WikiComment = {
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
  busy,
}: {
  comment: WikiComment;
  childrenByParent: Map<string, WikiComment[]>;
  collapsed: Set<string>;
  toggleCollapsed: (id: string) => void;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  submitReply: (parentId: string, body: string) => Promise<void>;
  busy: boolean;
}) {
  const replies = childrenByParent.get(comment.id) || [];
  const isCollapsed = collapsed.has(comment.id);
  const [reply, setReply] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reply.trim()) return;
    await submitReply(comment.id, reply);
    setReply("");
  };
  return <li className={styles.comment}>
    <div className={styles.meta}>
      {comment.author_picture ? <img className={styles.avatar} src={comment.author_picture} alt="" referrerPolicy="no-referrer" /> : null}
      <span className={styles.author}>{comment.author_name || comment.author_email || "Anonymous"}</span>
      <span>{comment.created_at ? new Date(comment.created_at).toLocaleString() : ""}</span>
    </div>
    {!isCollapsed ? <p className={styles.body}>{comment.body}</p> : null}
    <div className={styles.actions}>
      <button type="button" className={styles.smallButton} onClick={() => toggleCollapsed(comment.id)}>
        {isCollapsed ? `▶ Expand${replies.length ? ` (${replies.length})` : ""}` : "▼ Collapse"}
      </button>
      {!isCollapsed ? <button type="button" className={styles.smallButton} onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>Reply</button> : null}
    </div>
    {!isCollapsed && replyingTo === comment.id ? <form className={styles.replyForm} onSubmit={submit}>
      <textarea className={styles.textarea} value={reply} onChange={(event) => setReply(event.target.value)} placeholder={`Reply to ${comment.author_name || "comment"}…`} />
      <div className={styles.actions}>
        <button type="submit" disabled={busy || !reply.trim()}>Post reply</button>
        <button type="button" disabled={busy} onClick={() => setReplyingTo(null)}>Cancel</button>
      </div>
    </form> : null}
    {!isCollapsed && replies.length ? <ul className={styles.children}>
      {replies.map((replyComment) => <CommentItem key={replyComment.id} comment={replyComment} childrenByParent={childrenByParent} collapsed={collapsed} toggleCollapsed={toggleCollapsed} replyingTo={replyingTo} setReplyingTo={setReplyingTo} submitReply={submitReply} busy={busy} />)}
    </ul> : null}
  </li>;
}

export default function WikiComments({ pageId }: { pageId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<WikiComment[]>([]);
  const [body, setBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    return map;
  }, [comments]);

  const post = useCallback(async (commentBody: string, parentId?: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/wiki/pages/${pageId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: commentBody,
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

  const submitTopLevel = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    try {
      await post(body);
      setBody("");
    } catch { /* error is shown in the section */ }
  };
  const roots = childrenByParent.get("__root__") || [];
  return <section className={`card ${styles.root}`}>
    <h2 className={styles.heading}>Comments</h2>
    <form className={styles.composer} onSubmit={submitTopLevel}>
      <textarea className={styles.textarea} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Join the discussion…" />
      <button type="submit" disabled={busy || !body.trim()}>Post comment</button>
    </form>
    {error ? <p className={styles.error}>{error}</p> : null}
    {roots.length ? <ul className={styles.thread}>
      {roots.map((comment) => <CommentItem key={comment.id} comment={comment} childrenByParent={childrenByParent} collapsed={collapsed} toggleCollapsed={(id) => setCollapsed((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} replyingTo={replyingTo} setReplyingTo={setReplyingTo} submitReply={(parentId, replyBody) => post(replyBody, parentId)} busy={busy} />)}
    </ul> : <p className={styles.empty}>No comments yet. Start the discussion.</p>}
  </section>;
}
