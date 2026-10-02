// frontend/src/hooks/useSitePages.ts
'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '@/utils/api';
import { parseSitePagesStatus, type PageSlug, type SitePagesStatus } from '@/utils/sitePages';

const CACHE_MS = 15_000;
let cached: { at: number; status: SitePagesStatus } | null = null;
let inflight: Promise<SitePagesStatus | null> | null = null;
const listeners = new Set<(status: SitePagesStatus) => void>();

async function load(): Promise<SitePagesStatus | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.status;
  inflight ??= fetch(apiUrl('/api/v1/site/pages'), { credentials: 'include', cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((body) => {
      const status = parseSitePagesStatus(body);
      if (status) {
        cached = { at: Date.now(), status };
        listeners.forEach((notify) => notify(status));
      }
      return status;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Forget the cached status (after signing in/out or toggling a switch) and fetch it again. */
export function refreshSitePages(): void {
  cached = null;
  void load();
}

/**
 * Which pages are switched off, and whether the viewer is an admin (who still sees them).
 * The sidebar uses this to hide links; the real protection is the proxy + API guard.
 */
export function useSitePages(): { disabled: readonly PageSlug[]; isAdminViewer: boolean; isOff: (page: PageSlug) => boolean } {
  const [status, setStatus] = useState<SitePagesStatus | null>(cached?.status ?? null);

  useEffect(() => {
    listeners.add(setStatus);
    void load().then((next) => next && setStatus(next));
    return () => {
      listeners.delete(setStatus);
    };
  }, []);

  const disabled = status?.disabled ?? [];
  return {
    disabled,
    isAdminViewer: status?.viewer_is_admin === true,
    isOff: (page) => disabled.includes(page),
  };
}
