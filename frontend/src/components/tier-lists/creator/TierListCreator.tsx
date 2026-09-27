'use client';
// frontend/src/components/tier-lists/creator/TierListCreator.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronLeft, History, SearchX, TriangleAlert } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import type { TierDefinition, TierListDocumentItem } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useTierListStore } from '@/hooks/useTierListStore';
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
import { BTN_PRIMARY, BTN_SECONDARY, FIELD, LABEL } from '../styles';
import { CreatorItems } from './CreatorItems';
import { CreatorPreviewModal } from './CreatorPreview';
import { type IncomingItem, ItemSources } from './ItemSources';
import { LadderEditor } from './LadderEditor';

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
  dict: Dictionary;
  /** A custom list id to edit in place, instead of building a new one. */
  editId?: string;
}

export function TierListCreator({ locale, dict, editId }: TierListCreatorProps) {
  const t = dict.tierLists;
  const c = t.creator;
  const router = useRouter();
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
          className="inline-flex min-h-[44px] w-fit items-center gap-1 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-accent-red"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {t.backToHub}
        </Link>
        <EmptyState icon={SearchX} title={t.customNotFoundTitle} subtitle={t.customNotFoundSubtitle} />
      </div>
    );
  }

  const submit = () => {
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

  const submitLabel = editId ? t.save : c.create;
  const submitButton = (extra?: string) => (
    <button type="button" data-tier-create="" onClick={submit} className={cn(BTN_PRIMARY, 'min-h-[48px] 2xl:min-h-[54px] text-base 2xl:text-lg', extra)}>
      {submitLabel}
    </button>
  );

  const errors = attempted
    ? [titleMissing && c.titleRequired, itemsMissing && c.itemsRequired, backgroundInvalid && t.invalidImage].filter(Boolean)
    : [];

  return (
    <div className="relative z-10 flex flex-col gap-6">
      <header className="flex items-center justify-between border-b border-border-color pb-4 min-h-[44px]">
        <Link
          href={`/${locale}/tier-lists`}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs 2xl:text-sm font-bold uppercase tracking-wider text-text-secondary hover:text-accent-red transition-colors"
        >
          <ChevronLeft className="h-4 w-4 2xl:h-5 2xl:w-5" aria-hidden="true" />
          {t.backToHub}
        </Link>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className={cn(BTN_SECONDARY, 'min-h-[40px] 2xl:min-h-[46px] px-3.5 2xl:px-5 py-1.5 text-xs 2xl:text-sm font-bold uppercase tracking-wider')}
        >
          {c.previewHeading}
        </button>
      </header>

      {restored && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-accent-amber/40 bg-accent-amber/10 p-3 2xl:p-4 text-sm 2xl:text-base font-semibold text-accent-amber">
          <History className="h-4 w-4 2xl:h-5 2xl:w-5 shrink-0" aria-hidden="true" />
          <span className="flex-1">{c.draftRestored}</span>
          <button type="button" onClick={startOver} className={BTN_SECONDARY}>
            {c.startOver}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6 2xl:gap-8 max-w-5xl 2xl:max-w-6xl wide:max-w-7xl mx-auto w-full">
        <Section title={c.stepBasics}>
          <div className="grid gap-4 2xl:gap-6 md:grid-cols-2">
            <label className="md:col-span-1">
              <span className={LABEL}>{c.titleLabel}</span>
              <input
                value={draft.title}
                maxLength={TIER_LIST_LIMITS.maxTitle}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder={c.titlePlaceholder}
                aria-invalid={attempted && titleMissing}
                className={cn(FIELD, '2xl:min-h-[50px] 2xl:text-base', attempted && titleMissing && 'border-accent-red')}
              />
            </label>
            <label className="md:col-span-1">
              <span className={LABEL}>{c.descriptionLabel}</span>
              <input
                value={draft.description}
                maxLength={TIER_LIST_LIMITS.maxDescription}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder={c.descriptionPlaceholder}
                className={cn(FIELD, '2xl:min-h-[50px] 2xl:text-base')}
              />
            </label>
            <label className="md:col-span-2">
              <span className={LABEL}>{c.backgroundImageLabel}</span>
              <input
                value={draft.backgroundImage}
                onChange={(e) => patch({ backgroundImage: e.target.value })}
                placeholder={c.backgroundImagePlaceholder}
                inputMode="url"
                aria-invalid={attempted && backgroundInvalid}
                className={cn(FIELD, '2xl:min-h-[50px] 2xl:text-base', attempted && backgroundInvalid && 'border-accent-red')}
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
                <div className="mt-2 h-24 w-full max-w-sm overflow-hidden rounded-xl border border-border-color bg-bg-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element -- live preview of a user-supplied URL */}
                  <img src={safeBackground} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                </div>
              )}
            </label>
          </div>
        </Section>

        <Section title={c.stepTiers}>
          <LadderEditor
            tiers={draft.tiers}
            activePreset={draft.preset}
            onChange={(tiers) => patch({ tiers, preset: null })}
            onPreset={(id) => patch({ tiers: buildLadder(id, translateFeeling), preset: id })}
            dict={dict}
          />
        </Section>

        <Section title={c.stepItems}>
          <div className="flex flex-col gap-6 2xl:gap-8">
            <ItemSources onAdd={addItems} existingIds={existingIds} locale={locale} dict={dict} />
            {skipped > 0 && (
              <p role="status" className="text-xs 2xl:text-sm font-semibold text-accent-amber">
                {c.itemsSkipped.replace('{count}', String(skipped))}
              </p>
            )}
            <CreatorItems
              items={draft.items}
              onRename={(id, name) =>
                setDraft((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, name } : i)) }))
              }
              onRemove={(id) => setDraft((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }))}
              onClear={() => patch({ items: [] })}
              dict={dict}
            />
            {hasInlineImages && (
              <p className={cn('text-xs 2xl:text-sm', bytes > STORAGE_WARN_BYTES ? 'font-semibold text-accent-amber' : 'text-text-muted')}>
                {c.storageUsage.replace('{size}', formatBytes(bytes, locale))}{' '}
                {bytes > STORAGE_WARN_BYTES && c.storageWarning}
              </p>
            )}
          </div>
        </Section>

        <Feedback errors={errors as string[]} saveError={saveError} dict={dict} />

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className={cn(BTN_SECONDARY, 'w-full sm:w-auto min-h-[48px] 2xl:min-h-[54px] px-6 2xl:px-8 text-sm 2xl:text-base font-bold')}
          >
            {c.previewHeading}
          </button>
          {submitButton('w-full sm:w-auto min-h-[48px] 2xl:min-h-[54px] px-8 2xl:px-10 text-base 2xl:text-lg')}
        </div>
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
        dict={dict}
      />
    </div>
  );
}

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-3xl border border-border-color bg-bg-surface backdrop-blur-xl shadow-md overflow-hidden transition-colors flex flex-col">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="relative w-full flex items-center justify-between py-4 px-5 sm:py-5 sm:px-7 2xl:py-6 2xl:px-9 min-h-[56px] sm:min-h-[64px] 2xl:min-h-[74px] cursor-pointer group select-none overflow-hidden transition-colors text-left"
      >
        <div className="w-8 hidden sm:block pointer-events-none" aria-hidden="true" />
        <div className="flex-1 text-center min-w-0 px-2">
          <h2 className="text-sm sm:text-base 2xl:text-lg font-black uppercase tracking-wider text-text-primary group-hover:text-accent-red transition-colors font-mono">
            {title}
          </h2>
        </div>
        <div className="w-8 flex justify-end">
          <ChevronDown
            className={`h-4 w-4 sm:h-5 sm:w-5 2xl:h-6 2xl:w-6 text-accent-red transition-transform duration-300 ease-in-out ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </div>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 sm:p-6 2xl:p-8 border-t border-border-color">
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
  dict,
}: {
  errors: string[];
  saveError: 'quota' | 'unavailable' | null;
  dict: Dictionary;
}) {
  const t = dict.tierLists;
  const messages = [...errors, ...(saveError ? [saveError === 'quota' ? t.saveFailedQuota : t.saveFailedUnavailable] : [])];
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
