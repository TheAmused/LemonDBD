'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Pencil, X, Plus } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { sanitizeImageUrl } from '@/utils/smashOrPass/codec';
import { SMASH_ROSTER_LIMITS, TRANSLATABLE_FIELDS } from '@/utils/smashOrPass/constants';
import { Input, Textarea } from '@/components/common/Field';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from '@/context/DictionaryContext';
import { Badge } from '@/components/common/Badge';

import { Button } from '@/components/common/Button';
export interface DraftEntity {
  /** Stable client-only key -- never sent anywhere, just for React lists and
   * keying this entity's translation overrides. */
  key: string;
  name: string;
  media_url: string;
  role: string;
  gender: string;
  real_name: string;
  archetype: string;
  tagline: string;
  bio: string;
  quote: string;
  meme: string;
  turn_on: string;
  dealbreaker: string;
  dating_vibe: string;
  red_flags: string;
  green_flags: string;
  watermark_left: string;
  watermark_right: string;
}

export function emptyDraftEntity(key: string): DraftEntity {
  return {
    key,
    name: '',
    media_url: '',
    role: '',
    gender: '',
    real_name: '',
    archetype: '',
    tagline: '',
    bio: '',
    quote: '',
    meme: '',
    turn_on: '',
    dealbreaker: '',
    dating_vibe: '',
    red_flags: '',
    green_flags: '',
    watermark_left: '',
    watermark_right: '',
  };
}

/** One locale's overrides for this entity's translatable fields. */
export type EntityTranslationDraft = Partial<Record<(typeof TRANSLATABLE_FIELDS)[number], string>>;

