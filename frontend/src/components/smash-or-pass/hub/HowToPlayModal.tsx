'use client';
// frontend/src/components/smash-or-pass/hub/HowToPlayModal.tsx
import { Gamepad2, ZoomIn } from 'lucide-react';
import {
  HeartIcon,
  PassIcon,
  SparkleIcon,
  CardFlipIcon,
} from '@/components/icons/DbdIcons';
import { Modal } from '@/components/common/Modal';
import { useDictionary } from '@/context/DictionaryContext';
import { TactileKeycaps } from './lazyParts';
import { Badge } from '@/components/common/Badge';
import { InfoChip } from '@/components/common/InfoChip';
import { Surface } from '@/components/common/Surface';

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
        {/* Dictionary icon key retention for i18n hygiene */}
        <span className="sr-only" aria-hidden="true">
          {text.swipeIcon} {text.iconsIcon} {text.keycapsIcon} {text.atmosphereIcon}
        </span>

        {/* 1. Swipe & Drag Mechanics */}
        <Surface padding="none" className="p-3.5 sm:p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-card bg-accent-red/10 border border-accent-red/30 text-accent-red shrink-0">
              <HeartIcon className="icon-lg" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="type-strong text-text-primary block">{text.swipeTitle}</span>
              <p className="type-body text-text-muted pt-0.5">{text.swipeDesc}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-0.5 type-caption">
            <InfoChip>
              <PassIcon className="icon-sm" aria-hidden="true" />
              <span>{text.passBadge}</span>
            </InfoChip>
            <Badge tone="red" size="md" plain square>
              <HeartIcon className="icon-sm" aria-hidden="true" />
              <span>{text.smashBadge}</span>
            </Badge>
          </div>
        </Surface>

        {/* 2. On-Card Action Controls */}
        <Surface padding="none" className="p-3.5 sm:p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-card bg-accent-amber/10 border border-accent-amber/30 text-accent-amber shrink-0">
              <CardFlipIcon className="icon-lg" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="type-strong text-text-primary block">{text.iconsTitle}</span>
              <p className="type-body text-text-muted pt-0.5">{text.iconsDesc}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-0.5 type-caption">
            <InfoChip>
              <CardFlipIcon className="icon-sm text-accent-red" aria-hidden="true" />
              <span>{text.flipCardBadge}</span>
            </InfoChip>
            <InfoChip>
              <ZoomIn className="icon-sm text-accent-amber" aria-hidden="true" />
              <span>{text.zoomArtBadge}</span>
            </InfoChip>
          </div>
        </Surface>

        {/* 3. Tactile Keyboard Controls */}
        <Surface padding="none" className="p-3.5 sm:p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-3">
            <Surface tone="elevated" padding="none" className="flex h-9 w-9 items-center justify-center text-text-primary shrink-0">
              <Gamepad2 className="icon-lg" aria-hidden="true" />
            </Surface>
            <div className="min-w-0">
              <span className="type-strong text-text-primary block">{text.keycapsTitle}</span>
              <p className="type-body text-text-muted pt-0.5">{text.keycapsDesc}</p>
            </div>
          </div>
          <TactileKeycaps onPass={onPass} onSmash={onSmash} onStats={onStats} onReset={onReset} className="my-1" />
        </Surface>

        {/* 4. Trial Atmosphere & Lore */}
        <Surface padding="none" className="p-3.5 sm:p-4 flex items-center gap-3 shadow-xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-card bg-accent-purple/10 border border-accent-purple/30 text-accent-purple shrink-0">
            <SparkleIcon className="icon-lg" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="type-strong text-text-primary block">{text.atmosphereTitle}</span>
            <p className="type-body text-text-muted pt-0.5">{text.atmosphereDesc}</p>
          </div>
        </Surface>
      </div>
    </Modal>
  );
}
