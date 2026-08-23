'use client';
// frontend/src/components/PerkCard.tsx

import React, { useState } from 'react';
import { Shield, Skull, ImageOff, Repeat, Lock } from 'lucide-react';
import { Perk, PerkDictionary, ViewDisplayMode } from '@/types/perks';
import { getPerkIconUrl, getCharacterAvatarUrl } from '@/utils/perkUtils';
import { PerkDescription } from '@/components/PerkDescription';
import { DisabledBadge } from '@/components/DisabledBadge';
import { DisabledReasonModal } from '@/components/DisabledReasonModal';

export type { Perk };

interface PerkCardProps {
  perk: Perk;
  viewMode?: ViewDisplayMode;
  onSelect: (perk: Perk) => void;
  dict?: PerkDictionary;
}

export const PerkCard: React.FC<PerkCardProps> = ({
  perk,
  onSelect,
  dict,
}) => {
  const [imgError, setImgError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [showDisabledModal, setShowDisabledModal] = useState(false);

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
  const isSurvivor = perk.category === 'Survivor';

  const generalLabel = dict?.modal?.generalPerk || 'General Perk';
  const aliasLabel = dict?.modal?.alias || 'Alias';

  return (
    <div className="relative group flex items-center justify-center p-2 sm:p-3 w-full">
      <button
        type="button"
        onClick={() => onSelect(perk)}
        aria-label={`${perk.name} - ${isGeneral ? generalLabel : perk.character}`}
        className="relative flex h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 lg:h-44 lg:w-44 xl:h-48 xl:w-48 cursor-pointer items-center justify-center transition-transform duration-200 group-hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-2xl"
      >
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
              title="Unowned perk"
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

      {/* Hover Accessible Tooltip */}
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-50 hidden group-hover:flex flex-col w-80 max-w-[90vw] rounded-2xl bg-[#0a0f18]/98 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 text-left border border-slate-800"
      >
        <div className="flex items-start justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-800/80">
          <div>
            <h4 className="text-sm font-black text-amber-400 tracking-tight leading-tight">
              {perk.name}
            </h4>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
              {isGeneral ? generalLabel : perk.character}
              {perk.character_real_name &&
                perk.character_real_name !== perk.character && (
                  <span className="text-[10px] font-normal text-slate-500 ml-1">
                    ({perk.character_real_name})
                  </span>
                )}
            </p>
          </div>

          <span
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 border ${
              isSurvivor
                ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-950/90 text-rose-400 border-rose-500/30'
            }`}
          >
            {isSurvivor ? <Shield className="h-2.5 w-2.5" /> : <Skull className="h-2.5 w-2.5" />}
            {perk.category}
          </span>
        </div>

        <div className="max-h-60 overflow-y-auto text-xs scrollbar-none pr-1">
          <PerkDescription
            description={perk.description}
            perkName={perk.name}
            variant="tooltip"
          />
        </div>

        {perk.alternate_name && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] text-amber-400 font-bold">
            <Repeat className="h-3 w-3 shrink-0" />
            <span>
              {aliasLabel}: {perk.alternate_name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