export interface CandidateTilesProps {
  entities: DraftEntity[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onRename: (key: string, name: string) => void;
  onRemove: (key: string) => void;
  onAdd: () => void;
  canAdd: boolean;
}

const CANDIDATE_CHUNK_SIZE = 40;

export function CandidateTiles({ entities, selectedKey, onSelect, onRename, onRemove, onAdd, canAdd }: CandidateTilesProps) {
  const dict = useDictionary();
  const c = dict.smashOrPass.creator || {};
  const [visibleCount, setVisibleCount] = useState<number>(CANDIDATE_CHUNK_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleCount >= entities.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + CANDIDATE_CHUNK_SIZE, entities.length));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, entities.length]);

  const visibleEntities = entities.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="w-20 hidden sm:block pointer-events-none" aria-hidden="true" />
        <h4 className="flex-1 text-center text-xs sm:text-sm font-black uppercase tracking-wider text-text-secondary">
          {c.allCandidatesHeading} ({entities.length}/{SMASH_ROSTER_LIMITS.maxEntities})
        </h4>
        <div className="w-20 hidden sm:block pointer-events-none" aria-hidden="true" />
      </div>

      <div className="max-h-96 sm:max-h-roster overflow-y-auto overflow-x-hidden p-2 rounded-card border border-border-color/60 bg-bg-surface/30">
        <ul className="grid grid-cols-tiles-sm sm:grid-cols-tiles-md md:grid-cols-tiles-lg wide:grid-cols-tiles-xl wide-2k:grid-cols-tiles-2xl gap-2 sm:gap-2.5 justify-center">
          {visibleEntities.map((entity, i) => {
            const isSelected = entity.key === selectedKey;
            const displayIndex = String(i + 1).padStart(2, '0');
            const safeMedia = entity.media_url.trim() ? sanitizeImageUrl(entity.media_url.trim()) : null;

            return (
              <li key={entity.key} className="group/item relative flex flex-col items-center">
                {/* Crisp Square Tile Container */}
                <div
                  onClick={() => onSelect(entity.key)}
                  className={cn(
                    'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-chip border transition-all duration-150 cursor-pointer select-none',
                    isSelected
                      ? 'border-accent-red ring-2 ring-accent-red/80 bg-bg-surface shadow-md'
                      : 'border-border-color bg-bg-elevated hover:border-accent-red/60 hover:shadow-xs'
                  )}
                >
                  {/* Number badge on top-left of tile */}
                  <Badge tone="overlay" size="xs" className="absolute top-1 left-1 z-10">
                    #{displayIndex}
                  </Badge>

                  {/* Edge-to-edge tile image or dark initials placeholder */}
                  {safeMedia ? (
                    <img
                      src={safeMedia}
                      alt={entity.name}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-200 group-hover/item:scale-105 select-none"
                    />
                  ) : (
                    <span className="text-base sm:text-lg font-black text-text-muted select-none">
                      {entity.name.slice(0, 2).toUpperCase() || displayIndex}
                    </span>
                  )}

                  {/* Edit overlay icon on hover */}
                  <div className="absolute inset-0 z-0 flex items-center justify-center bg-bg-primary/50 opacity-0 group-hover/item:opacity-100 transition-opacity backdrop-blur-xs">
                    <span className="flex h-7 w-7 items-center justify-center rounded-chip bg-bg-surface/90 text-accent-red shadow-sm border border-border-color/60">
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </div>

                  {/* Top-right delete button */}
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(entity.key);
                    }}
                    aria-label={formatMessage(c.removeCandidateAria, { name: entity.name || displayIndex })}
                    variant="overlay" size="xs" icon pill className="absolute top-1 right-1 z-10 opacity-80 sm:opacity-0 group-hover/item:opacity-100 hover:opacity-100"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </Button>
                </div>

                {/* Seamless Typography Caption / Inline Input */}
                <input
                  value={entity.name}
                  maxLength={SMASH_ROSTER_LIMITS.maxEntityName}
                  onChange={(e) => onRename(entity.key, e.target.value)}
                  onFocus={() => onSelect(entity.key)}
                  placeholder={c.unnamedCandidate}
                  aria-label={formatMessage(c.renameCandidateAria, { name: entity.name || displayIndex })}
                  className="mt-1 h-6 w-full rounded-chip border border-transparent bg-transparent px-1 text-center type-strong text-text-secondary transition-colors hover:text-text-primary hover:bg-bg-elevated/40 focus:border-accent-red focus:bg-bg-surface focus:text-text-primary focus:outline-hidden truncate"
                />
              </li>
            );
          })}

          {/* Trailing '+ Add' tile if under limit */}
          {canAdd && (
            <li className="flex flex-col items-center">
              <Button
                type="button"
                onClick={onAdd}
                data-testid="add-candidate-tile"
                variant="secondary" size="md" dashed className="group aspect-square h-auto w-full flex-col"
              >
                <div className="flex flex-col items-center gap-1">
                  <Plus className="h-5 w-5 transition-transform group-hover:scale-110" />
                  <span className="type-label-2xs">{c.add}</span>
                </div>
              </Button>
              <span className="mt-1 h-6 type-micro text-text-muted flex items-center select-none">
                {c.addCandidateTile}
              </span>
            </li>
          )}
        </ul>

        {visibleCount < entities.length && (
          <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

export function entityTranslationFieldLabel(c: Dictionary['smashOrPass']['creator'], field: string): string {
  const map: Record<string, string> = {
    archetype: c.entityArchetypeLabel,
    bio: c.entityBioLabel,
    tagline: c.entityTaglineLabel,
    quote: c.entityQuoteLabel,
    meme: c.entityMemeLabel,
    turn_on: c.entityTurnOnLabel,
    dealbreaker: c.entityDealbreakerLabel,
    dating_vibe: c.entityDatingVibeLabel,
  };
  return map[field] || field;
}

export function TextField({
  label,
  value,
  max,
  onChange,
  placeholder,
  full,
}: {
  label: string;
  value: string;
  max: number;
  onChange: (v: string) => void;
  placeholder?: string;
  full?: boolean;
}) {
  return (
    <label className={full ? 'sm:col-span-2 block' : 'block'}>
      <span className="mb-1 block type-label-xs text-text-secondary">{label}</span>
      <Input
        fieldSize="md"
        value={value}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  max,
  onChange,
  placeholder,
  full,
}: {
  label: string;
  value: string;
  max: number;
  onChange: (v: string) => void;
  placeholder?: string;
  full?: boolean;
}) {
  return (
    <label className={full ? 'sm:col-span-2 block' : 'block'}>
      <span className="mb-1 block type-label-xs text-text-secondary">{label}</span>
      <Textarea
        fieldSize="md"
        value={value}
        maxLength={max}
        rows={3}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
