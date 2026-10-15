'use client';
// frontend/src/components/tier-lists/CustomTierListView.tsx

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { AuthRequiredState } from '@/components/common/AuthRequiredState';
import { ReportContentModal } from '@/components/common/ReportContentModal';
import { useAuth } from '@/context/AuthContext';
import {
  type StoredCustomList,
  type TierDefinition,
  type TierListDocument,
  type TierPlacements,
} from '@/types/tierList';
import { NsfwContentGate } from '@/components/common/NsfwContentGate';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNsfwGate } from '@/hooks/useNsfwGate';
import { useTierListStore } from '@/hooks/useTierListStore';
import { signingPayload } from '@/utils/contentPayload';
import { buildCustomTierListDoc } from '@/utils/tierLists/customDoc';
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
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const list = state.custom[id];
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const nsfwGate = useNsfwGate('tier_list', id, list?.is_nsfw === true);

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
        // An import never turns the flag off: the list keeps it if either side had it.
        is_nsfw: doc.is_nsfw === true || list?.is_nsfw === true ? true : undefined,
        _manifest: doc._manifest ?? list?._manifest ?? null,
      }),
    [list?.title, list?.description, list?.backgroundImage, list?.is_nsfw, list?._manifest, update]
  );

  const buildExportDoc = useCallback(
    (tiers: TierDefinition[], placements: TierPlacements): TierListDocument =>
      buildCustomTierListDoc(list, tiers, placements),
    [list]
  );

  const onDelete = useCallback(() => {
    deleteCustomList(id);
    router.push(`/${locale}/tier-lists`);
  }, [id, locale, router]);

  if (authLoading || !hydrated) return <TierListSkeleton />;

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

  if (!list) {
    return (
      <div className="relative z-10 flex flex-col gap-2">
        <EmptyState icon={SearchX} title={t.customNotFoundTitle} subtitle={t.customNotFoundSubtitle} />
      </div>
    );
  }

  if (nsfwGate.gated) {
    return (
      <NsfwContentGate
        title={t.nsfw.title}
        description={t.nsfw.description}
        confirmLabel={t.nsfw.confirm}
        onConfirm={nsfwGate.confirm}
      />
    );
  }

  return (
    <>
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
        onReport={() => setReportModalOpen(true)}
        locale={locale}
      />
      <ReportContentModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        contentType="tier_list"
        manifest={list._manifest ?? null}
        payload={signingPayload('tier_list', buildExportDoc(list.tiers, list.placements))}
        contentTitle={list.title}
      />
    </>
  );
}
