// frontend/src/app/[locale]/streaks/[role]/gauntlet-streak/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { GauntletBoard } from '@/components/streaks/gauntlet/GauntletBoard';
import { ChallengeModeGate } from '@/components/streaks/ChallengeModeGate';
import { parseGauntletGameMode, Role } from '@/types/gauntletStreak';

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
