'use client';
// frontend/src/components/user/DownloadDataSection.tsx
//
// Self-service data export (GDPR access / portability): one JSON file.

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { Button } from '@/components/common/Button';
import { downloadMyData } from '@/services/userProfileApi';

export const DownloadDataSection: React.FC<{ dict?: Dictionary }> = ({ dict }) => {
  const t = (dict?.user || {}) as Record<string, string>;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const handleDownload = async () => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await downloadMyData();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border-color bg-bg-surface p-4 sm:p-5 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-wider text-text-primary">
            {t.downloadDataTitle || 'Download my data'}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">{t.downloadDataDesc}</p>
          {error ? <p className="mt-1 text-xs font-semibold text-accent-red">{t.downloadDataFailed}</p> : null}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownload}
          disabled={busy}
          leftIcon={<Download className="h-3.5 w-3.5" />}
          className="w-full sm:w-auto shrink-0"
        >
          <span>{t.downloadDataButton || 'Download my data'}</span>
        </Button>
      </div>
    </section>
  );
};
