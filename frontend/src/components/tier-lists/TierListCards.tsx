'use client';
// frontend/src/components/tier-lists/TierListCards.tsx

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Crown, Info, Trash2 } from 'lucide-react';
import type { StoredCustomList, TierListSummary } from '@/types/tierList';
import { sanitizeImageUrl } from '@/utils/tierLists/codec';
import { staticUrl } from '@/utils/api';

import { tip } from '@/components/common/Tooltip';
import { formatDate } from '@/utils/format';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";
import { NsfwBadge } from '@/components/common/NsfwBadge';

const CARD =
  'group relative flex h-full flex-col overflow-hidden rounded-card border border-border-color/80 bg-bg-surface p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-accent-red/50 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber';

const DEFAULT_OFFICIAL_COVERS: Record<string, string> = {
  'survivor-perks': '/static/tier-lists/banner_survivor_perks.webp',
  'survivor_perks': '/static/tier-lists/banner_survivor_perks.webp',
  'killer-perks': '/static/tier-lists/banner_killer_perks.webp',
  'killer_perks': '/static/tier-lists/banner_killer_perks.webp',
  'survivors': '/static/tier-lists/banner_survivors.webp',
  'killers': '/static/tier-lists/banner_killers.webp',
  'maps': '/static/tier-lists/banner_maps.webp',
};

/** Thumbnails shown on a custom card before the `+N` overflow counter. */
const SHOWCASE_MAX = 4;

const DEFAULT_CUSTOM_COVER = '/static/tier-lists/banner_custom_default.webp';

function coverSrc(url: string): string | null {
  if (!url) return null;
  if (url.startsWith('/images/')) return url;
  if (url.startsWith('/static/')) return url;
  if (!/^[a-z]+:/i.test(url)) return staticUrl(url) ?? null;
  return sanitizeImageUrl(url);
}

/** True while the one-line clamped text is actually cut off (re-measured on resize). */
function useIsClamped(ref: React.RefObject<HTMLElement | null>, text: string): boolean {
  const [clamped, setClamped] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      setClamped(false);
      return;
    }
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, text]);
  return clamped;
}

/**
 * Reveals a clamped description without growing the card: an info button in the banner corner frosts the
 * banner and prints the full text over it while hovered, focused or tapped. The overlay ignores pointer
 * events, so the card link underneath keeps working, and the banner chips fade out of its way.
 */
