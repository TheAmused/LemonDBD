// frontend/src/components/smash-or-pass/RosterSelectModal.tsx
'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Sparkles, Check, Flame } from 'lucide-react';
import { RosterItem } from '@/types/smashOrPass';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { SmashSounds } from './SmashSoundEffects';

interface RosterSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  rosters: RosterItem[];
  selectedRosterSlug: string;
  onSelectRoster: (slug: string) => void;
  locale?: string;
  dict?: any;
}

export const RosterSelectModal: React.FC<RosterSelectModalProps> = ({
  isOpen,
  onClose,
  rosters,
  selectedRosterSlug,
  onSelectRoster,
  locale = 'en',
  dict,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  const getRosterDisplayName = useCallback(
    (r: RosterItem) => {
      const locName = dict?.smashOrPass?.rosters?.[r.slug]?.name;
      if (locName) return locName;
      if (r.slug === 'canon') return locale === 'pl' ? 'Dead by Daylight: Kanon Mgły' : 'Dead by Daylight: Fog Canon';
      if (r.slug === 'hooked_on_you') return locale === 'pl' ? 'Hooked on You: Romans na Wyspie' : 'Hooked on You: Island Romance';
      if (r.slug === 'legendary_cosplay') return locale === 'pl' ? 'Legendarne Skórki i Kolaboracje' : 'Legendary Skins & Collabs';
      if (r.slug === 'cyberpunk_2077') return locale === 'pl' ? 'Cyberpunk Mgła 2077' : 'Cyberpunk Fog 2077';
      if (r.slug === 'anime_manga') return locale === 'pl' ? 'Estetyka Anime / Mangi' : 'Fog Anime / Manga Aesthetic';
      if (r.slug === 'gothic_eldritch') return locale === 'pl' ? 'Wiktoriańskie i Gotyckie Legendy' : 'Victorian & Gothic Eldritch';
      return r.name || r.slug;
    },
    [dict, locale]
  );

  const getRosterCoverUrl = (r: RosterItem) => {
    if (r.cover_image_url) {
      return r.cover_image_url.startsWith('http')
        ? r.cover_image_url
        : `${getBackendBaseUrl()}${r.cover_image_url}`;
    }
    return `${getBackendBaseUrl()}/static/avatars/rosters/${r.slug}.png`;
  };

  const handleCardClick = (slug: string) => {
    SmashSounds.playSmashSound();
    onSelectRoster(slug);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300"
    >
      {/* Fog Background Ambience */}
      <div className="absolute inset-0 bg-gradient-radial from-rose-950/20 via-transparent to-black/90 pointer-events-none" />

      {/* MODAL MAIN CONTAINER */}
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-zinc-950/95 border border-pink-500/40 shadow-[0_0_60px_rgba(255,0,85,0.25)] p-5 sm:p-7 md:p-8 space-y-6 animate-in zoom-in-95 duration-250 custom-scrollbar"
      >
        {/* TOP CENTER TITLE (NO EXTRA TEXTS) */}
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-rose-100 to-white drop-shadow-[0_0_20px_rgba(255,0,85,0.6)] uppercase">
            {dict?.smashOrPass?.title ? `${dict.smashOrPass.title}?` : (locale === 'pl' ? 'Smash czy Pass?' : 'Smash or Pass?')}
          </h2>
        </div>

        {/* ROSTER GRID - SINGLE BORDER PER BLOCK, NO NESTED BORDERS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {rosters.map((r) => {
            const isSelected = r.slug === selectedRosterSlug;
            const count = r.entity_count ?? r.character_count ?? 0;
            const coverUrl = getRosterCoverUrl(r);

            return (
              <button
                key={r.slug}
                type="button"
                onClick={() => handleCardClick(r.slug)}
                className={`group relative flex flex-col justify-end h-56 sm:h-64 rounded-2xl overflow-hidden text-left transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'border-2 border-[#ff0055] shadow-[0_0_30px_rgba(255,0,85,0.5)] scale-[1.02]'
                    : 'border border-pink-500/20 hover:border-pink-500 hover:shadow-[0_0_25px_rgba(255,0,85,0.35)] hover:scale-[1.02]'
                }`}
              >
                {/* Background Hero Image */}
                <img
                  src={coverUrl}
                  alt={r.name || r.slug}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.dataset.triedWebp) {
                      target.dataset.triedWebp = '1';
                      target.src = `${getBackendBaseUrl()}/static/avatars/rosters/${r.slug}.webp`;
                    }
                  }}
                  className="absolute inset-0 h-full w-full object-cover object-center brightness-90 group-hover:scale-105 group-hover:brightness-100 transition-all duration-500"
                />

                {/* Dark Vignette Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />

                {/* Active Selection Glow Pill */}
                {isSelected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#ff0055] text-white text-[11px] font-mono font-black shadow-[0_0_12px_rgba(255,0,85,0.6)]">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                    <span>ACTIVE</span>
                  </div>
                )}

                {/* Candidate Count Tag (Top Left) */}
                <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 text-zinc-300 text-[11px] font-mono font-bold">
                  <Flame className="h-3 w-3 text-pink-400" />
                  <span>{count}</span>
                </div>

                {/* Bottom Center Title Inside Block Borders */}
                <div className="relative z-10 p-3.5 sm:p-4 text-center w-full">
                  <h3 className="text-sm sm:text-base font-black font-mono tracking-wide text-zinc-100 group-hover:text-pink-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] transition-colors">
                    {getRosterDisplayName(r)}
                  </h3>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
