'use client';
// frontend/src/context/SiteConfigContext.tsx
//
// The public site configuration (banner, links, switches, limits), refreshed while the tab is open so an
// admin's change reaches visitors within minutes without a rebuild or a reload.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_SITE_CONFIG, fetchSiteConfig } from '@/services/siteConfig';
import type { SiteConfig } from '@/types/siteConfig';

const REFRESH_MS = 5 * 60 * 1000;

const SiteConfigContext = createContext<SiteConfig>(DEFAULT_SITE_CONFIG);

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);

  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      void fetchSiteConfig(controller.signal).then((next) => {
        if (next && !controller.signal.aborted) setConfig(next);
      });
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return <SiteConfigContext value={config}>{children}</SiteConfigContext>;
}

/** The current public configuration; the defaults outside the provider (and until the first answer). */
export function useSiteConfig(): SiteConfig {
  return useContext(SiteConfigContext);
}
