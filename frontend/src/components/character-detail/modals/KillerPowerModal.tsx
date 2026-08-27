// frontend/src/components/character-detail/modals/KillerPowerModal.tsx
import React from 'react';
import { BookOpen, Flame, X } from 'lucide-react';
import { KillerPowerInfo, CharacterItem, getAssetUrl, renderFormattedDbdText } from '../types';

interface KillerPowerModalProps {
  isOpen: boolean;
  onClose: () => void;
  killerPower: KillerPowerInfo;
  character: CharacterItem;
  killerSpeed: string;
  killerTerrorRadius: string;
  killerHeight: string;
  backendBase: string;
  t: Record<string, string>;
}

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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-rose-500/15 via-red-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-950 via-slate-900 to-slate-950 border-2 border-rose-500/50 flex items-center justify-center p-1.5 shadow-lg shadow-rose-950/40">
              {killerPower.icon_url || killerPower.icon_local_path ? (
                <img
                  src={getAssetUrl(backendBase, killerPower.icon_local_path, killerPower.icon_url)}
                  alt={killerPower.name}
                  className="h-full w-full object-contain filter drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (killerPower.icon_url && img.src !== killerPower.icon_url) {
                      img.src = killerPower.icon_url;
                    }
                  }}
                />
              ) : (
                <Flame className="h-6 w-6 text-rose-400 animate-pulse" />
              )}
            </div>
            <div>
              <span className="text-[11px] font-mono font-black uppercase tracking-wider text-rose-400">
                {character.name} {t.bulletSeparator || '•'} {t.killerPower || 'Killer Power'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100 font-mono mt-0.5">
                {killerPower.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t.close || 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800/80 grid grid-cols-3 gap-2">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="block text-[9px] font-mono font-bold uppercase text-slate-400">{t.movementSpeed || 'Speed'}</span>
            <span className="block text-xs font-black text-slate-200 truncate">{killerSpeed}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="block text-[9px] font-mono font-bold uppercase text-slate-400">{t.terrorRadius || 'Terror Radius'}</span>
            <span className="block text-xs font-black text-rose-400 truncate">{killerTerrorRadius}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="block text-[9px] font-mono font-bold uppercase text-slate-400">{t.height || 'Height'}</span>
            <span className="block text-xs font-black text-slate-200 truncate">{killerHeight}</span>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-300 leading-relaxed">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <span className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase mb-2">
              <BookOpen className="h-3.5 w-3.5 text-rose-400" />
              {t.killerPowerDesc || 'Special ability and combat mechanics'}
            </span>
            <div className="space-y-2 text-sm sm:text-base leading-relaxed">
              {renderFormattedDbdText(
                killerPower.description || 'Detailed mechanical power breakdown cataloged from Trial archives.',
                false
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 px-6 border-t border-slate-800 bg-slate-950/30">
          <span className="text-xs text-slate-400 font-mono">{t.clickOutsideToClose || 'Esc or click outside to close'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-white text-slate-900 transition-all cursor-pointer shadow-sm"
          >
            {t.close || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

