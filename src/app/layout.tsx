import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenWiki",
  description: "Your knowledge wiki, AI active recall, exams, and flashcards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
