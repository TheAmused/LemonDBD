// frontend/src/app/[locale]/streaks/killer/page-streak/page.tsx
import React from 'react';
import { PageStreakBoard } from '@/components/streaks/PageStreakBoard';
import { ChallengeModeGate } from '@/components/streaks/ChallengeModeGate';
import { pageMetadata } from '@/i18n/metadata';

// Its own canonical URL (the streaks layout's would point every challenge at /streaks).
export const generateMetadata = pageMetadata('/streaks/killer/page-streak', (d) => ({ title: d.app.streaksPageTitle }));

export default async function PageStreakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ChallengeModeGate mode="page_streak">
      <PageStreakBoard locale={locale} />
    </ChallengeModeGate>
  );
}
