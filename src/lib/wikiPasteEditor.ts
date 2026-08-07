import { parseApiError } from "@/lib/api";

export type WikiImageUpload = {
  url: string;
  markdown: string;
};

export async function uploadWikiImage(file: File): Promise<WikiImageUpload> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/wiki/manual/upload-image", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(parseApiError(await res.text()));
  return res.json() as Promise<WikiImageUpload>;
}

export function insertAtCursor(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  text: string,
  paragraphBreak = false,
): { value: string; cursor: number } {
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  let insert = text;
  if (paragraphBreak) {
    const prefix = before && !before.endsWith("\n") ? "\n\n" : "";
    const suffix = after && !after.startsWith("\n") ? "\n\n" : "";
    insert = prefix + text + suffix;
  }
  const next = before + insert + after;
  return { value: next, cursor: before.length + insert.length };
}

export function imageFilesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) return [];
  return Array.from(dataTransfer.files).filter(
    (file) => file.type.startsWith("image/") || /\.(gif|png|jpe?g|webp|avif|apng)$/i.test(file.name),
  );
}

export function imageFilesFromClipboard(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer?.items) return [];
  const files: File[] = [];
  for (const item of dataTransfer.items) {
    if (item.type?.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  return files;
}
