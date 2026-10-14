import { pageMetadata } from '@/i18n/metadata';
import { AdminPanelClient } from '@/features/admin';

export const generateMetadata = pageMetadata('/admin', (d) => ({ title: d.app.adminPageTitle }), { noindex: true });

export default function AdminPage() {
  return <AdminPanelClient />;
}
