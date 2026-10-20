'use client';
// frontend/src/components/ScraperConfigModal.tsx

import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { ReauthFields, useReauthReady } from '@/components/admin/ReauthFields';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import { ExportTab } from './scraper-config/ExportTab';
import { ImportTab } from './scraper-config/ImportTab';
import { PurgeTab } from './scraper-config/PurgeTab';
import { ScraperConfigTabs } from './scraper-config/ScraperConfigTabs';
import type { ScraperTab } from './scraper-config/scraperTargets';
import { useExportTab } from './scraper-config/useExportTab';
import { useImportTab } from './scraper-config/useImportTab';
import { usePurgeTab } from './scraper-config/usePurgeTab';

interface ScraperConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurgeSuccess?: () => void;
  initialTab?: ScraperTab;
}

export function ScraperConfigModal({ isOpen, onClose, onPurgeSuccess, initialTab = 'export' }: ScraperConfigModalProps) {
  const dict = useDictionary();
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<ScraperTab>(initialTab);
  // Every tab's state lives here, not in the tab components: switching tabs unmounts them.
  const exportTab = useExportTab();
  const importTab = useImportTab(onPurgeSuccess);
  const purgeTab = usePurgeTab(onPurgeSuccess);
  const importReady = useReauthReady(importTab.reauth);
  const purgeReady = useReauthReady(purgeTab.reauth);

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        variant="dialog"
        size="2xl"
        busy={exportTab.isExporting || importTab.isImporting || purgeTab.isPurging}
        title={dict.admin.dbBackupSnapshots}
        closeButtonAriaLabel={dict.admin.closeDbModal}
        padded
      >
        <div
          className="space-y-5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
        >
          <ScraperConfigTabs activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === 'export' && <ExportTab tab={exportTab} />}
          {activeTab === 'import' && <ImportTab tab={importTab} />}
          {activeTab === 'purge' && <PurgeTab tab={purgeTab} onClose={onClose} />}
        </div>
      </Modal>

      <ConfirmModal
        open={importTab.showReplaceConfirm}
        title={importTab.importMode === 'replace' ? dict.admin.wipeReplace : dict.admin.mergeUpdate}
        message={
          <div className="space-y-3">
            {importTab.importMode === 'replace' && <p>{dict.admin.wipeReplaceConfirm}</p>}
            <ReauthFields value={importTab.reauth} onChange={importTab.setReauth} hint={dict.admin.reauthDatabaseHint} disabled={importTab.isImporting} />
          </div>
        }
        confirmLabel={importTab.importMode === 'replace' ? dict.admin.wipeReplace : dict.admin.executeImport}
        cancelLabel={dict.admin.cancel}
        busy={importTab.isImporting}
        confirmDisabled={!importReady}
        onConfirm={importTab.runImport}
        onCancel={() => importTab.setShowReplaceConfirm(false)}
      />

      <ConfirmModal
        open={purgeTab.showPurgeConfirm}
        title={dict.admin.purgeReset}
        message={
          <div className="space-y-3">
            <p>{formatMessage(dict.admin.purgeConfirm, { count: purgeTab.purgeTargets.length }, locale)}</p>
            <ReauthFields value={purgeTab.reauth} onChange={purgeTab.setReauth} hint={dict.admin.reauthDatabaseHint} disabled={purgeTab.isPurging} />
          </div>
        }
        confirmLabel={dict.admin.purgeReset}
        cancelLabel={dict.admin.cancel}
        busy={purgeTab.isPurging}
        confirmDisabled={!purgeReady}
        onConfirm={purgeTab.runPurge}
        onCancel={() => purgeTab.setShowPurgeConfirm(false)}
      />
    </>
  );
}
