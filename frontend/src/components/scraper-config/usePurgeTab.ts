// frontend/src/components/scraper-config/usePurgeTab.ts
import { useState } from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { authHeaders, getAuthToken, getErrorMessage } from '@/utils/api';
import { ALL_TARGETS, type TargetItem } from './scraperTargets';

/** Which tables to wipe, behind a confirmation, and the purge request itself. */
export function usePurgeTab(onPurgeSuccess?: () => void) {
  const dict = useDictionary();
  const apiBase = getBackendBaseUrl();
  const [purgeTargets, setPurgeTargets] = useState<string[]>([]);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [purgeSuccess, setPurgeSuccess] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState<boolean>(false);

  const togglePurgeTarget = (id: string) => {
    setPurgeTargets((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const toggleAllPurge = () => {
    if (purgeTargets.length === ALL_TARGETS.length) {
      setPurgeTargets([]);
    } else {
      setPurgeTargets(ALL_TARGETS.map((t) => t.id));
    }
  };

  const toggleGroupPurge = (groupKey: TargetItem['category']) => {
    const groupTargetIds = ALL_TARGETS.filter((t) => t.category === groupKey).map((t) => t.id);
    const allSelected = groupTargetIds.every((id) => purgeTargets.includes(id));
    if (allSelected) {
      setPurgeTargets((prev) => prev.filter((id) => !groupTargetIds.includes(id)));
    } else {
      setPurgeTargets((prev) => Array.from(new Set([...prev, ...groupTargetIds])));
    }
  };

  const handleExecutePurge = () => {
    if (purgeTargets.length === 0) {
      setPurgeError('Please select at least one table target to purge.');
      return;
    }

    setShowPurgeConfirm(true);
  };

  const runPurge = async () => {
    setShowPurgeConfirm(false);
    const token = getAuthToken();
    if (!token) {
      setPurgeError(dict.admin.tokenNotFound);
      return;
    }

    setIsPurging(true);
    setPurgeError(null);
    setPurgeSuccess(null);

    try {
      const res = await fetch(`${apiBase}/api/v1/admin/database/purge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
          'Cache-Control': 'no-cache, no-store',
          Pragma: 'no-cache',
        },
        cache: 'no-store',
        body: JSON.stringify({ targets: purgeTargets }),
      });

      const data = await res.json();
      if (res.ok) {
        setPurgeSuccess(data.message || 'Purged successfully.');
        setPurgeTargets([]);
        if (onPurgeSuccess) {
          await onPurgeSuccess();
        }
      } else {
        setPurgeError(data.error || 'Purge failed.');
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err, dict.admin.networkError);
      setPurgeError(message);
    } finally {
      setIsPurging(false);
    }
  };

  return {
    purgeTargets,
    isPurging,
    purgeError,
    purgeSuccess,
    showPurgeConfirm,
    setShowPurgeConfirm,
    togglePurgeTarget,
    toggleAllPurge,
    toggleGroupPurge,
    handleExecutePurge,
    runPurge,
  };
}
