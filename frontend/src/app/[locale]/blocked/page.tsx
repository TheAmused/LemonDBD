// frontend/src/app/[locale]/blocked/page.tsx
//
// What the proxy serves (via rewrite, so the address bar keeps the requested URL) to visitors who
// may not open an admin-only page.
import { pageMetadata } from '@/i18n/metadata';
import { ErrorPage } from '@/components/layout/ErrorPage';

export const generateMetadata = pageMetadata('/blocked', (d) => ({ title: `${d.app.title} - ${d.errorPages.blocked.title}` }), { noindex: true });

export default function BlockedPage() {
  return <ErrorPage variant="blocked" />;
}
