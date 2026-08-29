"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./SiteNav.module.css";
import WikiSearch from "./WikiSearch";
import { useAuth } from "@/lib/use-auth";
import {
  loadWikiPanelOpen,
  setWikiPanelOpen,
  WIKI_PANEL_EVENT,
} from "@/lib/wikiSidebarState";
const links = [
  { href: "/", label: "Translator" },
  { href: "/insights", label: "Insights" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/exams", label: "Exams", match: (p: string) => p === "/exams" || p.startsWith("/exams/") },
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
  const { user, loading, signOut } = useAuth();
  const onWiki = isWikiArea(pathname);
  const onLogin = pathname === "/login";
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

  const signInHref = `/api/auth/google?next=${encodeURIComponent(pathname || "/")}`;

  return (
    <header className={styles.nav} role="banner">
      <Link className={styles.brand} href="/">
        AppLimit
      </Link>
      {!onLogin ? (
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
      ) : null}
      <div className={styles.right}>
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
        <div className={styles.auth}>
          {loading ? (
            <span className={styles.authMuted}>…</span>
          ) : user ? (
            <>
              {user.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture}
                  alt=""
                  className={styles.avatar}
                  width={28}
                  height={28}
                />
              ) : null}
              <span className={styles.authName}>{user.name || user.email}</span>
              <button type="button" className={styles.authBtn} onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <Link className={styles.authBtn} href={signInHref}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
