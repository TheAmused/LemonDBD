'use client';
// frontend/src/app/[locale]/smash-or-pass/create/page.tsx

import React from 'react';
import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { SmashRosterCreator } from '@/components/smash-or-pass/creator/SmashRosterCreator';
import { useDictionary } from '@/context/DictionaryContext';
import { Locale } from '@/i18n/config';

const CampfireParticles = dynamic(
  () => import('@/components/common/CampfireParticles').then((m) => m.CampfireParticles),
  { ssr: false }
);

export default function SmashRosterCreatePage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const dict = useDictionary();
  // `?edit=<id>` -- the roster picker's Edit button on a local roster, and
  // the hub's own "My Rosters" management, both route here instead of a
  // separate edit screen. `SmashRosterCreator` prefills from that roster and
  // saves back onto it in place; only local (never official) rosters are
  // ever editable this way, since the backend has no roster-update endpoint.
  const editId = useSearchParams().get('edit') ?? undefined;

  if (!dict) return null;

  return (
    <PageShell
      locale={locale}
      dict={dict}
      activeCategory="smash-or-pass"
      padding="tight"
      decoration={<CampfireParticles />}
      mainClassName="relative flex flex-col"
    >
      <SmashRosterCreator locale={locale} dict={dict} editId={editId} />
    </PageShell>
  );
}
