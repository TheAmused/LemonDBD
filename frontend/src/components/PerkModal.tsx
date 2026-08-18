'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { X, User, Shield, Skull, Copy, Check, ImageOff, Repeat } from 'lucide-react';
import { Perk } from './PerkCard';

interface PerkModalProps {
  perk: Perk | null;
  onClose: () => void;
  dict: any;
}

const ACTION_KEYWORDS = [
  'Increases',
  'Increase',
  'Decreases',
  'Decrease',
  'Grants',
  'Grant',
  'Reveals',
  'Reveal',
  'Causes',
  'Cause',
  'Unlocks',
  'Unlock',
  'Tremendously',
  'Considerably',
  'Moderately',
  'Slightly',
  'Hex:',
  'Hex',
  'Boon:',
  'Boon',
  'Scourge Hook:',
  'Scourge Hook',
  'Obsession',
  'Exhausted',
  'Exhaustion',
  'Exposed',
  'Haste',
  'Hindered',
  'Blindness',
  'Broken',
  'Oblivious',
  'Undetectable',
  'Incapacitated',
  'Mangled',
  'Hemorrhage',
  'Deep Wound',
  'Cursed',
  'Endurance',
  'Bloodlust',
  'Terror Radius',
  'Killer Instinct',
  'Aura Reading',
  'Auras',
  'Aura',
  'Skill Checks',
  'Skill Check',
  'Great Skill Check',
  'Good Skill Check',
];

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

  const tokenRegex = useMemo(() => {
    if (!perk) return null;
    const escapedPerkName = perk.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const keywordsPattern = ACTION_KEYWORDS.map((k) =>
      k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    ).join('|');

    return new RegExp(
      `(\\b(?:${escapedPerkName})\\b|` +
      `\\b(?:${keywordsPattern})\\b|` +
      `\\+?\\-?\\d+(?:\\.\\d+)?(?:\\s*\\/\\s*\\d+(?:\\.\\d+)?)+(?:\\s*%)?|` +
      `\\+\\d+(?:\\.\\d+)?\\s*(?:metres?|meters?|m\\b|%|seconds?|s\\b|tokens?|charges?)|` +
      `\\b\\d+(?:\\.\\d+)?\\s*%|` +
      `\\b\\d+(?:\\.\\d+)?\\s*(?:metres?|meters?|seconds?|tokens?)\\b)`,
      'gi'
    );
  }, [perk]);

  if (!perk) return null;

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const cleanIconPath = (perk.icon_local_path || '').replace(/^\/?(static\/)?/, '');
  const iconSrc = cleanIconPath
    ? `${backendBase}/static/${cleanIconPath}`
    : perk.icon_url;

  const isGeneral = !perk.character || perk.character === 'General' || perk.is_generic_counterpart;

  const getAvatarSrc = () => {
    let rawPath = perk.character_avatar_path;
    if (!rawPath && perk.character && !isGeneral) {
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

  const parseLineTokens = (text: string, lineKey: number | string) => {
    if (!tokenRegex) return text;

    const parts = text.split(tokenRegex);

    return parts.map((part, idx) => {
      if (!part) return null;

      const trimmed = part.trim();

      if (trimmed.toLowerCase() === perk.name.toLowerCase()) {
        return (
          <em key={`${lineKey}-${idx}`} className="italic font-medium text-slate-100 dark:text-white">
            {part}
          </em>
        );
      }

      const isKeyword = ACTION_KEYWORDS.some(
        (k) => k.toLowerCase() === trimmed.toLowerCase()
      );

      const isValueNumber =
        /^\+?\-?\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)+(?:\s*%)?$/.test(trimmed) ||
        /^\+\d+(?:\.\d+)?\s*(?:metres?|meters?|m|%|seconds?|s|tokens?|charges?)$/i.test(trimmed) ||
        /^\d+(?:\.\d+)?\s*%$/.test(trimmed) ||
        /^\d+(?:\.\d+)?\s*(?:metres?|meters?|seconds?|tokens?)$/i.test(trimmed);

      if (isKeyword || isValueNumber) {
        return (
          <strong key={`${lineKey}-${idx}`} className="font-black text-amber-400 dark:text-amber-400">
            {part}
          </strong>
        );
      }

      return <span key={`${lineKey}-${idx}`}>{part}</span>;
    });
  };

  const renderFormattedDescription = (rawText: string) => {
    if (!rawText) return null;

    const cleaned = rawText
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/(?<=\S)\*(?=\s|$|[.,;:!?)])/g, '')
      .replace(/\*(?=[a-zA-Z0-9+%-])/g, '')
      .replace(/(?<=[a-zA-Z0-9+%-])\*/g, '');

    const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    return lines.map((line, lineIdx) => {
      const strippedForQuote = line.replace(/^[\*\s_]+/, '').replace(/[\*\s_]+$/, '');

      const isQuote =
        (strippedForQuote.startsWith('"') && strippedForQuote.endsWith('"')) ||
        (strippedForQuote.startsWith('“') && strippedForQuote.endsWith('”')) ||
        (strippedForQuote.startsWith('"') && strippedForQuote.includes('" -')) ||
        (strippedForQuote.startsWith('“') && strippedForQuote.includes('” -')) ||
        (strippedForQuote.startsWith('"') && strippedForQuote.includes('"-')) ||
        (strippedForQuote.startsWith('“') && strippedForQuote.includes('”-')) ||
        /^["“].+["”](\s*[-–—].+)?$/.test(strippedForQuote);

      if (isQuote) {
        return (
          <div
            key={lineIdx}
            className="my-3 rounded-xl border-l-2 border-amber-500/80 bg-slate-900/60 dark:bg-slate-950/80 p-3 text-xs sm:text-sm italic text-slate-300 dark:text-slate-400 font-serif shadow-inner"
          >
            {strippedForQuote}
          </div>
        );
      }

      const isBullet = line.startsWith('•') || line.startsWith('* ') || line.startsWith('- ') || /^\*\s+[A-Za-z]/.test(line);
      const contentText = isBullet ? line.replace(/^[•\*\-]\s*/, '') : line;

      const parsedElements = parseLineTokens(contentText, lineIdx);

      if (isBullet) {
        return (
          <li
            key={lineIdx}
            className="ml-5 list-disc my-1.5 text-xs sm:text-sm leading-relaxed text-slate-300 dark:text-slate-300 marker:text-amber-400"
          >
            {parsedElements}
          </li>
        );
      }

      return (
        <p key={lineIdx} className="mb-2.5 text-xs sm:text-sm leading-relaxed text-slate-300 dark:text-slate-300">
          {parsedElements}
        </p>
      );
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-[#0c121e]/95 p-6 sm:p-8 shadow-2xl text-slate-100 cursor-default animate-in zoom-in-95 duration-200 backdrop-blur-2xl"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          aria-label={dict?.modal?.close || 'Close'}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pr-8">
          <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 p-2.5 border border-slate-800 shadow-inner">
            {!imgError ? (
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
            <h2 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight leading-tight">
              {perk.name}
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${isSurvivor
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
                <span>{isGeneral ? 'General Perk' : perk.character}</span>
                {showRealName && (
                  <span className="text-[11px] text-slate-400 font-normal">
                    ({perk.character_real_name})
                  </span>
                )}
              </div>

              {perk.alternate_name && (
                <div className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300 border border-amber-500/30">
                  <Repeat className="h-3 w-3 text-amber-400" />
                  <span>Alias: {perk.alternate_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-800/80 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
              Perk Description
            </h4>
            <button
              onClick={handleCopySlug}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">{dict?.modal?.slugCopied || 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{dict?.modal?.copySlug || 'Copy Identifier'}</span>
                </>
              )}
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto pr-2 text-xs sm:text-sm leading-relaxed font-normal scrollbar-thin">
            {renderFormattedDescription(perk.description)}
          </div>
        </div>
      </div>
    </div>
  );
};