import React from 'react';

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

export function renderFormattedDbdText(
  rawText: string,
  isCompact: boolean = false
): React.ReactNode {
  if (!rawText) return null;

  // 1. Clean quote syntax and duplicate spaces
  let cleaned = rawText
    .replace(/\*""/g, '"')
    .replace(/""\*/g, '"')
    .replace(/\*"/g, '"')
    .replace(/"\*/g, '"')
    .replace(/\s+\./g, '.')
    .replace(/\s+,/g, ',')
    .trim();

  // 2. Extract Event Notice if present
  let eventNotice: string | null = null;
  const eventNoticeMatch = cleaned.match(
    /^(THIS ITEM CAN NO LONGER BE OBTAINED[^(]*\([^)]*\)|THIS UNLOCKABLE CAN NO LONGER BE OBTAINED[^(]*\([^)]*\))/i
  );
  if (eventNoticeMatch) {
    eventNotice = eventNoticeMatch[0].trim();
    cleaned = cleaned.slice(eventNoticeMatch[0].length).trim();
  }

  // 3. Extract Lore Quote if present
  let quoteText: string | null = null;
  const quoteMatch = cleaned.match(
    /(?:“|"|\*")(.*?)(?:”|"|"\*)\s*(?:—|–|-)\s*([^.\n]+(?:\.|$))/
  );
  if (quoteMatch) {
    quoteText = `${quoteMatch[1].trim()} — ${quoteMatch[2].trim()}`;
    cleaned = cleaned.replace(quoteMatch[0], '').trim();
  } else {
    const standaloneQuote =
      cleaned.match(/^"([^"]+)"$/m) || cleaned.match(/"([^"]{15,})"$/);
    if (standaloneQuote) {
      quoteText = standaloneQuote[1].trim();
      cleaned = cleaned.replace(standaloneQuote[0], '').trim();
    }
  }

  // 4. Inline formatting parser
  const parseInline = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong
            key={pIdx}
            className="font-black text-amber-400 dark:text-amber-300"
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={pIdx} className="italic text-slate-300 dark:text-slate-200">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  // 5. Build elements
  const elements: React.ReactNode[] = [];

  if (eventNotice && !isCompact) {
    elements.push(
      <div
        key="event-notice"
        className="p-2.5 mb-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] font-semibold text-amber-300 flex items-start gap-2"
      >
        <span className="shrink-0 font-bold uppercase tracking-wider text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-400">
          Notice
        </span>
        <span className="leading-snug">{eventNotice}</span>
      </div>
    );
  }

  const rawLines = cleaned.split(/\n+/);

  rawLines.forEach((line, lIdx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (
      trimmed.startsWith('* ') ||
      trimmed.startsWith('- ') ||
      trimmed.startsWith('• ')
    ) {
      const content = trimmed.replace(/^[\*\-•]\s*/, '');
      elements.push(
        <li
          key={`li-${lIdx}`}
          className={`list-disc ml-4 text-slate-300 leading-relaxed ${
            isCompact ? 'my-0.5 text-xs' : 'my-1 text-sm'
          }`}
        >
          {parseInline(content)}
        </li>
      );
    } else {
      elements.push(
        <p
          key={`p-${lIdx}`}
          className={`text-slate-200 dark:text-slate-200 leading-relaxed ${
            isCompact ? 'mb-1 text-xs' : 'mb-2 text-sm'
          }`}
        >
          {parseInline(trimmed)}
        </p>
      );
    }
  });

  if (quoteText) {
    elements.push(
      <blockquote
        key="lore-quote"
        className={`border-l-2 border-amber-500/50 pl-3 py-1 font-serif italic text-slate-400 dark:text-slate-400 bg-amber-500/5 rounded-r-lg ${
          isCompact ? 'text-[10px] mt-1' : 'text-xs mt-3'
        }`}
      >
        &ldquo;{quoteText}&rdquo;
      </blockquote>
    );
  }

  return <>{elements}</>;
}

