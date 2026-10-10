'use client';
// frontend/src/hooks/useDemoAccounts.ts
//
// Sign-in shortcuts for the development demo accounts. The credentials are never part
// of the bundle: the backend lists them only when it runs with FLASK_ENV=development
// (GET /api/v1/auth/demo-accounts) and answers an empty list otherwise, so in production
// this hook yields [] and the quick-fill buttons do not render.

import { useEffect, useState } from 'react';
import { apiUrl } from '@/utils/api';

export interface DemoAccount {
  role: 'admin' | 'player';
  username: string;
  password: string;
}

function isDemoAccount(value: unknown): value is DemoAccount {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.role === 'admin' || v.role === 'player') &&
    typeof v.username === 'string' &&
    typeof v.password === 'string'
  );
}

/** Parses the endpoint's body; anything unexpected (or `enabled: false`) means no demo accounts. */
export function parseDemoAccounts(body: unknown): DemoAccount[] {
  if (typeof body !== 'object' || body === null) return [];
  const { enabled, accounts } = body as { enabled?: unknown; accounts?: unknown };
  if (enabled !== true || !Array.isArray(accounts)) return [];
  return accounts.filter(isDemoAccount);
}

let cached: DemoAccount[] | null = null;

/** Demo accounts offered by the backend; fetched once, only while `active` (modal open). */
export function useDemoAccounts(active: boolean): DemoAccount[] {
  const [accounts, setAccounts] = useState<DemoAccount[]>(cached ?? []);

  useEffect(() => {
    if (!active || cached !== null) return;
    const controller = new AbortController();
    fetch(apiUrl('/api/v1/auth/demo-accounts'), { signal: controller.signal, cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        cached = parseDemoAccounts(body);
        setAccounts(cached);
      })
      .catch(() => {
        // Offline or aborted: show no shortcuts, and try again the next time the modal opens.
      });
    return () => controller.abort();
  }, [active]);

  return accounts;
}
