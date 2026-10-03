'use client';

import { Pencil, X, Plus } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { sanitizeImageUrl } from '@/utils/smashOrPass/codec';
import { SMASH_ROSTER_LIMITS, TRANSLATABLE_FIELDS } from '@/utils/smashOrPass/constants';
import { Input, Textarea } from '@/components/common/Field';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from '@/context/DictionaryContext';

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

export function CandidateTiles({ entities, selectedKey, onSelect, onRename, onRemove, onAdd, canAdd }: CandidateTilesProps) {
  const dict = useDictionary();
  const c = dict.smashOrPass.creator || {};

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="w-20 hidden sm:block pointer-events-none" aria-hidden="true" />
        <h4 className="flex-1 text-center text-xs sm:text-sm font-black uppercase tracking-wider text-text-secondary">
          {c.allCandidatesHeading} ({entities.length}/{SMASH_ROSTER_LIMITS.maxEntities})
        </h4>
        <div className="w-20 hidden sm:block pointer-events-none" aria-hidden="true" />
      </div>

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] md:grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] wide:grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] wide-2k:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2 sm:gap-2.5 justify-center">
        {entities.map((entity, i) => {
          const isSelected = entity.key === selectedKey;
          const displayIndex = String(i + 1).padStart(2, '0');
          const safeMedia = entity.media_url.trim() ? sanitizeImageUrl(entity.media_url.trim()) : null;

          return (
            <li key={entity.key} className="group/item relative flex flex-col items-center">
              {/* Crisp Square Tile Container */}
              <div
                onClick={() => onSelect(entity.key)}
                className={cn(
                  'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border transition-all duration-150 cursor-pointer select-none',
                  isSelected
                    ? 'border-accent-red ring-2 ring-accent-red/80 bg-bg-surface shadow-md'
                    : 'border-border-color bg-bg-elevated hover:border-accent-red/60 hover:shadow-xs'
                )}
              >
                {/* Number badge on top-left of tile */}
                <span className="absolute top-1 left-1 z-10 text-micro font-black px-1.5 py-0.5 rounded bg-bg-surface/90 text-text-secondary border border-border-color/60 backdrop-blur-xs">
                  #{displayIndex}
                </span>

                {/* Edge-to-edge tile image or dark initials placeholder */}
                {safeMedia ? (
                  <img
                    src={safeMedia}
                    alt={entity.name}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover/item:scale-105"
                  />
                ) : (
                  <span className="text-base sm:text-lg font-black text-text-muted select-none">
                    {entity.name.slice(0, 2).toUpperCase() || displayIndex}
                  </span>
                )}

                {/* Edit overlay icon on hover */}
                <div className="absolute inset-0 z-0 flex items-center justify-center bg-bg-primary/50 opacity-0 group-hover/item:opacity-100 transition-opacity backdrop-blur-xs">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-bg-surface/90 text-accent-red shadow-sm border border-border-color/60">
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </div>

                {/* Top-right delete button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(entity.key);
                  }}
                  aria-label={formatMessage((c.removeCandidateAria), { name: entity.name || displayIndex })}
                  className="hit-area absolute top-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded-md bg-bg-surface/90 text-text-muted opacity-80 sm:opacity-0 group-hover/item:opacity-100 hover:!opacity-100 hover:bg-accent-red hover:text-text-inverted transition-all shadow-xs cursor-pointer border border-border-color/40"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>

              {/* Seamless Typography Caption / Inline Input */}
              <input
                value={entity.name}
                maxLength={SMASH_ROSTER_LIMITS.maxEntityName}
                onChange={(e) => onRename(entity.key, e.target.value)}
                onFocus={() => onSelect(entity.key)}
                placeholder={c.unnamedCandidate}
                aria-label={formatMessage((c.renameCandidateAria), { name: entity.name || displayIndex })}
                className="mt-1 h-6 w-full rounded-sm border border-transparent bg-transparent px-1 text-center type-strong text-text-secondary transition-colors hover:text-text-primary hover:bg-bg-elevated/40 focus:border-accent-red focus:bg-bg-surface focus:text-text-primary focus:outline-hidden truncate"
              />
            </li>
          );
        })}

        {/* Trailing '+ Add' tile if under limit */}
        {canAdd && (
          <li className="flex flex-col items-center">
            <button
              type="button"
              onClick={onAdd}
              data-testid="add-candidate-tile"
              className="relative flex aspect-square w-full items-center justify-center rounded-lg border-2 border-dashed border-border-color hover:border-accent-red bg-bg-elevated/40 hover:bg-bg-elevated transition-all duration-150 text-text-muted hover:text-accent-red cursor-pointer group select-none"
            >
              <div className="flex flex-col items-center gap-1">
                <Plus className="h-5 w-5 transition-transform group-hover:scale-110" />
                <span className="type-label-2xs">{c.add}</span>
              </div>
            </button>
            <span className="mt-1 h-6 type-micro text-text-muted flex items-center select-none">
              {c.addCandidateTile}
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}

export function entityTranslationFieldLabel(c: Dictionary['smashOrPass']['creator'], field: string): string {
  const map: Record<string, string> = {
    archetype: c.entityArchetypeLabel || 'Archetype',
    bio: c.entityBioLabel || 'Bio',
    tagline: c.entityTaglineLabel || 'Tagline',
    quote: c.entityQuoteLabel || 'Signature quote',
    meme: c.entityMemeLabel || 'Meme',
    turn_on: c.entityTurnOnLabel || 'Turn on',
    dealbreaker: c.entityDealbreakerLabel || 'Dealbreaker',
    dating_vibe: c.entityDatingVibeLabel || 'Dating vibe',
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
