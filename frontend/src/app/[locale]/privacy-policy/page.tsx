'use client';
// frontend/src/app/[locale]/privacy-policy/page.tsx
import type { Dictionary } from '@/locales/types';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, ChevronDown, Eye, EyeOff, GripVertical, RotateCcw, ShieldCheck } from 'lucide-react';
import { SidewaysPointerSensor } from '@/components/tier-lists/touchSensors';
import {
  PRIVACY_LAYOUT_STORAGE_KEY,
  normalizePrivacyLayout,
  type PrivacyLayout,
} from '@/utils/privacyLayout';
import { PageShell } from '@/components/layout/PageShell';
import { CampfireParticles } from '@/components/common/CampfireParticles';
import { RichText } from '@/components/common/RichText';
import { Locale } from '@/i18n/config';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import { apiUrl } from '@/utils/api';
import { fillPrivacyPlaceholders, type PrivacyInfo } from '@/utils/privacyPlaceholders';

/** Render order of the policy sections (keys of `dict.privacy.sections`). */
export const PRIVACY_SECTION_ORDER = [
  'whoWeAre',
  'dataWeCollect',
  'howWeUse',
  'analytics',
  'storage',
  'sharing',
  'transfers',
  'retention',
  'security',
  'rights',
  'children',
  'changes',
  'contact',
] as const;

const SUMMARY_BLOCK = 'summary';
const ALL_BLOCK_IDS: readonly string[] = [SUMMARY_BLOCK, ...PRIVACY_SECTION_ORDER];

interface BlockCardProps {
  id: string;
  label: string;
  title: React.ReactNode;
  accent?: boolean;
  hideLabel: string;
  dragLabel: string;
  onHide: () => void;
  children: React.ReactNode;
}

