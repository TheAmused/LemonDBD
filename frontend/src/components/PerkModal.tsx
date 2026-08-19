'use client';
// frontend/src/components/PerkModal.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { X, User, Shield, Skull, Copy, Check, ImageOff, Repeat } from 'lucide-react';
import { Perk, PerkDictionary } from '@/types/perks';
import {
  getPerkIconUrl,
  getCharacterAvatarUrl,
  formatPerkSlug,
} from '@/utils/perkUtils';
import { PerkDescription } from '@/components/PerkDescription';

interface PerkModalProps {
  perk: Perk | null;
  onClose: () => void;
  dict?: PerkDictionary;
}

export const PerkModal: React.FC<PerkModalProps> = ({
  perk,
  onClose,
  dict,
}) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!perk) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [perk, handleKeyDown]);

  if (!perk) return null;

  const iconSrc = getPerkIconUrl(perk);
  const avatarSrc = getCharacterAvatarUrl(
    perk,
    perk.category === 'Killer' ? 'Killer' : 'Survivor'
  );

  const isGeneral =
    !perk.character ||
    perk.character === 'General' ||
    Boolean(perk.is_generic_counterpart);
  const isSurvivor = perk.category === 'Survivor';
  const showRealName =
    perk.character_real_name &&
    perk.character_real_name !== 'General' &&
    perk.character_real_name !== perk.character;

  const handleCopySlug = async () => {
    const slug = formatPerkSlug(perk.name);
    try {
      await navigator.clipboard.writeText(slug);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed copying slug to clipboard:', e);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="perk-modal-title"
      aria-describedby="perk-modal-description"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-[#0c121e]/95 p-6 sm:p-8 shadow-2xl text-slate-100 cursor-default animate-in zoom-in-95 duration-200 backdrop-blur-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={dict?.modal?.close || 'Close perk modal'}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pr-8">
          <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 p-2.5 border border-slate-800 shadow-inner">
            {!imgError && iconSrc ? (
              <img
                src={iconSrc}
                alt={perk.name}
                onError={() => setImgError(true)}
                className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
              />
            ) : (
              <ImageOff className="h-8 w-8 text-slate-500" />
            )}
          </div>

          <div className="space-y-2">
            <h2
              id="perk-modal-title"
              className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight leading-tight"
            >
              {perk.name}
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${
                  isSurvivor
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isSurvivor ? <Shield className="h-3 w-3" /> : <Skull className="h-3 w-3" />}
                {perk.category} Perk
              </span>

              <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-2.5 py-1 text-xs font-bold text-slate-200 border border-slate-800 shadow-sm">
                {avatarSrc && !avatarError ? (
                  <img
                    src={avatarSrc}
                    alt={perk.character}
                    onError={() => setAvatarError(true)}
                    className="h-5 w-5 rounded-full object-cover border border-amber-500/40 shrink-0 shadow-sm"
                  />
                ) : (
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                )}
                <span>
                  {isGeneral
                    ? dict?.modal?.generalPerk || 'General Perk'
                    : perk.character}
                </span>
                {showRealName && (
                  <span className="text-[11px] text-slate-400 font-normal">
                    ({perk.character_real_name})
                  </span>
                )}
              </div>

              {perk.alternate_name && (
                <div className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300 border border-amber-500/30">
                  <Repeat className="h-3 w-3 text-amber-400" />
                  <span>
                    {dict?.modal?.alias || 'Alias'}: {perk.alternate_name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-800/80 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
              {dict?.modal?.perkDescription || 'Perk Description'}
            </h3>
            <button
              type="button"
              onClick={handleCopySlug}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 rounded px-1.5 py-0.5"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">
                    {dict?.modal?.slugCopied || 'Copied!'}
                  </span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{dict?.modal?.copySlug || 'Copy Identifier'}</span>
                </>
              )}
            </button>
          </div>

          <div
            id="perk-modal-description"
            className="max-h-[360px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
          >
            <PerkDescription
              description={perk.description}
              perkName={perk.name}
              variant="modal"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
