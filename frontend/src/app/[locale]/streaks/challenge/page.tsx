// frontend/src/app/[locale]/streaks/challenge/page.tsx
import React from 'react';
import { StreakPanelGrid } from '@/components/streaks/StreakPanelGrid';

export default async function ChallengeStreaksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <StreakPanelGrid locale={locale} role="challenge" />;
}
