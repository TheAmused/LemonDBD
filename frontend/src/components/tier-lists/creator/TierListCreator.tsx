'use client';
// frontend/src/components/tier-lists/creator/TierListCreator.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronLeft, History, SearchX, TriangleAlert, X } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import type { TierDefinition, TierListDocumentItem } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useTierListStore } from '@/hooks/useTierListStore';
import { apiUrl } from '@/utils/api';
import { cn } from '@/utils/cn';
import { sanitizeImageUrl } from '@/utils/tierLists/codec';
import { TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import {
  type FeelingLabelKey,
  type LadderPresetId,
  appendItems,
  buildLadder,
  estimateStoredBytes,
} from '@/utils/tierLists/creator';
import { createCustomListId, migrateTierListState, saveCustomList } from '@/utils/tierLists/storage';
import { LABEL, TOUCH_FIELD } from '../styles';
import { CreatorItems } from './CreatorItems';
import { CreatorPreviewModal } from './CreatorPreview';
import { type IncomingItem, ItemSources } from './ItemSources';
import { LadderEditor } from './LadderEditor';
import { Checkbox } from '@/components/common/Checkbox';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";

/** Unfinished work survives a reload or an accidental back-navigation. Only
 * used for a brand-new list -- editing an existing one (see `editId` below)
 * loads straight from the saved list instead, so it can't collide with this. */
const DRAFT_KEY = 'lemondbd_tier_list_draft';
/** Past this, a list is close to crowding out everything else in localStorage (~5 MB). */
const STORAGE_WARN_BYTES = 2.5 * 1024 * 1024;

interface Draft {
  title: string;
  description: string;
  tiers: TierDefinition[];
  items: TierListDocumentItem[];
  preset: LadderPresetId | null;
  /** An https:/data: image shown behind the list's card and page. Empty means none. */
  backgroundImage: string;
}

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    // Reuse the storage layer's defensive reader for tiers and items.
    const checked = migrateTierListState({
      custom: { draft: { title: parsed.title, tiers: parsed.tiers, items: parsed.items, placements: {} } },
    }).custom.draft;
    if (!checked) return null;
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      tiers: checked.tiers,
      items: checked.items,
      preset: (parsed.preset as LadderPresetId | null) ?? null,
      backgroundImage: typeof parsed.backgroundImage === 'string' ? parsed.backgroundImage : '',
    };
  } catch {
    return null;
  }
}

function formatBytes(bytes: number, locale: string): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1
    ? `${mb.toLocaleString(locale, { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024)).toLocaleString(locale)} KB`;
}

interface TierListCreatorProps {
  locale: string;
  /** A custom list id to edit in place, instead of building a new one. */
  editId?: string;
}

