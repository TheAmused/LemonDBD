// frontend/src/utils/smashPersona.ts

import type { EntityItem } from '@/types/smashOrPass';

export interface VoteRecord {
  character: EntityItem;
  vote: 'smash' | 'pass' | 'super_smash';
  timestamp: number;
}

export interface PersonaArchetypeEntry {
  title?: string;
  subtitle?: string;
  desc?: string;
}

export interface SharedArchetypePayload {
  k: string; // archetype key (e.g. 'redStainAddict')
  r: number; // smashRate (0-100)
  s: number; // survivorAffinity (0-100)
  ka: number; // killerAffinity (0-100)
  v: number; // totalVotes
  fn?: string; // favoriteChar name
  fs?: string; // favoriteChar slug
  fr?: string; // favoriteChar role
  fm?: string; // favoriteChar media_url
}

export interface ArchetypeVisualConfig {
  archKey: string;
  badgeColor: string;
  borderColor: string;
  glowColor: string;
  iconName: 'compass' | 'skull' | 'flame' | 'shield' | 'heart' | 'zap' | 'sparkles';
}

export interface RomancePersonaResult {
  archKey: string;
  title: string;
  subtitle: string;
  description: string;
  badgeColor: string;
  borderColor: string;
  glowColor: string;
  iconName: ArchetypeVisualConfig['iconName'];
  killerAffinity: number;
  survivorAffinity: number;
  smashRate: number;
  totalVotes: number;
  favoriteChar: {
    name: string;
    slug?: string;
    role?: string;
    media_url?: string | null;
  } | null;
  isShared?: boolean;
}

export const ARCHETYPE_VISUALS: Record<string, ArchetypeVisualConfig> = {
  untappedSoul: {
    archKey: 'untappedSoul',
    badgeColor: 'from-bg-elevated via-bg-surface to-bg-primary',
    borderColor: 'border-border-color',
    glowColor: 'rgba(0, 0, 0, 0)',
    iconName: 'compass',
  },
  eldritchDevotee: {
    archKey: 'eldritchDevotee',
    badgeColor: 'from-accent-red via-accent-red-hover to-bg-primary',
    borderColor: 'border-accent-red/60',
    glowColor: 'rgba(220, 38, 38, 0.3)',
    iconName: 'skull',
  },
  redStainAddict: {
    archKey: 'redStainAddict',
    badgeColor: 'from-accent-red via-accent-red-hover to-bg-primary',
    borderColor: 'border-accent-red/60',
    glowColor: 'rgba(220, 38, 38, 0.35)',
    iconName: 'flame',
  },
  campfireSoulmate: {
    archKey: 'campfireSoulmate',
    badgeColor: 'from-accent-green via-accent-green-hover to-bg-primary',
    borderColor: 'border-accent-green/60',
    glowColor: 'rgba(22, 163, 74, 0.35)',
    iconName: 'shield',
  },
  entitysParamour: {
    archKey: 'entitysParamour',
    badgeColor: 'from-accent-red via-accent-red-hover to-bg-primary',
    borderColor: 'border-accent-red/60',
    glowColor: 'rgba(220, 38, 38, 0.35)',
    iconName: 'heart',
  },
  coldHeartedPragmatist: {
    archKey: 'coldHeartedPragmatist',
    badgeColor: 'from-bg-surface via-bg-elevated to-bg-primary',
    borderColor: 'border-border-color',
    glowColor: 'rgba(0, 0, 0, 0)',
    iconName: 'zap',
  },
  fogRomantic: {
    archKey: 'fogRomantic',
    badgeColor: 'from-accent-red via-accent-red-hover to-bg-primary',
    borderColor: 'border-accent-red/60',
    glowColor: 'rgba(220, 38, 38, 0.35)',
    iconName: 'sparkles',
  },
};

/**
 * Calculates Romance Persona archetype, affinity percentages, and telemetry from a votes array.
 */
export function calculateRomancePersona(
  votes: VoteRecord[],
  rawArchetypes: Record<string, PersonaArchetypeEntry> = {}
): RomancePersonaResult {
  if (!votes || votes.length === 0) {
    const untapped = rawArchetypes.untappedSoul || {};
    const visual = ARCHETYPE_VISUALS.untappedSoul;
    return {
      archKey: 'untappedSoul',
      title: untapped.title || 'The Untapped Soul',
      subtitle: untapped.subtitle || 'Your trial desires remain veiled in the Fog.',
      description:
        untapped.desc ||
        'Evaluate candidates to unlock your psychological profile, dating analysis, and affinity balance.',
      badgeColor: visual.badgeColor,
      borderColor: visual.borderColor,
      glowColor: visual.glowColor,
      iconName: visual.iconName,
      killerAffinity: 0,
      survivorAffinity: 0,
      smashRate: 0,
      totalVotes: 0,
      favoriteChar: null,
      isShared: false,
    };
  }

  const smashes = votes.filter((v) => v.vote === 'smash' || v.vote === 'super_smash');
  const total = votes.length;
  const smashRate = Math.round((smashes.length / total) * 100);

  const smashedKillers = smashes.filter((v) => v.character?.role === 'Killer').length;
  const smashedSurvivors = smashes.filter((v) => v.character?.role === 'Survivor').length;
  const smashedMonsters = smashes.filter((v) => v.character?.gender === 'monster_other').length;

  const totalSmashedRoles = smashedKillers + smashedSurvivors;
  const killerAffinity =
    totalSmashedRoles > 0 ? Math.round((smashedKillers / totalSmashedRoles) * 100) : 50;
  const survivorAffinity = 100 - killerAffinity;

  let archKey = 'fogRomantic';
  if (smashedMonsters >= 2) {
    archKey = 'eldritchDevotee';
  } else if (total >= 4 && smashRate <= 20) {
    archKey = 'coldHeartedPragmatist';
  } else if (totalSmashedRoles >= 2 && killerAffinity >= 75) {
    archKey = 'redStainAddict';
  } else if (totalSmashedRoles >= 2 && survivorAffinity >= 75) {
    archKey = 'campfireSoulmate';
  } else if (smashRate >= 85) {
    archKey = 'entitysParamour';
  } else if (smashRate <= 20) {
    archKey = 'coldHeartedPragmatist';
  }

  const visual = ARCHETYPE_VISUALS[archKey] || ARCHETYPE_VISUALS.fogRomantic;
  const arch = rawArchetypes[archKey] || {};

  const fav = smashes[0]?.character;
  const favoriteChar = fav
    ? {
        name: fav.name,
        slug: fav.slug,
        role: fav.role,
        media_url: fav.media_url,
      }
    : null;

  return {
    archKey,
    title: arch.title || 'The Fog Romantic',
    subtitle: arch.subtitle || 'A balanced soul seeking passion and adrenaline across the trials.',
    description:
      arch.desc ||
      'You believe that even within the infinite trials of the Entity, a true spark of romance can always be found.',
    badgeColor: visual.badgeColor,
    borderColor: visual.borderColor,
    glowColor: visual.glowColor,
    iconName: visual.iconName,
    killerAffinity,
    survivorAffinity,
    smashRate,
    totalVotes: total,
    favoriteChar,
    isShared: false,
  };
}

