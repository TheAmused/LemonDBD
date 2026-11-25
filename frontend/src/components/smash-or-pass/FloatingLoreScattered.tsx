'use client';
// frontend/src/components/smash-or-pass/FloatingLoreScattered.tsx

import React from 'react';
import { SmashSounds } from './SmashSoundEffects';
import type { EntityItem, RosterCustomLabels } from '@/types/smashOrPass';
import { localizedProfile } from '@/utils/entityProfile';
import { resolveWatermarks } from '@/utils/smashWatermarks';
import { FitText } from '@/components/common/FitText';
import { LoreWing } from './LoreWing';

import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import { isKiller as isKillerRole, isSurvivor as isSurvivorRole } from '@/utils/characterUtils';

interface FloatingLoreScatteredProps {
  character: EntityItem | null;
  locale?: string;
  customLabels?: RosterCustomLabels;
  /** Kept for interface compatibility; lore cards use semantic tone styles. */
  themeColor?: string;
}

export const FloatingLoreScattered: React.FC<FloatingLoreScatteredProps> = ({
  character,
  locale = 'en',
  customLabels,
  themeColor: _themeColor,
}) => {
  const dict = useDictionary();
  const t = dict.smashOrPass;
  if (!character) return null;

  const isSurvivor = isSurvivorRole(character.role);
  const isKiller = isKillerRole(character.role);
  const isCustom = character.roster_id !== 'canon';

  // `metadata_json` is gone from the wire (it was a duplicate of `metadata`), and so is
  // the `i18n` blob that sat next to `translations`. One profile, one locale overlay.
  const currentLoc = locale || 'en';
  const profile = localizedProfile(character.metadata, currentLoc);

  // Defaults for an entity: custom rosters never receive DBD canon fallbacks
  const charTagline =
    profile.tagline || (isCustom ? '' : isSurvivor ? t.loreTaglineSurvivor : isKiller ? t.loreTaglineKiller : '');
  // The simple roster creator has no tagline field, so there the dating vibe is what the author wrote.
  const datingVibeText = charTagline || profile.dating_vibe;

  // Quote resolution: custom rosters only show explicit quotes, never canon DBD survivor/killer templates
  const charQuote =
    profile.quote ||
    (isCustom
      ? ''
      : t.knownQuotes[character.slug] ||
        formatMessage(isKiller ? t.loreQuoteKiller : t.loreQuoteSurvivor, { name: character.name }));

  // Localized Labels
  const loreLabels = dict.smashOrPass.loreLabels;
  const datingVibeLabel = customLabels?.dating_vibe || loreLabels.datingVibe;
  const signatureQuoteLabel = customLabels?.quote || loreLabels.signatureQuote;
  const turnOnLabel = customLabels?.turn_on || loreLabels.turn_on;
  const dealbreakerLabel = customLabels?.dealbreaker || loreLabels.dealbreaker;

  const handleCardHover = () => {
    SmashSounds.playHoverTick();
  };

    const { leftWatermark, rightWatermark } = resolveWatermarks(character);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      {/* 1. FLANKING WATERMARK TYPOGRAPHY (DUAL-IDENTITY: LEFT & RIGHT AROUND CARD) */}
      <div className="pointer-events-none absolute inset-0 z-0 hidden @hub-lg/hub:flex items-center justify-center overflow-hidden">
        {/* Left Side: Watermark Left */}
        <div
          key={`watermark-left-${character.slug}`}
          className="pointer-events-auto anim-watermark-dissolve absolute top-lore -translate-y-1/2 right-1/2 mr-32 sm:mr-40 md:mr-52 lg:mr-64 w-lore-rail sm:w-lore-rail-sm md:w-lore-rail-md lg:w-lore-rail-lg text-center opacity-[0.12] dark:opacity-[0.04] hover:opacity-25 transition-all duration-500 cursor-default group"
          onMouseEnter={handleCardHover}
        >
          <FitText
            minScale={0.25}
            maxLines={4}
            wrapFirst
            disableTooltip
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl leading-flat font-black uppercase tracking-wider text-text-primary group-hover:text-accent-red group-hover:drop-shadow-glow-red-soft transition-all duration-500 group-hover:scale-105 transform"
          >
            {leftWatermark}
          </FitText>
        </div>

        {/* Right Side: Watermark Right */}
        <div
          key={`watermark-right-${character.slug}`}
          className="pointer-events-auto anim-watermark-dissolve absolute top-lore -translate-y-1/2 left-1/2 ml-32 sm:ml-40 md:ml-52 lg:ml-64 w-lore-rail sm:w-lore-rail-sm md:w-lore-rail-md lg:w-lore-rail-lg text-center opacity-[0.12] dark:opacity-[0.04] hover:opacity-25 transition-all duration-500 cursor-default group"
          style={{ animationDelay: '100ms' }}
          onMouseEnter={handleCardHover}
        >
          <FitText
            minScale={0.25}
            maxLines={4}
            wrapFirst
            disableTooltip
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl leading-flat font-black uppercase tracking-wider text-text-primary group-hover:text-accent-red group-hover:drop-shadow-glow-red-soft transition-all duration-500 group-hover:scale-105 transform"
          >
            {rightWatermark}
          </FitText>
        </div>
      </div>

      {/* 2. LEFT FLANKING DOSSIER WING */}
      <LoreWing
        side="left"
        upper={Boolean(datingVibeText) && (
          <div
            key={`tagline-${character.slug}`}
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
                  {datingVibeLabel}
                </span>
              </div>
              <p className="text-xs text-text-muted line-clamp-4 leading-snug group-hover:text-text-secondary transition-colors">
                {datingVibeText}
              </p>
            </div>
          </div>
        )}
        lower={profile.turn_on && (
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
      />

      {/* 3. RIGHT FLANKING DOSSIER WING */}
      <LoreWing
        side="right"
        upper={Boolean(charQuote) && (
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
        )}
        lower={profile.dealbreaker && (
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
      />
    </div>
  );
};