export function TierListCreator({ locale, editId }: TierListCreatorProps) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const c = t.creator;
  const router = useRouter();
  const { isAdmin, token } = useAuth();
  const { state: storeState, hydrated: storeHydrated } = useTierListStore();
  const editingList = editId ? storeState.custom[editId] : undefined;

  const translateFeeling = useCallback((key: FeelingLabelKey) => c.feelings[key], [c.feelings]);
  const freshDraft = useCallback(
    (): Draft => ({
      title: '',
      description: '',
      tiers: buildLadder('classic', translateFeeling),
      items: [],
      preset: 'classic',
      backgroundImage: '',
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

  useDocumentTitle(editId ? `LemonDBD - ${editingList?.title || t.untitled}` : c.pageTitle);

  // Restore after mount (localStorage is client-only), then autosave -- new
  // lists only. Editing an existing one is seeded from the store instead
  // (below), never through this scratch-draft key.
  useEffect(() => {
    if (editId) {
      loaded.current = true;
      return;
    }
    const saved = readDraft();
    if (saved && (saved.title || saved.items.length)) {
      setDraft(saved);
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
    if (!loaded.current || editId) return;
    const timer = window.setTimeout(() => {
      try {
        if (draft.title || draft.description || draft.items.length) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        else localStorage.removeItem(DRAFT_KEY);
      } catch {
        // A draft that does not fit is not worth an error -- the list itself reports on create.
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, editId]);

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
    });
  }, [editId, storeHydrated, editingList]);

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

  // Editing a list the store doesn't have (deleted, or a stale/bad link):
  // nothing to prefill, so send them back rather than silently falling
  // through to "create a new list" under someone else's edit link.
  if (editId && storeHydrated && !editingList) {
    return (
      <div className="relative z-10 flex flex-col gap-2">
        <Link
          href={`/${locale}/tier-lists`}
          className="inline-flex min-h-[44px] w-fit items-center gap-1 type-label-sm text-text-secondary hover:text-accent-red"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {t.backToHub}
        </Link>
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
    };

    if (editId && editingList) {
      // Editing in place: keep the id, its rankings and its creation date --
      // only the fields the creator actually edits are replaced.
      const result = saveCustomList({
        id: editId,
        ...payload,
        placements: editingList.placements,
        createdAt: editingList.createdAt,
      });
      if (!result.ok) {
        setSaveError(result.reason);
        return;
      }
      router.push(`/${locale}/tier-lists/custom/${editId}`);
      return;
    }

    if (official && isAdmin) {
      setPublishError(null);
      setPublishing(true);
      try {
        const res = await fetch(apiUrl('/api/v1/tier-lists'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: payload.title,
            description: payload.description,
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
            ...(safeBackground ? { cover_image_url: safeBackground } : {}),
          }),
        });
        if (!res.ok) {
          const errorData: { error?: string } = await res.json().catch(() => ({}));
          setPublishError(errorData.error || c.publishFailed);
          setPublishing(false);
          return;
        }
        const body: { data: { slug: string } } = await res.json();
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          // ignore
        }
        router.push(`/${locale}/tier-lists/${body.data.slug}`);
      } catch {
        setPublishError(c.publishFailed);
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
    router.push(`/${locale}/tier-lists/custom/${id}`);
  };

  const startOver = () => {
    setDraft(freshDraft());
    setRestored(false);
    setAttempted(false);
  };

  const publishingNow = publishing && official && isAdmin && !editId;
  const submitLabel = editId ? t.save : official && isAdmin ? (publishingNow ? c.publishing : c.publish) : c.create;
  const submitButton = (extra?: string) => (
    <Button
      variant="primary"
      data-tier-create=""
      onClick={submit}
      disabled={publishingNow}
      className={cn(
        'rounded-lg',
        extra ?? 'min-h-[48px] 2xl:min-h-[54px] px-8 2xl:px-10 text-base 2xl:text-lg'
      )}
    >
      {submitLabel}
    </Button>
  );

  const errors = attempted
    ? [titleMissing && c.titleRequired, itemsMissing && c.itemsRequired, backgroundInvalid && t.invalidImage].filter(Boolean)
    : [];

  return (
    <div className="relative z-10 flex flex-col gap-6 2xl:gap-8 max-w-7xl 2xl:max-wide-2k:max-w-[1800px] wide-2k:max-w-[2400px] mx-auto w-full px-4 sm:px-6">
      <h1 className="sr-only">{editId ? t.editDetails : c.pageTitle}</h1>
      {restored && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 right-5 z-50 flex max-w-md w-[calc(100vw-2.5rem)] sm:w-auto items-center gap-3 rounded-xl border border-accent-amber/40 bg-bg-surface/95 backdrop-blur-xl p-3 2xl:p-4 shadow-2xl text-xs sm:text-sm 2xl:text-base font-semibold text-text-primary animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <History className="h-4 w-4 2xl:h-5 2xl:w-5 text-accent-amber shrink-0" aria-hidden="true" />
          <span className="flex-1 text-accent-amber">{c.draftRestored}</span>
          <Button variant="secondary" size="sm" onClick={startOver} className="min-h-[32px] whitespace-nowrap">
            {c.startOver}
          </Button>
          <Button icon size="sm" variant="ghost" onClick={() => setRestored(false)} aria-label={c.closeToast}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* TOP ROW: IN-LINE NAVIGATION (LEFT), THE BASICS BLOCK (MIDDLE), PREVIEW & CREATE (RIGHT) */}
      <header className="flex flex-col lg:flex-row items-stretch lg:items-start justify-between gap-3 lg:gap-4 w-full">
        {/* Mobile top bar (< lg) */}
        <div className="flex lg:hidden items-center justify-between gap-2 w-full">
          <Link
            href={`/${locale}/tier-lists`}
            className="inline-flex min-h-[44px] items-center gap-1.5 type-label-sm text-text-secondary hover:text-accent-red transition-colors"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {t.backToHub}
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="min-h-[40px] uppercase tracking-wider"
            >
              {c.previewHeading}
            </Button>
            {submitButton('min-h-[40px] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider')}
          </div>
        </div>

        {/* Desktop top left navigation (>= lg) */}
        <div className="hidden lg:flex shrink-0 lg:max-wide-2k:w-48 wide-2k:w-48 pt-2.5">
          <Link
            href={`/${locale}/tier-lists`}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs 2xl:text-sm font-bold uppercase tracking-wider text-text-secondary hover:text-accent-red transition-colors"
          >
            <ChevronLeft className="h-4 w-4 2xl:h-5 2xl:w-5" aria-hidden="true" />
            {t.backToHub}
          </Link>
        </div>

        {/* MIDDLE: THE BASICS BLOCK */}
        <div className="flex-1 w-full min-w-0 max-w-4xl 2xl:max-wide-2k:max-w-6xl wide-2k:max-w-[1800px] mx-auto">
          <Section title={c.stepBasics}>
            <div className="grid gap-4 2xl:gap-6 md:grid-cols-2">
              <label className="md:col-span-1">
                <span className={LABEL}>{c.titleLabel}</span>
                <Input
                  value={draft.title}
                  maxLength={TIER_LIST_LIMITS.maxTitle}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder={c.titlePlaceholder}
                  invalid={attempted && titleMissing}
                  className={cn(TOUCH_FIELD, '2xl:min-h-[50px] 2xl:text-base')}
                />
              </label>
              <label className="md:col-span-1">
                <span className={LABEL}>{c.descriptionLabel}</span>
                <Input
                  value={draft.description}
                  maxLength={TIER_LIST_LIMITS.maxDescription}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder={c.descriptionPlaceholder}
                  className={cn(TOUCH_FIELD, '2xl:min-h-[50px] 2xl:text-base')}
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
                  className={cn(TOUCH_FIELD, '2xl:min-h-[50px] 2xl:text-base')}
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
                  <div className="mt-2 h-24 w-full max-w-sm mx-auto overflow-hidden rounded-lg border border-border-color bg-bg-elevated">
                    {/* eslint-disable-next-line @next/next/no-img-element -- live preview of a user-supplied URL */}
                    <img src={safeBackground} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                  </div>
                )}
              </label>
              {isAdmin && !editId && (
                <Checkbox checked={official} onChange={setOfficial} className="md:col-span-2 justify-center gap-2.5">
                  <span className="text-center">
                    <span className={cn(LABEL, 'inline')}>{c.official}</span>
                    <span className="ml-2 text-xs 2xl:text-sm text-text-muted">{c.officialHint}</span>
                  </span>
                </Checkbox>
              )}
            </div>
          </Section>
        </div>

        {/* Desktop top right buttons (>= lg) */}
        <div className="hidden lg:flex shrink-0 lg:max-wide-2k:w-48 wide-2k:w-48 items-center justify-end gap-2.5 sm:gap-3 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPreviewOpen(true)}
            className="min-h-[40px] 2xl:min-h-[46px] 2xl:px-5 2xl:text-sm uppercase tracking-wider"
          >
            {c.previewHeading}
          </Button>
          {submitButton(
            'min-h-[40px] 2xl:min-h-[46px] px-4 2xl:px-6 py-1.5 text-xs 2xl:text-sm font-bold uppercase tracking-wider'
          )}
        </div>
      </header>

      {/* TIERS BLOCK */}
      <div className="w-full max-w-4xl 2xl:max-wide-2k:max-w-6xl wide-2k:max-w-[1800px] mx-auto">
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
      <div className="w-full max-w-4xl 2xl:max-wide-2k:max-w-6xl wide-2k:max-w-[1800px] mx-auto">
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
                  items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
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

      {/* Feedback Alerts */}
      <div className="w-full max-w-4xl 2xl:max-wide-2k:max-w-6xl wide-2k:max-w-[1800px] mx-auto flex flex-col gap-4">
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
        locale={locale}
      />
    </div>
  );
}

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-border-color bg-bg-surface shadow-xs overflow-hidden transition-colors flex flex-col">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="relative w-full flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-bg-surface hover:bg-bg-elevated/40 transition-colors cursor-pointer select-none text-left"
      >
        <div className="w-8 shrink-0 pointer-events-none" aria-hidden="true" />
        <div className="flex-1 text-center min-w-0 px-2">
          <h2 className="type-section-title text-text-primary group-hover:text-accent-red transition-colors">
            {title}
          </h2>
        </div>
        <div className="w-8 flex justify-end">
          <ChevronDown
            className={cn(
              'h-4 w-4 sm:h-5 sm:w-5 text-accent-red transition-transform duration-300 ease-in-out',
              isOpen ? 'rotate-180' : 'rotate-0'
            )}
          />
        </div>
      </button>

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

function Feedback({ errors, saveError, publishError }: {
  errors: string[];
  saveError: 'quota' | 'unavailable' | null;
  publishError?: string | null;
}) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const messages = [
    ...errors,
    ...(saveError ? [saveError === 'quota' ? t.saveFailedQuota : t.saveFailedUnavailable] : []),
    ...(publishError ? [publishError] : []),
  ];
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
