// frontend/src/app/[locale]/rules/layout.tsx
import { pageMetadata } from '@/i18n/metadata';

export const generateMetadata = pageMetadata('/rules', (d) => ({ title: d.rules.pageTitle, description: d.rules.tagline }));

export default function RulesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
