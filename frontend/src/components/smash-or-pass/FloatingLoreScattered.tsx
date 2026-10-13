'use client';
// frontend/src/components/smash-or-pass/FloatingLoreScattered.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
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
  const t = dict.smashOrPass;
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
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
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
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl leading-flat font-black uppercase tracking-wider text-text-primary group-hover:text-accent-red group-hover:drop-shadow-[0_0_20px_color-mix(in_oklab,var(--accent-red)_35%,transparent)] transition-all duration-500 group-hover:scale-105 transform"
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
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl leading-flat font-black uppercase tracking-wider text-text-primary group-hover:text-accent-red group-hover:drop-shadow-[0_0_20px_color-mix(in_oklab,var(--accent-red)_35%,transparent)] transition-all duration-500 group-hover:scale-105 transform"
          >
            {rightWatermark}
          </FitText>
        </div>
      </div>

      {/* 2. LEFT FLANKING DOSSIER WING */}
      <div className="pointer-events-none absolute left-2 sm:left-4 @[1040px]/hub:left-6 top-[calc(var(--smash-header)+1rem)] bottom-12 hidden @[880px]/hub:flex flex-col justify-between w-[clamp(11rem,calc((100cqw-var(--smash-card-w,26.25rem))/2-2.5rem),18.75rem)] space-y-4 p-2 pt-3">
        {/* Left Item 1: Trial Classification - Hidden for now */}

        {/* Left Item 2: Dating Archetype (Tilt Right +2deg & Crimson Flare) */}
        <div
          key={`title-${character.slug}`}
          data-lore-card=""
          className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-[1.02] @[1040px]/hub:hover:scale-105 @[1040px]/hub:hover:rotate-2 cursor-pointer group"
          style={{ animationDelay: '80ms' }}
          onMouseEnter={handleCardHover}
        >
          <div className="relative pt-4 pb-3 px-3.5 @[1040px]/hub:pt-5 @[1040px]/hub:pb-3.5 @[1040px]/hub:px-4 rounded-2xl lore-ash-card lore-ash-crimson backdrop-blur-2xl transition-all duration-300 text-center">
            <div
              data-lore-label=""
              className="sr-only @[1040px]/hub:not-sr-only @[1040px]/hub:absolute @[1040px]/hub:top-0 @[1040px]/hub:-translate-y-1/2 @[1040px]/hub:left-1/2 @[1040px]/hub:-translate-x-1/2 @[1040px]/hub:inline-flex @[1040px]/hub:items-center @[1040px]/hub:justify-center px-2.5 bg-bg-surface z-10 text-accent-red"
            >
              <span className="type-label-2xs">
                {datingArchetypeLabel}
              </span>
            </div>
            <p className="text-sm font-black tracking-tight text-text-primary group-hover:text-accent-red transition-colors">
              {charTitle}
            </p>
            <p className="text-xs text-text-muted line-clamp-2 leading-snug group-hover:text-text-secondary transition-colors mt-0.5">
              {charTagline}
            </p>
          </div>
        </div>

        {/* Left Item 3: Turn On (Tilt Left -1deg & Emerald Glow) */}
        {profile.turn_on && (
          <div
            key={`turn-on-${character.slug}`}
            data-lore-card=""
            className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-[1.02] @[1040px]/hub:hover:scale-105 @[1040px]/hub:hover:-rotate-1 cursor-pointer group"
            style={{ animationDelay: '140ms' }}
            onMouseEnter={handleCardHover}
          >
            <div className="relative pt-4 pb-3 px-3.5 @[1040px]/hub:pt-5 @[1040px]/hub:pb-3.5 @[1040px]/hub:px-4 rounded-2xl lore-ash-card lore-ash-emerald backdrop-blur-2xl transition-all duration-300 text-center">
              <div
                data-lore-label=""
                className="sr-only @[1040px]/hub:not-sr-only @[1040px]/hub:absolute @[1040px]/hub:top-0 @[1040px]/hub:-translate-y-1/2 @[1040px]/hub:left-1/2 @[1040px]/hub:-translate-x-1/2 @[1040px]/hub:inline-flex @[1040px]/hub:items-center @[1040px]/hub:justify-center px-2.5 bg-bg-surface z-10 text-accent-green"
              >
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
      <div className="pointer-events-none absolute right-2 sm:right-4 @[1040px]/hub:right-6 top-[calc(var(--smash-header)+1rem)] bottom-12 hidden @[880px]/hub:flex flex-col justify-between w-[clamp(11rem,calc((100cqw-var(--smash-card-w,26.25rem))/2-2.5rem),18.75rem)] space-y-4 p-2 pt-3">
        {/* Right Item 1: Identity Profile - Hidden for now */}

        {/* Right Item 2: Signature Quote (Tilt Left -1deg & Gold Halo) */}
        <div
          key={`quote-${character.slug}`}
          data-lore-card=""
          className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-[1.02] @[1040px]/hub:hover:scale-105 @[1040px]/hub:hover:-rotate-1 cursor-pointer group"
          style={{ animationDelay: '120ms' }}
          onMouseEnter={handleCardHover}
        >
          <div className="relative pt-4 pb-3 px-3.5 @[1040px]/hub:pt-5 @[1040px]/hub:pb-3.5 @[1040px]/hub:px-4 rounded-2xl lore-ash-card lore-ash-amber backdrop-blur-2xl transition-all duration-300 text-center">
            <div
              data-lore-label=""
              className="sr-only @[1040px]/hub:not-sr-only @[1040px]/hub:absolute @[1040px]/hub:top-0 @[1040px]/hub:-translate-y-1/2 @[1040px]/hub:left-1/2 @[1040px]/hub:-translate-x-1/2 @[1040px]/hub:inline-flex @[1040px]/hub:items-center @[1040px]/hub:justify-center px-2.5 bg-bg-surface z-10 text-accent-amber"
            >
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
            data-lore-card=""
            className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-[1.02] @[1040px]/hub:hover:scale-105 @[1040px]/hub:hover:rotate-1 cursor-pointer group"
            style={{ animationDelay: '160ms' }}
            onMouseEnter={handleCardHover}
          >
            <div className="relative pt-4 pb-3 px-3.5 @[1040px]/hub:pt-5 @[1040px]/hub:pb-3.5 @[1040px]/hub:px-4 rounded-2xl lore-ash-card lore-ash-crimson backdrop-blur-2xl transition-all duration-300 text-center">
              <div
                data-lore-label=""
                className="sr-only @[1040px]/hub:not-sr-only @[1040px]/hub:absolute @[1040px]/hub:top-0 @[1040px]/hub:-translate-y-1/2 @[1040px]/hub:left-1/2 @[1040px]/hub:-translate-x-1/2 @[1040px]/hub:inline-flex @[1040px]/hub:items-center @[1040px]/hub:justify-center px-2.5 bg-bg-surface z-10 text-accent-red"
              >
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
