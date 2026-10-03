// frontend/src/app/[locale]/reset-password/layout.tsx
import { pageMetadata } from '@/i18n/metadata';

export const generateMetadata = pageMetadata('/reset-password', (d) => ({ title: d.app.resetPasswordPageTitle }), { noindex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
