'use client';
// frontend/src/hooks/useGoogleConfig.ts

import { useEffect, useState } from 'react';
import { apiUrl } from '@/utils/api';
import { useSiteConfig } from '@/context/SiteConfigContext';

export type GoogleConfig = { clientId: string | null; signInEnabled: boolean };

/** The server's Google set-up: the client id whenever one is configured, and whether sign-in is switched on. */
export function parseGoogleConfig(body: unknown): GoogleConfig {
  if (typeof body !== 'object' || body === null) return { clientId: null, signInEnabled: false };
  const { enabled, client_id: clientId } = body as { enabled?: unknown; client_id?: unknown };
  return { clientId: typeof clientId === 'string' && clientId ? clientId : null, signInEnabled: enabled === true };
}

/**
 * The client id is server configuration and does not change while the page is open, so it is fetched
 * once. Whether sign-in is switched on is an admin setting: that comes from the site config, which
 * open tabs refresh, so switching it off hides the button without a reload.
 */
let cached: GoogleConfig | null = null;

/**
 * `sign-in` (the "Continue with Google" button) follows the admin's Google sign-in switch.
 * `confirm` (a Google-only account proving it is them, e.g. before deleting itself) only needs a
 * configured client id: that check still works while sign-in is switched off.
 */
export function useGoogleClientId(active: boolean, purpose: 'sign-in' | 'confirm' = 'sign-in'): string | null {
  const site = useSiteConfig();
  const switchedOff = purpose === 'sign-in' && site.loaded && !site.features.googleSignIn;
  const [config, setConfig] = useState<GoogleConfig | null>(cached);

  useEffect(() => {
    if (!active || switchedOff || cached !== null) return;
    const controller = new AbortController();
    fetch(apiUrl('/api/v1/auth/google/config'), { signal: controller.signal, cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body === null) return; // try again next time rather than caching a failed request
        cached = parseGoogleConfig(body);
        setConfig(cached);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [active, switchedOff]);

  if (!config?.clientId || switchedOff) return null;
  // Until the site config has loaded, the answer from /google/config decides.
  if (purpose === 'sign-in' && !site.loaded && !config.signInEnabled) return null;
  return config.clientId;
}
