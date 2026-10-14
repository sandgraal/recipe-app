import type { Metadata } from 'next';

// Admin pages are for the owners only: never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
