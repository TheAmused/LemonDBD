'use client';
// frontend/src/components/layout/AppBackground.tsx
//
// THE page background -- one effect (campfire embers) on every page. Mounted ONCE in
// app/[locale]/layout.tsx, so it is never torn down between navigations. To change
// the background, change it here; pages never mount or configure one.
//
// Layer: fixed, -z-10 -- above the <body> background, below every page element, so
// page wrappers must NOT paint their own background colour.

import React from 'react';
import dynamic from 'next/dynamic';

const CampfireParticles = dynamic(
  () => import('@/components/common/CampfireParticles').then((m) => m.CampfireParticles),
  { ssr: false }
);

export function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <CampfireParticles className="absolute inset-0 h-full w-full opacity-90 transition-opacity duration-700" />
    </div>
  );
}
