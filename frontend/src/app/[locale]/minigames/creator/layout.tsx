// frontend/src/app/[locale]/minigames/creator/layout.tsx
import { pageMetadata } from '@/i18n/metadata';

export const generateMetadata = pageMetadata('/minigames/creator', (d) => ({ title: d.minigames.creatorPageTitle }));

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
