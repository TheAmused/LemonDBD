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
        className="relative w-full max-w-xl bg-bg-surface border border-border-color rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border-color flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-bg-elevated border-2 border-accent-red/50 flex items-center justify-center p-1.5 shadow-lg">
              {killerPower.icon_url || killerPower.icon_local_path ? (
                <img
                  src={getAssetUrl(backendBase, killerPower.icon_local_path, killerPower.icon_url)}
                  alt={killerPower.name}
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (killerPower.icon_url && img.src !== killerPower.icon_url) {
                      img.src = killerPower.icon_url;
                    }
                  }}
                />
              ) : (
                <Flame className="h-6 w-6 text-accent-red animate-pulse" />
              )}
            </div>
            <div>
              <span className="text-[11px] font-mono font-black uppercase tracking-wider text-accent-red">
                {character.name} {t.bulletSeparator || '•'} {t.killerPower || 'Killer Power'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-text-primary font-mono mt-0.5">
                {killerPower.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
            aria-label={t.close || 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 bg-bg-elevated border-b border-border-color grid grid-cols-3 gap-2">
          <div className="p-2 rounded-xl bg-bg-surface border border-border-color text-center">
            <span className="block text-[9px] font-mono font-bold uppercase text-text-secondary">{t.movementSpeed || 'Speed'}</span>
            <span className="block text-xs font-black text-text-primary truncate">{killerSpeed}</span>
          </div>
          <div className="p-2 rounded-xl bg-bg-surface border border-border-color text-center">
            <span className="block text-[9px] font-mono font-bold uppercase text-text-secondary">{t.terrorRadius || 'Terror Radius'}</span>
            <span className="block text-xs font-black text-accent-red truncate">{killerTerrorRadius}</span>
          </div>
          <div className="p-2 rounded-xl bg-bg-surface border border-border-color text-center">
            <span className="block text-[9px] font-mono font-bold uppercase text-text-secondary">{t.height || 'Height'}</span>
            <span className="block text-xs font-black text-text-primary truncate">{killerHeight}</span>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-sm text-text-secondary leading-relaxed">
          <div className="p-4 rounded-2xl bg-bg-elevated border border-border-color space-y-2">
            <span className="flex items-center gap-2 text-xs font-mono font-bold text-text-secondary uppercase mb-2">
              <BookOpen className="h-3.5 w-3.5 text-accent-red" />
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

      </div>
    </div>
  );
};

