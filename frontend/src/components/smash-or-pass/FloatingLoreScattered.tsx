// frontend/src/components/smash-or-pass/FloatingLoreScattered.tsx
'use client';

import React from 'react';
import {
  Skull,
  Shield,
  CheckCircle2,
  Sparkles,
  Quote,
  User,
  AlertTriangle,
} from 'lucide-react';
import { SmashSounds } from './SmashSoundEffects';
import { EntityItem } from '@/types/smashOrPass';

interface FloatingLoreScatteredProps {
  character: EntityItem | null;
  locale?: string;
  dict?: any;
}

export const FloatingLoreScattered: React.FC<FloatingLoreScatteredProps> = ({
  character,
  dict,
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

  // Localized Labels
  const loreLabels = dict?.smashOrPass?.loreLabels || {};
  const trialClassificationLabel = loreLabels.trialClassification || 'Trial Classification';
  const datingArchetypeLabel = loreLabels.datingArchetype || 'Dating Archetype';
  const greenFlagLabel = loreLabels.greenFlag || 'Trial Green Flag';
  const redFlagLabel = loreLabels.redFlag || 'Trial Warning';
  const identityProfileLabel = loreLabels.identityProfile || 'Identity Profile';
  const signatureQuoteLabel = loreLabels.signatureQuote || 'Signature Quote';

  const genderLabel = isMonster
    ? loreLabels.monster || 'Eldritch / Monster'
    : isFemale
    ? loreLabels.female || 'Female'
    : loreLabels.male || 'Male';

  const roleLabel = isSurvivor
    ? dict?.smashOrPass?.filters?.survivors || 'Survivor'
    : dict?.smashOrPass?.filters?.killers || 'Killer';

  const handleCardHover = () => {
    SmashSounds.playHoverTick();
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none">
      {/* 1. Giant Background Watermark Name with Dynamic Chromatic Glitch & Glow on Hover */}
      <div
        key={`watermark-${character.slug}`}
        className="pointer-events-auto absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center opacity-[0.04] hover:opacity-15 transition-all duration-500 cursor-default group z-0"
        onMouseEnter={handleCardHover}
      >
        <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[11rem] font-black uppercase tracking-widest text-zinc-100 font-mono group-hover:text-pink-500 group-hover:drop-shadow-[0_0_60px_rgba(255,0,85,0.8)] transition-all duration-500 inline-block group-hover:scale-105 transform group-hover:tracking-wider">
          {character.name}
        </span>
      </div>

      {/* 2. LEFT WING - Flanking the card cleanly without clipping into sidebar */}
      <div className="absolute left-4 xl:left-8 2xl:left-14 top-16 bottom-16 hidden lg:flex flex-col justify-between max-w-[260px] xl:max-w-[300px] pointer-events-none">
        {/* Left Item 1: Classification */}
        <div
          key={`role-${character.slug}`}
          className="pointer-events-auto transition-all duration-300 hover:scale-105 hover:-translate-x-1 cursor-pointer group"
          onMouseEnter={handleCardHover}
        >
          <div
            className={`flex items-center gap-3 p-3.5 xl:p-4 rounded-3xl border-2 backdrop-blur-2xl shadow-2xl transition-all duration-300 ${
              isSurvivor
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.2)] group-hover:border-emerald-400 group-hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] group-hover:bg-emerald-900/90'
                : isMonster
                ? 'bg-purple-950/70 border-purple-500/40 text-purple-300 shadow-[0_0_25px_rgba(168,85,247,0.2)] group-hover:border-purple-400 group-hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] group-hover:bg-purple-900/90'
                : 'bg-rose-950/70 border-rose-500/40 text-rose-300 shadow-[0_0_25px_rgba(255,0,85,0.2)] group-hover:border-rose-400 group-hover:shadow-[0_0_40px_rgba(255,0,85,0.5)] group-hover:bg-rose-900/90'
            }`}
          >
            <span className="flex h-10 w-10 xl:h-11 xl:w-11 items-center justify-center rounded-2xl bg-black/60 border border-white/10 shrink-0 group-hover:scale-110 transition-transform">
              {isSurvivor ? (
                <Shield className="h-5 w-5 text-emerald-400" />
              ) : (
                <Skull className="h-5 w-5 text-rose-400" />
              )}
            </span>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 block group-hover:text-zinc-200 transition-colors">
                {trialClassificationLabel}
              </span>
              <span className="text-xs xl:text-sm font-black font-mono tracking-tight text-white block group-hover:text-pink-300 transition-colors">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Left Item 2: Dating Archetype */}
        <div
          key={`title-${character.slug}`}
          className="pointer-events-auto transition-all duration-300 hover:scale-105 hover:-translate-x-1 cursor-pointer group"
          onMouseEnter={handleCardHover}
        >
          <div className="p-3.5 xl:p-4 rounded-3xl bg-zinc-950/80 border-2 border-pink-500/30 backdrop-blur-2xl shadow-2xl space-y-1 transition-all duration-300 group-hover:border-pink-500 group-hover:shadow-[0_0_45px_rgba(255,0,85,0.5)] group-hover:bg-zinc-900/95">
            <div className="flex items-center gap-1.5 text-pink-400">
              <Sparkles className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                {datingArchetypeLabel}
              </span>
            </div>
            <p className="text-xs xl:text-sm font-black text-white font-mono leading-tight group-hover:text-pink-300 transition-colors">
              {charTitle}
            </p>
            <p className="text-[11px] text-zinc-400 italic line-clamp-2 leading-relaxed group-hover:text-zinc-200 transition-colors">
              {charTagline}
            </p>
          </div>
        </div>

        {/* Left Item 3: Green Flag */}
        {greenFlags.length > 0 && (
          <div
            key={`green-${character.slug}`}
            className="pointer-events-auto transition-all duration-300 hover:scale-105 hover:-translate-x-1 cursor-pointer group"
            onMouseEnter={handleCardHover}
          >
            <div className="p-3.5 rounded-3xl bg-emerald-950/60 border-2 border-emerald-500/30 backdrop-blur-2xl shadow-2xl space-y-1 transition-all duration-300 group-hover:border-emerald-400 group-hover:shadow-[0_0_45px_rgba(16,185,129,0.5)] group-hover:bg-emerald-900/90">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                  {greenFlagLabel}
                </span>
              </div>
              <p className="text-xs font-semibold text-emerald-200 leading-snug group-hover:text-white transition-colors">
                {greenFlags[0]}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. RIGHT WING - Flanking the right side of the card */}
      <div className="absolute right-4 xl:right-8 2xl:right-14 top-16 bottom-16 hidden lg:flex flex-col justify-between max-w-[260px] xl:max-w-[300px] pointer-events-none">
        {/* Right Item 1: Identity Profile */}
        <div
          key={`gender-${character.slug}`}
          className="pointer-events-auto transition-all duration-300 hover:scale-105 hover:translate-x-1 cursor-pointer group"
          onMouseEnter={handleCardHover}
        >
          <div className="flex items-center gap-3 p-3.5 xl:p-4 rounded-3xl bg-zinc-950/80 border-2 border-cyan-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 group-hover:border-cyan-400 group-hover:shadow-[0_0_45px_rgba(6,182,212,0.5)] group-hover:bg-zinc-900/95">
            <span className="flex h-10 w-10 xl:h-11 xl:w-11 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 shrink-0 text-cyan-400 group-hover:scale-110 transition-transform">
              <User className="h-5 w-5" />
            </span>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 block group-hover:text-zinc-200 transition-colors">
                {identityProfileLabel}
              </span>
              <span className="text-xs xl:text-sm font-black font-mono tracking-tight text-white capitalize block group-hover:text-cyan-300 transition-colors">
                {genderLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Right Item 2: Signature Quote */}
        <div
          key={`quote-${character.slug}`}
          className="pointer-events-auto transition-all duration-300 hover:scale-105 hover:translate-x-1 cursor-pointer group"
          onMouseEnter={handleCardHover}
        >
          <div className="p-3.5 xl:p-4 rounded-3xl bg-zinc-950/80 border-2 border-amber-500/30 backdrop-blur-2xl shadow-2xl space-y-1 transition-all duration-300 group-hover:border-amber-400 group-hover:shadow-[0_0_45px_rgba(245,158,11,0.5)] group-hover:bg-zinc-900/95">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Quote className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                {signatureQuoteLabel}
              </span>
            </div>
            <p className="text-[11px] xl:text-xs text-amber-100 font-serif italic leading-relaxed group-hover:text-white transition-colors">
              {charQuote}
            </p>
          </div>
        </div>

        {/* Right Item 3: Red Flag / Trial Warning */}
        {redFlags.length > 0 && (
          <div
            key={`red-${character.slug}`}
            className="pointer-events-auto transition-all duration-300 hover:scale-105 hover:translate-x-1 cursor-pointer group"
            onMouseEnter={handleCardHover}
          >
            <div className="p-3.5 rounded-3xl bg-rose-950/60 border-2 border-rose-500/30 backdrop-blur-2xl shadow-2xl space-y-1 transition-all duration-300 group-hover:border-rose-400 group-hover:shadow-[0_0_45px_rgba(255,0,85,0.5)] group-hover:bg-rose-900/90">
              <div className="flex items-center gap-1.5 text-rose-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                  {redFlagLabel}
                </span>
              </div>
              <p className="text-xs font-semibold text-rose-200 leading-snug group-hover:text-white transition-colors">
                {redFlags[0]}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
