// frontend/src/app/[locale]/admin-entry/page.tsx
//
// Served by proxy.ts in place of /admin to anyone who is not a signed-in admin: the admin sign-in.
import { pageMetadata } from '@/i18n/metadata';
import { AdminEntryPage } from '@/components/admin/AdminEntryPage';

export const generateMetadata = pageMetadata('/admin-entry', (d) => ({ title: d.app.title }), { noindex: true });

export default function AdminEntryRoute() {
  return <AdminEntryPage />;
}
