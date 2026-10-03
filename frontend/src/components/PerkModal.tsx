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
import { useDictionary } from "@/context/DictionaryContext";

/** Perk icon and owner avatar share this size. */
const SLOT_SIZE = 'h-14 w-14 min-[480px]:h-20 min-[480px]:w-20 md:h-24 md:w-24';

interface PerkModalProps {
  perk: Perk | null;
  onClose: () => void;
}

export const PerkModal: React.FC<PerkModalProps> = ({ perk, onClose }) => {
  const dict = useDictionary();
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
    <div className="grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 px-4 pb-0 pt-12 min-[480px]:gap-4 min-[480px]:px-6 md:gap-6 md:px-8">
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
          className="text-xl min-[480px]:text-2xl md:text-3xl font-black text-text-primary tracking-tight leading-tight text-balance [overflow-wrap:anywhere]"
        >
          {perk.name}
        </h2>
        {perk.alternate_name && (
          <p className="mt-1.5 type-strong text-accent-amber">
            {dict.modal.alias && `${dict.modal.alias}: `}
            {perk.alternate_name}
          </p>
        )}
      </div>

      <div
        className={`flex ${SLOT_SIZE} shrink-0 items-center justify-center`}
        {...tip(
          isGeneral ? dict.modal.generalPerk : perk.character,
          undefined,
          'item'
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
      closeButtonAriaLabel={dict.modal.close}
      ariaLabel={perk.name}
      ariaDescribedBy="perk-modal-description"
      header={header}
    >
      <div className="mx-4 mt-5 border-t border-border-color pb-5 pt-4 min-[480px]:mx-6 min-[480px]:mt-6 min-[480px]:pb-6 min-[480px]:pt-5 md:mx-8 md:pb-8">
        <div id="perk-modal-description">
          <PerkDescription description={perk.description} variant="modal" />
        </div>
      </div>
    </Modal>
  );
};