function BlockCard({ id, label, title, accent, hideLabel, dragLabel, onHide, children }: BlockCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  // Same collapsible drawer the About page cards use, remembered per block.
  const [isExpanded, toggleExpanded] = usePersistentDrawer(`lemondbd_drawer_privacy_${id}`, true);

  return (
    <div
      ref={setNodeRef}
      id={id}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`grid scroll-mt-6 grid-cols-1 grid-rows-1 ${isDragging ? 'relative z-30 opacity-90' : ''}`}
    >
      <section
        aria-label={label}
        className={`col-start-1 row-start-1 z-10 flex flex-col overflow-hidden rounded-3xl border bg-bg-surface backdrop-blur-xl shadow-md transition-colors ${
          accent ? 'border-accent-red/30' : 'border-border-color'
        } ${isExpanded ? 'h-full self-stretch' : 'h-fit self-start'} ${
          isDragging ? 'shadow-2xl ring-1 ring-accent-red/50' : ''
        }`}
      >
        <div className="relative flex shrink-0 items-center justify-center">
          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={isExpanded}
            className="relative flex w-full cursor-pointer select-none items-center justify-center px-20 py-4 text-center sm:px-24"
          >
            <h2 className="flex flex-wrap items-baseline justify-center gap-x-2 text-center font-mono text-xs font-bold uppercase tracking-widest text-accent-red sm:text-sm">
              {title}
            </h2>
          </button>
          <button
            type="button"
            ref={setActivatorNodeRef}
            aria-label={dragLabel}
            title={dragLabel}
            className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab touch-none rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-elevated hover:text-accent-red active:cursor-grabbing sm:left-4"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onHide}
            aria-label={hideLabel}
            title={hideLabel}
            className="absolute right-10 top-1/2 -translate-y-1/2 rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-elevated hover:text-accent-red sm:right-14"
          >
            <EyeOff className="h-4 w-4" />
          </button>
          <ChevronDown
            aria-hidden="true"
            className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-red transition-transform duration-300 ease-in-out sm:right-7 sm:h-5 sm:w-5 ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </div>
        <div
          className={`grid flex-1 transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="h-full overflow-hidden">
            <div className="flex h-full flex-col gap-2 border-t border-border-color p-4 text-sm leading-relaxed sm:p-6">
              {children}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function PrivacyPolicyPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const dict = useDictionary();
  const privacy = dict?.privacy;

  useDocumentTitle(privacy?.pageTitle || 'LemonDBD - Privacy Policy');

  // Contact address, lifetimes and mail provider come from the backend (admin-editable),
  // so the translated text only holds placeholders for them.
  const [info, setInfo] = useState<PrivacyInfo | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/api/v1/privacy-info'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PrivacyInfo | null) => {
        if (!cancelled && data) setInfo(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const fill = (text?: string | null) => (text ? fillPrivacyPlaceholders(text, info, locale) : text);

  // Block order and visibility are a per-browser preference.
  const [layout, setLayout] = useState<PrivacyLayout>(() => normalizePrivacyLayout(null, ALL_BLOCK_IDS));
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRIVACY_LAYOUT_STORAGE_KEY);
      if (saved) setLayout(normalizePrivacyLayout(JSON.parse(saved), ALL_BLOCK_IDS));
    } catch {
      // Storage unavailable or corrupt: keep the default layout.
    }
  }, []);
  const updateLayout = useCallback((next: PrivacyLayout) => {
    setLayout(next);
    try {
      localStorage.setItem(PRIVACY_LAYOUT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal.
    }
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(SidewaysPointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const visibleIds = useMemo(
    () => layout.order.filter((id) => !layout.hidden.includes(id)),
    [layout]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = visibleIds.indexOf(String(active.id));
    const to = visibleIds.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const moved = arrayMove(visibleIds, from, to);
    // Hidden blocks keep their slot relative to the full order.
    const hiddenInOrder = layout.order.filter((id) => layout.hidden.includes(id));
    updateLayout({ order: [...moved, ...hiddenInOrder], hidden: layout.hidden });
  };

  const hideBlock = (id: string) => updateLayout({ ...layout, hidden: [...layout.hidden, id] });
  const showBlock = (id: string) =>
    updateLayout({ ...layout, hidden: layout.hidden.filter((h) => h !== id) });
  const resetLayout = () => updateLayout(normalizePrivacyLayout(null, ALL_BLOCK_IDS));

  const blockTitle = (id: string): string =>
    id === SUMMARY_BLOCK
      ? privacy?.summaryHeading ?? ''
      : privacy?.sections[id as (typeof PRIVACY_SECTION_ORDER)[number]]?.heading ?? '';
  const blockNumber = (id: string) => {
    const idx = PRIVACY_SECTION_ORDER.indexOf(id as (typeof PRIVACY_SECTION_ORDER)[number]);
    return idx < 0 ? null : String(idx + 1).padStart(2, '0');
  };

  const renderBlockBody = (id: string) => {
    if (!privacy) return null;
    if (id === SUMMARY_BLOCK) {
      return (
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-text-muted marker:text-accent-red">
          {privacy.summary.map((line, i) => (
            <li key={i}>
              <RichText text={fill(line)} />
            </li>
          ))}
        </ul>
      );
    }
    const section = privacy.sections[id as (typeof PRIVACY_SECTION_ORDER)[number]];
    return (
      <>
        {section.paragraphs.map((text, i) => (
          <p key={i} className="text-text-muted text-justify [text-justify:inter-word] hyphens-auto">
            <RichText text={fill(text)} />
          </p>
        ))}
        {section.items.length > 0 ? (
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-text-muted marker:text-accent-red">
            {section.items.map((text, i) => (
              <li key={i}>
                <RichText text={fill(text)} />
              </li>
            ))}
          </ul>
        ) : null}
      </>
    );
  };

  return (
    <PageShell
      locale={locale}
      dict={dict || ({} as Dictionary)}
      padding="spacious"
      mainClassName="flex flex-col items-center min-h-[calc(100vh-4rem)] lg:min-h-screen overflow-y-auto relative"
    >
      <CampfireParticles />
      <div className="relative z-10 mx-auto flex w-full max-w-5xl xl:max-w-6xl flex-col gap-6 sm:gap-8 py-6 sm:py-10">
        <Link
          href={`/${locale}/about`}
          className="inline-flex w-fit items-center gap-1.5 text-xs sm:text-sm font-semibold text-text-muted hover:text-accent-red transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {privacy?.backToAbout}
        </Link>

        <header className="flex flex-col items-center text-center gap-2.5 sm:gap-3">
          <ShieldCheck className="h-8 w-8 text-accent-red" aria-hidden="true" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-mono tracking-tight text-text-primary">
            {privacy?.heading}
          </h1>
          <p className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-text-muted">
            {privacy?.lastUpdatedLabel}: {privacy?.lastUpdated}
          </p>
          <p className="max-w-2xl text-xs sm:text-sm text-text-muted leading-relaxed px-2">
            <RichText text={fill(privacy?.intro)} />
          </p>
        </header>

        {privacy ? (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={visibleIds} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 lg:grid-cols-2">
                  {visibleIds.map((id) => {
                    const num = blockNumber(id);
                    return (
                      <BlockCard
                        key={id}
                        id={id}
                        label={blockTitle(id)}
                        accent={id === SUMMARY_BLOCK}
                        hideLabel={privacy.layoutHide}
                        dragLabel={privacy.layoutDrag}
                        onHide={() => hideBlock(id)}
                        title={
                          <>
                            {num ? <span className="text-text-muted">{num}</span> : null}
                            <span>{blockTitle(id)}</span>
                          </>
                        }
                      >
                        {renderBlockBody(id)}
                      </BlockCard>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {layout.hidden.length > 0 ? (
              <aside className="flex flex-col gap-3 rounded-3xl border border-dashed border-border-color bg-bg-surface/60 p-4 sm:p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-text-muted font-mono">
                    {privacy.layoutHiddenHeading} ({layout.hidden.length})
                  </h2>
                  <button
                    type="button"
                    onClick={resetLayout}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:bg-bg-elevated hover:text-accent-red"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {privacy.layoutReset}
                  </button>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {layout.hidden.map((id) => (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => showBlock(id)}
                        title={`${privacy.layoutShow}: ${blockTitle(id)}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-bg-surface px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors hover:border-accent-red/50 hover:text-accent-red"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        {blockTitle(id)}
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}
          </>
        ) : null}
      </div>
    </PageShell>
  );
}
