import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Recetas · Creaciones Colibrí",
  description: "A personal recipe collection — inspired by the flavors of Costa Rica and beyond.",
};

// Root layout is minimal — nav/footer live in [lang]/layout.tsx.
// NOTE: <html lang> is "en" here; per-locale lang is corrected in Phase 2 (a11y).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cjnwvxtomwyszcfuvgpw.supabase.co" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
