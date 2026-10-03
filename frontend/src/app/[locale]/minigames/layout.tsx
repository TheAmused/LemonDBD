// frontend/src/app/[locale]/minigames/layout.tsx
import { pageMetadata } from '@/i18n/metadata';

export const generateMetadata = pageMetadata('/minigames', (d) => ({ title: d.minigames.pageTitle }));

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
