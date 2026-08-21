// frontend/src/components/smash-or-pass/FloatingLoreScattered.tsx
'use client';

import React, { useMemo } from 'react';
import {
  Skull,
  Shield,
  CheckCircle2,
  Sparkles,
  Quote,
  User,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { SmashSounds } from './SmashSoundEffects';
import { EntityItem } from '@/types/smashOrPass';

interface FloatingLoreScatteredProps {
  character: EntityItem | null;
  locale?: string;
}

export const FloatingLoreScattered: React.FC<FloatingLoreScatteredProps> = ({
  character,
}) => {
  if (!character) return null;

  const isSurvivor = character.role === 'Survivor';
  const isMonster = character.gender === 'monster_other';
  const isFemale = character.gender === 'female';

  const metadata = character.metadata || character.metadata_json || {};
  const charTitle = metadata.title || metadata.archetype || character.role;
  const charTagline =
    metadata.tagline ||
    (isSurvivor ? 'Searching for an escape in the fog' : 'Stalking prey in the entity’s realm');
  const charQuote = metadata.quote || metadata.lore_quote || `"${character.name}"`;
  const greenFlags: string[] =
    metadata.green_flags || metadata.greenFlags || ['Loyal trial companion', 'Protective instincts'];
  const redFlags: string[] =
    metadata.red_flags || metadata.redFlags || ['Unpredictable in the fog'];

  // Collision-safe responsive coordinates for floating elements
  const layout = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < character.slug.length; i++) {
      seed = (seed << 5) - seed + character.slug.charCodeAt(i);
      seed |= 0;
    }
    const rand = (min: number, max: number, offset: number) => {
      const v = Math.abs((seed * (offset + 1) * 9301 + 49297) % 233280) / 233280;
      return Math.floor(min + v * (max - min));
    };

    return {
      // Left Wing: Role Badge
      roleTop: rand(160, 230, 1),
      roleLeft: rand(2, 6, 2),

      // Left Wing: Archetype & Tagline
      titleTop: rand(300, 390, 3),
      titleLeft: rand(1, 5, 4),

      // Left Wing: Green Flag
      greenTop: rand(480, 580, 5),
      greenLeft: rand(2, 7, 6),

      // Right Wing: Gender/Identity Badge
      genderTop: rand(160, 230, 7),
      genderRight: rand(2, 6, 8),

      // Right Wing: Signature Quote Card
      quoteTop: rand(300, 400, 9),
      quoteRight: rand(1, 5, 10),

      // Right Wing: Red Flag / Warning
      redTop: rand(480, 580, 11),
      redRight: rand(2, 7, 12),
    };
  }, [character.slug]);

  const handleCardHover = () => {
    SmashSounds.playHoverTick();
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden select-none">
      {/* 1. Giant Background Watermark Name with Dynamic Chromatic Glitch & Glow on Hover */}
      <div
        key={`watermark-${character.slug}`}
        className="pointer-events-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center opacity-10 hover:opacity-30 transition-all duration-500 cursor-default group z-0"
        onMouseEnter={handleCardHover}
      >
        <span className="text-7xl sm:text-8xl md:text-9xl lg:text-[11rem] xl:text-[13rem] font-black uppercase tracking-widest text-zinc-100/30 font-mono group-hover:text-pink-500/80 group-hover:drop-shadow-[0_0_60px_rgba(255,0,85,0.8)] transition-all duration-500 inline-block group-hover:scale-105 transform group-hover:tracking-wider">
          {character.name}
        </span>
      </div>

      {/* 2. Left Wing - Role Classification Badge */}
      <div
        key={`role-${character.slug}`}
        style={{ top: `${layout.roleTop}px`, left: `${layout.roleLeft}vw` }}
        className="pointer-events-auto absolute hidden md:block max-w-[280px] z-10 transition-all duration-300 hover:scale-110 hover:-rotate-2 hover:z-30 cursor-pointer group"
        onMouseEnter={handleCardHover}
      >
        <div
          className={`flex items-center gap-3 p-4 rounded-3xl border-2 backdrop-blur-2xl shadow-2xl transition-all duration-300 animate-pulse-subtle ${
            isSurvivor
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.25)] group-hover:border-emerald-400 group-hover:shadow-[0_0_40px_rgba(16,185,129,0.7)] group-hover:bg-emerald-900/90'
              : isMonster
              ? 'bg-purple-950/80 border-purple-500/40 text-purple-300 shadow-[0_0_25px_rgba(168,85,247,0.25)] group-hover:border-purple-400 group-hover:shadow-[0_0_40px_rgba(168,85,247,0.7)] group-hover:bg-purple-900/90'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300 shadow-[0_0_25px_rgba(255,0,85,0.25)] group-hover:border-rose-400 group-hover:shadow-[0_0_40px_rgba(255,0,85,0.7)] group-hover:bg-rose-900/90'
          }`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/60 border border-white/10 shrink-0 group-hover:scale-110 transition-transform">
            {isSurvivor ? (
              <Shield className="h-6 w-6 text-emerald-400" />
            ) : (
              <Skull className="h-6 w-6 text-rose-400" />
            )}
          </span>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 block group-hover:text-white transition-colors">
              Trial Classification
            </span>
            <span className="text-sm font-black font-mono tracking-tight text-white block group-hover:text-pink-300 transition-colors">
              {character.role}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Left Wing - Archetype & Tagline */}
      <div
        key={`title-${character.slug}`}
        style={{ top: `${layout.titleTop}px`, left: `${layout.titleLeft}vw` }}
        className="pointer-events-auto absolute hidden md:block max-w-[310px] z-10 transition-all duration-300 hover:scale-110 hover:rotate-2 hover:z-30 cursor-pointer group"
        onMouseEnter={handleCardHover}
      >
        <div className="p-4 rounded-3xl bg-zinc-950/85 border-2 border-pink-500/40 backdrop-blur-2xl shadow-2xl space-y-1.5 transition-all duration-300 group-hover:border-pink-500 group-hover:shadow-[0_0_45px_rgba(255,0,85,0.6)] group-hover:bg-zinc-900/95">
          <div className="flex items-center gap-1.5 text-pink-400">
            <Sparkles className="h-4 w-4 animate-spin" style={{ animationDuration: '4s' }} />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
              Dating Archetype
            </span>
          </div>
          <p className="text-sm font-black text-white font-mono leading-tight group-hover:text-pink-300 transition-colors">
            {charTitle}
          </p>
          <p className="text-xs text-zinc-300 italic line-clamp-2 leading-relaxed group-hover:text-white transition-colors">
            {charTagline}
          </p>
        </div>
      </div>

      {/* 4. Left Wing - Signature Green Flag */}
      {greenFlags.length > 0 && (
        <div
          key={`green-${character.slug}`}
          style={{ top: `${layout.greenTop}px`, left: `${layout.greenLeft}vw` }}
          className="pointer-events-auto absolute hidden lg:block max-w-[280px] z-10 transition-all duration-300 hover:scale-110 hover:-rotate-2 hover:z-30 cursor-pointer group"
          onMouseEnter={handleCardHover}
        >
          <div className="p-3.5 rounded-3xl bg-emerald-950/70 border-2 border-emerald-500/40 backdrop-blur-2xl shadow-2xl space-y-1 transition-all duration-300 group-hover:border-emerald-400 group-hover:shadow-[0_0_45px_rgba(16,185,129,0.6)] group-hover:bg-emerald-900/90">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                Trial Green Flag
              </span>
            </div>
            <p className="text-xs font-semibold text-emerald-200 leading-snug group-hover:text-white transition-colors">
              {greenFlags[0]}
            </p>
          </div>
        </div>
      )}

      {/* 5. Right Wing - Gender / Identity Badge */}
      <div
        key={`gender-${character.slug}`}
        style={{ top: `${layout.genderTop}px`, right: `${layout.genderRight}vw` }}
        className="pointer-events-auto absolute hidden md:block max-w-[280px] z-10 transition-all duration-300 hover:scale-110 hover:rotate-2 hover:z-30 cursor-pointer group"
        onMouseEnter={handleCardHover}
      >
        <div className="flex items-center gap-3 p-4 rounded-3xl bg-zinc-950/85 border-2 border-cyan-500/40 backdrop-blur-2xl shadow-2xl transition-all duration-300 group-hover:border-cyan-400 group-hover:shadow-[0_0_45px_rgba(6,182,212,0.6)] group-hover:bg-zinc-900/95">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 shrink-0 text-cyan-400 group-hover:scale-110 transition-transform">
            <User className="h-6 w-6" />
          </span>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 block group-hover:text-white transition-colors">
              Identity Profile
            </span>
            <span className="text-sm font-black font-mono tracking-tight text-white capitalize block group-hover:text-cyan-300 transition-colors">
              {isMonster ? 'Eldritch Monster' : isFemale ? 'Female' : 'Male'}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Right Wing - Signature Voice Quote */}
      <div
        key={`quote-${character.slug}`}
        style={{ top: `${layout.quoteTop}px`, right: `${layout.quoteRight}vw` }}
        className="pointer-events-auto absolute hidden md:block max-w-[320px] z-10 transition-all duration-300 hover:scale-110 hover:-rotate-2 hover:z-30 cursor-pointer group"
        onMouseEnter={handleCardHover}
      >
        <div className="p-4 rounded-3xl bg-zinc-950/85 border-2 border-amber-500/40 backdrop-blur-2xl shadow-2xl space-y-1.5 transition-all duration-300 group-hover:border-amber-400 group-hover:shadow-[0_0_45px_rgba(245,158,11,0.6)] group-hover:bg-zinc-900/95">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Quote className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
              Signature Quote
            </span>
          </div>
          <p className="text-xs text-amber-100 font-serif italic leading-relaxed group-hover:text-white transition-colors">
            {charQuote}
          </p>
        </div>
      </div>

      {/* 7. Right Wing - Red Flag / Warning */}
      {redFlags.length > 0 && (
        <div
          key={`red-${character.slug}`}
          style={{ top: `${layout.redTop}px`, right: `${layout.redRight}vw` }}
          className="pointer-events-auto absolute hidden lg:block max-w-[280px] z-10 transition-all duration-300 hover:scale-110 hover:rotate-2 hover:z-30 cursor-pointer group"
          onMouseEnter={handleCardHover}
        >
          <div className="p-3.5 rounded-3xl bg-rose-950/70 border-2 border-rose-500/40 backdrop-blur-2xl shadow-2xl space-y-1 transition-all duration-300 group-hover:border-rose-400 group-hover:shadow-[0_0_45px_rgba(255,0,85,0.6)] group-hover:bg-rose-900/90">
            <div className="flex items-center gap-1.5 text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                Trial Warning
              </span>
            </div>
            <p className="text-xs font-semibold text-rose-200 leading-snug group-hover:text-white transition-colors">
              {redFlags[0]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
