// frontend/src/app/[locale]/achievements/page.tsx
import React from 'react';
import { pageMetadata } from '@/i18n/metadata';
import { PageShell } from '@/components/layout/PageShell';
import { AchievementsHub } from '@/components/achievements/AchievementsHub';
import type { Locale } from '@/i18n/config';

export const generateMetadata = pageMetadata('/achievements', (d) => ({ title: d.app.achievementsPageTitle }));

export default async function AchievementsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  return (
    <PageShell locale={locale} padding="spacious">
      <AchievementsHub />
    </PageShell>
  );
}
