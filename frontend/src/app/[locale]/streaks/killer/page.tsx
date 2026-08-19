// frontend/src/app/[locale]/streaks/killer/page.tsx
import React from 'react';
import { StreakPanelGrid } from '@/components/streaks/StreakPanelGrid';

export default async function KillerStreaksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <StreakPanelGrid locale={locale} role="killer" />;
}
