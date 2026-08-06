"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./WikiSidebar.module.css";
import { parseApiError } from "@/lib/api";
import type { FolderLink, FolderNode } from "@/lib/types";

const STORAGE_KEY = "wiki-sidebar-expanded-v1";

function loadExpanded(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveExpanded(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

function linkHref(link: FolderLink): string {
  const url = (link.url || "").trim();
  if (url) return url;
  if (link.wiki_page_id) return `/wiki/${link.wiki_page_id}`;
  return "#";
}

function FolderTree({
  nodes,
  expanded,
  onToggle,
  onNewFile,
  onNewSubfolder,
  pathname,
  search,
}: {
  nodes: FolderNode[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onNewFile: (folderId: string) => void;
  onNewSubfolder: (folderId: string) => void;
  pathname: string;
  search: string;
}) {
  return (
    <ul className={styles.tree} role="tree">
      {nodes.map((node) => {
        const children = node.children || [];
        const links = node.links || [];
        const hasContent = children.length > 0 || links.length > 0;
        const isOpen = expanded.has(node.id);

        return (
          <li key={node.id} className={styles.folder} role="treeitem" aria-expanded={isOpen} aria-selected={false}>
            <div className={styles.folderRow}>
              <button
                type="button"
                className={`${styles.toggle} ${hasContent ? "" : styles.toggleEmpty}`}
                onClick={() => onToggle(node.id)}
                aria-label={isOpen ? "Collapse folder" : "Expand folder"}
              >
                {hasContent ? (isOpen ? "▼" : "▶") : ""}
              </button>
              <button type="button" className={styles.folderName} onClick={() => onToggle(node.id)}>
                {node.name}
              </button>
              <button
                type="button"
                className={`${styles.iconBtn} ${styles.iconBtnSubtle}`}
                title="New subfolder"
                onClick={() => onNewSubfolder(node.id)}
              >
                📁
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                title="New file in this folder"
                onClick={() => onNewFile(node.id)}
              >
                +
              </button>
            </div>
            {isOpen && (
              <div className={styles.folderBody}>
                {links.map((link) => {
                  const href = linkHref(link);
                  const editMatch = search.match(/[?&]edit=([^&]+)/);
                  const active =
                    (href.startsWith("/wiki/") && pathname === href) ||
                    pathname === href ||
                    (!!editMatch && link.wiki_page_id === editMatch[1]) ||
                    (!!link.wiki_page_id && pathname === `/wiki/${link.wiki_page_id}`);
                  return (
                    <a
                      key={link.id}
                      href={href}
                      className={`${styles.file} ${active ? styles.fileActive : ""}`}
                      title={link.title}
                    >
                      {link.title || "Untitled"}
                    </a>
                  );
                })}
                {children.length > 0 && (
                  <FolderTree
                    nodes={children}
                    expanded={expanded}
                    onToggle={onToggle}
                    onNewFile={onNewFile}
                    onNewSubfolder={onNewSubfolder}
                    pathname={pathname}
                    search={search}
                  />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function WikiSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [err, setErr] = useState("");
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("post_notes");
  const [folderName, setFolderName] = useState("");
  const [modalErr, setModalErr] = useState("");
  const [pendingFileFolderId, setPendingFileFolderId] = useState<string | null>(null);
  const [pendingFolderParentId, setPendingFolderParentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch(window.location.search);
  }, [pathname]);

  const refreshTree = useCallback(async () => {
    setErr("");
    try {
      const res = await fetch("/api/wiki/folders/tree");
      if (!res.ok) throw new Error(parseApiError(await res.text()));
      const data = await res.json();
      setTree(data.tree || []);
      if (data.warning) setErr(data.warning);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load folders.");
      setTree([]);
    }
  }, []);

  useEffect(() => {
    const exp = loadExpanded();
    setExpanded(exp);
    refreshTree();
  }, [refreshTree]);

  useEffect(() => {
    if (expanded.size === 0 && tree.length > 0) {
      const next = new Set(tree.map((n) => n.id));
      setExpanded(next);
      saveExpanded(next);
    }
  }, [tree, expanded.size]);

  const toggleFolder = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveExpanded(next);
      return next;
    });
  };

  const openFileModal = (folderId: string) => {
    setPendingFileFolderId(folderId);
    setFileName("");
    setFileType("post_notes");
    setModalErr("");
    setFileModalOpen(true);
  };

  const openFolderModal = (parentId: string | null) => {
    setPendingFolderParentId(parentId);
    setFolderName("");
    setModalErr("");
    setFolderModalOpen(true);
  };

  const createFile = async () => {
    const title = fileName.trim();
    if (!title) {
      setModalErr("File name is required.");
      return;
    }
    if (!pendingFileFolderId) return;
    setModalErr("");
    try {
      const res = await fetch("/api/wiki/folders/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder_id: pendingFileFolderId,
          title,
          page_type: fileType,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseApiError(JSON.stringify(data)) || data.detail);
      setFileModalOpen(false);
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(pendingFileFolderId);
        saveExpanded(next);
        return next;
      });
      await refreshTree();
      if (data.edit_url) router.push(data.edit_url);
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : "Could not create file.");
    }
  };

  const createFolder = async () => {
    const name = folderName.trim();
    if (!name) {
      setModalErr("Folder name is required.");
      return;
    }
    setModalErr("");
    try {
      const body: { name: string; parent_id?: string } = { name };
      if (pendingFolderParentId) body.parent_id = pendingFolderParentId;
      const res = await fetch("/api/wiki/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseApiError(JSON.stringify(data)) || data.detail);
      setFolderModalOpen(false);
      const folderId = data.folder?.id as string | undefined;
      setExpanded((prev) => {
        const next = new Set(prev);
        if (folderId) next.add(folderId);
        if (pendingFolderParentId) next.add(pendingFolderParentId);
        saveExpanded(next);
        return next;
      });
      await refreshTree();
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : "Could not create folder.");
    }
  };

  return (
    <>
      <aside className={styles.sidebar} aria-label="Wiki folders and files">
        <div className={styles.head}>
          <span className={styles.title}>Wiki files</span>
          <button
            type="button"
            className={styles.iconBtn}
            title="New folder"
            onClick={() => openFolderModal(null)}
          >
            +
          </button>
        </div>
        <div className={styles.body}>
          {tree.length === 0 ? (
            <p className={styles.empty}>No folders yet. Click + to create one.</p>
          ) : (
            <FolderTree
              nodes={tree}
              expanded={expanded}
              onToggle={toggleFolder}
              onNewFile={openFileModal}
              onNewSubfolder={openFolderModal}
              pathname={pathname}
              search={search}
            />
          )}
          {err ? <p className={styles.err}>{err}</p> : null}
        </div>
      </aside>

      {fileModalOpen && (
        <div className={styles.modal} role="dialog" onClick={() => setFileModalOpen(false)}>
          <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
            <h2>New file</h2>
            <label htmlFor="sidebar-file-name">File name</label>
            <input
              id="sidebar-file-name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. Lecture notes"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && createFile()}
            />
            <label htmlFor="sidebar-file-type">Type</label>
            <select
              id="sidebar-file-type"
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
            >
              <option value="post_notes">Post notes</option>
              <option value="manual">Paste notes</option>
            </select>
            {modalErr ? <p className={styles.modalErr}>{modalErr}</p> : null}
            <div className={styles.modalActions}>
              <button type="button" className="btn-secondary" onClick={() => setFileModalOpen(false)}>
                Cancel
              </button>
              <button type="button" onClick={createFile}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {folderModalOpen && (
        <div className={styles.modal} role="dialog" onClick={() => setFolderModalOpen(false)}>
          <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
            <h2>{pendingFolderParentId ? "New subfolder" : "New folder"}</h2>
            <label htmlFor="sidebar-folder-name">Folder name</label>
            <input
              id="sidebar-folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. Physics"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && createFolder()}
            />
            {modalErr ? <p className={styles.modalErr}>{modalErr}</p> : null}
            <div className={styles.modalActions}>
              <button type="button" className="btn-secondary" onClick={() => setFolderModalOpen(false)}>
                Cancel
              </button>
              <button type="button" onClick={createFolder}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
