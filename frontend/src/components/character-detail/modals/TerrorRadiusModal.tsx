// frontend/src/components/character-detail/modals/TerrorRadiusModal.tsx
import React from 'react';
import { Radio, X, Eye } from 'lucide-react';
import { CharacterItem } from '../types';

interface TerrorRadiusModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterItem;
  killerTerrorRadius: string;
  killerTRMeters: number;
  killerSpeed: string;
  t: any;
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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-rose-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-rose-500/15 via-red-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 shadow-inner">
              <Radio className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-black uppercase tracking-wider text-rose-500">
                {character.name} &bull; Acoustic Range
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {t.terrorRadiusVisualizer || 'Terror Radius Visualizer'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t.close || 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 dark:text-slate-300">
          <div className="relative flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-950 border border-rose-500/20 overflow-hidden">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-dashed border-purple-500/30 flex items-start justify-center pt-1">
                <span className="text-[9px] font-mono text-purple-400/80">45m (Lullaby)</span>
              </div>

              <div
                className={`absolute inset-4 rounded-full border ${
                  killerTRMeters >= 32
                    ? 'border-2 border-rose-500/80 bg-rose-500/5 animate-pulse'
                    : 'border-slate-700'
                } flex items-start justify-center pt-1`}
              >
                <span className="text-[9px] font-mono font-bold text-rose-400">32m (Audible)</span>
              </div>

              <div
                className={`absolute inset-12 rounded-full border ${
                  killerTRMeters === 24
                    ? 'border-2 border-rose-500 bg-rose-500/10 animate-pulse'
                    : 'border-slate-800'
                } flex items-start justify-center pt-1`}
              >
                <span className="text-[9px] font-mono font-bold text-amber-400">24m</span>
              </div>

              <div className="absolute inset-20 rounded-full border border-rose-600/60 bg-rose-600/10 flex items-start justify-center pt-1">
                <span className="text-[9px] font-mono font-bold text-rose-300">16m</span>
              </div>

              <div className="absolute inset-28 rounded-full border-2 border-red-500 bg-red-600/20 flex items-center justify-center">
                <span className="text-[9px] font-mono font-black text-red-300">8m (Chase)</span>
              </div>

              <div className="h-4 w-4 rounded-full bg-red-500 shadow-lg shadow-red-500/50 z-10" />
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
              <span>
                Current Base Terror Radius:{' '}
                <strong className="text-rose-400">{killerTerrorRadius}</strong>
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-mono font-black uppercase text-slate-400 tracking-wider">
              {t.heartbeatStages || 'Heartbeat Intensity Progression'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40">
                <strong className="text-red-400 block mb-1">
                  {t.immediateThreat || '0 - 8 Metres (Immediate Chase)'}
                </strong>
                <p className="text-slate-300 text-[11px]">
                  Max heartbeat tempo, aggressive percussion, and direct visual red stain engagement.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30">
                <strong className="text-rose-400 block mb-1">
                  {t.dangerZone || '8 - 16 Metres (Danger Zone)'}
                </strong>
                <p className="text-slate-300 text-[11px]">
                  Rapid heavy thumping heartbeat; killer is actively maneuvering around loops.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
                <strong className="text-amber-400 block mb-1">
                  {t.approaching || '16 - 24 Metres (Approaching)'}
                </strong>
                <p className="text-slate-300 text-[11px]">
                  Rhythmic steady pulse indicating proximity to survivor objectives.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <strong className="text-slate-300 block mb-1">
                  {t.audibleRange || '24 - 32 Metres (Audible Range)'}
                </strong>
                <p className="text-slate-400 text-[11px]">
                  Initial faint audio cues signaling presence within the trial quadrant.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
              {t.survivorComparison || 'Survivor Speed Comparison'}
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              {t.survivorComparisonDesc || 'Survivor standard sprint speed is 4.0 m/s (100%).'}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1 text-slate-400">
              <span>
                Killer Base: <strong className="text-rose-400">{killerSpeed}</strong>
              </span>
              <span>
                Survivor Sprint: <strong className="text-emerald-400">4.0 m/s (100%)</strong>
              </span>
              <span>
                Straight Gap Close:{' '}
                <strong className="text-amber-400">
                  ~{(killerTRMeters / 4.6).toFixed(1)}s straight line
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <span className="text-xs text-slate-400 font-mono">{t.clickOutsideToClose || 'Esc or click outside to close'}</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 transition-all cursor-pointer shadow-sm"
          >
            {t.close || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