function DescriptionPeek({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-20 flex items-center bg-bg-surface/90 py-3 pl-14 pr-4 backdrop-blur-md transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="type-caption text-text-primary line-clamp-6 break-words text-left">{text}</p>
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-label={text}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className="hit-area absolute bottom-3 left-3 z-30 flex h-8 w-8 items-center justify-center rounded-control border border-border-color/60 bg-bg-surface/85 text-text-muted shadow-xs backdrop-blur-md transition-colors cursor-pointer hover:text-text-primary"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
    </>
  );
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
  const defaultCover = DEFAULT_OFFICIAL_COVERS[list.slug] || DEFAULT_OFFICIAL_COVERS[list.kind] || null;
  const effectiveCover = cover || (defaultCover ? coverSrc(defaultCover) : null);
  const kindName = t.kinds[list.kind];
  const isDuplicateKind = Boolean(
    kindName && list.title && kindName.trim().toLowerCase() === list.title.trim().toLowerCase()
  );
  const descRef = React.useRef<HTMLParagraphElement>(null);
  const descClamped = useIsClamped(descRef, list.description ?? '');
  const showKindBadge = Boolean(kindName && !isDuplicateKind);
  const fullyRanked = list.item_count !== null && list.item_count > 0 && rankedCount >= list.item_count;

  return (
    <Link href={`/${locale}/tier-lists/${list.slug}`} className={CARD}>
      <div className="group/banner relative -mx-5 -mt-5 mb-2 h-32 w-[calc(100%+2.5rem)] max-w-none overflow-hidden bg-bg-elevated">
        {effectiveCover && (
          <img
            src={effectiveCover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-bg-surface via-bg-surface/50 to-transparent pointer-events-none"
        />
        {descClamped && list.description && <DescriptionPeek text={list.description} />}
        {rankedCount > 0 && (
          <div className="absolute top-3 left-3 z-10 transition-opacity group-has-[[aria-expanded=true]]/banner:opacity-0">
            <span
              className={`rounded-chip bg-bg-surface/85 backdrop-blur-md px-2 py-0.5 type-label-2xs border border-border-color/60 shadow-xs tabular-nums ${
                fullyRanked ? 'text-accent-green' : 'text-text-muted'
              }`}
            >
              {formatMessage(t.rankedCount, {
                count: list.item_count !== null ? `${rankedCount}/${list.item_count}` : rankedCount,
              })}
            </span>
          </div>
        )}
        {list.is_nsfw && (
          <div className="absolute top-3 left-1/2 z-10 -translate-x-1/2 transition-opacity group-has-[[aria-expanded=true]]/banner:opacity-0">
            <NsfwBadge label={t.nsfw.badge} />
          </div>
        )}
        {showKindBadge && (
          <div className="absolute top-3 right-3 z-10 transition-opacity group-has-[[aria-expanded=true]]/banner:opacity-0">
            <span className="rounded-chip bg-bg-surface/85 backdrop-blur-md px-2 py-0.5 type-label-2xs text-text-muted border border-border-color/60 shadow-xs">
              {kindName}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 text-center sm:text-left">
        <h3 className="type-card-title text-text-primary group-hover:text-accent-red transition-colors line-clamp-1">
          {list.title}
        </h3>
        {list.description && (
          <p ref={descRef} className="type-caption text-text-muted line-clamp-1">
            {list.description}
          </p>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2 type-strong">
        {list.item_count !== null && (
          <span className="text-text-muted">{formatMessage(t.itemsCount, { count: list.item_count })}</span>
        )}
        {list.has_default_placements && (
          <span className="inline-flex items-center gap-1 text-accent-amber">
            <Crown className="h-3.5 w-3.5" aria-hidden="true" />
            {t.officialRanking}
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
  const descRef = React.useRef<HTMLParagraphElement>(null);
  const descClamped = useIsClamped(descRef, list.description ?? '');
  const total = list.items.length;
  const ranked = Object.values(list.placements).reduce((n, keys) => n + keys.length, 0);
  const date = list.updatedAt > 0 ? formatDate(list.updatedAt, locale) || null : null;
  const customTitle = list.title || t.untitled;
  const background = list.backgroundImage ? coverSrc(list.backgroundImage) : null;
  const effectiveBackground = background || coverSrc(DEFAULT_CUSTOM_COVER);
  const shown = list.items.slice(0, SHOWCASE_MAX);
  const overflow = total - shown.length;
  const fullyRanked = total > 0 && ranked >= total;

  const inner = (
    <>
      <div className="group/banner relative -mx-5 -mt-5 mb-2 h-32 w-[calc(100%+2.5rem)] max-w-none overflow-hidden bg-bg-elevated">
        {effectiveBackground && (
          <img
            src={effectiveBackground}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-bg-surface via-bg-surface/50 to-transparent pointer-events-none"
        />
        {descClamped && list.description && <DescriptionPeek text={list.description} />}
        <div className="absolute top-3 left-3 z-10 transition-opacity group-has-[[aria-expanded=true]]/banner:opacity-0">
          <span
            className={`rounded-chip bg-bg-surface/85 backdrop-blur-md px-2 py-0.5 type-label-2xs border border-border-color/60 shadow-xs tabular-nums ${
              fullyRanked ? 'text-accent-green' : 'text-text-muted'
            }`}
          >
            {formatMessage(t.itemsCount, { count: `${ranked}/${total}` })}
          </span>
        </div>
        {list.is_nsfw && (
          <div className="absolute top-3 left-1/2 z-10 -translate-x-1/2 transition-opacity group-has-[[aria-expanded=true]]/banner:opacity-0">
            <NsfwBadge label={t.nsfw.badge} />
          </div>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(list.id, customTitle);
            }}
            {...tip(t.deleteList, undefined, 'action')}
            aria-label={`${t.deleteList} ${customTitle}`}
            className="hit-area absolute top-3 right-3 z-10 flex h-8 w-8 rounded-control items-center justify-center border border-border-color/60 bg-bg-surface/85 backdrop-blur-md text-text-muted shadow-xs transition-[opacity,color,background-color] cursor-pointer hover:bg-accent-red/20 hover:text-accent-red group-has-[[aria-expanded=true]]/banner:opacity-0"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="relative z-10 flex flex-1 flex-col gap-2.5">
        <div className="flex flex-col gap-1 text-center sm:text-left">
          <h3 className="type-card-title text-text-primary group-hover:text-accent-red transition-colors line-clamp-1 break-words">
            {customTitle}
          </h3>
          {list.description && (
            <p ref={descRef} className="type-caption text-text-muted line-clamp-1">
              {list.description}
            </p>
          )}
        </div>

        {/* Item showcase strip: fixed height, at most SHOWCASE_MAX thumbnails + overflow counter. */}
        <div className="flex h-10 items-center justify-center sm:justify-start gap-1.5 overflow-hidden">
          {total === 0 ? (
            <span className="type-caption text-text-muted italic line-clamp-1">{t.poolEmptyCustom}</span>
          ) : (
            <>
              {shown.map((item) =>
                item.image ? (
                  <img
                    key={item.id}
                    src={coverSrc(item.image) ?? undefined}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 shrink-0 rounded-chip border border-border-color bg-bg-elevated object-cover shadow-xs"
                  />
                ) : (
                  <span
                    key={item.id}
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-chip border border-border-color bg-bg-elevated type-strong-xs text-text-muted shadow-xs"
                  >
                    {Array.from(item.name.trim())[0]?.toUpperCase() ?? '?'}
                  </span>
                )
              )}
              {overflow > 0 && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-chip border border-dashed border-border-color bg-bg-surface/80 type-strong-xs text-text-muted shadow-xs tabular-nums">
                  +{overflow}
                </span>
              )}
            </>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2 type-strong">
          <span className="text-text-muted type-caption">{date ? formatMessage(t.updatedOn, { date }) : ''}</span>
          <span className="inline-flex items-center gap-0.5 text-accent-red">
            {t.openList}
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
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
