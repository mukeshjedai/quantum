"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteNav.module.css";

const links = [
  { href: "/", label: "Translator" },
  { href: "/insights", label: "Insights" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/wiki", label: "Wiki", match: (p: string) =>
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

export default function SiteNav() {
  const pathname = usePathname();

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
    </header>
  );
}
