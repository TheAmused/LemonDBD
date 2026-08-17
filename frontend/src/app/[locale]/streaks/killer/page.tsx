import React from 'react';
import { StreakPanelGrid } from '@/components/streaks/StreakPanelGrid';
import { KILLER_STREAK_PANELS } from '@/components/streaks/panels';

export default async function KillerStreaksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <StreakPanelGrid locale={locale} role="killer" panels={KILLER_STREAK_PANELS} />;
}
