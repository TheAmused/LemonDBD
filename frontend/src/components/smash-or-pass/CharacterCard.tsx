'use client';
// frontend/src/components/smash-or-pass/CharacterCard.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { Heart, RotateCw, Maximize2, X, ThumbsDown } from 'lucide-react';
import { CardDisintegrationOverlay } from './CardDisintegrationOverlay';
import { CardAvatarImage } from './card/CardAvatarImage';
import { CardBackFace } from './card/CardBackFace';
import { useCardDrag } from './card/useCardDrag';
import { useCardFlip } from './card/useCardFlip';
import { SmashSounds } from './SmashSoundEffects';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import type { EntityItem, RosterCustomLabels } from '@/types/smashOrPass';
import { localizedProfile } from '@/utils/entityProfile';
import { sampleFlags } from '@/utils/smashWatermarks';

import { tip } from '@/components/common/Tooltip';
import { Modal, useModal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { isSurvivor as isSurvivorRole } from '@/utils/characterUtils';
import { useDictionary } from "@/context/DictionaryContext";

const ZoomCloseButton: React.FC<{ label: string }> = ({ label }) => {
  const { close } = useModal();
  return (
    <Button
      variant="secondary" size="md" icon
      onClick={close}
      aria-label={label}
      className="absolute right-2 top-2 z-10 rounded-full shadow-lg"
    >
      <X className="h-5 w-5" aria-hidden="true" />
    </Button>
  );
};
// The local CharacterMetadataLocale / CharacterMetadataContainer shapes are gone: they
// only existed to describe the duplicated payload (camelCase twins, `i18n` next to
// `translations`, `title` next to `archetype`). EntityMetadata is now that description.

interface CharacterCardProps {
  character: EntityItem;
  onVote: (type: 'smash' | 'pass', origin?: { x: number; y: number }) => void;
  isTopCard?: boolean;
  onDragUpdate?: (x: number, y: number, isDragging: boolean) => void;
  isExiting?: boolean;
  exitType?: 'smash' | 'pass' | null;
  initialExitOffset?: { x: number; y: number } | null;
  onExitComplete?: () => void;
  locale?: string;
  customLabels?: RosterCustomLabels;
  rosterMode?: 'simple' | 'full';
  /** False when the viewer switched effects off: no fling, tilt or particle burst; the card fades out gently instead. */
  effects?: boolean;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
      character,
      onVote,
      isTopCard = true,
      onDragUpdate,
      isExiting = false,
      exitType = null,
      initialExitOffset = null,
      onExitComplete,
      locale = 'en',
      customLabels,
      rosterMode = 'full',
      effects = true,
    }) => {
  const dict = useDictionary();
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const { isFlipped, startFlip, turnStyle } = useCardFlip(character.slug, character.id);
  const { cardRef, dragOffset, tilt, isDragging, handleMouseMove, handleMouseLeave, handleTouchStart } = useCardDrag({
    isTopCard,
    isExiting,
    isFlipped,
    initialExitOffset,
    onVote,
    onDragUpdate,
  });
  const backendBase = getBackendBaseUrl();

  const isSurvivor = isSurvivorRole(character.role);

  const currentLoc = locale || 'en';
  const profile = localizedProfile(character.metadata, currentLoc);

  // Sample flags stably per character view (stable across card flips)
  const sampledGreenFlags = useMemo(() => {
    return sampleFlags(profile.green_flags);
  }, [character.slug || character.id, profile.green_flags]);

  const sampledRedFlags = useMemo(() => {
    return sampleFlags(profile.red_flags);
  }, [character.slug || character.id, profile.red_flags]);

  useEffect(() => {
    setIsZoomed(false);
  }, [character.slug, character.id]);

  const charTagline = profile.tagline;

  const avatarSrc =
    character.media_url?.startsWith('http') || character.media_url?.startsWith('/static')
      ? `${character.media_url.startsWith('http') ? '' : backendBase}${character.media_url}`
      : resolveAvatarUrl(
        backendBase,
        {
          name: character.name,
          category: character.role,
          avatar_local_path: `avatars/${isSurvivor ? 'survivors' : 'killers'}/${character.slug}.webp`,
        },
        isSurvivor
      );

  const dragDistance = Math.abs(dragOffset.x);
  const swipeProgress = Math.min(1, Math.max(0, dragDistance / 100));
  const isSmashDrag = dragOffset.x > 15 || exitType === 'smash';
  const isPassDrag = dragOffset.x < -15 || exitType === 'pass';
  const dragRotation = Math.min(28, Math.max(-28, dragOffset.x * 0.075));
  const cardScale = isExiting
    ? exitType === 'smash'
      ? 1.05
      : 0.88
    : isDragging
      ? 1.02
      : 1;

  const rawSmashDict = dict.smashOrPass;

  const zoomAriaLabel = rawSmashDict.zoomFullPortrait
    ? `${character.name} - ${rawSmashDict.zoomFullPortrait}`
    : character.name;

  return (
    <>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleTouchStart}
        onTouchStart={handleTouchStart}
        style={{
          transform: isTopCard
            ? isExiting && !effects
              ? 'scale(0.96)'
              : `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0px) rotate(${isDragging || isExiting ? dragRotation : tilt.y * 0.4
              }deg) rotateX(${effects ? tilt.x : 0}deg) rotateY(${effects ? tilt.y : 0}deg) scale(${cardScale})`
            : undefined,
          transition: isDragging
            ? 'none'
            : isExiting
              ? effects
                ? 'transform 480ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 480ms cubic-bezier(0.2, 0.9, 0.2, 1)'
                : 'transform 320ms ease-out, opacity 320ms ease-out'
              : effects
                ? 'transform 380ms cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                : 'transform 240ms ease-out',
          perspective: 1200,
          willChange: isDragging || isExiting ? 'transform, opacity' : 'auto',
          opacity: isExiting ? 0 : 1,
        }}
        className={`relative select-none w-[88vw] max-w-[340px] sm:max-w-[380px] md:max-w-[420px] aspect-[9/14] sm:aspect-[9/15] ${isTopCard ? 'cursor-grab active:cursor-grabbing z-30' : 'pointer-events-none'
          }`}
      >
        {effects && isExiting && exitType && (
          <CardDisintegrationOverlay exitType={exitType} onComplete={onExitComplete} />
        )}

        {isTopCard && !isExiting && !isFlipped && (
          <div
            style={{
              opacity: dragOffset.x > 15 ? Math.min(1, (dragOffset.x - 15) / 75) : 0,
              transform: `scale(${0.75 + Math.min(0.35, Math.max(0, dragOffset.x) / 180)}) rotate(-12deg)`,
              pointerEvents: 'none',
            }}
            className="absolute top-6 left-6 z-40 border-4 border-accent-red bg-accent-red/20 p-3 sm:p-4 rounded-3xl backdrop-blur-md transition-all duration-75"
          >
            <Heart className="h-8 w-8 sm:h-10 sm:w-10 fill-accent-red text-accent-red animate-pulse" aria-hidden="true" />
          </div>
        )}

        {isTopCard && !isExiting && !isFlipped && (
          <div
            style={{
              opacity: dragOffset.x < -15 ? Math.min(1, (-dragOffset.x - 15) / 75) : 0,
              transform: `scale(${0.75 + Math.min(0.35, Math.max(0, -dragOffset.x) / 180)}) rotate(12deg)`,
              pointerEvents: 'none',
            }}
            className="absolute top-6 right-6 z-40 border-4 border-border-subtle bg-bg-elevated/90 p-3 sm:p-4 rounded-3xl backdrop-blur-md transition-all duration-75"
          >
            <ThumbsDown className="h-8 w-8 sm:h-10 sm:w-10 text-text-secondary" aria-hidden="true" />
          </div>
        )}

        {/* Turns in two 90deg halves so the faces themselves stay untransformed: Firefox
         * neither paints nor hit-tests a rotated face here, as their overflow and
         * backdrop-filter flatten them out of any 3D context. */}
        <div
          style={turnStyle}
          className="relative h-full w-full"
        >
          {/* FRONT FACE */}
          <div
            style={{
              pointerEvents: isFlipped ? 'none' : 'auto',
              visibility: isFlipped ? 'hidden' : 'visible',
              boxShadow: isSmashDrag
                ? `0 0 ${35 + swipeProgress * 35}px rgba(220, 38, 38, ${0.4 + swipeProgress * 0.5})`
                : isPassDrag
                  ? `0 0 ${35 + swipeProgress * 35}px rgba(113, 113, 122, ${0.4 + swipeProgress * 0.5})`
                  : '0 0 35px rgba(0, 0, 0, 0.85)',
            }}
            className={`absolute inset-0 h-full w-full rounded-[32px] sm:rounded-[36px] overflow-hidden border-2 transition-colors duration-150 flex flex-col justify-between ${isSmashDrag
                ? 'border-accent-red bg-accent-red/10'
                : isPassDrag
                  ? 'border-border-subtle bg-bg-primary'
                  : 'border-accent-red/40 bg-bg-primary'
              }`}
          >
            <div
              className="pointer-events-none absolute inset-0 z-20 opacity-25 mix-blend-overlay transition-opacity"
              style={{
                background: `radial-gradient(circle at ${tilt.glossX}% ${tilt.glossY}%, rgba(255,255,255,0.7) 0%, transparent 60%)`,
              }}
              aria-hidden="true"
            />

            <div className="absolute inset-0 z-0 bg-bg-primary overflow-hidden">
              <CardAvatarImage
                src={avatarSrc}
                name={character.name}
                slug={character.slug}
                isSurvivor={isSurvivor}
                backendBase={backendBase}
                display={character.media_display}
                priority={isTopCard}
                className={
                  character.media_display
                    ? 'h-full w-full pointer-events-none transition-transform duration-700 select-none'
                    : 'h-full w-full object-cover object-top pointer-events-none transition-transform duration-700 select-none'
                }
              />
              <div className="absolute inset-0 bg-gradient-to-b from-bg-primary/40 via-transparent to-bg-primary/60 pointer-events-none" aria-hidden="true" />
            </div>

            <div className="relative z-30 flex items-center justify-between p-3.5 sm:p-4">
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  SmashSounds.playFlipSound();
                  startFlip();
                }}
                {...tip(rawSmashDict.flipToDatingProfile, undefined, 'action')}
                aria-label={rawSmashDict.flipToDatingProfile}
                className="flex min-h-[48px] min-w-[48px] h-12 w-12 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-bg-primary/85 border border-accent-red/40 text-accent-red hover:text-text-inverted hover:border-accent-red hover:scale-110 active:scale-95 transition-all shadow-2xl backdrop-blur-md cursor-pointer touch-manipulation"
              >
                <RotateCw className="h-5 w-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  SmashSounds.playHoverTick();
                  setIsZoomed(true);
                }}
                {...tip(rawSmashDict.zoomFullPortrait, undefined, 'action')}
                aria-label={rawSmashDict.zoomFullPortrait}
                className="flex min-h-[48px] min-w-[48px] h-12 w-12 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-bg-primary/85 border border-border-color text-text-secondary hover:text-text-inverted hover:border-accent-red hover:scale-110 active:scale-95 transition-all shadow-2xl backdrop-blur-md cursor-pointer touch-manipulation"
              >
                <Maximize2 className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="relative z-30 flex items-center justify-between p-3.5 sm:p-4">
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onVote('pass', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                }}
                {...tip(rawSmashDict.pass, undefined, 'action')}
                aria-label={rawSmashDict.pass}
                className="flex min-h-[48px] min-w-[48px] h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-bg-primary/90 border-2 border-border-color text-text-muted hover:text-text-primary hover:border-border-subtle hover:scale-110 active:scale-95 transition-all shadow-2xl backdrop-blur-md cursor-pointer touch-manipulation"
              >
                <ThumbsDown className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onVote('smash', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                }}
                {...tip(rawSmashDict.smash, undefined, 'action')}
                aria-label={rawSmashDict.smash}
                className="flex min-h-[48px] min-w-[48px] h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-accent-red hover:bg-accent-red-hover text-text-inverted hover:scale-110 active:scale-95 transition-all cursor-pointer touch-manipulation"
              >
                <Heart className="h-6 w-6 sm:h-7 sm:w-7 fill-text-inverted" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* BACK FACE */}
          <CardBackFace
            character={character}
            profile={profile}
            isSurvivor={isSurvivor}
            isFlipped={isFlipped}
            customLabels={customLabels}
            rosterMode={rosterMode}
            onFlip={() => {
              SmashSounds.playFlipSound();
              startFlip();
            }}
            onVote={onVote}
          />
        </div>
      </div>

      <Modal
        isOpen={isZoomed}
        onClose={() => setIsZoomed(false)}
        variant="lightbox"
        size="2xl"
        layer="top"
        ariaLabel={zoomAriaLabel}
        containerClassName="backdrop-blur-2xl"
        className="overflow-visible"
        bodyClassName="flex justify-center overflow-visible"
      >
        <ZoomCloseButton label={dict.modal.close} />
        <div className="relative overflow-hidden rounded-3xl border-2 border-accent-red/40 bg-bg-primary">
          <CardAvatarImage
            src={avatarSrc}
            name={character.name}
            slug={character.slug}
            isSurvivor={isSurvivor}
            backendBase={backendBase}
            className="max-h-[80vh] w-auto object-contain rounded-3xl"
          />
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent text-center">
            <h3 className="text-lg font-black text-text-primary">{character.name}</h3>
            {charTagline && <p className="text-xs text-accent-red italic">{charTagline}</p>}
          </div>
        </div>
      </Modal>
    </>
  );
};
