// frontend/src/app/[locale]/streaks/killer/page-streak/page.tsx
import React from 'react';
import { PageStreakBoard } from '@/components/streaks/PageStreakBoard';
import { ChallengeModeGate } from '@/components/streaks/ChallengeModeGate';

export default async function PageStreakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ChallengeModeGate mode="page_streak" locale={locale} role="killer">
      <PageStreakBoard locale={locale} />
    </ChallengeModeGate>
  );
}
