// frontend/src/components/character-detail/modals/TerrorRadiusModal.tsx
import React from 'react';
import { CharacterItem, CharacterDetailDictionary } from '../types';
import { Modal } from '@/components/common/Modal';
import { Surface } from '@/components/common/Surface';

interface TerrorRadiusModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterItem;
  killerTerrorRadius: string;
  killerTRMeters: number;
  killerSpeed: string;
  t: CharacterDetailDictionary;
}

export const TerrorRadiusModal: React.FC<TerrorRadiusModalProps> = ({
  isOpen,
  onClose,
  killerTerrorRadius,
  killerTRMeters,
  killerSpeed,
  t,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="dialog"
      size="2xl"
      title={t.terrorRadiusVisualizer}
      closeButtonAriaLabel={t.close}
      padded
      bodyClassName="space-y-6 text-sm text-text-secondary"
    >
    <div className="relative flex flex-col items-center justify-center p-6 rounded-card bg-bg-primary border border-border-color overflow-hidden">
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-dashed border-border-subtle flex items-start justify-center pt-1">
          <span className="text-micro text-text-muted">{t.distance45m} ({t.lullaby})</span>
        </div>

        <div
          className={`absolute inset-4 rounded-full border ${
            killerTRMeters >= 32
              ? 'border-2 border-accent-red/70 bg-accent-red/5 animate-pulse'
              : 'border-border-color'
          } flex items-start justify-center pt-1`}
        >
          <span className="text-micro font-bold text-accent-red">{t.distance32m} ({t.audible})</span>
        </div>

        <div
          className={`absolute inset-12 rounded-full border ${
            killerTRMeters === 24
              ? 'border-2 border-accent-red bg-accent-red/10 animate-pulse'
              : 'border-border-subtle'
          } flex items-start justify-center pt-1`}
         >
           <span className="text-micro font-bold text-accent-amber">{t.distance24m}</span>
         </div>

         <div className="absolute inset-20 rounded-full border border-accent-red/60 bg-accent-red/10 flex items-start justify-center pt-1">
           <span className="text-micro font-bold text-accent-red">{t.distance16m}</span>
         </div>


        <div className="absolute inset-28 rounded-full border-2 border-accent-red bg-accent-red/20 flex items-center justify-center">
          <span className="text-micro font-black text-accent-red">{t.distance8m} ({t.chase})</span>
        </div>

        <div className="h-4 w-4 rounded-full bg-accent-red shadow-lg shadow-accent-red/50 z-10" />
      </div>

      <div className="mt-4 flex items-center gap-2 type-strong text-text-secondary">
        <span className="inline-block h-2 w-2 rounded-full bg-accent-red" />
        <span>
          {t.currentBaseTerrorRadius}:{' '}
          <strong className="text-accent-red">{killerTerrorRadius}</strong>
        </span>
      </div>
    </div>

    <div className="space-y-3">
      <h3 className="type-label-sm text-text-secondary">
        {t.heartbeatStages}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-card bg-accent-red/10 border border-accent-red/40">
          <strong className="text-accent-red block mb-1">
            {t.immediateThreat}
          </strong>
          <p className="text-text-secondary type-caption">
            {t.immediateChaseDesc}
          </p>
        </div>
        <div className="p-3 rounded-card bg-accent-red/5 border border-accent-red/25">
          <strong className="text-accent-red block mb-1">
            {t.dangerZone}
          </strong>
          <p className="text-text-secondary type-caption">
            {t.dangerZoneDesc}
          </p>
        </div>
        <div className="p-3 rounded-card bg-accent-amber/10 border border-accent-amber/30">
          <strong className="text-accent-amber block mb-1">
            {t.approaching}
          </strong>
          <p className="text-text-secondary type-caption">
            {t.approachingDesc}
          </p>
        </div>
        <Surface tone="elevated" padding="sm">
          <strong className="text-text-primary block mb-1">
            {t.audibleRange}
          </strong>
          <p className="text-text-secondary type-caption">
            {t.audibleRangeDesc}
          </p>
        </Surface>
      </div>
    </div>

    <div className="space-y-2">
      <span className="type-label-sm text-text-secondary">
        {t.survivorComparison}
      </span>
      <p className="text-xs text-text-secondary">
        {t.survivorComparisonDesc}
      </p>
      <div className="flex flex-wrap items-center gap-4 text-xs pt-1 text-text-secondary">
        <span>
          {t.killerBase}: <strong className="text-accent-red">{killerSpeed}</strong>
        </span>
        <span>
          {t.survivorSprint}: <strong className="text-accent-green">{t.survivorSprintSpeed}</strong>
        </span>
        <span>
          {t.straightGapClose}:{' '}
          <strong className="text-accent-amber">
            {t.approxSymbol || '~'}{(killerTRMeters / 4.6).toFixed(1)}{t.secondsUnit || 's'} {t.straightLine}
          </strong>
        </span>
      </div>
    </div>
    </Modal>
  );
};
