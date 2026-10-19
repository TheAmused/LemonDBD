'use client';
// frontend/src/components/tier-lists/OfficialTierListView.tsx

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, SearchX, TriangleAlert } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import {
  TIER_LIST_FORMAT,
  TIER_LIST_FORMAT_VERSION,
  type TierDefinition,
  type TierListDocument,
  type TierPlacements,
} from '@/types/tierList';
import { useAuth } from '@/context/AuthContext';
import { NsfwContentGate } from '@/components/common/NsfwContentGate';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNsfwGate } from '@/hooks/useNsfwGate';
import { useTierListItems } from '@/hooks/useTierListItems';
import { useTierListStore } from '@/hooks/useTierListStore';
import { useTierListTemplate } from '@/hooks/useTierListTemplates';
import { deleteOfficialTierList, isNotFoundError } from '@/services/tierListApi';
import { resolveTiers } from '@/utils/tierLists/board';
import { clearRanking, saveRanking } from '@/utils/tierLists/storage';
import { TierListEditor } from './TierListEditor';
import { TierListSkeleton } from './TierListSkeleton';
import { useDictionary } from "@/context/DictionaryContext";

interface OfficialTierListViewProps {
  slug: string;
  locale: string;
}

const EMPTY: TierPlacements = {};

/** An official (database) tier list, ranked by this browser's user. */
export function OfficialTierListView({ slug, locale }: OfficialTierListViewProps) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const router = useRouter();
  const { isAdmin, token } = useAuth();
  const { template, loading: templateLoading, error: templateError, refresh } = useTierListTemplate(slug, locale);
  const { items, loading: itemsLoading, error: itemsError, refresh: refreshItems } = useTierListItems(template, locale);
  const { state, hydrated } = useTierListStore();
  const nsfwGate = useNsfwGate('tier_list', slug, template?.is_nsfw === true);

  useDocumentTitle(template ? `LemonDBD - ${template.title}` : t.pageTitle);

  const ranking = state.rankings[slug];
  const tiers = useMemo(
    () => resolveTiers(isAdmin ? ranking?.tiers : null, template?.tiers),
    [isAdmin, ranking?.tiers, template?.tiers]
  );
  // No ranking yet: start from the official LemonDBD ranking when there is one.
  const placements = ranking?.placements ?? template?.default_placements ?? EMPTY;

  const onSave = useCallback(
    (nextTiers: TierDefinition[], nextPlacements: TierPlacements) =>
      saveRanking(slug, { tiers: isAdmin ? nextTiers : null, placements: nextPlacements }),
    [slug, isAdmin]
  );

  const handleDeleteOfficial = useCallback(async () => {
    try {
      await deleteOfficialTierList(slug, token);
      router.push(`/${locale}/tier-lists`);
    } catch (err) {
      console.error('Failed to delete official tier list:', err);
    }
  }, [slug, token, locale, router]);

  const onReset = useCallback(() => clearRanking(slug), [slug]);

  const buildExportDoc = useCallback(
    (nextTiers: TierDefinition[], nextPlacements: TierPlacements): TierListDocument => ({
      format: TIER_LIST_FORMAT,
      version: TIER_LIST_FORMAT_VERSION,
      title: template?.title ?? slug,
      template: slug,
      tiers: nextTiers,
      placements: nextPlacements,
    }),
    [template?.title, slug]
  );

  const onImport = useCallback(
    (doc: TierListDocument) =>
      saveRanking(slug, { tiers: isAdmin ? doc.tiers : null, placements: doc.placements }),
    [slug, isAdmin]
  );

  if (!template) {
    // `loading` stays true after a failed first fetch (there is still nothing
    // to show), so an error has to win over it here.
    if (templateLoading && !templateError) return <TierListSkeleton />;
    const notFound = isNotFoundError(templateError);
    return (
      <div className="relative z-10 flex flex-col gap-2">
        <EmptyState
          icon={notFound ? SearchX : TriangleAlert}
          title={notFound ? t.notFoundTitle : t.loadError}
          subtitle={notFound ? t.notFoundSubtitle : t.loadErrorSubtitle}
          action={
            notFound
              ? undefined
              : {
                  label: (
                    <>
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t.retry}
                    </>
                  ),
                  onClick: () => void refresh(),
                }
          }
        />
      </div>
    );
  }

  if (itemsError && items.length === 0) {
    return (
      <div className="relative z-10 flex flex-col gap-2">
        <EmptyState
          icon={TriangleAlert}
          title={t.loadError}
          subtitle={t.loadErrorSubtitle}
          action={{
            label: (
              <>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                {t.retry}
              </>
            ),
            onClick: () => void refreshItems(),
          }}
        />
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
        backLabel={t.nsfw.back}
        onBack={() => router.push(`/${locale}/tier-lists`)}
      />
    );
  }

  // Wait for localStorage as well as the catalog: painting the empty board and
  // then snapping every item into its saved tier a frame later is worse than
  // a spinner.
  if (itemsLoading || !hydrated) return <TierListSkeleton label={t.loadingItems} />;

  return (
    <TierListEditor
      mode="official"
      preferenceKey={template.kind}
      title={template.title}
      description={template.description}
      kindLabel={template.kind === 'custom' ? undefined : t.kinds[template.kind]}
      items={items}
      tiers={tiers}
      placements={placements}
      shape={template.kind === 'maps' ? 'wide' : 'square'}
      defaultShowNames={template.kind === 'maps' || template.kind === 'custom'}
      resetMessage={template.has_default_placements ? t.resetToOfficialMessage : t.resetMessage}
      poolEmptyLabel={t.poolEmpty}
      canEditTiers={isAdmin}
      onSave={onSave}
      editHref={isAdmin && template.kind === 'custom' ? `/${locale}/tier-lists/new?official=${encodeURIComponent(slug)}` : undefined}
      onDelete={isAdmin ? handleDeleteOfficial : undefined}
      onReset={onReset}
      buildExportDoc={buildExportDoc}
      importTarget={{ kind: 'template', slug, title: template.title }}
      onImport={onImport}
      locale={locale}
    />
  );
}

