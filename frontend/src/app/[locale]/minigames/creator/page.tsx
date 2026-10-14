// frontend/src/app/[locale]/minigames/creator/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { MinigameCreatorClient } from '@/components/minigames/creator/MinigameCreatorClient';

export const generateMetadata = pageMetadata('/minigames/creator', (d) => ({ title: d.minigames.creatorPageTitle }));

export default function MinigameCreatorPage() {
  return <MinigameCreatorClient />;
}
