'use client';
// frontend/src/components/smash-or-pass/creator/EntityEditor.tsx
/**
 * One roster candidate's editable card. Redesigned with a collapsible header,
 * live avatar thumbnail, dynamic role & gender taxonomy pills, and clean
 * responsive layout for both Simple and Full roster modes.
 */
import React, { useState } from 'react';
import { ChevronDown, Trash2, User, Sparkles, Image as ImageIcon } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { sanitizeImageUrl } from '@/utils/smashOrPass/codec';
import { GENDER_QUICK_PICKS, ROLE_QUICK_PICKS, SMASH_ROSTER_LIMITS, TRANSLATABLE_FIELDS, TRANSLATABLE_LOCALES } from '@/utils/smashOrPass/constants';
import type { RosterCustomLabels } from '@/types/smashOrPass';
import { FIELD, LABEL, TEXTAREA_FIELD } from './styles';

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

interface EntityEditorProps {
  entity: DraftEntity;
  index: number;
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

export function EntityEditor({
  entity,
  index,
  onChange,
  onRemove,
  showTranslations,
  translations,
  onTranslationChange,
  locale,
  dict,
  isSimpleMode = false,
  customLabels = {},
  availableRoles = [...ROLE_QUICK_PICKS],
  availableGenders = [...GENDER_QUICK_PICKS],
  onRegisterTaxonomy,
}: EntityEditorProps) {
  const c = dict?.smashOrPass?.creator || {};
  const [isCardExpanded, setIsCardExpanded] = useState<boolean>(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeLocale, setActiveLocale] = useState<string>(TRANSLATABLE_LOCALES[0]);

  const trimmedMedia = entity.media_url.trim();
  const safeMedia = trimmedMedia ? sanitizeImageUrl(trimmedMedia) : null;
  const mediaInvalid = Boolean(trimmedMedia) && !safeMedia;

  const displayIndex = String(index + 1).padStart(2, '0');

  return (
    <div
      className={cn(
        'group rounded-2xl border transition-all duration-200 overflow-hidden',
        isCardExpanded
          ? 'border-border-color bg-bg-surface/90 shadow-md ring-1 ring-border-color/40'
          : 'border-border-color/70 bg-bg-surface/50 hover:bg-bg-surface/80 hover:border-border-color shadow-xs'
      )}
    >
      {/* Header bar / Collapsible Drawer Handle */}
      <div
        onClick={() => setIsCardExpanded((v) => !v)}
        className="flex items-center justify-between p-3 sm:p-4 cursor-pointer select-none border-b border-border-color/40 hover:bg-bg-elevated/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar Thumbnail */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-color bg-bg-primary overflow-hidden shadow-xs">
            {safeMedia ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={safeMedia}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <span className="font-mono text-xs font-black text-text-muted">{displayIndex}</span>
            )}
          </div>

          {/* Candidate Title & Taxonomy Badges */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-accent-red">#{displayIndex}</span>
              <h3 className="font-bold text-sm sm:text-base text-text-primary truncate">
                {entity.name.trim() || c.unnamedCandidate || 'Unnamed Candidate'}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              {entity.role ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono bg-accent-red/10 text-accent-red border border-accent-red/25">
                  {entity.role}
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-text-muted font-mono italic">
                  No role
                </span>
              )}
              {entity.gender ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono bg-purple-500/10 text-purple-400 border border-purple-500/25">
                  {entity.gender}
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-text-muted font-mono italic">
                  No gender
                </span>
              )}
              {entity.archetype && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono text-text-secondary bg-bg-primary border border-border-color">
                  {entity.archetype}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side controls: Delete & Expand chevron */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label={c.removeEntity || 'Remove'}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors cursor-pointer"
            title="Remove candidate"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-text-muted transition-transform"
          >
            <ChevronDown
              className={cn('h-4 w-4 transition-transform duration-200', isCardExpanded && 'rotate-180')}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* Expandable Form Body */}
      {isCardExpanded && (
        <div className="p-4 sm:p-5 space-y-4 bg-bg-surface/40">
          {/* Top Row: Avatar preview & Primary identifiers */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Visual Portrait Box */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="relative h-28 w-24 sm:h-32 sm:w-28 rounded-2xl border-2 border-dashed border-border-color bg-bg-primary overflow-hidden flex items-center justify-center shadow-inner">
                {safeMedia ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={safeMedia}
                    alt={entity.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 p-2 text-center text-text-muted">
                    <ImageIcon className="h-6 w-6 opacity-40" />
                    <span className="text-[10px] font-mono uppercase tracking-wider">Preview</span>
                  </div>
                )}
              </div>
            </div>

            {/* Inputs grid for Name, Image URL, Role, Gender */}
            <div className="flex-1 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className={LABEL}>{c.entityNameLabel || 'Candidate Name'}</span>
                <input
                  value={entity.name}
                  maxLength={SMASH_ROSTER_LIMITS.maxEntityName}
                  onChange={(e) => onChange({ name: e.target.value })}
                  placeholder={c.entityNamePlaceholder || 'e.g. Leon S. Kennedy'}
                  className={cn(FIELD, 'font-semibold')}
                />
              </label>

              <label className="sm:col-span-2">
                <span className={LABEL}>{c.entityMediaLabel || 'Portrait Image URL'}</span>
                <input
                  value={entity.media_url}
                  onChange={(e) => onChange({ media_url: e.target.value })}
                  placeholder="https://images.example.com/character.png"
                  inputMode="url"
                  aria-invalid={mediaInvalid}
                  className={cn(FIELD, mediaInvalid && 'border-accent-red')}
                />
              </label>

              {/* Dynamic Role Input + Quick Chips */}
              <div className="space-y-1.5">
                <label className="block">
                  <span className={LABEL}>{c.entityRoleLabel || 'Role'}</span>
                  <input
                    value={entity.role}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange({ role: val });
                      if (val.trim()) onRegisterTaxonomy?.('role', val);
                    }}
                    placeholder="e.g. Survivor, Hero, Killer"
                    list={`role-picks-${entity.key}`}
                    className={FIELD}
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
                    <span className="text-[10px] text-text-muted font-mono mr-1">Quick:</span>
                    {availableRoles.slice(0, 5).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => onChange({ role: r })}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer',
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
              <div className="space-y-1.5">
                <label className="block">
                  <span className={LABEL}>{c.entityGenderLabel || 'Gender'}</span>
                  <input
                    value={entity.gender}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange({ gender: val });
                      if (val.trim()) onRegisterTaxonomy?.('gender', val);
                    }}
                    placeholder="e.g. female, male, other"
                    list={`gender-picks-${entity.key}`}
                    className={FIELD}
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
                    <span className="text-[10px] text-text-muted font-mono mr-1">Quick:</span>
                    {availableGenders.slice(0, 5).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => onChange({ gender: g })}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer',
                          entity.gender.toLowerCase() === g.toLowerCase()
                            ? 'bg-purple-600 text-text-inverted font-bold'
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

          {/* Simple Mode: Show 5 core elements + visible optional turn_on & dealbreaker */}
          {isSimpleMode && (
            <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border-color/60">
              <TextField
                label={c.entityWatermarkLeftLabel || 'Character left text (watermark)'}
                value={entity.watermark_left}
                max={SMASH_ROSTER_LIMITS.maxWatermark}
                onChange={(v) => onChange({ watermark_left: v })}
                placeholder="e.g. Raccoon City Police"
              />
              <TextField
                label={c.entityWatermarkRightLabel || 'Character right text (watermark)'}
                value={entity.watermark_right}
                max={SMASH_ROSTER_LIMITS.maxWatermark}
                onChange={(v) => onChange({ watermark_right: v })}
                placeholder="e.g. R.P.D. Special Ops"
              />
              <TextField
                label={customLabels.archetype || c.entityArchetypeLabel || 'Dating Archetype'}
                value={entity.archetype}
                max={SMASH_ROSTER_LIMITS.maxArchetype}
                onChange={(v) => onChange({ archetype: v })}
                placeholder="e.g. Stoic Protector"
              />
              <TextField
                label={customLabels.quote || c.entityQuoteLabel || 'Signature Quote'}
                value={entity.quote}
                max={SMASH_ROSTER_LIMITS.maxQuote}
                onChange={(v) => onChange({ quote: v })}
                placeholder='e.g. "Where is everyone going? Bingo?"'
              />
              <TextField
                label={`${customLabels.turn_on || c.entityTurnOnLabel || 'Turn On'} (Optional)`}
                value={entity.turn_on}
                max={SMASH_ROSTER_LIMITS.maxTurnOn}
                onChange={(v) => onChange({ turn_on: v })}
                placeholder="What makes them irresistible?"
              />
              <TextField
                label={`${customLabels.dealbreaker || c.entityDealbreakerLabel || 'Dealbreaker'} (Optional)`}
                value={entity.dealbreaker}
                max={SMASH_ROSTER_LIMITS.maxDealbreaker}
                onChange={(v) => onChange({ dealbreaker: v })}
                placeholder="What ruins the spark immediately?"
              />
            </div>
          )}

          {/* Full Mode: Collapsible Profile Details Toggle */}
          {!isSimpleMode && (
            <div className="pt-2 border-t border-border-color/60">
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
            <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border-color/40">
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
      )}
    </div>
  );
}

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
      <span className={LABEL}>{label}</span>
      <input
        value={value}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD}
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
      <span className={LABEL}>{label}</span>
      <textarea
        value={value}
        maxLength={max}
        rows={3}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={TEXTAREA_FIELD}
      />
    </label>
  );
}

