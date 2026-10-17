'use client';
// frontend/src/components/admin/AdminQueue.tsx
//
// The shared shape of both report queues: status chips (each with its count), an optional search,
// the paged list on the left and the selected case on the right. Each queue supplies its own row
// content and detail panel; everything around them is the same.
import React, { useRef } from 'react';
import { Inbox } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { SearchInput } from '@/components/common/Field';
import { Pagination } from '@/components/common/Pagination';
import { SelectableCard } from '@/components/common/SelectableCard';
import { Surface } from '@/components/common/Surface';
import { Tabs } from '@/components/common/Tabs';
import { useDictionary } from '@/context/DictionaryContext';
import { cn } from '@/utils/cn';
import type { QueueStats } from '@/types/admin';

export const QUEUE_PAGE_SIZE = 15;

export interface AdminQueueProps<S extends string, T extends { id: number }> {
  ariaLabel: string;
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
  const detailRef = useRef<HTMLDivElement>(null);

  const select = (id: number) => {
    onSelect(id);
    // Stacked layout (phones, tablets): bring the opened case into view.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  return (
    <div className="grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
      <Surface padding="none" className="flex flex-col overflow-hidden lg:col-span-5">
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

        <div className={cn('max-h-[36rem] space-y-2 overflow-y-auto p-3 transition-opacity', loading && items.length > 0 && 'opacity-60')} aria-busy={loading}>
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

        {total > QUEUE_PAGE_SIZE && (
          <Pagination
            className="mt-0 border-t border-border-color px-3 py-2 sm:mt-0 sm:pt-2 lg:pt-2 wide:pt-2"
            page={page}
            totalPages={Math.ceil(total / QUEUE_PAGE_SIZE)}
            totalResults={total}
            limit={QUEUE_PAGE_SIZE}
            onPageChange={onPageChange}
          />
        )}
      </Surface>

      <div ref={detailRef} className="scroll-mt-4 lg:col-span-7">
        {detail ?? <EmptyState variant="compact" icon={Inbox} title={t.queueSelectPrompt} />}
      </div>
    </div>
  );
}
