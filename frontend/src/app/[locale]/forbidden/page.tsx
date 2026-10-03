// frontend/src/app/[locale]/forbidden/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { ErrorPage } from '@/components/layout/ErrorPage';

export const generateMetadata = pageMetadata('/forbidden', (d) => ({ title: `${d.app.title} - ${d.errorPages.forbidden.title}` }), { noindex: true });

export default function ForbiddenPage() {
  return <ErrorPage variant="forbidden" />;
}
