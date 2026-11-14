'use client';
// frontend/src/components/smash-or-pass/creator/EntityEditor.tsx
/**
 * Roster candidate editing components:
 * - CandidateFormInputs: Form inputs to edit the active candidate's profile, portrait, role and gender.
 * - CandidateTiles: Squished grid of candidates (avatar + name caption) matching the tier list items pattern.
 */
import { useRef, useState } from 'react';
import { Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
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
import { type DraftEntity, type EntityTranslationDraft, TextField, TextAreaField } from "./EntityEditorParts";
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";
import { tip } from '@/components/common/Tooltip';
import { Badge } from '@/components/common/Badge';
import { Img } from '@/components/common/Img';

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
}

export function CandidateFormInputs({
  entity,
  index,
  onChange,
  onRemove,
  translations,
  onTranslationChange,
  isSimpleMode = false,
  customLabels = {},
  availableRoles = [],
  availableGenders = [],
}: CandidateFormInputsProps) {
  const dict = useDictionary();
  const c = dict.smashOrPass.creator || {};
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeLocale, setActiveLocale] = useState<string>('en');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useOnValueChange(entity.key, () => setUploadError(null));

  const isBaseLocale = activeLocale === 'en';
  const sharedNotice = !isBaseLocale ? (
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
      value: translations[activeLocale]?.[field] || '',
      placeholder: baseValue || defaultPlaceholder,
      onChange: (v: string) => onTranslationChange(activeLocale, field, v),
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
  const fit = entity.media_display?.fit ?? 'cover';

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
          <span className="type-micro text-text-muted whitespace-nowrap">{c.editingLanguageLabel}:</span>
          <CustomDropdown<string>
            value={activeLocale}
            onChange={(loc) => setActiveLocale(loc)}
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
          {/* Visual Portrait Box - prominent and large */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div
              onPaste={handlePortraitPaste}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) void handlePortraitUpload(e.dataTransfer.files[0]);
              }}
              className="relative w-48 sm:w-56 md:w-60 2xl:max-wide-2k:w-68 wide-2k:w-80 aspect-[3/4] rounded-card border-2 border-dashed border-border-color bg-bg-primary overflow-hidden flex items-center justify-center shadow-md"
            >
              {safeMedia ? (
                <Img
                  src={safeMedia}
                  alt={entity.name}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105 select-none"
                  style={{
                    objectPosition: entity.media_display?.position || 'center center',
                    objectFit: fit,
                  }}
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

            {/* 9-point focal point selector when candidate has media */}
            {Boolean(safeMedia || entity.media_url.trim()) && (
              <div className="flex flex-col items-center gap-1.5 pt-1">
                <span
                  className={cn("type-micro text-text-muted font-medium", c.focalPointHint && "cursor-help underline decoration-dotted underline-offset-2")}
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
                    const isSelected = (entity.media_display?.position || 'center center') === pt.value;
                    return (
                      <button
                        key={pt.value}
                        type="button"
                        aria-label={pt.label}
                        aria-pressed={isSelected}
                        onClick={() =>
                          onChange({
                            media_display: {
                              ...entity.media_display,
                              position: pt.value,
                              fit: 'cover',
                            },
                          })
                        }
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
              </div>
            )}
          </div>

          {/* Inputs column: compact inputs taking focused space */}
          <div className="flex-1 max-w-md sm:max-w-lg 2xl:max-wide-2k:max-w-xl wide-2k:max-w-3xl w-full flex flex-col gap-2.5">
            <label className="block">
              <span className="mb-1 block type-label-xs text-text-secondary">
                {c.entityNameLabel}
                {isBaseLocale && <RequiredMark />}
              </span>
              <Input
                fieldSize="md"
                value={isBaseLocale ? entity.name : (translations[activeLocale]?.name || '')}
                maxLength={SMASH_ROSTER_LIMITS.maxEntityName}
                onChange={(e) => {
                  if (isBaseLocale) {
                    onChange({ name: e.target.value });
                  } else {
                    onTranslationChange(activeLocale, 'name', e.target.value);
                  }
                }}
                placeholder={isBaseLocale ? c.entityNamePlaceholder : (entity.name || c.entityNamePlaceholder)}
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
            <TextField
              label={customLabels.dating_vibe || c.entityDatingVibeLabel}
              max={SMASH_ROSTER_LIMITS.maxDatingVibe}
              {...getFieldProps('dating_vibe', entity.dating_vibe)}
            />
            <TextField
              label={customLabels.quote || c.entityQuoteLabel}
              max={SMASH_ROSTER_LIMITS.maxQuote}
              {...getFieldProps('quote', entity.quote, c.quotePlaceholder)}
            />
            <TextField
              label={customLabels.turn_on || c.entityTurnOnLabel}
              max={SMASH_ROSTER_LIMITS.maxTurnOn}
              {...getFieldProps('turn_on', entity.turn_on, c.turnOnPlaceholder)}
            />
            <TextField
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
            <TextField
              label={c.entityTaglineLabel}
              max={SMASH_ROSTER_LIMITS.maxTagline}
              {...getFieldProps('tagline', entity.tagline, c.entityTaglinePlaceholder)}
            />
            <TextField
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
            <TextField
              label={customLabels.turn_on || c.entityTurnOnLabel}
              max={SMASH_ROSTER_LIMITS.maxTurnOn}
              {...getFieldProps('turn_on', entity.turn_on, c.turnOnPlaceholder)}
            />
            <TextField
              label={customLabels.dealbreaker || c.entityDealbreakerLabel}
              max={SMASH_ROSTER_LIMITS.maxDealbreaker}
              {...getFieldProps('dealbreaker', entity.dealbreaker, c.dealbreakerPlaceholder)}
            />
            <TextField
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
