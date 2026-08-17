import React from 'react';
import { GauntletBoard } from '@/components/streaks/gauntlet/GauntletBoard';

export default async function SurvivorGauntletStreakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <GauntletBoard locale={locale} role="survivor" />;
}
