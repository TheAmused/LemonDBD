// frontend/src/components/character-detail/modals/TerrorRadiusModal.tsx
import React from 'react';
import { Radio } from 'lucide-react';
import { CharacterItem } from '../types';
import { Modal } from '@/components/common/Modal';

interface TerrorRadiusModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterItem;
  killerTerrorRadius: string;
  killerTRMeters: number;
  killerSpeed: string;
  t: Record<string, string>;
}

export const TerrorRadiusModal: React.FC<TerrorRadiusModalProps> = ({
  isOpen,
  onClose,
  character,
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
      icon={<Radio className="h-5 w-5 animate-pulse" />}
      title={t.terrorRadiusVisualizer || 'Terror Radius Visualizer'}
      subtitle={`${character.name} ${t.bulletSeparator || '•'} ${t.acousticRange || 'Acoustic Range'}`}
      closeButtonAriaLabel={t.close || 'Close'}
      padded
      bodyClassName="space-y-6 text-sm text-text-secondary"
    >
    <div className="relative flex flex-col items-center justify-center p-6 rounded-3xl bg-bg-primary border border-border-color overflow-hidden">
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-dashed border-border-subtle flex items-start justify-center pt-1">
          <span className="text-[9px] text-text-muted">{t.distance45m || '45m'} ({t.lullaby || 'Lullaby'})</span>
        </div>

        <div
          className={`absolute inset-4 rounded-full border ${
            killerTRMeters >= 32
              ? 'border-2 border-accent-red/70 bg-accent-red/5 animate-pulse'
              : 'border-border-color'
          } flex items-start justify-center pt-1`}
        >
          <span className="text-[9px] font-bold text-accent-red">{t.distance32m || '32m'} ({t.audible || 'Audible'})</span>
        </div>

        <div
          className={`absolute inset-12 rounded-full border ${
            killerTRMeters === 24
              ? 'border-2 border-accent-red bg-accent-red/10 animate-pulse'
              : 'border-border-subtle'
          } flex items-start justify-center pt-1`}
         >
           <span className="text-[9px] font-bold text-accent-amber">{t.distance24m}</span>
         </div>

         <div className="absolute inset-20 rounded-full border border-accent-red/60 bg-accent-red/10 flex items-start justify-center pt-1">
           <span className="text-[9px] font-bold text-accent-red">{t.distance16m}</span>
         </div>


        <div className="absolute inset-28 rounded-full border-2 border-accent-red bg-accent-red/20 flex items-center justify-center">
          <span className="text-[9px] font-black text-accent-red">{t.distance8m || '8m'} ({t.chase || 'Chase'})</span>
        </div>

        <div className="h-4 w-4 rounded-full bg-accent-red shadow-lg shadow-accent-red/50 z-10" />
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-text-secondary">
        <span className="inline-block h-2 w-2 rounded-full bg-accent-red" />
        <span>
          {t.currentBaseTerrorRadius || 'Current Base Terror Radius'}:{' '}
          <strong className="text-accent-red">{killerTerrorRadius}</strong>
        </span>
      </div>
    </div>

    <div className="space-y-3">
      <h3 className="text-xs font-black uppercase text-text-secondary tracking-wider">
        {t.heartbeatStages || 'Heartbeat Intensity Progression'}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/40">
          <strong className="text-accent-red block mb-1">
            {t.immediateThreat || '0 - 8 Metres (Immediate Chase)'}
          </strong>
          <p className="text-text-secondary text-[11px]">
            {t.immediateChaseDesc || 'Max heartbeat tempo, aggressive percussion, and direct visual red stain engagement.'}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-accent-red/5 border border-accent-red/25">
          <strong className="text-accent-red block mb-1">
            {t.dangerZone || '8 - 16 Metres (Danger Zone)'}
          </strong>
          <p className="text-text-secondary text-[11px]">
            {t.dangerZoneDesc || 'Rapid heavy thumping heartbeat; killer is actively maneuvering around loops.'}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-accent-amber/10 border border-accent-amber/30">
          <strong className="text-accent-amber block mb-1">
            {t.approaching || '16 - 24 Metres (Approaching)'}
          </strong>
          <p className="text-text-secondary text-[11px]">
            {t.approachingDesc || 'Rhythmic steady pulse indicating proximity to survivor objectives.'}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-bg-elevated border border-border-color">
          <strong className="text-text-primary block mb-1">
            {t.audibleRange || '24 - 32 Metres (Audible Range)'}
          </strong>
          <p className="text-text-secondary text-[11px]">
            {t.audibleRangeDesc || 'Initial faint audio cues signaling presence within the trial quadrant.'}
          </p>
        </div>
      </div>
    </div>

    <div className="space-y-2">
      <span className="text-xs font-bold text-text-secondary uppercase">
        {t.survivorComparison || 'Survivor Speed Comparison'}
      </span>
      <p className="text-xs text-text-secondary">
        {t.survivorComparisonDesc || 'Survivor standard sprint speed is 4.0 m/s (100%).'}
      </p>
      <div className="flex flex-wrap items-center gap-4 text-xs pt-1 text-text-secondary">
        <span>
          {t.killerBase || 'Killer Base'}: <strong className="text-accent-red">{killerSpeed}</strong>
        </span>
        <span>
          {t.survivorSprint || 'Survivor Sprint'}: <strong className="text-accent-green">{t.survivorSprintSpeed || '4.0 m/s (100%)'}</strong>
        </span>
        <span>
          {t.straightGapClose || 'Straight Gap Close'}:{' '}
          <strong className="text-accent-amber">
            {t.approxSymbol || '~'}{(killerTRMeters / 4.6).toFixed(1)}{t.secondsUnit || 's'} {t.straightLine || 'straight line'}
          </strong>
        </span>
      </div>
    </div>
    </Modal>
  );
};
