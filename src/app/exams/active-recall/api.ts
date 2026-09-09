import { parseApiError } from "@/lib/api";

export type RecallSession = { id: string; title: string; reference: string; prompts: string[]; source_page_id: string };
export type RecallAttempt = { id: string; responses: string[]; corrections: string; rating: string; created_at: string; next_review: string };

export async function recallApi<T>(path = "", body?: unknown): Promise<T> {
  const response = await fetch(`/api/active-recall${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(parseApiError(await response.text()));
  return response.json();
}
