'use client';
// frontend/src/components/PerkModal.tsx

import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { PerkIcon } from '@/components/ui/PerkIcon';
import type { Perk } from '@/types/perks';
import {
  getPerkIconUrl,
  getCharacterAvatarUrl,
} from '@/utils/perkUtils';
import { PerkDescription } from '@/components/PerkDescription';
import { PerkTypeBadges } from '@/components/perks/PerkTypeBadges';
import { tip } from '@/components/common/Tooltip';
import { Modal } from '@/components/common/Modal';
import { ModalIconHeader } from '@/components/common/ModalIconHeader';
import { useDictionary } from "@/context/DictionaryContext";
import { Img } from '@/components/common/Img';

interface PerkModalProps {
  perk: Perk | null;
  onClose: () => void;
}

export const PerkModal: React.FC<PerkModalProps> = ({ perk, onClose }) => {
  const dict = useDictionary();
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

  /* Perk icon | title | owner avatar. */
  const header = (
    <ModalIconHeader
      titleId="perk-modal-title"
      leading={
        <PerkIcon
          perk={perk}
          src={iconSrc}
          className="h-full w-full"
          imageClassName="h-full w-full scale-[1.3] object-contain drop-shadow-lg"
          fallbackIcon={<ImageOff className="h-8 w-8 text-text-muted" />}
        />
      }
      title={perk.name}
      subtitle={perk.alternate_name && `${dict.modal.alias && `${dict.modal.alias}: `}${perk.alternate_name}`}
      /* General perks and missing portraits leave the slot empty; it still keeps the title centred. */
      trailing={
        !isGeneral && avatarSrc && !avatarError ? (
          <Img
            src={avatarSrc}
            alt={perk.character}
            onError={() => setAvatarError(true)}
            className="h-full w-full rounded-full object-cover ring-2 ring-accent-amber/40 shadow-lg"
          />
        ) : undefined
      }
      trailingProps={tip(perk.character, undefined, 'character')}
    />
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
      <div className="mx-4 mt-5 border-t border-border-color pb-5 pt-4 phone-lg:mx-6 phone-lg:mt-6 phone-lg:pb-6 phone-lg:pt-5 md:mx-8 md:pb-8">
        <div id="perk-modal-description">
          <PerkDescription description={perk.description} variant="modal" />
        </div>
        {/* The footer: this perk's own types under its description, with no heading of their own. */}
        <PerkTypeBadges perk={perk} size="md" className="mt-4 border-t border-border-color pt-4" />
      </div>
    </Modal>
  );
};
