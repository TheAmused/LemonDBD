// frontend/src/components/character-detail/modals/EquipmentDetailModal.tsx
import React from 'react';
import { X } from 'lucide-react';
import { AddonItem, EquipmentItem, getAssetUrl, getRarityTileStyle, getLocalizedRarity, renderFormattedDbdText } from '../types';

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
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-100 via-white to-transparent dark:from-slate-800/40 dark:via-slate-900 dark:to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className={`h-14 w-14 rounded-2xl border-2 p-1.5 flex items-center justify-center shrink-0 shadow-md overflow-hidden ${getRarityTileStyle(
                item.rarity
              ).bg}`}
            >
              <img
                src={getAssetUrl(backendBase, item.icon_local_path, item.icon_url)}
                alt={item.name}
                className="h-full w-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
              />
            </div>
            <div>
              {item.rarity && (
                <span className="text-[10px] font-mono font-bold uppercase text-amber-700 dark:text-amber-400 block">
                  {getLocalizedRarity(item.rarity, t)}
                </span>
              )}
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 font-mono leading-snug">
                {item.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t.close || 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-sm leading-relaxed font-sans text-slate-700 dark:text-slate-300">
          {item.associated_target && (
            <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
              {t.compatibleTarget || 'Compatible Target:'} <span className="text-slate-800 dark:text-slate-200">{item.associated_target}</span>
            </div>
          )}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-2 text-sm">
            {renderFormattedDbdText(item.description || '', false)}
          </div>
        </div>
      </div>
    </div>
  );
};

