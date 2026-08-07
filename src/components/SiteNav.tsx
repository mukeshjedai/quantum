"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./SiteNav.module.css";
import WikiSearch from "./WikiSearch";
import {
  loadWikiPanelOpen,
  setWikiPanelOpen,
  WIKI_PANEL_EVENT,
} from "@/lib/wikiSidebarState";

const links = [
  { href: "/", label: "Translator" },
  { href: "/insights", label: "Insights" },
  { href: "/flashcards", label: "Flashcards" },
  {
    href: "/wiki",
    label: "Wiki",
    match: (p: string) =>
      p === "/wiki" ||
      (p.startsWith("/wiki/") &&
        !p.startsWith("/wiki/paste") &&
        !p.startsWith("/wiki/post-notes")),
  },
  { href: "/wiki/paste", label: "Paste notes", match: (p: string) => p.startsWith("/wiki/paste") },
  { href: "/wiki/post-notes", label: "Post notes", match: (p: string) => p.startsWith("/wiki/post-notes") },
  {
    href: "/wiki/html-workspace",
    label: "HTML workspace",
    match: (p: string) =>
      p.startsWith("/wiki/html-workspace") || p.startsWith("/wiki/upload-html"),
  },
];

function isActive(pathname: string, href: string, match?: (p: string) => boolean) {
  if (match) return match(pathname);
  return pathname === href;
}

function isWikiArea(pathname: string) {
  return pathname === "/wiki" || pathname.startsWith("/wiki/");
}

export default function SiteNav() {
  const pathname = usePathname();
  const onWiki = isWikiArea(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!onWiki) return;
    setSidebarOpen(loadWikiPanelOpen());
    const onPanel = (e: Event) => {
      const ev = e as CustomEvent<{ open: boolean }>;
      setSidebarOpen(!!ev.detail?.open);
    };
    window.addEventListener(WIKI_PANEL_EVENT, onPanel);
    return () => window.removeEventListener(WIKI_PANEL_EVENT, onPanel);
  }, [onWiki]);

  return (
    <header className={styles.nav} role="banner">
      <Link className={styles.brand} href="/">
        AppLimit
      </Link>
      <nav className={styles.links} aria-label="Main navigation">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              isActive(pathname, link.href, link.match) ? styles.active : undefined
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {onWiki ? (
        <div className={styles.wikiTools}>
          <button
            type="button"
            className={styles.sidebarToggle}
            onClick={() => setWikiPanelOpen(!sidebarOpen)}
            title={sidebarOpen ? "Collapse wiki sidebar" : "Expand wiki sidebar"}
            aria-label={sidebarOpen ? "Collapse wiki sidebar" : "Expand wiki sidebar"}
            aria-pressed={sidebarOpen}
          >
            {sidebarOpen ? "◀ Sidebar" : "▶ Sidebar"}
          </button>
          <WikiSearch />
        </div>
      ) : null}
    </header>
  );
}
