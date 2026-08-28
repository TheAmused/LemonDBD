// frontend/src/components/character-detail/modals/LoreModal.tsx
import React from 'react';
import { BookOpen, X } from 'lucide-react';
import { CharacterItem } from '../types';

interface LoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterItem;
  rawLoreText: string;
  t: Record<string, string>;
}

export const LoreModal: React.FC<LoreModalProps> = ({
  isOpen,
  onClose,
  character,
  rawLoreText,
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
        className="relative w-full max-w-2xl bg-slate-900 border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-purple-500/15 via-indigo-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-inner">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-black uppercase tracking-wider text-purple-400">
                {t.entityArchives || "The Entity's Archives"} {t.bulletSeparator || '•'} {t.codex || 'Codex'} #{character.id || 1}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100 font-mono mt-0.5">
                {character.name} {t.emDashSeparator || '—'} {t.loreTitle || 'Lore & Bio'}
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

        <div className="p-6 overflow-y-auto space-y-4 text-sm leading-relaxed font-sans text-slate-300">
          <p className="italic text-slate-400 border-l-2 border-purple-500 pl-4 py-1">
            {t.quoteOpen || '"'}{character.name} {t.emDashSeparator || '—'} {t.enteredTheFog || 'Entered The Fog.'}{t.quoteClose || '"'}
          </p>
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-sm leading-relaxed whitespace-pre-line text-slate-200 font-medium">
            {rawLoreText}
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

