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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-bg-primary/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl bg-bg-surface border border-border-color rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border-color flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-bg-elevated border border-border-color flex items-center justify-center text-text-secondary shadow-inner">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-black uppercase tracking-wider text-text-secondary">
                {t.entityArchives || "The Entity's Archives"} {t.bulletSeparator || '•'} {t.codex || 'Codex'} #{character.id || 1}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-text-primary font-mono mt-0.5">
                {character.name} {t.emDashSeparator || '—'} {t.loreTitle || 'Lore & Bio'}
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

        <div className="p-6 overflow-y-auto space-y-4 text-sm leading-relaxed font-sans text-text-secondary">
          <p className="italic text-text-secondary border-l-2 border-border-color pl-4 py-1">
            {t.quoteOpen || '"'}{character.name} {t.emDashSeparator || '—'} {t.enteredTheFog || 'Entered The Fog.'}{t.quoteClose || '"'}
          </p>
          <div className="p-4 rounded-2xl bg-bg-elevated border border-border-color text-sm leading-relaxed whitespace-pre-line text-text-primary font-medium">
            {rawLoreText}
          </div>
        </div>

      </div>
    </div>
  );
};

