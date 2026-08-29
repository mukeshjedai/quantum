/** Server-side fetch against the Azure Functions backend. */
export function getApiBase(): string {
  return process.env.APPLIMIT_API_URL || "http://localhost:7071";
}

/** Client-side paths use Next.js rewrites (/api/...). */
export function apiPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export async function serverFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${getApiBase()}${apiPath(path)}`;
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function parseApiError(raw: string): string {
  try {
    const j = JSON.parse(raw) as { detail?: string | unknown };
    if (typeof j.detail === "string") return j.detail;
    if (j.detail) return JSON.stringify(j.detail);
  } catch {
    /* ignore */
  }
  const text = raw.trim();
  if (/^<!doctype html|^<html/i.test(text)) {
    const title = text.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]
      ?.replace(/\s+/g, " ")
      .trim();
    return title || "The requested API endpoint was not found.";
  }
  return text.length > 500 ? `${text.slice(0, 500)}…` : text || "Request failed.";
}
