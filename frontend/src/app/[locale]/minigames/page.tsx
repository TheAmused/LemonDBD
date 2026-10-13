// frontend/src/app/[locale]/minigames/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { MinigamesHubClient } from '@/components/minigames/MinigamesHubClient';

export const generateMetadata = pageMetadata('/minigames', (d) => ({ title: d.minigames.pageTitle }));

export default function MinigamesPage() {
  return <MinigamesHubClient />;
}
