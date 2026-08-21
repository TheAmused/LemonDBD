// frontend/src/components/smash-or-pass/CharacterCard.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Heart,
  X,
  Zap,
  RotateCw,
  Maximize2,
  ChevronUp,
  Shield,
  Skull,
  Sparkles,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { CharacterRosterItem } from './characterRoster';
import { getLocalizedCharacterRoster } from './rosterTranslations';
import { CardDisintegrationOverlay } from './CardDisintegrationOverlay';
import { ChaosMetricsDisplay, DangerLevelType } from './ChaosMetricsDisplay';
import { SmashSounds } from './SmashSoundEffects';
import { EntityItem, EntityMetadata } from '@/types/smashOrPass';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import { getBackendBaseUrl } from '@/utils/perkUtils';

export interface CharacterCardProps {
  character: CharacterRosterItem | EntityItem | any;
  stats?: {
    smash_count?: number;
    pass_count?: number;
    super_smash_count?: number;
    total_votes?: number;
    smash_rate?: number;
    chaos_rating?: number;
    [key: string]: any;
  };
  onVote: (vote: 'smash' | 'pass' | 'super_smash', origin?: { x: number; y: number }) => void;
  onOpenStats?: (character: CharacterRosterItem | EntityItem | any) => void;
  onDragUpdate?: (x: number, y: number, isDragging: boolean) => void;
  isTopCard?: boolean;
  isExiting?: boolean;
  exitType?: 'smash' | 'pass' | 'super_smash' | null;
  initialExitOffset?: { x: number; y: number };
  onExitComplete?: () => void;
  locale?: string;
  dict?: any;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character: rawCharacter,
  stats,
  onVote,
  onOpenStats,
  onDragUpdate,
  isTopCard = true,
  isExiting = false,
  exitType = null,
  initialExitOffset,
  onExitComplete,
  locale = 'en',
  dict,
}) => {
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [tilt, setTilt] = useState<{ x: number; y: number; glossX: number; glossY: number }>({
    x: 0,
    y: 0,
    glossX: 50,
    glossY: 50,
  });

  // Extract / Resolve full normalized metadata
  const slug = rawCharacter.slug || rawCharacter.character_slug || rawCharacter.id || '';
  const localized = getLocalizedCharacterRoster(slug, locale);

  const meta: EntityMetadata = {
    ...((localized as any)?.metadata || {}),
    ...(rawCharacter?.metadata_json || {}),
    ...(rawCharacter?.metadata || {}),
  };

  const name = rawCharacter.name || rawCharacter.character_name || localized.name || 'Unknown Candidate';
  const role: 'Survivor' | 'Killer' | string = rawCharacter.role || localized.role || 'Survivor';
  const gender: 'female' | 'male' | 'monster_other' | string = rawCharacter.gender || localized.gender || 'female';
  const title = meta.title || rawCharacter.title || localized.title || 'Trial Candidate';
  const bio = meta.backstory || rawCharacter.bio || localized.bio || '';
  const quote = meta.lore_quote || meta.quote || rawCharacter.quote || localized.quote || rawCharacter.tagline || '';
  const greenFlags: string[] = rawCharacter.greenFlags || meta.compatibility_tags || localized.greenFlags || [];
  const redFlags: string[] = rawCharacter.redFlags || localized.redFlags || [];
  const turnOn = rawCharacter.turnOn || localized.turnOn || '';
  const dealbreaker = rawCharacter.dealbreaker || localized.dealbreaker || '';

  // Unified character data object for sub-components
  const normalizedCharacter = useMemo(
    () => ({
      ...localized,
      ...rawCharacter,
      slug,
      name,
      role,
      gender,
      title,
      bio,
      quote,
      greenFlags,
      redFlags,
      turnOn,
      dealbreaker,
      metadata: meta,
    }),
    [localized, rawCharacter, slug, name, role, gender, title, bio, quote, greenFlags, redFlags, turnOn, dealbreaker, meta]
  );

  // Chaos Rating (0-100) & Danger Level
  const chaosScore = useMemo(() => {
    if (meta.chaos_score !== undefined) return Number(meta.chaos_score);
    if (stats?.chaos_rating !== undefined && stats.chaos_rating !== null) return Number(stats.chaos_rating);
    const slugStr = slug || name || 'dbd';
    let hash = 0;
    for (let i = 0; i < slugStr.length; i++) {
      hash = (hash << 5) - hash + slugStr.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash);
    const isKiller = role === 'Killer';
    const isMonster = gender === 'monster_other';
    if (isKiller) return isMonster ? 88 + (absHash % 12) : 68 + (absHash % 25);
    return 20 + (absHash % 42);
  }, [meta.chaos_score, stats?.chaos_rating, slug, name, role, gender]);

  const dangerLevel: DangerLevelType = useMemo(() => {
    if (meta.danger_level) return meta.danger_level as DangerLevelType;
    if (chaosScore >= 88) return 'Lethal';
    if (chaosScore >= 68) return 'High';
    if (chaosScore >= 42) return 'Medium';
    return 'Low';
  }, [meta.danger_level, chaosScore]);

  const archetype = meta.archetype || title;

  // Touch Swipe Drag State
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>(initialExitOffset || { x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const cardRef = useRef<HTMLDivElement | null>(null);
  const backendBase = getBackendBaseUrl();
  const isSurvivor = role === 'Survivor';

  const avatarSrc =
    rawCharacter.media_url ||
    resolveAvatarUrl(
      backendBase,
      {
        name,
        category: role,
        avatar_local_path: `avatars/${isSurvivor ? 'survivors' : 'killers'}/${slug}.png`,
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

    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

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
    const superSmashThreshold = 80;

    if (dragOffset.y > superSmashThreshold && Math.abs(dragOffset.y) > Math.abs(dragOffset.x * 0.7)) {
      onVote('super_smash');
    } else if (dragOffset.x > threshold) {
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
  const isDraggingDown = (dragOffset.y > 35 && Math.abs(dragOffset.y) > Math.abs(dragOffset.x * 0.6)) || exitType === 'super_smash';
  const isSwipingRight = (!isDraggingDown && dragOffset.x > 30) || exitType === 'smash';
  const isSwipingLeft = (!isDraggingDown && dragOffset.x < -30) || exitType === 'pass';

  const dragRotation = dragOffset.x * 0.08 + (isDraggingDown ? (dragOffset.x >= 0 ? 1 : -1) * (dragOffset.y * 0.02) : 0);

  // Danger theme details
  const dangerTheme = useMemo(() => {
    switch (dangerLevel) {
      case 'Lethal':
      case 'Eldritch':
        return {
          border: 'border-[#ff0055]/60',
          bg: 'bg-[#ff0055]/15',
          text: 'text-[#ff0055]',
          glow: 'shadow-[0_0_12px_rgba(255,0,85,0.4)]',
          icon: <Flame className="h-3 w-3 text-[#ff0055] animate-pulse" />,
        };
      case 'High':
        return {
          border: 'border-orange-500/50',
          bg: 'bg-orange-950/40',
          text: 'text-orange-400',
          glow: 'shadow-[0_0_12px_rgba(249,115,22,0.4)]',
          icon: <AlertTriangle className="h-3 w-3 text-orange-400" />,
        };
      case 'Medium':
        return {
          border: 'border-[#ffd166]/50',
          bg: 'bg-amber-950/40',
          text: 'text-[#ffd166]',
          glow: 'shadow-[0_0_12px_rgba(255,209,102,0.4)]',
          icon: <Zap className="h-3 w-3 text-[#ffd166]" />,
        };
      case 'Low':
      default:
        return {
          border: 'border-[#00f5d4]/50',
          bg: 'bg-emerald-950/40',
          text: 'text-[#00f5d4]',
          glow: 'shadow-[0_0_12px_rgba(0,245,212,0.4)]',
          icon: <Shield className="h-3 w-3 text-[#00f5d4]" />,
        };
    }
  }, [dangerLevel]);

  // Localized Labels
  const smashLabel = dict?.smashOrPass?.smash || 'Smash';
  const passLabel = dict?.smashOrPass?.pass || 'Pass';
  const superSmashLabel = dict?.smashOrPass?.superSmash || 'Super Smash';
  const statsLabel = dict?.smashOrPass?.stats || 'Dossier';

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
        className={`relative select-none w-[88vw] max-w-[350px] sm:max-w-[390px] md:max-w-[425px] aspect-[9/14] sm:aspect-[9/15] rounded-[32px] sm:rounded-[36px] overflow-hidden border-2 cursor-grab active:cursor-grabbing shadow-2xl transition-all duration-300 ${
          isSwipingRight
            ? 'border-[#ff0055] bg-rose-950/90 shadow-[0_0_55px_rgba(255,0,85,0.7)]'
            : isSwipingLeft
            ? 'border-[#00f5d4] bg-cyan-950/90 shadow-[0_0_55px_rgba(0,245,212,0.7)]'
            : isDraggingDown
            ? 'border-[#ffd166] bg-amber-950/90 shadow-[0_0_55px_rgba(255,209,102,0.7)]'
            : 'border-zinc-800/80 bg-[#09090b] shadow-[0_0_35px_rgba(0,0,0,0.9)] hover:border-[#ff0055]/30'
        }`}
      >
        {/* Specular gloss reflection */}
        <div
          className="pointer-events-none absolute inset-0 z-20 opacity-25 mix-blend-overlay transition-opacity"
          style={{
            background: `radial-gradient(circle at ${tilt.glossX}% ${tilt.glossY}%, rgba(255,255,255,0.8) 0%, transparent 60%)`,
          }}
        />

        {/* Subtle high-contrast noise overlay pattern */}
        <div
          className="pointer-events-none absolute inset-0 z-10 opacity-[0.07] mix-blend-screen"
          style={{
            backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
            backgroundSize: '4px 4px',
          }}
        />

        {/* ACTIVE DISINTEGRATION OVERLAY (Renders on TOP at 100% opacity) */}
        {isExiting && exitType && (
          <CardDisintegrationOverlay exitType={exitType} onComplete={onExitComplete} />
        )}

        {/* SWIPE STAMP BADGES */}
        {isSwipingRight && !isExiting && (
          <div className="pointer-events-none absolute top-8 left-6 z-30 transform -rotate-12 border-4 border-[#ff0055] bg-[#09090b]/95 px-4 py-2.5 rounded-3xl shadow-[0_0_30px_rgba(255,0,85,0.8)] animate-in zoom-in-75 duration-150 flex items-center gap-2">
            <Heart className="h-7 w-7 sm:h-8 sm:w-8 fill-[#ff0055] text-[#ff0055] animate-pulse" />
            <span className="font-mono font-black text-sm sm:text-base text-[#ff0055] uppercase tracking-wider">
              {smashLabel}
            </span>
          </div>
        )}

        {isSwipingLeft && !isExiting && (
          <div className="pointer-events-none absolute top-8 right-6 z-30 transform rotate-12 border-4 border-[#00f5d4] bg-[#09090b]/95 px-4 py-2.5 rounded-3xl shadow-[0_0_30px_rgba(0,245,212,0.8)] animate-in zoom-in-75 duration-150 flex items-center gap-2">
            <X className="h-7 w-7 sm:h-8 sm:w-8 text-[#00f5d4]" />
            <span className="font-mono font-black text-sm sm:text-base text-[#00f5d4] uppercase tracking-wider">
              {passLabel}
            </span>
          </div>
        )}

        {isDraggingDown && !isExiting && (
          <div className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 z-30 border-4 border-[#ffd166] bg-[#09090b]/95 px-5 py-2.5 rounded-3xl shadow-[0_0_35px_rgba(255,209,102,0.85)] animate-in zoom-in-75 duration-150 flex items-center gap-2">
            <Zap className="h-7 w-7 sm:h-8 sm:w-8 fill-[#ffd166] text-[#ffd166] animate-bounce" />
            <span className="font-mono font-black text-sm sm:text-base text-[#ffd166] uppercase tracking-wider">
              {superSmashLabel}
            </span>
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
                : isExiting && exitType === 'super_smash'
                ? 'brightness(1.5) contrast(1.3) drop-shadow(0 0 50px rgba(255,209,102,0.95))'
                : isExiting && exitType === 'smash'
                ? 'brightness(1.3) contrast(1.2) drop-shadow(0 0 40px rgba(255,0,85,0.9))'
                : 'none',
          }}
          className="relative h-full w-full"
        >
          {/* ================= CARD FRONT ================= */}
          <div
            style={{ backfaceVisibility: 'hidden' }}
            className={`absolute inset-0 h-full w-full flex flex-col justify-between transition-opacity duration-300 ${
              isFlipped ? 'pointer-events-none opacity-0 invisible' : 'pointer-events-auto opacity-100 z-20'
            }`}
          >
            {/* Edge-to-Edge Avatar Portrait Artwork */}
            <div className="absolute inset-0 z-0 bg-[#09090b] overflow-hidden">
              <img
                src={avatarSrc}
                alt={name}
                className="h-full w-full object-cover object-top pointer-events-none transition-transform duration-700 select-none"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/5/53/IconHelpLoading_players.png/revision/latest';
                }}
              />
              {/* Dual Vignette Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-transparent to-slate-950/90 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent pointer-events-none" />
            </div>

            {/* TOP CONTROLS & BADGE BAR */}
            <div className="relative z-30 flex items-start justify-between p-3.5 sm:p-4 gap-2">
              {/* Badges Stack: Role, Gender, Danger Level, Archetype */}
              <div className="flex flex-wrap items-center gap-1.5 max-w-[75%]">
                {/* Role Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase font-mono border backdrop-blur-md ${
                    isSurvivor
                      ? 'border-[#00f5d4]/40 bg-[#00f5d4]/15 text-[#00f5d4] shadow-[0_0_10px_rgba(0,245,212,0.3)]'
                      : 'border-[#ff0055]/40 bg-[#ff0055]/15 text-[#ff0055] shadow-[0_0_10px_rgba(255,0,85,0.3)]'
                  }`}
                >
                  {isSurvivor ? <Shield className="h-3 w-3" /> : <Skull className="h-3 w-3" />}
                  <span>{role}</span>
                </span>

                {/* Danger Level Tag */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase font-mono border backdrop-blur-md ${dangerTheme.border} ${dangerTheme.bg} ${dangerTheme.text} ${dangerTheme.glow}`}
                >
                  {dangerTheme.icon}
                  <span>{dangerLevel}</span>
                </span>

                {/* Archetype Pill */}
                {archetype && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono border border-zinc-700/80 bg-zinc-950/80 text-zinc-300 backdrop-blur-md truncate max-w-[130px] sm:max-w-[160px]">
                    <Sparkles className="h-2.5 w-2.5 text-[#ffd166] shrink-0" />
                    <span className="truncate">{archetype}</span>
                  </span>
                )}
              </div>

              {/* Top-Right: Quick Dossier Expand Button (↑ / Flip) */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    SmashSounds.playFlipSound();
                    setIsFlipped(true);
                  }}
                  title="Expand Dossier (↑)"
                  className="group flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-[#09090b]/85 border border-zinc-700/80 text-zinc-200 hover:text-[#00f5d4] hover:border-[#00f5d4] hover:scale-110 active:scale-95 transition-all shadow-xl backdrop-blur-md cursor-pointer"
                >
                  <ChevronUp className="h-5 w-5 group-hover:-translate-y-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsZoomed(true);
                  }}
                  title="Zoom Full Portrait"
                  className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-[#09090b]/85 border border-zinc-700/80 text-zinc-300 hover:text-white hover:border-[#ff0055]/50 hover:scale-110 active:scale-95 transition-all shadow-xl backdrop-blur-md cursor-pointer"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* BOTTOM INFO & ACTION BAR */}
            <div className="relative z-30 p-4 space-y-3">
              {/* Character Details Banner */}
              <div className="space-y-1 text-left">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight drop-shadow-md truncate">
                    {name}
                  </h2>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-[#ffd166] shrink-0 font-bold">
                    <Sparkles className="h-3 w-3" />
                    <span>{chaosScore}% Chaos</span>
                  </div>
                </div>
                {title && (
                  <p className="text-xs text-rose-300/90 font-medium italic line-clamp-1">
                    {title}
                  </p>
                )}
                {quote && (
                  <p className="text-[11px] text-zinc-400 font-serif italic line-clamp-1 opacity-90">
                    &ldquo;{quote}&rdquo;
                  </p>
                )}
              </div>

              {/* 4 Interactive Action Triggers with Hover Glitch & Tactile Audio */}
              <div className="flex items-center justify-between gap-2 pt-1">
                {/* 1. PASS BUTTON (Void Cyan ✖) */}
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    SmashSounds.playPassSound();
                    const rect = e.currentTarget.getBoundingClientRect();
                    onVote('pass', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                  }}
                  title={`${passLabel} (Left Arrow)`}
                  className="group flex-1 flex h-12 sm:h-13 items-center justify-center rounded-2xl bg-[#09090b]/90 border-2 border-zinc-700 text-zinc-400 hover:text-[#00f5d4] hover:border-[#00f5d4] hover:bg-[#00f5d4]/10 hover:shadow-[0_0_20px_rgba(0,245,212,0.4)] hover:scale-105 active:scale-95 transition-all shadow-xl backdrop-blur-md cursor-pointer"
                >
                  <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-200" />
                </button>

                {/* 2. SUPER SMASH BUTTON (Eldritch Gold ⚡) */}
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    SmashSounds.playSuperSmashSound();
                    const rect = e.currentTarget.getBoundingClientRect();
                    onVote('super_smash', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                  }}
                  title={`${superSmashLabel} (Down Arrow)`}
                  className="group flex-1 flex h-12 sm:h-13 items-center justify-center rounded-2xl bg-[#09090b]/90 border-2 border-zinc-700 text-zinc-400 hover:text-[#ffd166] hover:border-[#ffd166] hover:bg-[#ffd166]/10 hover:shadow-[0_0_20px_rgba(255,209,102,0.4)] hover:scale-105 active:scale-95 transition-all shadow-xl backdrop-blur-md cursor-pointer"
                >
                  <Zap className="h-6 w-6 group-hover:scale-125 transition-transform duration-200" />
                </button>

                {/* 3. DOSSIER / STATS BUTTON (ℹ / ↑) */}
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    SmashSounds.playFlipSound();
                    setIsFlipped(true);
                  }}
                  title={`${statsLabel} (Up Arrow)`}
                  className="group flex-1 flex h-12 sm:h-13 items-center justify-center rounded-2xl bg-[#09090b]/90 border-2 border-zinc-700 text-zinc-400 hover:text-purple-300 hover:border-purple-500 hover:bg-purple-500/10 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95 transition-all shadow-xl backdrop-blur-md cursor-pointer"
                >
                  <Info className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                </button>

                {/* 4. SMASH BUTTON (Neon Crimson 💋 / Heart) */}
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    SmashSounds.playSmashSound();
                    const rect = e.currentTarget.getBoundingClientRect();
                    onVote('smash', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                  }}
                  title={`${smashLabel} (Right Arrow)`}
                  className="group flex-[1.4] flex h-12 sm:h-13 items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 via-[#ff0055] to-pink-600 text-white hover:border-[#ff0055] hover:shadow-[0_0_25px_rgba(255,0,85,0.65)] hover:scale-105 active:scale-95 transition-all shadow-2xl border-2 border-[#ff0055]/40 backdrop-blur-md cursor-pointer"
                >
                  <Heart className="h-6 w-6 fill-white group-hover:scale-125 transition-transform duration-200 animate-pulse" />
                </button>
              </div>
            </div>
          </div>

          {/* ================= CARD BACK (DATING DOSSIER & CHAOS METRICS) ================= */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
            className={`absolute inset-0 h-full w-full flex flex-col justify-between p-4 sm:p-5 text-left bg-[#09090b]/98 backdrop-blur-2xl space-y-2.5 overflow-y-auto transition-opacity duration-300 border border-zinc-800 ${
              !isFlipped ? 'pointer-events-none opacity-0 invisible' : 'pointer-events-auto opacity-100 z-30'
            }`}
          >
            {/* Top Bar on back: Flip on LEFT, Title in CENTER, Zoom on RIGHT */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  SmashSounds.playFlipSound();
                  setIsFlipped(false);
                }}
                title="Flip Back to Portrait"
                className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-700/80 text-zinc-200 hover:text-[#00f5d4] hover:border-[#00f5d4] hover:scale-110 active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                <RotateCw className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-1.5 px-2 min-w-0">
                <Sparkles className="h-4 w-4 text-[#ffd166] shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase font-mono tracking-wider text-zinc-100 truncate max-w-[160px] sm:max-w-[190px]">
                  {name}
                </h3>
              </div>

              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomed(true);
                }}
                title="Zoom Full Portrait"
                className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-700/80 text-zinc-200 hover:text-white hover:border-[#ff0055]/50 hover:scale-110 active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>

            {/* Lore & Backstory */}
            {bio && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Lore &amp; Dossier
                </span>
                <p className="text-xs text-zinc-200 leading-relaxed bg-zinc-900/90 p-2.5 sm:p-3 rounded-2xl border border-zinc-800 font-sans">
                  {bio}
                </p>
              </div>
            )}

            {/* Green & Red Flags */}
            <div className="grid grid-cols-1 gap-1.5">
              {greenFlags.length > 0 && (
                <div className="space-y-0.5 bg-emerald-950/30 border border-emerald-500/20 p-2.5 rounded-2xl">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 font-mono">
                    <CheckCircle2 className="h-3 w-3" /> Green Flags
                  </span>
                  <ul className="text-[11px] text-emerald-200/90 space-y-0.5 pl-4 list-disc font-sans">
                    {greenFlags.slice(0, 3).map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {redFlags.length > 0 && (
                <div className="space-y-0.5 bg-rose-950/30 border border-rose-500/20 p-2.5 rounded-2xl">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 font-mono">
                    <AlertTriangle className="h-3 w-3" /> Red Flags
                  </span>
                  <ul className="text-[11px] text-rose-200/90 space-y-0.5 pl-4 list-disc font-sans">
                    {redFlags.slice(0, 3).map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Turn-On & Dealbreaker */}
            {(turnOn || dealbreaker) && (
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {turnOn && (
                  <div className="bg-zinc-900/90 border border-zinc-800 p-2 rounded-2xl space-y-0.5">
                    <span className="font-bold text-[#ff0055] uppercase text-[9px] font-mono">Turn On:</span>
                    <p className="text-zinc-300 font-medium text-[11px] leading-tight line-clamp-2">{turnOn}</p>
                  </div>
                )}
                {dealbreaker && (
                  <div className="bg-zinc-900/90 border border-zinc-800 p-2 rounded-2xl space-y-0.5">
                    <span className="font-bold text-[#ffd166] uppercase text-[9px] font-mono">Dealbreaker:</span>
                    <p className="text-zinc-300 font-medium text-[11px] leading-tight line-clamp-2">{dealbreaker}</p>
                  </div>
                )}
              </div>
            )}

            {/* Embedded ChaosMetricsDisplay */}
            <div className="pt-1">
              <ChaosMetricsDisplay
                compact={true}
                character={normalizedCharacter}
                stats={stats}
                dict={dict}
                onOpenStats={() => onOpenStats?.(normalizedCharacter)}
              />
            </div>

            {/* Back Face Bottom Actions */}
            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  SmashSounds.playPassSound();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onVote('pass', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                }}
                title={passLabel}
                className="flex-1 flex h-11 sm:h-12 items-center justify-center rounded-2xl bg-zinc-900 border-2 border-zinc-700 text-zinc-300 hover:text-[#00f5d4] hover:border-[#00f5d4] transition-all cursor-pointer"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  SmashSounds.playSuperSmashSound();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onVote('super_smash', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                }}
                title={superSmashLabel}
                className="flex-1 flex h-11 sm:h-12 items-center justify-center rounded-2xl bg-zinc-900 border-2 border-zinc-700 text-zinc-300 hover:text-[#ffd166] hover:border-[#ffd166] transition-all cursor-pointer"
              >
                <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  SmashSounds.playSmashSound();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onVote('smash', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                }}
                title={smashLabel}
                className="flex-[1.4] flex h-11 sm:h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 to-[#ff0055] text-white hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
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
          aria-label={`${name} Full Portrait`}
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090b]/90 backdrop-blur-2xl animate-in fade-in duration-200 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-[90vw] md:max-w-2xl overflow-hidden rounded-3xl border border-[#ff0055]/30 bg-[#09090b] shadow-2xl flex flex-col cursor-default"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 p-4 bg-zinc-950/80">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-zinc-100">{name}</span>
                {title && <span className="text-xs text-rose-400">({title})</span>}
              </div>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative aspect-[3/4] w-full bg-[#09090b] overflow-hidden flex items-center justify-center p-2">
              <img
                src={avatarSrc}
                alt={name}
                className="h-full w-full object-contain drop-shadow-2xl"
              />
            </div>

            <div className="p-4 bg-zinc-950/90 border-t border-zinc-800 flex items-center justify-between gap-4">
              <span className="text-xs text-zinc-400 italic font-serif truncate">
                {quote}
              </span>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="px-4 py-1.5 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer shrink-0"
              >
                {dict?.smashOrPass?.close || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
