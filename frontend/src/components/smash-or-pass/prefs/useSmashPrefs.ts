// frontend/src/components/smash-or-pass/prefs/useSmashPrefs.ts
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchSmashPreferences, saveSmashPreferences } from '@/services/smashApi';
import { SmashSounds } from '../SmashSoundEffects';
import { defaultPrefs, readLocalPrefs, reconcilePrefs, writeLocalPrefs, type SmashPrefs } from './smashPrefs';

type Choice = Omit<SmashPrefs, 'chosenAt'>;

function toRemote(prefs: SmashPrefs) {
  return { effects: prefs.effects, sounds: prefs.sounds, music: prefs.music, chosen_at: prefs.chosenAt };
}

/**
 * The viewer's effects, sound-effects and music choice: applied the moment a switch is flipped,
 * kept in localStorage, saved on the account while signed in, and reconciled with the account's
 * copy whenever they sign in. Until a choice exists, nothing plays and nothing animates, and the
 * page puts the warning up.
 */
export function useSmashPrefs() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [prefs, setPrefs] = useState<SmashPrefs | null>(null);
  const [hasReadLocal, setHasReadLocal] = useState(false);
  const [accountCheckedFor, setAccountCheckedFor] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

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
      const account = remote
        ? { effects: remote.effects, sounds: remote.sounds ?? remote.effects, music: remote.music, chosenAt: remote.chosen_at }
        : null;
      const { prefs: winner, pushToAccount } = reconcilePrefs(readLocalPrefs(), account);
      if (winner) {
        writeLocalPrefs(winner);
        setPrefs(winner);
        if (pushToAccount) saveSmashPreferences(toRemote(winner)).catch(() => {});
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
  const sounds = prefs?.sounds ?? false;
  const music = prefs?.music ?? false;
  useEffect(() => {
    SmashSounds.applyPreferences({ sounds, music });
  }, [sounds, music]);

  /** Signed in, the page waits for the account's answer before asking: it may already have one. */
  const isSettled = hasReadLocal && !isAuthLoading && (userId === null || accountCheckedFor === userId);
  const needsChoice = isSettled && prefs === null;

  // The warning opens by itself for a first choice, and then stays up until it is closed -- a
  // switch flipped in it is a choice already, but the viewer should finish reading.
  useEffect(() => {
    if (needsChoice) setIsOpen(true);
  }, [needsChoice]);

  /** What the switches show: the saved choice, or the defaults while there is none. */
  const shown: Choice = prefs ?? defaultPrefs();

  /** Applies and saves a change at once. */
  const update = useCallback(
    (change: Partial<Choice>) => {
      const base: Choice = prefs ?? defaultPrefs();
      const next: SmashPrefs = { ...base, ...change, chosenAt: Date.now() };
      writeLocalPrefs(next);
      setPrefs(next);
      if (userId !== null) saveSmashPreferences(toRemote(next)).catch(() => {});
    },
    [prefs, userId]
  );

  /** Closing with no choice made yet accepts what the switches show. */
  const close = useCallback(() => {
    if (prefs === null) update({});
    setIsOpen(false);
  }, [prefs, update]);

  return {
    prefs,
    shown,
    effectsEnabled: effects,
    needsChoice,
    isOpen,
    openSettings: useCallback(() => setIsOpen(true), []),
    close,
    update,
  };
}
