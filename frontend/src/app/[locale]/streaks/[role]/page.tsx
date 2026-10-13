// frontend/src/app/[locale]/streaks/[role]/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { StreakPanelGrid } from '@/components/streaks/StreakPanelGrid';

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
