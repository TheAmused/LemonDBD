'use client';
// frontend/src/components/smash-or-pass/FloatingLoreScattered.tsx

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
          className="pointer-events-auto anim-watermark-dissolve absolute top-lore -translate-y-1/2 right-1/2 mr-32 sm:mr-40 md:mr-52 lg:mr-64 w-lore-rail sm:w-lore-rail-sm md:w-lore-rail-md lg:w-lore-rail-lg text-center opacity-[0.07] dark:opacity-[0.04] hover:opacity-25 transition-all duration-500 cursor-default group"
          onMouseEnter={handleCardHover}
        >
          <FitText
            minScale={0.5}
            maxLines={4}
            wrapFirst
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl leading-flat font-black uppercase tracking-wider text-text-primary group-hover:text-accent-red group-hover:drop-shadow-glow-red-soft transition-all duration-500 group-hover:scale-105 transform"
          >
            {leftWatermark}
          </FitText>
        </div>

        {/* Right Side: Watermark Right */}
        <div
          key={`watermark-right-${character.slug}`}
          className="pointer-events-auto anim-watermark-dissolve absolute top-lore -translate-y-1/2 left-1/2 ml-32 sm:ml-40 md:ml-52 lg:ml-64 w-lore-rail sm:w-lore-rail-sm md:w-lore-rail-md lg:w-lore-rail-lg text-center opacity-[0.07] dark:opacity-[0.04] hover:opacity-25 transition-all duration-500 cursor-default group"
          style={{ animationDelay: '100ms' }}
          onMouseEnter={handleCardHover}
        >
          <FitText
            minScale={0.5}
            maxLines={4}
            wrapFirst
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl leading-flat font-black uppercase tracking-wider text-text-primary group-hover:text-accent-red group-hover:drop-shadow-glow-red-soft transition-all duration-500 group-hover:scale-105 transform"
          >
            {rightWatermark}
          </FitText>
        </div>
      </div>

      {/* 2. LEFT FLANKING DOSSIER WING */}
      <div className="pointer-events-none absolute left-2 sm:left-4 @hub-2xl/hub:left-6 top-below-smash-header bottom-12 hidden @hub-lg/hub:flex flex-col justify-between w-lore-column space-y-4 p-2 pt-3">
        {/* Left Item 1: Trial Classification - Hidden for now */}

        {/* Left Item 2: Dating Archetype (Tilt Right +2deg & Crimson Flare) */}
        <div
          key={`title-${character.slug}`}
          data-lore-card=""
          className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-[1.02] @hub-2xl/hub:hover:scale-105 @hub-2xl/hub:hover:rotate-2 cursor-pointer group"
          style={{ animationDelay: '80ms' }}
          onMouseEnter={handleCardHover}
        >
          <div className="relative pt-4 pb-3 px-3.5 @hub-2xl/hub:pt-5 @hub-2xl/hub:pb-3.5 @hub-2xl/hub:px-4 rounded-card lore-ash-card lore-ash-crimson backdrop-blur-2xl transition-all duration-300 text-center">
            <div
              data-lore-label=""
              className="sr-only @hub-2xl/hub:not-sr-only @hub-2xl/hub:absolute @hub-2xl/hub:top-0 @hub-2xl/hub:-translate-y-1/2 @hub-2xl/hub:left-1/2 @hub-2xl/hub:-translate-x-1/2 @hub-2xl/hub:inline-flex @hub-2xl/hub:items-center @hub-2xl/hub:justify-center px-2.5 bg-bg-surface z-10 w-max max-w-gutter text-accent-red"
            >
              <span className="type-label-2xs truncate whitespace-nowrap">
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
            className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-[1.02] @hub-2xl/hub:hover:scale-105 @hub-2xl/hub:hover:-rotate-1 cursor-pointer group"
            style={{ animationDelay: '140ms' }}
            onMouseEnter={handleCardHover}
          >
            <div className="relative pt-4 pb-3 px-3.5 @hub-2xl/hub:pt-5 @hub-2xl/hub:pb-3.5 @hub-2xl/hub:px-4 rounded-card lore-ash-card lore-ash-emerald backdrop-blur-2xl transition-all duration-300 text-center">
              <div
                data-lore-label=""
                className="sr-only @hub-2xl/hub:not-sr-only @hub-2xl/hub:absolute @hub-2xl/hub:top-0 @hub-2xl/hub:-translate-y-1/2 @hub-2xl/hub:left-1/2 @hub-2xl/hub:-translate-x-1/2 @hub-2xl/hub:inline-flex @hub-2xl/hub:items-center @hub-2xl/hub:justify-center px-2.5 bg-bg-surface z-10 w-max max-w-gutter text-accent-green"
              >
                <span className="type-label-2xs truncate whitespace-nowrap">
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
      <div className="pointer-events-none absolute right-2 sm:right-4 @hub-2xl/hub:right-6 top-below-smash-header bottom-12 hidden @hub-lg/hub:flex flex-col justify-between w-lore-column space-y-4 p-2 pt-3">
        {/* Right Item 1: Identity Profile - Hidden for now */}

        {/* Right Item 2: Signature Quote (Tilt Left -1deg & Gold Halo) */}
        <div
          key={`quote-${character.slug}`}
          data-lore-card=""
          className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-[1.02] @hub-2xl/hub:hover:scale-105 @hub-2xl/hub:hover:-rotate-1 cursor-pointer group"
          style={{ animationDelay: '120ms' }}
          onMouseEnter={handleCardHover}
        >
          <div className="relative pt-4 pb-3 px-3.5 @hub-2xl/hub:pt-5 @hub-2xl/hub:pb-3.5 @hub-2xl/hub:px-4 rounded-card lore-ash-card lore-ash-amber backdrop-blur-2xl transition-all duration-300 text-center">
            <div
              data-lore-label=""
              className="sr-only @hub-2xl/hub:not-sr-only @hub-2xl/hub:absolute @hub-2xl/hub:top-0 @hub-2xl/hub:-translate-y-1/2 @hub-2xl/hub:left-1/2 @hub-2xl/hub:-translate-x-1/2 @hub-2xl/hub:inline-flex @hub-2xl/hub:items-center @hub-2xl/hub:justify-center px-2.5 bg-bg-surface z-10 w-max max-w-gutter text-accent-amber"
            >
              <span className="type-label-2xs truncate whitespace-nowrap">
                {signatureQuoteLabel}
              </span>
            </div>
            <p className="type-body text-text-secondary italic line-clamp-5 break-words group-hover:text-text-primary transition-colors">
              {charQuote}
            </p>
          </div>
        </div>

        {/* Right Item 3: Dealbreaker (Tilt Right +1deg & Rose Glow) */}
        {profile.dealbreaker && (
          <div
            key={`dealbreaker-${character.slug}`}
            data-lore-card=""
            className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-[1.02] @hub-2xl/hub:hover:scale-105 @hub-2xl/hub:hover:rotate-1 cursor-pointer group"
            style={{ animationDelay: '160ms' }}
            onMouseEnter={handleCardHover}
          >
            <div className="relative pt-4 pb-3 px-3.5 @hub-2xl/hub:pt-5 @hub-2xl/hub:pb-3.5 @hub-2xl/hub:px-4 rounded-card lore-ash-card lore-ash-crimson backdrop-blur-2xl transition-all duration-300 text-center">
              <div
                data-lore-label=""
                className="sr-only @hub-2xl/hub:not-sr-only @hub-2xl/hub:absolute @hub-2xl/hub:top-0 @hub-2xl/hub:-translate-y-1/2 @hub-2xl/hub:left-1/2 @hub-2xl/hub:-translate-x-1/2 @hub-2xl/hub:inline-flex @hub-2xl/hub:items-center @hub-2xl/hub:justify-center px-2.5 bg-bg-surface z-10 w-max max-w-gutter text-accent-red"
              >
                <span className="type-label-2xs truncate whitespace-nowrap">
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
