// frontend/src/components/smash-or-pass/creator/useRosterSubmit.ts
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDictionary } from '@/context/DictionaryContext';
import { apiUrl } from '@/utils/api';
import { validateSmashRosterDocument } from '@/utils/smashOrPass/codec';
import { createCustomRosterId, saveCustomRoster } from '@/utils/smashOrPass/storage';
import type { StoredCustomRoster } from '@/types/smashOrPass';
import {
  type Draft,
  type EntityTranslations,
  type RosterTranslations,
  DRAFT_KEY,
  buildAdminEntityTranslations,
  buildAdminRosterTranslations,
  errorMessage,
  toRawEntity,
} from './SmashRosterCreatorParts';

interface UseRosterSubmitOptions {
  locale: string;
  editId?: string;
  editingRoster?: StoredCustomRoster;
  draft: Draft;
  official: boolean;
  isUserAdmin: boolean;
  rosterTranslations: RosterTranslations;
  entityTranslations: EntityTranslations;
  nameMissing: boolean;
  entitiesMissing: boolean;
  coverInvalid: boolean;
}

/**
 * Saving the roster: validate it through the same sanitizer an import goes through, then either
 * publish it for everyone (an admin's "Official") or keep it in this browser.
 */
export function useRosterSubmit({
  locale,
  editId,
  editingRoster,
  draft,
  official,
  isUserAdmin,
  rosterTranslations,
  entityTranslations,
  nameMissing,
  entitiesMissing,
  coverInvalid,
}: UseRosterSubmitOptions) {
  const dict = useDictionary();
  const t = dict.smashOrPass;
  const c = t.creator;
  const router = useRouter();
  const isSimpleMode = draft.roster_mode === 'simple';

  const [attempted, setAttempted] = useState(false);
  const [saveError, setSaveError] = useState<'quota' | 'unavailable' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

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
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          // ignore
        }
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
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    router.push(`/${locale}/smash-or-pass?roster=local:${id}`);
  };

  /** Forgets earlier attempts and errors, for when the draft is thrown away. */
  const resetSubmitState = () => {
    setAttempted(false);
    setSubmitError(null);
    setPublishError(null);
  };

  return { submit, attempted, saveError, submitError, publishing, publishError, resetSubmitState };
}
