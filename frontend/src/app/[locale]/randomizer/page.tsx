// frontend/src/app/[locale]/randomizer/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { RandomizerClient } from '@/components/generator/RandomizerClient';

export const generateMetadata = pageMetadata('/randomizer', (d) => ({ title: d.app.perkRandomizerPageTitle }));

export default function RandomizerPage() {
  return <RandomizerClient />;
}
