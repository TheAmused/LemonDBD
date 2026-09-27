'use client';
// frontend/src/components/tier-lists/OfficialTierListView.tsx

import React, { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, Crown, RotateCcw, SearchX, TriangleAlert } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import type { Dictionary } from '@/locales/types';
import {
  TIER_LIST_FORMAT,
  TIER_LIST_FORMAT_VERSION,
  type TierDefinition,
  type TierListDocument,
  type TierPlacements,
} from '@/types/tierList';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useTierListItems } from '@/hooks/useTierListItems';
import { useTierListStore } from '@/hooks/useTierListStore';
import { useTierListTemplate } from '@/hooks/useTierListTemplates';
import { isNotFoundError } from '@/services/tierListApi';
import { resolveTiers } from '@/utils/tierLists/board';
import { clearRanking, saveRanking } from '@/utils/tierLists/storage';
import { TierListEditor } from './TierListEditor';
import { TierListSkeleton } from './TierListSkeleton';

interface OfficialTierListViewProps {
  slug: string;
  locale: string;
  dict: Dictionary;
}

const EMPTY: TierPlacements = {};

/** An official (database) tier list, ranked by this browser's user. */
export function OfficialTierListView({ slug, locale, dict }: OfficialTierListViewProps) {
  const t = dict.tierLists;
  const { template, loading: templateLoading, error: templateError, refresh } = useTierListTemplate(slug, locale);
  const { items, loading: itemsLoading, error: itemsError, refresh: refreshItems } = useTierListItems(template, locale);
  const { state, hydrated } = useTierListStore();

  useDocumentTitle(template ? `LemonDBD - ${template.title}` : t.pageTitle);

  const ranking = state.rankings[slug];
  const tiers = useMemo(() => resolveTiers(ranking?.tiers, template?.tiers), [ranking?.tiers, template?.tiers]);
  // No ranking yet: start from the official LemonDBD ranking when there is one.
  const placements = ranking?.placements ?? template?.default_placements ?? EMPTY;

  const onSave = useCallback(
    (nextTiers: TierDefinition[], nextPlacements: TierPlacements) =>
      saveRanking(slug, { tiers: nextTiers, placements: nextPlacements }),
    [slug]
  );

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
    (doc: TierListDocument) => saveRanking(slug, { tiers: doc.tiers, placements: doc.placements }),
    [slug]
  );

  const backLink = (
    <Link
      href={`/${locale}/tier-lists`}
      className="inline-flex min-h-[44px] w-fit items-center gap-1 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-accent-red"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      {t.backToHub}
    </Link>
  );

  if (!template) {
    // `loading` stays true after a failed first fetch (there is still nothing
    // to show), so an error has to win over it here.
    if (templateLoading && !templateError) return <TierListSkeleton dict={dict} />;
    const notFound = isNotFoundError(templateError);
    return (
      <div className="relative z-10 flex flex-col gap-2">
        {backLink}
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
        {backLink}
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

  // Wait for localStorage as well as the catalog: painting the empty board and
  // then snapping every item into its saved tier a frame later is worse than
  // a spinner.
  if (itemsLoading || !hydrated) return <TierListSkeleton dict={dict} label={t.loadingItems} />;

  return (
    <TierListEditor
      mode="official"
      preferenceKey={template.kind}
      title={template.title}
      description={template.description}
      kindLabel={t.kinds[template.kind]}
      badges={
        template.has_default_placements ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-accent-amber/15 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-accent-amber">
            <Crown className="h-3.5 w-3.5" aria-hidden="true" />
            {t.officialRanking}
          </span>
        ) : undefined
      }
      items={items}
      tiers={tiers}
      placements={placements}
      shape={template.kind === 'maps' ? 'wide' : 'square'}
      defaultShowNames={template.kind === 'maps' || template.kind === 'custom'}
      resetMessage={template.has_default_placements ? t.resetToOfficialMessage : t.resetMessage}
      poolEmptyLabel={t.poolEmpty}
      onSave={onSave}
      onReset={onReset}
      buildExportDoc={buildExportDoc}
      importTarget={{ kind: 'template', slug, title: template.title }}
      onImport={onImport}
      locale={locale}
      dict={dict}
    />
  );
}
