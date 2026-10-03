'use client';

import React, { useState } from 'react';
import { ChevronDown, TriangleAlert } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { type SmashRosterErrorCode } from '@/utils/smashOrPass/codec';
import { SMASH_ROSTER_LIMITS, TRANSLATABLE_LOCALES } from '@/utils/smashOrPass/constants';
import type { CustomRomanceArchetype, RosterCustomLabels, SmashRosterDocumentEntity } from '@/types/smashOrPass';
import { DraftEntity, emptyDraftEntity, type EntityTranslationDraft } from '@/components/smash-or-pass/creator/EntityEditor';
import { Badge } from '@/components/common/Badge';
import { useDictionary } from '@/context/DictionaryContext';

export function newKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export interface Draft {
  name: string;
  description: string;
  cover_image_url: string;
  theme_color: string;
  category: string;
  is_nsfw: boolean;
  roster_mode: 'simple' | 'full';
  custom_labels: RosterCustomLabels;
  custom_roles?: string[];
  custom_genders?: string[];
  romance_archetypes: CustomRomanceArchetype[];
  entities: DraftEntity[];
}

export function freshDraft(): Draft {
  return {
    name: '',
    description: '',
    cover_image_url: '',
    theme_color: '#ff0055',
    category: '',
    is_nsfw: false,
    roster_mode: 'simple',
    custom_labels: {},
    custom_roles: [],
    custom_genders: [],
    romance_archetypes: [],
    entities: [emptyDraftEntity('seed-0')],
  };
}

export function entityFromDocument(e: SmashRosterDocumentEntity): DraftEntity {
  return {
    key: newKey(),
    name: e.name,
    media_url: e.media_url || '',
    role: e.role || '',
    gender: e.gender || '',
    real_name: e.real_name || '',
    archetype: e.archetype || '',
    tagline: e.tagline || '',
    bio: e.bio || '',
    quote: e.quote || '',
    meme: e.meme || '',
    turn_on: e.turn_on || '',
    dealbreaker: e.dealbreaker || '',
    dating_vibe: e.dating_vibe || '',
    red_flags: (e.red_flags || []).join('\n'),
    green_flags: (e.green_flags || []).join('\n'),
    watermark_left: e.watermark_left || '',
    watermark_right: e.watermark_right || '',
  };
}

function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, SMASH_ROSTER_LIMITS.maxFlags);
}

export function toRawEntity(e: DraftEntity): Record<string, unknown> {
  return {
    name: e.name,
    media_url: e.media_url,
    role: e.role,
    gender: e.gender,
    real_name: e.real_name,
    archetype: e.archetype,
    tagline: e.tagline,
    bio: e.bio,
    quote: e.quote,
    meme: e.meme,
    turn_on: e.turn_on,
    dealbreaker: e.dealbreaker,
    dating_vibe: e.dating_vibe,
    red_flags: splitLines(e.red_flags),
    green_flags: splitLines(e.green_flags),
    watermark_left: e.watermark_left,
    watermark_right: e.watermark_right,
  };
}

export type RosterTranslations = Record<string, { name: string; description: string }>;

export type EntityTranslations = Record<string, Record<string, EntityTranslationDraft>>;

export function buildAdminRosterTranslations(t: RosterTranslations): Record<string, { name?: string; description?: string }> {
  const out: Record<string, { name?: string; description?: string }> = {};
  for (const loc of TRANSLATABLE_LOCALES) {
    const entry = t[loc];
    if (!entry) continue;
    const cleaned: { name?: string; description?: string } = {};
    if (entry.name?.trim()) cleaned.name = entry.name.trim().slice(0, SMASH_ROSTER_LIMITS.maxRosterName);
    if (entry.description?.trim()) cleaned.description = entry.description.trim().slice(0, SMASH_ROSTER_LIMITS.maxRosterDescription);
    if (Object.keys(cleaned).length) out[loc] = cleaned;
  }
  return out;
}

export function buildAdminEntityTranslations(t: Record<string, EntityTranslationDraft> | undefined): Record<string, Record<string, string | string[]>> {
  const out: Record<string, Record<string, string | string[]>> = {};
  if (!t) return out;
  for (const loc of TRANSLATABLE_LOCALES) {
    const entry = t[loc];
    if (!entry) continue;
    const cleaned: Record<string, string | string[]> = {};
    for (const [field, value] of Object.entries(entry)) {
      if (!value) continue;
      if (field === 'red_flags' || field === 'green_flags') {
        const arr = splitLines(value);
        if (arr.length) cleaned[field] = arr;
      } else if (value.trim()) {
        cleaned[field] = value.trim();
      }
    }
    if (Object.keys(cleaned).length) out[loc] = cleaned;
  }
  return out;
}

export const DRAFT_KEY = 'lemondbd_smash_roster_draft';

export interface StoredDraft extends Draft {
  rosterTranslations?: RosterTranslations;
  entityTranslations?: EntityTranslations;
  selectedEntityKey?: string;
}

