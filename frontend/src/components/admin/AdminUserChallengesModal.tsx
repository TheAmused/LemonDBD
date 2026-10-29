'use client';
// frontend/src/components/admin/AdminUserChallengesModal.tsx
//
// One account's challenge progress: every challenge it has a run or a win in, with its completion status
// and a reset for each. Used to wipe the progress of someone who cheated.
import React, { useCallback, useEffect, useId, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { EmptyState } from '@/components/common/EmptyState';
import { FormField, Textarea } from '@/components/common/Field';
import { LoadingState } from '@/components/common/LoadingState';
import { Modal } from '@/components/common/Modal';
import { Surface } from '@/components/common/Surface';
import { useDictionary } from '@/context/DictionaryContext';
import { listUserChallenges, resetUserChallenge } from '@/services/adminApi';
import { getErrorMessage } from '@/utils/api';
import { formatMessage } from '@/utils/i18nFormat';
import type { ActionMessage, ChallengeMode, UserChallengeProgress, UserRow } from '@/types/admin';

/** Longest note the server accepts for the player's email. */
const NOTE_MAX_LENGTH = 500;

interface AdminUserChallengesModalProps {
  user: UserRow | null;
  notify: (message: ActionMessage) => void;
  onClose: () => void;
}

/** "killer_lemon_solo" reads "Killer lemon solo"; killer names and difficulties pass through. */
const variantLabel = (variant: string): string => {
  const spaced = variant.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

export function AdminUserChallengesModal({ user, notify, onClose }: AdminUserChallengesModalProps) {
  const dict = useDictionary();
  const t = dict.admin;
  const [loaded, setLoaded] = useState<{ userId: number; list: UserChallengeProgress[] } | null>(null);
  const [pending, setPending] = useState<UserChallengeProgress | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const noteId = useId();
  const userId = user?.id;
  // Still loading while the list on hand belongs to another user (or none was fetched yet).
  const challenges = loaded && loaded.userId === userId ? loaded.list : null;

  const modeLabel: Record<ChallengeMode, string> = {
    gauntlet: t.challengeModeGauntlet,
    chaos: t.challengeModeChaos,
    history: t.challengeModeHistory,
    page_streak: t.challengeModePageStreak,
    id_please: t.challengeModeIdPlease,
    id_please_survivor: t.challengeModeIdPleaseSurvivor,
    id_please_killer: t.challengeModeIdPleaseKiller,
  };
  const nameOf = (c: UserChallengeProgress) => `${modeLabel[c.mode]}: ${variantLabel(c.variant)}`;

  const load = useCallback(async (id: number): Promise<UserChallengeProgress[] | null> => {
    try {
      return (await listUserChallenges(id)).challenges;
    } catch (err: unknown) {
      notify({ type: 'error', text: getErrorMessage(err, t.networkError) });
      return null;
    }
  }, [notify, t.networkError]);

  useEffect(() => {
    if (userId === undefined) return;
    let cancelled = false;
    void load(userId).then((list) => {
      if (!cancelled) setLoaded({ userId, list: list ?? [] });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, load]);

  const closeConfirm = () => {
    setPending(null);
    setNote('');
  };

  const confirmReset = async () => {
    if (!user || !pending) return;
    setBusy(true);
    try {
      const { emailed } = await resetUserChallenge(user.id, pending, note.trim());
      notify(emailed
        ? { type: 'success', text: formatMessage(t.challengeResetDone, { challenge: nameOf(pending), username: user.username }) }
        : { type: 'error', text: t.challengeResetEmailFailed });
      setLoaded({ userId: user.id, list: await load(user.id) ?? [] });
    } catch (err: unknown) {
      notify({ type: 'error', text: getErrorMessage(err, t.networkError) });
    } finally {
      setBusy(false);
      closeConfirm();
    }
  };

  return (
    <>
      <Modal
        isOpen={user !== null}
        onClose={onClose}
        size="lg"
        title={t.challengesTitle}
        closeButtonAriaLabel={dict.modal.close}
        bodyClassName="p-5 sm:p-6"
      >
        {challenges === null ? (
          <LoadingState label={t.loadingChallenges} />
        ) : challenges.length === 0 ? (
          <EmptyState variant="inline" title={t.noChallenges} />
        ) : (
          <ul className="space-y-2.5">
            {challenges.map((c) => (
              <Surface as="li" key={`${c.mode}:${c.variant}`} tone="well" padding="sm" className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <p className="truncate type-strong text-text-primary">{nameOf(c)}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {c.current !== null && (
                      <span className="type-caption text-text-secondary">
                        {dict.streaks.streakLabel} {c.current}{c.total !== null && ` / ${c.total}`}
                      </span>
                    )}
                    {c.completed && <Badge tone="green" size="sm">{t.challengeCompleted}</Badge>}
                  </div>
                </div>
                <Button size="sm" leftIcon={<RotateCcw className="icon-sm" aria-hidden="true" />} onClick={() => setPending(c)}>
                  {t.resetChallenge}
                </Button>
              </Surface>
            ))}
          </ul>
        )}
      </Modal>

      <ConfirmModal
        open={pending !== null}
        title={t.resetChallengeTitle}
        message={
          <FormField label={t.challengeNoteLabel} htmlFor={noteId} hint={t.resetChallengeMessage} className="text-left">
            <Textarea
              id={noteId}
              rows={3}
              maxLength={NOTE_MAX_LENGTH}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormField>
        }
        confirmLabel={t.resetChallenge}
        closeButton="header"
        closeButtonAriaLabel={dict.modal.close}
        size="sm"
        busy={busy}
        onConfirm={() => void confirmReset()}
        onCancel={closeConfirm}
      />
    </>
  );
}
