// frontend/src/components/character-detail/modals/EquipmentDetailModal.tsx
import React from 'react';
import { AddonItem, EquipmentItem, getAssetUrl, getRarityTileStyle, getLocalizedRarity } from '../types';
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
      subtitle={item.rarity ? getLocalizedRarity(item.rarity, t) : undefined}
      closeButtonAriaLabel={t.close || 'Close'}
      headerLeft={
        <div
          className={`h-14 w-14 rounded-2xl border-2 p-1.5 flex items-center justify-center shrink-0 shadow-md overflow-hidden ${rarityTile.bg}`}
          style={rarityTile.style}
        >
          <img
            src={getAssetUrl(backendBase, item.icon_local_path, item.icon_url)}
            alt=""
            className="h-full w-full object-contain"
          />
        </div>
      }
      padded
      bodyClassName="space-y-4 text-sm leading-relaxed font-sans text-text-secondary"
    >
      {item.associated_target && (
        <div className="text-xs font-mono font-bold text-text-secondary">
          {t.compatibleTarget || 'Compatible Target:'} <span className="text-text-primary">{item.associated_target}</span>
        </div>
      )}
      <RichText text={item.description} block variant="game" />
    </Modal>
  );
};
