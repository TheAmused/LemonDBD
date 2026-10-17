'use client';
// frontend/src/components/admin/AdminQueue.tsx
//
// The shared shape of both report queues: status chips (each with its count), an optional search,
// the paged list on the left and the selected case on the right. Each queue supplies its own row
// content and detail panel; everything around them is the same.
import React, { useRef } from 'react';
import { Inbox } from 'lucide-react';
import { AccordionSection } from '@/components/common/AccordionSection';
import { EmptyState } from '@/components/common/EmptyState';
import { SearchInput } from '@/components/common/Field';
import { Pagination } from '@/components/common/Pagination';
import { SelectableCard } from '@/components/common/SelectableCard';
import { Tabs } from '@/components/common/Tabs';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { useDictionary } from '@/context/DictionaryContext';
import { adminQueueDrawerKey } from '@/components/admin/adminStorage';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import { cn } from '@/utils/cn';
import type { QueueStats } from '@/types/admin';

export interface AdminQueueProps<S extends string, T extends { id: number }> {
  ariaLabel: string;
  /** Names the queue's drawer, and the key its open state is remembered under. */
  title: string;
  drawerKey: string;
  statuses: readonly S[];
  status: S | 'all';
  onStatusChange: (status: S | 'all') => void;
  statusLabel: (status: S) => string;
  stats: QueueStats<S> | null;
  search?: { value: string; onChange: (value: string) => void; placeholder: string };
  items: readonly T[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  renderItem: (item: T) => React.ReactNode;
  emptyText: string;
  /** The selected case, or null to show the "select a report" prompt. */
  detail: React.ReactNode | null;
}

export function AdminQueue<S extends string, T extends { id: number }>({
  ariaLabel,
  title,
  drawerKey,
  statuses,
  status,
  onStatusChange,
  statusLabel,
  stats,
  search,
  items,
  total,
  page,
  onPageChange,
  loading,
  selectedId,
  onSelect,
  renderItem,
  emptyText,
  detail,
}: AdminQueueProps<S, T>) {
  const t = useDictionary().admin;
  const [isListOpen, toggleList] = usePersistentDrawer(adminQueueDrawerKey(drawerKey, 'list'), true);
  const [isCaseOpen, toggleCase] = usePersistentDrawer(adminQueueDrawerKey(drawerKey, 'case'), true);
  const detailRef = useRef<HTMLDivElement>(null);

  const select = (id: number) => {
    onSelect(id);
    // Stacked layout (phones, tablets): bring the opened case into view.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  return (
    <div className="grid w-full grid-cols-1 items-stretch gap-4 lg:grid-cols-12 lg:gap-5">
      <AccordionSection as="section" title={title} open={isListOpen} onToggle={toggleList} className="h-full lg:col-span-5" bodyClassName="p-0">
        <div className="space-y-2.5 border-b border-border-color p-3">
          <Tabs<S | 'all'>
            ariaLabel={ariaLabel}
            value={status}
            onChange={onStatusChange}
            panels={false}
            variant="boxed"
            size="sm"
            wrap
            className="w-full"
            tabs={[
              ...statuses.map((s) => ({ value: s, label: statusLabel(s), count: stats?.[s] })),
              { value: 'all' as const, label: t.statusAll, count: stats?.total },
            ]}
          />
          {search && (
            <SearchInput
              fieldSize="sm"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder}
              aria-label={search.placeholder}
            />
          )}
        </div>

        <div className={cn('max-h-list space-y-2 overflow-y-auto p-3 transition-opacity', loading && items.length > 0 && 'opacity-60')} aria-busy={loading}>
          {items.length === 0 ? (
            <EmptyState variant="inline" icon={Inbox} title={loading ? t.loading : emptyText} />
          ) : (
            items.map((item) => (
              <SelectableCard key={item.id} selected={selectedId === item.id} className="w-full space-y-1.5" onClick={() => select(item.id)}>
                {renderItem(item)}
              </SelectableCard>
            ))
          )}
        </div>

        {total > DEFAULT_PAGE_SIZE && (
          <Pagination
            variant="embedded"
            page={page}
            totalPages={Math.ceil(total / DEFAULT_PAGE_SIZE)}
            totalResults={total}
            limit={DEFAULT_PAGE_SIZE}
            onPageChange={onPageChange}
          />
        )}
      </AccordionSection>

      <div ref={detailRef} className="scroll-mt-4 lg:col-span-7 [&>*]:h-full">
        <AccordionSection as="section" title={t.queueCaseTitle} open={isCaseOpen} onToggle={toggleCase} className="h-full" bodyClassName="p-0">
          {detail ?? <EmptyState variant="compact" icon={Inbox} title={t.queueSelectPrompt} />}
        </AccordionSection>
      </div>
    </div>
  );
}
