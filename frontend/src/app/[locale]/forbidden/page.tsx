// frontend/src/app/[locale]/forbidden/page.tsx
import type { Metadata } from 'next';
import { ErrorPage } from '@/components/layout/ErrorPage';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ForbiddenPage() {
  return <ErrorPage variant="forbidden" />;
}
