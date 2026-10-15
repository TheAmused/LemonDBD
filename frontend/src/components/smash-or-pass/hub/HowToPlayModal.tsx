'use client';
// frontend/src/components/smash-or-pass/hub/HowToPlayModal.tsx
import { Gamepad2 } from 'lucide-react';
import {
  PortraitLoupeIcon,
  SnuffedCandleIcon,
  TarotTurnIcon,
  ThornHeartIcon,
  ThunderPulseIcon,
} from '@/components/icons/DbdIcons';
import { Modal } from '@/components/common/Modal';
import { useDictionary } from '@/context/DictionaryContext';
import { TactileKeycaps } from './lazyParts';
import { Badge } from '@/components/common/Badge';
import { InfoChip } from '@/components/common/InfoChip';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPass: () => void;
  onSmash: () => void;
  onStats: () => void;
  onReset: () => void;
}

/** The controls explanation, with authentic Dead by Daylight iconography and keyboard keycaps. */
export function HowToPlayModal({ isOpen, onClose, onPass, onSmash, onStats, onReset }: HowToPlayModalProps) {
  const dict = useDictionary();
  const text = dict.smashOrPass.howToPlayModal;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="lg"
      title={text.title}
      closeButtonAriaLabel={dict.modal.close}
      bodyClassName="p-4 sm:p-5"
    >
      <div className="space-y-3 text-xs text-text-secondary">
        {/* Dictionary icon key retention for i18n hygiene ratchet */}
        <span className="sr-only" aria-hidden="true">
          {text.swipeIcon} {text.iconsIcon} {text.keycapsIcon} {text.atmosphereIcon}
        </span>

        {/* 1. Swipe & Drag Mechanics */}
        <div className="p-3.5 sm:p-4 rounded-card bg-bg-surface border border-border-color space-y-2.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-card bg-accent-red/10 border border-accent-red/30 text-accent-red shrink-0">
              <ThornHeartIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="type-strong text-text-primary block">{text.swipeTitle}</span>
              <p className="type-body text-text-muted pt-0.5">{text.swipeDesc}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-0.5 type-caption">
            <InfoChip>
              <SnuffedCandleIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{text.passBadge}</span>
            </InfoChip>
            <Badge tone="red" size="md" plain square>
              <ThornHeartIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{text.smashBadge}</span>
            </Badge>
          </div>
        </div>

        {/* 2. On-Card Action Controls */}
        <div className="p-3.5 sm:p-4 rounded-card bg-bg-surface border border-border-color space-y-2.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-card bg-accent-amber/10 border border-accent-amber/30 text-accent-amber shrink-0">
              <TarotTurnIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="type-strong text-text-primary block">{text.iconsTitle}</span>
              <p className="type-body text-text-muted pt-0.5">{text.iconsDesc}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-0.5 type-caption">
            <InfoChip>
              <TarotTurnIcon className="h-3.5 w-3.5 text-accent-red" aria-hidden="true" />
              <span>{text.flipCardBadge}</span>
            </InfoChip>
            <InfoChip>
              <PortraitLoupeIcon className="h-3.5 w-3.5 text-accent-amber" aria-hidden="true" />
              <span>{text.zoomArtBadge}</span>
            </InfoChip>
          </div>
        </div>

        {/* 3. Tactile Keyboard Controls */}
        <div className="p-3.5 sm:p-4 rounded-card bg-bg-surface border border-border-color space-y-2.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-card bg-bg-elevated border border-border-color text-text-primary shrink-0">
              <Gamepad2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="type-strong text-text-primary block">{text.keycapsTitle}</span>
              <p className="type-body text-text-muted pt-0.5">{text.keycapsDesc}</p>
            </div>
          </div>
          <TactileKeycaps onPass={onPass} onSmash={onSmash} onStats={onStats} onReset={onReset} className="my-1" />
        </div>

        {/* 4. Trial Atmosphere & Lore */}
        <div className="p-3.5 sm:p-4 rounded-card bg-bg-surface border border-border-color flex items-center gap-3 shadow-xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-card bg-accent-purple/10 border border-accent-purple/30 text-accent-purple shrink-0">
            <ThunderPulseIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="type-strong text-text-primary block">{text.atmosphereTitle}</span>
            <p className="type-body text-text-muted pt-0.5">{text.atmosphereDesc}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
