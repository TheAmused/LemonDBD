'use client';

import React, { useState, useMemo } from 'react';
import { Shield, Skull, ImageOff, Repeat, Lock } from 'lucide-react';

export interface Perk {
  id?: number;
  name: string;
  alternate_name?: string;
  is_generic_counterpart?: boolean;
  character: string;
  character_real_name?: string;
  character_avatar_path?: string;
  category: string;
  description: string;
  icon_url: string;
  icon_local_path: string;
  is_owned?: boolean;
  is_unlocked?: boolean;
}

interface PerkCardProps {
  perk: Perk;
  viewMode?: 'grid' | 'list';
  onSelect: (perk: Perk) => void;
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

export const PerkCard: React.FC<PerkCardProps> = ({ perk, onSelect, dict }) => {
  const [imgError, setImgError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const cleanIconPath = (perk.icon_local_path || '').replace(/^\/?(static\/)?/, '');
  const iconSrc = cleanIconPath ? `${backendBase}/static/${cleanIconPath}` : perk.icon_url;

  const isGeneral = !perk.character || perk.character === 'General' || perk.is_generic_counterpart;
  const isOwned = perk.is_owned !== false;
  const isSurvivor = perk.category === 'Survivor';

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

  const tokenRegex = useMemo(() => {
    if (!perk?.description) return null;
    const escapedPerkName = (perk.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  const parseLineTokens = (text: string, lineKey: number | string) => {
    if (!tokenRegex) return text;
    const parts = text.split(tokenRegex);

    return parts.map((part, idx) => {
      if (!part) return null;
      const trimmed = part.trim();

      if (trimmed.toLowerCase() === perk.name.toLowerCase()) {
        return (
          <em key={`${lineKey}-${idx}`} className="italic font-bold text-white">
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
          <strong key={`${lineKey}-${idx}`} className="font-black text-amber-400">
            {part}
          </strong>
        );
      }

      return <span key={`${lineKey}-${idx}`}>{part}</span>;
    });
  };

  const renderTooltipDescription = (rawText: string) => {
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
        strippedForQuote.includes('"-') ||
        strippedForQuote.includes('”-');

      if (isQuote) {
        return (
          <div
            key={lineIdx}
            className="my-2 rounded-lg bg-slate-900/90 p-2 text-xs italic text-slate-300 font-serif shadow-inner"
          >
            {strippedForQuote}
          </div>
        );
      }

      const isBullet = line.startsWith('•') || line.startsWith('* ') || line.startsWith('- ');
      const contentText = isBullet ? line.replace(/^[•\*\-]\s*/, '') : line;
      const parsedElements = parseLineTokens(contentText, lineIdx);

      if (isBullet) {
        return (
          <li key={lineIdx} className="ml-4 list-disc my-1 text-xs leading-relaxed text-slate-200 marker:text-amber-400">
            {parsedElements}
          </li>
        );
      }

      return (
        <p key={lineIdx} className="mb-1.5 text-xs leading-relaxed text-slate-200">
          {parsedElements}
        </p>
      );
    });
  };

  return (
    <div className="relative group flex items-center justify-center p-2 sm:p-3 w-full">
      <div
        onClick={() => onSelect(perk)}
        className={`relative flex h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 lg:h-44 lg:w-44 xl:h-48 xl:w-48 cursor-pointer items-center justify-center transition-transform duration-200 group-hover:scale-105 active:scale-95 ${!isOwned ? 'opacity-40 grayscale' : ''
          }`}
      >
        {/* Perk Diamond Icon */}
        {!imgError ? (
          <img
            src={iconSrc}
            alt={perk.name}
            onError={() => setImgError(true)}
            className="h-full w-full object-contain filter drop-shadow-[0_6px_14px_rgba(0,0,0,0.85)] group-hover:drop-shadow-[0_0_18px_rgba(6,182,212,0.6)] transition-all duration-200 pointer-events-none"
          />
        ) : (
          <div className="flex h-3/4 w-3/4 rotate-45 items-center justify-center rounded-xl bg-slate-900">
            <ImageOff className="-rotate-45 h-10 w-10 text-slate-500" />
          </div>
        )}

        {/* Character Avatar (Scaled Up) */}
        {avatarSrc && !avatarError && !isGeneral && (
          <div className="absolute bottom-0 right-0 h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12 lg:h-13 lg:w-13 overflow-hidden rounded-full pointer-events-none bg-slate-950/80 shadow-lg">
            <img
              src={avatarSrc}
              alt={perk.character}
              onError={() => setAvatarError(true)}
              className="h-full w-full object-cover object-top"
            />
          </div>
        )}

        {/* Locked Overlay Badge */}
        {!isOwned && (
          <div className="absolute top-1 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/90 shadow-md">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
          </div>
        )}
      </div>

      {/* Hover Tooltip */}
      <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-50 hidden group-hover:flex flex-col w-80 max-w-[90vw] rounded-2xl bg-[#0a0f18]/98 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
        <div className="flex items-start justify-between gap-2 pb-2.5 mb-2.5">
          <div>
            <h4 className="text-sm font-black text-amber-400 tracking-tight leading-tight">
              {perk.name}
            </h4>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
              {isGeneral ? 'General Perk' : perk.character}
              {perk.character_real_name && perk.character_real_name !== perk.character && (
                <span className="text-[10px] font-normal text-slate-500 ml-1">
                  ({perk.character_real_name})
                </span>
              )}
            </p>
          </div>

          <span
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 ${isSurvivor
                ? 'bg-emerald-950/90 text-emerald-400'
                : 'bg-rose-950/90 text-rose-400'
              }`}
          >
            {isSurvivor ? <Shield className="h-2.5 w-2.5" /> : <Skull className="h-2.5 w-2.5" />}
            {perk.category}
          </span>
        </div>

        <div className="max-h-60 overflow-y-auto text-xs text-slate-200 scrollbar-none pr-1 space-y-1">
          {renderTooltipDescription(perk.description)}
        </div>

        {perk.alternate_name && (
          <div className="mt-2.5 pt-2 flex items-center gap-1.5 text-[10px] text-amber-400 font-bold">
            <Repeat className="h-3 w-3 shrink-0" />
            <span>Alias: {perk.alternate_name}</span>
          </div>
        )}
      </div>
    </div>
  );
};