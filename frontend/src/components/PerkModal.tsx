'use client';
// frontend/src/components/PerkModal.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { X, ImageOff } from 'lucide-react';
import { Perk, PerkDictionary } from '@/types/perks';
import {
  getPerkIconUrl,
  getCharacterAvatarUrl,
} from '@/utils/perkUtils';
import { PerkDescription } from '@/components/PerkDescription';
import { tip } from '@/components/common/Tooltip';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';

/** Perk icon and owner avatar share this size. */
const SLOT_SIZE = 'h-20 w-20 sm:h-24 sm:w-24';

interface PerkModalProps {
  perk: Perk | null;
  onClose: () => void;
  dict?: PerkDictionary;
}

export const PerkModal: React.FC<PerkModalProps> = ({
  perk,
  onClose,
  dict,
}) => {
  const [imgError, setImgError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!perk) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [perk, handleKeyDown]);

  if (!perk) return null;

  const iconSrc = getPerkIconUrl(perk);
  const avatarSrc = getCharacterAvatarUrl(
    perk,
    perk.category === 'Killer' ? 'Killer' : 'Survivor'
  );

  const isGeneral =
    !perk.character ||
    perk.character === 'General' ||
    Boolean(perk.is_generic_counterpart);
  const isSurvivor = perk.category === 'Survivor';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="perk-modal-title"
      aria-describedby="perk-modal-description"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-bg-primary/70 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-3xl border border-border-color bg-bg-surface/95 px-6 pb-6 pt-12 sm:px-8 sm:pb-8 shadow-2xl text-text-primary cursor-default animate-in zoom-in-95 duration-200 backdrop-blur-2xl transition-colors"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={dict?.modal?.close}
          className="absolute right-3 top-3 rounded-full p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Perk icon | title | owner avatar. Both sides share one size so the title stays centred. */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 sm:gap-6">
          <div className={`flex ${SLOT_SIZE} shrink-0 items-center justify-center`}>
            {!imgError && iconSrc ? (
              <img
                src={iconSrc}
                alt={perk.name}
                onError={() => setImgError(true)}
                className="h-full w-full object-contain drop-shadow-lg"
              />
            ) : (
              <ImageOff className="h-8 w-8 text-text-muted" />
            )}
          </div>

          <div className="min-w-0 text-center">
            <h2
              id="perk-modal-title"
              className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight leading-tight text-balance"
            >
              {perk.name}
            </h2>
            {perk.alternate_name && (
              <p className="mt-1.5 text-xs font-bold text-accent-amber">
                {dict?.modal?.alias && `${dict.modal.alias}: `}
                {perk.alternate_name}
              </p>
            )}
          </div>

          <div
            className={`flex ${SLOT_SIZE} shrink-0 items-center justify-center`}
            {...tip(
              isGeneral ? dict?.modal?.generalPerk : perk.character,
              undefined,
              'character'
            )}
          >
            {!isGeneral && avatarSrc && !avatarError ? (
              <img
                src={avatarSrc}
                alt={perk.character}
                onError={() => setAvatarError(true)}
                className="h-full w-full rounded-full object-cover ring-2 ring-accent-amber/40 shadow-lg"
              />
            ) : isSurvivor ? (
              <SurvivorIcon className="h-1/2 w-1/2 text-accent-green" />
            ) : (
              <KillerIcon className="h-1/2 w-1/2 text-accent-red" />
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-border-color pt-5">
          <div
            id="perk-modal-description"
            className="max-h-[360px] overflow-y-auto pr-2 custom-scrollbar scrollbar-track-bg-elevated"
          >
            <PerkDescription
              description={perk.description}
              variant="modal"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
