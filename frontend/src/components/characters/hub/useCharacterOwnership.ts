'use client';
// frontend/src/components/characters/hub/useCharacterOwnership.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildCharacterOwnershipDraft,
  changedCharacterUpdates,
  changedPerkUpdates,
  countChangedPerks,
  ownershipKey,
  ownsPerk,
} from '@/utils/characterUtils';
import { useAuth } from '@/context/AuthContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { mustConfirmEmail } from '@/utils/emailVerification';
import { useDictionary } from '@/context/DictionaryContext';
import { catalogKey, invalidate } from '@/services/dataCache';
import { authHeaders } from '@/utils/api';
import { trackEvent } from '@/utils/analytics';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import type { CharacterItem } from '@/components/character-detail/types';

interface OwnedCharacter {
  id: number;
  name: string;
  role: string;
  is_owned: boolean;
}

interface OwnedPerk {
  perk_id: number;
  name: string;
  /** Scoped to the perk's own role. Survivor 7 and killer 7 are different
   *  characters, so this is only meaningful next to `role`. */
  character_id: number | null;
  role: string;
  survivor_id: number | null;
  killer_id: number | null;
  is_teachable: boolean;
  is_unlocked: boolean;
  icon_url?: string;
  icon_local_path?: string;
}

interface CharacterOwnershipInput {
  locale: string;
  /** Entering ownership mode needs a signed-in user. */
  onLoginRequired: () => void;
  /** ...whose email is verified. */
  onVerificationRequired: () => void;
}

