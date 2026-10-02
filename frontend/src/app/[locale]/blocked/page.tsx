// frontend/src/app/[locale]/blocked/page.tsx
//
// What the proxy serves (via rewrite, so the address bar keeps the requested URL) when a page has
// been switched off by an admin. `?page=` names the switched-off page.
import type { Metadata } from 'next';
import { ErrorPage } from '@/components/layout/ErrorPage';
import { isSwitchableSegment } from '@/utils/sitePages';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function BlockedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { page } = await searchParams;
  const requested = Array.isArray(page) ? page[0] : page;
  return <ErrorPage variant="blocked" pageId={isSwitchableSegment(requested) ? requested : null} />;
}
