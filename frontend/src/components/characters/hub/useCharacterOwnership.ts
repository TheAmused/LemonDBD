// frontend/src/components/characters/hub/useCharacterOwnership.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildCharacterOwnershipDraft,
  changedCharacterUpdates,
  ownershipKey,
  ownsPerk,
} from '@/utils/characterUtils';
import { useAuth } from '@/context/AuthContext';
import { useDictionary } from '@/context/DictionaryContext';
import { invalidate } from '@/services/dataCache';
import { authHeaders } from '@/utils/api';
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
  const backendBase = getBackendBaseUrl();

  const [ownershipMode, setOwnershipMode] = useState<boolean>(false);
  const [ownershipLoading, setOwnershipLoading] = useState<boolean>(false);
  const [ownershipSaving, setOwnershipSaving] = useState<boolean>(false);
  const [ownershipSaveError, setOwnershipSaveError] = useState<string | null>(null);
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

  const handleToggleOwnershipMode = async () => {
    if (ownershipMode) {
      setOwnershipMode(false);
      return;
    }
    if (!isAuthenticated || !token || !user) {
      onLoginRequired();
      return;
    }
    if (!user.is_verified) {
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

      let charDraft: Record<string, boolean> = {};
      if (charsRes.ok) {
        const data = await charsRes.json();
        charDraft = buildCharacterOwnershipDraft(data.data as OwnedCharacter[]);
      }

      const perkDraft: Record<number, boolean> = {};
      let perksList: OwnedPerk[] = [];
      if (perksRes.ok) {
        const data = await perksRes.json();
        perksList = data.data as OwnedPerk[];
        perksList.forEach((p) => {
          perkDraft[p.perk_id] = p.is_unlocked;
        });
      }

      loadedCharacterOwnership.current = charDraft;
      setCharacterOwnershipDraft(charDraft);
      setPerkUnlockDraft(perkDraft);
      setAllPerks(perksList);
      setOwnershipMode(true);
    } catch (err: unknown) {
      console.error('Failed to load ownership state:', err);
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
      const perkUpdates = Object.entries(perkUnlockDraft).map(([perkId, isUnlocked]) => ({
        perk_id: Number(perkId),
        is_unlocked: isUnlocked,
      }));

      const charactersOk =
        characterUpdates.length === 0 || (await bulkUpdateCharacterOwnership(characterUpdates));
      const perksOk = perkUpdates.length === 0 || (await bulkUpdatePerkOwnership(perkUpdates));

      if (!charactersOk || !perksOk) {
        setOwnershipSaveError(dict.characterDetail.saveOwnershipError);
        return;
      }

      handleCancelOwnershipMode();
      triggerSavedModal();
      requestAnimationFrame(() => {
        setTimeout(() => {
          invalidate(`${backendBase}/api/v1/perks`);
          invalidate(`${backendBase}/api/v1/characters`);
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
