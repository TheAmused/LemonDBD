// frontend/src/components/character-detail/modals/EquipmentDetailModal.tsx
import React from 'react';
import type { AddonItem, CharacterDetailDictionary, CharacterItem, EquipmentItem } from '../types';
import { getAssetUrl, getAvatarUrl, getRarityTileStyle } from '../types';
import { getSurvivorAddonCategory } from '../survivorCategories';
import { CATEGORY_ICONS } from '../components/SurvivorEquipmentSection';
import { RichText } from '@/components/common/RichText';
import { Modal } from '@/components/common/Modal';
import { ModalIconHeader } from '@/components/common/ModalIconHeader';
import { tip } from '@/components/common/Tooltip';
import { Img } from '@/components/common/Img';

interface EquipmentDetailModalProps {
  item: AddonItem | EquipmentItem | null;
  onClose: () => void;
  backendBase: string;
  /** Whose page the popup was opened on: an add-on there belongs to this killer, or to a survivor item type. */
  character: CharacterItem;
  isSurvivor: boolean;
  t: CharacterDetailDictionary;
}

/** What an add-on fits, as a picture for the header's right side: the killer's portrait or the item's icon. */
function TargetPicture({ item, character, isSurvivor, backendBase }: Pick<EquipmentDetailModalProps, 'character' | 'isSurvivor' | 'backendBase'> & { item: AddonItem | EquipmentItem }) {
  if (isSurvivor) {
    const Icon = CATEGORY_ICONS[getSurvivorAddonCategory(item as AddonItem)];
    return (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-elevated text-accent-amber ring-2 ring-accent-amber/40 shadow-lg">
        <Icon className="h-3/5 w-3/5" aria-hidden="true" />
      </div>
    );
  }
  return (
    <Img
      src={getAvatarUrl(backendBase, character, false)}
      alt={character.name}
      className="h-full w-full rounded-full object-cover ring-2 ring-accent-amber/40 shadow-lg"
    />
  );
}

export const EquipmentDetailModal: React.FC<EquipmentDetailModalProps> = ({
  item,
  onClose,
  backendBase,
  character,
  isSurvivor,
  t,
}) => {
  if (!item) return null;
  const rarityTile = getRarityTileStyle(item.rarity);

  const header = (
    <ModalIconHeader
      leading={
        <div
          className={`flex h-full w-full items-center justify-center overflow-hidden rounded-card border-2 p-1.5 shadow-md ${rarityTile.bg}`}
          style={rarityTile.style}
        >
          <Img
            src={getAssetUrl(backendBase, item.icon_local_path, item.icon_url)}
            alt=""
            className="h-full w-full object-contain"
          />
        </div>
      }
      title={item.name}
      trailing={
        item.associated_target ? (
          <TargetPicture item={item} character={character} isSurvivor={isSurvivor} backendBase={backendBase} />
        ) : undefined
      }
      trailingProps={tip(item.associated_target, undefined, 'item')}
    />
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="dialog"
      size="2xl"
      closeButton="floating"
      closeButtonAriaLabel={t.close}
      ariaLabel={item.name}
      header={header}
    >
      <div className="mx-4 mt-5 border-t border-border-color pb-5 pt-4 phone-lg:mx-6 phone-lg:mt-6 phone-lg:pb-6 phone-lg:pt-5 md:mx-8 md:pb-8">
        <RichText text={item.description} block variant="game" />
      </div>
    </Modal>
  );
};
