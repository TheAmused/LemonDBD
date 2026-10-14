import { pageMetadata } from '@/i18n/metadata';
import { MinigamesHubClient } from '@/features/minigames';

export const generateMetadata = pageMetadata('/minigames', (d) => ({ title: d.minigames.pageTitle }));

export default function MinigamesPage() {
  return <MinigamesHubClient />;
}
