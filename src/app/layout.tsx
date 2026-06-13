import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Recetas · Creaciones Colibrí",
  description: "A personal recipe collection — inspired by the flavors of Costa Rica and beyond.",
  // iOS standalone (Add to Home Screen) polish: full-screen, branded title.
  appleWebApp: { capable: true, title: "Colibrí", statusBarStyle: "default" },
};

// Match the browser UI (Android status bar, etc.) to the page background in each
// theme — cream in light, warm near-black in dark. Mirrors the globals.css tokens.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#17120f" },
  ],
};

// Root layout is minimal — nav/footer live in [lang]/layout.tsx.
// NOTE: <html lang> is "en" here; per-locale lang is corrected in Phase 2 (a11y).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Resolve theme before paint (no flash). Reads the explicit choice in
            localStorage, else follows the OS preference. Mirrors ThemeToggle. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();",
          }}
        />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cjnwvxtomwyszcfuvgpw.supabase.co" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
