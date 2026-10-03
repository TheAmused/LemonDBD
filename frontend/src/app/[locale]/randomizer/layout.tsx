// frontend/src/app/[locale]/randomizer/layout.tsx
import { pageMetadata } from '@/i18n/metadata';

export const generateMetadata = pageMetadata('/randomizer', (d) => ({ title: d.app.perkRandomizerPageTitle }));

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
