'use client';
// frontend/src/components/smash-or-pass/creator/useRosterDraft.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultRosterThemeColor, SMASH_ROSTER_LIMITS, TRANSLATABLE_LOCALES } from '@/utils/smashOrPass/constants';
import type { CustomRomanceArchetype, MediaDisplay, StoredCustomRoster } from '@/types/smashOrPass';
import type { DraftEntity, EntityTranslationDraft } from './EntityEditor';
import { emptyDraftEntity } from './EntityEditor';
import {
  type Draft,
  type EntityTranslations,
  type RosterTranslations,
  type StoredDraft,
  DRAFT_KEY,
  entityFromDocument,
  freshDraft,
  newKey,
  readDraft,
} from './SmashRosterCreatorParts';
import { useIsClient } from '@/hooks/useIsClient';

/** Whether a draft holds anything worth keeping (restoring, or saving over the stored one). */
function draftHasContent(d: Draft): boolean {
  const hasCustomRolesChanged = Boolean(
    d.custom_roles && (d.custom_roles.length !== 2 || !d.custom_roles.includes('Survivor') || !d.custom_roles.includes('Killer'))
  );
  const hasCustomGendersChanged = Boolean(
    d.custom_genders && (d.custom_genders.length !== 3 || !d.custom_genders.includes('female') || !d.custom_genders.includes('male') || !d.custom_genders.includes('monster_other'))
  );
  return Boolean(
    d.name.trim() ||
      d.description.trim() ||
      d.cover_image_url.trim() ||
      d.entities.length > 1 ||
      d.entities.some(
        (e) =>
          e.name.trim() ||
          e.media_url.trim() ||
          e.bio.trim() ||
          e.quote.trim() ||
          e.turn_on.trim() ||
          e.dealbreaker.trim() ||
          e.role.trim() ||
          e.gender.trim()
      ) ||
      d.romance_archetypes.length > 0 ||
      hasCustomRolesChanged ||
      hasCustomGendersChanged
  );
}

export interface OfficialEntityDetail {
  slug: string;
  name: string;
  real_name?: string | null;
  role: string;
  gender: string;
  media_url?: string | null;
  media_display?: MediaDisplay | null;
  archetype?: string | null;
  bio?: string | null;
  tagline?: string | null;
  quote?: string | null;
  meme?: string | null;
  turn_on?: string | null;
  dealbreaker?: string | null;
  dating_vibe?: string | null;
  red_flags?: string[] | null;
  green_flags?: string[] | null;
  watermark_left?: string | null;
  watermark_right?: string | null;
  translations?: Record<string, EntityTranslationDraft> | null;
  metadata?: Record<string, unknown> | null;
}

export interface OfficialRosterDetail {
  slug: string;
  name: string;
  description?: string | null;
  cover_image_url?: string | null;
  theme_color?: string | null;
  category?: string | null;
  is_nsfw?: boolean | null;
  is_active?: boolean | null;
  translations?: Record<string, { name?: string; description?: string }> | null;
  romance_archetypes?: CustomRomanceArchetype[] | null;
  entities: OfficialEntityDetail[];
}

interface UseRosterDraftOptions {
  editId?: string;
  editingRoster?: StoredCustomRoster;
  storeHydrated: boolean;
  officialSlug?: string;
  officialRoster?: OfficialRosterDetail | null;
}

/**
 * The roster being built: the draft itself and its translations, restored from (and autosaved to)
 * this browser for a new roster or seeded from the store when editing one, plus the candidate edits.
 */
