import React from 'react';
import { PageStreakBoard } from '@/components/streaks/PageStreakBoard';

export default async function PageStreakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <PageStreakBoard locale={locale} />;
}
