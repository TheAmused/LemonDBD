// frontend/src/app/[locale]/admin/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { AdminPanelClient } from '@/components/admin/AdminPanelClient';

export const generateMetadata = pageMetadata('/admin', (d) => ({ title: d.app.adminPageTitle }), { noindex: true });

export default function AdminPage() {
  return <AdminPanelClient />;
}
