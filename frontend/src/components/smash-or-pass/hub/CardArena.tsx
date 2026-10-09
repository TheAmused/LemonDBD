'use client';
// frontend/src/components/smash-or-pass/hub/CardArena.tsx
import { Heart } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import type { EntityItem, RosterItem } from '@/types/smashOrPass';
import { CardStack } from './CardStack';
import { DeckFinished } from './DeckFinished';
import { NsfwGate } from './NsfwGate';
import type { DragPhysics } from './useCardExit';

interface CardArenaProps {
  activeRoster: RosterItem;
  selectedRosterSlug: string;
  nsfwAcknowledged: boolean;
  loading: boolean;
  currentCharacter: EntityItem | null;
  nextCharacter: EntityItem | null;
  thirdCharacter: EntityItem | null;
  currentIndex: number;
  locale: string;
  dragPhysics: DragPhysics;
  isExiting: boolean;
  exitVote: 'smash' | 'pass' | null;
  exitOffset: { x: number; y: number } | undefined;
  effectsEnabled: boolean;
  sessionSmashes: number;
  sessionPasses: number;
  onAcknowledgeNsfw: () => void;
  onVote: (vote: 'smash' | 'pass', origin?: { x: number; y: number }) => void;
  onDragUpdate: (x: number, y: number, isDragging: boolean) => void;
  onExitComplete: () => void;
  onOpenPersona: () => void;
  onReset: () => void;
}

/** The main interactive area: the NSFW gate, the loading card, the card stack, or the finished deck. */
export function CardArena({
  activeRoster,
  selectedRosterSlug,
  nsfwAcknowledged,
  loading,
  currentCharacter,
  nextCharacter,
  thirdCharacter,
  currentIndex,
  locale,
  dragPhysics,
  isExiting,
  exitVote,
  exitOffset,
  effectsEnabled,
  sessionSmashes,
  sessionPasses,
  onAcknowledgeNsfw,
  onVote,
  onDragUpdate,
  onExitComplete,
  onOpenPersona,
  onReset,
}: CardArenaProps) {
  const dict = useDictionary();

  return (
    <main className="relative flex-1 flex flex-col items-center justify-center my-2 z-20 pointer-events-none">
      {activeRoster.is_nsfw && !nsfwAcknowledged ? (
        <NsfwGate onConfirm={onAcknowledgeNsfw} />
      ) : loading ? (
        <div className="relative flex flex-col items-center justify-center min-h-[460px] sm:min-h-[520px] pointer-events-auto select-none animate-pulse">
          <div className="w-[88vw] max-w-[340px] sm:max-w-[380px] md:max-w-[420px] aspect-[9/14] sm:aspect-[9/15] rounded-[32px] sm:rounded-[36px] bg-bg-primary border-2 border-accent-red/30 flex flex-col items-center justify-center p-6 space-y-4">
            <Heart className="h-12 w-12 text-accent-red fill-accent-red/30 animate-pulse" />
            <span className="type-strong text-text-secondary text-center">
              {dict.smashOrPass.loadingRosterPrefix} {activeRoster.name || selectedRosterSlug} {dict.smashOrPass.loadingRosterSuffix}
            </span>
            <div className="h-1.5 w-32 rounded-full bg-bg-elevated overflow-hidden">
              <div className="h-full bg-accent-red animate-[shimmer_1.5s_infinite]" />
            </div>
          </div>
        </div>
      ) : currentCharacter ? (
        <CardStack
          currentCharacter={currentCharacter}
          nextCharacter={nextCharacter}
          thirdCharacter={thirdCharacter}
          currentIndex={currentIndex}
          activeRoster={activeRoster}
          locale={locale}
          dragPhysics={dragPhysics}
          isExiting={isExiting}
          exitVote={exitVote}
          exitOffset={exitOffset}
          effectsEnabled={effectsEnabled}
          onVote={onVote}
          onDragUpdate={onDragUpdate}
          onExitComplete={onExitComplete}
        />
      ) : (
        <DeckFinished
          sessionSmashes={sessionSmashes}
          sessionPasses={sessionPasses}
          onOpenPersona={onOpenPersona}
          onReset={onReset}
        />
      )}
    </main>
  );
}
