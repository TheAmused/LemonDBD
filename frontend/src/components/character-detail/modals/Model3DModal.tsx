// frontend/src/components/character-detail/modals/Model3DModal.tsx
import React from 'react';
import { Box, X } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-xl bg-bg-surface border border-border-color rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border-color flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-bg-elevated border border-border-color flex items-center justify-center text-text-secondary shadow-inner">
              <Box className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-black uppercase tracking-wider text-text-secondary">
                {t.highRes3dModelView || 'High-Res 3D Model View'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-text-primary font-mono">
                {character.name}
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

        <div className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="relative w-full max-w-[260px] aspect-[3/4] rounded-2xl overflow-hidden border border-border-color bg-bg-elevated shadow-lg dark:shadow-2xl">
            <img
              src={getAvatarUrl(backendBase, character, isSurvivor)}
              alt={character.name}
              className="h-full w-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/80 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-bg-primary/80 backdrop-blur-md border border-border-color text-[10px] font-mono text-text-secondary">
              {t.interactive3dMeshEngineWip || 'Interactive 3D Mesh Engine (WIP)'}
            </div>
          </div>

          <p className="text-xs text-text-secondary max-w-md">
            {t.fullModelNotice || 'High-fidelity 3D model viewport slot. Currently displaying full portrait render.'}
          </p>
        </div>

      </div>
    </div>
  );
};

