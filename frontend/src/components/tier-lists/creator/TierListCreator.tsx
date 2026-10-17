'use client';
// frontend/src/components/tier-lists/creator/TierListCreator.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { History, SearchX } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { AuthRequiredState } from '@/components/common/AuthRequiredState';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useTierListStore } from '@/hooks/useTierListStore';
import { useTierListTemplate } from '@/hooks/useTierListTemplates';
import { createOfficialTierList, updateOfficialTierList } from '@/services/tierListApi';
import { apiUrl, authFetch, staticUrl } from '@/utils/api';
import { cn } from '@/utils/cn';
import { resolveTiers } from '@/utils/tierLists/board';
import { normalizePlacements, sanitizeImageUrl } from '@/utils/tierLists/codec';
import { TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import {
  type FeelingLabelKey,
  appendItems,
  buildLadder,
  estimateStoredBytes,
} from '@/utils/tierLists/creator';
import { createCustomListId, saveCustomList } from '@/utils/tierLists/storage';
import { acknowledgeNsfwContent } from '@/utils/nsfwAck';
import { LABEL, TOUCH_FIELD } from '../styles';
import { CreatorItems } from './CreatorItems';
import { CreatorPreviewModal } from './CreatorPreview';
import { type IncomingItem, ItemSources } from './ItemSources';
import { LadderEditor } from './LadderEditor';
import { Checkbox } from '@/components/common/Checkbox';
import { Tooltip } from '@/components/common/Tooltip';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { type Draft, readDraft, DRAFT_KEY, Section, STORAGE_WARN_BYTES, formatBytes, Feedback } from "./TierListCreatorParts";
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";
import { Toast } from '@/components/common/Toast';

/** The creator's column: as wide as the workspace allows. */
const WORKSPACE_COLUMN = 'w-full max-w-4xl 2xl:max-wide-2k:max-w-6xl wide-2k:max-w-workspace mx-auto';

interface TierListCreatorProps {
  locale: string;
  /** A custom list id to edit in place, instead of building a new one. */
  editId?: string;
  /** Admin-only: an official custom tier list slug to edit in the database. */
  officialSlug?: string;
}

export function TierListCreator({ locale, editId, officialSlug }: TierListCreatorProps) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const c = t.creator;
  const router = useRouter();
  const { isAdmin, isLoading: authLoading, token, isAuthenticated } = useAuth();
  const { state: storeState, hydrated: storeHydrated } = useTierListStore();
  const editingList = editId ? storeState.custom[editId] : undefined;
  const { template: officialTemplate, loading: officialLoading } = useTierListTemplate(officialSlug ?? null, locale);

  const translateFeeling = useCallback((key: FeelingLabelKey) => c.feelings[key], [c.feelings]);
  const freshDraft = useCallback(
    (): Draft => ({
      title: '',
      description: '',
      tiers: buildLadder('classic', translateFeeling),
      items: [],
      preset: 'classic',
      backgroundImage: '',
      is_nsfw: false,
    }),
    [translateFeeling]
  );

  const [draft, setDraft] = useState<Draft>(freshDraft);
  const [restored, setRestored] = useState<boolean>(false);
  const [attempted, setAttempted] = useState<boolean>(false);
  const [skipped, setSkipped] = useState<number>(0);
  const [saveError, setSaveError] = useState<'quota' | 'unavailable' | null>(null);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [official, setOfficial] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const loaded = useRef<boolean>(false);

  const isEditing = Boolean(editId || officialSlug);

  useDocumentTitle(
    editId
      ? `LemonDBD - ${editingList?.title || t.untitled}`
      : officialSlug
        ? `LemonDBD - ${officialTemplate?.title || t.untitled}`
        : c.pageTitle
  );

  // Restore after mount (localStorage is client-only), then autosave -- new
  // lists only. Editing an existing one is seeded from the store instead
  // (below), never through this scratch-draft key.
  useEffect(() => {
    if (isEditing) {
      loaded.current = true;
      return;
    }
    const saved = readDraft();
    if (saved && (saved.title || saved.items.length)) {
      setDraft(saved);
      setRestored(true);
    }
    loaded.current = true;
  }, [isEditing]);

  useEffect(() => {
    if (!restored) return;
    const timer = window.setTimeout(() => {
      setRestored(false);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [restored]);

  useEffect(() => {
    if (!loaded.current || isEditing) return;
    const timer = window.setTimeout(() => {
      try {
        if (draft.title || draft.description || draft.items.length) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        else localStorage.removeItem(DRAFT_KEY);
      } catch {
        // A draft that does not fit is not worth an error -- the list itself reports on create.
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, isEditing]);

  // Edit mode: once the store has hydrated, seed the draft from the saved
  // list -- once per `editId`, so it doesn't clobber in-progress edits on
  // every unrelated re-render (e.g. the autosave-like effects above don't
  // apply here, but the store itself can re-emit for other reasons).
  const editSeeded = useRef<string | null>(null);
  useEffect(() => {
    if (!editId || !storeHydrated || editSeeded.current === editId) return;
    editSeeded.current = editId;
    if (!editingList) return; // not found -- the fallback view below takes over
    setDraft({
      title: editingList.title,
      description: editingList.description,
      tiers: editingList.tiers,
      items: editingList.items,
      preset: null,
      backgroundImage: editingList.backgroundImage ?? '',
      is_nsfw: editingList.is_nsfw === true,
    });
  }, [editId, storeHydrated, editingList]);

  useEffect(() => {
    if (!officialSlug || !officialTemplate || editSeeded.current === `official:${officialSlug}`) return;
    editSeeded.current = `official:${officialSlug}`;
    setDraft({
      title: officialTemplate.title,
      description: officialTemplate.description ?? '',
      tiers: resolveTiers(null, officialTemplate.tiers),
      items: (officialTemplate.custom_items ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        ...(item.image_url
          ? { image: item.image_url }
          : item.image_local_path
          ? { image: item.image_local_path.startsWith('/static/') ? item.image_local_path : staticUrl(item.image_local_path) }
          : {}),
      })),
      preset: null,
      backgroundImage: officialTemplate.cover_image_url ?? '',
      is_nsfw: officialTemplate.is_nsfw === true,
    });
  }, [officialSlug, officialTemplate]);

  const patch = (next: Partial<Draft>) => setDraft((d) => ({ ...d, ...next }));

  const addItems = (incoming: IncomingItem[]) => {
    // Catalog portraits are remote URLs; everything goes through the same
    // image allow-list an imported JSON would.
    const safe = incoming.map((i) => {
      const image = i.image ? sanitizeImageUrl(i.image) : null;
      return { name: i.name, id: i.id, ...(image ? { image } : {}) };
    });
    const result = appendItems(draft.items, safe);
    setSkipped(result.skipped);
    patch({ items: result.items });
  };

  const existingIds = useMemo(() => new Set(draft.items.map((i) => i.id)), [draft.items]);
  const bytes = useMemo(() => estimateStoredBytes(draft.items), [draft.items]);
  const hasInlineImages = draft.items.some((i) => i.image?.startsWith('data:'));

  const titleMissing = !draft.title.trim();
  const itemsMissing = draft.items.length === 0;
  const trimmedBackground = draft.backgroundImage.trim();
  const safeBackground = trimmedBackground ? sanitizeImageUrl(trimmedBackground) : null;
  const backgroundInvalid = Boolean(trimmedBackground) && !safeBackground;

  if (authLoading) {
    return <div className="min-h-100" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="relative z-10 flex flex-col gap-2">
        <AuthRequiredState
          title={t.authRequiredTitle}
          subtitle={t.authRequiredDesc}
        />
      </div>
    );
  }

  // Editing a list the store doesn't have (deleted, or a stale/bad link), or a
  // non-admin attempting to edit an official list: nothing to prefill.
  if (
    (editId && storeHydrated && !editingList) ||
    (officialSlug && !authLoading && !isAdmin) ||
    (officialSlug && !officialLoading && (!officialTemplate || officialTemplate.kind !== 'custom'))
  ) {
    return (
      <div className="relative z-10 flex flex-col gap-2">
        <EmptyState icon={SearchX} title={t.customNotFoundTitle} subtitle={t.customNotFoundSubtitle} />
      </div>
    );
  }

  const submit = async () => {
    setAttempted(true);
    if (titleMissing || itemsMissing || backgroundInvalid) return;
    const payload = {
      title: draft.title.trim().slice(0, TIER_LIST_LIMITS.maxTitle),
      description: draft.description.trim().slice(0, TIER_LIST_LIMITS.maxDescription),
      tiers: draft.tiers.map((tier) => ({ ...tier, label: tier.label.trim() || tier.id })),
      items: draft.items.map((i) => ({ ...i, name: i.name.trim() || i.id })),
      ...(safeBackground ? { backgroundImage: safeBackground } : {}),
      ...(draft.is_nsfw ? { is_nsfw: true } : {}),
    };

    if (officialSlug && isAdmin) {
      setPublishError(null);
      setPublishing(true);
      try {
        await updateOfficialTierList(
          officialSlug,
          {
            title: payload.title,
            description: payload.description,
            cover_image_url: safeBackground ?? null,
            tiers: payload.tiers.map((tier) => ({
              id: tier.id,
              label: tier.label,
              color: tier.color,
              ...(tier.backgroundImage ? { backgroundImage: tier.backgroundImage } : {}),
            })),
            items: payload.items.map((i) => ({
              id: i.id,
              name: i.name,
              ...(i.image ? { image_url: i.image } : {}),
            })),
            is_nsfw: draft.is_nsfw,
          },
          locale,
          token
        );
        router.push(`/${locale}/tier-lists/${officialSlug}`);
      } catch (err) {
        setPublishError(err instanceof Error ? err.message : c.publishFailed);
        setPublishing(false);
      }
      return;
    }

    if (editId && editingList) {
      // Editing in place: normalize placements against current tiers and items
      // so orphaned keys do not inflate the ranked count.
      const itemIds = new Set(payload.items.map((i) => i.id));
      const normalizedPlacements = normalizePlacements(
        editingList.placements,
        payload.tiers.map((t) => t.id),
        (k) => itemIds.has(k)
      ).placements;
      const result = saveCustomList({
        id: editId,
        ...payload,
        placements: normalizedPlacements,
        createdAt: editingList.createdAt,
      });
      if (!result.ok) {
        setSaveError(result.reason);
        return;
      }
      // The author knows what is in their own list: no confirmation screen right after saving it.
      if (draft.is_nsfw) acknowledgeNsfwContent('tier_list', editId);
      router.push(`/${locale}/tier-lists/custom/${editId}`);
      return;
    }

    if (official && isAdmin) {
      setPublishError(null);
      setPublishing(true);
      try {
        const created = await createOfficialTierList(
          {
            title: payload.title,
            description: payload.description,
            cover_image_url: safeBackground ?? null,
            tiers: payload.tiers.map((tier) => ({
              id: tier.id,
              label: tier.label,
              color: tier.color,
              ...(tier.backgroundImage ? { backgroundImage: tier.backgroundImage } : {}),
            })),
            items: payload.items.map((i) => ({
              id: i.id,
              name: i.name,
              ...(i.image ? { image_url: i.image } : {}),
            })),
            is_nsfw: draft.is_nsfw,
          },
          locale,
          token
        );
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          // ignore
        }
        router.push(`/${locale}/tier-lists/${created.slug}`);
      } catch (err) {
        setPublishError(err instanceof Error ? err.message : c.publishFailed);
        setPublishing(false);
      }
      return;
    }

    const id = createCustomListId();
    const result = saveCustomList({ id, ...payload, placements: {}, createdAt: Date.now() });
    if (!result.ok) {
      setSaveError(result.reason);
      return;
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    if (draft.is_nsfw) acknowledgeNsfwContent('tier_list', id);
    router.push(`/${locale}/tier-lists/custom/${id}`);
  };

  const startOver = () => {
    setDraft(freshDraft());
    setRestored(false);
    setAttempted(false);
  };

  const publishingNow = publishing && isAdmin && (official || Boolean(officialSlug));
  const submitLabel = isEditing ? (publishingNow ? c.publishing : t.save) : official && isAdmin ? (publishingNow ? c.publishing : c.publish) : c.create;
  const submitButton = (extra?: string) => (
    <Button
      variant="primary"
      data-tier-create=""
      onClick={submit}
      disabled={publishingNow}
      className={cn(extra ?? 'min-h-12 2xl:min-h-hit-2xl px-8 2xl:px-10 text-base 2xl:text-lg')}
    >
      {submitLabel}
    </Button>
  );

  const errors = attempted
    ? [titleMissing && c.titleRequired, itemsMissing && c.itemsRequired, backgroundInvalid && t.invalidImage].filter(Boolean)
    : [];

  return (
    <div className="relative z-10 flex flex-col gap-6 2xl:gap-8 max-w-7xl 2xl:max-wide-2k:max-w-workspace wide-2k:max-w-workspace-xl mx-auto w-full px-4 sm:px-6">
      <h1 className="sr-only">{isEditing ? t.editDetails : c.pageTitle}</h1>
      {restored && (
        <Toast
          icon={<History className="h-4 w-4 2xl:h-5 2xl:w-5" aria-hidden="true" />}
          message={c.draftRestored}
          actions={
            <Button variant="secondary" size="sm" onClick={startOver} className="whitespace-nowrap">
              {c.startOver}
            </Button>
          }
          onDismiss={() => setRestored(false)}
          dismissLabel={c.closeToast}
        />
      )}

      {/* THE BASICS BLOCK */}
      <div className={WORKSPACE_COLUMN}>
        <Section title={c.stepBasics}>
          <div className="grid gap-4 2xl:gap-6 md:grid-cols-2">
            <label className="md:col-span-1">
              <span className={LABEL}>
                {c.titleLabel}
                <span className="text-accent-red"> *</span>
              </span>
              <Input
                value={draft.title}
                maxLength={TIER_LIST_LIMITS.maxTitle}
                onChange={(e) => patch({ title: e.target.value })}
                invalid={attempted && titleMissing}
                className={cn(TOUCH_FIELD, '2xl:min-h-hit-xl 2xl:text-base')}
              />
            </label>
            <label className="md:col-span-1">
              <span className={LABEL}>{c.descriptionLabel}</span>
              <Input
                value={draft.description}
                maxLength={TIER_LIST_LIMITS.maxDescription}
                onChange={(e) => patch({ description: e.target.value })}
                className={cn(TOUCH_FIELD, '2xl:min-h-hit-xl 2xl:text-base')}
              />
            </label>
            <label className="md:col-span-2">
              <span className={LABEL}>{c.backgroundImageLabel}</span>
              <Input
                value={draft.backgroundImage}
                onChange={(e) => patch({ backgroundImage: e.target.value })}
                placeholder={c.backgroundImagePlaceholder}
                inputMode="url"
                invalid={attempted && backgroundInvalid}
                className={cn(TOUCH_FIELD, '2xl:min-h-hit-xl 2xl:text-base')}
              />
              <span
                className={cn(
                  'mt-1 block text-xs 2xl:text-sm',
                  attempted && backgroundInvalid ? 'font-semibold text-accent-red' : 'text-text-muted'
                )}
              >
                {attempted && backgroundInvalid ? t.invalidImage : c.backgroundImageHint}
              </span>
              {safeBackground && (
                <div className="mt-2 h-24 w-full max-w-sm mx-auto overflow-hidden rounded-chip border border-border-color bg-bg-elevated">
                  <img src={safeBackground} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                </div>
              )}
            </label>
            <div className="md:col-span-2 flex flex-col items-start gap-3">
              <Tooltip variant="action" title={t.nsfw.label} description={t.nsfw.hint}>
                <Checkbox checked={draft.is_nsfw} onChange={(checked) => patch({ is_nsfw: checked })} className="gap-2.5">
                  <span className={cn(LABEL, 'mb-0 inline')}>{t.nsfw.label}</span>
                </Checkbox>
              </Tooltip>
              {isAdmin && !isEditing && (
                <Checkbox checked={official} onChange={setOfficial} className="gap-2.5">
                  <span className={cn(LABEL, 'mb-0 inline')}>{c.official}</span>
                </Checkbox>
              )}
            </div>
          </div>
        </Section>
      </div>

      {/* TIERS BLOCK */}
      <div className={WORKSPACE_COLUMN}>
        <Section title={c.stepTiers}>
          <LadderEditor
            tiers={draft.tiers}
            activePreset={draft.preset}
            onChange={(tiers) => patch({ tiers, preset: null })}
            onPreset={(id) => patch({ tiers: buildLadder(id, translateFeeling), preset: id })}
          />
        </Section>
      </div>

      {/* ITEMS BLOCK */}
      <div className={WORKSPACE_COLUMN}>
        <Section title={c.stepItems}>
          <div className="flex flex-col gap-6 2xl:gap-8">
            <ItemSources onAdd={addItems} existingIds={existingIds} locale={locale} />
            {skipped > 0 && (
              <p role="status" className="text-xs 2xl:text-sm font-semibold text-accent-amber">
                {formatMessage(c.itemsSkipped, { count: skipped }, locale)}
              </p>
            )}
            <CreatorItems
              items={draft.items}
              onRename={(id, name) =>
                setDraft((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, name } : i)) }))
              }
              onUpdateItem={(id, patch) =>
                setDraft((d) => ({
                  ...d,
                  items: d.items.map((i) => {
                    if (i.id !== id) return i;
                    const nextItem: typeof i = { id: i.id, name: patch.name };
                    if (patch.image) nextItem.image = patch.image;
                    return nextItem;
                  }),
                }))
              }
              onRemove={(id) => setDraft((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }))}
              onClear={() => patch({ items: [] })}
            />
            {hasInlineImages && (
              <p className={cn('text-xs 2xl:text-sm', bytes > STORAGE_WARN_BYTES ? 'font-semibold text-accent-amber' : 'text-text-muted')}>
                {formatMessage(c.storageUsage, { size: formatBytes(bytes, locale) })}{' '}
                {bytes > STORAGE_WARN_BYTES && c.storageWarning}
              </p>
            )}
          </div>
        </Section>
      </div>

      {/* Preview and save, centered under all the sections. */}
      <div className="flex flex-wrap items-center justify-center gap-3 2xl:gap-4">
        <Button
          variant="secondary"
          onClick={() => setPreviewOpen(true)}
          className="min-h-11 2xl:min-h-hit-xl px-6 2xl:px-8 uppercase tracking-wider"
        >
          {c.previewHeading}
        </Button>
        {submitButton('min-h-11 2xl:min-h-hit-xl px-6 2xl:px-8 text-sm 2xl:text-base font-bold uppercase tracking-wider')}
      </div>

      {/* Feedback Alerts */}
      <div className={`${WORKSPACE_COLUMN} flex flex-col gap-4`}>
        <Feedback errors={errors as string[]} saveError={saveError} publishError={publishError} />
      </div>

      <CreatorPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={draft.title}
        description={draft.description}
        tiers={draft.tiers}
        items={draft.items}
        backgroundImage={safeBackground}
        isNsfw={draft.is_nsfw}
        locale={locale}
      />
    </div>
  );
}
