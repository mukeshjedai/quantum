import { parseApiError } from "@/lib/api";

export type WikiImageUpload = {
  url: string;
  markdown: string;
};

export type PasteTextBlock = {
  type: "text";
  content: string;
};

export type PasteImageBlock = {
  type: "image";
  alt: string;
  url: string;
  width?: number;
};

export type PasteBlock = PasteTextBlock | PasteImageBlock;

const IMAGE_MD_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;

export const DEFAULT_IMAGE_WIDTH = 480;
export const MIN_IMAGE_WIDTH = 120;
export const MAX_IMAGE_WIDTH = 900;

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

export function parseImageWidth(title: string | undefined): number | undefined {
  if (!title) return undefined;
  const match = /^width=(\d+)$/.exec(title.trim());
  if (!match) return undefined;
  const width = Number.parseInt(match[1], 10);
  if (!Number.isFinite(width)) return undefined;
  return Math.min(MAX_IMAGE_WIDTH, Math.max(MIN_IMAGE_WIDTH, width));
}

export function buildImageMarkdown(alt: string, url: string, width?: number): string {
  const safeAlt = alt.replace(/\]/g, "\\]");
  if (width) return `![${safeAlt}](${url} "width=${width}")`;
  return `![${safeAlt}](${url})`;
}

export function parsePasteBlocks(markdown: string): PasteBlock[] {
  const blocks: PasteBlock[] = [];
  let lastIndex = 0;
  const re = new RegExp(IMAGE_MD_RE.source, "g");
  let match: RegExpExecArray | null = re.exec(markdown);
  while (match) {
    if (match.index > lastIndex) {
      blocks.push({ type: "text", content: markdown.slice(lastIndex, match.index) });
    }
    blocks.push({
      type: "image",
      alt: match[1],
      url: match[2],
      width: parseImageWidth(match[3]),
    });
    lastIndex = re.lastIndex;
    match = re.exec(markdown);
  }
  if (lastIndex < markdown.length) {
    blocks.push({ type: "text", content: markdown.slice(lastIndex) });
  }
  if (!blocks.length) {
    blocks.push({ type: "text", content: markdown });
  }
  return blocks;
}

export function serializePasteBlocks(blocks: PasteBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "text") return block.content;
      return buildImageMarkdown(block.alt, block.url, block.width);
    })
    .join("");
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

export function insertImageIntoBlocks(
  blocks: PasteBlock[],
  focus: { blockIndex: number; start: number; end: number } | null,
  image: PasteImageBlock,
): PasteBlock[] {
  const next = [...blocks];
  const focusIndex = focus?.blockIndex ?? next.length - 1;
  const focusBlock = next[focusIndex];

  if (focusBlock?.type === "text") {
    const start = focus?.start ?? focusBlock.content.length;
    const end = focus?.end ?? start;
    const before = focusBlock.content.slice(0, start);
    const after = focusBlock.content.slice(end);
    next.splice(focusIndex, 1, { type: "text", content: before }, image, { type: "text", content: after });
    return next;
  }

  next.splice(focusIndex + 1, 0, image);
  return next;
}

export function insertTextIntoBlocks(
  blocks: PasteBlock[],
  focus: { blockIndex: number; start: number; end: number } | null,
  text: string,
): PasteBlock[] {
  const next = [...blocks];
  const focusIndex = focus?.blockIndex ?? next.length - 1;
  const focusBlock = next[focusIndex];
  const insert = text.endsWith("\n") ? text : `${text}\n`;

  if (focusBlock?.type === "text") {
    const start = focus?.start ?? focusBlock.content.length;
    const end = focus?.end ?? start;
    const before = focusBlock.content.slice(0, start);
    const after = focusBlock.content.slice(end);
    next[focusIndex] = { type: "text", content: `${before}${insert}${after}` };
    return next;
  }

  next.splice(focusIndex + 1, 0, { type: "text", content: insert });
  return next;
}

export function updateImageBlock(
  blocks: PasteBlock[],
  blockIndex: number,
  patch: Partial<Pick<PasteImageBlock, "alt" | "url" | "width">>,
): PasteBlock[] {
  const block = blocks[blockIndex];
  if (!block || block.type !== "image") return blocks;
  const next = [...blocks];
  next[blockIndex] = { ...block, ...patch };
  return next;
}

export function removeImageBlock(blocks: PasteBlock[], blockIndex: number): PasteBlock[] {
  const block = blocks[blockIndex];
  if (!block || block.type !== "image") return blocks;
  const next = blocks.filter((_, i) => i !== blockIndex);
  if (!next.length) return [{ type: "text", content: "" }];
  return next;
}

export function updateTextBlock(blocks: PasteBlock[], blockIndex: number, content: string): PasteBlock[] {
  const block = blocks[blockIndex];
  if (!block || block.type !== "text") return blocks;
  const next = [...blocks];
  next[blockIndex] = { type: "text", content };
  return next;
}

export function uploadResultToImageBlock(result: WikiImageUpload): PasteImageBlock {
  const altMatch = /!\[([^\]]*)\]/.exec(result.markdown || "");
  const urlMatch = /\]\(([^)\s]+)/.exec(result.markdown || "");
  return {
    type: "image",
    alt: altMatch?.[1] || "image",
    url: result.url || urlMatch?.[1] || "",
  };
}
