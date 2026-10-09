'use client';
// frontend/src/components/user/DownloadDataSection.tsx
//
// "Download data" button shared by the profile page (your own data) and the
// admin user table (another user's data). Only the target differs: both call
// downloadAccountData and receive the same JSON file (GDPR access / portability).

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { tip } from '@/components/common/Tooltip';
import { downloadAccountData } from '@/services/userProfileApi';
import { useDictionary } from '@/context/DictionaryContext';

interface DownloadDataSectionProps {
  /** Whose data to download. Omit for the signed-in user's own (profile page). */
  userId?: number;
  /** Square icon-only button, for dense rows such as the admin user table. */
  iconOnly?: boolean;
  /** Layout classes (size, spacing) for the button. */
  className?: string;
  /** Hand a failure to the host (e.g. the admin toast) instead of showing it beside the button. */
  onError?: (message: string) => void;
}

export const DownloadDataSection: React.FC<DownloadDataSectionProps> = ({ userId, iconOnly = false, className, onError }) => {
  const dict = useDictionary();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const own = userId === undefined;
  const title = own ? dict.user.downloadDataTitle : dict.admin.downloadUserData;
  const description = own ? dict.user.downloadDataDesc : dict.admin.downloadUserDataDesc;
  const failedText = own ? dict.user.downloadDataFailed : dict.admin.downloadUserDataFailed;

  const handleDownload = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await downloadAccountData(userId);
    } catch {
      if (onError) onError(failedText);
      else setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={iconOnly}
        className={className}
        onClick={handleDownload}
        loading={busy}
        leftIcon={<Download className="h-3.5 w-3.5" />}
        aria-label={title}
        {...tip(title, description, 'action')}
      >
        {iconOnly ? null : <span>{own ? dict.user.downloadDataButton : dict.admin.downloadUserData}</span>}
      </Button>
      {failed ? <span role="alert" className="type-strong text-accent-red">{failedText}</span> : null}
    </>
  );
};
