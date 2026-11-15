'use client';
// frontend/src/components/smash-or-pass/hub/HubModals.tsx
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { useDictionary } from '@/context/DictionaryContext';
import type { EntityItem, LeaderboardItem, RosterItem } from '@/types/smashOrPass';
import { CharacterStatsModal, RomancePersonaModal, SmashLeaderboardModal } from './lazyParts';
import type { useHubOverlays } from './useHubOverlays';
import type { StoredVote } from './voteStorage';

interface HubModalsProps {
  locale: string;
  overlays: ReturnType<typeof useHubOverlays>;
  activeRoster: RosterItem;
  selectedRosterSlug: string;
  isAuthenticated: boolean;
  leaderboardItems: LeaderboardItem[];
  userSmashes: { slug: string; vote: 'smash' | 'pass'; timestamp: number }[];
  voteHistory: StoredVote[];
  onResetAllVotes: () => void;
}

/** The leaderboard, a character's stats, the romance persona, and the reset confirmation. */
export function HubModals({
  locale,
  overlays,
  activeRoster,
  selectedRosterSlug,
  isAuthenticated,
  leaderboardItems,
  userSmashes,
  voteHistory,
  onResetAllVotes,
}: HubModalsProps) {
  const dict = useDictionary();
  const {
    isLeaderboardOpen,
    setIsLeaderboardOpen,
    selectedStatCharacter,
    setSelectedStatCharacter,
    isPersonaOpen,
    setIsPersonaOpen,
    sharedPayload,
    setSharedPayload,
    isResetConfirmOpen,
    setIsResetConfirmOpen,
  } = overlays;

  return (
    <>
      <SmashLeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        items={leaderboardItems}
        userSmashes={userSmashes}
        editionName={activeRoster.name || selectedRosterSlug}
        isAuthenticated={isAuthenticated}
        onSelectCharacter={(char) => setSelectedStatCharacter(char as unknown as EntityItem)}
        locale={locale}
      />

      <CharacterStatsModal
        isOpen={Boolean(selectedStatCharacter)}
        onClose={() => setSelectedStatCharacter(null)}
        character={selectedStatCharacter}
        stats={selectedStatCharacter?.stat ?? undefined}
        locale={locale}
      />

      <RomancePersonaModal
        isOpen={isPersonaOpen}
        onClose={() => {
          setIsPersonaOpen(false);
          setSharedPayload(null);
        }}
        votes={voteHistory}
        sharedPayload={sharedPayload}
        onResetAll={() => setIsResetConfirmOpen(true)}
        locale={locale}
        customArchetypes={activeRoster?.romance_archetypes}
      />

      {/* RESET CONFIRMATION MODAL */}
      <Modal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        variant="confirm"
        layer="top"
        initialFocus="close"
        title={dict.smashOrPass.modals.resetConfirmTitle}
        footerClassName="flex justify-center"
        footer={
          <Button variant="danger" size="md" onClick={onResetAllVotes} className="w-full sm:w-auto min-w-40">
            {dict.smashOrPass.modals.confirm}
          </Button>
        }
      >
        <p className="px-6 py-5 text-center type-body text-text-muted">{dict.smashOrPass.modals.resetConfirmDesc}</p>
      </Modal>
    </>
  );
}
