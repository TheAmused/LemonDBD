'use client';
// frontend/src/components/smash-or-pass/CharacterCard.tsx

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Heart,
  RotateCw,
  Maximize2,
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ThumbsDown,
  Flame,
  Quote,
} from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { CardDisintegrationOverlay } from './CardDisintegrationOverlay';
import { SmashSounds } from './SmashSoundEffects';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { cn } from '@/utils/cn';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import type { EntityItem, RosterCustomLabels } from '@/types/smashOrPass';
import { localizedProfile } from '@/utils/entityProfile';
import { sampleFlags } from '@/utils/smashWatermarks';

import { tip } from '@/components/common/Tooltip';
import { Modal, useModal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Surface } from '@/components/common/Surface';
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

const FLIP_HALF_MS = 190;
/** The dating-profile back face is not ready yet: its content sits blurred behind a "Soon..." badge. */
const BACK_FACE_COMING_SOON = true;

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
    }) => {
  const dict = useDictionary();
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [turn, setTurn] = useState<'settled' | 'out' | 'far'>('settled');
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tilt, setTilt] = useState<{ x: number; y: number; glossX: number; glossY: number }>({
    x: 0,
    y: 0,
    glossX: 50,
    glossY: 50,
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastDragZoneRef = useRef<'neutral' | 'smash' | 'pass'>('neutral');

  const cardRef = useRef<HTMLDivElement | null>(null);
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
    setIsFlipped(false);
    setTurn('settled');
    setIsZoomed(false);
  }, [character.slug, character.id]);

  const startFlip = useCallback(() => {
    setTurn((t) => (t === 'settled' ? 'out' : t));
  }, []);

  useEffect(() => {
    if (turn === 'out') {
      const timer = setTimeout(() => {
        setIsFlipped((v) => !v);
        setTurn('far');
      }, FLIP_HALF_MS);
      return () => clearTimeout(timer);
    }
    if (turn === 'far') {
      // Next frame, so the jump to the far edge paints before the return is animated.
      const raf = requestAnimationFrame(() => setTurn('settled'));
      return () => cancelAnimationFrame(raf);
    }
  }, [turn]);

  // `|| character.role` is a render-level default for an entity with no archetype yet,
  // not a data fallback — localizedProfile already resolved locale vs. English.
  const charTitle = profile.archetype || character.role;

  const charTagline = profile.tagline;
  const charBio = profile.bio;
  const charQuote = profile.quote;
  const dealbreaker: string = profile.dealbreaker;
  const charMeme: string = profile.meme;

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

  useEffect(() => {
    if (isExiting && initialExitOffset) {
      setDragOffset(initialExitOffset);
    }
  }, [isExiting, initialExitOffset]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isTopCard || isDragging || isExiting || isFlipped || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    setTilt({
      x: rotateX,
      y: rotateY,
      glossX: (x / rect.width) * 100,
      glossY: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, glossX: 50, glossY: 50 });
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isTopCard || isExiting || isFlipped) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    touchStartRef.current = { x: clientX, y: clientY };
    lastDragZoneRef.current = 'neutral';
    setIsDragging(true);
    onDragUpdate?.(0, 0, true);
    SmashSounds.playCardGrabSound();
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!isDragging || !isTopCard || isExiting || isFlipped) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - touchStartRef.current.x;
      const deltaY = clientY - touchStartRef.current.y;

      setDragOffset({ x: deltaX, y: deltaY });
      onDragUpdate?.(deltaX, deltaY, true);

      const ZONE_THRESHOLD = 45;
      if (deltaX > ZONE_THRESHOLD && lastDragZoneRef.current !== 'smash') {
        lastDragZoneRef.current = 'smash';
        SmashSounds.playSensualHover();
      } else if (deltaX < -ZONE_THRESHOLD && lastDragZoneRef.current !== 'pass') {
        lastDragZoneRef.current = 'pass';
        SmashSounds.playSadHover();
      } else if (Math.abs(deltaX) < 25 && lastDragZoneRef.current !== 'neutral') {
        lastDragZoneRef.current = 'neutral';
      }
    },
    [isDragging, isTopCard, isExiting, isFlipped, onDragUpdate]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || !isTopCard || isExiting || isFlipped) return;
    setIsDragging(false);
    lastDragZoneRef.current = 'neutral';

    const SWIPE_THRESHOLD = 110;

    if (dragOffset.x > SWIPE_THRESHOLD) {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        onVote('smash', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
      } else {
        onVote('smash');
      }
    } else if (dragOffset.x < -SWIPE_THRESHOLD) {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        onVote('pass', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
      } else {
        onVote('pass');
      }
    } else {
      setDragOffset({ x: 0, y: 0 });
      onDragUpdate?.(0, 0, false);
      SmashSounds.playFlipSound();
    }
  }, [isDragging, isTopCard, isExiting, isFlipped, dragOffset, onVote, onDragUpdate]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleTouchMove);
      window.addEventListener('mouseup', handleTouchEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleTouchMove);
      window.removeEventListener('mouseup', handleTouchEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleTouchMove);
      window.removeEventListener('mouseup', handleTouchEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleTouchMove, handleTouchEnd]);

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
            ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0px) rotate(${isDragging || isExiting ? dragRotation : tilt.y * 0.4
            }deg) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${cardScale})`
            : undefined,
          transition: isDragging
            ? 'none'
            : isExiting
              ? 'transform 480ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 480ms cubic-bezier(0.2, 0.9, 0.2, 1)'
              : 'transform 380ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          perspective: 1200,
          willChange: isDragging || isExiting ? 'transform, opacity' : 'auto',
          opacity: isExiting ? 0 : 1,
        }}
        className={`relative select-none w-[88vw] max-w-[340px] sm:max-w-[380px] md:max-w-[420px] aspect-[9/14] sm:aspect-[9/15] ${isTopCard ? 'cursor-grab active:cursor-grabbing z-30' : 'pointer-events-none'
          }`}
      >
        {isExiting && exitType && (
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
          style={{
            transform:
              turn === 'out' ? 'rotateY(90deg)' : turn === 'far' ? 'rotateY(-90deg)' : 'rotateY(0deg)',
            transition: turn === 'far' ? 'none' : `transform ${FLIP_HALF_MS}ms ease-in-out`,
          }}
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
              <img
                src={avatarSrc}
                alt={character.name}
                loading={isTopCard ? 'eager' : 'lazy'}
                fetchPriority={isTopCard ? 'high' : 'auto'}
                decoding="async"
                className="h-full w-full object-cover object-top pointer-events-none transition-transform duration-700 select-none"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = '1';
                    // Backend writes avatars as WebP; retry that explicitly in case the
                    // initial src (e.g. a stale DB path) pointed somewhere unexpected.
                    target.src = `${backendBase}/static/avatars/${isSurvivor ? 'survivors' : 'killers'}/${character.slug}.webp`;
                  } else if (target.dataset.fallback === '1') {
                    target.dataset.fallback = '2';
                    // Legacy fallback: some pre-normalization assets may still only exist as .png.
                    target.src = `${backendBase}/static/avatars/${isSurvivor ? 'survivors' : 'killers'}/${character.slug}.png`;
                  }
                }}
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
          <div
            style={{
              pointerEvents: isFlipped ? 'auto' : 'none',
              visibility: isFlipped ? 'visible' : 'hidden',
            }}
            onClick={() => {
              SmashSounds.playFlipSound();
              startFlip();
            }}
            className="absolute inset-0 h-full w-full rounded-[32px] sm:rounded-[36px] overflow-hidden border-2 border-accent-red/50 bg-bg-primary/95 backdrop-blur-2xl p-4 sm:p-5 flex flex-col justify-between text-text-primary cursor-pointer select-none"
          >
            {/* Top Bar with accessible Flip Back button and Title */}
            <div className="relative z-30 flex items-center justify-between pb-2 border-b border-border-color shrink-0 pointer-events-auto">
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  SmashSounds.playFlipSound();
                  startFlip();
                }}
                {...tip(rawSmashDict.flipBack, undefined, 'action')}
                aria-label={rawSmashDict.flipBack}
                className="flex min-h-[40px] min-w-[40px] h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-bg-elevated border border-accent-red/40 text-accent-red hover:text-text-inverted hover:border-accent-red hover:scale-110 active:scale-95 transition-all shadow-lg cursor-pointer touch-manipulation"
              >
                <RotateCw className="h-5 w-5" aria-hidden="true" />
              </button>

              <div className="flex items-center gap-1.5 px-2 min-w-0">
                <Sparkles className="h-4 w-4 text-accent-red shrink-0" aria-hidden="true" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-primary truncate max-w-[150px] sm:max-w-[180px]">
                  {character.name}
                </h3>
              </div>

              <span
                className={`text-micro font-black uppercase px-2 py-0.5 rounded-lg border shrink-0 ${
                  isSurvivor
                    ? 'bg-accent-green/15 text-accent-green border-accent-green/30'
                    : 'bg-accent-red/15 text-accent-red border-accent-red/30'
                }`}
              >
                {isSurvivor
                  ? rawSmashDict.filters.survivors
                  : rawSmashDict.filters.killers}
              </span>
            </div>

            {/* Scrollable Back Content */}
            <div className="relative my-2 flex-1 min-h-0">
            <div
              className={cn(
                'space-y-2.5 h-full pr-1 scrollbar-thin scrollbar-thumb-border-color',
                BACK_FACE_COMING_SOON
                  ? 'overflow-hidden blur-sm opacity-40 select-none pointer-events-none'
                  : 'overflow-y-auto select-text pointer-events-auto'
              )}
              aria-hidden={BACK_FACE_COMING_SOON || undefined}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Archetype / Dating Vibe */}
              <div className="p-2.5 rounded-2xl bg-bg-elevated border border-accent-red/30 space-y-0.5">
                <span className="type-label-2xs text-accent-red flex items-center gap-1">
                  <Flame className="h-3 w-3 text-accent-red" aria-hidden="true" />
                  {customLabels?.dating_vibe || 'Dating Vibe'}: {charTitle}
                </span>
                {charTagline && <p className="text-mini text-text-secondary italic leading-snug">{charTagline}</p>}
              </div>

              {/* Turn On (Visible & Optional) */}
              {profile.turn_on && (
                <div className="p-2.5 rounded-2xl bg-accent-green/10 border border-accent-green/40 space-y-0.5">
                  <span className="type-label-2xs text-accent-green flex items-center gap-1">
                    <Flame className="h-3 w-3 text-accent-green" aria-hidden="true" />
                    {customLabels?.turn_on || ''}
                  </span>
                  <p className="text-mini text-text-primary leading-snug">{profile.turn_on}</p>
                </div>
              )}

              {/* Dealbreaker (Visible & Optional) */}
              {profile.dealbreaker && (
                <div className="p-2.5 rounded-2xl bg-accent-red/10 border border-accent-red/40 space-y-0.5">
                  <span className="type-label-2xs text-accent-red flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-accent-red" aria-hidden="true" />
                    {customLabels?.dealbreaker || ''}
                  </span>
                  <p className="text-mini text-text-primary leading-snug">{profile.dealbreaker}</p>
                </div>
              )}

              {/* Signature Quote */}
              {charQuote && (
                <div className="p-2.5 rounded-2xl bg-bg-elevated border border-accent-amber/30 space-y-0.5">
                  <span className="type-label-2xs text-accent-amber flex items-center gap-1">
                    <Quote className="h-3 w-3 text-accent-amber" aria-hidden="true" />
                    {customLabels?.quote || 'Quote'}
                  </span>
                  <p className="text-mini text-text-secondary italic leading-relaxed">{charQuote}</p>
                </div>
              )}

              {/* Full Mode Extras */}
              {rosterMode !== 'simple' && charBio && (
                <Surface tone="elevated" radius="2xl" padding="none" className="p-2.5 space-y-1">
                  <span className="type-label-2xs text-text-muted">
                    {rawSmashDict.loreAndPersonality}
                  </span>
                  <p className="type-body text-text-secondary">{charBio}</p>
                </Surface>
              )}

              {rosterMode !== 'simple' && charMeme && (
                <Surface tone="elevated" radius="2xl" padding="none" className="p-2.5 space-y-0.5">
                  <span className="flex items-center gap-1.5 type-label-2xs text-text-secondary">
                    <Sparkles className="h-3 w-3 text-text-muted" aria-hidden="true" />
                    {customLabels?.meme || rawSmashDict.trialRumor}
                  </span>
                  <p className="text-mini text-text-secondary italic leading-snug">{charMeme}</p>
                </Surface>
              )}
            </div>
            {BACK_FACE_COMING_SOON && (
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <div className="px-6 py-3 rounded-2xl bg-bg-primary/80 border border-border-color/60 backdrop-blur-md shadow-2xl">
                  <span className="text-2xl sm:text-3xl font-black tracking-widest text-text-primary uppercase drop-shadow-md">
                    {rawSmashDict.soon}
                  </span>
                </div>
              </div>
            )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-2 flex items-center justify-between border-t border-border-color shrink-0 gap-2 pointer-events-auto">
              <Button
                variant="secondary" size="sm"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onVote('pass', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                }}
                className="flex-1"
              >
                <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                <span>{rawSmashDict.pass}</span>
              </Button>
              <Button
                variant="primary" size="sm"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onVote('smash', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                }}
                className="flex-1"
              >
                <Heart className="h-4 w-4 fill-text-inverted" aria-hidden="true" />
                <span>{rawSmashDict.smash}</span>
              </Button>
            </div>
          </div>
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
          <img
            src={avatarSrc}
            alt={character.name}
            className="max-h-[80vh] w-auto object-contain rounded-3xl"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.dataset.fallback) {
                target.dataset.fallback = '1';
                // Backend writes avatars as WebP; retry that explicitly in case the
                // initial src (e.g. a stale DB path) pointed somewhere unexpected.
                target.src = `${backendBase}/static/avatars/${isSurvivor ? 'survivors' : 'killers'}/${character.slug}.webp`;
              } else if (target.dataset.fallback === '1') {
                target.dataset.fallback = '2';
                // Legacy fallback: some pre-normalization assets may still only exist as .png.
                target.src = `${backendBase}/static/avatars/${isSurvivor ? 'survivors' : 'killers'}/${character.slug}.png`;
              }
            }}
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