"use client";

import { usePathname } from "next/navigation";
import SiteNav from "@/components/SiteNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/sign-in";

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteNav />
      {children}
    </>
  );
}
