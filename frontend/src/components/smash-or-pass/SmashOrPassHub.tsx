'use client';
// frontend/src/components/smash-or-pass/SmashOrPassHub.tsx
import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useDictionary } from '@/context/DictionaryContext';
import { AuthRequiredState } from '@/components/common/AuthRequiredState';
import { Alert } from '@/components/common/Alert';
import { isLocalRosterSlug } from '@/utils/smashOrPass/localRoster';
import { SmashSounds } from './SmashSoundEffects';
import { CardArena } from './hub/CardArena';
import { HowToPlayModal } from './hub/HowToPlayModal';
import { HubFilterDrawer } from './hub/HubFilterDrawer';
import { HubHeader } from './hub/HubHeader';
import { HubModals } from './hub/HubModals';
import { RosterModals } from './hub/RosterModals';
import { FloatingLoreScattered, InteractiveDragBackground, SmashAnimations } from './hub/lazyParts';
import { useCardExit } from './hub/useCardExit';
import { useHubHotkeys } from './hub/useHubHotkeys';
import { CalmVoteMark } from './hub/CalmVoteMark';
import { useHubOverlays } from './hub/useHubOverlays';
import {
  PreferencesPromptModal,
  isSmashEntryAcknowledged,
  markSmashEntryAcknowledged,
} from '@/components/common/PreferencesPromptModal';
import { usePreferences } from '@/hooks/usePreferences';
import { useOnceInBrowser } from '@/hooks/useOnceInBrowser';
import { useSmashPrefs } from './prefs/useSmashPrefs';
import { useSmashDeck } from './hub/useSmashDeck';
import { useSmashRosters } from './hub/useSmashRosters';
import { useSmashSound } from './hub/useSmashSound';
import { useSmashVoting } from './hub/useSmashVoting';
import { useSmashVotes } from './hub/useSmashVotes';
import { trackEvent } from '@/utils/analytics';

interface SmashOrPassHubProps {
  locale?: string;
}

