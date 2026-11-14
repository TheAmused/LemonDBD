'use client';
// frontend/src/components/scraper-config/PurgeTab.tsx
import React from 'react';
import { Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import { StatusBanner } from './StatusBanner';
import { TargetPicker } from './TargetPicker';
import { PURGEABLE_TARGET_IDS } from './scraperTargets';
import type { usePurgeTab } from './usePurgeTab';

export function PurgeTab({ tab }: { tab: ReturnType<typeof usePurgeTab> }) {
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
        available={PURGEABLE_TARGET_IDS}
      />

      <div className="flex items-center justify-end pt-3">
        <Button
          variant="primary"
          size="sm"
          onClick={handleExecutePurge}
          loading={isPurging}
          disabled={purgeTargets.length === 0}
          leftIcon={<Trash2 className="icon-sm" />}
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