export function useRosterDraft({ editId, editingRoster, storeHydrated, officialSlug, officialRoster }: UseRosterDraftOptions) {
  const [draft, setDraft] = useState<Draft>(freshDraft);
  const [selectedEntityKey, setSelectedEntityKey] = useState<string>('seed-0');
  const [restored, setRestored] = useState<boolean>(false);
  const [rosterTranslations, setRosterTranslations] = useState<RosterTranslations>({});
  const [entityTranslations, setEntityTranslations] = useState<EntityTranslations>({});
  const [activeTranslationLocale, setActiveTranslationLocale] = useState<string>(TRANSLATABLE_LOCALES[0]);
  const isSubmittingRef = useRef<boolean>(false);
  const setIsSubmitting = (submitting: boolean) => {
    isSubmittingRef.current = submitting;
  };

  // Restore once running in the browser (localStorage is client-only, so the server and the
  // hydrating render show the empty draft), while rendering; then autosave -- new rosters only.
  // Editing an existing one is seeded from the store instead (below), never through this
  // scratch-draft key.
  const isClient = useIsClient();
  const [draftReadFor, setDraftReadFor] = useState<string | null | undefined>(undefined);
  if (isClient && draftReadFor !== (editId ?? null)) {
    setDraftReadFor(editId ?? null);
    const saved = editId ? null : readDraft();
    const hasMeaningfulContent = Boolean(saved && draftHasContent(saved));
    if (saved && hasMeaningfulContent) {
      setDraft(saved);
      if (saved.selectedEntityKey && saved.entities.some((e) => e.key === saved.selectedEntityKey)) {
        setSelectedEntityKey(saved.selectedEntityKey);
      } else if (saved.entities.length > 0) {
        setSelectedEntityKey(saved.entities[0].key);
      }
      if (saved.rosterTranslations) {
        setRosterTranslations(saved.rosterTranslations);
      }
      if (saved.entityTranslations) {
        setEntityTranslations(saved.entityTranslations);
      }
      setRestored(true);
    }
  }
  const draftLoaded = draftReadFor !== undefined;

  useEffect(() => {
    if (!restored) return;
    const timer = window.setTimeout(() => {
      setRestored(false);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [restored]);

  useEffect(() => {
    if (!draftLoaded || editId || officialSlug || isSubmittingRef.current || typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    const timer = window.setTimeout(() => {
      if (isSubmittingRef.current) return;
      try {
        const hasContent = draftHasContent(draft);
        if (hasContent) {
          const payload: StoredDraft = {
            ...draft,
            rosterTranslations,
            entityTranslations,
            selectedEntityKey,
          };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        // Storage full or unavailable
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, draftLoaded, editId, officialSlug, rosterTranslations, entityTranslations, selectedEntityKey]);

  // Edit mode: once the store has hydrated, the draft starts from the saved roster -- once per
  // `editId` (adjusted while rendering, so the empty form never paints first).
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (editId && storeHydrated && seededFor !== editId) {
    setSeededFor(editId);
    if (editingRoster) seedFromRoster(editingRoster);
  } else if (officialSlug && officialRoster && seededFor !== `official:${officialSlug}`) {
    setSeededFor(`official:${officialSlug}`);
    seedFromOfficialRoster(officialRoster);
  }

  function seedFromOfficialRoster(roster: OfficialRosterDetail) {
    const seededEntities: DraftEntity[] = roster.entities.length
      ? roster.entities.map((e, idx) => {
          const meta = (e.metadata || {}) as Record<string, unknown>;
          const redFlags = e.red_flags ?? meta.red_flags;
          const greenFlags = e.green_flags ?? meta.green_flags;
          return {
            key: `official-entity-${e.slug || idx}`,
            slug: e.slug,
            name: e.name,
            real_name: e.real_name ?? (meta.real_name as string) ?? '',
            role: e.role,
            gender: e.gender,
            media_url: e.media_url || '',
            media_display: e.media_display || null,
            archetype: e.archetype ?? (meta.archetype as string) ?? '',
            bio: e.bio ?? (meta.bio as string) ?? '',
            tagline: e.tagline ?? (meta.tagline as string) ?? '',
            quote: e.quote ?? (meta.quote as string) ?? '',
            meme: e.meme ?? (meta.meme as string) ?? '',
            turn_on: e.turn_on ?? (meta.turn_on as string) ?? '',
            dealbreaker: e.dealbreaker ?? (meta.dealbreaker as string) ?? '',
            dating_vibe: e.dating_vibe ?? (meta.dating_vibe as string) ?? '',
            red_flags: Array.isArray(redFlags) ? redFlags.join('\n') : ((redFlags as string) || ''),
            green_flags: Array.isArray(greenFlags) ? greenFlags.join('\n') : ((greenFlags as string) || ''),
            watermark_left: e.watermark_left ?? (meta.watermark_left as string) ?? '',
            watermark_right: e.watermark_right ?? (meta.watermark_right as string) ?? '',
          };
        })
      : [emptyDraftEntity(newKey())];

    setDraft({
      name: roster.name,
      description: roster.description || '',
      cover_image_url: roster.cover_image_url || '',
      theme_color: roster.theme_color || defaultRosterThemeColor(),
      is_nsfw: Boolean(roster.is_nsfw),
      is_active: roster.is_active !== false,
      roster_mode: 'full',
      custom_labels: {},
      custom_roles: Array.from(new Set(roster.entities.map((e) => e.role).filter(Boolean))),
      custom_genders: Array.from(new Set(roster.entities.map((e) => e.gender).filter(Boolean))),
      romance_archetypes: roster.romance_archetypes || [],
      entities: seededEntities,
    });
    if (seededEntities.length > 0) {
      setSelectedEntityKey(seededEntities[0].key);
    }
    if (roster.translations) {
      const rTrans: RosterTranslations = {};
      for (const [loc, val] of Object.entries(roster.translations)) {
        if (val) {
          rTrans[loc] = { name: val.name || '', description: val.description || '' };
        }
      }
      setRosterTranslations(rTrans);
    }
    const eTranslations: EntityTranslations = {};
    roster.entities.forEach((e, idx) => {
      const k = `official-entity-${e.slug || idx}`;
      const meta = (e.metadata || {}) as Record<string, unknown>;
      const trans = e.translations || meta.translations;
      if (trans && typeof trans === 'object') {
        const normalizedTrans: Record<string, EntityTranslationDraft> = {};
        for (const [loc, t] of Object.entries(trans as Record<string, unknown>)) {
          if (t && typeof t === 'object') {
            const entry = t as Record<string, unknown>;
            normalizedTrans[loc] = {
              ...(entry as unknown as EntityTranslationDraft),
              red_flags: Array.isArray(entry.red_flags) ? entry.red_flags.join('\n') : (typeof entry.red_flags === 'string' ? entry.red_flags : ''),
              green_flags: Array.isArray(entry.green_flags) ? entry.green_flags.join('\n') : (typeof entry.green_flags === 'string' ? entry.green_flags : ''),
            };
          }
        }
        eTranslations[k] = normalizedTrans;
      }
    });
    setEntityTranslations(eTranslations);
  }
  function seedFromRoster(editingRoster: StoredCustomRoster) {
    const seededEntities = editingRoster.entities.length
      ? editingRoster.entities.map(entityFromDocument)
      : [emptyDraftEntity(newKey())];
    setDraft({
      name: editingRoster.name,
      description: editingRoster.description || '',
      cover_image_url: editingRoster.cover_image_url || '',
      theme_color: editingRoster.theme_color || defaultRosterThemeColor(),
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
  }

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

  /** Throws the draft away for a blank one. */
  const resetDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    const fresh = freshDraft();
    setDraft(fresh);
    setSelectedEntityKey(fresh.entities[0]?.key || 'seed-0');
    setRosterTranslations({});
    setEntityTranslations({});
    setRestored(false);
  };

  return {
    draft,
    patch,
    patchEntity,
    addEntity,
    removeEntity,
    activeEntity,
    activeEntityIndex,
    setSelectedEntityKey,
    restored,
    setRestored,
    resetDraft,
    rosterTranslations,
    setRosterTranslations,
    entityTranslations,
    setEntityTranslation,
    activeTranslationLocale,
    setActiveTranslationLocale,
    isSubmittingRef,
    setIsSubmitting,
  };
}
