// frontend/src/app/[locale]/streaks/killer/gauntlet-streak/page.tsx
import React from 'react';
import { GauntletBoard } from '@/components/streaks/gauntlet/GauntletBoard';

export default async function KillerGauntletStreakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <GauntletBoard locale={locale} role="killer" />;
}
