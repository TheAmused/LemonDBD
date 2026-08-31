'use client';
// frontend/src/components/PerkCard.tsx

import React, { useState } from 'react';
import { ImageOff, Lock, HelpCircle } from 'lucide-react';
import { Perk, PerkDictionary, ViewDisplayMode } from '@/types/perks';
import { getPerkIconUrl, getCharacterAvatarUrl } from '@/utils/perkUtils';
import { DisabledBadge } from '@/components/DisabledBadge';
import { DisabledReasonModal } from '@/components/DisabledReasonModal';
import { UnifiedHoverModal, ActiveHoverState } from '@/components/common/UnifiedHoverModal';

export type { Perk };

const GRID_SIZE_CLASSES: Record<'default' | 'large', string> = {
  default: 'h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 lg:h-44 lg:w-44 xl:h-48 xl:w-48',
  large: 'h-40 w-40 sm:h-48 sm:w-48 md:h-56 md:w-56 lg:h-64 lg:w-64 xl:h-72 xl:w-72',
};

interface PerkCardProps {
  perk: Perk;
  viewMode?: ViewDisplayMode;
  onSelect: (perk: Perk) => void;
  dict?: PerkDictionary;
  /** When provided, renders a small "[P{page}/S{slot}]" coordinate tag so the
   * perk can be located quickly in the Vault (used by the Perk Randomizer). */
  coordinate?: { page: number; slot: number };
  /** Grid-view footprint. 'large' is used by the Randomizer's reveal
   * moments; 'default' (the Vault's own size) is the default. */
  size?: 'default' | 'large';
  /** When true, hides the perk icon/avatar/hover-preview behind a "?"
   * placeholder, showing only the coordinate tag if one is provided.
   * Clicking does nothing while blind. */
  isBlind?: boolean;
}

