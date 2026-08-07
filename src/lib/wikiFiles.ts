import { parseApiError } from "@/lib/api";
import type { WikiAttachment } from "@/lib/types";

export type WikiFileUpload = WikiAttachment & {
  markdown: string;
  linked_to_page?: boolean;
};

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(gif|png|jpe?g|webp|avif|apng|svg)$/i.test(file.name);
}

export function allFilesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer?.files?.length) return [];
  return Array.from(dataTransfer.files);
}

export async function uploadWikiFile(file: File, pageId?: string | null): Promise<WikiFileUpload> {
  const form = new FormData();
  form.append("file", file);
  if (pageId) form.append("page_id", pageId);
  const res = await fetch("/api/wiki/files/upload", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(parseApiError(await res.text()));
  return res.json() as Promise<WikiFileUpload>;
}

export async function deleteWikiPageFile(pageId: string, fileId: string): Promise<WikiAttachment[]> {
  const res = await fetch(`/api/wiki/pages/${pageId}/files/${fileId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(parseApiError(await res.text()));
  const data = await res.json();
  return (data.attachments || []) as WikiAttachment[];
}

export function mergeAttachments(
  existing: WikiAttachment[],
  incoming: WikiAttachment[],
): WikiAttachment[] {
  const map = new Map<string, WikiAttachment>();
  for (const item of existing) map.set(item.id, item);
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
}
