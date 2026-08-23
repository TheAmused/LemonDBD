// frontend/src/app/[locale]/streaks/killer/gauntlet-streak/page.tsx
import React from 'react';
import { GauntletBoard } from '@/components/streaks/gauntlet/GauntletBoard';
import { ChallengeModeGate } from '@/components/streaks/ChallengeModeGate';

export default async function KillerGauntletStreakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ChallengeModeGate mode="gauntlet" locale={locale} role="killer">
      <GauntletBoard locale={locale} role="killer" />
    </ChallengeModeGate>
  );
}
