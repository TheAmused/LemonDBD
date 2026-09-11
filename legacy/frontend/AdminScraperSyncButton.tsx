'use client';
// legacy/frontend/AdminScraperSyncButton.tsx
//
// Archived legacy Wiki scraper sync button and client-side trigger logic.
// Previously lived in frontend/src/components/admin/AdminHeader.tsx and frontend/src/app/[locale]/admin/page.tsx.

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { Dictionary } from '@/locales/types';

interface LegacyAdminScraperSyncButtonProps {
  apiBase: string;
  getAuthToken: () => string | null;
  dict?: Dictionary;
  onSuccess?: (charCount: number, perkCount: number) => void;
  onError?: (errorMessage: string) => void;
  onRefreshData?: () => Promise<void>;
}

export function LegacyAdminScraperSyncButton({
  apiBase,
  getAuthToken,
  dict,
  onSuccess,
  onError,
  onRefreshData,
}: LegacyAdminScraperSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');

  const handleTriggerSync = async () => {
    if (isSyncing) return;
    const token = getAuthToken();
    if (!token) {
      onError?.(dict?.admin?.tokenNotFound || 'Authentication token not found.');
      return;
    }

    setIsSyncing(true);
    setSyncStatus(dict?.admin?.scrapingWiki || 'Syncing database...');
    try {
      const res = await fetch(`${apiBase}/api/v1/scrape-and-seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data: { characters_synced?: number; perks_synced?: number } = await res.json();
        const charCount = data.characters_synced ?? 0;
        const perkCount = data.perks_synced ?? 0;
        onSuccess?.(charCount, perkCount);
      } else {
        const errorData: { error?: string; message?: string } = await res.json().catch(() => ({}));
        onError?.(errorData.error || errorData.message || dict?.admin?.syncFailedMsg || 'Scraper failed to sync data.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : dict?.admin?.networkError || 'Network error during sync.';
      onError?.(msg);
    } finally {
      setIsSyncing(false);
      setSyncStatus('');
      if (onRefreshData) {
        await onRefreshData();
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleTriggerSync}
      disabled={isSyncing}
      title={dict?.admin?.runScraperTitle || 'Sync Database'}
      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-red to-red-700 hover:from-red-500 hover:to-accent-red px-4 py-2 text-xs font-bold text-text-inverted shadow-md shadow-accent-red/20 transition-all cursor-pointer disabled:opacity-60 flex-1 sm:flex-initial"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
      <span>
        {isSyncing
          ? (dict?.admin?.syncingStatus || 'Syncing ({status})').replace('{status}', syncStatus)
          : dict?.admin?.syncScraper || 'Sync Scraper'}
      </span>
    </button>
  );
}
