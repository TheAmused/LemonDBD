'use client';

import React, { useEffect, useState } from 'react';
import { X, User, Shield, Skull, Copy, Check, ImageOff } from 'lucide-react';
import { Perk } from './PerkCard';

interface PerkModalProps {
  perk: Perk | null;
  onClose: () => void;
  dict: any;
}

export const PerkModal: React.FC<PerkModalProps> = ({ perk, onClose, dict }) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);



  if (!perk) return null;

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Sanitize and construct perk icon URL
  const cleanIconPath = (perk.icon_local_path || '').replace(/^\/?(static\/)?/, '');
  const iconSrc = cleanIconPath
    ? `${backendBase}/static/${cleanIconPath}`
    : perk.icon_url;

  // Robust avatar URL resolver with dynamic fallback
  const getAvatarSrc = () => {
    let rawPath = perk.character_avatar_path;

    // Fallback if perk object from backend is missing character_avatar_path
    if (!rawPath && perk.character && perk.character !== 'General') {
      const subDir = perk.category === 'Survivor' ? 'survivors' : 'killers';
      const sanitized = perk.character
        .toLowerCase()
        .trim()
        .replace(/[\s\-/]+/g, '_')
        .replace(/[\\/*?:"<>|]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
      rawPath = `avatars/${subDir}/${sanitized}.png`;
    }

    if (!rawPath) return null;
    const cleanPath = rawPath.replace(/^\/?(static\/)?/, '');
    return `${backendBase}/static/${cleanPath}`;
  };

  const avatarSrc = getAvatarSrc();
  const isSurvivor = perk.category === 'Survivor';
  const showRealName =
    perk.character_real_name &&
    perk.character_real_name !== 'General' &&
    perk.character_real_name !== perk.character;

  const handleCopySlug = () => {
    const slug = perk.name.toLowerCase().replace(/[\s\-/]+/g, '_');
    navigator.clipboard.writeText(slug);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderFormattedDescription = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      const parsedContent = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-bold text-amber-500 dark:text-amber-400">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <em key={pIdx} className="italic text-slate-600 dark:text-slate-300">
              {part.slice(1, -1)}
            </em>
          );
        }
        return part;
      });

      if (line.trim().startsWith('* ')) {
        return (
          <li key={idx} className="ml-6 list-disc my-1.5 text-slate-700 dark:text-slate-300">
            {parsedContent}
          </li>
        );
      }

      return (
        <p key={idx} className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
          {parsedContent}
        </p>
      );
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 lg:p-12 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 cursor-default animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          aria-label={dict.modal.close}
          className="absolute right-6 top-6 rounded-full p-3 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="h-7 w-7" />
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 pr-12">
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200/80 p-4 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner">
            {!imgError ? (
              <img
                src={iconSrc}
                alt={perk.name}
                onError={() => setImgError(true)}
                className="h-24 w-24 object-contain drop-shadow-2xl"
              />
            ) : (
              <ImageOff className="h-12 w-12 text-slate-400" />
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              {perk.name}
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs sm:text-sm font-black uppercase tracking-wider ${
                  isSurvivor
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                }`}
              >
                {isSurvivor ? <Shield className="h-4 w-4" /> : <Skull className="h-4 w-4" />}
                {perk.category}
              </span>

              {/* Character Badge with Avatar */}
              <div className="flex items-center gap-2.5 rounded-2xl bg-slate-100/80 px-4 py-2 text-xs sm:text-sm font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 shadow-sm">
                {avatarSrc && !avatarError ? (
                  <img
                    src={avatarSrc}
                    alt={perk.character}
                    onError={() => setAvatarError(true)}
                    className="h-8 w-8 rounded-full object-cover border-2 border-amber-500/50 shrink-0 shadow-sm"
                  />
                ) : (
                  <User className="h-5 w-5 text-slate-400 shrink-0" />
                )}
                <span>{perk.character}</span>
                {showRealName && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                    ({perk.character_real_name})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-8 dark:border-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Perk Description
            </h4>
            <button
              onClick={handleCopySlug}
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{dict.modal.slugCopied}</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>{dict.modal.copySlug}</span>
                </>
              )}
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto pr-4 text-lg sm:text-xl leading-relaxed font-medium">
            {renderFormattedDescription(perk.description)}
          </div>
        </div>
      </div>
    </div>
  );
};