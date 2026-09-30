'use client';
// frontend/src/components/smash-or-pass/creator/SmashRosterCreator.tsx
/**
 * The smash-or-pass roster creator: name it, add candidates, and it's saved
 * to this browser -- or, for an admin who checks "Official?", published live
 * to every visitor via `POST /api/v1/smash-or-pass/rosters` (mirrors
 * `TierListCreator`'s official-checkbox pattern one-to-one).
 *
 * Everything the viewer types goes through the same sanitizer a pasted-JSON
 * import would (`validateSmashRosterDocument`), so a roster built here can
 * never smuggle in anything the import flow would reject.
 *
 * Translation authoring (locale overrides for the ten backend
 * `TRANSLATABLE_FIELDS`) is admin+official only -- a custom roster is always
 * single-locale, matching the agreed plan's explicit non-goal.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronLeft,
  Crop,
  Plus,
  SearchX,
  TriangleAlert,
} from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { Switch } from '@/components/common/Switch';
import { Tooltip } from '@/components/common/Tooltip';
import type { Dictionary } from '@/locales/types';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSmashRosterStore } from '@/hooks/useSmashRosterStore';
import { useSmashTaxonomies } from '@/hooks/useSmashTaxonomies';
import { apiUrl } from '@/utils/api';
import { cn } from '@/utils/cn';
import { sanitizeImageUrl, validateSmashRosterDocument, type SmashRosterErrorCode } from '@/utils/smashOrPass/codec';
import { GENDER_QUICK_PICKS, ROLE_QUICK_PICKS, SMASH_ROSTER_LIMITS, TRANSLATABLE_LOCALES } from '@/utils/smashOrPass/constants';
import { createCustomRosterId, saveCustomRoster } from '@/utils/smashOrPass/storage';
import type { CustomRomanceArchetype, RosterCustomLabels, SmashRosterDocumentEntity } from '@/types/smashOrPass';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD, LABEL, TEXTAREA_FIELD } from './styles';
import {
  CandidateFormInputs,
  CandidateTiles,
  DraftEntity,
  emptyDraftEntity,
  type EntityTranslationDraft,
} from './EntityEditor';
import { CoverImageCropModal } from './CoverImageCropModal';
import { RosterTaxonomyBlock } from './RosterTaxonomyBlock';
import { RomanceArchetypeBuilder } from './RomanceArchetypeBuilder';

function newKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

interface Draft {
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

function freshDraft(): Draft {
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

function entityFromDocument(e: SmashRosterDocumentEntity): DraftEntity {
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

function toRawEntity(e: DraftEntity): Record<string, unknown> {
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

type RosterTranslations = Record<string, { name: string; description: string }>;
type EntityTranslations = Record<string, Record<string, EntityTranslationDraft>>;

function buildAdminRosterTranslations(t: RosterTranslations): Record<string, { name?: string; description?: string }> {
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

function buildAdminEntityTranslations(t: Record<string, EntityTranslationDraft> | undefined): Record<string, Record<string, string | string[]>> {
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

function errorMessage(t: any, code: SmashRosterErrorCode): string {
  return t.importModal?.errors?.[code] || code;
}

interface SmashRosterCreatorProps {
  locale: string;
  dict: Dictionary;
  /** A custom roster id to edit in place, instead of building a new one.
   * Official rosters have no backend update path, so `editId` only ever
   * refers to a locally-stored roster. */
  editId?: string;
}

