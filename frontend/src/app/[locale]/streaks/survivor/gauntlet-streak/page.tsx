// frontend/src/app/[locale]/streaks/survivor/gauntlet-streak/page.tsx
import React from 'react';
import { GauntletBoard } from '@/components/streaks/gauntlet/GauntletBoard';
import { ChallengeModeGate } from '@/components/streaks/ChallengeModeGate';

export default async function SurvivorGauntletStreakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ChallengeModeGate mode="gauntlet" locale={locale} role="survivor">
      <GauntletBoard locale={locale} role="survivor" />
    </ChallengeModeGate>
  );
}
