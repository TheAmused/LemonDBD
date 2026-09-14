'use client';
// frontend/src/components/smash-or-pass/FloatingLoreScattered.tsx
import type { Dictionary } from '@/locales/types';

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
} from 'lucide-react';
import { SmashSounds } from './SmashSoundEffects';
import { EntityItem } from '@/types/smashOrPass';
import { localizedProfile } from '@/utils/entityProfile';

interface FloatingLoreScatteredProps {
  character: EntityItem | null;
  locale?: string;
  dict?: Dictionary;
}

// Known DBD signature quote translations
const KNOWN_QUOTES_PL: Record<string, string> = {
  claudette_morel: '„Rośliny cię nie oceniają. Po prostu leczą, jeśli traktujesz je z szacunkiem.”',
  claudette_morel_hoy: '„Nawet na tropikalnej plaży zioła lecznicze rosną w cieniu palm.”',
  meg_thomas: '„Biegnij tak szybko, jak potrafisz. Nigdy się nie zatrzymuj.”',
  sable_ward: '„Mrok ma swój własny powab, jeśli tylko nie boisz się w niego zanurzyć.”',
  dwight_fairfield: '„Jeśli będziemy trzymać się razem, przetrwamy wszystko.”',
  nea_karlsson: '„Zasady są po to, by je łamać, zwłaszcza we Mgle.”',
  feng_min: '„GG WP, albo postawisz mi boba tea i zagramy rewanż?”',
  the_trapper: '„Każdy krok może być twoim ostatnim potknięciem.”',
  the_huntress: '„Lulajże, lulaj... las nie wybacza słabości.”',
  the_trickster: '„Twój krzyk to najpiękniejsza symfonia na mojej scenie.”',
  the_spirit: '„Gniew przepływa przez moje żyły niczym lodowate ostrze.”',
  the_wraith: '„Dźwięk dzwonu zwiastuje twój nieuchronny koniec.”',
  the_nurse: '„Pozwól, że uwolnię cię od cierpienia tej próby.”',
  mikaela_reid: '„Wyciągnęłam z talii Kochanków i Wieżę. Szykuj się na dramat.”',
  yui_kimura: '„Ryk silnika daje mi wolność, której Byt nie zdoła odebrać.”',
};

