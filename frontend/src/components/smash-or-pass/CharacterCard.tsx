// frontend/src/components/smash-or-pass/CharacterCard.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCw,
  Heart,
  ThumbsDown,
  Maximize2,
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { CardDisintegrationOverlay } from './CardDisintegrationOverlay';
import { SmashSounds } from './SmashSoundEffects';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import { EntityItem } from '@/types/smashOrPass';

interface CharacterCardProps {
  character: EntityItem;
  onVote: (vote: 'smash' | 'pass', coords?: { x: number; y: number }) => void;
  isTopCard?: boolean;
  onDragUpdate?: (deltaX: number, deltaY: number, isDragging: boolean) => void;
  isExiting?: boolean;
  exitType?: 'smash' | 'pass' | null;
  initialExitOffset?: { x: number; y: number } | null;
  onExitComplete?: () => void;
  locale?: string;
  dict?: any;
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
}) => {
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [tilt, setTilt] = useState<{ x: number; y: number; glossX: number; glossY: number }>({
    x: 0,
    y: 0,
    glossX: 50,
    glossY: 50,
  });

  // Touch Swipe Drag State
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>(initialExitOffset || { x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const cardRef = useRef<HTMLDivElement | null>(null);
  const backendBase = getBackendBaseUrl();

  const isSurvivor = character.role === 'Survivor';

  const metadata = character.metadata || character.metadata_json || {};
  const charTitle = metadata.title || metadata.archetype || character.role;
  const charBio = metadata.bio || `A formidable candidate in the realm of the Fog.`;
  const charQuote = metadata.quote || metadata.lore_quote || `"${character.name}"`;
  const greenFlags: string[] = metadata.green_flags || metadata.greenFlags || ['Loyal trial companion', 'Protective instincts'];
  const redFlags: string[] = metadata.red_flags || metadata.redFlags || ['Unpredictable in the fog'];
  const turnOn: string = metadata.turn_on || metadata.turnOn || 'Courage and loyalty under pressure';
  const dealbreaker: string = metadata.dealbreaker || 'Betrayal of trust';

  const rawMedia = (character.media_url || '').replace('/static/icons/', '/static/avatars/');
  const avatarSrc =
    rawMedia.startsWith('http')
      ? rawMedia
      : rawMedia.startsWith('/static')
      ? `${backendBase}${rawMedia}`
      : resolveAvatarUrl(
          backendBase,
          {
            name: character.name,
            category: character.role,
            avatar_local_path: `avatars/${isSurvivor ? 'survivors' : 'killers'}/${character.slug}.png`,
          },
          isSurvivor
        );

  useEffect(() => {
    if (isExiting && initialExitOffset) {
      setDragOffset(initialExitOffset);
    }
  }, [isExiting, initialExitOffset]);

  // 3D Parallax Tilt (Desktop Mouse Move)
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
    if (!isExiting) {
      setTilt({ x: 0, y: 0, glossX: 50, glossY: 50 });
    }
  };

  // Touch Gestures & Drag Swiping
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isTopCard || isExiting) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    touchStartRef.current = { x: clientX, y: clientY };
    onDragUpdate?.(0, 0, true);
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!isDragging || !isTopCard || isExiting) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const deltaX = clientX - touchStartRef.current.x;
      const deltaY = clientY - touchStartRef.current.y;

      setDragOffset({ x: deltaX, y: deltaY });
      onDragUpdate?.(deltaX, deltaY, true);
    },
    [isDragging, isTopCard, isExiting, onDragUpdate]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || !isTopCard || isExiting) return;
    setIsDragging(false);
    onDragUpdate?.(0, 0, false);

    const threshold = 85;
    if (dragOffset.x > threshold) {
      onVote('smash');
    } else if (dragOffset.x < -threshold) {
      onVote('pass');
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  }, [isDragging, isTopCard, isExiting, dragOffset, onVote, onDragUpdate]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleTouchMove);
      window.addEventListener('mouseup', handleTouchEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleTouchMove);
      window.removeEventListener('mouseup', handleTouchEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  // Drag Direction & Color-shifting aura calculation
  const isSwipingRight = dragOffset.x > 30 || exitType === 'smash';
  const isSwipingLeft = dragOffset.x < -30 || exitType === 'pass';
  const dragRotation = dragOffset.x * 0.08;

  return (
    <>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleTouchStart}
        onTouchStart={handleTouchStart}
        style={{
          transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0px) rotate(${
            isDragging || isExiting ? dragRotation : tilt.y * 0.5
          }deg) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: isDragging
            ? 'none'
            : isExiting
            ? 'transform 500ms ease-out'
            : 'transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          perspective: 1200,
        }}
        className={`relative select-none w-[88vw] max-w-[340px] sm:max-w-[380px] md:max-w-[420px] aspect-[9/14] sm:aspect-[9/15] rounded-[32px] sm:rounded-[36px] overflow-hidden border-2 cursor-grab active:cursor-grabbing shadow-2xl transition-all duration-300 ${
          isSwipingRight
            ? 'border-pink-500 bg-rose-950/90 shadow-[0_0_50px_rgba(244,63,94,0.6)]'
            : isSwipingLeft
            ? 'border-slate-600 bg-slate-950 shadow-[0_0_50px_rgba(15,23,42,0.85)]'
            : 'border-pink-500/30 bg-slate-950 shadow-[0_0_35px_rgba(0,0,0,0.85)]'
        }`}
      >
        {/* Specular gloss reflection */}
        <div
          className="pointer-events-none absolute inset-0 z-20 opacity-25 mix-blend-overlay transition-opacity"
          style={{
            background: `radial-gradient(circle at ${tilt.glossX}% ${tilt.glossY}%, rgba(255,255,255,0.7) 0%, transparent 60%)`,
          }}
        />

        {/* ACTIVE DISINTEGRATION OVERLAY */}
        {isExiting && exitType && (
          <CardDisintegrationOverlay exitType={exitType} onComplete={onExitComplete} />
        )}

        {/* SWIPE STAMP BADGES */}
        {isSwipingRight && !isExiting && (
          <div className="pointer-events-none absolute top-8 left-8 z-30 transform -rotate-12 border-4 border-rose-500 bg-rose-950/90 p-3.5 sm:p-4 rounded-3xl shadow-2xl animate-in zoom-in-75 duration-150">
            <Heart className="h-8 w-8 sm:h-10 sm:w-10 fill-rose-400 text-rose-400 animate-pulse" />
          </div>
        )}

        {isSwipingLeft && !isExiting && (
          <div className="pointer-events-none absolute top-8 right-8 z-30 transform rotate-12 border-4 border-slate-400 bg-slate-950/90 p-3.5 sm:p-4 rounded-3xl shadow-2xl animate-in zoom-in-75 duration-150">
            <ThumbsDown className="h-8 w-8 sm:h-10 sm:w-10 text-slate-300" />
          </div>
        )}

        {/* 3D FLIPPABLE CONTAINER */}
        <div
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 600ms cubic-bezier(0.4, 0.0, 0.2, 1), opacity 1500ms ease-out, filter 1500ms ease-out',
            opacity: isExiting ? 0.0 : 1,
            filter:
              isExiting && exitType === 'pass'
                ? 'grayscale(1) contrast(1.5) brightness(0.2) blur(4px)'
                : isExiting && exitType === 'smash'
                ? 'brightness(1.3) contrast(1.2) drop-shadow(0 0 40px rgba(244,63,94,0.9))'
                : 'none',
          }}
          className="relative h-full w-full"
        >
          {/* ================= CARD FRONT (PURE ARTWORK WITH ZERO TEXT) ================= */}
          <div
            style={{ backfaceVisibility: 'hidden' }}
            className={`absolute inset-0 h-full w-full flex flex-col justify-between transition-opacity duration-300 ${
              isFlipped ? 'pointer-events-none opacity-0 invisible' : 'pointer-events-auto opacity-100 z-20'
            }`}
          >
            {/* Edge-to-Edge Full Portrait Artwork */}
            <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden">
              <img
                src={avatarSrc}
                alt={character.name}
                className="h-full w-full object-cover object-top pointer-events-none transition-transform duration-700 select-none"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = '1';
                    target.src = `${backendBase}/static/avatars/${isSurvivor ? 'survivors' : 'killers'}/${character.slug}.png`;
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/60 pointer-events-none" />
            </div>

            {/* TOP CONTROLS BAR (ICON ONLY: FLIP & ZOOM) */}
            <div className="relative z-30 flex items-center justify-between p-3.5 sm:p-4">
              {/* Top-Left: Flip for Dating Profile Button */}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  SmashSounds.playFlipSound();
                  setIsFlipped(true);
                }}
                title="Flip for Character Lore & Stats"
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-slate-950/85 border border-slate-700/80 text-slate-200 hover:text-pink-300 hover:border-pink-400 hover:scale-110 active:scale-95 transition-all shadow-2xl backdrop-blur-md cursor-pointer"
              >
                <RotateCw className="h-5 w-5" />
              </button>

              {/* Top-Right: Zoom Full Portrait Button */}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  SmashSounds.playHoverTick();
                  setIsZoomed(true);
                }}
                title="Zoom Full Portrait"
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-slate-950/85 border border-slate-700/80 text-slate-200 hover:text-white hover:border-pink-400 hover:scale-110 active:scale-95 transition-all shadow-2xl backdrop-blur-md cursor-pointer"
              >
                <Maximize2 className="h-5 w-5" />
              </button>
            </div>

            {/* BOTTOM CONTROLS BAR (ICON ONLY: PASS ON LEFT, SMASH ON RIGHT) */}
            <div className="relative z-30 flex items-center justify-between p-3.5 sm:p-4">
              {/* Bottom-Left: PASS BUTTON */}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onVote('pass', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                }}
                title="Pass"
                className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-slate-950/90 border-2 border-slate-700 text-slate-400 hover:text-slate-100 hover:border-slate-400 hover:scale-110 active:scale-95 transition-all shadow-2xl backdrop-blur-md cursor-pointer"
              >
                <ThumbsDown className="h-6 w-6 sm:h-7 sm:w-7" />
              </button>

              {/* Bottom-Right: SMASH BUTTON */}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onVote('smash', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                }}
                title="Smash"
                className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:scale-110 active:scale-95 transition-all shadow-[0_0_25px_rgba(244,63,94,0.5)] cursor-pointer"
              >
                <Heart className="h-6 w-6 sm:h-7 sm:w-7 fill-white" />
              </button>
            </div>
          </div>

          {/* ================= CARD BACK (CHARACTER LORE & PROFILE FROM DATABASE) ================= */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
            className={`absolute inset-0 h-full w-full bg-slate-950/95 border border-slate-800 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto custom-scrollbar transition-opacity duration-300 ${
              isFlipped ? 'pointer-events-auto opacity-100 z-20' : 'pointer-events-none opacity-0 invisible'
            }`}
          >
            {/* Top Back Controls */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  SmashSounds.playFlipSound();
                  setIsFlipped(false);
                }}
                title="Flip Back to Artwork"
                className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:text-pink-300 hover:border-pink-400 hover:scale-110 active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                <RotateCw className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <Sparkles className="h-4 w-4 text-pink-400 shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100 truncate max-w-[170px] sm:max-w-[200px]">
                  {character.name}
                </h3>
              </div>

              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  SmashSounds.playHoverTick();
                  setIsZoomed(true);
                }}
                title="Zoom Full Portrait"
                className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:text-white hover:border-pink-400 hover:scale-110 active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                <Maximize2 className="h-5 w-5" />
              </button>
            </div>

            {/* Lore & Bio from DB */}
            <div className="space-y-1 my-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Lore &amp; Personality
              </span>
              <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/80 p-2.5 sm:p-3 rounded-2xl border border-slate-800">
                {charBio}
              </p>
            </div>

            {/* Green & Red Flags from DB */}
            <div className="grid grid-cols-1 gap-1.5 sm:gap-2 my-1">
              <div className="space-y-0.5 sm:space-y-1 bg-emerald-950/30 border border-emerald-500/20 p-2.5 rounded-2xl">
                <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Green Flags
                </span>
                <ul className="text-xs text-emerald-200/90 space-y-0.5 pl-4 list-disc">
                  {greenFlags.map((flag: string, idx: number) => (
                    <li key={idx}>{flag}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-0.5 sm:space-y-1 bg-rose-950/30 border border-rose-500/20 p-2.5 rounded-2xl">
                <span className="flex items-center gap-1 text-xs font-extrabold text-rose-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> Red Flags
                </span>
                <ul className="text-xs text-rose-200/90 space-y-0.5 pl-4 list-disc">
                  {redFlags.map((flag: string, idx: number) => (
                    <li key={idx}>{flag}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Turn-On & Dealbreaker from DB */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs my-1">
              <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-2xl space-y-0.5">
                <span className="font-bold text-pink-400 uppercase text-[10px]">Turn On:</span>
                <p className="text-slate-300 font-medium text-[11px] leading-tight">{turnOn}</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-2xl space-y-0.5">
                <span className="font-bold text-amber-400 uppercase text-[10px]">Dealbreaker:</span>
                <p className="text-slate-300 font-medium text-[11px] leading-tight">{dealbreaker}</p>
              </div>
            </div>

            {/* Bottom Actions on Back face */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onVote('pass', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                }}
                title="Pass"
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-slate-900 border-2 border-slate-700 text-slate-300 hover:text-white hover:border-slate-400 transition-all cursor-pointer"
              >
                <ThumbsDown className="h-5 w-5 sm:h-6 sm:w-6" />
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
                title="Smash"
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:scale-110 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                <Heart className="h-5 w-5 sm:h-6 sm:w-6 fill-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX ZOOM MODAL */}
      {isZoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${character.name} Full Portrait`}
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-[90vw] md:max-w-2xl overflow-hidden rounded-3xl border border-pink-500/30 bg-slate-900 shadow-2xl flex flex-col cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-100">{character.name}</span>
                <span className="text-xs text-rose-400">({charTitle})</span>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative aspect-[3/4] w-full bg-slate-950 overflow-hidden flex items-center justify-center p-2">
              <img
                src={avatarSrc}
                alt={character.name}
                className="h-full w-full object-contain drop-shadow-2xl"
              />
            </div>

            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 italic font-serif">
                {charQuote}
              </span>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
