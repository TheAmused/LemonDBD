// frontend/src/app/[locale]/streaks/killer/gauntlet-streak/page.tsx
import React from 'react';
import { GauntletBoard } from '@/components/streaks/gauntlet/GauntletBoard';
import { ChallengeModeGate } from '@/components/streaks/ChallengeModeGate';
import { parseGauntletGameMode } from '@/types/gauntletStreak';

export default async function KillerGauntletStreakPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { locale } = await params;
  const { mode } = await searchParams;
  return (
    <ChallengeModeGate mode="gauntlet" locale={locale} role="killer">
      <GauntletBoard locale={locale} role="killer" gameMode={parseGauntletGameMode(mode)} />
    </ChallengeModeGate>
  );
}
