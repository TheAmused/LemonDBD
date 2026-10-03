// frontend/src/utils/smashPersona.ts

import type { EntityItem, CustomRomanceArchetype, ArchetypeRule } from '@/types/smashOrPass';
import { isKiller, isSurvivor } from '@/utils/characterUtils';

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
  iconName: ArchetypeVisualConfig['iconName'] | string;
  iconUrl?: string;
  badgeImageUrl?: string;
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
  totalSmashes?: number;
  smashedSurvivors?: number;
  smashedKillers?: number;
  evaluatedSurvivors?: number;
  evaluatedKillers?: number;
}

const ARCHETYPE_VISUALS: Record<string, ArchetypeVisualConfig> = {
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
  rawArchetypes: Record<string, PersonaArchetypeEntry> = {},
  customArchetypes?: CustomRomanceArchetype[]
): RomancePersonaResult {
  // If custom archetypes are supplied by a custom roster, evaluate dynamically
  if (customArchetypes && customArchetypes.length > 0) {
    const smashes = (votes || []).filter((v) => v.vote === 'smash' || v.vote === 'super_smash');
    const total = (votes || []).length;
    const smashRate = total > 0 ? Math.round((smashes.length / total) * 100) : 0;

    const fallbackArch = customArchetypes.find((a) => a.is_fallback) || customArchetypes[customArchetypes.length - 1];

    if (!votes || votes.length === 0) {
      return {
        archKey: fallbackArch.id,
        title: fallbackArch.title,
        subtitle: fallbackArch.subtitle,
        description: fallbackArch.description,
        badgeColor: fallbackArch.badge_color || 'from-bg-elevated via-bg-surface to-bg-primary',
        borderColor: 'border-border-color',
        glowColor: 'rgba(0, 0, 0, 0)',
        iconName: fallbackArch.icon_name || 'compass',
        iconUrl: fallbackArch.icon_url,
        badgeImageUrl: fallbackArch.badge_image_url,
        killerAffinity: 0,
        survivorAffinity: 0,
        smashRate: 0,
        totalVotes: 0,
        favoriteChar: null,
        isShared: false,
        totalSmashes: 0,
      };
    }

    // Maps for case-insensitive counting of custom roles and genders
    const roleCountMap = new Map<string, number>();
    const genderCountMap = new Map<string, number>();

    for (const s of smashes) {
      const r = (s.character?.role || '').trim().toLowerCase();
      if (r) roleCountMap.set(r, (roleCountMap.get(r) || 0) + 1);

      const g = (s.character?.gender || '').trim().toLowerCase();
      if (g) genderCountMap.set(g, (genderCountMap.get(g) || 0) + 1);
    }

    const getRoleCount = (targetRole: string) => {
      return roleCountMap.get(targetRole.trim().toLowerCase()) || 0;
    };

    const getGenderCount = (targetGender: string) => {
      return genderCountMap.get(targetGender.trim().toLowerCase()) || 0;
    };

    const getRoleAffinity = (targetRole: string) => {
      if (smashes.length === 0) return 0;
      return Math.round((getRoleCount(targetRole) / smashes.length) * 100);
    };

    const getGenderAffinity = (targetGender: string) => {
      if (smashes.length === 0) return 0;
      return Math.round((getGenderCount(targetGender) / smashes.length) * 100);
    };

    const evaluateRule = (rule: ArchetypeRule): boolean => {
      let actualValue = 0;
      const targetVal = rule.target_value || '';
      switch (rule.target) {
        case 'smash_rate':
          actualValue = smashRate;
          break;
        case 'total_votes':
          actualValue = total;
          break;
        case 'role_affinity':
          actualValue = getRoleAffinity(targetVal);
          break;
        case 'gender_affinity':
          actualValue = getGenderAffinity(targetVal);
          break;
        case 'role_count':
          actualValue = getRoleCount(targetVal);
          break;
        case 'gender_count':
          actualValue = getGenderCount(targetVal);
          break;
        default:
          return false;
      }

      switch (rule.operator) {
        case '>=':
          return actualValue >= rule.value;
        case '<=':
          return actualValue <= rule.value;
        case '==':
          return actualValue === rule.value;
        case '>':
          return actualValue > rule.value;
        default:
          return actualValue >= rule.value;
      }
    };

    // First matching archetype with rules
    const matched = customArchetypes.find((arch) => {
      if (!arch.rules || arch.rules.length === 0) return false;
      return arch.rules.every(evaluateRule);
    });

    const chosenArch = matched || fallbackArch;
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
      archKey: chosenArch.id,
      title: chosenArch.title,
      subtitle: chosenArch.subtitle,
      description: chosenArch.description,
      badgeColor: chosenArch.badge_color || 'from-accent-purple to-accent-indigo-deep',
      borderColor: 'border-accent-red/60',
      glowColor: 'rgba(220, 38, 38, 0.35)',
      iconName: chosenArch.icon_name || 'sparkles',
      iconUrl: chosenArch.icon_url,
      badgeImageUrl: chosenArch.badge_image_url,
      killerAffinity: getRoleAffinity('Killer'),
      survivorAffinity: getRoleAffinity('Survivor'),
      smashRate,
      totalVotes: total,
      favoriteChar,
      isShared: false,
      totalSmashes: smashes.length,
    };
  }

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

  const evaluatedKillers = votes.filter((v) => isKiller(v.character?.role)).length;
  const evaluatedSurvivors = votes.filter((v) => isSurvivor(v.character?.role)).length;

  const smashedKillers = smashes.filter((v) => isKiller(v.character?.role)).length;
  const smashedSurvivors = smashes.filter((v) => isSurvivor(v.character?.role)).length;
  const smashedMonsters = smashes.filter((v) => v.character?.gender === 'monster_other').length;

  let survivorAffinity = 0;
  let killerAffinity = 0;

  if (smashes.length > 0) {
    if (evaluatedSurvivors > 0 && evaluatedKillers > 0) {
      const survSmashRate = smashedSurvivors / evaluatedSurvivors;
      const killSmashRate = smashedKillers / evaluatedKillers;
      const sumRates = survSmashRate + killSmashRate;
      if (sumRates > 0) {
        survivorAffinity = Math.round((survSmashRate / sumRates) * 100);
        killerAffinity = 100 - survivorAffinity;
      }
    } else if (evaluatedSurvivors > 0 && evaluatedKillers === 0) {
      survivorAffinity = 100;
      killerAffinity = 0;
    } else if (evaluatedKillers > 0 && evaluatedSurvivors === 0) {
      survivorAffinity = 0;
      killerAffinity = 100;
    } else {
      const totalSmashedRoles = smashedKillers + smashedSurvivors;
      if (totalSmashedRoles > 0) {
        survivorAffinity = Math.round((smashedSurvivors / totalSmashedRoles) * 100);
        killerAffinity = 100 - survivorAffinity;
      }
    }
  }

  let archKey = 'fogRomantic';
  const hasStrongMonsterAffinity =
    smashedMonsters >= 2 && (smashes.length <= 4 || (smashedMonsters / smashes.length) >= 0.25);

  if (hasStrongMonsterAffinity) {
    archKey = 'eldritchDevotee';
  } else if (smashedSurvivors >= 2 && survivorAffinity >= 68) {
    archKey = 'campfireSoulmate';
  } else if (smashedKillers >= 2 && killerAffinity >= 68) {
    archKey = 'redStainAddict';
  } else if (total >= 5 && smashRate >= 80) {
    archKey = 'entitysParamour';
  } else if ((total >= 3 && smashes.length === 0) || (total >= 4 && smashRate <= 20)) {
    archKey = 'coldHeartedPragmatist';
  } else {
    archKey = 'fogRomantic';
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
    totalSmashes: smashes.length,
    smashedSurvivors,
    smashedKillers,
    evaluatedSurvivors,
    evaluatedKillers,
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
 * Builds Telegram share URL, directing desktop browsers to Telegram Web (avoiding dead tg:// protocol handlers on t.me)
 * and mobile browsers to the native t.me deep link.
 */
export function buildTelegramShareUrl(shareUrl: string, shareText: string, isMobile: boolean): string {
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  if (isMobile) {
    return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
  }
  // Desktop: open Telegram Web directly with embedded tgaddr to avoid dead tg:// buttons on t.me
  const tgaddr = `tg://msg_url?url=${encodedUrl}&text=${encodedText}`;
  return `https://web.telegram.org/a/#?tgaddr=${encodeURIComponent(tgaddr)}`;
}

/**
 * Builds Facebook share URL with encoded URL and optional quote parameter.
 */
export function buildFacebookShareUrl(shareUrl: string, shareText?: string): string {
  const base = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  if (shareText) {
    return `${base}&quote=${encodeURIComponent(shareText)}`;
  }
  return base;
}

export { copyTextWithFallback } from '@/utils/clipboard';
