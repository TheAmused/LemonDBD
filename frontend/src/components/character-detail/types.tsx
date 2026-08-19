// frontend/src/components/character-detail/types.tsx
﻿﻿import React from 'react';

export interface CharacterItem {
  id?: number;
  name: string;
  category: string;
  role?: string;
  real_name?: string;
  code_prefix?: string;
  avatar_url?: string;
  avatar_local_path?: string;
  portrait_url?: string;
  release_number?: number;
  wiki_slug?: string;
  short_name?: string;
  chapter_name?: string;
  chapter_number?: string;
  dlc_type?: string;
  is_licensed?: boolean;
  release_year?: number;
  release_date?: string;
  dlc_counterparts?: string[];
  lore?: string;
}

export function getCharacterSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\-/]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export interface PerkItem {
  id?: number;
  name: string;
  category: string;
  character: string;
  character_real_name?: string;
  character_avatar_path?: string;
  character_id?: number | null;
  description: string;
  icon_url?: string;
  icon_local_path?: string;
  is_teachable?: boolean;
}

export interface AddonItem {
  id?: number;
  name: string;
  associated_target?: string;
  category?: string;
  description?: string;
  icon_url?: string;
  icon_local_path?: string;
  rarity?: string;
}

export interface EquipmentItem {
  id?: number;
  name: string;
  category: string;
  role?: string;
  description?: string;
  icon_url?: string;
  icon_local_path?: string;
  rarity?: string;
  associated_target?: string;
}

export interface KillerPowerInfo {
  name: string;
  description: string;
  icon_url?: string;
  icon_local_path?: string;
  movement_speed?: string;
  terror_radius?: string;
  terror_radius_meters?: number;
  height?: string;
}

export interface CharacterDetailPayload {
  character: CharacterItem;
  power?: KillerPowerInfo | null;
  perks: PerkItem[];
  addons: (AddonItem | EquipmentItem)[];
  items?: EquipmentItem[];
}

export interface CharacterViewBaseProps {
  currentLocale: string;
  dict: any;
  detailData: CharacterDetailPayload;
  allCharacters?: CharacterItem[];
}

export const getAssetUrl = (backendBase: string, path?: string, url?: string) => {
  if (path) {
    const cleanPath = path.replace(/^\/?(static\/)?/, '');
    return `${backendBase}/static/${cleanPath}`;
  }
  return url || '';
};

export const getAvatarUrl = (backendBase: string, char: CharacterItem, isSurvivor: boolean) => {
  let rawPath = char.avatar_local_path;
  if (!rawPath && char.name) {
    const subDir = isSurvivor ? 'survivors' : 'killers';
    const sanitized = getCharacterSlug(char.name);
    rawPath = `avatars/${subDir}/${sanitized}.png`;
  }
  if (rawPath) {
    const cleanPath = rawPath.replace(/^\/?(static\/)?/, '');
    return `${backendBase}/static/${cleanPath}`;
  }
  return char.avatar_url || char.portrait_url || '';
};

export const getRarityTileStyle = (rarity?: string) => {
  const r = (rarity || '').toLowerCase();
  if (r.includes('ultra') || r.includes('iridescent')) {
    return {
      bg: 'bg-gradient-to-br from-[#c9245e] via-[#85123d] to-[#45051e] border-[#f24483] shadow-[0_0_16px_rgba(242,68,131,0.5)]',
      badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
      text: 'text-pink-400',
    };
  }
  if (r.includes('very rare') || r.includes('purple')) {
    return {
      bg: 'bg-gradient-to-br from-[#7e2ba3] via-[#52176e] to-[#2b083b] border-[#ad43e3] shadow-[0_0_14px_rgba(173,67,227,0.45)]',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      text: 'text-purple-400',
    };
  }
  if (r.includes('rare') || r.includes('green')) {
    return {
      bg: 'bg-gradient-to-br from-[#277a3c] via-[#1a5328] to-[#0c2a13] border-[#38b259] shadow-[0_0_12px_rgba(56,178,89,0.4)]',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      text: 'text-emerald-400',
    };
  }
  if (r.includes('uncommon') || r.includes('yellow')) {
    return {
      bg: 'bg-gradient-to-br from-[#c99a2c] via-[#8c6b16] to-[#453406] border-[#f0bb33] shadow-[0_0_12px_rgba(240,187,51,0.4)]',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      text: 'text-amber-400',
    };
  }
  if (r.includes('common') || r.includes('brown')) {
    return {
      bg: 'bg-gradient-to-br from-[#5c4033] via-[#432d24] to-[#251710] border-[#8b5a3e] shadow-[0_0_12px_rgba(139,90,62,0.35)]',
      badge: 'bg-amber-800/30 text-amber-200 border-amber-700/40',
      text: 'text-amber-300',
    };
  }
  if (r.includes('event')) {
    return {
      bg: 'bg-gradient-to-br from-[#d97706] via-[#92400e] to-[#451a03] border-[#f59e0b] shadow-[0_0_14px_rgba(245,158,11,0.45)]',
      badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      text: 'text-orange-400',
    };
  }
  return {
    bg: 'bg-slate-900 border-slate-700 shadow-md',
    badge: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
    text: 'text-slate-400',
  };
};

