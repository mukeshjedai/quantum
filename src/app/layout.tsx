import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "AppLimit",
  description: "YouTube video translator, insights, flashcards, and wiki",
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
