'use client';

import React, { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import type { TierDefinition, TierListDocumentItem } from '@/types/tierList';
import { type LadderPresetId } from '@/utils/tierLists/creator';
import { migrateTierListState } from '@/utils/tierLists/storage';
import { useDictionary } from '@/context/DictionaryContext';
import { AccordionSection } from '@/components/common/AccordionSection';

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

export function Feedback({ errors, saveError, publishError }: {
  errors: string[];
  saveError: 'quota' | 'unavailable' | null;
  publishError?: string | null;
}) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const messages = [
    ...errors,
    ...(saveError ? [saveError === 'quota' ? t.saveFailedQuota : t.saveFailedUnavailable] : []),
    ...(publishError ? [publishError] : []),
  ];
  if (messages.length === 0) return null;
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-1.5 rounded-chip border border-accent-red/40 bg-accent-red/10 p-3 type-card-title text-accent-red text-center">
      {messages.map((m) => (
        <p key={m} className="flex items-center justify-center gap-2">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          {m}
        </p>
      ))}
    </div>
  );
}