/**
 * Reconstructs a RomancePersonaResult from a decoded shared payload.
 */
export function reconstructSharedPersona(
  payload: SharedArchetypePayload,
  rawArchetypes: Record<string, PersonaArchetypeEntry> = {}
): RomancePersonaResult {
  const visual = ARCHETYPE_VISUALS[payload.k] || ARCHETYPE_VISUALS.fogRomantic;
  const arch = rawArchetypes[payload.k] || {};

  return {
    archKey: payload.k,
    title: arch.title || 'The Fog Romantic',
    subtitle: arch.subtitle || 'A balanced soul seeking passion and adrenaline across the trials.',
    description:
      arch.desc ||
      'You believe that even within the infinite trials of the Entity, a true spark of romance can always be found.',
    badgeColor: visual.badgeColor,
    borderColor: visual.borderColor,
    glowColor: visual.glowColor,
    iconName: visual.iconName,
    killerAffinity: payload.ka,
    survivorAffinity: payload.s,
    smashRate: payload.r,
    totalVotes: payload.v,
    favoriteChar: payload.fn
      ? {
          name: payload.fn,
          slug: payload.fs,
          role: payload.fr,
          media_url: payload.fm,
        }
      : null,
    isShared: true,
  };
}

/**
 * Serializes an archetype into a compact URL-safe base64 string.
 */
export function encodeArchetypeShare(payload: SharedArchetypePayload): string {
  try {
    const jsonStr = JSON.stringify(payload);
    if (typeof btoa !== 'undefined') {
      return encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
    } else if (typeof Buffer !== 'undefined') {
      return encodeURIComponent(Buffer.from(jsonStr, 'utf-8').toString('base64'));
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Deserializes and validates an archetype share payload from a URL-safe string.
 */
export function decodeArchetypeShare(encoded: string): SharedArchetypePayload | null {
  if (!encoded || typeof encoded !== 'string') return null;
  try {
    const clean = decodeURIComponent(encoded);
    let jsonStr = '';
    if (typeof atob !== 'undefined') {
      jsonStr = decodeURIComponent(escape(atob(clean)));
    } else if (typeof Buffer !== 'undefined') {
      jsonStr = Buffer.from(clean, 'base64').toString('utf-8');
    }
    if (!jsonStr) return null;
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.k !== 'string') return null;

    const k = parsed.k in ARCHETYPE_VISUALS ? parsed.k : 'fogRomantic';
    const r = Number.isFinite(parsed.r) ? Math.min(100, Math.max(0, Math.round(parsed.r))) : 50;
    const s = Number.isFinite(parsed.s) ? Math.min(100, Math.max(0, Math.round(parsed.s))) : 50;
    const ka = Number.isFinite(parsed.ka) ? Math.min(100, Math.max(0, Math.round(parsed.ka))) : 50;
    const v = Number.isFinite(parsed.v) ? Math.max(1, Math.round(parsed.v)) : 1;

    return {
      k,
      r,
      s,
      ka,
      v,
      fn: parsed.fn ? String(parsed.fn).slice(0, 100) : undefined,
      fs: parsed.fs ? String(parsed.fs).slice(0, 100) : undefined,
      fr: parsed.fr === 'Killer' || parsed.fr === 'Survivor' ? parsed.fr : undefined,
      fm: parsed.fm ? String(parsed.fm).slice(0, 255) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Builds the full shareable URL containing the encoded archetype deep-link parameter.
 */
export function buildArchetypeShareUrl(baseHref: string, payload: SharedArchetypePayload): string {
  try {
    const url = new URL(baseHref);
    url.searchParams.set('shared_archetype', encodeArchetypeShare(payload));
    return url.toString();
  } catch {
    return baseHref;
  }
}

/**
 * Robust clipboard copy with fallback to document.execCommand('copy').
 */
export async function copyTextWithFallback(text: string): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, trying execCommand fallback:', err);
    }
  }

  // Fallback to hidden textarea with document.execCommand('copy')
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return Boolean(successful);
    } catch (err) {
      console.error('execCommand copy fallback failed:', err);
      return false;
    }
  }

  return false;
}
