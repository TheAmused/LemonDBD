'use client';
// frontend/src/components/tier-lists/TierListCards.tsx

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Crown, Trash2 } from 'lucide-react';
import type { StoredCustomList, TierListSummary } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { sanitizeImageUrl } from '@/utils/tierLists/codec';
import { staticUrl } from '@/utils/api';

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
  dict: Dictionary;
}

export function OfficialTierListCard({ list, rankedCount, locale, dict }: OfficialCardProps) {
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
        // eslint-disable-next-line @next/next/no-img-element -- images are unoptimized app-wide
        <img src={cover} alt="" loading="lazy" className="-mx-5 -mt-5 mb-1 h-32 w-[calc(100%+2.5rem)] max-w-none object-cover" />
      )}
      <div className="flex items-center sm:items-start justify-center sm:justify-start gap-3">
        <div className="min-w-0 flex-1 text-center sm:text-left">
          {(showKindBadge || list.is_featured) && (
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              {showKindBadge && (
                <span className="text-[11px] font-black uppercase tracking-wider text-text-muted">{kindName}</span>
              )}
              {list.is_featured && (
                <span className="rounded-md bg-accent-amber/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent-amber">
                  {t.featured}
                </span>
              )}
            </div>
          )}
          <h3 className="mt-0.5 text-lg font-black leading-tight text-text-primary group-hover:text-accent-red">
            {list.title}
          </h3>
        </div>
      </div>
      {list.description && <p className="line-clamp-2 text-sm text-text-secondary text-center sm:text-left">{list.description}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs font-bold">
        {list.item_count !== null && (
          <span className="text-text-muted">{t.itemsCount.replace('{count}', String(list.item_count))}</span>
        )}
        {list.has_default_placements && (
          <span className="inline-flex items-center gap-1 text-accent-amber">
            <Crown className="h-3.5 w-3.5" aria-hidden="true" />
            {t.officialRanking}
          </span>
        )}
        {rankedCount > 0 && (
          <span className="rounded-md bg-accent-green/15 px-1.5 py-0.5 text-accent-green">
            {t.rankedCount.replace('{count}', String(rankedCount))}
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
  dict: Dictionary;
  onDelete?: (id: string, title: string) => void;
}

export function CustomTierListCard({ list, locale, dict, onDelete }: CustomCardProps) {
  const t = dict.tierLists;
  const ranked = Object.values(list.placements).reduce((n, keys) => n + keys.length, 0);
  const preview = list.items.filter((i) => i.image).slice(0, 5);
  const date = list.updatedAt ? new Date(list.updatedAt).toLocaleDateString(locale) : null;
  const customTitle = list.title || t.untitled;
  const isDuplicateCustomKind = Boolean(
    t.kinds.custom && customTitle && t.kinds.custom.trim().toLowerCase() === customTitle.trim().toLowerCase()
  );

  return (
    <Link href={`/${locale}/tier-lists/custom/${list.id}`} className={CARD}>
      <div className="flex items-center sm:items-start justify-center sm:justify-start gap-3">
        <div className="min-w-0 flex-1 text-center sm:text-left">
          {!isDuplicateCustomKind && (
            <span className="text-[11px] font-black uppercase tracking-wider text-text-muted">{t.kinds.custom}</span>
          )}
          <h3 className="mt-0.5 text-lg font-black leading-tight text-text-primary group-hover:text-accent-red break-words">
            {customTitle}
          </h3>
        </div>
      </div>
      {preview.length > 0 && (
        <div className="flex justify-center sm:justify-start -space-x-2" aria-hidden="true">
          {preview.map((item) => (
            // eslint-disable-next-line @next/next/no-img-element -- user-supplied images
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
      <div className="mt-auto flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs font-bold">
        <span className="text-text-muted">{t.itemsCount.replace('{count}', String(list.items.length))}</span>
        {ranked > 0 && (
          <span className="rounded-md bg-accent-green/15 px-1.5 py-0.5 text-accent-green">
            {t.rankedCount.replace('{count}', String(ranked))}
          </span>
        )}
        {date && <span className="text-text-muted">{t.updatedOn.replace('{date}', date)}</span>}
        <div className="sm:ml-auto flex items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(list.id, customTitle);
              }}
              title={t.deleteTier}
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
    </Link>
  );
}
