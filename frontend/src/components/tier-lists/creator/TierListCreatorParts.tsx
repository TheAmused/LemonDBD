'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { CircleAlert, Crop } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { TierDefinition, TierListDocumentItem } from '@/types/tierList';
import { type LadderPresetId } from '@/utils/tierLists/creator';
import { migrateTierListState } from '@/utils/tierLists/storage';
import { useDictionary } from '@/context/DictionaryContext';
import { AccordionSection } from '@/components/common/AccordionSection';
import { NsfwSwitch } from '@/components/common/NsfwSwitch';
import { LabeledSwitch } from '@/components/common/Switch';
import { Input } from '@/components/common/Field';
import { Button } from '@/components/common/Button';
import { tip } from '@/components/common/Tooltip';
import { TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import { LABEL, TOUCH_FIELD } from '../styles';

const ImageUploadDropzone = dynamic(
  () => import('@/components/common/ImageUploadDropzone').then((m) => m.ImageUploadDropzone),
  { ssr: false }
);

/** Unfinished work survives a reload or an accidental back-navigation. Only
 * used for a brand-new list -- editing an existing one (see `editId` below)
 * loads straight from the saved list instead, so it can't collide with this. */
export const DRAFT_KEY = 'lemondbd_tier_list_draft';

/** Past this, a list is close to crowding out everything else in localStorage (~5 MB). */
export const STORAGE_WARN_BYTES = 2.5 * 1024 * 1024;

export interface Draft {
  title: string;
  description: string;
  tiers: TierDefinition[];
  items: TierListDocumentItem[];
  preset: LadderPresetId | null;
  /** An https:/data: image shown behind the list's card and page. Empty means none. */
  backgroundImage: string;
  /** Marked as containing mature content. */
  is_nsfw: boolean;
  is_active?: boolean;
}

export function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    // Reuse the storage layer's defensive reader for tiers and items.
    const checked = migrateTierListState({
      custom: { draft: { title: parsed.title, tiers: parsed.tiers, items: parsed.items, placements: {} } },
    }).custom.draft;
    if (!checked) return null;
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      tiers: checked.tiers,
      items: checked.items,
      preset: (parsed.preset as LadderPresetId | null) ?? null,
      backgroundImage: typeof parsed.backgroundImage === 'string' ? parsed.backgroundImage : '',
      is_nsfw: parsed.is_nsfw === true,
      is_active: parsed.is_active !== false,
    };
  } catch {
    return null;
  }
}

export function formatBytes(bytes: number, locale: string): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1
    ? `${mb.toLocaleString(locale, { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024)).toLocaleString(locale)} KB`;
}

export function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <AccordionSection
      title={title}
      open={isOpen}
      onToggle={() => setIsOpen((prev) => !prev)}
      as="section"
    >
      {children}
    </AccordionSection>
  );
}

export function Feedback({ errors, saveError, publishError, scrollSignal, className }: {
  errors: string[];
  saveError: 'quota' | 'unavailable' | null;
  publishError?: string | null;
  /** Bumped on every submit attempt: brings the alert into view even when its text is unchanged. */
  scrollSignal: number;
  className?: string;
}) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollSignal > 0 || saveError || publishError) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [scrollSignal, saveError, publishError]);
  const messages = [
    ...errors,
    ...(saveError ? [saveError === 'quota' ? t.saveFailedQuota : t.saveFailedUnavailable] : []),
    ...(publishError ? [publishError] : []),
  ];
  if (messages.length === 0) return null;
  return (
    <div ref={ref} className={cn('scroll-mt-4', className)}>
      <div role="alert" className="flex flex-col items-center justify-center gap-1.5 rounded-chip border border-accent-red/40 bg-accent-red/10 p-3 type-card-title text-accent-red text-center">
        {messages.map((m) => (
          <p key={m} className="flex items-center justify-center gap-2">
            <CircleAlert className="icon-md shrink-0" aria-hidden="true" />
            {m}
          </p>
        ))}
      </div>
    </div>
  );
}

export interface TierListBasicsSectionProps {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
  attempted: boolean;
  titleMissing: boolean;
  backgroundInvalid: boolean;
  isAdmin: boolean;
  officialSlug?: string;
  official: boolean;
  onOfficialChange: (official: boolean) => void;
  onOpenCrop: () => void;
}

export function TierListBasicsSection({
  draft,
  patch,
  attempted,
  titleMissing,
  backgroundInvalid,
  isAdmin,
  officialSlug,
  official,
  onOfficialChange,
  onOpenCrop,
}: TierListBasicsSectionProps) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const c = t.creator;

  return (
    <Section title={c.stepBasics}>
      <div className="grid gap-4 2xl:gap-6 md:grid-cols-2">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 md:col-span-2">
          <NsfwSwitch
            checked={draft.is_nsfw}
            onChange={(checked) => patch({ is_nsfw: checked })}
            label={t.nsfw.label}
            hint={t.nsfw.hint}
          />
          {isAdmin && !officialSlug && (
            <LabeledSwitch checked={official} onChange={onOfficialChange} label={c.official} />
          )}
          {isAdmin && (official || Boolean(officialSlug)) && (
            <LabeledSwitch
              checked={draft.is_active ?? true}
              onChange={(checked) => patch({ is_active: checked })}
              label={c.publishedLabel}
            />
          )}
        </div>
        <label className="md:col-span-1">
          <span className={LABEL}>
            {c.titleLabel}
            <span className="text-accent-red"> *</span>
          </span>
          <Input
            value={draft.title}
            maxLength={TIER_LIST_LIMITS.maxTitle}
            onChange={(e) => patch({ title: e.target.value })}
            invalid={attempted && titleMissing}
            className={cn(TOUCH_FIELD, '2xl:min-h-hit-xl 2xl:text-base')}
          />
        </label>
        <label className="md:col-span-1">
          <span className={LABEL}>{c.descriptionLabel}</span>
          <Input
            value={draft.description}
            maxLength={TIER_LIST_LIMITS.maxDescription}
            onChange={(e) => patch({ description: e.target.value })}
            className={cn(TOUCH_FIELD, '2xl:min-h-hit-xl 2xl:text-base')}
          />
        </label>
        <div className="md:col-span-2">
          <ImageUploadDropzone
            value={draft.backgroundImage}
            onChange={(val) => patch({ backgroundImage: val })}
            label={c.backgroundImageLabel}
            placeholder={c.backgroundImagePlaceholder}
            hint={isAdmin ? c.backgroundImageHint : undefined}
            invalid={attempted && backgroundInvalid}
            invalidMessage={t.invalidImage}
            aspectRatio="banner"
            allowFileUpload={isAdmin}
            onPreviewClick={isAdmin ? onOpenCrop : undefined}
            previewOverlay={
              isAdmin ? (
                <div className="absolute inset-0 bg-bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-text-inverted type-strong pointer-events-none">
                  <Crop className="icon-lg text-accent-red" />
                  <span>{c.cropClickPrompt}</span>
                </div>
              ) : undefined
            }
            previewActions={
              isAdmin ? (
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
                  <Crop />
                </Button>
              ) : undefined
            }
            emptyActions={
              isAdmin ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onOpenCrop}
                  {...tip(c.cropCoverTitle, undefined, 'action')}
                  aria-label={c.cropCoverTitle}
                  className="shrink-0 px-3"
                >
                  <Crop className="icon-md text-accent-red" />
                  <span className="hidden sm:inline">{c.cropCoverBadge}</span>
                </Button>
              ) : undefined
            }
          />
        </div>
      </div>
    </Section>
  );
}
