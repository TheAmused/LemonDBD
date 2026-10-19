'use client';
// frontend/src/components/tier-lists/creator/ItemSources.tsx

import { Tabs } from '@/components/common/Tabs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ClipboardPaste, Gamepad2, ImagePlus, Plus, Upload } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTierListItems } from '@/hooks/useTierListItems';
import type { TierListKind } from '@/types/tierList';
import { cn } from '@/utils/cn';
import { normalizeSearchText } from '@/utils/perkUtils';
import { sanitizeImageUrl } from '@/utils/tierLists/codec';
import { TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import { nameFromFileName, nameFromUrl } from '@/utils/tierLists/creator';
import { fileToTileImage } from '@/utils/tierLists/imageFiles';
import { TierItemTile } from '../TierItemTile';
import { LABEL, TOUCH_BTN, TOUCH_FIELD } from '../styles';
import { Spinner } from '@/components/common/Spinner';
import { Button } from '@/components/common/Button';
import { Input, SearchInput } from '@/components/common/Field';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";
import { ToggleChip } from '@/components/common/ToggleChip';
import { TileButton } from '@/components/common/TileButton';

export interface IncomingItem {
  name: string;
  image?: string;
  /** Catalog items keep their catalog key as id, so adding one twice is detectable. */
  id?: string;
}

type SourceTab = 'upload' | 'links' | 'catalog';
type CatalogKind = Exclude<TierListKind, 'custom'>;
const CATALOG_KINDS: CatalogKind[] = ['survivors', 'killers', 'survivor_perks', 'killer_perks', 'maps'];

interface TabOption {
  value: SourceTab;
  label: string;
  icon: React.ReactNode;
}

interface ItemSourcesProps {
  onAdd: (items: IncomingItem[]) => void;
  existingIds: ReadonlySet<string>;
  locale: string;
}

/** The three ways into a custom list: upload pictures, paste links, or pick from the game's catalog. */
export function ItemSources({ onAdd, existingIds, locale }: ItemSourcesProps) {
  const dict = useDictionary();
  const c = dict.tierLists.creator;
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<SourceTab>('catalog');

  // Direct file upload is admin-only (guests and regular users don't get the
  // tab at all, not just a disabled one) -- everyone else adds items by
  // picking from the game's own catalog or pasting a link.
  const options: readonly TabOption[] = [
    { value: 'catalog', label: c.tabCatalog, icon: <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" /> },
    { value: 'links', label: c.tabLinks, icon: <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" /> },
    ...(isAdmin
      ? [{ value: 'upload' as const, label: c.tabUpload, icon: <Upload className="h-3.5 w-3.5" aria-hidden="true" /> }]
      : []),
  ];

  // Guards against a stale 'upload' selection if admin status changes (or
  // isn't known yet on first render) out from under an open tab.
  useEffect(() => {
    if (tab === 'upload' && !isAdmin) setTab('catalog');
  }, [tab, isAdmin]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center w-full">
        <Tabs
          ariaLabel={c.itemSourceAria}
          value={tab}
          onChange={setTab}
          panels={false}
          variant="boxed"
          tabClassName="min-h-hit-sm gap-2 rounded-chip px-3.5"
          tabs={options}
        />
      </div>
      {/*
        All panels share one grid cell, so the block is always as tall as the tallest panel
        (the catalog, whose list has a fixed height) and switching tabs never moves the page.
        The inactive panels stay mounted, which also keeps the catalog's search and selection.
      */}
      <div className="grid">
        <SourcePanel active={tab === 'catalog'}>
          <CatalogSource onAdd={onAdd} existingIds={existingIds} locale={locale} />
        </SourcePanel>
        <SourcePanel active={tab === 'links'}>
          <LinksSource onAdd={onAdd} />
        </SourcePanel>
        {isAdmin && (
          <SourcePanel active={tab === 'upload'}>
            <UploadSource onAdd={onAdd} />
          </SourcePanel>
        )}
      </div>
    </div>
  );
}

function SourcePanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('col-start-1 row-start-1 min-w-0', !active && 'invisible pointer-events-none')} inert={!active}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------

function UploadSource({ onAdd }: { onAdd: (items: IncomingItem[]) => void; }) {
  const dict = useDictionary();
  const c = dict.tierLists.creator;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [skipped, setSkipped] = useState<number>(0);

  const handleFiles = async (fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const tiles = await Promise.all(files.map((file) => fileToTileImage(file)));
      const items: IncomingItem[] = [];
      let failed = 0;
      tiles.forEach((image, i) => {
        if (image) items.push({ name: nameFromFileName(files[i].name), image });
        else failed += 1;
      });
      setSkipped(failed);
      if (items.length) onAdd(items);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed p-6 sm:p-8 text-center transition-colors',
          dragging ? 'border-accent-red bg-accent-red/5' : 'border-border-color bg-bg-primary/20'
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-chip border border-border-color bg-bg-surface text-text-muted">
          <ImagePlus className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-base font-black text-text-primary">{c.dropTitle}</p>
          <p className="mt-1 max-w-md text-xs text-text-muted">{c.dropSubtitle}</p>
        </div>
        <Button
          variant="primary"
          loading={processing}
          onClick={() => inputRef.current?.click()}
          leftIcon={<Upload className="h-4 w-4" aria-hidden="true" />}
          className={TOUCH_BTN}
        >
          {c.chooseFiles}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {processing && (
        <p role="status" className="type-strong text-text-muted text-center">
          {c.processing}
        </p>
      )}
      {!processing && skipped > 0 && (
        <p role="alert" className="type-strong text-accent-red text-center">
          {formatMessage(c.uploadSkipped, { count: skipped })}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

type ProbeStatus = 'idle' | 'loading' | 'ok' | 'error' | 'invalid';

/** Checks (after a short pause in typing) whether a pasted image link really loads. */
function useImageProbe(rawUrl: string): { status: ProbeStatus; src: string | null } {
  const trimmed = rawUrl.trim();
  const src = useMemo(() => (trimmed ? sanitizeImageUrl(trimmed) : null), [trimmed]);
  const [status, setStatus] = useState<ProbeStatus>('idle');

  useEffect(() => {
    if (!trimmed) {
      setStatus('idle');
      return;
    }
    if (!src) {
      setStatus('invalid');
      return;
    }
    setStatus('loading');
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const probe = new window.Image();
      probe.onload = () => !cancelled && setStatus('ok');
      probe.onerror = () => !cancelled && setStatus('error');
      probe.src = src;
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed, src]);

  return { status, src };
}

function LinksSource({ onAdd }: { onAdd: (items: IncomingItem[]) => void; }) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const [itemName, setItemName] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const c = t.creator;
  const { status, src: previewSrc } = useImageProbe(imageUrl);
  const previewName = itemName.trim() || nameFromUrl(imageUrl.trim()) || '';

  const handleAdd = () => {
    const trimmedName = itemName.trim();
    const trimmedUrl = imageUrl.trim();

    if (!trimmedName && !trimmedUrl) {
      setError(t.itemNameRequired);
      return;
    }

    let safeImage: string | undefined = undefined;
    if (trimmedUrl) {
      const sanitized = sanitizeImageUrl(trimmedUrl);
      if (!sanitized) {
        setError(t.invalidImage);
        return;
      }
      safeImage = sanitized;
    }

    const finalName = trimmedName || nameFromUrl(trimmedUrl) || 'Item';
    onAdd([{ name: finalName, ...(safeImage ? { image: safeImage } : {}) }]);
    setItemName('');
    setImageUrl('');
    setError(null);
  };

  const statusText =
    status === 'loading' ? c.linkPreviewLoading
    : status === 'ok' ? c.linkPreviewOk
    : status === 'error' ? c.linkPreviewFailed
    : status === 'invalid' ? t.invalidImage
    : c.linkPreviewEmpty;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t.itemName}</span>
          <Input
            type="text"
            value={itemName}
            maxLength={TIER_LIST_LIMITS.maxItemName}
            onChange={(e) => {
              setItemName(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className={TOUCH_FIELD}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t.itemImage}</span>
          <Input
            type="url"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={t.itemImagePlaceholder}
            className={TOUCH_FIELD}
          />
          <span className="text-xs text-text-muted">{t.itemImageHint}</span>
        </label>
      </div>
      {error && (
        <p role="alert" className="type-strong text-accent-red text-center">
          {error}
        </p>
      )}

      {/* Live preview: fills the space the catalog's list takes, so both tabs are the same height. */}
      <div
        aria-live="polite"
        className="flex min-h-40 flex-1 flex-col items-center justify-center gap-3 rounded-card border border-border-color bg-bg-primary/40 p-4 text-center"
      >
        <span className={LABEL}>{c.linkPreviewHeading}</span>
        {(previewSrc || previewName) ? (
          <div className="relative">
            <TierItemTile
              item={{ key: 'link-preview', name: previewName || '?', image: status === 'ok' ? previewSrc : null }}
              showName={Boolean(previewName)}
              size="lg"
              className="pointer-events-none cursor-default"
            />
            {status === 'loading' && (
              <span className="absolute left-1/2 top-10 phone-lg:top-12 sm:top-14 -translate-x-1/2 -translate-y-1/2 text-text-muted">
                <Spinner size="sm" tone="current" />
              </span>
            )}
          </div>
        ) : (
          <ImagePlus className="h-10 w-10 text-text-muted/60" aria-hidden="true" />
        )}
        <p className={cn('text-xs', status === 'error' || status === 'invalid' ? 'font-semibold text-accent-red' : 'text-text-muted')}>
          {statusText}
        </p>
      </div>

      <div className="flex justify-center w-full pt-1">
        <Button
          variant="primary"
          disabled={!itemName.trim() && !imageUrl.trim()}
          onClick={handleAdd}
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          className="min-h-10 px-6"
        >
          {t.addItemTitle}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CatalogSource({ onAdd, existingIds, locale }: {
  onAdd: (items: IncomingItem[]) => void;
  existingIds: ReadonlySet<string>;
  locale: string;
}) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const c = t.creator;
  const [kind, setKind] = useState<CatalogKind>('survivors');
  const [query, setQuery] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const CHUNK_SIZE = 40;
  const [renderLimit, setRenderLimit] = useState<number>(CHUNK_SIZE);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const source = useMemo(() => ({ kind, item_ids: null, custom_items: null }), [kind]);
  const { items, loading } = useTierListItems(source, locale);

  const visible = useMemo(() => {
    const needle = normalizeSearchText(query);
    if (!needle) return items;
    return items.filter((i) => normalizeSearchText(`${i.name} ${i.subtitle ?? ''}`).includes(needle));
  }, [items, query]);

  useEffect(() => {
    setRenderLimit(CHUNK_SIZE);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [kind, query]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setRenderLimit((prev) => (prev < visible.length ? Math.min(prev + CHUNK_SIZE, visible.length) : prev));
        }
      },
      { root: container, rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visible.length]);

  const renderedItems = useMemo(() => visible.slice(0, renderLimit), [visible, renderLimit]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const add = () => {
    const chosen = items.filter((i) => selected.has(i.key) && !existingIds.has(i.key));
    onAdd(chosen.map((i) => ({ id: i.key, name: i.name, ...(i.image ? { image: i.image } : {}) })));
    setSelected(new Set());
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Wide screens: every type as a pill. Phones: a dropdown next to the search box, to save rows. */}
      <div className="hidden sm:flex flex-wrap justify-center gap-2" role="group" aria-label={c.catalogSource}>
        {CATALOG_KINDS.map((k) => (
          <ToggleChip pressed={kind === k} size="md"
            key={k}
            onClick={() => {
              setKind(k);
              setSelected(new Set());
            }}
          >
            {t.kinds[k]}
          </ToggleChip>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex gap-2 sm:contents">
          <div className="shrink-0 sm:hidden">
            <CustomDropdown
              value={kind}
              onChange={(k) => {
                setKind(k as CatalogKind);
                setSelected(new Set());
              }}
              options={CATALOG_KINDS.map((k) => ({ value: k, label: t.kinds[k] }))}
              ariaLabel={c.catalogSource}
              buttonClassName="min-h-11 justify-between"
              minWidthClass="min-w-50"
            />
          </div>
          <SearchInput
            wrapperClassName="min-w-0 flex-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={c.catalogSearch}
            aria-label={c.catalogSearchAria}
            className={TOUCH_FIELD}
          />
        </div>
        <div className="flex justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setSelected((prev) => new Set([...prev, ...visible.filter((i) => !existingIds.has(i.key)).map((i) => i.key)]))
            }
            className="min-h-hit-sm"
          >
            {c.selectAll}
          </Button>
          <Button variant="secondary" size="sm" disabled={selected.size === 0} onClick={() => setSelected(new Set())} className="min-h-hit-sm">
            {c.clearSelection}
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full rounded-card border border-border-color bg-bg-primary/40 p-3 sm:p-4 overflow-y-auto overflow-x-hidden h-96 sm:h-136 overscroll-contain"
      >
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-10 type-card-title text-text-muted">
            <Spinner size="sm" tone="current" />
            {c.catalogLoading}
          </p>
        ) : (
          <div className="flex flex-wrap items-start justify-center gap-3 sm:gap-3.5 w-full">
            {renderedItems.map((item) => {
              const added = existingIds.has(item.key);
              const isSelected = selected.has(item.key);
              return (
                <TileButton press={false}
                  key={item.key}
                  disabled={added}
                  onClick={() => toggle(item.key)}
                  aria-pressed={isSelected}
                  aria-label={item.name}
                  className="relative flex flex-col items-center justify-start self-start rounded-control disabled:opacity-40 transition-transform hover:scale-105"
                >
                  <TierItemTile
                    item={item}
                    shape={kind === 'maps' ? 'wide' : 'square'}
                    showName
                    size="lg"
                    selected={isSelected}
                    className="pointer-events-none"
                    aria-hidden="true"
                  />
                  {(isSelected || added) && (
                    <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent-red text-text-inverted shadow-md">
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                    </span>
                  )}
                  {added && <span className="sr-only">{c.alreadyAdded}</span>}
                </TileButton>
              );
            })}
            {renderLimit < visible.length && (
              <div ref={sentinelRef} className="flex w-full items-center justify-center py-3 text-text-muted">
                <Spinner size="sm" tone="current" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-center w-full">
        <Button variant="primary" disabled={selected.size === 0} onClick={add} leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />} className="min-h-10 px-6">
          {formatMessage(c.addSelected, { count: selected.size })}
        </Button>
      </div>
    </div>
  );
}
