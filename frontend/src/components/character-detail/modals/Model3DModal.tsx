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
        className="relative w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-amber-500/15 via-orange-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Box className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-black uppercase tracking-wider text-amber-400">
                {t.highRes3dModelView || 'High-Res 3D Model View'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
                {character.name}
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

        <div className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="relative w-full max-w-[260px] aspect-[3/4] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
            <img
              src={getAvatarUrl(backendBase, character, isSurvivor)}
              alt={character.name}
              className="h-full w-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-amber-500/30 text-[10px] font-mono text-amber-400">
              {t.interactive3dMeshEngineWip || 'Interactive 3D Mesh Engine (WIP)'}
            </div>
          </div>

          <p className="text-xs text-slate-400 max-w-md">
            {t.fullModelNotice || 'High-fidelity 3D model viewport slot. Currently displaying full portrait render.'}
          </p>
        </div>

      </div>
    </div>
  );
};

