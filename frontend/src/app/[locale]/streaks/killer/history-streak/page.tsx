// frontend/src/app/[locale]/streaks/killer/history-streak/page.tsx
import React from 'react';
import { HistoryBoard } from '@/components/streaks/history/HistoryBoard';
import { ChallengeModeGate } from '@/components/streaks/ChallengeModeGate';
import { pageMetadata } from '@/i18n/metadata';

// Its own canonical URL (the streaks layout's would point every challenge at /streaks).
export const generateMetadata = pageMetadata('/streaks/killer/history-streak', (d) => ({ title: d.app.streaksPageTitle }));

export default async function HistoryStreakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ChallengeModeGate mode="history">
      <HistoryBoard locale={locale} />
    </ChallengeModeGate>
  );
}
