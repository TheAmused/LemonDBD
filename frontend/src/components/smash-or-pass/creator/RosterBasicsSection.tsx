'use client';
// frontend/src/components/smash-or-pass/creator/RosterBasicsSection.tsx
import type { ReactNode } from 'react';
import { Crop } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input, Textarea } from '@/components/common/Field';
import { Switch } from '@/components/common/Switch';
import { Tooltip, tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';
import { SMASH_ROSTER_LIMITS } from '@/utils/smashOrPass/constants';
import { type Draft, Section } from './SmashRosterCreatorParts';
import { LABEL } from './styles';

interface RosterBasicsSectionProps {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
  /** The viewer has tried to save: required fields now show as invalid. */
  attempted: boolean;
  nameMissing: boolean;
  coverInvalid: boolean;
  /** The cover link once sanitized, or null if absent or unsafe. */
  safeCover: string | null;
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
  safeCover,
  isUserAdmin,
  official,
  onOfficialChange,
  onOpenCrop,
  children,
}: RosterBasicsSectionProps) {
  const dict = useDictionary();
  const c = dict.smashOrPass.creator;

  return (
    <Section title={c.stepBasics || 'The Basics'}>
      <div className="w-full max-w-4xl 2xl:max-wide-2k:max-w-5xl wide-2k:max-w-7xl mx-auto grid gap-4 2xl:gap-6 md:grid-cols-2">
        <label>
          <span className={LABEL}>{c.nameLabel || 'Roster name'}</span>
          <Input
            fieldSize="md" invalid={attempted && nameMissing}
            value={draft.name}
            maxLength={SMASH_ROSTER_LIMITS.maxRosterName}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder={c.namePlaceholder || 'e.g. Chapter 34 Cast'}
            
            className="2xl:min-h-[50px] 2xl:text-base"
          />
        </label>
        <label>
          <span className={LABEL}>{c.categoryLabel || 'Category'}</span>
          <Input
            fieldSize="md"
            value={draft.category}
            maxLength={64}
            onChange={(e) => patch({ category: e.target.value })}
            placeholder={c.categoryPlaceholder || 'e.g. Custom'}
            className="2xl:min-h-[50px] 2xl:text-base"
          />
        </label>
        <label className="md:col-span-2">
          <span className={LABEL}>{c.descriptionLabel || 'Description (optional)'}</span>
          <Textarea
            fieldSize="md"
            value={draft.description}
            maxLength={SMASH_ROSTER_LIMITS.maxRosterDescription}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder={c.descriptionPlaceholder || 'What is this roster about?'}
            rows={2}
            className="2xl:text-base"
          />
        </label>
        <div className="md:col-span-2">
          <span className={LABEL}>{c.coverImageLabel || 'Cover image URL (optional)'}</span>
          <div className="flex gap-2">
            <Input
              fieldSize="md" invalid={attempted && coverInvalid}
              value={draft.cover_image_url}
              onChange={(e) => patch({ cover_image_url: e.target.value })}
              placeholder={c.coverImagePlaceholder || 'https://...'}
              inputMode="url"
              
              className="2xl:min-h-[50px] 2xl:text-base"
            />
            <Button
              variant="secondary" size="md"
              onClick={() => onOpenCrop()}
              {...tip(c.cropCoverTitle, undefined, 'action')} aria-label={c.cropCoverTitle}
              className="shrink-0 px-3"
            >
              <Crop className="h-4 w-4 text-accent-red" />
              <span className="hidden sm:inline">{c.cropCoverBadge}</span>
            </Button>
          </div>

          {safeCover && (
            <div
              onClick={() => onOpenCrop()}
              className="mt-3 relative group overflow-hidden rounded-xl border border-border-color bg-bg-elevated aspect-video max-w-md 2xl:max-w-lg wide:max-w-xl mx-auto shadow-xs cursor-pointer"
              {...tip(c.cropCoverTitle, undefined, 'action')}
            >
              <img
                src={safeCover}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-text-inverted type-strong">
                <Crop className="h-5 w-5 text-accent-red" />
                <span>{c.cropClickPrompt}</span>
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-2 flex flex-col items-center justify-center text-center">
          <span className={LABEL}>{c.themeColorLabel || 'Theme color'}</span>
          <input
            type="color"
            value={draft.theme_color || '#ff0055'}
            onChange={(e) => patch({ theme_color: e.target.value })}
            className="h-10 w-full max-w-xs cursor-pointer rounded-xl border border-border-color bg-bg-primary shadow-xs"
          />
        </div>

        {/* Toggles Row: Simple Version, NSFW, and Official (Admin) */}
        <div className="md:col-span-2 pt-4 border-t border-border-color/60 flex flex-wrap items-center justify-center gap-6 sm:gap-8">
          {/* Simple Version Switch */}
          <Tooltip variant="action"
            title={c.simpleVersion || 'Simple Version'}
            description={c.simpleVersionDesc || 'Fast cards + optional turn-on & dealbreaker'}
          >
            <div
              onClick={() => patch({ roster_mode: draft.roster_mode === 'simple' ? 'full' : 'simple' })}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
            >
              <Switch
                checked={draft.roster_mode === 'simple'}
                onChange={(checked) => patch({ roster_mode: checked ? 'simple' : 'full' })}
                ariaLabel={c.simpleVersion || 'Simple Version'}
              />
              <span className="type-strong-fluid text-text-primary group-hover:text-accent-red transition-colors">
                {c.simpleVersion || 'Simple Version'}
              </span>
            </div>
          </Tooltip>

          {/* NSFW Content Switch */}
          <Tooltip variant="action"
            title={c.nsfwLabel || 'Contains NSFW content'}
            description="Mark this roster as containing mature or sensitive material."
          >
            <div
              onClick={() => patch({ is_nsfw: !draft.is_nsfw })}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
            >
              <Switch
                checked={draft.is_nsfw}
                onChange={(checked) => patch({ is_nsfw: checked })}
                ariaLabel={c.nsfwLabel || 'Contains NSFW content'}
              />
              <span className="type-strong-fluid text-text-primary group-hover:text-accent-red transition-colors">
                {c.nsfwLabel || 'Contains NSFW content'}
              </span>
            </div>
          </Tooltip>

          {/* Official Roster Switch (Admin only) */}
          {isUserAdmin && (
            <Tooltip variant="action"
              title={c.officialPublicHub || 'Official Roster (Public on Hub)'}
              description="Publish directly to the public Hub directory for all visitors."
            >
              <div
                onClick={() => onOfficialChange(!official)}
                className="flex items-center gap-2.5 cursor-pointer group select-none"
              >
                <Switch
                  checked={official}
                  onChange={(checked) => onOfficialChange(checked)}
                  ariaLabel={c.officialPublicHub || 'Official Roster (Public on Hub)'}
                />
                <span className="type-strong-fluid text-accent-red group-hover:underline transition-colors">
                  {c.officialPublicHub || 'Official (Public on Hub)'}
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
