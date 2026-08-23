// frontend/src/app/[locale]/streaks/killer/history-streak/page.tsx
import React from 'react';
import { HistoryBoard } from '@/components/streaks/history/HistoryBoard';
import { ChallengeModeGate } from '@/components/streaks/ChallengeModeGate';

export default async function HistoryStreakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ChallengeModeGate mode="history" locale={locale} role="killer">
      <HistoryBoard locale={locale} />
    </ChallengeModeGate>
  );
}
