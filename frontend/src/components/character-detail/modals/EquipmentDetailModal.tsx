// frontend/src/components/character-detail/modals/EquipmentDetailModal.tsx
import React from 'react';
import { AddonItem, EquipmentItem, getAssetUrl, getRarityTileStyle } from '../types';
import { RichText } from '@/components/common/RichText';
import { Modal } from '@/components/common/Modal';

interface EquipmentDetailModalProps {
  item: AddonItem | EquipmentItem | null;
  onClose: () => void;
  backendBase: string;
  t: Record<string, string>;
}

export const EquipmentDetailModal: React.FC<EquipmentDetailModalProps> = ({
  item,
  onClose,
  backendBase,
  t,
}) => {
  if (!item) return null;
  const rarityTile = getRarityTileStyle(item.rarity);

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="dialog"
      size="lg"
      title={item.name}
      closeButtonAriaLabel={t.close || 'Close'}
      padded
      bodyClassName="space-y-4 text-sm leading-relaxed text-text-secondary"
    >
      <div className="flex justify-center">
        <div
          className={`h-20 w-20 rounded-2xl border-2 p-2 flex items-center justify-center shrink-0 shadow-md overflow-hidden ${rarityTile.bg}`}
          style={rarityTile.style}
        >
          <img
            src={getAssetUrl(backendBase, item.icon_local_path, item.icon_url)}
            alt=""
            className="h-full w-full object-contain"
          />
        </div>
      </div>
      {item.associated_target && (
        <div className="type-strong text-text-secondary">
          {t.compatibleTarget || 'Compatible Target:'} <span className="text-text-primary">{item.associated_target}</span>
        </div>
      )}
      <RichText text={item.description} block variant="game" />
    </Modal>
  );
};