export function SmashRosterCreator({ locale, dict, editId }: SmashRosterCreatorProps) {
  const t = dict?.smashOrPass as any;
  const c = t?.creator || {};
  const router = useRouter();
  const { isAdmin, token, user } = useAuth();
  const isUserAdmin = Boolean(isAdmin || user?.role === 'admin');
  const { state: storeState, hydrated: storeHydrated } = useSmashRosterStore();
  const { roles: taxonomyRoles, genders: taxonomyGenders, registerTerm } = useSmashTaxonomies();
  const editingRoster = editId ? storeState.custom[editId] : undefined;

  const [draft, setDraft] = useState<Draft>(freshDraft);
  const [selectedEntityKey, setSelectedEntityKey] = useState<string>('seed-0');
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saveError, setSaveError] = useState<'quota' | 'unavailable' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [official, setOfficial] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [rosterTranslations, setRosterTranslations] = useState<RosterTranslations>({});
  const [entityTranslations, setEntityTranslations] = useState<EntityTranslations>({});
  const [activeTranslationLocale, setActiveTranslationLocale] = useState<string>(TRANSLATABLE_LOCALES[0]);

  useDocumentTitle(editId ? `${c.pageTitleEdit || 'LemonDBD - Edit Smash or Pass roster'}` : (c.pageTitleCreate || 'LemonDBD - Create a Smash or Pass roster'));

  const editSeeded = useRef<string | null>(null);
  useEffect(() => {
    if (!editId || !storeHydrated || editSeeded.current === editId) return;
    editSeeded.current = editId;
    if (!editingRoster) return;
    const seededEntities = editingRoster.entities.length
      ? editingRoster.entities.map(entityFromDocument)
      : [emptyDraftEntity(newKey())];
    setDraft({
      name: editingRoster.name,
      description: editingRoster.description || '',
      cover_image_url: editingRoster.cover_image_url || '',
      theme_color: editingRoster.theme_color || '#ff0055',
      category: editingRoster.category || '',
      is_nsfw: editingRoster.is_nsfw || false,
      roster_mode: editingRoster.roster_mode || 'simple',
      custom_labels: editingRoster.custom_labels || {},
      custom_roles: editingRoster.custom_roles || [],
      custom_genders: editingRoster.custom_genders || [],
      romance_archetypes: editingRoster.romance_archetypes || [],
      entities: seededEntities,
    });
    if (seededEntities.length > 0) {
      setSelectedEntityKey(seededEntities[0].key);
    }
  }, [editId, storeHydrated, editingRoster]);

  const patch = (next: Partial<Draft>) => setDraft((d) => ({ ...d, ...next }));
  const patchEntity = (key: string, next: Partial<DraftEntity>) =>
    setDraft((d) => ({ ...d, entities: d.entities.map((e) => (e.key === key ? { ...e, ...next } : e)) }));

  const addEntity = () => {
    if (draft.entities.length >= SMASH_ROSTER_LIMITS.maxEntities) return;
    const k = newKey();
    setDraft((d) => ({ ...d, entities: [...d.entities, emptyDraftEntity(k)] }));
    setSelectedEntityKey(k);
  };

  const removeEntity = (key: string) => {
    setDraft((d) => {
      const next = d.entities.filter((e) => e.key !== key);
      return { ...d, entities: next };
    });
    if (selectedEntityKey === key) {
      const remaining = draft.entities.filter((e) => e.key !== key);
      setSelectedEntityKey(remaining[0]?.key || '');
    }
  };

  const activeEntity = useMemo(() => {
    return draft.entities.find((e) => e.key === selectedEntityKey) || draft.entities[0];
  }, [draft.entities, selectedEntityKey]);

  const activeEntityIndex = useMemo(() => {
    const idx = draft.entities.findIndex((e) => e.key === (activeEntity?.key ?? selectedEntityKey));
    return idx >= 0 ? idx : 0;
  }, [draft.entities, selectedEntityKey, activeEntity]);

  const setEntityTranslation = (entityKey: string, loc: string, field: string, value: string) => {
    setEntityTranslations((prev) => ({
      ...prev,
      [entityKey]: {
        ...prev[entityKey],
        [loc]: { ...prev[entityKey]?.[loc], [field]: value },
      },
    }));
  };

  const effectiveRoles = useMemo(() => {
    if (draft.custom_roles && draft.custom_roles.length > 0) return draft.custom_roles;
    if (taxonomyRoles && taxonomyRoles.length > 0) return taxonomyRoles;
    return [...ROLE_QUICK_PICKS];
  }, [draft.custom_roles, taxonomyRoles]);

  const effectiveGenders = useMemo(() => {
    if (draft.custom_genders && draft.custom_genders.length > 0) return draft.custom_genders;
    if (taxonomyGenders && taxonomyGenders.length > 0) return taxonomyGenders;
    return [...GENDER_QUICK_PICKS];
  }, [draft.custom_genders, taxonomyGenders]);

  const nameMissing = !draft.name.trim();
  const trimmedCover = draft.cover_image_url.trim();
  const safeCover = trimmedCover ? sanitizeImageUrl(trimmedCover) : null;
  const coverInvalid = Boolean(trimmedCover) && !safeCover;
  const validEntityCount = draft.entities.filter((e) => e.name.trim()).length;
  const entitiesMissing = validEntityCount === 0;

  const isSimpleMode = draft.roster_mode === 'simple';
  const showTranslations = isUserAdmin && official;

  // Editing a roster the store doesn't have (deleted, or a stale link): send
  // back rather than silently falling through to "create a new roster".
  if (editId && storeHydrated && !editingRoster) {
    return (
      <div className="relative z-10 flex flex-col gap-2">
        <Link
          href={`/${locale}/smash-or-pass`}
          className="inline-flex min-h-[44px] w-fit items-center gap-1 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-accent-red"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {c.title || 'Create a Roster'}
        </Link>
        <EmptyState icon={SearchX} title={t?.empty?.title || 'Not Found'} subtitle={t?.empty?.subtitle || ''} />
      </div>
    );
  }

  const submit = async () => {
    setAttempted(true);
    setSubmitError(null);
    if (nameMissing || entitiesMissing || coverInvalid) return;

    const trimmedEntities = draft.entities.filter((e) => e.name.trim());
    const rawDoc = {
      name: draft.name,
      description: draft.description,
      cover_image_url: draft.cover_image_url,
      theme_color: draft.theme_color,
      category: draft.category,
      is_nsfw: draft.is_nsfw,
      roster_mode: isSimpleMode ? ('simple' as const) : ('full' as const),
      custom_labels: draft.custom_labels,
      custom_roles: draft.custom_roles,
      custom_genders: draft.custom_genders,
      romance_archetypes: draft.romance_archetypes,
      entities: trimmedEntities.map(toRawEntity),
    };
    const result = validateSmashRosterDocument(rawDoc);
    if (!result.ok) {
      setSubmitError(errorMessage(t, result.error));
      return;
    }

    if (official && isUserAdmin) {
      setPublishing(true);
      setPublishError(null);
      try {
        const res = await fetch(apiUrl('/api/v1/smash-or-pass/rosters'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: result.doc.name,
            description: result.doc.description || '',
            ...(result.doc.cover_image_url ? { cover_image_url: result.doc.cover_image_url } : {}),
            theme_color: result.doc.theme_color || '#ff0055',
            category: result.doc.category || 'DBD',
            is_nsfw: result.doc.is_nsfw || false,
            translations: buildAdminRosterTranslations(rosterTranslations),
            entities: result.doc.entities.map((e, i) => ({
              name: e.name,
              ...(e.real_name ? { real_name: e.real_name } : {}),
              role: e.role,
              gender: e.gender,
              ...(e.media_url ? { media_url: e.media_url } : {}),
              ...(e.media_type ? { media_type: e.media_type } : {}),
              ...(e.archetype ? { archetype: e.archetype } : {}),
              bio: e.bio || '',
              tagline: e.tagline || '',
              quote: e.quote || '',
              meme: e.meme || '',
              turn_on: e.turn_on || '',
              dealbreaker: e.dealbreaker || '',
              dating_vibe: e.dating_vibe || '',
              red_flags: e.red_flags || [],
              green_flags: e.green_flags || [],
              ...(e.watermark_left ? { watermark_left: e.watermark_left } : {}),
              ...(e.watermark_right ? { watermark_right: e.watermark_right } : {}),
              translations: buildAdminEntityTranslations(entityTranslations[trimmedEntities[i]?.key]),
            })),
          }),
        });
        if (!res.ok) {
          const errorData: { error?: string } = await res.json().catch(() => ({}));
          setPublishError(errorData.error || c.saveError || 'Something went wrong saving this roster.');
          setPublishing(false);
          return;
        }
        const body: { data: { slug: string } } = await res.json();
        router.push(`/${locale}/smash-or-pass?roster=${body.data.slug}`);
      } catch {
        setPublishError(c.saveError || 'Something went wrong saving this roster.');
        setPublishing(false);
      }
      return;
    }

    if (editId && editingRoster) {
      const saveResult = saveCustomRoster({ id: editId, ...result.doc, createdAt: editingRoster.createdAt });
      if (!saveResult.ok) {
        setSaveError(saveResult.reason);
        return;
      }
      router.push(`/${locale}/smash-or-pass`);
      return;
    }

    const id = createCustomRosterId();
    const saveResult = saveCustomRoster({ id, ...result.doc, createdAt: Date.now() });
    if (!saveResult.ok) {
      setSaveError(saveResult.reason);
      return;
    }
    router.push(`/${locale}/smash-or-pass?roster=local:${id}`);
  };

  const publishingNow = publishing && official && isUserAdmin;
  const submitLabel = publishingNow
    ? (c.saving || 'Saving...')
    : official && isUserAdmin
      ? (c.publish || 'Publish')
      : editId
        ? (c.saveShort || 'Save')
        : (c.create || 'Create');

  const submitButton = (extra?: string) => (
    <button
      type="button"
      onClick={submit}
      disabled={publishingNow}
      data-roster-create=""
      className={cn(
        BTN_PRIMARY,
        'transition-colors',
        publishingNow && 'opacity-60 cursor-not-allowed',
        extra ?? 'min-h-[48px] 2xl:min-h-[54px] px-8 2xl:px-10 text-base 2xl:text-lg'
      )}
    >
      {submitLabel}
    </button>
  );

  const errors = attempted
    ? [
        nameMissing && (c.validationNameRequired || 'Give this roster a name.'),
        entitiesMissing && (c.validationEntityRequired || 'Add at least one candidate.'),
        coverInvalid && (c.invalidImage || 'That cover image link is invalid.'),
      ].filter(Boolean)
    : [];

  return (
    <div className="relative z-10 flex flex-col gap-6 2xl:gap-8 max-w-7xl 2xl:max-w-[1700px] mx-auto w-full px-4 sm:px-6">
      <h1 className="sr-only">{editId ? (c.editTitle || 'Edit Roster') : (c.title || 'Create a Roster')}</h1>

      {/* TOP ROW: IN-LINE NAVIGATION (LEFT), THE BASICS BLOCK (MIDDLE), CREATE (RIGHT) */}
      <header className="flex flex-col lg:flex-row items-stretch lg:items-start justify-between gap-3 lg:gap-4 w-full">
        {/* Mobile top bar (< lg) */}
        <div className="flex lg:hidden items-center justify-between gap-2 w-full">
          <Link
            href={`/${locale}/smash-or-pass`}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-accent-red transition-colors"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {c.backToHub || 'Smash or Pass'}
          </Link>
          <div className="flex items-center gap-2">
            {submitButton('min-h-[40px] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider')}
          </div>
        </div>

        {/* Desktop top left navigation (>= lg) */}
        <div className="hidden lg:flex shrink-0 lg:w-48 pt-2.5">
          <Link
            href={`/${locale}/smash-or-pass`}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs 2xl:text-sm font-bold uppercase tracking-wider text-text-secondary hover:text-accent-red transition-colors"
          >
            <ChevronLeft className="h-4 w-4 2xl:h-5 2xl:w-5" aria-hidden="true" />
            {c.backToHub || 'Smash or Pass'}
          </Link>
        </div>

        {/* MIDDLE: THE BASICS BLOCK */}
        <div className="flex-1 w-full min-w-0 max-w-4xl 2xl:max-w-5xl mx-auto">
          <Section title={c.stepBasics || 'The Basics'}>
            <div className="grid gap-4 2xl:gap-6 md:grid-cols-2">
              <label>
                <span className={LABEL}>{c.nameLabel || 'Roster name'}</span>
                <input
                  value={draft.name}
                  maxLength={SMASH_ROSTER_LIMITS.maxRosterName}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder={c.namePlaceholder || 'e.g. Chapter 34 Cast'}
                  aria-invalid={attempted && nameMissing}
                  className={cn(FIELD, '2xl:min-h-[50px] 2xl:text-base', attempted && nameMissing && 'border-accent-red')}
                />
              </label>
              <label>
                <span className={LABEL}>{c.categoryLabel || 'Category'}</span>
                <input
                  value={draft.category}
                  maxLength={64}
                  onChange={(e) => patch({ category: e.target.value })}
                  placeholder={c.categoryPlaceholder || 'e.g. Custom'}
                  className={cn(FIELD, '2xl:min-h-[50px] 2xl:text-base')}
                />
              </label>
              <label className="md:col-span-2">
                <span className={LABEL}>{c.descriptionLabel || 'Description (optional)'}</span>
                <textarea
                  value={draft.description}
                  maxLength={SMASH_ROSTER_LIMITS.maxRosterDescription}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder={c.descriptionPlaceholder || 'What is this roster about?'}
                  rows={2}
                  className={cn(TEXTAREA_FIELD, '2xl:text-base')}
                />
              </label>
              <div className="md:col-span-2">
                <span className={LABEL}>{c.coverImageLabel || 'Cover image URL (optional)'}</span>
                <div className="flex gap-2">
                  <input
                    value={draft.cover_image_url}
                    onChange={(e) => patch({ cover_image_url: e.target.value })}
                    placeholder={c.coverImagePlaceholder || 'https://...'}
                    inputMode="url"
                    aria-invalid={attempted && coverInvalid}
                    className={cn(FIELD, '2xl:min-h-[50px] 2xl:text-base', attempted && coverInvalid && 'border-accent-red')}
                  />
                  <button
                    type="button"
                    onClick={() => setIsCropModalOpen(true)}
                    title={c.cropCoverTitle}
                    className={cn(BTN_SECONDARY, 'shrink-0 px-3')}
                  >
                    <Crop className="h-4 w-4 text-accent-red" />
                    <span className="hidden sm:inline">{c.cropCoverBadge}</span>
                  </button>
                </div>

                {safeCover ? (
                  <div
                    onClick={() => setIsCropModalOpen(true)}
                    className="mt-3 relative group overflow-hidden rounded-xl border border-border-color bg-bg-elevated aspect-video max-w-md mx-auto shadow-xs cursor-pointer"
                    title={c.cropCoverTitle}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- live preview of a user-supplied URL */}
                    <img
                      src={safeCover}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-text-inverted font-mono text-xs font-bold">
                      <Crop className="h-5 w-5 text-accent-red" />
                      <span>{c.cropClickPrompt}</span>
                    </div>
                  </div>
                ) : isUserAdmin ? (
                  <div className="flex justify-center mt-2">
                    <button
                      type="button"
                      onClick={() => setIsCropModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-border-color text-xs font-mono text-text-secondary hover:text-accent-red hover:border-accent-red/50 transition-colors cursor-pointer"
                    >
                      <Crop className="h-3.5 w-3.5" />
                      <span>{c.selectCropLocal}</span>
                    </button>
                  </div>
                ) : null}
              </div>

              <label className="md:col-span-2">
                <span className={LABEL}>{c.themeColorLabel || 'Theme color'}</span>
                <input
                  type="color"
                  value={draft.theme_color || '#ff0055'}
                  onChange={(e) => patch({ theme_color: e.target.value })}
                  className="h-11 w-full max-w-xs cursor-pointer rounded-xl border border-border-color bg-bg-primary"
                />
              </label>

              {/* Toggles Row: Simple Version, NSFW, and Official (Admin) */}
              <div className="md:col-span-2 pt-3 border-t border-border-color/60 flex flex-wrap items-center gap-5 sm:gap-6">
                {/* Simple Version Switch */}
                <Tooltip
                  title={c.simpleVersion || 'Simple Version'}
                  description={c.simpleVersionDesc || 'Fast cards + optional turn-on & dealbreaker'}
                >
                  <div
                    onClick={() => patch({ roster_mode: draft.roster_mode === 'simple' ? 'full' : 'simple' })}
                    className="flex items-center gap-2.5 cursor-pointer group select-none"
                  >
                    <Switch
                      checked={draft.roster_mode === 'simple'}
                      onChange={(checked) => patch({ roster_mode: checked ? 'simple' : 'full' })}
                      ariaLabel={c.simpleVersion || 'Simple Version'}
                    />
                    <span className="text-xs sm:text-sm font-mono font-bold text-text-primary group-hover:text-accent-red transition-colors">
                      {c.simpleVersion || 'Simple Version'}
                    </span>
                  </div>
                </Tooltip>

                {/* NSFW Content Switch */}
                <Tooltip
                  title={c.nsfwLabel || 'Contains NSFW content'}
                  description="Mark this roster as containing mature or sensitive material."
                >
                  <div
                    onClick={() => patch({ is_nsfw: !draft.is_nsfw })}
                    className="flex items-center gap-2.5 cursor-pointer group select-none"
                  >
                    <Switch
                      checked={draft.is_nsfw}
                      onChange={(checked) => patch({ is_nsfw: checked })}
                      ariaLabel={c.nsfwLabel || 'Contains NSFW content'}
                    />
                    <span className="text-xs sm:text-sm font-mono font-bold text-text-primary group-hover:text-accent-red transition-colors">
                      {c.nsfwLabel || 'Contains NSFW content'}
                    </span>
                  </div>
                </Tooltip>

                {/* Official Roster Switch (Admin only) */}
                {isUserAdmin && (
                  <Tooltip
                    title={c.officialPublicHub || 'Official Roster (Public on Hub)'}
                    description="Publish directly to the public Hub directory for all visitors."
                  >
                    <div
                      onClick={() => setOfficial(!official)}
                      className="flex items-center gap-2.5 cursor-pointer group select-none"
                    >
                      <Switch
                        checked={official}
                        onChange={(checked) => setOfficial(checked)}
                        ariaLabel={c.officialPublicHub || 'Official Roster (Public on Hub)'}
                      />
                      <span className="text-xs sm:text-sm font-mono font-bold text-accent-red group-hover:underline transition-colors">
                        {c.officialPublicHub || 'Official (Public on Hub)'}
                      </span>
                    </div>
                  </Tooltip>
                )}
              </div>
            </div>

            {showTranslations && (
              <div className="mt-4 flex flex-col gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-3">
                <span className={LABEL}>{c.translationsHeading || 'Translations'}</span>
                <p className="text-xs text-text-muted -mt-1">
                  {c.translationsHint || 'Optional overrides shown to players using these languages. Anything left blank falls back to the default text above.'}
                </p>
                <div className="flex flex-wrap gap-1.5" role="tablist">
                  {TRANSLATABLE_LOCALES.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      role="tab"
                      aria-selected={activeTranslationLocale === loc}
                      onClick={() => setActiveTranslationLocale(loc)}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer',
                        activeTranslationLocale === loc
                          ? 'bg-accent-red text-text-inverted'
                          : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label>
                    <span className={LABEL}>{c.translationsRosterName || 'Roster name'}</span>
                    <input
                      value={rosterTranslations[activeTranslationLocale]?.name || ''}
                      maxLength={SMASH_ROSTER_LIMITS.maxRosterName}
                      onChange={(e) =>
                        setRosterTranslations((prev) => ({
                          ...prev,
                          [activeTranslationLocale]: { ...prev[activeTranslationLocale], name: e.target.value, description: prev[activeTranslationLocale]?.description || '' },
                        }))
                      }
                      className={FIELD}
                    />
                  </label>
                  <label>
                    <span className={LABEL}>{c.translationsRosterDescription || 'Description'}</span>
                    <input
                      value={rosterTranslations[activeTranslationLocale]?.description || ''}
                      maxLength={SMASH_ROSTER_LIMITS.maxRosterDescription}
                      onChange={(e) =>
                        setRosterTranslations((prev) => ({
                          ...prev,
                          [activeTranslationLocale]: { ...prev[activeTranslationLocale], description: e.target.value, name: prev[activeTranslationLocale]?.name || '' },
                        }))
                      }
                      className={FIELD}
                    />
                  </label>
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* Desktop top right buttons (>= lg) */}
        <div className="hidden lg:flex shrink-0 lg:w-48 items-center justify-end gap-2.5 sm:gap-3 pt-2">
          {submitButton(
            'min-h-[40px] 2xl:min-h-[46px] px-4 2xl:px-6 py-1.5 text-xs 2xl:text-sm font-bold uppercase tracking-wider'
          )}
        </div>
      </header>

      {/* BLOCK 2: ROLES & GENDERS */}
      <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto">
        <Section
          title={c.rolesGendersTitle}
          badge={`${effectiveRoles.length} roles • ${effectiveGenders.length} genders`}
          defaultOpen={false}
        >
          <RosterTaxonomyBlock
            dict={dict}
            roles={draft.custom_roles || []}
            genders={draft.custom_genders || []}
            onChangeRoles={(roles) => patch({ custom_roles: roles })}
            onChangeGenders={(genders) => patch({ custom_genders: genders })}
            onRegisterTerm={registerTerm}
          />
        </Section>
      </div>

      {/* BLOCK 3: CANDIDATES */}
      <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto">
        <Section
          title={c.stepEntities || 'Candidates'}
          badge={draft.entities.length}
          defaultOpen={true}
          headerAction={
            <button
              type="button"
              onClick={addEntity}
              disabled={draft.entities.length >= SMASH_ROSTER_LIMITS.maxEntities}
              className={cn(
                BTN_SECONDARY,
                'min-h-[32px] sm:min-h-[36px] px-3 sm:px-4 py-1 sm:py-1.5 text-xs font-bold uppercase tracking-wider'
              )}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{c.addEntity || 'Add Candidate'}</span>
            </button>
          }
        >
          <div className="flex flex-col gap-6">
            {draft.entities.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border-color bg-bg-elevated/20">
                <p className="text-sm text-text-muted mb-3 font-mono">
                  {c.noEntitiesYet || 'No candidates yet. Add your first one above.'}
                </p>
                <button
                  type="button"
                  onClick={addEntity}
                  className={cn(BTN_SECONDARY, 'min-h-[36px] px-4 text-xs font-bold uppercase tracking-wider')}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>{c.addEntity || 'Add Candidate'}</span>
                </button>
              </div>
            ) : (
              <>
                {/* Part 1: All Inputs for Currently Selected Candidate */}
                {activeEntity && (
                  <CandidateFormInputs
                    key={activeEntity.key}
                    entity={activeEntity}
                    index={activeEntityIndex}
                    totalCount={draft.entities.length}
                    onChange={(patchValue) => patchEntity(activeEntity.key, patchValue)}
                    onRemove={() => removeEntity(activeEntity.key)}
                    showTranslations={showTranslations}
                    translations={entityTranslations[activeEntity.key] || {}}
                    onTranslationChange={(loc, field, value) => setEntityTranslation(activeEntity.key, loc, field, value)}
                    locale={locale}
                    dict={dict}
                    isSimpleMode={isSimpleMode}
                    customLabels={draft.custom_labels}
                    availableRoles={effectiveRoles}
                    availableGenders={effectiveGenders}
                    onRegisterTaxonomy={registerTerm}
                  />
                )}

                {/* Horizontal divider between inputs and candidate tiles */}
                <div className="border-t border-border-color my-1" />

                {/* Part 2: Squished Candidate Tiles (matching Tier Lists items) */}
                <CandidateTiles
                  entities={draft.entities}
                  selectedKey={activeEntity?.key || ''}
                  onSelect={(k) => setSelectedEntityKey(k)}
                  onRename={(k, name) => patchEntity(k, { name })}
                  onRemove={(k) => removeEntity(k)}
                  onAdd={addEntity}
                  canAdd={draft.entities.length < SMASH_ROSTER_LIMITS.maxEntities}
                  dict={dict}
                />
              </>
            )}
          </div>
        </Section>
      </div>

      {/* BLOCK 4: CUSTOM ROMANCE ARCHETYPES & PERSONALITY RULES */}
      <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto">
        <Section
          title={c.customArchetypesTitle}
          badge={draft.romance_archetypes.length}
          defaultOpen={false}
        >
          <RomanceArchetypeBuilder
            dict={dict}
            archetypes={draft.romance_archetypes}
            onChange={(archetypes) => patch({ romance_archetypes: archetypes })}
            availableRoles={effectiveRoles}
            availableGenders={effectiveGenders}
            embedded={true}
          />
        </Section>
      </div>

      {/* Feedback Alerts */}
      <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col gap-4">
        <Feedback errors={errors as string[]} saveError={saveError} submitError={submitError} publishError={publishError} dict={dict} />
      </div>

      {/* Cover Image 16:9 Viewport Crop Modal */}
      <CoverImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        imageUrl={draft.cover_image_url}
        themeColor={draft.theme_color}
        isAdmin={isUserAdmin}
        dict={dict}
        onApplyCrop={(croppedUrl) => {
          patch({ cover_image_url: croppedUrl });
          setIsCropModalOpen(false);
        }}
      />
    </div>
  );
}

