'use client';
// frontend/src/components/smash-or-pass/creator/EntityEditor.tsx
/**
 * Roster candidate editing components:
 * - CandidateFormInputs: Form inputs to edit the active candidate's profile, portrait, and taxonomy.
 * - CandidateTiles: Squished grid of candidates (avatar + name caption) matching the tier list items pattern.
 */
import React, { useState } from 'react';
import { ChevronDown, Trash2, Image as ImageIcon, Pencil, X, Plus } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { sanitizeImageUrl } from '@/utils/smashOrPass/codec';
import { GENDER_QUICK_PICKS, ROLE_QUICK_PICKS, SMASH_ROSTER_LIMITS, TRANSLATABLE_FIELDS, TRANSLATABLE_LOCALES } from '@/utils/smashOrPass/constants';
import type { RosterCustomLabels } from '@/types/smashOrPass';
import { FIELD, LABEL, TEXTAREA_FIELD } from './styles';

import { tip } from '@/components/common/Tooltip';
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

export interface CandidateFormInputsProps {
  entity: DraftEntity;
  index: number;
  totalCount?: number;
  onChange: (patch: Partial<DraftEntity>) => void;
  onRemove: () => void;
  showTranslations: boolean;
  translations: Record<string, EntityTranslationDraft>;
  onTranslationChange: (locale: string, field: string, value: string) => void;
  locale: string;
  dict?: Dictionary | any;
  isSimpleMode?: boolean;
  customLabels?: RosterCustomLabels;
  availableRoles?: string[];
  availableGenders?: string[];
  onRegisterTaxonomy?: (type: 'role' | 'gender', name: string) => void;
}

