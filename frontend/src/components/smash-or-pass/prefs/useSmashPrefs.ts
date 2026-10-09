// frontend/src/components/smash-or-pass/prefs/useSmashPrefs.ts
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchSmashPreferences, saveSmashPreferences } from '@/services/smashApi';
import { SmashSounds } from '../SmashSoundEffects';
import { readLocalPrefs, reconcilePrefs, writeLocalPrefs, type SmashPrefs } from './smashPrefs';

/**
 * The viewer's effects and music choice: kept in localStorage, saved on the account while signed
 * in, and reconciled with the account's copy whenever they sign in. Until a choice exists,
 * nothing plays and nothing animates, and `needsChoice` asks the page to put the warning up.
 */
export function useSmashPrefs() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [prefs, setPrefs] = useState<SmashPrefs | null>(null);
  const [hasReadLocal, setHasReadLocal] = useState(false);
  const [accountCheckedFor, setAccountCheckedFor] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // localStorage is read after mount so the server render and the first client render agree.
  useEffect(() => {
    setPrefs(readLocalPrefs());
    setHasReadLocal(true);
  }, []);

  const userId = isAuthenticated ? (user?.id ?? null) : null;

  useEffect(() => {
    if (!hasReadLocal || isAuthLoading || userId === null || accountCheckedFor === userId) return;
    let cancelled = false;
    (async () => {
      const remote = await fetchSmashPreferences();
      if (cancelled) return;
      const account = remote ? { effects: remote.effects, music: remote.music, chosenAt: remote.chosen_at } : null;
      const { prefs: winner, pushToAccount } = reconcilePrefs(readLocalPrefs(), account);
      if (winner) {
        writeLocalPrefs(winner);
        setPrefs(winner);
        if (pushToAccount) {
          saveSmashPreferences({ effects: winner.effects, music: winner.music, chosen_at: winner.chosenAt }).catch(() => {});
        }
      }
      setAccountCheckedFor(userId);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasReadLocal, isAuthLoading, userId, accountCheckedFor]);

  // A different account signing in (or out and in) is reconciled afresh.
  useEffect(() => {
    if (userId === null) setAccountCheckedFor(null);
  }, [userId]);

  const effects = prefs?.effects ?? false;
  const music = prefs?.music ?? false;
  useEffect(() => {
    SmashSounds.applyPreferences({ effects, music });
  }, [effects, music]);

  /** Signed in, the page waits for the account's answer before asking: it may already have one. */
  const isSettled = hasReadLocal && !isAuthLoading && (userId === null || accountCheckedFor === userId);
  const needsChoice = isSettled && prefs === null;

  const save = useCallback(
    (choice: { effects: boolean; music: boolean }) => {
      const next: SmashPrefs = { ...choice, chosenAt: Date.now() };
      writeLocalPrefs(next);
      setPrefs(next);
      setIsSettingsOpen(false);
      if (userId !== null) {
        saveSmashPreferences({ effects: next.effects, music: next.music, chosen_at: next.chosenAt }).catch(() => {});
      }
    },
    [userId]
  );

  return {
    prefs,
    effectsEnabled: effects,
    musicEnabled: music,
    needsChoice,
    isSettingsOpen,
    openSettings: useCallback(() => setIsSettingsOpen(true), []),
    closeSettings: useCallback(() => setIsSettingsOpen(false), []),
    save,
  };
}
