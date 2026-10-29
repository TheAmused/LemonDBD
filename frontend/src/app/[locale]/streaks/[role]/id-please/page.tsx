// frontend/src/app/[locale]/streaks/[role]/id-please/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { IdPleaseBoard } from '@/components/streaks/id-please/IdPleaseBoard';
import { ChallengeModeGate } from '@/components/streaks/ChallengeModeGate';
import { pageMetadata, withSegment } from '@/i18n/metadata';
import { ID_PLEASE_MODE_BY_LANE, idPleaseLaneForRole } from '@/types/idPleaseStreak';

// Its own canonical URL (the streaks layout's would point every challenge at /streaks).
export const generateMetadata = pageMetadata((p) => `${withSegment('/streaks', p.role)}/id-please`, (d) => ({ title: d.app.streaksPageTitle }));

// Each tab is its own lane with its own runs, badges and kill switch: Survivor and Killer stay on their side, the combined tab alternates.
const VALID_ID_PLEASE_ROLES = ['killer', 'survivor', 'challenge'];

export default async function RoleIdPleasePage({ params }: { params: Promise<{ locale: string; role: string }> }) {
  const { role } = await params;
  if (!VALID_ID_PLEASE_ROLES.includes(role)) notFound();
  return (
    <ChallengeModeGate mode={ID_PLEASE_MODE_BY_LANE[idPleaseLaneForRole(role)]}>
      <IdPleaseBoard role={role} />
    </ChallengeModeGate>
  );
}
