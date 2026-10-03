// frontend/src/app/[locale]/achievements/layout.tsx
import { pageMetadata } from '@/i18n/metadata';

export const generateMetadata = pageMetadata('/achievements', (d) => ({ title: d.app.achievementsPageTitle }));

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
