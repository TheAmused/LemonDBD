// frontend/src/app/[locale]/streaks/killer/history-streak/page.tsx
import React from 'react';
import { HistoryBoard } from '@/components/streaks/history/HistoryBoard';

export default async function HistoryStreakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <HistoryBoard locale={locale} />;
}
