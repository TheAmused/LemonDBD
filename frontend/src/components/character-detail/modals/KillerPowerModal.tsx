// frontend/src/components/character-detail/modals/KillerPowerModal.tsx
import React from 'react';
import { BookOpen, Flame } from 'lucide-react';
import type { KillerPowerInfo, CharacterItem, CharacterDetailDictionary } from '../types';
import { getAssetUrl } from '../types';
import { RichText } from '@/components/common/RichText';
import { Modal } from '@/components/common/Modal';
import { Img } from '@/components/common/Img';

interface KillerPowerModalProps {
  isOpen: boolean;
  onClose: () => void;
  killerPower: KillerPowerInfo;
  character: CharacterItem;
  backendBase: string;
  t: CharacterDetailDictionary;
}

export const KillerPowerModal: React.FC<KillerPowerModalProps> = ({
  isOpen,
  onClose,
  killerPower,
  backendBase,
  t,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="dialog"
      size="xl"
      title={killerPower.name}
      closeButtonAriaLabel={t.close}
    >
      <div className="flex justify-center px-6 pt-5">
        <div className="w-20 h-20 shrink-0 rounded-card bg-bg-elevated border-2 border-accent-red/50 flex items-center justify-center p-2 shadow-lg">
          {killerPower.icon_url || killerPower.icon_local_path ? (
            <Img
              src={getAssetUrl(backendBase, killerPower.icon_local_path, killerPower.icon_url)}
              alt=""
              className="h-full w-full object-contain"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (killerPower.icon_url && img.src !== killerPower.icon_url) {
                  img.src = killerPower.icon_url;
                }
              }}
            />
          ) : (
            <Flame className="h-8 w-8 text-accent-red animate-pulse" />
          )}
        </div>
      </div>
      <div className="p-4 sm:p-6 space-y-4 type-body-lg text-text-secondary">
        <div className="space-y-2">
          <span className="flex items-center gap-2 type-label-sm text-text-secondary mb-2">
            <BookOpen className="h-3.5 w-3.5 text-accent-red" />
            {t.killerPowerDesc}
          </span>
          <div className="space-y-2 text-sm sm:text-base leading-relaxed">
            <RichText
              text={killerPower.description || 'Detailed mechanical power breakdown cataloged from Trial archives.'}
              block
              variant="game"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
