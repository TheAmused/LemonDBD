'use client';
// frontend/src/components/layout/AppBackground.tsx
//
// The one page-background host. Mounted ONCE in app/[locale]/layout.tsx, so the
// canvas / fog is never torn down and rebuilt on navigation (no restarted loops,
// no re-randomised particles, no re-fetched chunk). Which effect shows comes from
// backgroundEffects.ts; a page whose route can't tell (error pages render under any
// URL) calls useBackgroundEffect() instead.
//
// Layer: fixed, -z-10 -- above the <body> background, below every page element.
// Page wrappers therefore must NOT paint their own background colour.

import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { i18n } from '@/i18n/config';
import { AmbientEmbers } from '@/components/layout/AmbientEmbers';
import {
  backgroundEffectForSegments,
  type BackgroundEffect,
} from '@/components/layout/backgroundEffects';

const CampfireParticles = dynamic(
  () => import('@/components/common/CampfireParticles').then((m) => m.CampfireParticles),
  { ssr: false }
);
const FogHeartbeatBackground = dynamic(
  () => import('@/components/landing/FogHeartbeatBackground').then((m) => m.FogHeartbeatBackground),
  { ssr: false }
);

const OverrideContext = createContext<(effect: BackgroundEffect | null) => void>(() => {});

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** For a page whose effect can't be derived from its URL (e.g. error pages). */
export function useBackgroundEffect(effect: BackgroundEffect) {
  const setOverride = useContext(OverrideContext);
  useIsomorphicLayoutEffect(() => {
    setOverride(effect);
    return () => setOverride(null);
  }, [effect, setOverride]);
}

const FILL = 'absolute inset-0 h-full w-full';

export function AppBackgroundProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const [override, setOverride] = useState<BackgroundEffect | null>(null);

  const routeEffect = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length && (i18n.locales as readonly string[]).includes(segments[0])) segments.shift();
    return backgroundEffectForSegments(segments);
  }, [pathname]);

  const effect = override ?? routeEffect;

  return (
    <OverrideContext.Provider value={setOverride}>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {effect === 'campfire' ? (
          <CampfireParticles className={FILL} />
        ) : effect === 'fog' ? (
          <FogHeartbeatBackground />
        ) : (
          <AmbientEmbers className={FILL} />
        )}
      </div>
      {children}
    </OverrideContext.Provider>
  );
}