export const FloatingLoreScattered: React.FC<FloatingLoreScatteredProps> = ({
  character,
  locale = 'en',
  dict,
}) => {
  if (!character) return null;

  const isSurvivor = character.role === 'Survivor';
  const isMonster = character.gender === 'monster_other';
  const isFemale = character.gender === 'female';

  // `metadata_json` is gone from the wire (it was a duplicate of `metadata`), and so is
  // the `i18n` blob that sat next to `translations`. One profile, one locale overlay.
  const currentLoc = locale || 'en';
  const profile = localizedProfile(character.metadata, currentLoc);

  // The remaining `||` chains here are hardcoded copy defaults for an entity with no
  // profile yet — not data fallbacks; localizedProfile already resolved locale vs. English.
  const charTitle =
    profile.archetype ||
    (currentLoc === 'pl' ? (isSurvivor ? 'Ocalały we Mgle' : 'Zabójca we Mgle') : character.role);

  const charTagline =
    profile.tagline ||
    (isSurvivor
      ? currentLoc === 'pl'
        ? 'Szuka drogi ucieczki w mrocznym wymiarze próby.'
        : 'Searching for an escape in the fog'
      : currentLoc === 'pl'
      ? 'Poluje na swoje ofiary w królestwie Bytu.'
      : 'Stalking prey in the entity’s realm');

  // Quote resolution: profile quote -> known Polish quote -> generic copy.
  // The old `locMeta.quote.startsWith('"Plants')` sniff is gone: it existed only because
  // the dead `i18n` blob held the untranslated English under `pl.quote`. `translations`
  // was always the good copy and is now the only one shipped.
  let charQuote = profile.quote;
  if (!charQuote) {
    if (currentLoc === 'pl') {
      charQuote =
        KNOWN_QUOTES_PL[character.slug] ||
        (isSurvivor
          ? `„W obliczu próby liczy się determinacja i zaufanie.” – ${character.name}`
          : `„Nikt nie ucieknie przed wyrokiem Bytu w tej mgle.” – ${character.name}`);
    } else {
      charQuote = `"${character.name}"`;
    }
  }

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
  const loreLabels: any = dict?.smashOrPass?.loreLabels || {};
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

  // Name splitting for flanking background typography
  const rawName = (character.name || '').trim();
  const nameParts = rawName.split(/\s+/);
  const firstName = nameParts[0] || rawName;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none">
      {/* 1. FLANKING WATERMARK TYPOGRAPHY (FIRST NAME ON LEFT, SURNAME ON RIGHT AROUND CARD) */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        {/* Left Side: First Name */}
        <div
          key={`watermark-first-${character.slug}`}
          className="pointer-events-auto anim-watermark-dissolve absolute top-[44%] -translate-y-1/2 right-[50%] mr-32 sm:mr-40 md:mr-52 lg:mr-64 text-right opacity-[0.07] dark:opacity-[0.04] hover:opacity-25 transition-all duration-500 cursor-default group"
          onMouseEnter={handleCardHover}
        >
          <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black uppercase tracking-wider text-text-primary font-mono group-hover:text-accent-red group-hover:drop-shadow-[0_0_60px_rgba(220,38,38,0.8)] transition-all duration-500 inline-block group-hover:scale-105 transform">
            {firstName}
          </span>
        </div>

        {/* Right Side: Surname / Second Name Part */}
        {lastName && (
          <div
            key={`watermark-last-${character.slug}`}
            className="pointer-events-auto anim-watermark-dissolve absolute top-[44%] -translate-y-1/2 left-[50%] ml-32 sm:ml-40 md:ml-52 lg:ml-64 text-left opacity-[0.07] dark:opacity-[0.04] hover:opacity-25 transition-all duration-500 cursor-default group"
            style={{ animationDelay: '100ms' }}
            onMouseEnter={handleCardHover}
          >
            <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black uppercase tracking-wider text-text-primary font-mono group-hover:text-accent-red group-hover:drop-shadow-[0_0_60px_rgba(220,38,38,0.8)] transition-all duration-500 inline-block group-hover:scale-105 transform">
              {lastName}
            </span>
          </div>
        )}
      </div>

      {/* 2. LEFT FLANKING DOSSIER WING */}
      <div className="absolute left-4 xl:left-8 2xl:left-14 top-16 bottom-16 hidden lg:flex flex-col justify-between max-w-[270px] xl:max-w-[310px] pointer-events-none">
        {/* Left Item 1: Trial Classification & Radar Beacon (Tilt Left -2deg & Emerald Aura) */}
        <div
          key={`role-${character.slug}`}
          className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-105 hover:-rotate-2 cursor-pointer group"
          style={{ animationDelay: '0ms' }}
          onMouseEnter={handleCardHover}
        >
          <div
            className={`relative overflow-hidden p-4 rounded-3xl border-2 bg-bg-surface/95 backdrop-blur-2xl shadow-2xl transition-all duration-300 ${
              isSurvivor
                ? 'border-accent-green/50 group-hover:border-accent-green'
                : isMonster
                ? 'border-border-color group-hover:border-border-subtle'
                : 'border-accent-red/50 group-hover:border-accent-red'
            }`}
          >
            {/* Holographic scanlines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-10 dark:opacity-40 group-hover:opacity-20 dark:group-hover:opacity-70 transition-opacity" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-inner ${
                    isSurvivor
                      ? 'bg-accent-green/10 border-accent-green/30 group-hover:border-accent-green/60'
                      : isMonster
                      ? 'bg-bg-elevated border-border-color group-hover:border-border-subtle'
                      : 'bg-accent-red/10 border-accent-red/30 group-hover:border-accent-red/60'
                  }`}
                >
                  {isSurvivor ? (
                    <Shield className="h-5 w-5 text-accent-green" />
                  ) : (
                    <Skull className="h-5 w-5 text-accent-red" />
                  )}
                </span>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block group-hover:text-text-secondary transition-colors">
                    {trialClassificationLabel}
                  </span>
                  <span className="text-sm font-black font-mono tracking-tight text-text-primary block group-hover:text-accent-red  transition-colors">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Left Item 2: Dating Archetype (Tilt Right +2deg & Crimson Flare) */}
        <div
          key={`title-${character.slug}`}
          className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-105 hover:rotate-2 cursor-pointer group"
          style={{ animationDelay: '80ms' }}
          onMouseEnter={handleCardHover}
        >
          <div className="relative overflow-hidden p-3.5 xl:p-4 rounded-3xl bg-bg-surface/95 border-2 border-accent-red/40 backdrop-blur-2xl shadow-2xl space-y-1 transition-all duration-300 group-hover:border-accent-red group-hover:shadow-[0_0_50px_rgba(220,38,38,0.5)]">
            <div className="flex items-center gap-1.5 text-accent-red">
              <Sparkles className="h-3.5 w-3.5 animate-spin group-hover:scale-125 transition-transform" style={{ animationDuration: '4s' }} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                {datingArchetypeLabel}
              </span>
            </div>
            <p className="text-sm font-black font-mono tracking-tight text-text-primary group-hover:text-accent-red  transition-colors">
              {charTitle}
            </p>
            <p className="text-xs text-text-muted line-clamp-2 leading-snug group-hover:text-text-secondary transition-colors font-sans">
              {charTagline}
            </p>
          </div>
        </div>

        {/* Left Item 3: Trial Green Flag (Scale +10% & Emerald Strobe) */}
        {displayGreenFlags.length > 0 && (
          <div
            key={`green-${character.slug}`}
            className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-110 hover:-rotate-1 cursor-pointer group"
            style={{ animationDelay: '160ms' }}
            onMouseEnter={handleCardHover}
          >
            <div className="relative overflow-hidden p-3.5 rounded-3xl bg-bg-surface/95 border-2 border-accent-green/40 backdrop-blur-2xl shadow-2xl space-y-1 transition-all duration-300 group-hover:border-accent-green group-hover:shadow-[0_0_45px_rgba(22,163,74,0.5)]">
              <div className="flex items-center gap-1.5 text-accent-green">
                <CheckCircle2 className="h-4 w-4 shrink-0 group-hover:scale-125 group-hover:rotate-12 transition-transform" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                  {greenFlagLabel}
                </span>
              </div>
              <p className="text-xs font-semibold text-text-secondary leading-snug group-hover:text-text-primary transition-colors font-sans">
                {displayGreenFlags[0]}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. RIGHT FLANKING DOSSIER WING */}
      <div className="absolute right-4 xl:right-8 2xl:right-14 top-16 bottom-16 hidden lg:flex flex-col justify-between max-w-[270px] xl:max-w-[310px] pointer-events-none">
        {/* Right Item 1: Identity Profile & Cyber Tag (Tilt Right +1deg & Cyan Glitch) */}
        <div
          key={`gender-${character.slug}`}
          className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-105 hover:rotate-1 cursor-pointer group"
          style={{ animationDelay: '40ms' }}
          onMouseEnter={handleCardHover}
        >
          <div className="relative overflow-hidden flex items-center justify-between p-4 rounded-3xl bg-bg-surface/95 border-2 border-border-color backdrop-blur-2xl shadow-2xl transition-all duration-300 group-hover:border-border-subtle group-hover:shadow-[0_0_50px_rgba(0,0,0,0)]">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-bg-elevated border border-border-color shrink-0 text-text-secondary group-hover:scale-115 group-hover:-rotate-6 transition-transform shadow-inner">
                <User className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted block group-hover:text-text-secondary transition-colors">
                  {identityProfileLabel}
                </span>
                <span className="text-sm font-black font-mono tracking-tight text-text-primary capitalize block group-hover:text-text-primary  transition-colors">
                  {genderLabel}
                </span>
              </div>
            </div>
            <Zap className="h-4 w-4 text-text-muted group-hover:text-text-secondary group-hover:scale-125 animate-pulse transition-transform" />
          </div>
        </div>

        {/* Right Item 2: Signature Quote (Tilt Left -1deg & Gold Halo) */}
        <div
          key={`quote-${character.slug}`}
          className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-105 hover:-rotate-1 cursor-pointer group"
          style={{ animationDelay: '120ms' }}
          onMouseEnter={handleCardHover}
        >
          <div className="relative overflow-hidden p-4 rounded-3xl bg-bg-surface/95 border-2 border-amber-500/40 backdrop-blur-2xl shadow-2xl space-y-1.5 transition-all duration-300 group-hover:border-amber-400 group-hover:shadow-[0_0_50px_rgba(245,158,11,0.5)]">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Quote className="h-3.5 w-3.5 group-hover:scale-125 group-hover:rotate-12 transition-transform" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                {signatureQuoteLabel}
              </span>
            </div>
            <p className="text-xs text-text-secondary font-serif italic leading-relaxed group-hover:text-text-primary transition-colors">
              {charQuote}
            </p>
          </div>
        </div>

        {/* Right Item 3: Trial Warning / Red Flag (Tilt Right +2deg & Warning Flare) */}
        {displayRedFlags.length > 0 && (
          <div
            key={`red-${character.slug}`}
            className="pointer-events-auto anim-lore-dissolve transition-all duration-300 hover:scale-110 hover:rotate-2 cursor-pointer group"
            style={{ animationDelay: '200ms' }}
            onMouseEnter={handleCardHover}
          >
            <div className="relative overflow-hidden p-3.5 rounded-3xl bg-bg-surface/95 border-2 border-accent-red/40 backdrop-blur-2xl shadow-2xl space-y-1 transition-all duration-300 group-hover:border-accent-red group-hover:shadow-[0_0_45px_rgba(220,38,38,0.5)]">
              <div className="flex items-center gap-1.5 text-accent-red">
                <AlertTriangle className="h-4 w-4 shrink-0 group-hover:scale-125 group-hover:-rotate-12 transition-transform" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                  {redFlagLabel}
                </span>
              </div>
              <p className="text-xs font-semibold text-text-secondary leading-snug group-hover:text-text-primary transition-colors font-sans">
                {displayRedFlags[0]}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
