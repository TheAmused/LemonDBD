// frontend/src/app/[locale]/user/layout.tsx
import { pageMetadata } from '@/i18n/metadata';

export const generateMetadata = pageMetadata('/user', (d) => ({ title: d.app.userPageTitle }), { noindex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
