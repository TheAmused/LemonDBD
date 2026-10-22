// frontend/src/app/[locale]/streaks/killer/page-streak/[killer]/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { PageStreakRunView } from '@/components/streaks/page-streak/PageStreakRunView';
import { ChallengeModeGate } from '@/components/streaks/ChallengeModeGate';
import { safeDecodeParam } from '@/utils/safeDecodeParam';
import { pageMetadata, withSegment } from '@/i18n/metadata';

// Its own canonical URL (the streaks layout's would point every challenge at /streaks).
export const generateMetadata = pageMetadata((p) => withSegment('/streaks/killer/page-streak', p.killer), (d) => ({ title: d.app.streaksPageTitle }));

export default async function PageStreakKillerPage({
  params,
}: {
  params: Promise<{ locale: string; killer: string }>;
}) {
  const { killer } = await params;
  const killerName = safeDecodeParam(killer);
  if (killerName === null) notFound();
  return (
    <ChallengeModeGate mode="page_streak">
      <PageStreakRunView killer={killerName} />
    </ChallengeModeGate>
  );
}
