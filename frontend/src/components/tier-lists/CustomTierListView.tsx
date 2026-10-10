'use client';
// frontend/src/components/tier-lists/CustomTierListView.tsx

import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import type { Dictionary } from '@/locales/types';
import {
  TIER_LIST_FORMAT,
  TIER_LIST_FORMAT_VERSION,
  type StoredCustomList,
  type TierDefinition,
  type TierListDocument,
  type TierPlacements,
} from '@/types/tierList';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useTierListStore } from '@/hooks/useTierListStore';
import { documentItemsToItems } from '@/utils/tierLists/items';
import { deleteCustomList, saveCustomList, type SaveResult } from '@/utils/tierLists/storage';
import { TierListEditor } from './TierListEditor';
import { TierListSkeleton } from './TierListSkeleton';
import { useDictionary } from "@/context/DictionaryContext";

interface CustomTierListViewProps {
  id: string;
  locale: string;
}

/** A user's own tier list, living entirely in this browser. */
export function CustomTierListView({ id, locale }: CustomTierListViewProps) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const router = useRouter();
  const { state, hydrated } = useTierListStore();
  const list = state.custom[id];

  useDocumentTitle(list ? `LemonDBD - ${list.title || t.untitled}` : t.pageTitle);

  const items = useMemo(() => (list ? documentItemsToItems(list.items) : []), [list]);

  const update = useCallback(
    (patch: Partial<Omit<StoredCustomList, 'id' | 'createdAt' | 'updatedAt'>>): SaveResult => {
      if (!list) return { ok: false, reason: 'unavailable' };
      const { updatedAt: _ignored, ...rest } = list;
      void _ignored;
      return saveCustomList({ ...rest, ...patch });
    },
    [list]
  );

  const onSave = useCallback(
    (tiers: TierDefinition[], placements: TierPlacements) => update({ tiers, placements }),
    [update]
  );

  const onReset = useCallback(() => update({ placements: {} }), [update]);

  const onRemoveItem = useCallback(
    (key: string) => {
      if (!list) return { ok: true } as SaveResult;
      const placements: TierPlacements = {};
      for (const [tierId, keys] of Object.entries(list.placements)) {
        placements[tierId] = keys.filter((k) => k !== key);
      }
      return update({ items: list.items.filter((i) => i.id !== key), placements });
    },
    [list, update]
  );

  const onImport = useCallback(
    (doc: TierListDocument) =>
      update({
        title: doc.title || list?.title || '',
        description: doc.description ?? list?.description ?? '',
        tiers: doc.tiers,
        items: doc.items ?? [],
        placements: doc.placements,
        backgroundImage: doc.backgroundImage ?? list?.backgroundImage,
      }),
    [list?.title, list?.description, list?.backgroundImage, update]
  );

  const buildExportDoc = useCallback(
    (tiers: TierDefinition[], placements: TierPlacements): TierListDocument => ({
      format: TIER_LIST_FORMAT,
      version: TIER_LIST_FORMAT_VERSION,
      title: list?.title ?? '',
      ...(list?.description ? { description: list.description } : {}),
      template: null,
      tiers,
      items: list?.items ?? [],
      placements,
      ...(list?.backgroundImage ? { backgroundImage: list.backgroundImage } : {}),
    }),
    [list?.title, list?.description, list?.items, list?.backgroundImage]
  );

  const onDelete = useCallback(() => {
    deleteCustomList(id);
    router.push(`/${locale}/tier-lists`);
  }, [id, locale, router]);

  if (!hydrated) return <TierListSkeleton />;

  if (!list) {
    return (
      <div className="relative z-10 flex flex-col gap-2">
        <EmptyState icon={SearchX} title={t.customNotFoundTitle} subtitle={t.customNotFoundSubtitle} />
      </div>
    );
  }

  return (
    <TierListEditor
      mode="custom"
      preferenceKey="custom"
      title={list.title}
      description={list.description}
      kindLabel={t.kinds.custom}
      items={items}
      tiers={list.tiers}
      placements={list.placements}
      shape="square"
      defaultShowNames
      resetMessage={t.resetMessage}
      poolEmptyLabel={list.items.length === 0 ? t.poolEmptyCustom : t.poolEmpty}
      onSave={onSave}
      onReset={onReset}
      buildExportDoc={buildExportDoc}
      importTarget={{ kind: 'custom' }}
      onImport={onImport}
      onRemoveItem={onRemoveItem}
      editHref={`/${locale}/tier-lists/new?edit=${id}`}
      onDelete={onDelete}
      locale={locale}
    />
  );
}
