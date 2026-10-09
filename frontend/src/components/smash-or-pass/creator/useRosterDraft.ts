// frontend/src/components/smash-or-pass/creator/useRosterDraft.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { SMASH_ROSTER_LIMITS, TRANSLATABLE_LOCALES } from '@/utils/smashOrPass/constants';
import type { StoredCustomRoster } from '@/types/smashOrPass';
import { DraftEntity, emptyDraftEntity } from './EntityEditor';
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

/** Whether a draft holds anything worth keeping (restoring, or saving over the stored one). */
function draftHasContent(d: Draft): boolean {
  return Boolean(
    d.name.trim() ||
      d.description.trim() ||
      d.cover_image_url.trim() ||
      d.category.trim() ||
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
      (d.custom_roles && d.custom_roles.length > 0) ||
      (d.custom_genders && d.custom_genders.length > 0)
  );
}

interface UseRosterDraftOptions {
  editId?: string;
  editingRoster?: StoredCustomRoster;
  storeHydrated: boolean;
}

/**
 * The roster being built: the draft itself and its translations, restored from (and autosaved to)
 * this browser for a new roster or seeded from the store when editing one, plus the candidate edits.
 */
export function useRosterDraft({ editId, editingRoster, storeHydrated }: UseRosterDraftOptions) {
  const [draft, setDraft] = useState<Draft>(freshDraft);
  const [selectedEntityKey, setSelectedEntityKey] = useState<string>('seed-0');
  const [restored, setRestored] = useState<boolean>(false);
  const [rosterTranslations, setRosterTranslations] = useState<RosterTranslations>({});
  const [entityTranslations, setEntityTranslations] = useState<EntityTranslations>({});
  const [activeTranslationLocale, setActiveTranslationLocale] = useState<string>(TRANSLATABLE_LOCALES[0]);
  const loaded = useRef<boolean>(false);

  // Restore after mount (localStorage is client-only), then autosave -- new
  // rosters only. Editing an existing one is seeded from the store instead
  // (below), never through this scratch-draft key.
  useEffect(() => {
    if (editId) {
      loaded.current = true;
      return;
    }
    const saved = readDraft();
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
    loaded.current = true;
  }, [editId]);

  useEffect(() => {
    if (!restored) return;
    const timer = window.setTimeout(() => {
      setRestored(false);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [restored]);

  useEffect(() => {
    if (!loaded.current || editId || typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    const timer = window.setTimeout(() => {
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
  }, [draft, editId, rosterTranslations, entityTranslations, selectedEntityKey]);

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
  };
}
