// frontend/src/app/[locale]/streaks/survivor/page.tsx
import React from 'react';
import { StreakPanelGrid } from '@/components/streaks/StreakPanelGrid';
import { SURVIVOR_STREAK_PANELS } from '@/components/streaks/panels';

export default async function SurvivorStreaksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <StreakPanelGrid locale={locale} role="survivor" panels={SURVIVOR_STREAK_PANELS} />;
}
