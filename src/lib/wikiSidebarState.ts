export const WIKI_PANEL_STORAGE_KEY = "wiki-sidebar-panel-open-v1";
export const WIKI_PANEL_EVENT = "wiki-sidebar-panel";

export function loadWikiPanelOpen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(WIKI_PANEL_STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setWikiPanelOpen(open: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WIKI_PANEL_STORAGE_KEY, open ? "1" : "0");
  document.body.classList.toggle("wiki-sidebar-collapsed", !open);
  window.dispatchEvent(new CustomEvent(WIKI_PANEL_EVENT, { detail: { open } }));
}
