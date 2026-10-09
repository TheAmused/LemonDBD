// frontend/src/components/smash-or-pass/hub/useHubOverlays.ts
import { useEffect, useState } from 'react';
import type { EntityItem } from '@/types/smashOrPass';
import { decodeArchetypeShare, type SharedArchetypePayload } from '@/utils/smashPersona';

/** Which modals, drawers and confirmations are open on the Hub. */
export function useHubOverlays(isPrefsOpen = false) {
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isPersonaOpen, setIsPersonaOpen] = useState<boolean>(false);
  const [sharedPayload, setSharedPayload] = useState<SharedArchetypePayload | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState<boolean>(false);
  const [selectedStatCharacter, setSelectedStatCharacter] = useState<EntityItem | null>(null);
  const [rosterPendingDelete, setRosterPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [exportingRosterId, setExportingRosterId] = useState<string | null>(null);

  // Decode Shared Archetype from URL query parameters if present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const encodedArchetype = searchParams.get('shared_archetype');
      if (encodedArchetype) {
        const decoded = decodeArchetypeShare(encodedArchetype);
        if (decoded) {
          setSharedPayload(decoded);
          setIsPersonaOpen(true);
        }
      }
    } catch {
      // Best-effort: failure here is non-fatal.
    }
  }, []);

  /** While any of these is up, the keyboard shortcuts that vote are off and the backdrop pauses. */
  const areModalsOpen =
    isLeaderboardOpen ||
    isPersonaOpen ||
    isResetConfirmOpen ||
    isHowToPlayOpen ||
    isPrefsOpen ||
    Boolean(selectedStatCharacter);

  return {
    isRosterModalOpen,
    setIsRosterModalOpen,
    isFilterDrawerOpen,
    setIsFilterDrawerOpen,
    isLeaderboardOpen,
    setIsLeaderboardOpen,
    isPersonaOpen,
    setIsPersonaOpen,
    sharedPayload,
    setSharedPayload,
    isResetConfirmOpen,
    setIsResetConfirmOpen,
    isHowToPlayOpen,
    setIsHowToPlayOpen,
    selectedStatCharacter,
    setSelectedStatCharacter,
    rosterPendingDelete,
    setRosterPendingDelete,
    isImportModalOpen,
    setIsImportModalOpen,
    exportingRosterId,
    setExportingRosterId,
    areModalsOpen,
  };
}
