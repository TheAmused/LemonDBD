'use client';
// frontend/src/components/smash-or-pass/FloatingLoreScattered.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import {
  CheckCircle2,
  Sparkles,
  Quote,
  User,
  AlertTriangle,
  Zap,
  Flame,
} from 'lucide-react';
import { SmashSounds } from './SmashSoundEffects';
import { EntityItem, RosterCustomLabels } from '@/types/smashOrPass';
import { localizedProfile } from '@/utils/entityProfile';
import { resolveWatermarks } from '@/utils/smashWatermarks';
import { FitText } from '@/components/common/FitText';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import { isKiller as isKillerRole, isSurvivor as isSurvivorRole } from '@/utils/characterUtils';

interface FloatingLoreScatteredProps {
  character: EntityItem | null;
  locale?: string;
  customLabels?: RosterCustomLabels;
}

export const FloatingLoreScattered: React.FC<FloatingLoreScatteredProps> = ({ character, locale = 'en', customLabels }) => {
  const dict = useDictionary();
  const ctxDict = useDictionary();
  const t = (dict ?? ctxDict).smashOrPass;
  if (!character) return null;

  const isSurvivor = isSurvivorRole(character.role);
  const isKiller = isKillerRole(character.role);
  const isMonster = character.gender === 'monster_other';
  const isFemale = character.gender === 'female';

  // `metadata_json` is gone from the wire (it was a duplicate of `metadata`), and so is
  // the `i18n` blob that sat next to `translations`. One profile, one locale overlay.
  const currentLoc = locale || 'en';
  const profile = localizedProfile(character.metadata, currentLoc);

  // Defaults for an entity with no profile yet -- localized copy from the dictionary,
  // not data fallbacks; localizedProfile already resolved locale vs. English.
  const charTitle = profile.archetype || (isSurvivor ? t.loreTitleSurvivor : isKiller ? t.loreTitleKiller : character.role);
  const charTagline = profile.tagline || (isSurvivor ? t.loreTaglineSurvivor : t.loreTaglineKiller);

  // Quote resolution: profile quote -> known signature quote for this locale -> generic copy.
  const charQuote =
    profile.quote ||
    t.knownQuotes[character.slug] ||
    formatMessage(isSurvivor ? t.loreQuoteSurvivor : t.loreQuoteKiller, { name: character.name });

  const displayGreenFlags: string[] = profile.green_flags.length
    ? profile.green_flags
    : currentLoc === 'pl'
    ? ['Niezłomna lojalność w próbie', 'Instynkt przetrwania']
    : ['Loyal trial companion', 'Protective instincts'];

  const displayRedFlags: string[] = profile.red_flags.length
    ? profile.red_flags
    : currentLoc === 'pl'
    ? ['Nieprzewidywalność we mgle']
    : ['Unpredictable in the fog'];

  // Localized Labels
  const loreLabels = dict.smashOrPass.loreLabels;
  const trialClassificationLabel = loreLabels.trialClassification;
  const datingArchetypeLabel = customLabels?.dating_vibe || loreLabels.datingArchetype;
  const greenFlagLabel = loreLabels.greenFlag;
  const redFlagLabel = loreLabels.redFlag;
  const identityProfileLabel = loreLabels.identityProfile;
  const signatureQuoteLabel = customLabels?.quote || loreLabels.signatureQuote;
  const turnOnLabel = customLabels?.turn_on || loreLabels.turn_on;
  const dealbreakerLabel = customLabels?.dealbreaker || loreLabels.dealbreaker;

  const genderLabel = isMonster
    ? loreLabels.monster
    : isFemale
    ? loreLabels.female
    : loreLabels.male;

  const roleLabel = isSurvivor
    ? dict.smashOrPass.filters.survivors
    : dict.smashOrPass.filters.killers;

  const handleCardHover = () => {
    SmashSounds.playHoverTick();
  };

    const { leftWatermark, rightWatermark } = resolveWatermarks(character);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-x-clip select-none">
      {/* 1. FLANKING WATERMARK TYPOGRAPHY (DUAL-IDENTITY: LEFT & RIGHT AROUND CARD) */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        {/* Left Side: Watermark Left */}
        <div
          key={`watermark-left-${character.slug}`}
          className="pointer-events-auto anim-watermark-dissolve absolute top-[44%] -translate-y-1/2 right-[50%] mr-32 sm:mr-40 md:mr-52 lg:mr-64 w-[max(5rem,calc(50%-8rem-1rem))] sm:w-[max(5rem,calc(50%-10rem-1rem))] md:w-[max(5rem,calc(50%-13rem-1rem))] lg:w-[max(14rem,calc(50%-16rem-1rem))] text-center opacity-[0.07] dark:opacity-[0.04] hover:opacity-25 transition-all duration-500 cursor-default group"
          onMouseEnter={handleCardHover}
        >
          <FitText
            minScale={0.5}
            maxLines={4}
            wrapFirst
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl leading-flat font-black uppercase tracking-wider text-text-primary group-hover:text-accent-red group-hover:drop-shadow-[0_0_60px_var(--accent-red)] transition-all duration-500 group-hover:scale-105 transform"
          >
            {leftWatermark}
          </FitText>
        </div>

        {/* Right Side: Watermark Right */}
        <div
          key={`watermark-right-${character.slug}`}
          className="pointer-events-auto anim-watermark-dissolve absolute top-[44%] -translate-y-1/2 left-[50%] ml-32 sm:ml-40 md:ml-52 lg:ml-64 w-[max(5rem,calc(50%-8rem-1rem))] sm:w-[max(5rem,calc(50%-10rem-1rem))] md:w-[max(5rem,calc(50%-13rem-1rem))] lg:w-[max(14rem,calc(50%-16rem-1rem))] text-center opacity-[0.07] dark:opacity-[0.04] hover:opacity-25 transition-all duration-500 cursor-default group"
          style={{ animationDelay: '100ms' }}
          onMouseEnter={handleCardHover}
        >
          <FitText
            minScale={0.5}
            maxLines={4}
            wrapFirst
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl leading-flat font-black uppercase tracking-wider text-text-primary group-hover:text-accent-red group-hover:drop-shadow-[0_0_60px_var(--accent-red)] transition-all duration-500 group-hover:scale-105 transform"
          >
            {rightWatermark}
          </FitText>
        </div>
      </div>

      {/* 2. LEFT FLANKING DOSSIER WING */}
      <div className="absolute left-4 xl:left-8 2xl:left-14 top-24 bottom-12 hidden lg:flex flex-col justify-between max-w-[270px] xl:max-w-[310px] pointer-events-none space-y-3">
        {/* Left Item 1: Trial Classification - Hidden for now */}

        {/* Left Item 2: Dating Archetype (Tilt Right +2deg & Crimson Flare) */}
        <div
          key={`title-${character.slug}`}
          className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-105 hover:rotate-2 cursor-pointer group"
          style={{ animationDelay: '80ms' }}
          onMouseEnter={handleCardHover}
        >
          <div className="relative overflow-hidden p-3.5 xl:p-4 rounded-3xl bg-bg-surface/95 border-2 border-accent-red/40 backdrop-blur-2xl shadow-2xl space-y-1 transition-all duration-300 group-hover:border-accent-red group-hover:shadow-[0_0_50px_var(--accent-red)]">
            <div className="flex items-center gap-1.5 text-accent-red">
              <Sparkles className="h-3.5 w-3.5 animate-spin group-hover:scale-125 transition-transform" style={{ animationDuration: '4s' }} />
              <span className="type-label-2xs">
                {datingArchetypeLabel}
              </span>
            </div>
            <p className="text-sm font-black tracking-tight text-text-primary group-hover:text-accent-red transition-colors">
              {charTitle}
            </p>
            <p className="text-xs text-text-muted line-clamp-2 leading-snug group-hover:text-text-secondary transition-colors">
              {charTagline}
            </p>
          </div>
        </div>

        {/* Left Item 3: Turn On (Tilt Left -1deg & Emerald Glow) */}
        {profile.turn_on && (
          <div
            key={`turn-on-${character.slug}`}
            className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-105 hover:-rotate-1 cursor-pointer group"
            style={{ animationDelay: '140ms' }}
            onMouseEnter={handleCardHover}
          >
            <div className="relative overflow-hidden p-3.5 xl:p-4 rounded-3xl bg-bg-surface/95 border-2 border-accent-green/40 backdrop-blur-2xl shadow-2xl space-y-1 transition-all duration-300 group-hover:border-accent-green group-hover:shadow-[0_0_50px_var(--accent-green)]">
              <div className="flex items-center gap-1.5 text-accent-green">
                <Flame className="h-3.5 w-3.5 group-hover:scale-125 transition-transform" />
                <span className="type-label-2xs">
                  {turnOnLabel}
                </span>
              </div>
              <p className="text-xs font-medium text-text-primary line-clamp-3 leading-snug group-hover:text-accent-green transition-colors">
                {profile.turn_on}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. RIGHT FLANKING DOSSIER WING */}
      <div className="absolute right-4 xl:right-8 2xl:right-14 top-24 bottom-12 hidden lg:flex flex-col justify-between max-w-[270px] xl:max-w-[310px] pointer-events-none space-y-3">
        {/* Right Item 1: Identity Profile - Hidden for now */}

        {/* Right Item 2: Signature Quote (Tilt Left -1deg & Gold Halo) */}
        <div
          key={`quote-${character.slug}`}
          className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-105 hover:-rotate-1 cursor-pointer group"
          style={{ animationDelay: '120ms' }}
          onMouseEnter={handleCardHover}
        >
          <div className="relative overflow-hidden p-4 rounded-3xl bg-bg-surface/95 border-2 border-accent-amber/40 backdrop-blur-2xl shadow-2xl space-y-1.5 transition-all duration-300 group-hover:border-accent-amber group-hover:shadow-[0_0_50px_var(--accent-amber)]">
            <div className="flex items-center gap-1.5 text-accent-amber">
              <Quote className="h-3.5 w-3.5 group-hover:scale-125 group-hover:rotate-12 transition-transform" />
              <span className="type-label-2xs">
                {signatureQuoteLabel}
              </span>
            </div>
            <p className="type-body text-text-secondary italic group-hover:text-text-primary transition-colors">
              {charQuote}
            </p>
          </div>
        </div>

        {/* Right Item 3: Dealbreaker (Tilt Right +1deg & Rose Glow) */}
        {profile.dealbreaker && (
          <div
            key={`dealbreaker-${character.slug}`}
            className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-105 hover:rotate-1 cursor-pointer group"
            style={{ animationDelay: '160ms' }}
            onMouseEnter={handleCardHover}
          >
            <div className="relative overflow-hidden p-3.5 xl:p-4 rounded-3xl bg-bg-surface/95 border-2 border-accent-red/40 backdrop-blur-2xl shadow-2xl space-y-1 transition-all duration-300 group-hover:border-accent-red group-hover:shadow-[0_0_50px_var(--accent-red)]">
              <div className="flex items-center gap-1.5 text-accent-red">
                <AlertTriangle className="h-3.5 w-3.5 group-hover:scale-125 transition-transform" />
                <span className="type-label-2xs">
                  {dealbreakerLabel}
                </span>
              </div>
              <p className="text-xs font-medium text-text-primary line-clamp-3 leading-snug group-hover:text-accent-red transition-colors">
                {profile.dealbreaker}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
