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
import { ChevronLeft, Plus, SearchX, TriangleAlert } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import type { Dictionary } from '@/locales/types';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSmashRosterStore } from '@/hooks/useSmashRosterStore';
import { apiUrl } from '@/utils/api';
import { cn } from '@/utils/cn';
import { sanitizeImageUrl, validateSmashRosterDocument, type SmashRosterErrorCode } from '@/utils/smashOrPass/codec';
import { SMASH_ROSTER_LIMITS, TRANSLATABLE_LOCALES } from '@/utils/smashOrPass/constants';
import { createCustomRosterId, saveCustomRoster } from '@/utils/smashOrPass/storage';
import type { SmashRosterDocumentEntity } from '@/types/smashOrPass';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD, LABEL, TEXTAREA_FIELD } from './styles';
import { DraftEntity, EntityEditor, emptyDraftEntity, type EntityTranslationDraft } from './EntityEditor';

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
    // A fixed, non-random key -- this runs as the `useState` initializer, so
    // it executes during SSR too. `newKey()` (crypto.randomUUID/Math.random)
    // would render a different id server- vs. client-side and trigger a
    // hydration mismatch; every *later* entity is added from a click handler
    // (client-only), where `newKey()` is safe.
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
  const { isAdmin, token } = useAuth();
  const { state: storeState, hydrated: storeHydrated } = useSmashRosterStore();
  const editingRoster = editId ? storeState.custom[editId] : undefined;

  const [draft, setDraft] = useState<Draft>(freshDraft);
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
    setDraft({
      name: editingRoster.name,
      description: editingRoster.description || '',
      cover_image_url: editingRoster.cover_image_url || '',
      theme_color: editingRoster.theme_color || '#ff0055',
      category: editingRoster.category || '',
      is_nsfw: editingRoster.is_nsfw || false,
      entities: editingRoster.entities.length ? editingRoster.entities.map(entityFromDocument) : [emptyDraftEntity(newKey())],
    });
  }, [editId, storeHydrated, editingRoster]);

  const patch = (next: Partial<Draft>) => setDraft((d) => ({ ...d, ...next }));
  const patchEntity = (key: string, next: Partial<DraftEntity>) =>
    setDraft((d) => ({ ...d, entities: d.entities.map((e) => (e.key === key ? { ...e, ...next } : e)) }));
  const removeEntity = (key: string) => setDraft((d) => ({ ...d, entities: d.entities.filter((e) => e.key !== key) }));
  const addEntity = () => setDraft((d) => ({ ...d, entities: [...d.entities, emptyDraftEntity(newKey())] }));

  const setEntityTranslation = (entityKey: string, loc: string, field: string, value: string) => {
    setEntityTranslations((prev) => ({
      ...prev,
      [entityKey]: {
        ...prev[entityKey],
        [loc]: { ...prev[entityKey]?.[loc], [field]: value },
      },
    }));
  };

  const nameMissing = !draft.name.trim();
  const trimmedCover = draft.cover_image_url.trim();
  const safeCover = trimmedCover ? sanitizeImageUrl(trimmedCover) : null;
  const coverInvalid = Boolean(trimmedCover) && !safeCover;
  const validEntityCount = draft.entities.filter((e) => e.name.trim()).length;
  const entitiesMissing = validEntityCount === 0;

  const showTranslations = !editId && isAdmin && official;

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
      entities: trimmedEntities.map(toRawEntity),
    };
    const result = validateSmashRosterDocument(rawDoc);
    if (!result.ok) {
      setSubmitError(errorMessage(t, result.error));
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

    if (official && isAdmin) {
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

    const id = createCustomRosterId();
    const saveResult = saveCustomRoster({ id, ...result.doc, createdAt: Date.now() });
    if (!saveResult.ok) {
      setSaveError(saveResult.reason);
      return;
    }
    router.push(`/${locale}/smash-or-pass?roster=local:${id}`);
  };

  const publishingNow = publishing && official && isAdmin && !editId;
  const submitLabel = editId ? (c.save || 'Save Roster') : official && isAdmin ? (publishingNow ? c.saving || 'Saving...' : c.save || 'Save Roster') : c.save || 'Save Roster';

  const errors = attempted
    ? [
        nameMissing && (c.validationNameRequired || 'Give this roster a name.'),
        entitiesMissing && (c.validationEntityRequired || 'Add at least one candidate.'),
        coverInvalid && (c.invalidImage || 'That cover image link is invalid.'),
      ].filter(Boolean)
    : [];

  return (
    <div className="relative z-10 flex flex-col gap-6">
      <header className="flex items-center justify-between border-b border-border-color pb-4 min-h-[44px]">
        <Link
          href={`/${locale}/smash-or-pass`}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-accent-red transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {c.title || 'Create a Roster'}
        </Link>
      </header>

      <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
        <h1 className="text-xl sm:text-2xl font-black font-mono uppercase tracking-wide text-text-primary">
          {editId ? (c.editTitle || 'Edit Roster') : (c.title || 'Create a Roster')}
        </h1>
        <p className="text-sm text-text-muted -mt-4">{c.subtitle || "Name it, add candidates, and it's saved in this browser."}</p>

        <Section title={c.stepBasics || 'The basics'}>
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={LABEL}>{c.nameLabel || 'Roster name'}</span>
              <input
                value={draft.name}
                maxLength={SMASH_ROSTER_LIMITS.maxRosterName}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder={c.namePlaceholder || 'e.g. Chapter 34 Cast'}
                aria-invalid={attempted && nameMissing}
                className={cn(FIELD, attempted && nameMissing && 'border-accent-red')}
              />
            </label>
            <label>
              <span className={LABEL}>{c.categoryLabel || 'Category'}</span>
              <input
                value={draft.category}
                maxLength={64}
                onChange={(e) => patch({ category: e.target.value })}
                placeholder={c.categoryPlaceholder || 'e.g. Custom'}
                className={FIELD}
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
                className={TEXTAREA_FIELD}
              />
            </label>
            <label>
              <span className={LABEL}>{c.coverImageLabel || 'Cover image URL (optional)'}</span>
              <input
                value={draft.cover_image_url}
                onChange={(e) => patch({ cover_image_url: e.target.value })}
                placeholder={c.coverImagePlaceholder || 'https://...'}
                inputMode="url"
                aria-invalid={attempted && coverInvalid}
                className={cn(FIELD, attempted && coverInvalid && 'border-accent-red')}
              />
              {safeCover && (
                <div className="mt-2 h-24 w-full max-w-sm overflow-hidden rounded-xl border border-border-color bg-bg-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element -- live preview of a user-supplied URL */}
                  <img src={safeCover} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                </div>
              )}
            </label>
            <label>
              <span className={LABEL}>{c.themeColorLabel || 'Theme color'}</span>
              <input
                type="color"
                value={draft.theme_color || '#ff0055'}
                onChange={(e) => patch({ theme_color: e.target.value })}
                className="h-11 w-full cursor-pointer rounded-xl border border-border-color bg-bg-primary"
              />
            </label>
            <label className="md:col-span-2 flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={draft.is_nsfw}
                onChange={(e) => patch({ is_nsfw: e.target.checked })}
                className="h-4 w-4 shrink-0 accent-accent-red"
              />
              <span className={cn(LABEL, 'mb-0')}>{c.nsfwLabel || 'Contains NSFW content'}</span>
            </label>
            {isAdmin && !editId && (
              <label className="md:col-span-2 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={official}
                  onChange={(e) => setOfficial(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-accent-red"
                />
                <span>
                  <span className={cn(LABEL, 'block')}>{c.officialLabel || 'Publish as an official roster'}</span>
                  <span className="mt-0.5 block text-xs text-text-muted">
                    {c.officialHint || 'Visible to everyone on the hub instead of only in this browser.'}
                  </span>
                </span>
              </label>
            )}
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

        <Section title={c.stepEntities || 'Candidates'}>
          <div className="flex flex-col gap-3">
            {draft.entities.length === 0 && (
              <p className="text-sm text-text-muted">{c.noEntitiesYet || 'No candidates yet. Add your first one above.'}</p>
            )}
            {draft.entities.map((entity, i) => (
              <EntityEditor
                key={entity.key}
                entity={entity}
                index={i}
                onChange={(patchValue) => patchEntity(entity.key, patchValue)}
                onRemove={() => removeEntity(entity.key)}
                showTranslations={showTranslations}
                translations={entityTranslations[entity.key] || {}}
                onTranslationChange={(loc, field, value) => setEntityTranslation(entity.key, loc, field, value)}
                locale={locale}
                dict={dict}
              />
            ))}
            <button
              type="button"
              onClick={addEntity}
              disabled={draft.entities.length >= SMASH_ROSTER_LIMITS.maxEntities}
              className={cn(BTN_SECONDARY, 'w-fit')}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {c.addEntity || 'Add Candidate'}
            </button>
          </div>
        </Section>

        <Feedback errors={errors as string[]} saveError={saveError} submitError={submitError} publishError={publishError} dict={dict} />

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={submit}
            disabled={publishingNow}
            className={cn(BTN_PRIMARY, 'w-full sm:w-auto min-h-[48px] px-8 text-base', publishingNow && 'opacity-60 cursor-not-allowed')}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border-color bg-bg-surface backdrop-blur-xl shadow-md overflow-hidden flex flex-col">
      <div className="py-4 px-5 sm:py-5 sm:px-7 border-b border-border-color">
        <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-text-primary font-mono text-center">{title}</h2>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
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
    <div role="alert" className="flex flex-col gap-1 rounded-2xl border border-accent-red/40 bg-accent-red/10 p-3 text-sm font-semibold text-accent-red">
      {messages.map((m) => (
        <p key={m} className="flex items-start gap-2">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {m}
        </p>
      ))}
    </div>
  );
}
