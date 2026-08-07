"use client";

import { useEffect } from "react";
import WikiSidebar from "@/components/WikiSidebar";
import { loadWikiPanelOpen } from "@/lib/wikiSidebarState";

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add("wiki-with-sidebar");
    document.body.classList.toggle("wiki-sidebar-collapsed", !loadWikiPanelOpen());
    return () => {
      document.body.classList.remove("wiki-with-sidebar", "wiki-sidebar-collapsed");
    };
  }, []);

  return (
    <>
      <WikiSidebar />
      {children}
    </>
  );
}
