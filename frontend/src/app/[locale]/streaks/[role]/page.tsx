// frontend/src/app/[locale]/streaks/[role]/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { StreakPanelGrid } from '@/features/streaks';
import { pageMetadata, withSegment } from '@/i18n/metadata';

// Its own canonical URL (the streaks layout's would point every challenge at /streaks).
export const generateMetadata = pageMetadata((p) => withSegment('/streaks', p.role), (d) => ({ title: d.app.streaksPageTitle }));

const VALID_ROLES = ['killer', 'survivor', 'challenge'] as const;
type StreakRole = (typeof VALID_ROLES)[number];

function isValidRole(r: string): r is StreakRole {
  return (VALID_ROLES as readonly string[]).includes(r);
}

export default async function RoleStreaksPage({
  params,
}: {
  params: Promise<{ locale: string; role: string }>;
}) {
  const { locale, role } = await params;
  if (!isValidRole(role)) {
    notFound();
  }
  return <StreakPanelGrid locale={locale} role={role} />;
}
