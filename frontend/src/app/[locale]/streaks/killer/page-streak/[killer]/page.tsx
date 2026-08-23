// frontend/src/app/[locale]/streaks/killer/page-streak/[killer]/page.tsx
import React from 'react';
import { PageStreakRunView } from '@/components/streaks/page-streak/PageStreakRunView';
import { ChallengeModeGate } from '@/components/streaks/ChallengeModeGate';

export default async function PageStreakKillerPage({
  params,
}: {
  params: Promise<{ locale: string; killer: string }>;
}) {
  const { locale, killer } = await params;
  return (
    <ChallengeModeGate mode="page_streak" locale={locale} role="killer">
      <PageStreakRunView locale={locale} killer={decodeURIComponent(killer)} />
    </ChallengeModeGate>
  );
}