export function readDraft(): StoredDraft | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (!parsed || typeof parsed !== 'object') return null;

    const entities: DraftEntity[] = Array.isArray(parsed.entities) && parsed.entities.length > 0
      ? parsed.entities.map((e: Partial<DraftEntity> | null, idx: number) => ({
          key: typeof e?.key === 'string' && e.key ? e.key : (idx === 0 ? 'seed-0' : newKey()),
          name: typeof e?.name === 'string' ? e.name : '',
          media_url: typeof e?.media_url === 'string' ? e.media_url : '',
          role: typeof e?.role === 'string' ? e.role : '',
          gender: typeof e?.gender === 'string' ? e.gender : '',
          real_name: typeof e?.real_name === 'string' ? e.real_name : '',
          archetype: typeof e?.archetype === 'string' ? e.archetype : '',
          tagline: typeof e?.tagline === 'string' ? e.tagline : '',
          bio: typeof e?.bio === 'string' ? e.bio : '',
          quote: typeof e?.quote === 'string' ? e.quote : '',
          meme: typeof e?.meme === 'string' ? e.meme : '',
          turn_on: typeof e?.turn_on === 'string' ? e.turn_on : '',
          dealbreaker: typeof e?.dealbreaker === 'string' ? e.dealbreaker : '',
          dating_vibe: typeof e?.dating_vibe === 'string' ? e.dating_vibe : '',
          red_flags: typeof e?.red_flags === 'string' ? e.red_flags : '',
          green_flags: typeof e?.green_flags === 'string' ? e.green_flags : '',
          watermark_left: typeof e?.watermark_left === 'string' ? e.watermark_left : '',
          watermark_right: typeof e?.watermark_right === 'string' ? e.watermark_right : '',
        }))
      : [emptyDraftEntity('seed-0')];

    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      cover_image_url: typeof parsed.cover_image_url === 'string' ? parsed.cover_image_url : '',
      theme_color: typeof parsed.theme_color === 'string' && parsed.theme_color ? parsed.theme_color : '#ff0055',
      category: typeof parsed.category === 'string' ? parsed.category : '',
      is_nsfw: Boolean(parsed.is_nsfw),
      roster_mode: parsed.roster_mode === 'full' ? 'full' : 'simple',
      custom_labels: (parsed.custom_labels && typeof parsed.custom_labels === 'object') ? parsed.custom_labels : {},
      custom_roles: Array.isArray(parsed.custom_roles) ? parsed.custom_roles.filter((r) => typeof r === 'string') : [],
      custom_genders: Array.isArray(parsed.custom_genders) ? parsed.custom_genders.filter((g) => typeof g === 'string') : [],
      romance_archetypes: Array.isArray(parsed.romance_archetypes) ? parsed.romance_archetypes : [],
      entities,
      rosterTranslations: (parsed.rosterTranslations && typeof parsed.rosterTranslations === 'object') ? parsed.rosterTranslations : {},
      entityTranslations: (parsed.entityTranslations && typeof parsed.entityTranslations === 'object') ? parsed.entityTranslations : {},
      selectedEntityKey: typeof parsed.selectedEntityKey === 'string' ? parsed.selectedEntityKey : undefined,
    };
  } catch {
    return null;
  }
}

export function errorMessage(t: Dictionary['smashOrPass'], code: SmashRosterErrorCode): string {
  return t.importModal?.errors?.[code] || code;
}

interface SectionProps {
  title: string;
  badge?: string | number;
  defaultOpen?: boolean;
  headerAction?: React.ReactNode;
  toggleAria?: string;
  children: React.ReactNode;
}

export function Section({ title, badge, defaultOpen = true, headerAction, toggleAria, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-border-color bg-bg-surface shadow-xs overflow-hidden transition-colors flex flex-col">
      <div className="relative w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 bg-bg-surface hover:bg-bg-elevated/40 transition-colors">
        {/* Left spacer to balance right side controls on wider screens */}
        <div className="w-24 sm:w-32 hidden sm:block pointer-events-none" aria-hidden="true" />

        {/* Center toggle clickable area */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className="flex-1 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 min-w-0 px-1 sm:px-2 cursor-pointer select-none text-center"
        >
          <h2 className="type-section-title text-text-primary hover:text-accent-red transition-colors">
            {title}
          </h2>
          {badge !== undefined && (
            <Badge size="sm" plain className="">
              {badge}
            </Badge>
          )}
        </button>

        {/* Right side controls: headerAction sticky beside chevron */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {headerAction}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={toggleAria || title}
            className="flex items-center justify-center p-1 text-accent-red hover:text-accent-red-hover transition-colors cursor-pointer"
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 ease-in-out',
                isOpen ? 'rotate-180' : 'rotate-0'
              )}
            />
          </button>
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 sm:p-6 2xl:p-7 border-t border-border-color">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Feedback({ errors, saveError, submitError, publishError }: {
  errors: string[];
  saveError: 'quota' | 'unavailable' | null;
  submitError?: string | null;
  publishError?: string | null;
}) {
  const dict = useDictionary();
  const im = dict.smashOrPass.importModal || {};
  const saveErrorText = saveError === 'quota' ? im.saveFailedQuota : saveError === 'unavailable' ? im.saveFailedUnavailable : null;
  const messages = [...errors, ...(saveErrorText ? [saveErrorText] : []), ...(submitError ? [submitError] : []), ...(publishError ? [publishError] : [])];
  if (messages.length === 0) return null;
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-accent-red/40 bg-accent-red/10 p-3 type-card-title text-accent-red text-center">
      {messages.map((m) => (
        <p key={m} className="flex items-center justify-center gap-2">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          {m}
        </p>
      ))}
    </div>
  );
}
