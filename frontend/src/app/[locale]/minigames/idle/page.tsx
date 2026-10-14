// frontend/src/app/[locale]/minigames/idle/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { DbdIdleClient } from '@/components/minigames/DbdIdleClient';

export const generateMetadata = pageMetadata('/minigames/idle', (d) => ({ title: d.minigames.idlePageTitle }));

export default function DbdIdlePage() {
  return <DbdIdleClient />;
}
