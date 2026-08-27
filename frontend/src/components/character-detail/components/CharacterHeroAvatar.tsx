// frontend/src/components/character-detail/components/CharacterHeroAvatar.tsx
import React, { useState } from 'react';
import { Eye, Shield, Skull, User } from 'lucide-react';
import { CharacterItem, getAvatarUrl } from '../types';

interface CharacterHeroAvatarProps {
  character: CharacterItem;
  isSurvivor: boolean;
  roleLabel: string;
  backendBase: string;
  onOpenModelModal: () => void;
  t: Record<string, string>;
}

export const CharacterHeroAvatar: React.FC<CharacterHeroAvatarProps> = ({
  character,
  isSurvivor,
  roleLabel,
  backendBase,
  onOpenModelModal,
  t,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="lg:col-span-4 flex flex-col items-center w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpenModelModal}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenModelModal();
          }
        }}
        className="group relative w-full max-w-[280px] sm:max-w-[320px] aspect-[3/4] rounded-3xl overflow-hidden border-2 border-slate-800 bg-slate-950 shadow-2xl cursor-pointer hover:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-300 flex items-center justify-center"
        title={t.view3DModel || 'Click to View Full 3D Model'}
        aria-label={`${character.name} avatar preview. Click to inspect full render.`}
      >
        {!imgFailed ? (
          <img
            src={getAvatarUrl(backendBase, character, isSurvivor)}
            alt={character.name}
            className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500">
            <User className="h-16 w-16 mb-2 opacity-50" />
            <span className="text-xs font-mono font-bold text-slate-400">{character.name}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center transition-opacity duration-200">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2 shadow-lg">
            <Eye className="h-6 w-6" />
          </div>
          <span className="text-xs font-black text-white uppercase tracking-wider">
            {t.view3DModel || 'View 3D Model / Full Render'}
          </span>
          <span className="text-[10px] text-slate-300 mt-1">
            {t.interactiveViewer || 'Interactive Viewer'}
          </span>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent pointer-events-none" />

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black border backdrop-blur-md ${
              isSurvivor
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950/50'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-950/50'
            }`}
          >
            {isSurvivor ? <Shield className="h-3.5 w-3.5" /> : <Skull className="h-3.5 w-3.5" />}
            {roleLabel}
          </span>

          <span className="rounded-full bg-slate-900/80 border border-slate-700/80 px-2.5 py-0.5 text-[10px] font-bold text-slate-300 backdrop-blur-md">
            {character.is_licensed ? (t.dlcLicensed || 'Licensed') : (t.dlcOriginal || 'Original')}
          </span>
        </div>
      </div>
    </div>
  );
};