export const SmashOrPassHub: React.FC<SmashOrPassHubProps> = ({ locale = 'en' }) => {
  const router = useRouter();
  const dict = useDictionary();
  const { isAuthenticated } = useAuth();
  const { isConfigured } = usePreferences();
  const [smashAck, setSmashAck] = useState<boolean>(true);
  const [promptDismissed, setPromptDismissed] = useState<boolean>(false);

  useOnceInBrowser(() => {
    setSmashAck(isSmashEntryAcknowledged());
  });

  // Order matters: the votes' initial state reads the roster the rosters hook just restored.
  const rosters = useSmashRosters(locale);
  const { activeRoster, selectedRosterSlug } = rosters;
  const { effectsEnabled } = useSmashPrefs();
  const isPromptOpen = (!smashAck || !isConfigured) && !promptDismissed;
  const overlays = useHubOverlays(isPromptOpen);
  const exit = useCardExit();
  useSmashSound();

  const deck = useSmashDeck({
    selectedRosterSlug,
    customRosterStore: rosters.customRosterStore,
    onFeedSettled: exit.resetExit,
  });
  const votes = useSmashVotes(selectedRosterSlug);

  const { finishExit } = exit;
  const { advance, loadFeed, loadLeaderboard } = deck;
  const handleExitComplete = useCallback(() => {
    if (finishExit()) {
      advance();
    }
  }, [finishExit, advance]);

  const { handleVote, animTrigger } = useSmashVoting({
    currentCharacter: deck.currentCharacter,
    selectedRosterSlug,
    exit,
    onExitComplete: handleExitComplete,
    recordVote: votes.recordVote,
    setLeaderboardItems: deck.setLeaderboardItems,
    loadLeaderboard,
    effectsEnabled,
  });

  const { setIsResetConfirmOpen, setIsHowToPlayOpen, setSelectedStatCharacter } = overlays;
  const { clearVotes } = votes;
  const { resetFilters } = deck;
  const [resetFailed, setResetFailed] = useState<boolean>(false);
  const handleResetAllVotes = useCallback(async () => {
    setIsResetConfirmOpen(false);
    const cleared = await clearVotes();
    setResetFailed(!cleared);
    if (!cleared) return;
    trackEvent('smash_reset');
    resetFilters();
    await loadFeed();
    await loadLeaderboard();
    SmashSounds.playFlipSound();
  }, [setIsResetConfirmOpen, clearVotes, resetFilters, loadFeed, loadLeaderboard]);

  const toggleHowToPlay = useCallback(() => setIsHowToPlayOpen((prev) => !prev), [setIsHowToPlayOpen]);
  const openResetConfirm = useCallback(() => setIsResetConfirmOpen(true), [setIsResetConfirmOpen]);
  const castVote = useCallback(
    (vote: 'smash' | 'pass', origin?: { x: number; y: number }) => {
      void handleVote(vote, origin);
    },
    [handleVote]
  );
  useHubHotkeys({
    areModalsOpen: overlays.areModalsOpen,
    currentCharacter: deck.currentCharacter,
    isExiting: exit.isExiting,
    handleVote: castVote,
    toggleHowToPlay,
    openStats: setSelectedStatCharacter,
    openResetConfirm,
  });

  // Auto-refresh leaderboard when the Hall of Fame modal opens
  const { isLeaderboardOpen } = overlays;
  useEffect(() => {
    if (isLeaderboardOpen) {
      void loadLeaderboard();
    }
  }, [isLeaderboardOpen, loadLeaderboard]);

  // Opening events fire on the closed to open transition, not whenever a dependency changes.
  const isOwnPersonaOpen = overlays.isPersonaOpen && !overlays.sharedPayload;
  useEffect(() => {
    if (isOwnPersonaOpen) trackEvent('smash_persona_open');
  }, [isOwnPersonaOpen]);

  useEffect(() => {
    if (isLeaderboardOpen) trackEvent('smash_leaderboard_open');
  }, [isLeaderboardOpen]);

  const isStatsOpen = Boolean(overlays.selectedStatCharacter);
  useEffect(() => {
    if (isStatsOpen) trackEvent('smash_stats_open');
  }, [isStatsOpen]);

  const { sessionSmashes, sessionPasses } = votes;
  const totalSessionVotes = sessionSmashes + sessionPasses;
  const sessionSmashRate = totalSessionVotes > 0 ? Math.round((sessionSmashes / totalSessionVotes) * 100) : 0;
  const remainingInDeck = Math.max(0, deck.deck.length - deck.currentIndex);
  const rosterBadgeCount =
    activeRoster.entity_count ?? activeRoster.character_count ?? deck.totalRemaining ?? deck.deck.length;

  return (
    <div
      className={`relative min-h-screen-smash flex flex-col justify-start space-y-3 pb-12 overflow-x-clip ${
        effectsEnabled ? '' : '[&_*]:animate-none!'
      }`}
    >
      {/* The ambient embers always stay; with effects off they just stop reacting to swipes and votes. */}
      <Suspense fallback={null}>
        <InteractiveDragBackground
          dragX={effectsEnabled ? exit.dragPhysics.x : 0}
          dragY={effectsEnabled ? exit.dragPhysics.y : 0}
          isDragging={effectsEnabled && exit.dragPhysics.isDragging}
          actionTrigger={effectsEnabled ? animTrigger.type : null}
          triggerKey={effectsEnabled ? animTrigger.key : 0}
          isPaused={overlays.areModalsOpen}
        />
      </Suspense>

      {/* Particle & Visual Overlay Animation Engine */}
      {!effectsEnabled && <CalmVoteMark triggerType={animTrigger.type} triggerKey={animTrigger.key} />}
      {effectsEnabled && (
        <Suspense fallback={null}>
          <SmashAnimations
            triggerType={animTrigger.type}
            triggerKey={animTrigger.key}
            originX={animTrigger.originX}
            originY={animTrigger.originY}
          />
        </Suspense>
      )}

      {/* The stage: the one size container of the hub (see styles/smash-or-pass.css). */}
      <div className="smash-hub flex-1 flex flex-col">
        <div className="smash-stage relative flex-1 flex flex-col space-y-3">
          {/* Scattered Ambient Lore Wings Flanking the Candidate Card */}
          <Suspense fallback={null}>
            <FloatingLoreScattered
              character={deck.currentCharacter}
              locale={locale}
              customLabels={activeRoster?.custom_labels}
            />
          </Suspense>

          <HubHeader
            activeRoster={activeRoster}
            rosterName={rosters.getRosterDisplayName(activeRoster)}
            rosterBadgeCount={rosterBadgeCount}
            remainingInDeck={remainingInDeck}
            sessionSmashes={sessionSmashes}
            sessionPasses={sessionPasses}
            sessionSmashRate={sessionSmashRate}
            isFilterActive={deck.roleFilter !== 'all' || deck.genderFilter !== 'all'}
            isFilterDrawerOpen={overlays.isFilterDrawerOpen}
            effectsEnabled={effectsEnabled}
            onOpenRosters={() => overlays.setIsRosterModalOpen(true)}
            onToggleFilters={() => overlays.setIsFilterDrawerOpen((prev) => !prev)}
            onOpenEffects={() => router.push(`/${locale}/settings`)}
            onOpenPersona={() => overlays.setIsPersonaOpen(true)}
            onOpenLeaderboard={() => overlays.setIsLeaderboardOpen(true)}
            onShuffle={deck.shuffleDeck}
            onReset={() => setIsResetConfirmOpen(true)}
            onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
          >
            <HubFilterDrawer
              isOpen={overlays.isFilterDrawerOpen}
              roleFilter={deck.roleFilter}
              genderFilter={deck.genderFilter}
              availableRoles={rosters.availableRoles}
              availableGenders={rosters.availableGenders}
              onFilterChange={deck.setFilter}
              onClose={() => overlays.setIsFilterDrawerOpen(false)}
            />
          </HubHeader>

          {resetFailed && (
            <Alert onDismiss={() => setResetFailed(false)} dismissLabel={dict.smashOrPass.close}>
              {dict.smashOrPass.resetFailed}
            </Alert>
          )}

          {isLocalRosterSlug(selectedRosterSlug) && !isAuthenticated ? (
            <div className="w-full max-w-lg mx-auto py-12 px-4">
              <AuthRequiredState
                title={dict.smashOrPass.authRequiredTitle}
                subtitle={dict.smashOrPass.authRequiredDesc}
              />
            </div>
          ) : (
            <CardArena
              activeRoster={activeRoster}
              selectedRosterSlug={selectedRosterSlug}
              nsfwAcknowledged={rosters.nsfwAcknowledged}
              loading={deck.loading}
              currentCharacter={deck.currentCharacter}
              nextCharacter={deck.nextCharacter}
              thirdCharacter={deck.thirdCharacter}
              currentIndex={deck.currentIndex}
              locale={locale}
              dragPhysics={exit.dragPhysics}
              isExiting={exit.isExiting}
              exitVote={exit.exitVote}
              exitOffset={exit.exitOffset}
              effectsEnabled={effectsEnabled}
              sessionSmashes={sessionSmashes}
              sessionPasses={sessionPasses}
              onAcknowledgeNsfw={rosters.handleAcknowledgeNsfw}
              onVote={castVote}
              onDragUpdate={(x, y, isDragging) => exit.setDragPhysics({ x, y, isDragging })}
              onOpenPersona={() => overlays.setIsPersonaOpen(true)}
              onReset={() => setIsResetConfirmOpen(true)}
            />
          )}
        </div>
      </div>

      <HowToPlayModal
        isOpen={overlays.isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
        onPass={() => {
          void handleVote('pass');
          setIsHowToPlayOpen(false);
        }}
        onSmash={() => {
          void handleVote('smash');
          setIsHowToPlayOpen(false);
        }}
        onStats={() => {
          setIsHowToPlayOpen(false);
          if (deck.currentCharacter) setSelectedStatCharacter(deck.currentCharacter);
        }}
        onReset={() => {
          setIsHowToPlayOpen(false);
          setIsResetConfirmOpen(true);
        }}
      />

      <RosterModals locale={locale} overlays={overlays} rosters={rosters} />

      <PreferencesPromptModal
        isOpen={isPromptOpen}
        mode="smash"
        onClose={() => {
          markSmashEntryAcknowledged();
          setSmashAck(true);
          setPromptDismissed(true);
        }}
      />

      <HubModals
        locale={locale}
        overlays={overlays}
        activeRoster={activeRoster}
        selectedRosterSlug={selectedRosterSlug}
        isAuthenticated={isAuthenticated}
        leaderboardItems={deck.leaderboardItems}
        userSmashes={votes.userSmashesList}
        voteHistory={votes.voteHistory}
        onResetAllVotes={() => { void handleResetAllVotes(); }}
      />
    </div>
  );
};
