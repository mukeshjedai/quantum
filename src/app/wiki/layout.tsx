"use client";

import { useEffect } from "react";
import WikiSidebar from "@/components/WikiSidebar";

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add("wiki-with-sidebar");
    return () => document.body.classList.remove("wiki-with-sidebar");
  }, []);

  return (
    <>
      <WikiSidebar />
      {children}
    </>
  );
}
