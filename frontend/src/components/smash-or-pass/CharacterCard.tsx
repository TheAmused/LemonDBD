'use client';
// frontend/src/components/smash-or-pass/CharacterCard.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { CardDisintegrationOverlay } from './CardDisintegrationOverlay';
import { SmashSounds } from './SmashSoundEffects';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import type { EntityItem } from '@/types/smashOrPass';
import { localizedProfile } from '@/utils/entityProfile';

// The local CharacterMetadataLocale / CharacterMetadataContainer shapes are gone: they
// only existed to describe the duplicated payload (camelCase twins, `i18n` next to
// `translations`, `title` next to `archetype`). EntityMetadata is now that description.

const FLIP_HALF_MS = 190;

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
  dict?: Dictionary | any;
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
  dict,
}) => {
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

  const isSurvivor = character.role === 'Survivor';

  const currentLoc = locale || 'en';
  const profile = localizedProfile(character.metadata, currentLoc);

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

  const rawSmashDict = dict?.smashOrPass;

  const zoomAriaLabel = rawSmashDict?.zoomFullPortrait
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
            className="absolute top-6 left-6 z-40 border-4 border-[#ff0055] bg-rose-950/90 p-3 sm:p-4 rounded-3xl shadow-[0_0_35px_rgba(255,0,85,0.8)] backdrop-blur-md transition-all duration-75"
          >
            <Heart className="h-8 w-8 sm:h-10 sm:w-10 fill-[#ff0055] text-[#ff0055] animate-pulse" aria-hidden="true" />
          </div>
        )}

        {isTopCard && !isExiting && !isFlipped && (
          <div
            style={{
              opacity: dragOffset.x < -15 ? Math.min(1, (-dragOffset.x - 15) / 75) : 0,
              transform: `scale(${0.75 + Math.min(0.35, Math.max(0, -dragOffset.x) / 180)}) rotate(12deg)`,
              pointerEvents: 'none',
            }}
            className="absolute top-6 right-6 z-40 border-4 border-[#00f5d4] bg-slate-950/90 p-3 sm:p-4 rounded-3xl shadow-[0_0_35px_rgba(0,245,212,0.8)] backdrop-blur-md transition-all duration-75"
          >
            <ThumbsDown className="h-8 w-8 sm:h-10 sm:w-10 text-[#00f5d4]" aria-hidden="true" />
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
                ? `0 0 ${35 + swipeProgress * 35}px rgba(255, 0, 85, ${0.4 + swipeProgress * 0.5})`
                : isPassDrag
                  ? `0 0 ${35 + swipeProgress * 35}px rgba(0, 245, 212, ${0.4 + swipeProgress * 0.5})`
                  : '0 0 35px rgba(0, 0, 0, 0.85)',
            }}
            className={`absolute inset-0 h-full w-full rounded-[32px] sm:rounded-[36px] overflow-hidden border-2 transition-colors duration-150 flex flex-col justify-between ${isSmashDrag
                ? 'border-[#ff0055] bg-rose-950/90'
                : isPassDrag
                  ? 'border-[#00f5d4] bg-slate-950'
                  : 'border-pink-500/40 bg-slate-950'
              }`}
          >
            <div
              className="pointer-events-none absolute inset-0 z-20 opacity-25 mix-blend-overlay transition-opacity"
              style={{
                background: `radial-gradient(circle at ${tilt.glossX}% ${tilt.glossY}%, rgba(255,255,255,0.7) 0%, transparent 60%)`,
              }}
              aria-hidden="true"
            />

            <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden">
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
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/60 pointer-events-none" aria-hidden="true" />
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
                title={rawSmashDict?.flipToDatingProfile || ''}
                aria-label={rawSmashDict?.flipToDatingProfile || ''}
                className="flex min-h-[48px] min-w-[48px] h-12 w-12 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-slate-950/85 border border-pink-500/40 text-pink-300 hover:text-white hover:border-[#ff0055] hover:scale-110 active:scale-95 transition-all shadow-2xl backdrop-blur-md cursor-pointer touch-manipulation"
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
                title={rawSmashDict?.zoomFullPortrait || ''}
                aria-label={rawSmashDict?.zoomFullPortrait || ''}
                className="flex min-h-[48px] min-w-[48px] h-12 w-12 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-slate-950/85 border border-slate-700/80 text-slate-200 hover:text-white hover:border-pink-400 hover:scale-110 active:scale-95 transition-all shadow-2xl backdrop-blur-md cursor-pointer touch-manipulation"
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
                title={rawSmashDict?.pass || ''}
                aria-label={rawSmashDict?.pass || ''}
                className="flex min-h-[48px] min-w-[48px] h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-slate-950/90 border-2 border-slate-700 text-slate-400 hover:text-slate-100 hover:border-slate-400 hover:scale-110 active:scale-95 transition-all shadow-2xl backdrop-blur-md cursor-pointer touch-manipulation"
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
                title={rawSmashDict?.smash || ''}
                aria-label={rawSmashDict?.smash || ''}
                className="flex min-h-[48px] min-w-[48px] h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 to-[#ff0055] text-white hover:scale-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,0,85,0.6)] cursor-pointer touch-manipulation"
              >
                <Heart className="h-6 w-6 sm:h-7 sm:w-7 fill-white" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* BACK FACE */}
          <div
            style={{
              pointerEvents: isFlipped ? 'auto' : 'none',
              visibility: isFlipped ? 'visible' : 'hidden',
            }}
            className="absolute inset-0 h-full w-full rounded-[32px] sm:rounded-[36px] overflow-hidden border-2 border-[#ff0055]/50 bg-[#09090b]/95 shadow-[0_0_55px_rgba(255,0,85,0.45)] backdrop-blur-2xl p-4 sm:p-5 flex flex-col justify-between overflow-y-auto font-mono text-zinc-100"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 shrink-0">
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  SmashSounds.playFlipSound();
                  startFlip();
                }}
                title={rawSmashDict?.flipBack || ''}
                aria-label={rawSmashDict?.flipBack || ''}
                className="flex min-h-[48px] min-w-[48px] h-12 w-12 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-zinc-900/90 border border-pink-500/40 text-pink-300 hover:text-white hover:border-[#ff0055] hover:scale-110 active:scale-95 transition-all shadow-lg cursor-pointer touch-manipulation"
              >
                <RotateCw className="h-5 w-5" aria-hidden="true" />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <Sparkles className="h-4 w-4 text-pink-400 shrink-0" aria-hidden="true" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-100 truncate max-w-[170px] sm:max-w-[200px]">
                  {character.name}
                </h3>
              </div>

              <span
                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${isSurvivor
                    ? 'bg-[#00f5d4]/15 text-[#00f5d4] border-[#00f5d4]/30'
                    : 'bg-[#ff0055]/15 text-[#ff0055] border-[#ff0055]/30'
                  }`}
              >
                {isSurvivor
                  ? rawSmashDict?.filters?.survivors || character.role
                  : rawSmashDict?.filters?.killers || character.role}
              </span>
            </div>

            <div className="space-y-2.5 my-2 flex-1 overflow-y-auto pr-1">
              <div className="p-2.5 rounded-2xl bg-zinc-950/80 border border-pink-500/30 space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-pink-400 flex items-center gap-1">
                  <Flame className="h-3 w-3 text-pink-400" aria-hidden="true" />
                  {charTitle}
                </span>
                {charTagline && <p className="text-[11px] text-zinc-300 italic leading-snug">{charTagline}</p>}
              </div>

              <div className="p-2.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {rawSmashDict?.loreAndPersonality || ''}
                </span>
                {charBio && <p className="text-xs text-zinc-200 leading-relaxed">{charBio}</p>}
                {charQuote && (
                  <p className="text-[11px] text-pink-300/80 italic pt-1 border-t border-zinc-800/80">{charQuote}</p>
                )}
              </div>

              {charMeme && (
                <div className="p-2.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-0.5">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-purple-300">
                    <Sparkles className="h-3 w-3 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} aria-hidden="true" />
                    {rawSmashDict?.trialRumor || ''}
                  </span>
                  <p className="text-[11px] text-purple-200/90 italic leading-snug">
                    {charMeme}
                  </p>
                </div>
              )}

              {(profile.green_flags.length > 0 || profile.red_flags.length > 0) && (
                <div className="grid grid-cols-1 gap-1.5">
                  {profile.green_flags.length > 0 && (
                    <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-2xl space-y-0.5">
                      <span className="flex items-center gap-1 text-xs font-black text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {rawSmashDict?.greenFlags || ''}
                      </span>
                      <ul className="text-xs text-emerald-200/90 space-y-0.5 pl-4 list-disc font-sans">
                        {profile.green_flags.map((flag: string, idx: number) => (
                          <li key={idx}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {profile.red_flags.length > 0 && (
                    <div className="bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-2xl space-y-0.5">
                      <span className="flex items-center gap-1 text-xs font-black text-rose-400">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        {rawSmashDict?.redFlags || ''}
                      </span>
                      <ul className="text-xs text-rose-200/90 space-y-0.5 pl-4 list-disc font-sans">
                        {profile.red_flags.map((flag: string, idx: number) => (
                          <li key={idx}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {(profile.turn_on || dealbreaker) && (
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {profile.turn_on && (
                    <div className="bg-zinc-950/80 border border-zinc-800 p-2 rounded-2xl space-y-0.5">
                      <span className="font-bold text-pink-400 uppercase text-[10px]">
                        {rawSmashDict?.turnOn || ''}
                      </span>
                      <p className="text-zinc-300 font-medium text-[11px] leading-tight font-sans">{profile.turn_on}</p>
                    </div>
                  )}
                  {dealbreaker && (
                    <div className="bg-zinc-950/80 border border-zinc-800 p-2 rounded-2xl space-y-0.5">
                      <span className="font-bold text-amber-400 uppercase text-[10px]">
                        {rawSmashDict?.dealbreaker || ''}
                      </span>
                      <p className="text-zinc-300 font-medium text-[11px] leading-tight font-sans">{dealbreaker}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-zinc-800 shrink-0">
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onVote('pass', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                }}
                title={rawSmashDict?.pass || ''}
                aria-label={rawSmashDict?.pass || ''}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-zinc-900 border-2 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-xs font-bold transition-all cursor-pointer"
              >
                <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                <span>{rawSmashDict?.pass || ''}</span>
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
                title={rawSmashDict?.smash || ''}
                aria-label={rawSmashDict?.smash || ''}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-[#ff0055] text-white text-xs font-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,0,85,0.5)] cursor-pointer"
              >
                <Heart className="h-4 w-4 fill-white" aria-hidden="true" />
                <span>{rawSmashDict?.smash || ''}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {isZoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={zoomAriaLabel}
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090b]/90 backdrop-blur-2xl animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center justify-center"
          >
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              aria-label={dict?.modal?.close || ''}
              className="absolute -top-12 right-0 sm:right-2 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer shadow-lg z-10"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="relative overflow-hidden rounded-3xl border-2 border-pink-500/40 bg-zinc-950 shadow-[0_0_60px_rgba(255,0,85,0.4)]">
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
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent text-center font-mono">
                <h3 className="text-lg font-black text-zinc-100">{character.name}</h3>
                {charTagline && <p className="text-xs text-pink-300 font-sans italic">{charTagline}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};