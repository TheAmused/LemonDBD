// frontend/src/components/character-detail/modals/KillerPowerModal.tsx
import React from 'react';
import { BookOpen, Flame } from 'lucide-react';
import { KillerPowerInfo, CharacterItem, getAssetUrl, CharacterDetailDictionary } from '../types';
import { RichText } from '@/components/common/RichText';
import { Modal } from '@/components/common/Modal';
import { Surface } from '@/components/common/Surface';

interface KillerPowerModalProps {
  isOpen: boolean;
  onClose: () => void;
  killerPower: KillerPowerInfo;
  character: CharacterItem;
  killerSpeed: string;
  killerTerrorRadius: string;
  killerHeight: string;
  backendBase: string;
  t: CharacterDetailDictionary;
}

/** One of the three numbers under the power description. */
const MiniStat: React.FC<{ label: string; value: string; valueClass: string }> = ({ label, value, valueClass }) => (
  <Surface padding="none" className="p-2 text-center">
    <span className="block text-micro font-bold uppercase text-text-secondary">{label}</span>
    <span className={`block type-strong ${valueClass} truncate`}>{value}</span>
  </Surface>
);

export const KillerPowerModal: React.FC<KillerPowerModalProps> = ({
  isOpen,
  onClose,
  killerPower,
  character,
  killerSpeed,
  killerTerrorRadius,
  killerHeight,
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
            <img
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
      <div className="mt-5 px-6 py-3 bg-bg-elevated border-y border-border-color grid grid-cols-3 gap-2">
        <MiniStat label={t.movementSpeed} value={killerSpeed} valueClass="text-text-primary" />
        <MiniStat label={t.terrorRadius} value={killerTerrorRadius} valueClass="text-accent-red" />
        <MiniStat label={t.height} value={killerHeight} valueClass="text-text-primary" />
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