// ─── DBD Keyword & Value Highlighter ─────────────────────────────────────────
// Matches the same set as PerkModal, plus addon-specific terms

const DBD_KEYWORDS = [
  // Action verbs
  'Increases', 'Increase', 'Decreases', 'Decrease',
  'Grants', 'Grant', 'Reveals', 'Reveal',
  'Causes', 'Cause', 'Unlocks', 'Unlock',
  'Applies', 'Apply', 'Activates', 'Activate',
  'Affects', 'Affect', 'Extends', 'Extend',
  'Reduces', 'Reduce', 'Blocks', 'Block',
  // Adverbs
  'Tremendously', 'Considerably', 'Moderately', 'Slightly',
  // Perk types
  'Hex:', 'Hex', 'Boon:', 'Boon', 'Scourge Hook:', 'Scourge Hook',
  // Status effects
  'Obsession', 'Exhausted', 'Exhaustion', 'Exposed',
  'Haste', 'Hindered', 'Blindness', 'Broken',
  'Oblivious', 'Undetectable', 'Incapacitated',
  'Mangled', 'Hemorrhage', 'Deep Wound', 'Cursed',
  'Endurance', 'Bloodlust', 'Torment',
  // Game mechanics
  'Terror Radius', 'Killer Instinct',
  'Aura Reading', 'Auras', 'Aura',
  'Skill Checks', 'Skill Check',
  'Great Skill Check', 'Good Skill Check',
  'Bear Trap', 'Bear Traps',
  'Dying State', 'Injured State', 'Healthy State',
  'Hooks', 'Hook', 'Generators', 'Generator',
  'Pallets', 'Pallet', 'Windows', 'Window',
  'Chests', 'Chest', 'Totems', 'Totem',
  'Bloodweb', 'Trial', 'Entity',
  // Status Effect (title-cased in game)
  'Status Effect', 'Haste Status Effect',
  'Blinded', 'Hindered', 'Marked',
  // Survivor items
  'Med-Kit', 'Medkit', 'Toolbox', 'Flashlight',
  'First Aid', 'Styptic', 'Serum', 'Bandage',
  // Power descriptors  
  'Special Ability', 'Special Attack',
  'Lunge', 'Lullaby',
];

const TOKEN_REGEX = (() => {
  const kw = DBD_KEYWORDS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(
    `(\\b(?:${kw})\\b|` +
    `\\+?\\-?\\d+(?:\\.\\d+)?(?:\\s*\\/\\s*\\d+(?:\\.\\d+)?)+(?:\\s*%)?|` +
    `\\+\\d+(?:\\.\\d+)?\\s*(?:metres?|meters?|m\\b|%|seconds?|s\\b|tokens?|charges?)|` +
    `\\b\\d+(?:\\.\\d+)?\\s*%|` +
    `\\b\\d+(?:\\.\\d+)?\\s*(?:metres?|meters?|seconds?|tokens?)\\b)`,
    'gi'
  );
})();

