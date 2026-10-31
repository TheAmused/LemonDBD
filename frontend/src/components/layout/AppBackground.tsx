'use client';
// frontend/src/components/layout/AppBackground.tsx
//
// The one page-background host. Mounted ONCE in app/[locale]/layout.tsx, so the effect
// is never torn down between navigations. Which effect shows is decided by
// backgroundEffects.ts (default: campfire embers on every page); to add an effect,
// register its component in BACKGROUND_EFFECT_COMPONENTS below.
//
// Layer: fixed, -z-10 -- above the <body> background, below every page element, so
// page wrappers must NOT paint their own background colour.

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { i18n } from '@/i18n/config';
import { backgroundEffectForSegments, type BackgroundEffect } from '@/components/layout/backgroundEffects';

import { usePreferences } from '@/hooks/usePreferences';
import { DEFAULT_BACKGROUND_ANIMATION } from '@/utils/backgroundAnimation';

const CampfireParticles = dynamic(
  () => import('@/components/common/CampfireParticles').then((m) => m.CampfireParticles),
  { ssr: false }
);

export type BackgroundMode = 'on' | 'eco' | 'off';

export interface AppBackgroundProps {
  mode?: BackgroundMode;
}

/** Every effect component fills the host (absolute inset-0) and ignores pointer events. */
const BACKGROUND_EFFECT_COMPONENTS: Record<
  BackgroundEffect,
  React.ComponentType<{ className?: string; mode?: BackgroundMode }>
> = {
  campfire: CampfireParticles,
};

const EFFECT_CLASS = 'absolute inset-0 h-full w-full opacity-90 transition-opacity duration-700';

export const AppBackground: React.FC<AppBackgroundProps> = ({ mode: explicitMode }) => {
  const { preferences } = usePreferences();
  const mode = explicitMode ?? preferences?.backgroundAnimation ?? DEFAULT_BACKGROUND_ANIMATION;
  const pathname = usePathname() || '/';
  const effect = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length && (i18n.locales as readonly string[]).includes(segments[0])) segments.shift();
    return backgroundEffectForSegments(segments);
  }, [pathname]);
  const Effect = BACKGROUND_EFFECT_COMPONENTS[effect];

  if (mode === 'off') {
    return <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true" />;
  }

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <Effect className={EFFECT_CLASS} mode={mode} />
    </div>
  );
}
