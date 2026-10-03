'use client';
// frontend/src/components/tier-lists/TierListCards.tsx

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Crown, Trash2 } from 'lucide-react';
import type { StoredCustomList, TierListSummary } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { sanitizeImageUrl } from '@/utils/tierLists/codec';
import { staticUrl } from '@/utils/api';

import { tip } from '@/components/common/Tooltip';
import { formatDate } from '@/utils/format';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";

const CARD =
  'group relative flex h-full flex-col gap-3 overflow-hidden rounded-3xl border border-border-color bg-bg-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent-red/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber';

function coverSrc(url: string): string | null {
  if (!url) return null;
  return url.startsWith('/static/') || !/^[a-z]+:/i.test(url) ? staticUrl(url) ?? null : sanitizeImageUrl(url);
}

interface OfficialCardProps {
  list: TierListSummary;
  rankedCount: number;
  locale: string;
}

export function OfficialTierListCard({ list, rankedCount, locale }: OfficialCardProps) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const cover = coverSrc(list.cover_image_url);
  const kindName = t.kinds[list.kind];
  const isDuplicateKind = Boolean(
    kindName && list.title && kindName.trim().toLowerCase() === list.title.trim().toLowerCase()
  );
  const showKindBadge = Boolean(kindName && !isDuplicateKind);

  return (
    <Link href={`/${locale}/tier-lists/${list.slug}`} className={CARD}>
      {cover && (
        <img src={cover} alt="" loading="lazy" className="-mx-5 -mt-5 mb-1 h-32 w-[calc(100%+2.5rem)] max-w-none object-cover" />
      )}
      <div className="flex items-center sm:items-start justify-center sm:justify-start gap-3">
        <div className="min-w-0 flex-1 text-center sm:text-left">
          {showKindBadge && (
            <span className="type-label-xs text-text-muted">{kindName}</span>
          )}
          <h3 className="mt-0.5 text-lg font-black leading-tight text-text-primary group-hover:text-accent-red">
            {list.title}
          </h3>
        </div>
      </div>
      {list.description && <p className="line-clamp-2 text-sm text-text-secondary text-center sm:text-left">{list.description}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 type-strong">
        {list.item_count !== null && (
          <span className="text-text-muted">{formatMessage(t.itemsCount, { count: list.item_count })}</span>
        )}
        {list.has_default_placements && (
          <span className="inline-flex items-center gap-1 text-accent-amber">
            <Crown className="h-3.5 w-3.5" aria-hidden="true" />
            {t.officialRanking}
          </span>
        )}
        {rankedCount > 0 && (
          <span className="rounded-md bg-accent-green/15 px-1.5 py-0.5 text-accent-green">
            {formatMessage(t.rankedCount, { count: rankedCount })}
          </span>
        )}
        <span className="sm:ml-auto inline-flex items-center gap-0.5 text-accent-red">
          {rankedCount > 0 ? t.continueRanking : t.startRanking}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

interface CustomCardProps {
  list: StoredCustomList;
  locale: string;
  onDelete?: (id: string, title: string) => void;
  /**
   * Renders the same card but as an inert `<div>` instead of a `Link` --
   * for the creator's live "how it'll look" preview, which has no real
   * list id to navigate to yet.
   */
  disabled?: boolean;
}

export function CustomTierListCard({ list, locale, onDelete, disabled }: CustomCardProps) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const ranked = Object.values(list.placements).reduce((n, keys) => n + keys.length, 0);
  const preview = list.items.filter((i) => i.image).slice(0, 5);
  const date = formatDate(list.updatedAt, locale) || null;
  const customTitle = list.title || t.untitled;
  const background = list.backgroundImage ? coverSrc(list.backgroundImage) : null;

  const inner = (
    <>
      {background && (
        // Same subtle full-bleed treatment as the "My Custom Lists" header
        // banner (`TierListHub.tsx`) -- low-opacity, luminosity-blended, and
        // faded back to the surface color so title/meta text stays readable
        // over any image.
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-30 mix-blend-luminosity"
            style={{ backgroundImage: `url('${background}')` }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-bg-surface/25 via-bg-surface/85 to-bg-surface"
          />
        </>
      )}
      <div className="relative z-10 flex flex-1 flex-col gap-3">
        <div className="flex items-center sm:items-start justify-center sm:justify-start gap-3">
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h3 className="text-lg font-black leading-tight text-text-primary group-hover:text-accent-red break-words">
              {customTitle}
            </h3>
          </div>
        </div>
        {preview.length > 0 && (
          <div className="flex justify-center sm:justify-start -space-x-2" aria-hidden="true">
            {preview.map((item) => (
              <img
                key={item.id}
                src={item.image?.startsWith('/static/') ? staticUrl(item.image) : item.image}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-xl border-2 border-bg-surface bg-bg-elevated object-cover"
              />
            ))}
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 type-strong">
          <span className="text-text-muted">{formatMessage(t.itemsCount, { count: list.items.length })}</span>
          {ranked > 0 && (
            <span className="rounded-md bg-accent-green/15 px-1.5 py-0.5 text-accent-green">
              {formatMessage(t.rankedCount, { count: ranked })}
            </span>
          )}
          {date && <span className="text-text-muted">{formatMessage(t.updatedOn, { date })}</span>}
          <div className="sm:ml-auto flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(list.id, customTitle);
                }}
                {...tip(t.deleteTier, undefined, 'action')}
                aria-label={`${t.deleteTier} ${customTitle}`}
                className="p-1.5 rounded-xl border border-border-color bg-bg-surface text-text-muted hover:text-accent-red hover:border-accent-red/40 hover:bg-accent-red/10 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <span className="inline-flex items-center gap-0.5 text-accent-red">
              {t.openList}
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </>
  );

  if (disabled) {
    return (
      <div className={CARD} aria-disabled="true">
        {inner}
      </div>
    );
  }

  return (
    <Link href={`/${locale}/tier-lists/custom/${list.id}`} className={CARD}>
      {inner}
    </Link>
  );
}