export function CandidateFormInputs({
  entity,
  index,
  onChange,
  onRemove,
  showTranslations,
  translations,
  onTranslationChange,
  dict,
  isSimpleMode = false,
  customLabels = {},
  availableRoles = [...ROLE_QUICK_PICKS],
  availableGenders = [...GENDER_QUICK_PICKS],
  onRegisterTaxonomy,
}: CandidateFormInputsProps) {
  const c = dict?.smashOrPass?.creator || {};
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeLocale, setActiveLocale] = useState<string>(TRANSLATABLE_LOCALES[0]);

  const trimmedMedia = entity.media_url.trim();
  const safeMedia = trimmedMedia ? sanitizeImageUrl(trimmedMedia) : null;
  const mediaInvalid = Boolean(trimmedMedia) && !safeMedia;

  const displayIndex = String(index + 1).padStart(2, '0');

  return (
    <div className="flex flex-col gap-4">
      {/* Active candidate header with identity & remove button */}
      <div className="relative flex items-center justify-between pb-3 border-b border-border-color/60">
        <div className="w-24 hidden sm:block pointer-events-none" aria-hidden="true" />
        <div className="flex-1 flex flex-wrap items-center justify-center gap-2 min-w-0 text-center">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-accent-red/10 border border-accent-red/30 text-accent-red">
            #{displayIndex}
          </span>
          <h3 className="font-bold text-sm sm:text-base text-text-primary truncate">
            {c.editingCandidate || 'Editing Candidate'}:{' '}
            <span className="text-accent-red font-mono">{entity.name.trim() || c.unnamedCandidate || 'Unnamed Candidate'}</span>
          </h3>
        </div>
        <div className="w-24 flex justify-end">
          <button
            type="button"
            onClick={onRemove}
            aria-label={(c.removeCandidateAria || 'Remove {name}').replace('{name}', entity.name || displayIndex)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors cursor-pointer shrink-0"
            {...tip(c.removeCandidate || 'Remove candidate')}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{c.removeCandidate || 'Remove'}</span>
          </button>
        </div>
      </div>

      {/* Inputs grid */}
      <div className="space-y-4">
        {/* Top Row: Avatar preview (prominent) & Primary identifiers (compact) */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-6 2xl:gap-8 max-w-3xl 2xl:max-wide-2k:max-w-4xl wide-2k:max-w-6xl mx-auto w-full">
          {/* Visual Portrait Box - prominent and large */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative w-48 sm:w-56 md:w-60 2xl:max-wide-2k:w-68 wide-2k:w-80 aspect-[3/4] rounded-2xl border-2 border-dashed border-border-color bg-bg-primary overflow-hidden flex items-center justify-center shadow-md">
              {safeMedia ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={safeMedia}
                  alt={entity.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 p-3 text-center text-text-muted select-none">
                  <ImageIcon className="h-10 w-10 opacity-30 text-accent-red" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">{c.preview || 'Preview'}</span>
                  <span className="text-[10px] font-mono text-text-muted/60">#{displayIndex}</span>
                </div>
              )}
              <span className="absolute top-2 left-2 font-mono text-[10px] font-black px-2 py-0.5 rounded-md bg-bg-surface/90 text-accent-red border border-border-color/60 backdrop-blur-xs select-none">
                #{displayIndex}
              </span>
            </div>
          </div>

          {/* Inputs column: compact inputs taking focused space */}
          <div className="flex-1 max-w-md sm:max-w-lg 2xl:max-wide-2k:max-w-xl wide-2k:max-w-3xl w-full flex flex-col gap-2.5">
            <label className="block">
              <span className="mb-1 block text-[11px] font-black uppercase tracking-wider text-text-secondary font-mono">
                {c.entityNameLabel || 'Candidate Name'}
              </span>
              <input
                value={entity.name}
                maxLength={SMASH_ROSTER_LIMITS.maxEntityName}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder={c.entityNamePlaceholder || 'e.g. Leon S. Kennedy'}
                className="w-full min-h-[38px] rounded-lg border border-border-color bg-bg-primary px-3 text-xs sm:text-sm font-semibold text-text-primary focus:border-accent-red focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-black uppercase tracking-wider text-text-secondary font-mono">
                {c.entityMediaLabel || 'Portrait Image URL'}
              </span>
              <input
                value={entity.media_url}
                onChange={(e) => onChange({ media_url: e.target.value })}
                placeholder="https://images.example.com/character.png"
                inputMode="url"
                aria-invalid={mediaInvalid}
                className={cn(
                  'w-full min-h-[38px] rounded-lg border border-border-color bg-bg-primary px-3 text-xs sm:text-sm text-text-primary focus:border-accent-red focus:outline-none',
                  mediaInvalid && 'border-accent-red'
                )}
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Dynamic Role Input + Quick Chips */}
              <div className="space-y-1">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-black uppercase tracking-wider text-text-secondary font-mono">
                    {c.entityRoleLabel || 'Role'}
                  </span>
                  <input
                    value={entity.role}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange({ role: val });
                      if (val.trim()) onRegisterTaxonomy?.('role', val);
                    }}
                    placeholder={c.rolePlaceholder || 'e.g. Survivor, Hero, Killer'}
                    list={`role-picks-${entity.key}`}
                    className="w-full min-h-[38px] rounded-lg border border-border-color bg-bg-primary px-3 text-xs sm:text-sm text-text-primary focus:border-accent-red focus:outline-none"
                  />
                  <datalist id={`role-picks-${entity.key}`}>
                    {availableRoles.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </label>
                {/* Quick-Pick Role Chips */}
                {availableRoles.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="text-[9px] text-text-muted font-mono mr-0.5">{c.quick || 'Quick:'}</span>
                    {availableRoles.slice(0, 4).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => onChange({ role: r })}
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors cursor-pointer',
                          entity.role.toLowerCase() === r.toLowerCase()
                            ? 'bg-accent-red text-text-inverted font-bold'
                            : 'bg-bg-elevated hover:bg-bg-primary text-text-secondary hover:text-text-primary border border-border-color'
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Gender Input + Quick Chips */}
              <div className="space-y-1">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-black uppercase tracking-wider text-text-secondary font-mono">
                    {c.entityGenderLabel || 'Gender'}
                  </span>
                  <input
                    value={entity.gender}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange({ gender: val });
                      if (val.trim()) onRegisterTaxonomy?.('gender', val);
                    }}
                    placeholder={c.genderPlaceholder || 'e.g. female, male, other'}
                    list={`gender-picks-${entity.key}`}
                    className="w-full min-h-[38px] rounded-lg border border-border-color bg-bg-primary px-3 text-xs sm:text-sm text-text-primary focus:border-accent-red focus:outline-none"
                  />
                  <datalist id={`gender-picks-${entity.key}`}>
                    {availableGenders.map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </label>
                {/* Quick-Pick Gender Chips */}
                {availableGenders.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="text-[9px] text-text-muted font-mono mr-0.5">{c.quick || 'Quick:'}</span>
                    {availableGenders.slice(0, 4).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => onChange({ gender: g })}
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors cursor-pointer',
                          entity.gender.toLowerCase() === g.toLowerCase()
                            ? 'bg-accent-amber text-text-inverted font-bold'
                            : 'bg-bg-elevated hover:bg-bg-primary text-text-secondary hover:text-text-primary border border-border-color'
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Simple Mode: Show 5 core elements + visible optional turn_on & dealbreaker */}
        {isSimpleMode && (
          <div className="grid gap-3 sm:grid-cols-2 pt-3 border-t border-border-color/60 max-w-3xl 2xl:max-wide-2k:max-w-4xl wide-2k:max-w-6xl mx-auto w-full">
            <TextField
              label={c.entityWatermarkLeftLabel || 'Character left text (watermark)'}
              value={entity.watermark_left}
              max={SMASH_ROSTER_LIMITS.maxWatermark}
              onChange={(v) => onChange({ watermark_left: v })}
              placeholder={c.watermarkLeftPlaceholder || 'e.g. Raccoon City Police'}
            />
            <TextField
              label={c.entityWatermarkRightLabel || 'Character right text (watermark)'}
              value={entity.watermark_right}
              max={SMASH_ROSTER_LIMITS.maxWatermark}
              onChange={(v) => onChange({ watermark_right: v })}
              placeholder={c.watermarkRightPlaceholder || 'e.g. R.P.D. Special Ops'}
            />
            <TextField
              label={customLabels.archetype || c.entityArchetypeLabel || 'Dating Archetype'}
              value={entity.archetype}
              max={SMASH_ROSTER_LIMITS.maxArchetype}
              onChange={(v) => onChange({ archetype: v })}
              placeholder={c.archetypePlaceholder || 'e.g. Stoic Protector'}
            />
            <TextField
              label={customLabels.quote || c.entityQuoteLabel || 'Signature Quote'}
              value={entity.quote}
              max={SMASH_ROSTER_LIMITS.maxQuote}
              onChange={(v) => onChange({ quote: v })}
              placeholder={c.quotePlaceholder || 'e.g. "Where is everyone going? Bingo?"'}
            />
            <TextField
              label={`${customLabels.turn_on || c.entityTurnOnLabel || 'Turn On'} (Optional)`}
              value={entity.turn_on}
              max={SMASH_ROSTER_LIMITS.maxTurnOn}
              onChange={(v) => onChange({ turn_on: v })}
              placeholder={c.turnOnPlaceholder || 'What makes them irresistible?'}
            />
            <TextField
              label={`${customLabels.dealbreaker || c.entityDealbreakerLabel || 'Dealbreaker'} (Optional)`}
              value={entity.dealbreaker}
              max={SMASH_ROSTER_LIMITS.maxDealbreaker}
              onChange={(v) => onChange({ dealbreaker: v })}
              placeholder={c.dealbreakerPlaceholder || 'What ruins the spark immediately?'}
            />
          </div>
        )}

        {/* Full Mode: Collapsible Profile Details Toggle */}
        {!isSimpleMode && (
          <div className="pt-2 border-t border-border-color/60 flex justify-center">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              aria-expanded={profileOpen}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-elevated hover:bg-bg-primary border border-border-color text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <ChevronDown className={cn('h-3.5 w-3.5 text-accent-red transition-transform', profileOpen && 'rotate-180')} aria-hidden="true" />
              <span>{c.entityProfileToggle || 'Profile & Lore Details'}</span>
            </button>
          </div>
        )}

        {!isSimpleMode && profileOpen && (
          <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border-color/40 max-w-3xl 2xl:max-wide-2k:max-w-4xl wide-2k:max-w-6xl mx-auto w-full">
            <TextField label={c.entityRealNameLabel || 'Real Name'} value={entity.real_name} max={SMASH_ROSTER_LIMITS.maxRealName} onChange={(v) => onChange({ real_name: v })} />
            <TextField label={customLabels.archetype || c.entityArchetypeLabel || 'Archetype'} value={entity.archetype} max={SMASH_ROSTER_LIMITS.maxArchetype} onChange={(v) => onChange({ archetype: v })} />
            <TextField label={c.entityTaglineLabel || 'Tagline'} value={entity.tagline} max={SMASH_ROSTER_LIMITS.maxTagline} onChange={(v) => onChange({ tagline: v })} />
            <TextField label={customLabels.quote || c.entityQuoteLabel || 'Signature Quote'} value={entity.quote} max={SMASH_ROSTER_LIMITS.maxQuote} onChange={(v) => onChange({ quote: v })} />
            <TextAreaField label={c.entityBioLabel || 'Bio'} value={entity.bio} max={SMASH_ROSTER_LIMITS.maxBio} onChange={(v) => onChange({ bio: v })} full />
            <TextAreaField label={customLabels.meme || c.entityMemeLabel || 'Trial Rumor / Meme'} value={entity.meme} max={SMASH_ROSTER_LIMITS.maxMeme} onChange={(v) => onChange({ meme: v })} full />
            <TextField label={customLabels.turn_on || c.entityTurnOnLabel || 'Turn On'} value={entity.turn_on} max={SMASH_ROSTER_LIMITS.maxTurnOn} onChange={(v) => onChange({ turn_on: v })} />
            <TextField label={customLabels.dealbreaker || c.entityDealbreakerLabel || 'Dealbreaker'} value={entity.dealbreaker} max={SMASH_ROSTER_LIMITS.maxDealbreaker} onChange={(v) => onChange({ dealbreaker: v })} />
            <TextField label={customLabels.dating_vibe || c.entityDatingVibeLabel || 'Dating Vibe'} value={entity.dating_vibe} max={SMASH_ROSTER_LIMITS.maxDatingVibe} onChange={(v) => onChange({ dating_vibe: v })} full />
            <TextAreaField
              label={c.entityRedFlagsLabel || 'Red flags (one per line)'}
              value={entity.red_flags}
              max={SMASH_ROSTER_LIMITS.maxFlagText * SMASH_ROSTER_LIMITS.maxFlags}
              onChange={(v) => onChange({ red_flags: v })}
            />
            <TextAreaField
              label={c.entityGreenFlagsLabel || 'Green flags (one per line)'}
              value={entity.green_flags}
              max={SMASH_ROSTER_LIMITS.maxFlagText * SMASH_ROSTER_LIMITS.maxFlags}
              onChange={(v) => onChange({ green_flags: v })}
            />
            <TextField label={c.entityWatermarkLeftLabel || 'Watermark (left)'} value={entity.watermark_left} max={SMASH_ROSTER_LIMITS.maxWatermark} onChange={(v) => onChange({ watermark_left: v })} />
            <TextField label={c.entityWatermarkRightLabel || 'Watermark (right)'} value={entity.watermark_right} max={SMASH_ROSTER_LIMITS.maxWatermark} onChange={(v) => onChange({ watermark_right: v })} />

            {showTranslations && (
              <div className="sm:col-span-2 flex flex-col gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-3">
                <span className={LABEL}>{c.translationsHeading || 'Translations'}</span>
                <div className="flex flex-wrap gap-1.5" role="tablist">
                  {TRANSLATABLE_LOCALES.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      role="tab"
                      aria-selected={activeLocale === loc}
                      onClick={() => setActiveLocale(loc)}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer',
                        activeLocale === loc
                          ? 'bg-accent-red text-text-inverted'
                          : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TRANSLATABLE_FIELDS.filter((f) => f !== 'red_flags' && f !== 'green_flags').map((field) => (
                    <TextField
                      key={field}
                      label={entityTranslationFieldLabel(c, field)}
                      value={translations[activeLocale]?.[field] || ''}
                      max={2000}
                      onChange={(v) => onTranslationChange(activeLocale, field, v)}
                    />
                  ))}
                  <TextAreaField
                    label={`${c.entityRedFlagsLabel || 'Red flags'} (${activeLocale})`}
                    value={translations[activeLocale]?.red_flags || ''}
                    max={4000}
                    onChange={(v) => onTranslationChange(activeLocale, 'red_flags', v)}
                  />
                  <TextAreaField
                    label={`${c.entityGreenFlagsLabel || 'Green flags'} (${activeLocale})`}
                    value={translations[activeLocale]?.green_flags || ''}
                    max={4000}
                    onChange={(v) => onTranslationChange(activeLocale, 'green_flags', v)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export interface CandidateTilesProps {
  entities: DraftEntity[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onRename: (key: string, name: string) => void;
  onRemove: (key: string) => void;
  onAdd: () => void;
  canAdd: boolean;
  dict?: Dictionary | any;
}

export function CandidateTiles({
  entities,
  selectedKey,
  onSelect,
  onRename,
  onRemove,
  onAdd,
  canAdd,
  dict,
}: CandidateTilesProps) {
  const c = dict?.smashOrPass?.creator || {};

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="w-20 hidden sm:block pointer-events-none" aria-hidden="true" />
        <h4 className="flex-1 text-center text-xs sm:text-sm font-black uppercase tracking-wider text-text-secondary font-mono">
          {c.allCandidatesHeading || 'Roster Candidates'} ({entities.length}/{SMASH_ROSTER_LIMITS.maxEntities})
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
                <span className="absolute top-1 left-1 z-10 font-mono text-[9px] font-black px-1.5 py-0.5 rounded bg-bg-surface/90 text-text-secondary border border-border-color/60 backdrop-blur-xs">
                  #{displayIndex}
                </span>

                {/* Edge-to-edge tile image or dark initials placeholder */}
                {safeMedia ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={safeMedia}
                    alt={entity.name}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover/item:scale-105"
                  />
                ) : (
                  <span className="text-base sm:text-lg font-black font-mono text-text-muted select-none">
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
                  aria-label={(c.removeCandidateAria || 'Remove {name}').replace('{name}', entity.name || displayIndex)}
                  className="absolute top-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded-md bg-bg-surface/90 text-text-muted opacity-80 sm:opacity-0 group-hover/item:opacity-100 hover:!opacity-100 hover:bg-accent-red hover:text-text-inverted transition-all shadow-xs cursor-pointer border border-border-color/40"
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
                placeholder={c.unnamedCandidate || 'Unnamed'}
                aria-label={(c.renameCandidateAria || 'Rename {name}').replace('{name}', entity.name || displayIndex)}
                className="mt-1 h-6 w-full rounded-sm border border-transparent bg-transparent px-1 text-center text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary hover:bg-bg-elevated/40 focus:border-accent-red focus:bg-bg-surface focus:text-text-primary focus:outline-hidden truncate"
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
                <span className="text-[10px] font-mono font-bold uppercase">{c.add || 'Add'}</span>
              </div>
            </button>
            <span className="mt-1 h-6 text-[10px] text-text-muted font-mono flex items-center select-none">
              {c.addCandidateTile || '+ Add'}
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}

/** Backward compatibility alias */
export const EntityEditor = CandidateFormInputs;

function entityTranslationFieldLabel(c: any, field: string): string {
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

function TextField({
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
      <span className="mb-1 block text-[11px] font-black uppercase tracking-wider text-text-secondary font-mono">{label}</span>
      <input
        value={value}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[38px] rounded-lg border border-border-color bg-bg-primary px-3 text-xs sm:text-sm text-text-primary focus:border-accent-red focus:outline-none"
      />
    </label>
  );
}

function TextAreaField({
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
      <span className="mb-1 block text-[11px] font-black uppercase tracking-wider text-text-secondary font-mono">{label}</span>
      <textarea
        value={value}
        maxLength={max}
        rows={3}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border-color bg-bg-primary px-3 py-2 text-xs sm:text-sm text-text-primary focus:border-accent-red focus:outline-none"
      />
    </label>
  );
}
