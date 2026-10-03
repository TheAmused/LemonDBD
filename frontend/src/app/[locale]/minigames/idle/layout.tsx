// frontend/src/app/[locale]/minigames/idle/layout.tsx
import { pageMetadata } from '@/i18n/metadata';

export const generateMetadata = pageMetadata('/minigames/idle', (d) => ({ title: d.minigames.idlePageTitle }));

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