interface SectionProps {
  title: string;
  badge?: string | number;
  defaultOpen?: boolean;
  headerAction?: React.ReactNode;
  toggleAria?: string;
  children: React.ReactNode;
}

function Section({ title, badge, defaultOpen = true, headerAction, toggleAria, children }: SectionProps) {
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
          <h2 className="text-xs sm:text-sm 2xl:text-base font-black uppercase tracking-widest text-text-primary hover:text-accent-red transition-colors font-mono">
            {title}
          </h2>
          {badge !== undefined && (
            <span className="font-mono text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-bg-elevated border border-border-color text-text-secondary whitespace-nowrap">
              {badge}
            </span>
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

function Feedback({
  errors,
  saveError,
  submitError,
  publishError,
  dict,
}: {
  errors: string[];
  saveError: 'quota' | 'unavailable' | null;
  submitError?: string | null;
  publishError?: string | null;
  dict?: Dictionary | any;
}) {
  const im = dict?.smashOrPass?.importModal || {};
  const saveErrorText = saveError === 'quota' ? im.saveFailedQuota : saveError === 'unavailable' ? im.saveFailedUnavailable : null;
  const messages = [...errors, ...(saveErrorText ? [saveErrorText] : []), ...(submitError ? [submitError] : []), ...(publishError ? [publishError] : [])];
  if (messages.length === 0) return null;
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-accent-red/40 bg-accent-red/10 p-3 text-sm font-semibold text-accent-red text-center">
      {messages.map((m) => (
        <p key={m} className="flex items-center justify-center gap-2">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          {m}
        </p>
      ))}
    </div>
  );
}
