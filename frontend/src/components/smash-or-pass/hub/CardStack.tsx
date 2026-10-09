'use client';
// frontend/src/components/smash-or-pass/hub/CardStack.tsx
import { memo, type CSSProperties } from 'react';
import { CharacterCard } from '../CharacterCard';
import type { EntityItem, RosterItem } from '@/types/smashOrPass';
import { CALM_EXIT_MS, type DragPhysics } from './useCardExit';

const EXIT_EASE = 'cubic-bezier(0.2, 0.9, 0.2, 1)';
const noop = () => {};

/** The waiting cards never change while the top one is dragged: keep them out of its re-renders. */
const QueuedCard = memo(CharacterCard);

interface CardStackProps {
  currentCharacter: EntityItem;
  nextCharacter: EntityItem | null;
  thirdCharacter: EntityItem | null;
  currentIndex: number;
  activeRoster: RosterItem;
  locale: string;
  dragPhysics: DragPhysics;
  isExiting: boolean;
  exitVote: 'smash' | 'pass' | null;
  exitOffset: { x: number; y: number } | undefined;
  effectsEnabled: boolean;
  onVote: (vote: 'smash' | 'pass', origin?: { x: number; y: number }) => void;
  onDragUpdate: (x: number, y: number, isDragging: boolean) => void;
  onExitComplete: () => void;
}

/** How far the card behind has moved up by, from how far the top one is dragged. */
function thirdCardStyle({ isDragging, x }: DragPhysics, isExiting: boolean, ms: number): CSSProperties {
  const pull = Math.abs(x);
  return {
    transform: isDragging
      ? `scale(${0.86 + Math.min(0.07, pull / 1200)}) translateY(${Math.max(14, 28 - pull * 0.025)}px)`
      : isExiting
        ? 'scale(0.93) translateY(14px)'
        : 'scale(0.86) translateY(28px)',
    opacity: isDragging ? 0.45 + Math.min(0.35, pull / 1000) : isExiting ? 0.85 : 0.45,
    filter: isDragging
      ? `brightness(${0.75 + Math.min(0.15, pull / 1000)})`
      : isExiting
        ? 'brightness(0.9)'
        : 'brightness(0.75)',
    willChange: 'transform, opacity, filter',
    transition: isExiting
      ? `transform ${ms}ms ${EXIT_EASE}, opacity ${ms}ms ${EXIT_EASE}, filter ${ms}ms ${EXIT_EASE}`
      : 'transform 240ms ease-out, opacity 240ms ease-out, filter 240ms ease-out',
  };
}

function nextCardStyle({ isDragging, x }: DragPhysics, isExiting: boolean, ms: number): CSSProperties {
  const pull = Math.abs(x);
  return {
    transform: isDragging
      ? `scale(${0.93 + Math.min(0.07, pull / 900)}) translateY(${Math.max(0, 14 - pull * 0.035)}px)`
      : isExiting
        ? 'scale(1) translateY(0px)'
        : 'scale(0.93) translateY(14px)',
    opacity: isDragging ? 0.85 + Math.min(0.15, pull / 900) : isExiting ? 1 : 0.85,
    filter: isDragging
      ? `brightness(${0.9 + Math.min(0.1, pull / 900)})`
      : isExiting
        ? 'brightness(1)'
        : 'brightness(0.9)',
    willChange: 'transform, opacity, filter',
    transition: isExiting
      ? `transform ${ms}ms ${EXIT_EASE}, opacity ${ms}ms ${EXIT_EASE}, filter ${ms}ms ${EXIT_EASE}`
      : 'transform 200ms ease-out, opacity 200ms ease-out, filter 200ms ease-out',
  };
}

/** The top card and the two waiting behind it, which rise as the top one is dragged away. */
export function CardStack({
  currentCharacter,
  nextCharacter,
  thirdCharacter,
  currentIndex,
  activeRoster,
  locale,
  dragPhysics,
  isExiting,
  exitVote,
  exitOffset,
  effectsEnabled,
  onVote,
  onDragUpdate,
  onExitComplete,
}: CardStackProps) {
  // The cards behind come forward over exactly as long as the top one takes to leave.
  const exitMs = effectsEnabled ? 480 : CALM_EXIT_MS;
  return (
    <div className="relative flex flex-col items-center justify-center pointer-events-auto min-h-[460px] sm:min-h-[520px]">
      {/* CARD 3 IN QUEUE (DEPTH 2 - SMOOTH ENTER & ELEVATION) */}
      {thirdCharacter && (
        <div
          key={`queue-3-${thirdCharacter.id || thirdCharacter.slug}`}
          className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none anim-card-queue-enter"
          style={thirdCardStyle(dragPhysics, isExiting, exitMs)}
        >
          <QueuedCard
            character={thirdCharacter}
            onVote={noop}
            isTopCard={false}
            locale={locale}
            customLabels={activeRoster?.custom_labels}
            rosterMode={activeRoster?.roster_mode}
          />
        </div>
      )}

      {/* CARD 2 IN QUEUE (DEPTH 1 - DYNAMIC PROMOTION) */}
      {nextCharacter && (
        <div
          key={`queue-2-${nextCharacter.id || nextCharacter.slug}`}
          className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
          style={nextCardStyle(dragPhysics, isExiting, exitMs)}
        >
          <QueuedCard
            character={nextCharacter}
            onVote={noop}
            isTopCard={false}
            locale={locale}
            customLabels={activeRoster?.custom_labels}
            rosterMode={activeRoster?.roster_mode}
          />
        </div>
      )}

      {/* CARD 1 (ACTIVE TOP CARD) */}
      <div className="relative z-20">
        <CharacterCard
          key={`${currentCharacter.id || currentCharacter.slug}-${currentIndex}`}
          character={currentCharacter}
          onVote={onVote}
          onDragUpdate={onDragUpdate}
          isTopCard={true}
          isExiting={isExiting}
          exitType={exitVote}
          initialExitOffset={exitOffset}
          effects={effectsEnabled}
          onExitComplete={onExitComplete}
          locale={locale}
          customLabels={activeRoster?.custom_labels}
          rosterMode={activeRoster?.roster_mode}
        />
      </div>
    </div>
  );
}
