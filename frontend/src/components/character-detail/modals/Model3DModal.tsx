// frontend/src/components/character-detail/modals/Model3DModal.tsx
import React from 'react';
import { X } from 'lucide-react';
import { CharacterItem, getAvatarUrl } from '../types';

interface Model3DModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterItem;
  isSurvivor: boolean;
  backendBase: string;
  t: Record<string, string>;
}

export const Model3DModal: React.FC<Model3DModalProps> = ({
  isOpen,
  onClose,
  character,
  isSurvivor,
  backendBase,
  t,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-bg-primary/50 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl lg:max-w-3xl w-auto max-h-[85vh] rounded-3xl border-2 border-accent-red/60 bg-bg-surface/95 shadow-2xl p-4 sm:p-6 flex items-center justify-center animate-in zoom-in-95 duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-2 rounded-xl bg-bg-elevated border border-border-color text-text-secondary hover:text-text-primary hover:bg-bg-elevated/80 transition-all cursor-pointer shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
          aria-label={t.close || 'Close'}
        >
          <X className="w-5 h-5" />
        </button>

        <img
          src={getAvatarUrl(backendBase, character, isSurvivor)}
          alt=""
          className="max-h-[72vh] w-auto max-w-full object-contain rounded-2xl select-none"
        />
      </div>
    </div>
  );
};


