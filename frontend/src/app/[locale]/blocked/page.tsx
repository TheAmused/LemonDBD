// frontend/src/app/[locale]/blocked/page.tsx
//
// What the proxy serves (via rewrite, so the address bar keeps the requested URL) to visitors who
// may not open an admin-only page.
import type { Metadata } from 'next';
import { ErrorPage } from '@/components/layout/ErrorPage';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function BlockedPage() {
  return <ErrorPage variant="blocked" />;
}
