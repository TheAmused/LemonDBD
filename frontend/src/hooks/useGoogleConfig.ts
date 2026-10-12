'use client';
// frontend/src/hooks/useGoogleConfig.ts

import { useEffect, useState } from 'react';
import { apiUrl } from '@/utils/api';

export function parseGoogleClientId(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const { enabled, client_id: clientId } = body as { enabled?: unknown; client_id?: unknown };
  return enabled === true && typeof clientId === 'string' && clientId ? clientId : null;
}

let cached: { clientId: string | null } | null = null;

export function useGoogleClientId(active: boolean): string | null {
  const [clientId, setClientId] = useState<string | null>(cached?.clientId ?? null);

  useEffect(() => {
    if (!active || cached !== null) return;
    const controller = new AbortController();
    fetch(apiUrl('/api/v1/auth/google/config'), { signal: controller.signal, cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        cached = { clientId: parseGoogleClientId(body) };
        setClientId(cached.clientId);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [active]);

  return clientId;
}
