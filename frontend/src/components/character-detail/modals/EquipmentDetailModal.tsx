// frontend/src/components/character-detail/modals/EquipmentDetailModal.tsx
import React from 'react';
import type { AddonItem, CharacterDetailDictionary, CharacterItem, EquipmentItem } from '../types';
import { getAssetUrl, getAvatarUrl, getRarityTileStyle } from '../types';
import { SURVIVOR_CATEGORY_GLYPH, getSurvivorAddonCategory } from '../survivorCategories';
import { CATEGORY_ICONS } from '../components/SurvivorEquipmentSection';
import { RichText } from '@/components/common/RichText';
import { Modal } from '@/components/common/Modal';
import { ModalIconHeader } from '@/components/common/ModalIconHeader';
import { tip } from '@/components/common/Tooltip';
import { Img } from '@/components/common/Img';
import { ContentCropImg } from '@/components/common/ContentCropImg';

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
    const category = getSurvivorAddonCategory(item as AddonItem);
    const glyph = SURVIVOR_CATEGORY_GLYPH[category];
    const Icon = CATEGORY_ICONS[category];
    return (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-elevated text-accent-amber ring-2 ring-accent-amber/40 shadow-lg">
        {glyph ? (
          // The item's own picture in the accent colour, zoomed to what it draws.
          <span className="block h-3/5 w-3/5">
            <ContentCropImg src={getAssetUrl(backendBase, glyph)} alt={item.associated_target ?? ''} tint />
          </span>
        ) : (
          <Icon className="h-3/5 w-3/5" aria-hidden="true" />
        )}
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
          className={`flex h-full w-full items-center justify-center overflow-hidden rounded-card border-2 p-2 shadow-md ${rarityTile.bg}`}
          style={rarityTile.style}
        >
          {/* Zoomed to what the icon draws, so the frame hugs it instead of showing its transparent margin. */}
          <ContentCropImg src={getAssetUrl(backendBase, item.icon_local_path, item.icon_url)} alt="" />
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