export const PerkCard: React.FC<PerkCardProps> = ({
  perk,
  viewMode = 'grid',
  onSelect,
  dict,
  coordinate,
  size = 'default',
  isBlind = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [showDisabledModal, setShowDisabledModal] = useState(false);
  const [activeHover, setActiveHover] = useState<ActiveHoverState | null>(null);

  const iconSrc = getPerkIconUrl(perk);
  const avatarSrc = getCharacterAvatarUrl(
    perk,
    perk.category === 'Killer' ? 'Killer' : 'Survivor'
  );

  const isGeneral =
    !perk.character ||
    perk.character === 'General' ||
    Boolean(perk.is_generic_counterpart);
  const isOwned = perk.is_owned !== false;

  const generalLabel = dict?.modal?.generalPerk || 'General Perk';
  const roleLabel =
    perk.category === 'Killer'
      ? dict?.modal?.killerPerk || 'Killer Perk'
      : dict?.modal?.survivorPerk || 'Survivor Perk';

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveHover({ item: perk, rect });
  };
  const handleMouseLeave = () => setActiveHover(null);
  const ariaLabel = `${perk.name} - ${isGeneral ? generalLabel : perk.character}`;

  const coordinateLabel = coordinate
    ? `${dict?.generator?.coordOpenPage || '[P'}${coordinate.page}${dict?.generator?.coordSlot || '/S'}${coordinate.slot}${dict?.generator?.coordClose || ']'}`
    : null;

  if (isBlind) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center gap-2 p-2 ${GRID_SIZE_CLASSES[size]}`}
      >
        {coordinateLabel && (
          <span className="absolute top-1 left-1 z-10 font-mono text-[10px] font-black text-amber-400/90">
            {coordinateLabel}
          </span>
        )}
        <HelpCircle className="h-10 w-10 text-slate-500" />
        <span className="text-[11px] font-bold text-slate-500 text-center px-2">
          {dict?.generator?.hiddenPerkLabel || 'Hidden — check in-game'}
        </span>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div key={viewMode} className="relative group flex w-full items-center">
        <button
          type="button"
          onClick={() => onSelect(perk)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          aria-label={ariaLabel}
          className="relative flex w-full items-center gap-3 sm:gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-2 sm:px-4 sm:py-3 text-left cursor-pointer transition-colors hover:bg-slate-900/70 hover:border-cyan-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <div
            className={`relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center ${
              perk.is_disabled ? 'opacity-50 grayscale' : !isOwned ? 'opacity-40 grayscale' : ''
            }`}
          >
            {!imgError && iconSrc ? (
              <img
                src={iconSrc}
                alt={perk.name}
                onError={() => setImgError(true)}
                className="h-full w-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)] pointer-events-none"
                loading="lazy"
              />
            ) : (
              <div className="flex h-3/4 w-3/4 rotate-45 items-center justify-center rounded-xl bg-slate-900 border border-slate-800">
                <ImageOff className="-rotate-45 h-5 w-5 text-slate-500" />
              </div>
            )}

            {avatarSrc && !avatarError && !isGeneral && (
              <div className="absolute bottom-0 right-0 h-5 w-5 sm:h-6 sm:w-6 overflow-hidden rounded-full pointer-events-none bg-slate-950/80 shadow-lg border border-slate-800">
                <img
                  src={avatarSrc}
                  alt={perk.character}
                  onError={() => setAvatarError(true)}
                  className="h-full w-full object-cover object-top"
                  loading="lazy"
                />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {coordinateLabel && (
                <span className="shrink-0 font-mono text-[10px] font-black text-amber-400/90">
                  {coordinateLabel}
                </span>
              )}
              <p className="truncate text-sm sm:text-base font-bold text-slate-100">{perk.name}</p>
            </div>
            <p className="truncate text-xs text-slate-400">
              {isGeneral ? generalLabel : perk.character} {'·'} {roleLabel}
            </p>
          </div>

          {!perk.is_disabled && !isOwned && (
            <Lock
              className="h-4 w-4 shrink-0 text-slate-400"
              aria-label={dict?.modal?.unownedPerk || 'Unowned perk'}
            />
          )}
        </button>

        {perk.is_disabled && (
          <DisabledBadge label={perk.name} onClick={() => setShowDisabledModal(true)} />
        )}

        <DisabledReasonModal
          isOpen={showDisabledModal}
          onClose={() => setShowDisabledModal(false)}
          label={perk.name}
          reason={perk.disabled_reason}
        />

        <UnifiedHoverModal
          activeHover={activeHover}
          placement="above"
          t={dict?.modal as unknown as Record<string, string>}
          isPerk={true}
        />
      </div>
    );
  }

  return (
    <div key={viewMode} className="relative group flex items-center justify-center p-2 sm:p-3 w-full">
      <button
        type="button"
        onClick={() => onSelect(perk)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={ariaLabel}
        className={`relative flex cursor-pointer items-center justify-center transition-transform duration-200 group-hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-2xl ${GRID_SIZE_CLASSES[size]}`}
      >
        {coordinateLabel && (
          <span className="absolute top-1 left-1 z-10 font-mono text-[10px] font-black text-amber-400/90 pointer-events-none">
            {coordinateLabel}
          </span>
        )}

        <div
          className={`relative flex h-full w-full items-center justify-center ${
            perk.is_disabled ? 'opacity-50 grayscale' : !isOwned ? 'opacity-40 grayscale' : ''
          }`}
        >
          {!imgError && iconSrc ? (
            <img
              src={iconSrc}
              alt={perk.name}
              onError={() => setImgError(true)}
              className="h-full w-full object-contain filter drop-shadow-[0_6px_14px_rgba(0,0,0,0.85)] group-hover:drop-shadow-[0_0_18px_rgba(6,182,212,0.6)] transition-all duration-200 pointer-events-none"
              loading="lazy"
            />
          ) : (
            <div className="flex h-3/4 w-3/4 rotate-45 items-center justify-center rounded-xl bg-slate-900 border border-slate-800">
              <ImageOff className="-rotate-45 h-10 w-10 text-slate-500" />
            </div>
          )}

          {avatarSrc && !avatarError && !isGeneral && (
            <div className="absolute bottom-0 right-0 h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12 lg:h-13 lg:w-13 overflow-hidden rounded-full pointer-events-none bg-slate-950/80 shadow-lg border border-slate-800">
              <img
                src={avatarSrc}
                alt={perk.character}
                onError={() => setAvatarError(true)}
                className="h-full w-full object-cover object-top"
                loading="lazy"
              />
            </div>
          )}
        </div>

        {perk.is_disabled ? (
          <DisabledBadge label={perk.name} onClick={() => setShowDisabledModal(true)} />
        ) : (
          !isOwned && (
            <div
              className="absolute top-1 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/90 shadow-md border border-slate-800"
              title={dict?.modal?.unownedPerk || 'Unowned perk'}
            >
              <Lock className="h-3.5 w-3.5 text-slate-400" />
            </div>
          )
        )}
      </button>

      <DisabledReasonModal
        isOpen={showDisabledModal}
        onClose={() => setShowDisabledModal(false)}
        label={perk.name}
        reason={perk.disabled_reason}
      />

      {/* Unified Hover Modal */}
      <UnifiedHoverModal
        activeHover={activeHover}
        placement="above"
        t={dict?.modal as unknown as Record<string, string>}
        isPerk={true}
      />
    </div>
  );
};
