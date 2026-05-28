import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recetas · Creaciones Colibrí",
  description: "A personal recipe collection — inspired by the flavors of Costa Rica and beyond.",
};

// Root layout is minimal — nav/footer live in [lang]/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
