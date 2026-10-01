'use client';
// frontend/src/components/PerkModal.tsx

import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Perk, PerkDictionary } from '@/types/perks';
import {
  getPerkIconUrl,
  getCharacterAvatarUrl,
} from '@/utils/perkUtils';
import { PerkDescription } from '@/components/PerkDescription';
import { tip } from '@/components/common/Tooltip';
import { Modal } from '@/components/common/Modal';
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

  /* Perk icon | title | owner avatar. Both sides share one size so the title stays centred. */
  const header = (
    <div className="grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-4 px-6 pb-0 pt-12 sm:gap-6 sm:px-8">
      <div className={`flex ${SLOT_SIZE} shrink-0 items-center justify-center`}>
        {!imgError && iconSrc ? (
          <img
            src={iconSrc}
            alt={perk.name}
            onError={() => setImgError(true)}
            className="h-full w-full scale-[1.3] object-contain drop-shadow-lg"
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
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="dialog"
      size="2xl"
      closeButton="floating"
      closeButtonAriaLabel={dict?.modal?.close}
      ariaLabel={perk.name}
      ariaDescribedBy="perk-modal-description"
      header={header}
    >
      <div className="mx-6 mt-6 border-t border-border-color pb-6 pt-5 sm:mx-8 sm:pb-8">
        <div id="perk-modal-description" className="pr-2">
          <PerkDescription description={perk.description} variant="modal" />
        </div>
      </div>
    </Modal>
  );
};
