'use client';
// frontend/src/components/scraper-config/usePurgeTab.ts
import { useState } from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { authFetch, getErrorMessage } from '@/utils/api';
import { EMPTY_REAUTH, reauthBody } from '@/components/admin/ReauthFields';
import type { Reauth } from '@/types/admin';
import { ALL_TARGETS, PURGEABLE_TARGET_IDS, PURGE_REQUIRES, withPurgeDependencies, type TargetItem } from './scraperTargets';
import { backupErrorMessage } from './backupErrors';

/** A selection that never leaves out a table something selected depends on. */
function dropDependents(selection: string[], removed: string[]): string[] {
  let next = selection.filter((id) => !removed.includes(id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of next) {
      if ((PURGE_REQUIRES[id] ?? []).some((dep) => !next.includes(dep))) {
        next = next.filter((other) => other !== id);
        changed = true;
      }
    }
  }
  return next;
}

/** Which tables to wipe, behind a confirmation, and the purge request itself. */
export function usePurgeTab(onPurgeSuccess?: () => void | Promise<void>) {
  const dict = useDictionary();
  const apiBase = getBackendBaseUrl();
  const [purgeTargets, setPurgeTargets] = useState<string[]>([]);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [purgeSuccess, setPurgeSuccess] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState<boolean>(false);
  const [reauth, setReauth] = useState<Reauth>(EMPTY_REAUTH);

  // Choosing a table also chooses what points at it (the server refuses the purge otherwise);
  // dropping one of those drops what needs it.
  const togglePurgeTarget = (id: string) => {
    setPurgeTargets((prev) => (prev.includes(id) ? dropDependents(prev, [id]) : withPurgeDependencies([...prev, id])));
  };

  const toggleAllPurge = () => {
    setPurgeTargets((prev) => (prev.length === PURGEABLE_TARGET_IDS.length ? [] : [...PURGEABLE_TARGET_IDS]));
  };

  const toggleGroupPurge = (groupKey: TargetItem['category']) => {
    const groupTargetIds = ALL_TARGETS.filter((t) => t.category === groupKey && PURGEABLE_TARGET_IDS.includes(t.id)).map((t) => t.id);
    setPurgeTargets((prev) =>
      groupTargetIds.every((id) => prev.includes(id)) ? dropDependents(prev, groupTargetIds) : withPurgeDependencies([...prev, ...groupTargetIds])
    );
  };

  const handleExecutePurge = () => {
    if (purgeTargets.length === 0) {
      setPurgeError(dict.admin.selectAtLeastOneTarget);
      return;
    }

    setReauth(EMPTY_REAUTH);
    setShowPurgeConfirm(true);
  };

  const runPurge = async () => {
    setShowPurgeConfirm(false);
    setIsPurging(true);
    setPurgeError(null);
    setPurgeSuccess(null);

    try {
      const res = await authFetch(`${apiBase}/api/v1/admin/database/purge`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reauthBody(reauth), targets: purgeTargets }),
      });
      if (!res.ok) throw new Error(await backupErrorMessage(res, dict.admin.purgeFailed, dict));

      setPurgeSuccess(dict.admin.purgeDone);
      setPurgeTargets([]);
      if (onPurgeSuccess) {
        await onPurgeSuccess();
      }
    } catch (err: unknown) {
      setPurgeError(getErrorMessage(err, dict.admin.networkError));
    } finally {
      setIsPurging(false);
      setReauth(EMPTY_REAUTH);
    }
  };

  return {
    purgeTargets,
    isPurging,
    purgeError,
    purgeSuccess,
    showPurgeConfirm,
    setShowPurgeConfirm,
    reauth,
    setReauth,
    togglePurgeTarget,
    toggleAllPurge,
    toggleGroupPurge,
    handleExecutePurge,
    runPurge,
  };
}
