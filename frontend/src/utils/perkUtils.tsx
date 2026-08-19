// frontend/src/utils/perkUtils.tsx
import React from 'react';
import { Perk, RoleCategory } from '@/types/perks';

export const ACTION_KEYWORDS: readonly string[] = [
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

export function getBackendBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
}

export function sanitizePath(rawPath: string): string {
  return rawPath.replace(/^\/?(static\/)?/, '');
}

export function sanitizeCharacterNameForAvatar(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s\-/]+/g, '_')
    .replace(/[\\/*?:"<>|]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getPerkIconUrl(
  perk?: Pick<Perk, 'icon_local_path' | 'icon_url'> | null,
  backendBase: string = getBackendBaseUrl()
): string | null {
  if (!perk) return null;
  const cleanPath = sanitizePath(perk.icon_local_path || '');
  if (cleanPath) {
    return `${backendBase}/static/${cleanPath}`;
  }
  return perk.icon_url || null;
}

export function getCharacterAvatarUrl(
  perk?: Pick<
    Perk,
    'character' | 'character_avatar_path' | 'is_generic_counterpart' | 'category'
  > | null,
  fallbackRole?: RoleCategory,
  backendBase: string = getBackendBaseUrl()
): string | null {
  if (!perk) return null;

  const isGeneral =
    !perk.character ||
    perk.character === 'General' ||
    Boolean(perk.is_generic_counterpart);

  let rawPath = perk.character_avatar_path;

  if (!rawPath && perk.character && !isGeneral) {
    const role = (perk.category as RoleCategory) || fallbackRole || 'Survivor';
    const subDir = role === 'Survivor' ? 'survivors' : 'killers';
    const sanitized = sanitizeCharacterNameForAvatar(perk.character);
    rawPath = `avatars/${subDir}/${sanitized}.png`;
  }

  if (!rawPath) return null;
  return `${backendBase}/static/${sanitizePath(rawPath)}`;
}

export function formatPerkSlug(name: string): string {
  return name.toLowerCase().replace(/[\s\-/]+/g, '_');
}

export function createPerkTokenRegex(perkName?: string): RegExp {
  const escapedPerkName = perkName ? perkName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
  const keywordsPattern = ACTION_KEYWORDS.map((k) =>
    k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|');

  const perkPart = escapedPerkName ? `\\b(?:${escapedPerkName})\\b|` : '';

  return new RegExp(
    `(${perkPart}` +
      `\\b(?:${keywordsPattern})\\b|` +
      `\\+?\\-?\\d+(?:\\.\\d+)?(?:\\s*\\/\\s*\\d+(?:\\.\\d+)?)+(?:\\s*%)?|` +
      `\\+\\d+(?:\\.\\d+)?\\s*(?:metres?|meters?|m\\b|%|seconds?|s\\b|tokens?|charges?)|` +
      `\\b\\d+(?:\\.\\d+)?\\s*%|` +
      `\\b\\d+(?:\\.\\d+)?\\s*(?:metres?|meters?|seconds?|tokens?)\\b)`,
    'gi'
  );
}

export function parseLineTokens(
  text: string,
  lineKey: number | string,
  tokenRegex: RegExp,
  perkName?: string
): React.ReactNode[] {
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;
    const trimmed = part.trim();

    if (perkName && trimmed.toLowerCase() === perkName.toLowerCase()) {
      return (
        <em
          key={`${lineKey}-${idx}`}
          className="italic font-medium text-slate-100 dark:text-white"
        >
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
        <strong
          key={`${lineKey}-${idx}`}
          className="font-black text-amber-400 dark:text-amber-400"
        >
          {part}
        </strong>
      );
    }

    return <span key={`${lineKey}-${idx}`}>{part}</span>;
  });
}
