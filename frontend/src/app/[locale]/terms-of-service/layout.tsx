// frontend/src/app/[locale]/terms-of-service/layout.tsx
import { pageMetadata } from '@/i18n/metadata';

export const generateMetadata = pageMetadata('/terms-of-service', (d) => ({ title: d.terms.pageTitle, description: d.terms.tagline }));

export default function TermsOfServiceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