/** "My characters" mode: loads the user's ownership, edits it as a draft, and saves only what changed. */
export function useCharacterOwnership({ locale, onLoginRequired, onVerificationRequired }: CharacterOwnershipInput) {
  const dict = useDictionary();
  const { isAuthenticated, token, user, bulkUpdateCharacterOwnership, bulkUpdatePerkOwnership } = useAuth();
  const verificationRequired = useSiteConfig().features.emailVerificationRequired;
  const backendBase = getBackendBaseUrl();

  const [ownershipMode, setOwnershipMode] = useState<boolean>(false);
  const [ownershipLoading, setOwnershipLoading] = useState<boolean>(false);
  const [ownershipSaving, setOwnershipSaving] = useState<boolean>(false);
  const [ownershipSaveError, setOwnershipSaveError] = useState<string | null>(null);
  const [ownershipLoadError, setOwnershipLoadError] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState<boolean>(false);
  const [savedModalOpen, setSavedModalOpen] = useState<boolean>(false);
  const savedModalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeSavedModal = useCallback(() => {
    if (savedModalTimerRef.current) clearTimeout(savedModalTimerRef.current);
    setSavedModalOpen(false);
  }, []);

  const triggerSavedModal = useCallback(() => {
    if (savedModalTimerRef.current) clearTimeout(savedModalTimerRef.current);
    setSavedModalOpen(true);
    savedModalTimerRef.current = setTimeout(() => {
      closeSavedModal();
    }, 1800);
  }, [closeSavedModal]);

  useEffect(() => {
    return () => {
      if (savedModalTimerRef.current) clearTimeout(savedModalTimerRef.current);
    };
  }, []);

  // Keyed by "survivor:7" / "killer:7", not by a bare id: survivors and
  // killers are numbered separately now, so an id alone collides.
  const [characterOwnershipDraft, setCharacterOwnershipDraft] = useState<Record<string, boolean>>({});
  const loadedCharacterOwnership = useRef<Record<string, boolean>>({});
  const [perkUnlockDraft, setPerkUnlockDraft] = useState<Record<number, boolean>>({});
  const [allPerks, setAllPerks] = useState<OwnedPerk[]>([]);
  const [perksPopupCharacter, setPerksPopupCharacter] = useState<CharacterItem | null>(null);

  /** Unsaved changes: anything the save would send. */
  const isDirty = useMemo(
    () =>
      ownershipMode &&
      (changedCharacterUpdates(loadedCharacterOwnership.current, characterOwnershipDraft).length > 0 ||
        changedPerkUpdates(allPerks, perkUnlockDraft, new Set()).length > 0),
    [ownershipMode, characterOwnershipDraft, allPerks, perkUnlockDraft]
  );

  // A reload or a closed tab would silently lose the draft.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const handleToggleOwnershipMode = async () => {
    if (ownershipMode) {
      // "Exit selection" is the only way out without saving, so it throws the drafts away -- after asking, when there are any.
      if (isDirty) setDiscardConfirmOpen(true);
      else handleCancelOwnershipMode();
      return;
    }
    setOwnershipLoadError(null);
    if (!isAuthenticated || !token || !user) {
      trackEvent('ownership_blocked', { reason: 'login' });
      onLoginRequired();
      return;
    }
    if (mustConfirmEmail(user, verificationRequired)) {
      trackEvent('ownership_blocked', { reason: 'verify' });
      onVerificationRequired();
      return;
    }

    setOwnershipLoading(true);
    try {
      const [charsRes, perksRes] = await Promise.all([
        fetch(`${backendBase}/api/v1/users/${user.id}/characters`, {
          headers: authHeaders(token),
        }),
        fetch(`${backendBase}/api/v1/users/${user.id}/perks?lang=${locale}`, {
          headers: authHeaders(token),
        }),
      ]);

      // Both lists or nothing: opening the mode on a failed load showed every character as owned.
      if (!charsRes.ok || !perksRes.ok) {
        setOwnershipLoadError(dict.characterDetail.loadOwnershipError);
        return;
      }
      const charDraft = buildCharacterOwnershipDraft((await charsRes.json()).data as OwnedCharacter[]);
      const perksList = ((await perksRes.json()).data ?? []) as OwnedPerk[];
      const perkDraft: Record<number, boolean> = {};
      perksList.forEach((p) => {
        perkDraft[p.perk_id] = p.is_unlocked;
      });

      loadedCharacterOwnership.current = charDraft;
      setCharacterOwnershipDraft(charDraft);
      setPerkUnlockDraft(perkDraft);
      setAllPerks(perksList);
      setOwnershipMode(true);
      trackEvent('ownership_mode_enter');
    } catch (err: unknown) {
      console.error('Failed to load ownership state:', err);
      setOwnershipLoadError(dict.characterDetail.loadOwnershipError);
    } finally {
      setOwnershipLoading(false);
    }
  };

  const handleToggleCharacterOwned = (characterId: number, role: string) => {
    const key = ownershipKey(characterId, role);
    const newIsOwned = !(characterOwnershipDraft[key] ?? true);
    setCharacterOwnershipDraft((prev) => ({
      ...prev,
      [key]: newIsOwned,
    }));

    setPerkUnlockDraft((prev) => {
      const next = { ...prev };
      allPerks
        .filter((p) => ownsPerk(p, characterId, role))
        .forEach((p) => {
          next[p.perk_id] = newIsOwned;
        });
      return next;
    });
  };

  const handleTogglePerkUnlocked = (perkId: number) => {
    setPerkUnlockDraft((prev) => ({
      ...prev,
      [perkId]: !(prev[perkId] ?? true),
    }));
  };

  const handleCancelOwnershipMode = () => {
    setDiscardConfirmOpen(false);
    setOwnershipMode(false);
    setCharacterOwnershipDraft({});
    setPerkUnlockDraft({});
    setAllPerks([]);
    setPerksPopupCharacter(null);
    setOwnershipSaveError(null);
  };

  const handleSaveOwnership = async () => {
    setOwnershipSaving(true);
    setOwnershipSaveError(null);
    try {
      const characterUpdates = changedCharacterUpdates(
        loadedCharacterOwnership.current,
        characterOwnershipDraft,
      );
      // Only what changed (and the perks of changed characters): sending all ~320 perks on every
      // save cost the server two queries each.
      const perkUpdates = changedPerkUpdates(
        allPerks,
        perkUnlockDraft,
        new Set(characterUpdates.map((u) => ownershipKey(u.character_id, u.role)))
      );

      const charactersOk =
        characterUpdates.length === 0 || (await bulkUpdateCharacterOwnership(characterUpdates));
      const perksOk = perkUpdates.length === 0 || (await bulkUpdatePerkOwnership(perkUpdates));

      if (!charactersOk || !perksOk) {
        setOwnershipSaveError(dict.characterDetail.saveOwnershipError);
        return;
      }

      // Counted before the cancel below clears the drafts.
      trackEvent('ownership_save', {
        characters_changed: characterUpdates.length,
        perks_changed: countChangedPerks(allPerks, perkUnlockDraft),
      });

      handleCancelOwnershipMode();
      triggerSavedModal();
      requestAnimationFrame(() => {
        setTimeout(() => {
          invalidate(catalogKey('perks'));
          invalidate(catalogKey('characters'));
        }, 150);
      });
    } catch (err: unknown) {
      console.error('Failed to save ownership changes:', err);
      setOwnershipSaveError(dict.characterDetail.saveOwnershipError);
    } finally {
      setOwnershipSaving(false);
    }
  };

  const getCharacterPerkStats = (characterId?: number, role?: string) => {
    if (!characterId) return { total: 0, unlocked: 0 };
    const perksForChar = allPerks.filter((p) => ownsPerk(p, characterId, role));
    const unlocked = perksForChar.filter((p) => perkUnlockDraft[p.perk_id] ?? true).length;
    return { total: perksForChar.length, unlocked };
  };

  return {
    ownershipMode,
    ownershipLoading,
    ownershipSaving,
    ownershipSaveError,
    ownershipLoadError,
    discardConfirmOpen,
    keepEditing: () => setDiscardConfirmOpen(false),
    savedModalOpen,
    closeSavedModal,
    characterOwnershipDraft,
    allPerks,
    perkUnlockDraft,
    perksPopupCharacter,
    setPerksPopupCharacter,
    handleToggleOwnershipMode,
    handleToggleCharacterOwned,
    handleTogglePerkUnlocked,
    handleCancelOwnershipMode,
    handleSaveOwnership,
    getCharacterPerkStats,
  };
}
