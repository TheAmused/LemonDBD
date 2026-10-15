'use client';
// frontend/src/components/admin/useUserModeration.ts
//
// One user's moderation history and the decisions an admin can take about them.

import { useCallback, useEffect, useState } from 'react';
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
  const [data, setData] = useState<UserSanctions | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (userId === null) return;
    setLoading(true);
    setLoadFailed(false);
    try {
      setData(await fetchUserSanctions(userId));
    } catch (err: unknown) {
      console.error('Failed to load the moderation history:', err);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setData(null);
    if (userId !== null) void load();
  }, [userId, load]);

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
