'use client';
// frontend/src/components/smash-or-pass/creator/RosterBasicsSection.tsx
import type { ReactNode } from 'react';
import { Crop } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { ImageUploadDropzone } from '@/components/common/ImageUploadDropzone';
import { Input, Textarea } from '@/components/common/Field';
import { Switch } from '@/components/common/Switch';
import { Tooltip, tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';
import { defaultRosterThemeColor, SMASH_ROSTER_LIMITS } from '@/utils/smashOrPass/constants';
import { type Draft, Section } from './SmashRosterCreatorParts';
import { LABEL } from './styles';

/** A checkbox row whose whole line is the click target. */
const CHECK_ROW = 'flex items-center gap-2.5 cursor-pointer group select-none';

interface RosterBasicsSectionProps {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
  /** The viewer has tried to save: required fields now show as invalid. */
  attempted: boolean;
  nameMissing: boolean;
  coverInvalid: boolean;
  isUserAdmin: boolean;
  official: boolean;
  onOfficialChange: (official: boolean) => void;
  onOpenCrop: () => void;
  /** Extra content under the form, e.g. the translations panel. */
  children?: ReactNode;
}

/** Name, category, description, cover, theme colour, and the simple / NSFW / official switches. */
export function RosterBasicsSection({
  draft,
  patch,
  attempted,
  nameMissing,
  coverInvalid,
  isUserAdmin,
  official,
  onOfficialChange,
  onOpenCrop,
  children,
}: RosterBasicsSectionProps) {
  const dict = useDictionary();
  const c = dict.smashOrPass.creator;

  return (
    <Section title={c.stepBasics}>
      <div className="w-full max-w-4xl 2xl:max-wide-2k:max-w-5xl wide-2k:max-w-7xl mx-auto grid gap-4 2xl:gap-6 md:grid-cols-2">
        <label>
          <span className={LABEL}>{c.nameLabel}</span>
          <Input
            fieldSize="md" invalid={attempted && nameMissing}
            value={draft.name}
            maxLength={SMASH_ROSTER_LIMITS.maxRosterName}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder={c.namePlaceholder}
            
            className="2xl:min-h-hit-xl 2xl:text-base"
          />
        </label>
        <label>
          <span className={LABEL}>{c.categoryLabel}</span>
          <Input
            fieldSize="md"
            value={draft.category}
            maxLength={64}
            onChange={(e) => patch({ category: e.target.value })}
            placeholder={c.categoryPlaceholder}
            className="2xl:min-h-hit-xl 2xl:text-base"
          />
        </label>
        <label className="md:col-span-2">
          <span className={LABEL}>{c.descriptionLabel}</span>
          <Textarea
            fieldSize="md"
            value={draft.description}
            maxLength={SMASH_ROSTER_LIMITS.maxRosterDescription}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder={c.descriptionPlaceholder}
            rows={2}
            className="2xl:text-base"
          />
        </label>
        <div className="md:col-span-2">
          <ImageUploadDropzone
            value={draft.cover_image_url}
            onChange={(val) => patch({ cover_image_url: val })}
            label={c.coverImageLabel}
            placeholder={c.coverImagePlaceholder}
            invalid={attempted && coverInvalid}
            invalidMessage={c.invalidImage || dict.tierLists.invalidImage}
            aspectRatio="banner"
            onPreviewClick={() => onOpenCrop()}
            previewOverlay={
              <div className="absolute inset-0 bg-bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-text-inverted type-strong pointer-events-none">
                <Crop className="h-5 w-5 text-accent-red" />
                <span>{c.cropClickPrompt}</span>
              </div>
            }
            previewActions={
              <Button
                type="button"
                variant="overlay"
                size="xs"
                icon
                pill
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCrop();
                }}
                {...tip(c.cropCoverTitle, undefined, 'action')}
                aria-label={c.cropCoverTitle}
              >
                <Crop className="h-3.5 w-3.5" />
              </Button>
            }
            emptyActions={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onOpenCrop()}
                {...tip(c.cropCoverTitle, undefined, 'action')}
                aria-label={c.cropCoverTitle}
                className="shrink-0 px-3"
              >
                <Crop className="h-4 w-4 text-accent-red" />
                <span className="hidden sm:inline">{c.cropCoverBadge}</span>
              </Button>
            }
          />
        </div>

        <div className="md:col-span-2 flex flex-col items-center justify-center text-center">
          <span className={LABEL}>{c.themeColorLabel}</span>
          <input
            type="color"
            value={draft.theme_color || defaultRosterThemeColor()}
            onChange={(e) => patch({ theme_color: e.target.value })}
            className="h-10 w-full max-w-xs cursor-pointer rounded-control border border-border-color bg-bg-primary shadow-xs"
          />
        </div>

        {/* Toggles Row: Simple Version, NSFW, and Official (Admin) */}
        <div className="md:col-span-2 pt-4 border-t border-border-color/60 flex flex-wrap items-center justify-center gap-6 sm:gap-8">
          {/* Simple Version Switch */}
          <Tooltip variant="action"
            title={c.simpleVersion}
            description={c.simpleVersionDesc}
          >
            <div
              onClick={() => patch({ roster_mode: draft.roster_mode === 'simple' ? 'full' : 'simple' })}
              className={CHECK_ROW}
            >
              <Switch
                checked={draft.roster_mode === 'simple'}
                onChange={(checked) => patch({ roster_mode: checked ? 'simple' : 'full' })}
                ariaLabel={c.simpleVersion}
              />
              <span className="type-strong-fluid text-text-primary group-hover:text-accent-red transition-colors">
                {c.simpleVersion}
              </span>
            </div>
          </Tooltip>

          {/* NSFW Content Switch */}
          <Tooltip variant="action"
            title={c.nsfwLabel}
            description="Mark this roster as containing mature or sensitive material."
          >
            <div
              onClick={() => patch({ is_nsfw: !draft.is_nsfw })}
              className={CHECK_ROW}
            >
              <Switch
                checked={draft.is_nsfw}
                onChange={(checked) => patch({ is_nsfw: checked })}
                ariaLabel={c.nsfwLabel}
              />
              <span className="type-strong-fluid text-text-primary group-hover:text-accent-red transition-colors">
                {c.nsfwLabel}
              </span>
            </div>
          </Tooltip>

          {/* Official Roster Switch (Admin only) */}
          {isUserAdmin && (
            <Tooltip variant="action"
              title={c.officialPublicHub}
              description="Publish directly to the public Hub directory for all visitors."
            >
              <div
                onClick={() => onOfficialChange(!official)}
                className={CHECK_ROW}
              >
                <Switch
                  checked={official}
                  onChange={(checked) => onOfficialChange(checked)}
                  ariaLabel={c.officialPublicHub}
                />
                <span className="type-strong-fluid text-accent-red group-hover:underline transition-colors">
                  {c.officialPublicHub}
                </span>
              </div>
            </Tooltip>
          )}
        </div>
      </div>
      {children}
    </Section>
  );
}
