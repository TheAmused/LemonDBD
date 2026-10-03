// frontend/src/app/[locale]/privacy-policy/layout.tsx
import { pageMetadata } from '@/i18n/metadata';

export const generateMetadata = pageMetadata('/privacy-policy', (d) => ({ title: d.privacy.pageTitle, description: d.privacy.intro.replace(/<\/?[a-z]+>/gi, '') }));

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
