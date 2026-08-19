// frontend/src/components/streaks/chaos/useOwnedKillers.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function useOwnedKillers() {
  const { token, user } = useAuth();
  const [killers, setKillers] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const res = await fetch(`${backendBase}/api/v1/users/${user.id}/characters?role=Killer`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const owned = (data.data || []).filter((c: any) => c.is_owned);
        setKillers(owned.map((c: any) => c.name));
      }
    } catch (err) {
      console.error('Failed to load owned killers:', err);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    load();
  }, [load]);

  return { killers, loading, reload: load };
}
