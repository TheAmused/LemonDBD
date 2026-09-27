'use client';
// frontend/src/components/smash-or-pass/creator/EntityEditor.tsx
/**
 * One roster candidate's editable card. Always-visible: name, media, role,
 * gender -- everything else lives behind a collapsible "Profile" section so a
 * 50-candidate roster doesn't become a 500-field wall.
 *
 * When `showTranslations` is on (admin, official roster), a nested locale-tab
 * panel appears inside the Profile section letting the admin override this
 * one candidate's translatable text per language -- kept next to the fields
 * it overrides rather than in one giant roster-wide panel.
 */
import React, { useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { sanitizeImageUrl } from '@/utils/smashOrPass/codec';
import { GENDER_QUICK_PICKS, ROLE_QUICK_PICKS, SMASH_ROSTER_LIMITS, TRANSLATABLE_FIELDS, TRANSLATABLE_LOCALES } from '@/utils/smashOrPass/constants';
import { BTN_DANGER_GHOST, FIELD, LABEL, TEXTAREA_FIELD } from './styles';

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
}: EntityEditorProps) {
  const c = dict?.smashOrPass?.creator || {};
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeLocale, setActiveLocale] = useState<string>(TRANSLATABLE_LOCALES[0]);

  const trimmedMedia = entity.media_url.trim();
  const safeMedia = trimmedMedia ? sanitizeImageUrl(trimmedMedia) : null;
  const mediaInvalid = Boolean(trimmedMedia) && !safeMedia;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-color bg-bg-elevated/60 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-color bg-bg-primary overflow-hidden">
          {safeMedia ? (
            // eslint-disable-next-line @next/next/no-img-element -- live preview of a user-supplied URL
            <img src={safeMedia} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-black text-text-muted">{index + 1}</span>
          )}
        </div>
        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          <input
            value={entity.name}
            maxLength={SMASH_ROSTER_LIMITS.maxEntityName}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={c.entityNamePlaceholder || 'e.g. Leon S. Kennedy'}
            className={cn(FIELD, 'sm:col-span-2')}
          />
          <input
            value={entity.media_url}
            onChange={(e) => onChange({ media_url: e.target.value })}
            placeholder={c.entityMediaLabel || 'Portrait image URL'}
            inputMode="url"
            aria-invalid={mediaInvalid}
            className={cn(FIELD, mediaInvalid && 'border-accent-red')}
          />
          <div className="flex gap-2">
            <input
              value={entity.role}
              onChange={(e) => onChange({ role: e.target.value })}
              placeholder={c.entityRoleLabel || 'Role'}
              list={`role-picks-${entity.key}`}
              className={FIELD}
            />
            <datalist id={`role-picks-${entity.key}`}>
              {ROLE_QUICK_PICKS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>
          <input
            value={entity.gender}
            onChange={(e) => onChange({ gender: e.target.value })}
            placeholder={c.entityGenderLabel || 'Gender'}
            list={`gender-picks-${entity.key}`}
            className={FIELD}
          />
          <datalist id={`gender-picks-${entity.key}`}>
            {GENDER_QUICK_PICKS.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={c.removeEntity || 'Remove'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-colors cursor-pointer"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setProfileOpen((v) => !v)}
        aria-expanded={profileOpen}
        className="inline-flex w-fit items-center gap-1 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-accent-red transition-colors cursor-pointer"
      >
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', profileOpen && 'rotate-180')} aria-hidden="true" />
        {c.entityProfileToggle || 'Profile details'}
      </button>

      {profileOpen && (
        <div className="grid gap-2.5 sm:grid-cols-2 pt-1 border-t border-border-color pt-3">
          <TextField label={c.entityRealNameLabel || 'Real name'} value={entity.real_name} max={SMASH_ROSTER_LIMITS.maxRealName} onChange={(v) => onChange({ real_name: v })} />
          <TextField label={c.entityArchetypeLabel || 'Archetype'} value={entity.archetype} max={SMASH_ROSTER_LIMITS.maxArchetype} onChange={(v) => onChange({ archetype: v })} />
          <TextField label={c.entityTaglineLabel || 'Tagline'} value={entity.tagline} max={SMASH_ROSTER_LIMITS.maxTagline} onChange={(v) => onChange({ tagline: v })} />
          <TextField label={c.entityQuoteLabel || 'Signature quote'} value={entity.quote} max={SMASH_ROSTER_LIMITS.maxQuote} onChange={(v) => onChange({ quote: v })} />
          <TextAreaField label={c.entityBioLabel || 'Bio'} value={entity.bio} max={SMASH_ROSTER_LIMITS.maxBio} onChange={(v) => onChange({ bio: v })} full />
          <TextAreaField label={c.entityMemeLabel || 'Trial rumor / meme'} value={entity.meme} max={SMASH_ROSTER_LIMITS.maxMeme} onChange={(v) => onChange({ meme: v })} full />
          <TextField label={c.entityTurnOnLabel || 'Turn on'} value={entity.turn_on} max={SMASH_ROSTER_LIMITS.maxTurnOn} onChange={(v) => onChange({ turn_on: v })} />
          <TextField label={c.entityDealbreakerLabel || 'Dealbreaker'} value={entity.dealbreaker} max={SMASH_ROSTER_LIMITS.maxDealbreaker} onChange={(v) => onChange({ dealbreaker: v })} />
          <TextField label={c.entityDatingVibeLabel || 'Dating vibe'} value={entity.dating_vibe} max={SMASH_ROSTER_LIMITS.maxDatingVibe} onChange={(v) => onChange({ dating_vibe: v })} full />
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

function TextField({ label, value, max, onChange, full }: { label: string; value: string; max: number; onChange: (v: string) => void; full?: boolean }) {
  return (
    <label className={full ? 'sm:col-span-2' : undefined}>
      <span className={LABEL}>{label}</span>
      <input value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} className={FIELD} />
    </label>
  );
}

function TextAreaField({ label, value, max, onChange, full }: { label: string; value: string; max: number; onChange: (v: string) => void; full?: boolean }) {
  return (
    <label className={full ? 'sm:col-span-2' : undefined}>
      <span className={LABEL}>{label}</span>
      <textarea value={value} maxLength={max} rows={3} onChange={(e) => onChange(e.target.value)} className={TEXTAREA_FIELD} />
    </label>
  );
}
