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
  Zap,
  Flame,
  Radio,
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
  locale = 'en',
  dict,
}) => {
  if (!character) return null;

  const isSurvivor = character.role === 'Survivor';
  const isMonster = character.gender === 'monster_other';
  const isFemale = character.gender === 'female';

  const metadata = character.metadata || character.metadata_json || {};
  const currentLoc = locale || 'en';
  const locMeta = metadata.translations?.[currentLoc] || metadata.i18n?.[currentLoc] || {};

  const charTitle =
    locMeta.title ||
    metadata.title ||
    metadata.archetype ||
    (currentLoc === 'pl' ? (isSurvivor ? 'Ocalały we Mgle' : 'Zabójca we Mgle') : character.role);

  const charTagline =
    locMeta.tagline ||
    metadata.tagline ||
    (isSurvivor
      ? currentLoc === 'pl'
        ? 'Szuka drogi ucieczki w mrocznym wymiarze próby.'
        : 'Searching for an escape in the fog'
      : currentLoc === 'pl'
      ? 'Poluje na swoje ofiary w królestwie Bytu.'
      : 'Stalking prey in the entity’s realm');

  const charQuote = locMeta.quote || metadata.quote || metadata.lore_quote || `"${character.name}"`;
  const greenFlags: string[] =
    locMeta.green_flags ||
    metadata.green_flags ||
    metadata.greenFlags ||
    (currentLoc === 'pl'
      ? ['Lojalny towarzysz w próbie', 'Instynkt przetrwania']
      : ['Loyal trial companion', 'Protective instincts']);

  const redFlags: string[] =
    locMeta.red_flags ||
    metadata.red_flags ||
    metadata.redFlags ||
    (currentLoc === 'pl' ? ['Nieprzewidywalny we mgle'] : ['Unpredictable in the fog']);

  // Localized Labels
  const loreLabels = dict?.smashOrPass?.loreLabels || {};
  const trialClassificationLabel = loreLabels.trialClassification || (currentLoc === 'pl' ? 'Klasyfikacja Próby' : 'Trial Classification');
  const datingArchetypeLabel = loreLabels.datingArchetype || (currentLoc === 'pl' ? 'Archetyp Randkowy' : 'Dating Archetype');
  const greenFlagLabel = loreLabels.greenFlag || (currentLoc === 'pl' ? 'Zielona Flaga' : 'Trial Green Flag');
  const redFlagLabel = loreLabels.redFlag || (currentLoc === 'pl' ? 'Ostrzeżenie Próby' : 'Trial Warning');
  const identityProfileLabel = loreLabels.identityProfile || (currentLoc === 'pl' ? 'Profil Tożsamości' : 'Identity Profile');
  const signatureQuoteLabel = loreLabels.signatureQuote || (currentLoc === 'pl' ? 'Charakterystyczny Cytat' : 'Signature Quote');

  const genderLabel = isMonster
    ? loreLabels.monster || (currentLoc === 'pl' ? 'Potwór / Przedwieczny' : 'Eldritch / Monster')
    : isFemale
    ? loreLabels.female || (currentLoc === 'pl' ? 'Kobieta' : 'Female')
    : loreLabels.male || (currentLoc === 'pl' ? 'Mężczyzna' : 'Male');

  const roleLabel = isSurvivor
    ? dict?.smashOrPass?.filters?.survivors || (currentLoc === 'pl' ? 'Ocalały' : 'Survivor')
    : dict?.smashOrPass?.filters?.killers || (currentLoc === 'pl' ? 'Zabójca' : 'Killer');

  const handleCardHover = () => {
    SmashSounds.playHoverTick();
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none">
      {/* 1. Giant Background Watermark Name with Dynamic Chromatic Glitch & Glow on Hover */}
      <div
        key={`watermark-${character.slug}`}
        className="pointer-events-auto absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center opacity-[0.035] hover:opacity-20 transition-all duration-500 cursor-default group z-0"
        onMouseEnter={handleCardHover}
      >
        <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[11rem] font-black uppercase tracking-widest text-zinc-100 font-mono group-hover:text-pink-500 group-hover:drop-shadow-[0_0_80px_rgba(255,0,85,0.9)] transition-all duration-500 inline-block group-hover:scale-105 transform group-hover:tracking-wider">
          {character.name}
        </span>
      </div>

      {/* 2. LEFT FLANKING DOSSIER WING */}
      <div className="absolute left-4 xl:left-8 2xl:left-14 top-16 bottom-16 hidden lg:flex flex-col justify-between max-w-[270px] xl:max-w-[310px] pointer-events-none">
        {/* Left Item 1: Trial Classification & Radar Beacon */}
        <div
          key={`role-${character.slug}`}
          className="pointer-events-auto transition-all duration-300 hover:scale-105 hover:-translate-x-1 cursor-pointer group"
          onMouseEnter={handleCardHover}
        >
          <div
            className={`relative overflow-hidden p-4 rounded-3xl border-2 backdrop-blur-2xl shadow-2xl transition-all duration-300 ${
              isSurvivor
                ? 'bg-emerald-950/75 border-emerald-500/40 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.25)] group-hover:border-emerald-400 group-hover:shadow-[0_0_50px_rgba(16,185,129,0.55)] group-hover:bg-emerald-900/90'
                : isMonster
                ? 'bg-purple-950/75 border-purple-500/40 text-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.25)] group-hover:border-purple-400 group-hover:shadow-[0_0_50px_rgba(168,85,247,0.55)] group-hover:bg-purple-900/90'
                : 'bg-rose-950/75 border-rose-500/40 text-rose-300 shadow-[0_0_30px_rgba(255,0,85,0.25)] group-hover:border-rose-400 group-hover:shadow-[0_0_50px_rgba(255,0,85,0.55)] group-hover:bg-rose-900/90'
            }`}
          >
            {/* Holographic scanlines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/70 border border-white/10 shrink-0 group-hover:scale-110 group-hover:border-white/30 transition-all shadow-inner">
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
                  <span className="text-sm font-black font-mono tracking-tight text-white block group-hover:text-pink-300 transition-colors">
                    {roleLabel}
                  </span>
                </div>
              </div>
              <Radio className="h-4 w-4 animate-pulse opacity-70" />
            </div>
          </div>
        </div>

        {/* Left Item 2: Dating Archetype & Occult Aura */}
        <div
          key={`title-${character.slug}`}
          className="pointer-events-auto transition-all duration-300 hover:scale-105 hover:-translate-x-1 cursor-pointer group"
          onMouseEnter={handleCardHover}
        >
          <div className="relative overflow-hidden p-4 rounded-3xl bg-zinc-950/85 border-2 border-pink-500/35 backdrop-blur-2xl shadow-2xl space-y-1.5 transition-all duration-300 group-hover:border-[#ff0055] group-hover:shadow-[0_0_55px_rgba(255,0,85,0.6)] group-hover:bg-zinc-900/95">
            {/* Shimmering corner aura */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-pink-500/20 rounded-full blur-xl group-hover:bg-pink-500/40 transition-all" />

            <div className="flex items-center justify-between text-pink-400">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '5s' }} />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                  {datingArchetypeLabel}
                </span>
              </div>
              <Flame className="h-3.5 w-3.5 text-pink-400 group-hover:text-pink-300 animate-pulse" />
            </div>

            <p className="text-sm font-black text-white font-mono leading-tight group-hover:text-pink-300 transition-colors">
              {charTitle}
            </p>
            <p className="text-xs text-zinc-400 italic line-clamp-2 leading-relaxed group-hover:text-zinc-200 transition-colors">
              {charTagline}
            </p>
          </div>
        </div>

        {/* Left Item 3: Trial Green Flag */}
        {greenFlags.length > 0 && (
          <div
            key={`green-${character.slug}`}
            className="pointer-events-auto transition-all duration-300 hover:scale-105 hover:-translate-x-1 cursor-pointer group"
            onMouseEnter={handleCardHover}
          >
            <div className="relative overflow-hidden p-3.5 rounded-3xl bg-emerald-950/70 border-2 border-emerald-500/35 backdrop-blur-2xl shadow-2xl space-y-1 transition-all duration-300 group-hover:border-emerald-400 group-hover:shadow-[0_0_50px_rgba(16,185,129,0.55)] group-hover:bg-emerald-900/90">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
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

      {/* 3. RIGHT FLANKING DOSSIER WING */}
      <div className="absolute right-4 xl:right-8 2xl:right-14 top-16 bottom-16 hidden lg:flex flex-col justify-between max-w-[270px] xl:max-w-[310px] pointer-events-none">
        {/* Right Item 1: Identity Profile & Cyber Tag */}
        <div
          key={`gender-${character.slug}`}
          className="pointer-events-auto transition-all duration-300 hover:scale-105 hover:translate-x-1 cursor-pointer group"
          onMouseEnter={handleCardHover}
        >
          <div className="relative overflow-hidden flex items-center justify-between p-4 rounded-3xl bg-zinc-950/85 border-2 border-cyan-500/35 backdrop-blur-2xl shadow-2xl transition-all duration-300 group-hover:border-cyan-400 group-hover:shadow-[0_0_55px_rgba(6,182,212,0.6)] group-hover:bg-zinc-900/95">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 shrink-0 text-cyan-400 group-hover:scale-110 transition-transform shadow-inner">
                <User className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 block group-hover:text-zinc-200 transition-colors">
                  {identityProfileLabel}
                </span>
                <span className="text-sm font-black font-mono tracking-tight text-white capitalize block group-hover:text-cyan-300 transition-colors">
                  {genderLabel}
                </span>
              </div>
            </div>
            <Zap className="h-4 w-4 text-cyan-400/70 group-hover:text-cyan-300 animate-pulse" />
          </div>
        </div>

        {/* Right Item 2: Signature Quote */}
        <div
          key={`quote-${character.slug}`}
          className="pointer-events-auto transition-all duration-300 hover:scale-105 hover:translate-x-1 cursor-pointer group"
          onMouseEnter={handleCardHover}
        >
          <div className="relative overflow-hidden p-4 rounded-3xl bg-zinc-950/85 border-2 border-amber-500/35 backdrop-blur-2xl shadow-2xl space-y-1.5 transition-all duration-300 group-hover:border-amber-400 group-hover:shadow-[0_0_55px_rgba(245,158,11,0.6)] group-hover:bg-zinc-900/95">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Quote className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                {signatureQuoteLabel}
              </span>
            </div>
            <p className="text-xs text-amber-100 font-serif italic leading-relaxed group-hover:text-white transition-colors">
              {charQuote}
            </p>
          </div>
        </div>

        {/* Right Item 3: Trial Warning / Red Flag */}
        {redFlags.length > 0 && (
          <div
            key={`red-${character.slug}`}
            className="pointer-events-auto transition-all duration-300 hover:scale-105 hover:translate-x-1 cursor-pointer group"
            onMouseEnter={handleCardHover}
          >
            <div className="relative overflow-hidden p-3.5 rounded-3xl bg-rose-950/70 border-2 border-rose-500/35 backdrop-blur-2xl shadow-2xl space-y-1 transition-all duration-300 group-hover:border-rose-400 group-hover:shadow-[0_0_50px_rgba(255,0,85,0.55)] group-hover:bg-rose-900/90">
              <div className="flex items-center gap-1.5 text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
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
