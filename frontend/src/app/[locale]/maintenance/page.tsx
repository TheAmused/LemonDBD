// frontend/src/app/[locale]/maintenance/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { MaintenancePage } from '@/components/layout/MaintenancePage';

export const generateMetadata = pageMetadata('/maintenance', (d) => ({ title: `${d.app.title} - ${d.errorPages.maintenance.title}` }), { noindex: true });

export default function MaintenanceRoute() {
  return <MaintenancePage />;
}