function parseLineTokens(text: string, lineKey: number | string): React.ReactNode {
  const parts = text.split(TOKEN_REGEX);
  return (
    <>
      {parts.map((part, idx) => {
        if (!part) return null;
        const trimmed = part.trim();

        // Number/value token
        const isValue =
          /^\+?\-?\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)+(?:\s*%)?$/.test(trimmed) ||
          /^\+\d+(?:\.\d+)?\s*(?:metres?|meters?|m|%|seconds?|s|tokens?|charges?)$/i.test(trimmed) ||
          /^\d+(?:\.\d+)?\s*%$/.test(trimmed) ||
          /^\d+(?:\.\d+)?\s*(?:metres?|meters?|seconds?|tokens?)$/i.test(trimmed);

        const isKeyword = DBD_KEYWORDS.some((k) => k.toLowerCase() === trimmed.toLowerCase());

        if (isKeyword || isValue) {
          return (
            <strong key={`${lineKey}-${idx}`} className="font-black text-amber-400 dark:text-amber-300">
              {part}
            </strong>
          );
        }
        return <span key={`${lineKey}-${idx}`}>{part}</span>;
      })}
    </>
  );
}

export function renderFormattedDbdText(
  rawText: string,
  isCompact: boolean = false
): React.ReactNode {
  if (!rawText) return null;

  // 1. Clean markdown asterisks and quote artifacts
  const cleaned = rawText
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\*""|\*"/g, '"')
    .replace(/""\*|"\*/g, '"')
    .replace(/\*\*(.*?)\*\*/g, '$1')   // strip **bold** markers (handled by keyword highlighter)
    .replace(/(?<=\S)\*(?=\s|$|[.,;:!?)])/g, '')
    .replace(/\*(?=[a-zA-Z0-9+%-])/g, '')
    .replace(/(?<=[a-zA-Z0-9+%-])\*/g, '')
    .replace(/\s+\./g, '.')
    .replace(/\s+,/g, ',')
    .trim();

  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    // Quote detection (lore quotes / dev quotes)
    const stripped = line.replace(/^[\*\s_]+/, '').replace(/[\*\s_]+$/, '');
    const isQuote =
      (stripped.startsWith('"') && stripped.endsWith('"')) ||
      (stripped.startsWith('\u201c') && stripped.endsWith('\u201d')) ||
      (stripped.startsWith('"') && stripped.includes('" -')) ||
      (stripped.startsWith('\u201c') && stripped.includes('\u201d -')) ||
      /^["\u201c].+["\u201d](\s*[-\u2013\u2014].+)?$/.test(stripped);

    if (isQuote) {
      elements.push(
        <div
          key={`q-${lineIdx}`}
          className={`rounded-xl border-l-2 border-amber-500/80 bg-slate-900/60 dark:bg-slate-950/80 px-3 py-2 italic text-slate-300 dark:text-slate-400 font-serif shadow-inner ${
            isCompact ? 'my-1.5 text-[10px]' : 'my-3 text-xs sm:text-sm'
          }`}
        >
          {stripped}
        </div>
      );
      return;
    }

    // Event notice banner
    if (/^THIS (ITEM|UNLOCKABLE) CAN NO LONGER BE OBTAINED/i.test(line) && !isCompact) {
      elements.push(
        <div
          key={`ev-${lineIdx}`}
          className="p-2.5 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] font-semibold text-amber-300 flex items-start gap-2"
        >
          <span className="shrink-0 font-bold uppercase tracking-wider text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-400">
            Notice
          </span>
          <span className="leading-snug">{line}</span>
        </div>
      );
      return;
    }

    // Bullet list items
    const isBullet =
      line.startsWith('•') ||
      line.startsWith('* ') ||
      line.startsWith('- ') ||
      /^\*\s+[A-Za-z]/.test(line);

    if (isBullet) {
      const content = line.replace(/^[•\*\-]\s*/, '');
      elements.push(
        <li
          key={`li-${lineIdx}`}
          className={`ml-5 list-disc leading-relaxed text-slate-300 dark:text-slate-300 marker:text-amber-400 ${
            isCompact ? 'my-0.5 text-xs' : 'my-1.5 text-xs sm:text-sm'
          }`}
        >
          {parseLineTokens(content, lineIdx)}
        </li>
      );
      return;
    }

    // Normal paragraph
    elements.push(
      <p
        key={`p-${lineIdx}`}
        className={`leading-relaxed text-slate-300 dark:text-slate-300 ${
          isCompact ? 'mb-1 text-xs' : 'mb-2.5 text-xs sm:text-sm'
        }`}
      >
        {parseLineTokens(line, lineIdx)}
      </p>
    );
  });

  return <>{elements}</>;
}
