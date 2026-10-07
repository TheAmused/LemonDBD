'use client';
// frontend/src/components/streaks/StreakMatchesModal.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import { StreakMatchRow } from './StreakMatchRow';
import type { StreakMatchLogBase } from './StreakStatsDrawer';
import { useDictionary } from "@/context/DictionaryContext";

const DEFAULT_PAGE_SIZE = 15;

export interface StreakMatchesModalProps<TLog extends StreakMatchLogBase> {
  isOpen: boolean;
  onClose: () => void;
  logs: TLog[];
  renderLabel: (log: TLog) => React.ReactNode;
  renderMeta: (log: TLog) => React.ReactNode;
}

/** Every logged match of one streak mode, paginated. Opened from the stats drawer. */
export function StreakMatchesModal<TLog extends StreakMatchLogBase>({ isOpen, onClose, logs, renderLabel, renderMeta }: StreakMatchesModalProps<TLog>) {
  const dict = useDictionary();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    if (isOpen) setPage(1);
  }, [isOpen]);

  const totalPages = Math.max(1, Math.ceil(logs.length / limit));
  const pageLogs = logs.slice((page - 1) * limit, page * limit);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="lg"
      title={dict.streaks.recentMatchHistory}
      centerTitle
      closeButtonAriaLabel={dict.modal.close}
      bodyClassName="space-y-2.5 p-5"
      footer={
        <Pagination
          page={page}
          totalPages={totalPages}
          totalResults={logs.length}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(next: number) => {
            setLimit(next);
            setPage(1);
          }}
        />
      }
    >
      {pageLogs.map((log) => (
        <StreakMatchRow key={log.id} log={log} renderLabel={renderLabel} renderMeta={renderMeta} />
      ))}
    </Modal>
  );
}
