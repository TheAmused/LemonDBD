// frontend/src/app/[locale]/minigames/play/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { PlayTrialClient } from '@/components/minigames/PlayTrialClient';

export const generateMetadata = pageMetadata('/minigames/play', (d) => ({ title: d.minigames.pageTitle }));

export default function PlayTrialPage() {
  return <PlayTrialClient />;
}
