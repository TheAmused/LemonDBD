// frontend/src/app/[locale]/streaks/killer/page-streak/[killer]/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { PageStreakRunView } from '@/components/streaks/page-streak/PageStreakRunView';
import { ChallengeModeGate } from '@/components/streaks/ChallengeModeGate';

export default async function PageStreakKillerPage({
  params,
}: {
  params: Promise<{ locale: string; killer: string }>;
}) {
  const { killer } = await params;
  let killerName: string;
  try {
    killerName = decodeURIComponent(killer);
  } catch {
    notFound();
  }
  return (
    <ChallengeModeGate mode="page_streak">
      <PageStreakRunView killer={killerName} />
    </ChallengeModeGate>
  );
}
