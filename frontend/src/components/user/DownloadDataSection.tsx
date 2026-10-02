'use client';
// frontend/src/components/user/DownloadDataSection.tsx
//
// Self-service data export (GDPR access / portability): one JSON file.

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { Button } from '@/components/common/Button';
import { tip } from '@/components/common/Tooltip';
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
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleDownload}
        disabled={busy}
        leftIcon={<Download className="h-3.5 w-3.5" />}
        aria-label={t.downloadDataTitle || 'Download my data'}
        {...tip(t.downloadDataTitle || 'Download my data', t.downloadDataDesc, 'action')}
      >
        <span>{t.downloadDataButton || 'Download my data'}</span>
      </Button>
      {error ? <span role="alert" className="type-strong text-accent-red">{t.downloadDataFailed}</span> : null}
    </>
  );
};
