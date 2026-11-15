'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Pencil, X, Plus, Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { sanitizeImageUrl } from '@/utils/smashOrPass/codec';
import type { TRANSLATABLE_FIELDS } from '@/utils/smashOrPass/constants';
import { SMASH_ROSTER_LIMITS } from '@/utils/smashOrPass/constants';
import { Input, Textarea } from '@/components/common/Field';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from '@/context/DictionaryContext';
import { Badge } from '@/components/common/Badge';

import { Button } from '@/components/common/Button';
import { Img } from '@/components/common/Img';
import { tip } from '@/components/common/Tooltip';
import type { MediaDisplay } from '@/types/smashOrPass';
import { mediaDisplayStyle } from '@/components/smash-or-pass/card/CardAvatarImage';

export interface DraftEntity {
  /** Stable client-only key -- never sent anywhere, just for React lists and
   * keying this entity's translation overrides. */
  key: string;
  slug?: string;
  name: string;
  media_url: string;
  media_display?: MediaDisplay | null;
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
    media_display: null,
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
  disabledHint?: string;
}

const CANDIDATE_CHUNK_SIZE = 40;

export function CandidateTiles({ entities, selectedKey, onSelect, onRename, onRemove, onAdd, canAdd, disabledHint }: CandidateTilesProps) {
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
                  className={cn(
                    'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-chip border transition-all duration-150 select-none',
                    isSelected
                      ? 'border-accent-red ring-2 ring-accent-red/80 bg-bg-surface shadow-md'
                      : 'border-border-color bg-bg-elevated hover:border-accent-red/60 hover:shadow-xs'
                  )}
                >
                  {/* The whole tile selects the candidate; the delete button sits above it. */}
                  <button
                    type="button"
                    onClick={() => onSelect(entity.key)}
                    aria-pressed={isSelected}
                    aria-label={entity.name || `#${displayIndex}`}
                    className="absolute inset-0 z-5 cursor-pointer rounded-chip focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-red"
                  />

                  {/* Number badge on top-left of tile */}
                  <Badge tone="overlay" size="xs" className="pointer-events-none absolute top-1 left-1 z-10">
                    #{displayIndex}
                  </Badge>

                  {/* Edge-to-edge tile image or dark initials placeholder */}
                  {safeMedia ? (
                    <Img
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
                      <Pencil className="icon-sm" aria-hidden="true" />
                    </span>
                  </div>

                  {/* Top-right delete button */}
                  <Button
                    type="button"
                    onClick={() => onRemove(entity.key)}
                    aria-label={formatMessage(c.removeCandidateAria, { name: entity.name || displayIndex })}
                    variant="overlay" size="xs" icon pill className="absolute top-1 right-1 z-10 opacity-80 sm:opacity-0 group-hover/item:opacity-100 hover:opacity-100"
                  >
                    <X aria-hidden="true" />
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
          {entities.length < SMASH_ROSTER_LIMITS.maxEntities && (
            <li className="flex flex-col items-center">
              <Button
                type="button"
                onClick={canAdd ? onAdd : undefined}
                disabled={!canAdd}
                aria-disabled={!canAdd}
                aria-describedby={!canAdd ? 'add-candidate-disabled-hint' : undefined}
                data-testid="add-candidate-tile"
                variant="secondary"
                size="md"
                dashed
                className="group aspect-square h-auto w-full flex-col"
                {...(!canAdd ? tip(disabledHint || c.addCandidateDisabledHint, undefined, 'action') : {})}
              >
                <div className="flex flex-col items-center gap-1">
                  <Plus className="icon-lg transition-transform group-hover:scale-110" />
                  <span className="type-label-2xs">{c.add}</span>
                </div>
              </Button>
              <span className="mt-1 h-6" aria-hidden="true" />
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

export function TextField({
  label,
  value,
  max,
  onChange,
  placeholder,
  full,
}: {
  label: React.ReactNode;
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

export function AutoExpandingTextField({
  label,
  value,
  max,
  onChange,
  placeholder,
  full,
  minRows = 1,
}: {
  label: React.ReactNode;
  value: string;
  max: number;
  onChange: (v: string) => void;
  placeholder?: string;
  full?: boolean;
  minRows?: number;
}) {
  return (
    <label className={full ? 'sm:col-span-2 block' : 'block'}>
      <span className="mb-1 block type-label-xs text-text-secondary">{label}</span>
      <Textarea
        fieldSize="md"
        autoResize
        value={value}
        maxLength={max}
        rows={minRows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 leading-normal"
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
  rows = 3,
}: {
  label: React.ReactNode;
  value: string;
  max: number;
  onChange: (v: string) => void;
  placeholder?: string;
  full?: boolean;
  rows?: number;
}) {
  return (
    <label className={full ? 'sm:col-span-2 block' : 'block'}>
      <span className="mb-1 block type-label-xs text-text-secondary">{label}</span>
      <Textarea
        fieldSize="md"
        autoResize
        value={value}
        maxLength={max}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

const FOCAL_POINTS: Array<{ label: string; value: string }> = [
  { label: 'Top Left', value: 'left top' },
  { label: 'Top Center', value: 'center top' },
  { label: 'Top Right', value: 'right top' },
  { label: 'Center Left', value: 'left center' },
  { label: 'Center', value: 'center center' },
  { label: 'Center Right', value: 'right center' },
  { label: 'Bottom Left', value: 'left bottom' },
  { label: 'Bottom Center', value: 'center bottom' },
  { label: 'Bottom Right', value: 'right bottom' },
];

export interface CandidatePortraitFocalPickerProps {
  safeMedia?: string | null;
  mediaUrl: string;
  name: string;
  displayIndex: string;
  mediaDisplay?: MediaDisplay | null;
  onChangeDisplay: (display: MediaDisplay | null) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onDropFile: (file: File) => void;
  c: Record<string, string>;
  sharedNotice?: React.ReactNode;
}

export function CandidatePortraitFocalPicker({
  safeMedia,
  mediaUrl,
  name,
  displayIndex,
  mediaDisplay,
  onChangeDisplay,
  onPaste,
  onDropFile,
  c,
  sharedNotice,
}: CandidatePortraitFocalPickerProps) {
  const dict = useDictionary();
  const currentPos = mediaDisplay?.position || 'center center';
  const currentScale = mediaDisplay?.scale ?? 1.0;
  const fit = mediaDisplay?.fit ?? 'cover';

  const updatePosition = (pos: string) => {
    onChangeDisplay({
      ...mediaDisplay,
      position: pos,
      fit: 'cover',
      ...(currentScale !== 1.0 ? { scale: currentScale } : {}),
    });
  };

  const updateScale = (newScale: number) => {
    const clamped = Math.min(2.0, Math.max(1.0, Number(newScale.toFixed(2))));
    onChangeDisplay({
      ...mediaDisplay,
      position: currentPos,
      fit: 'cover',
      ...(clamped > 1.0 ? { scale: clamped } : {}),
    });
  };

  const previewStyle = mediaDisplayStyle({
    fit,
    position: currentPos,
    scale: currentScale,
  });

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div
        onPaste={onPaste}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.[0]) onDropFile(e.dataTransfer.files[0]);
        }}
        className="relative w-48 sm:w-56 md:w-60 2xl:max-wide-2k:w-68 wide-2k:w-80 aspect-[3/4] rounded-card border-2 border-dashed border-border-color bg-bg-primary overflow-hidden flex items-center justify-center shadow-md"
      >
        {safeMedia ? (
          <Img
            src={safeMedia}
            alt={name}
            loading="lazy"
            decoding="async"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-150 select-none"
            style={previewStyle}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 p-3 text-center text-text-muted select-none">
            <ImageIcon className="h-10 w-10 opacity-30 text-accent-red" />
            <span className="type-label-sm">{c.preview}</span>
            <span className="type-micro text-text-muted/60">#{displayIndex}</span>
          </div>
        )}
        <Badge tone="overlay" size="sm" plain className="absolute top-2 left-2 text-accent-red">
          #{displayIndex}
        </Badge>
      </div>

      {/* 9-point focal selector & zoom controls when candidate has media */}
      {Boolean(safeMedia || mediaUrl.trim()) && (
        <div className="flex flex-col items-center gap-2 pt-1 max-w-xs">
          <span
            className={cn('type-micro text-text-muted font-medium', c.focalPointHint && 'cursor-help underline decoration-dotted underline-offset-2')}
            {...(c.focalPointHint ? tip(c.focalPointHint, undefined, 'default') : {})}
          >
            {c.focalPointLabel}
            {sharedNotice}
          </span>

          <div
            className="grid grid-cols-3 gap-1 p-1 rounded-card bg-bg-surface/80 border border-border-color/60"
            aria-label={c.focalPointLabel}
          >
            {FOCAL_POINTS.map((pt) => {
              const isSelected = currentPos === pt.value;
              return (
                <button
                  key={pt.value}
                  type="button"
                  aria-label={pt.label}
                  aria-pressed={isSelected}
                  onClick={() => updatePosition(pt.value)}
                  className={cn(
                    'min-h-11 min-w-11 rounded flex items-center justify-center transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-red touch-manipulation',
                    isSelected
                      ? 'bg-accent-red text-text-inverted shadow-sm ring-1 ring-accent-red'
                      : 'bg-bg-elevated hover:bg-bg-hover text-text-muted hover:text-text-primary'
                  )}
                >
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full transition-transform',
                      isSelected ? 'bg-text-primary scale-125' : 'bg-current opacity-60'
                    )}
                  />
                </button>
              );
            })}
          </div>

          {/* Zoom controls for portrait framing */}
          <div className="flex items-center gap-1.5 p-1 px-2 rounded-control bg-bg-surface/60 border border-border-color/40 text-xs">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              icon
              disabled={currentScale <= 1.0}
              onClick={() => updateScale(currentScale - 0.1)}
              {...tip(dict.smashOrPass.cropModal.zoomOut, undefined, 'action')}
              aria-label={dict.smashOrPass.cropModal.zoomOut}
            >
              <ZoomOut className="icon-xs" />
            </Button>

            <span className="type-micro font-bold text-text-muted min-w-9 text-center">
              {Math.round(currentScale * 100)}%
            </span>

            <input
              type="range"
              min="1"
              max="2"
              step="0.05"
              value={currentScale}
              onChange={(e) => updateScale(parseFloat(e.target.value))}
              className="w-20 accent-accent-red cursor-pointer"
              aria-label={c.focalPointLabel}
            />

            <Button
              type="button"
              variant="ghost"
              size="xs"
              icon
              disabled={currentScale >= 2.0}
              onClick={() => updateScale(currentScale + 0.1)}
              {...tip(dict.smashOrPass.cropModal.zoomIn, undefined, 'action')}
              aria-label={dict.smashOrPass.cropModal.zoomIn}
            >
              <ZoomIn className="icon-xs" />
            </Button>

            {currentScale > 1.0 && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                icon
                onClick={() => updateScale(1.0)}
                {...tip(dict.smashOrPass.cropModal.reset, undefined, 'action')}
                aria-label={dict.smashOrPass.cropModal.reset}
              >
                <RotateCcw className="icon-xs" />
              </Button>
            )}
          </div>

          <p className="type-micro text-text-muted/60 text-center leading-tight px-1">
            {c.focalPointZoomHint}
          </p>
        </div>
      )}
    </div>
  );
}
