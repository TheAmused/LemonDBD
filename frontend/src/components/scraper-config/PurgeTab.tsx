'use client';
// frontend/src/components/scraper-config/PurgeTab.tsx
import React from 'react';
import { Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import { StatusBanner } from './StatusBanner';
import { TargetPicker } from './TargetPicker';
import type { usePurgeTab } from './usePurgeTab';

interface PurgeTabProps {
  tab: ReturnType<typeof usePurgeTab>;
  onClose: () => void;
}

export function PurgeTab({ tab, onClose }: PurgeTabProps) {
  const dict = useDictionary();
  const {
    purgeTargets,
    isPurging,
    purgeError,
    purgeSuccess,
    togglePurgeTarget,
    toggleAllPurge,
    toggleGroupPurge,
    handleExecutePurge,
  } = tab;

  return (
    <div className="space-y-4">
      {purgeError && <StatusBanner tone="error" message={purgeError} />}
      {purgeSuccess && <StatusBanner tone="success" message={purgeSuccess} />}

      <TargetPicker
        heading={dict.admin.selectTablesToWipe}
        selected={purgeTargets}
        SelectedIcon={Square}
        UnselectedIcon={Square}
        onToggleAll={toggleAllPurge}
        onToggleGroup={toggleGroupPurge}
        onToggleTarget={togglePurgeTarget}
      />

      <div className="flex items-center justify-between pt-3 border-t border-border-color">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={isPurging}>
          {dict.admin.close}
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handleExecutePurge}
          loading={isPurging}
          disabled={purgeTargets.length === 0}
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
        >
          <span>
            {isPurging
              ? dict.admin.purgingStatus
              : formatMessage((dict.admin.purgeSelected), { count: purgeTargets.length })}
          </span>
        </Button>
      </div>
    </div>
  );
}
