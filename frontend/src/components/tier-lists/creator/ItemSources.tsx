'use client';
// frontend/src/components/tier-lists/creator/ItemSources.tsx

import { Tabs } from '@/components/common/Tabs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ClipboardPaste, Gamepad2, ImagePlus, Plus, Search, Upload } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTierListItems } from '@/hooks/useTierListItems';
import type { TierListKind } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { normalizeSearchText } from '@/utils/perkUtils';
import { sanitizeImageUrl } from '@/utils/tierLists/codec';
import { nameFromFileName, nameFromUrl, parseLinkLines } from '@/utils/tierLists/creator';
import { fileToTileImage } from '@/utils/tierLists/imageFiles';
import { TierItemTile } from '../TierItemTile';
import { LABEL, TOUCH_BTN, TOUCH_FIELD } from '../styles';
import { Spinner } from '@/components/common/Spinner';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { CustomDropdown } from '@/components/common/CustomDropdown';

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
  dict: Dictionary;
}

/** The three ways into a custom list: upload pictures, paste links, or pick from the game's catalog. */
export function ItemSources({ onAdd, existingIds, locale, dict }: ItemSourcesProps) {
  const c = dict.tierLists.creator;
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<SourceTab>('links');

  // Direct file upload is admin-only (guests and regular users don't get the
  // tab at all, not just a disabled one) -- everyone else adds items by
  // pasting a link or picking from the game's own catalog.
  const options: readonly TabOption[] = [
    ...(isAdmin
      ? [{ value: 'upload' as const, label: c.tabUpload, icon: <Upload className="h-3.5 w-3.5" aria-hidden="true" /> }]
      : []),
    { value: 'links', label: c.tabLinks, icon: <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" /> },
    { value: 'catalog', label: c.tabCatalog, icon: <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" /> },
  ];

  // Guards against a stale 'upload' selection if admin status changes (or
  // isn't known yet on first render) out from under an open tab.
  useEffect(() => {
    if (tab === 'upload' && !isAdmin) setTab('links');
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
          tabClassName="min-h-[38px] gap-2 rounded-md px-3.5 text-xs sm:text-sm"
          tabs={options}
        />
      </div>
      {tab === 'upload' && isAdmin && <UploadSource onAdd={onAdd} dict={dict} />}
      {tab === 'links' && <LinksSource onAdd={onAdd} dict={dict} />}
      {tab === 'catalog' && <CatalogSource onAdd={onAdd} existingIds={existingIds} locale={locale} dict={dict} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function UploadSource({ onAdd, dict }: { onAdd: (items: IncomingItem[]) => void; dict: Dictionary }) {
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
    <div className="flex flex-col gap-2">
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
          'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors',
          dragging ? 'border-accent-red bg-accent-red/5' : 'border-border-color bg-bg-primary/20'
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-border-color bg-bg-surface text-text-muted">
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
        <p role="status" className="text-xs font-semibold text-text-muted text-center">
          {c.processing}
        </p>
      )}
      {!processing && skipped > 0 && (
        <p role="alert" className="text-xs font-semibold text-accent-red text-center">
          {c.uploadSkipped.replace('{count}', String(skipped))}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function LinksSource({ onAdd, dict }: { onAdd: (items: IncomingItem[]) => void; dict: Dictionary }) {
  const t = dict.tierLists;
  const [itemName, setItemName] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t.itemName}</span>
          <Input
            type="text"
            value={itemName}
            onChange={(e) => {
              setItemName(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={t.itemName}
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
        </label>
      </div>
      <p className="text-xs text-text-muted text-center">{t.itemImageHint}</p>
      {error && (
        <p role="alert" className="text-xs font-semibold text-accent-red text-center">
          {error}
        </p>
      )}
      <div className="flex justify-center w-full pt-1">
        <Button
          variant="primary"
          disabled={!itemName.trim() && !imageUrl.trim()}
          onClick={handleAdd}
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          className="min-h-[40px] rounded-lg px-6"
        >
          {t.addItemTitle}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CatalogSource({
  onAdd,
  existingIds,
  locale,
  dict,
}: {
  onAdd: (items: IncomingItem[]) => void;
  existingIds: ReadonlySet<string>;
  locale: string;
  dict: Dictionary;
}) {
  const t = dict.tierLists;
  const c = t.creator;
  const [kind, setKind] = useState<CatalogKind>('survivors');
  const [query, setQuery] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const source = useMemo(() => ({ kind, item_ids: null, custom_items: null }), [kind]);
  const { items, loading } = useTierListItems(source, locale);

  const visible = useMemo(() => {
    const needle = normalizeSearchText(query);
    if (!needle) return items;
    return items.filter((i) => normalizeSearchText(`${i.name} ${i.subtitle ?? ''}`).includes(needle));
  }, [items, query]);

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
      <div className="flex justify-center">
        <CustomDropdown
          value={kind}
          onChange={(k) => {
            setKind(k as CatalogKind);
            setSelected(new Set());
          }}
          options={CATALOG_KINDS.map((k) => ({ value: k, label: t.kinds[k] }))}
          ariaLabel={c.catalogSource}
          buttonClassName="min-h-[40px] min-w-[200px] justify-between"
          minWidthClass="min-w-[220px]"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={c.catalogSearch}
            aria-label={c.catalogSearchAria}
            className={`${TOUCH_FIELD} pl-9`}
          />
        </div>
        <div className="flex justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setSelected((prev) => new Set([...prev, ...visible.filter((i) => !existingIds.has(i.key)).map((i) => i.key)]))
            }
            className="min-h-[38px]"
          >
            {c.selectAll}
          </Button>
          <Button variant="secondary" size="sm" disabled={selected.size === 0} onClick={() => setSelected(new Set())} className="min-h-[38px]">
            {c.clearSelection}
          </Button>
        </div>
      </div>

      <div className="max-h-[360px] overflow-y-auto overscroll-contain rounded-lg border border-border-color bg-bg-primary/40 p-2">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-text-muted">
            <Spinner size="sm" tone="current" />
            {c.catalogLoading}
          </p>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            {visible.map((item) => {
              const added = existingIds.has(item.key);
              const isSelected = selected.has(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={added}
                  onClick={() => toggle(item.key)}
                  aria-pressed={isSelected}
                  aria-label={item.name}
                  className="relative rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <TierItemTile
                    item={item}
                    shape={kind === 'maps' ? 'wide' : 'square'}
                    showName
                    selected={isSelected}
                    className="pointer-events-none"
                    aria-hidden="true"
                  />
                  {(isSelected || added) && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-red text-text-inverted shadow">
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                  )}
                  {added && <span className="sr-only">{c.alreadyAdded}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-center w-full">
        <Button variant="primary" disabled={selected.size === 0} onClick={add} leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />} className="min-h-[40px] rounded-lg px-6">
          {c.addSelected.replace('{count}', String(selected.size))}
        </Button>
      </div>
    </div>
  );
}
