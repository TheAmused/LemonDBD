'use client';
// frontend/src/components/smash-or-pass/creator/EntityEditor.tsx
/**
 * Roster candidate editing components:
 * - CandidateFormInputs: Form inputs to edit the active candidate's profile, portrait, role and gender.
 * - CandidateTiles: Squished grid of candidates (avatar + name caption) matching the tier list items pattern.
 */
import { useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { sanitizeImageUrl } from '@/utils/smashOrPass/codec';
import { IMAGE_SIZE_PRESETS, MAX_DATA_IMAGE_CHARS, resizeImageToDataUrl } from '@/utils/imageResize';
import { useOnValueChange } from '@/hooks/useOnValueChange';
import { SMASH_ROSTER_LIMITS, type TRANSLATABLE_FIELDS } from '@/utils/smashOrPass/constants';
import type { RosterCustomLabels } from '@/types/smashOrPass';
import { RequiredMark } from './RequiredMark';
import { canonicalGender, genderLabel, termLabel } from '@/utils/smashOrPass/terms';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import {
  type DraftEntity,
  type EntityTranslationDraft,
  TextField,
  TextAreaField,
  AutoExpandingTextField,
  CandidatePortraitFocalPicker,
} from "./EntityEditorParts";
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";
import { tip } from '@/components/common/Tooltip';
import { Badge } from '@/components/common/Badge';

export interface CandidateFormInputsProps {
  entity: DraftEntity;
  index: number;
  totalCount?: number;
  onChange: (patch: Partial<DraftEntity>) => void;
  onRemove: () => void;
  showTranslations?: boolean;
  translations: Record<string, EntityTranslationDraft>;
  onTranslationChange: (locale: string, field: string, value: string) => void;
  activeLocale?: string;
  onLocaleChange?: (locale: string) => void;
  locale: string;
  isSimpleMode?: boolean;
  customLabels?: RosterCustomLabels;
  availableRoles?: string[];
  availableGenders?: string[];
}

export function CandidateFormInputs({
  entity,
  index,
  onChange,
  onRemove,
  showTranslations = false,
  translations,
  onTranslationChange,
  activeLocale: controlledLocale,
  onLocaleChange,
  isSimpleMode = false,
  customLabels = {},
  availableRoles = [],
  availableGenders = [],
}: CandidateFormInputsProps) {
  const dict = useDictionary();
  const c = dict.smashOrPass.creator || {};
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internalLocale, setInternalLocale] = useState<string>('en');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useOnValueChange(entity.key, () => setUploadError(null));

  const currentLocale = controlledLocale ?? internalLocale;
  const setLocale = (nextLocale: string) => {
    if (onLocaleChange) {
      onLocaleChange(nextLocale);
    } else {
      setInternalLocale(nextLocale);
    }
  };

  const effectiveLocale = showTranslations ? currentLocale : 'en';
  const isBaseLocale = effectiveLocale === 'en';
  const sharedNotice = showTranslations && !isBaseLocale ? (
    <span className="type-micro text-text-muted/70 font-normal ml-1">({c.sharedFieldNotice})</span>
  ) : null;

  const getFieldProps = (
    field: (typeof TRANSLATABLE_FIELDS)[number],
    baseValue: string,
    defaultPlaceholder?: string
  ) => {
    if (isBaseLocale) {
      return {
        value: baseValue,
        placeholder: defaultPlaceholder,
        onChange: (v: string) => onChange({ [field]: v }),
      };
    }
    return {
      value: translations[effectiveLocale]?.[field] || '',
      placeholder: baseValue || defaultPlaceholder,
      onChange: (v: string) => onTranslationChange(effectiveLocale, field, v),
    };
  };

  const handlePortraitUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file, IMAGE_SIZE_PRESETS.portrait, MAX_DATA_IMAGE_CHARS);
      if (dataUrl) {
        onChange({ media_url: dataUrl });
      } else {
        setUploadError(formatMessage(dict.tierLists.creator.uploadSkipped, { count: 1 }));
      }
    } finally {
      setUploading(false);
    }
  };

  const trimmedMedia = entity.media_url.trim();
  const isBlobMedia = trimmedMedia.startsWith('blob:');
  const safeMedia = trimmedMedia && !isBlobMedia ? sanitizeImageUrl(trimmedMedia) : null;
  const mediaInvalid = Boolean(trimmedMedia) && !safeMedia;

  const handlePortraitPaste = (e: React.ClipboardEvent) => {
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        void handlePortraitUpload(file);
        return;
      }
    }
    const text = e.clipboardData?.getData('text')?.trim();
    if (text && text.startsWith('blob:')) {
      e.preventDefault();
      setUploadError(c.blobUrlUnsupportedAdmin);
    }
  };

  const displayIndex = String(index + 1).padStart(2, '0');

  return (
    <div className="flex flex-col gap-4">
      {/* Active candidate header with identity, language dropdown & remove button */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border-color/60">
        <div className="flex items-center gap-2 min-w-0">
          <Badge tone="red" size="sm" plain square>
            #{displayIndex}
          </Badge>
          <h3 className="type-label-lg font-bold text-text-primary truncate">
            {c.editingCandidate}:{' '}
            <span className="text-accent-red">{entity.name.trim() || c.unnamedCandidate}</span>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {showTranslations && (
            <>
              <span className="type-micro text-text-muted whitespace-nowrap">{c.editingLanguageLabel}:</span>
              <CustomDropdown<string>
                value={effectiveLocale}
                onChange={(loc) => setLocale(loc)}
                options={[
                  { value: 'en', label: c.baseLanguageLabel },
                  { value: 'pl', label: 'Polski (PL)' },
                  { value: 'de', label: 'Deutsch (DE)' },
                  { value: 'es', label: 'Español (ES)' },
                  { value: 'ja', label: '日本語 (JA)' },
                ]}
                ariaLabel={c.editingLanguageLabel}
                accent="primary"
              />
            </>
          )}
          <Button
            variant="danger"
            size="sm"
            icon
            onClick={onRemove}
            aria-label={formatMessage((c.removeCandidateAria), { name: entity.name || displayIndex })}
            {...tip(c.removeCandidate, undefined, 'action')}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Inputs grid */}
      <div className="space-y-4">
        {/* Top Row: Avatar preview (prominent) & Primary identifiers (compact) */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-6 2xl:gap-8 max-w-3xl 2xl:max-wide-2k:max-w-4xl wide-2k:max-w-6xl mx-auto w-full">
          <CandidatePortraitFocalPicker
            safeMedia={safeMedia}
            mediaUrl={entity.media_url}
            name={entity.name}
            displayIndex={displayIndex}
            mediaDisplay={entity.media_display}
            onChangeDisplay={(media_display) => onChange({ media_display })}
            onPaste={handlePortraitPaste}
            onDropFile={(file) => void handlePortraitUpload(file)}
            c={c}
            sharedNotice={sharedNotice}
          />

          {/* Inputs column: compact inputs taking focused space */}
          <div className="flex-1 max-w-md sm:max-w-lg 2xl:max-wide-2k:max-w-xl wide-2k:max-w-3xl w-full flex flex-col gap-2.5">
            <label className="block">
              <span className="mb-1 block type-label-xs text-text-secondary">
                {c.entityNameLabel}
                <RequiredMark />
                {sharedNotice}
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

            <div className="block">
              <label htmlFor={`entity-media-${entity.key}`} className="mb-1 block type-label-xs text-text-secondary">
                {c.entityMediaLabel}
                {sharedNotice}
              </label>
              <div className="flex items-center gap-1.5">
                <Input
                  id={`entity-media-${entity.key}`}
                  fieldSize="md" invalid={mediaInvalid || Boolean(uploadError) || isBlobMedia}
                  value={entity.media_url}
                  onChange={(e) => {
                    setUploadError(null);
                    onChange({ media_url: e.target.value });
                  }}
                  onPaste={handlePortraitPaste}
                  placeholder={c.coverImagePlaceholder}
                  inputMode="url"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  loading={uploading}
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0"
                >
                  <Upload className="icon-sm" aria-hidden="true" />
                  <span>{dict.smashOrPass.cropModal.uploadFile}</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={(e) => {
                    void handlePortraitUpload(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
              {(uploadError || isBlobMedia) && (
                <p role="alert" className="mt-1 type-caption font-medium text-accent-red">
                  {uploadError || c.blobUrlUnsupportedAdmin}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Dynamic Role Selection */}
              <div className="space-y-1">
                <span className="mb-1 block type-label-xs text-text-secondary">
                  {c.entityRoleLabel}
                  <RequiredMark />
                  {sharedNotice}
                </span>
                <CustomDropdown<string>
                  value={
                    availableRoles.find((r) => termLabel(r).toLowerCase() === entity.role.toLowerCase())
                      ? termLabel(availableRoles.find((r) => termLabel(r).toLowerCase() === entity.role.toLowerCase())!)
                      : entity.role
                  }
                  onChange={(role) => onChange({ role })}
                  options={availableRoles.map((r) => ({ value: termLabel(r), label: termLabel(r) }))}
                  ariaLabel={c.entityRoleLabel}
                  label={!entity.role ? <span className="text-text-muted">{c.entityRoleLabel}</span> : undefined}
                  className="w-full"
                  buttonClassName="w-full"
                  minWidthClass="min-w-full"
                  matchWidth
                  accent="primary"
                />
              </div>

              {/* Dynamic Gender Selection */}
              <div className="space-y-1">
                <span className="mb-1 block type-label-xs text-text-secondary">
                  {c.entityGenderLabel}
                  <RequiredMark />
                  {sharedNotice}
                </span>
                <CustomDropdown<string>
                  value={
                    availableGenders.find((g) => canonicalGender(g) === canonicalGender(entity.gender))
                      ? canonicalGender(availableGenders.find((g) => canonicalGender(g) === canonicalGender(entity.gender))!)
                      : canonicalGender(entity.gender)
                  }
                  onChange={(gender) => onChange({ gender: canonicalGender(gender) })}
                  options={availableGenders.map((g) => ({
                    value: canonicalGender(g),
                    label: genderLabel(g, dict.smashOrPass.filters),
                  }))}
                  ariaLabel={c.entityGenderLabel}
                  label={!entity.gender ? <span className="text-text-muted">{c.entityGenderLabel}</span> : undefined}
                  className="w-full"
                  buttonClassName="w-full"
                  minWidthClass="min-w-full"
                  matchWidth
                  accent="primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Simple Mode: Show 5 core elements + visible optional turn_on & dealbreaker */}
        {isSimpleMode && (
          <div className="grid gap-3 sm:grid-cols-2 pt-3 border-t border-border-color/60 max-w-3xl 2xl:max-wide-2k:max-w-4xl wide-2k:max-w-6xl mx-auto w-full">
            <TextField
              label={<>{c.entityWatermarkLeftLabel}{sharedNotice}</>}
              value={entity.watermark_left}
              max={SMASH_ROSTER_LIMITS.maxWatermark}
              onChange={(v) => onChange({ watermark_left: v })}
              placeholder={c.watermarkLeftPlaceholder}
            />
            <TextField
              label={<>{c.entityWatermarkRightLabel}{sharedNotice}</>}
              value={entity.watermark_right}
              max={SMASH_ROSTER_LIMITS.maxWatermark}
              onChange={(v) => onChange({ watermark_right: v })}
              placeholder={c.watermarkRightPlaceholder}
            />
            <AutoExpandingTextField
              label={customLabels.dating_vibe || c.entityDatingVibeLabel}
              max={SMASH_ROSTER_LIMITS.maxDatingVibe}
              {...getFieldProps('dating_vibe', entity.dating_vibe)}
            />
            <AutoExpandingTextField
              label={customLabels.quote || c.entityQuoteLabel}
              max={SMASH_ROSTER_LIMITS.maxQuote}
              {...getFieldProps('quote', entity.quote, c.quotePlaceholder)}
            />
            <AutoExpandingTextField
              label={customLabels.turn_on || c.entityTurnOnLabel}
              max={SMASH_ROSTER_LIMITS.maxTurnOn}
              {...getFieldProps('turn_on', entity.turn_on, c.turnOnPlaceholder)}
            />
            <AutoExpandingTextField
              label={customLabels.dealbreaker || c.entityDealbreakerLabel}
              max={SMASH_ROSTER_LIMITS.maxDealbreaker}
              {...getFieldProps('dealbreaker', entity.dealbreaker, c.dealbreakerPlaceholder)}
            />
          </div>
        )}

        {/* Full Mode: Profile Details directly visible */}
        {!isSimpleMode && (
          <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border-color/40 max-w-3xl 2xl:max-wide-2k:max-w-4xl wide-2k:max-w-6xl mx-auto w-full">
            <TextField
              label={<>{c.entityRealNameLabel}{sharedNotice}</>}
              value={entity.real_name}
              max={SMASH_ROSTER_LIMITS.maxRealName}
              onChange={(v) => onChange({ real_name: v })}
            />
            <TextField
              label={customLabels.archetype || c.entityArchetypeLabel}
              max={SMASH_ROSTER_LIMITS.maxArchetype}
              {...getFieldProps('archetype', entity.archetype)}
            />
            <AutoExpandingTextField
              label={c.entityTaglineLabel}
              max={SMASH_ROSTER_LIMITS.maxTagline}
              {...getFieldProps('tagline', entity.tagline, c.entityTaglinePlaceholder)}
            />
            <AutoExpandingTextField
              label={customLabels.quote || c.entityQuoteLabel}
              max={SMASH_ROSTER_LIMITS.maxQuote}
              {...getFieldProps('quote', entity.quote, c.quotePlaceholder)}
            />
            <TextAreaField
              label={c.entityBioLabel}
              max={SMASH_ROSTER_LIMITS.maxBio}
              {...getFieldProps('bio', entity.bio)}
              full
            />
            <TextAreaField
              label={customLabels.meme || c.entityMemeLabel}
              max={SMASH_ROSTER_LIMITS.maxMeme}
              {...getFieldProps('meme', entity.meme)}
              full
            />
            <AutoExpandingTextField
              label={customLabels.turn_on || c.entityTurnOnLabel}
              max={SMASH_ROSTER_LIMITS.maxTurnOn}
              {...getFieldProps('turn_on', entity.turn_on, c.turnOnPlaceholder)}
            />
            <AutoExpandingTextField
              label={customLabels.dealbreaker || c.entityDealbreakerLabel}
              max={SMASH_ROSTER_LIMITS.maxDealbreaker}
              {...getFieldProps('dealbreaker', entity.dealbreaker, c.dealbreakerPlaceholder)}
            />
            <AutoExpandingTextField
              label={customLabels.dating_vibe || c.entityDatingVibeLabel}
              max={SMASH_ROSTER_LIMITS.maxDatingVibe}
              {...getFieldProps('dating_vibe', entity.dating_vibe)}
              full
            />
            <TextAreaField
              label={c.entityRedFlagsLabel}
              max={SMASH_ROSTER_LIMITS.maxFlagText * SMASH_ROSTER_LIMITS.maxFlags}
              {...getFieldProps('red_flags', entity.red_flags)}
            />
            <TextAreaField
              label={c.entityGreenFlagsLabel}
              max={SMASH_ROSTER_LIMITS.maxFlagText * SMASH_ROSTER_LIMITS.maxFlags}
              {...getFieldProps('green_flags', entity.green_flags)}
            />
            <TextField
              label={<>{c.entityWatermarkLeftLabel}{sharedNotice}</>}
              value={entity.watermark_left}
              max={SMASH_ROSTER_LIMITS.maxWatermark}
              onChange={(v) => onChange({ watermark_left: v })}
              placeholder={c.watermarkLeftPlaceholder}
            />
            <TextField
              label={<>{c.entityWatermarkRightLabel}{sharedNotice}</>}
              value={entity.watermark_right}
              max={SMASH_ROSTER_LIMITS.maxWatermark}
              onChange={(v) => onChange({ watermark_right: v })}
              placeholder={c.watermarkRightPlaceholder}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Backward compatibility alias */

export { emptyDraftEntity, CandidateTiles } from "./EntityEditorParts";
export type { DraftEntity, EntityTranslationDraft, CandidateTilesProps } from "./EntityEditorParts";
