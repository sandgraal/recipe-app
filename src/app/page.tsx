import { redirect } from 'next/navigation';

// Root redirect — middleware handles browser traffic, this catches SSR
export default function RootPage() {
  redirect('/en');
}
