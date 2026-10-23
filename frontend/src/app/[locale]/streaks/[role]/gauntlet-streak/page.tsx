// frontend/src/app/[locale]/streaks/[role]/gauntlet-streak/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { GauntletBoard } from '@/components/streaks/gauntlet/GauntletBoard';
import { ChallengeModeGate } from '@/components/streaks/ChallengeModeGate';
import type { Role } from '@/types/gauntletStreak';
import { parseGauntletGameMode } from '@/types/gauntletStreak';
import { pageMetadata, withSegment } from '@/i18n/metadata';

// Its own canonical URL (the streaks layout's would point every challenge at /streaks).
export const generateMetadata = pageMetadata((p) => `${withSegment('/streaks', p.role)}/gauntlet-streak`, (d) => ({ title: d.app.streaksPageTitle }));

const VALID_GAUNTLET_ROLES: Role[] = ['killer', 'survivor'];

export default async function RoleGauntletStreakPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; role: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { locale, role } = await params;
  if (!VALID_GAUNTLET_ROLES.includes(role as Role)) {
    notFound();
  }
  const { mode } = await searchParams;
  return (
    <ChallengeModeGate mode="gauntlet">
      <GauntletBoard locale={locale} role={role as Role} gameMode={parseGauntletGameMode(mode)} />
    </ChallengeModeGate>
  );
}
