'use client';
// frontend/src/components/streaks/StreakMatchesModal.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Pagination } from '@/components/Pagination';
import { StreakMatchRow } from './StreakMatchRow';
import type { StreakMatchLogBase } from './StreakStatsDrawer';

const DEFAULT_PAGE_SIZE = 15;

export interface StreakMatchesModalProps<TLog extends StreakMatchLogBase> {
  isOpen: boolean;
  onClose: () => void;
  logs: TLog[];
  renderLabel: (log: TLog) => React.ReactNode;
  renderMeta: (log: TLog) => React.ReactNode;
  dict?: Dictionary;
}

/** Every logged match of one streak mode, paginated. Opened from the stats drawer. */
export function StreakMatchesModal<TLog extends StreakMatchLogBase>({
  isOpen,
  onClose,
  logs,
  renderLabel,
  renderMeta,
  dict,
}: StreakMatchesModalProps<TLog>) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    if (!isOpen) return;
    setPage(1);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalPages = Math.max(1, Math.ceil(logs.length / limit));
  const pageLogs = logs.slice((page - 1) * limit, page * limit);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-bg-primary/80 p-4 backdrop-blur-md cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[85vh] w-full max-w-lg cursor-default flex-col overflow-hidden rounded-2xl border border-border-color bg-bg-surface"
      >
        <div className="flex items-center justify-between border-b border-border-color bg-bg-elevated p-5">
          <h2 className="text-xl font-bold text-text-primary">
            {dict?.streaks?.recentMatchHistory || 'Recent Match History'}
          </h2>
          <button
            onClick={onClose}
            aria-label={dict?.modal?.close || 'Close'}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto p-5">
          {pageLogs.map((log) => (
            <StreakMatchRow key={log.id} log={log} renderLabel={renderLabel} renderMeta={renderMeta} dict={dict} />
          ))}
        </div>

        <div className="shrink-0 border-t border-border-color px-5 pb-3">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalResults={logs.length}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(next) => {
              setLimit(next);
              setPage(1);
            }}
            dict={dict}
          />
        </div>
      </div>
    </div>
  );
}
