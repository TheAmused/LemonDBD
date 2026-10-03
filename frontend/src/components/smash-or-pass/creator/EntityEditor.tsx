'use client';
// frontend/src/components/smash-or-pass/creator/EntityEditor.tsx
/**
 * Roster candidate editing components:
 * - CandidateFormInputs: Form inputs to edit the active candidate's profile, portrait, and taxonomy.
 * - CandidateTiles: Squished grid of candidates (avatar + name caption) matching the tier list items pattern.
 */
import { Tabs } from '@/components/common/Tabs';
import { useState } from 'react';
import { ChevronDown, Trash2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { sanitizeImageUrl } from '@/utils/smashOrPass/codec';
import { SMASH_ROSTER_LIMITS, TRANSLATABLE_FIELDS, TRANSLATABLE_LOCALES } from '@/utils/smashOrPass/constants';
import type { RosterCustomLabels } from '@/types/smashOrPass';
import { LABEL } from './styles';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { type DraftEntity, type EntityTranslationDraft, TextField, TextAreaField, entityTranslationFieldLabel } from "./EntityEditorParts";
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";
import { tip } from '@/components/common/Tooltip';
import { GENDER_QUICK_PICKS, ROLE_QUICK_PICKS } from '@/utils/smashOrPass/constants';

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
      isSimpleMode = false,
      customLabels = {},
      availableRoles = [...ROLE_QUICK_PICKS],
      availableGenders = [...GENDER_QUICK_PICKS],
      onRegisterTaxonomy,
    }: CandidateFormInputsProps) {
  const dict = useDictionary();
  const c = dict.smashOrPass.creator || {};
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
          <span className="type-strong px-2 py-0.5 rounded bg-accent-red/10 border border-accent-red/30 text-accent-red">
            #{displayIndex}
          </span>
          <h3 className="font-bold text-sm sm:text-base text-text-primary truncate">
            {c.editingCandidate}:{' '}
            <span className="text-accent-red">{entity.name.trim() || c.unnamedCandidate}</span>
          </h3>
        </div>
        <div className="w-24 flex justify-end">
          <Button
            variant="ghost" size="xs"
            onClick={onRemove}
            aria-label={formatMessage((c.removeCandidateAria), { name: entity.name || displayIndex })}
            className=""
            {...tip(c.removeCandidate, undefined, 'action')}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{c.removeCandidate}</span>
          </Button>
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
                <img
                  src={safeMedia}
                  alt={entity.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 p-3 text-center text-text-muted select-none">
                  <ImageIcon className="h-10 w-10 opacity-30 text-accent-red" />
                  <span className="type-label-sm">{c.preview}</span>
                  <span className="type-micro text-text-muted/60">#{displayIndex}</span>
                </div>
              )}
              <span className="absolute top-2 left-2 type-strong-2xs px-2 py-0.5 rounded-md bg-bg-surface/90 text-accent-red border border-border-color/60 backdrop-blur-xs select-none">
                #{displayIndex}
              </span>
            </div>
          </div>

          {/* Inputs column: compact inputs taking focused space */}
          <div className="flex-1 max-w-md sm:max-w-lg 2xl:max-wide-2k:max-w-xl wide-2k:max-w-3xl w-full flex flex-col gap-2.5">
            <label className="block">
              <span className="mb-1 block type-label-xs text-text-secondary">
                {c.entityNameLabel}
              </span>
              <Input
                fieldSize="md"
                value={entity.name}
                maxLength={SMASH_ROSTER_LIMITS.maxEntityName}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder={c.entityNamePlaceholder}
                className="font-semibold"
              />
            </label>

            <label className="block">
              <span className="mb-1 block type-label-xs text-text-secondary">
                {c.entityMediaLabel}
              </span>
              <Input
                fieldSize="md" invalid={mediaInvalid}
                value={entity.media_url}
                onChange={(e) => onChange({ media_url: e.target.value })}
                placeholder="https://images.example.com/character.png"
                inputMode="url"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Dynamic Role Input + Quick Chips */}
              <div className="space-y-1">
                <label className="block">
                  <span className="mb-1 block type-label-xs text-text-secondary">
                    {c.entityRoleLabel}
                  </span>
                  <Input
                    fieldSize="md"
                    value={entity.role}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange({ role: val });
                      if (val.trim()) onRegisterTaxonomy?.('role', val);
                    }}
                    placeholder={c.rolePlaceholder}
                    list={`role-picks-${entity.key}`}
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
                    <span className="text-micro text-text-muted mr-0.5">{c.quick}</span>
                    {availableRoles.slice(0, 4).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => onChange({ role: r })}
                        className={cn(
                          'px-1.5 py-0.5 rounded text-micro transition-colors cursor-pointer',
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
                  <span className="mb-1 block type-label-xs text-text-secondary">
                    {c.entityGenderLabel}
                  </span>
                  <Input
                    fieldSize="md"
                    value={entity.gender}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange({ gender: val });
                      if (val.trim()) onRegisterTaxonomy?.('gender', val);
                    }}
                    placeholder={c.genderPlaceholder}
                    list={`gender-picks-${entity.key}`}
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
                    <span className="text-micro text-text-muted mr-0.5">{c.quick}</span>
                    {availableGenders.slice(0, 4).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => onChange({ gender: g })}
                        className={cn(
                          'px-1.5 py-0.5 rounded text-micro transition-colors cursor-pointer',
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
              label={c.entityWatermarkLeftLabel}
              value={entity.watermark_left}
              max={SMASH_ROSTER_LIMITS.maxWatermark}
              onChange={(v) => onChange({ watermark_left: v })}
              placeholder={c.watermarkLeftPlaceholder}
            />
            <TextField
              label={c.entityWatermarkRightLabel}
              value={entity.watermark_right}
              max={SMASH_ROSTER_LIMITS.maxWatermark}
              onChange={(v) => onChange({ watermark_right: v })}
              placeholder={c.watermarkRightPlaceholder}
            />
            <TextField
              label={customLabels.archetype || c.entityArchetypeLabel}
              value={entity.archetype}
              max={SMASH_ROSTER_LIMITS.maxArchetype}
              onChange={(v) => onChange({ archetype: v })}
              placeholder={c.archetypePlaceholder}
            />
            <TextField
              label={customLabels.quote || c.entityQuoteLabel}
              value={entity.quote}
              max={SMASH_ROSTER_LIMITS.maxQuote}
              onChange={(v) => onChange({ quote: v })}
              placeholder={c.quotePlaceholder}
            />
            <TextField
              label={`${customLabels.turn_on || c.entityTurnOnLabel} (Optional)`}
              value={entity.turn_on}
              max={SMASH_ROSTER_LIMITS.maxTurnOn}
              onChange={(v) => onChange({ turn_on: v })}
              placeholder={c.turnOnPlaceholder}
            />
            <TextField
              label={`${customLabels.dealbreaker || c.entityDealbreakerLabel} (Optional)`}
              value={entity.dealbreaker}
              max={SMASH_ROSTER_LIMITS.maxDealbreaker}
              onChange={(v) => onChange({ dealbreaker: v })}
              placeholder={c.dealbreakerPlaceholder}
            />
          </div>
        )}

        {/* Full Mode: Collapsible Profile Details Toggle */}
        {!isSimpleMode && (
          <div className="pt-2 border-t border-border-color/60 flex justify-center">
            <Button
              variant="secondary" size="sm"
              onClick={() => setProfileOpen((v) => !v)}
              aria-expanded={profileOpen}
              className="uppercase tracking-wider"
            >
              <ChevronDown className={cn('h-3.5 w-3.5 text-accent-red transition-transform', profileOpen && 'rotate-180')} aria-hidden="true" />
              <span>{c.entityProfileToggle}</span>
            </Button>
          </div>
        )}

        {!isSimpleMode && profileOpen && (
          <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border-color/40 max-w-3xl 2xl:max-wide-2k:max-w-4xl wide-2k:max-w-6xl mx-auto w-full">
            <TextField label={c.entityRealNameLabel} value={entity.real_name} max={SMASH_ROSTER_LIMITS.maxRealName} onChange={(v) => onChange({ real_name: v })} />
            <TextField label={customLabels.archetype || c.entityArchetypeLabel} value={entity.archetype} max={SMASH_ROSTER_LIMITS.maxArchetype} onChange={(v) => onChange({ archetype: v })} />
            <TextField label={c.entityTaglineLabel} value={entity.tagline} max={SMASH_ROSTER_LIMITS.maxTagline} onChange={(v) => onChange({ tagline: v })} />
            <TextField label={customLabels.quote || c.entityQuoteLabel} value={entity.quote} max={SMASH_ROSTER_LIMITS.maxQuote} onChange={(v) => onChange({ quote: v })} />
            <TextAreaField label={c.entityBioLabel} value={entity.bio} max={SMASH_ROSTER_LIMITS.maxBio} onChange={(v) => onChange({ bio: v })} full />
            <TextAreaField label={customLabels.meme || c.entityMemeLabel} value={entity.meme} max={SMASH_ROSTER_LIMITS.maxMeme} onChange={(v) => onChange({ meme: v })} full />
            <TextField label={customLabels.turn_on || c.entityTurnOnLabel} value={entity.turn_on} max={SMASH_ROSTER_LIMITS.maxTurnOn} onChange={(v) => onChange({ turn_on: v })} />
            <TextField label={customLabels.dealbreaker || c.entityDealbreakerLabel} value={entity.dealbreaker} max={SMASH_ROSTER_LIMITS.maxDealbreaker} onChange={(v) => onChange({ dealbreaker: v })} />
            <TextField label={customLabels.dating_vibe || c.entityDatingVibeLabel} value={entity.dating_vibe} max={SMASH_ROSTER_LIMITS.maxDatingVibe} onChange={(v) => onChange({ dating_vibe: v })} full />
            <TextAreaField
              label={c.entityRedFlagsLabel}
              value={entity.red_flags}
              max={SMASH_ROSTER_LIMITS.maxFlagText * SMASH_ROSTER_LIMITS.maxFlags}
              onChange={(v) => onChange({ red_flags: v })}
            />
            <TextAreaField
              label={c.entityGreenFlagsLabel}
              value={entity.green_flags}
              max={SMASH_ROSTER_LIMITS.maxFlagText * SMASH_ROSTER_LIMITS.maxFlags}
              onChange={(v) => onChange({ green_flags: v })}
            />
            <TextField label={c.entityWatermarkLeftLabel} value={entity.watermark_left} max={SMASH_ROSTER_LIMITS.maxWatermark} onChange={(v) => onChange({ watermark_left: v })} />
            <TextField label={c.entityWatermarkRightLabel} value={entity.watermark_right} max={SMASH_ROSTER_LIMITS.maxWatermark} onChange={(v) => onChange({ watermark_right: v })} />

            {showTranslations && (
              <div className="sm:col-span-2 flex flex-col gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-3">
                <span className={LABEL}>{c.translationsHeading}</span>
                <Tabs
                  ariaLabel={c.translationsHeading}
                  value={activeLocale}
                  onChange={setActiveLocale}
                  panels={false}
                  variant="boxed"
                  size="sm"
                  wrap
                  tabs={TRANSLATABLE_LOCALES.map((loc) => ({ value: loc, label: loc }))}
                />
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
                    label={`${c.entityRedFlagsLabel} (${activeLocale})`}
                    value={translations[activeLocale]?.red_flags || ''}
                    max={4000}
                    onChange={(v) => onTranslationChange(activeLocale, 'red_flags', v)}
                  />
                  <TextAreaField
                    label={`${c.entityGreenFlagsLabel} (${activeLocale})`}
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

/** Backward compatibility alias */
const EntityEditor = CandidateFormInputs;

export { emptyDraftEntity, CandidateTiles } from "./EntityEditorParts";
export type { DraftEntity, EntityTranslationDraft, CandidateTilesProps } from "./EntityEditorParts";
