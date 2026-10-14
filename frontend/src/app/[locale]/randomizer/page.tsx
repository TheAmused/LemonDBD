import { Suspense } from 'react';
import { pageMetadata } from '@/i18n/metadata';
import { PageShellFallback } from '@/components/layout/PageShellFallback';
import { RandomizerPageSkeleton } from '@/components/generator/RandomizerSkeleton';
import { RandomizerClient } from '@/components/generator/RandomizerClient';

export const generateMetadata = pageMetadata('/randomizer', (d) => ({ title: d.app.perkRandomizerPageTitle }));

export default function RandomizerPage() {
  return (
    <Suspense
      fallback={
        <PageShellFallback
          padding="flush"
          mainClassName="min-h-screen overflow-y-auto flex flex-col"
          skeleton={<RandomizerPageSkeleton />}
        />
      }
    >
      <RandomizerClient />
    </Suspense>
  );
}
