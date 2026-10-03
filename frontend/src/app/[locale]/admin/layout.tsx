// frontend/src/app/[locale]/admin/layout.tsx
import { pageMetadata } from '@/i18n/metadata';

export const generateMetadata = pageMetadata('/admin', (d) => ({ title: d.app.adminPageTitle }), { noindex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
