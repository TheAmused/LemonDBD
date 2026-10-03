// frontend/src/app/[locale]/welcome/layout.tsx
import { pageMetadata } from '@/i18n/metadata';

export const generateMetadata = pageMetadata('/welcome', (d) => ({ title: d.onboarding.pageTitle }), { noindex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
