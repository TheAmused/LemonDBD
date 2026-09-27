'use client';
// frontend/src/components/tier-lists/creator/ItemSources.tsx

import React, { useMemo, useRef, useState } from 'react';
import { Check, ClipboardPaste, Gamepad2, ImagePlus, Loader2, Plus, Search, Upload } from 'lucide-react';
import { ToggleSwitch, type ToggleSwitchOption } from '@/components/common/ToggleSwitch';
import { useTierListItems } from '@/hooks/useTierListItems';
import type { TierListKind } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { normalizeSearchText } from '@/utils/perkUtils';
import { sanitizeImageUrl } from '@/utils/tierLists/codec';
import { nameFromFileName, nameFromUrl, parseLinkLines } from '@/utils/tierLists/creator';
import { fileToTileImage } from '@/utils/tierLists/imageFiles';
import { TierItemTile } from '../TierItemTile';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD, LABEL } from '../styles';

export interface IncomingItem {
  name: string;
  image?: string;
  /** Catalog items keep their catalog key as id, so adding one twice is detectable. */
  id?: string;
}

type SourceTab = 'upload' | 'links' | 'catalog';
type CatalogKind = Exclude<TierListKind, 'custom'>;
const CATALOG_KINDS: CatalogKind[] = ['survivors', 'killers', 'survivor_perks', 'killer_perks', 'maps'];

interface ItemSourcesProps {
  onAdd: (items: IncomingItem[]) => void;
  existingIds: ReadonlySet<string>;
  locale: string;
  dict: Dictionary;
}

/** The three ways into a custom list: upload pictures, paste links, or pick from the game's catalog. */
export function ItemSources({ onAdd, existingIds, locale, dict }: ItemSourcesProps) {
  const c = dict.tierLists.creator;
  const [tab, setTab] = useState<SourceTab>('links');

  const options: readonly ToggleSwitchOption<SourceTab>[] = [
    { value: 'upload', label: c.tabUpload, icon: <Upload className="h-3.5 w-3.5" aria-hidden="true" /> },
    { value: 'links', label: c.tabLinks, icon: <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" /> },
    { value: 'catalog', label: c.tabCatalog, icon: <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <ToggleSwitch value={tab} onChange={setTab} options={options} ariaLabel={c.itemSourceAria} className="w-full min-w-max" />
      </div>
      {tab === 'upload' && <UploadSource onAdd={onAdd} dict={dict} />}
      {tab === 'links' && <LinksSource onAdd={onAdd} dict={dict} />}
      {tab === 'catalog' && <CatalogSource onAdd={onAdd} existingIds={existingIds} locale={locale} dict={dict} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function UploadSource({ onAdd: _onAdd, dict }: { onAdd: (items: IncomingItem[]) => void; dict: Dictionary }) {
  const c = dict.tierLists.creator;

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors',
          'border-border-color bg-bg-primary/20 opacity-60 cursor-not-allowed select-none'
        )}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border-color bg-bg-surface text-text-muted">
          <ImagePlus className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <p className="text-base font-black text-text-primary">{c.dropTitle}</p>
          <p className="mt-1 max-w-md text-xs text-text-muted">{c.dropSubtitle}</p>
        </div>
        <button type="button" disabled className={cn(BTN_PRIMARY, 'opacity-50 cursor-not-allowed pointer-events-none')}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          {c.chooseFiles}
        </button>
      </div>
      <p role="status" className="text-xs font-semibold text-accent-amber text-center">
        {dict.modal.temporarilyDisabled}
      </p>
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
          <input
            type="text"
            value={itemName}
            onChange={(e) => {
              setItemName(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={t.itemName}
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t.itemImage}</span>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={t.itemImagePlaceholder}
            className={FIELD}
          />
        </label>
      </div>
      <p className="text-xs text-text-muted">{t.itemImageHint}</p>
      {error && (
        <p role="alert" className="text-xs font-semibold text-accent-red">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={!itemName.trim() && !imageUrl.trim()}
        onClick={handleAdd}
        className={cn(BTN_PRIMARY, 'self-start min-h-[42px] px-4')}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {t.addItemTitle}
      </button>
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
      <div className="flex flex-wrap gap-2" role="group" aria-label={c.catalogSource}>
        {CATALOG_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setKind(k);
              setSelected(new Set());
            }}
            aria-pressed={kind === k}
            className={cn(
              'min-h-[44px] rounded-xl border px-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer',
              kind === k
                ? 'border-accent-red bg-accent-red/10 text-accent-red'
                : 'border-border-color bg-bg-surface text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
            )}
          >
            {t.kinds[k]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={c.catalogSearch}
            aria-label={c.catalogSearchAria}
            className={`${FIELD} pl-9`}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setSelected((prev) => new Set([...prev, ...visible.filter((i) => !existingIds.has(i.key)).map((i) => i.key)]))
            }
            className={BTN_SECONDARY}
          >
            {c.selectAll}
          </button>
          <button type="button" disabled={selected.size === 0} onClick={() => setSelected(new Set())} className={BTN_SECONDARY}>
            {c.clearSelection}
          </button>
        </div>
      </div>

      <div className="max-h-[360px] overflow-y-auto overscroll-contain rounded-2xl border border-border-color bg-bg-primary/40 p-2">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {c.catalogLoading}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
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
                  className="relative rounded-xl cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
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

      <button type="button" disabled={selected.size === 0} onClick={add} className={cn(BTN_PRIMARY, 'self-start')}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {c.addSelected.replace('{count}', String(selected.size))}
      </button>
    </div>
  );
}
