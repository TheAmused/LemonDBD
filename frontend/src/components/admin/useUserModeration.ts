'use client';
// frontend/src/components/admin/useUserModeration.ts
//
// One user's moderation history and the decisions an admin can take about them.

import { logger } from '@/utils/logger';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import {
  fetchUserSanctions,
  issueSanction,
  restoreAccount,
  revokeSanction,
} from '@/services/moderationApi';
import { getErrorMessage } from '@/utils/api';
import { formatMessage } from '@/utils/i18nFormat';
import type { SanctionDraft, UserSanctions } from '@/types/moderation';
import type { ActionMessage } from '@/types/admin';

interface UserModerationInput {
  userId: number | null;
  username: string;
  /** The account's standing may have changed: refresh the user list. */
  onChanged: () => void;
  onActionMessage: (message: ActionMessage | null) => void;
}

export function useUserModeration({ userId, username, onChanged, onActionMessage }: UserModerationInput) {
  const t = useDictionary().moderation.admin;
  // The history is stored with the account it belongs to, and only shown for that account.
  const [loaded, setLoaded] = useState<{ userId: number; data: UserSanctions } | null>(null);
  const [reloading, setReloading] = useState(false);
  // The account whose first load has settled, and the one whose last load failed.
  const [settledFor, setSettledFor] = useState<number | null>(null);
  const [failedFor, setFailedFor] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  /**
   * Only the newest request may set state. Without this, opening user A and then user B could show
   * A's history -- and A's suggested next sanction -- in B's drawer when A's answer arrived last.
   */
  const latestRequest = useRef(0);

  /** Fetches the account's history; only the newest request's answer is kept. */
  const fetchHistory = useCallback((id: number) => {
    const request = ++latestRequest.current;
    const current = () => request === latestRequest.current;
    return fetchUserSanctions(id).then(
      (body) => {
        if (!current()) return;
        setLoaded({ userId: id, data: body });
        setFailedFor(null);
      },
      (err: unknown) => {
        logger.error('Failed to load the moderation history:', err);
        if (current()) setFailedFor(id);
      }
    );
  }, []);

  const load = useCallback(async () => {
    if (userId === null) return;
    setReloading(true);
    setFailedFor(null);
    try {
      await fetchHistory(userId);
    } finally {
      setReloading(false);
    }
  }, [userId, fetchHistory]);

  const data = loaded && loaded.userId === userId ? loaded.data : null;
  const loading = reloading || (userId !== null && settledFor !== userId);
  const loadFailed = userId !== null && failedFor === userId;

  useEffect(() => {
    if (userId === null) {
      latestRequest.current += 1; // the drawer closed: drop whatever is still in flight
      return;
    }
    void fetchHistory(userId).finally(() => setSettledFor(userId));
  }, [userId, fetchHistory]);

  /** Runs one decision; true when it was saved. The server's message is shown when it refuses. */
  const run = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    if (saving) return false;
    setSaving(true);
    try {
      await action();
      onActionMessage({ type: 'success', text: success });
      await load();
      onChanged();
      return true;
    } catch (err: unknown) {
      onActionMessage({ type: 'error', text: getErrorMessage(err, t.failed) });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    data,
    loading,
    loadFailed,
    saving,
    reload: load,
    issue: (draft: SanctionDraft) =>
      run(() => issueSanction(userId as number, draft), formatMessage(t.issued, { username })),
    revoke: (sanctionId: number, reason: string) => run(() => revokeSanction(sanctionId, reason), t.revoked),
    restore: (reason: string) =>
      run(() => restoreAccount(userId as number, reason), formatMessage(t.restored, { username })),
  };
}
