'use client';
// frontend/src/components/ScraperConfigModal.tsx

import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
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
        title={dict.admin.wipeReplace}
        message={dict.admin.wipeReplaceConfirm}
        confirmLabel={dict.admin.wipeReplace}
        cancelLabel={dict.admin.cancel}
        busy={importTab.isImporting}
        onConfirm={importTab.runImport}
        onCancel={() => importTab.setShowReplaceConfirm(false)}
      />

      <ConfirmModal
        open={purgeTab.showPurgeConfirm}
        title={dict.admin.purgeReset}
        message={formatMessage(dict.admin.purgeConfirm, { count: purgeTab.purgeTargets.length }, locale)}
        confirmLabel={dict.admin.purgeReset}
        cancelLabel={dict.admin.cancel}
        busy={purgeTab.isPurging}
        onConfirm={purgeTab.runPurge}
        onCancel={() => purgeTab.setShowPurgeConfirm(false)}
      />
    </>
  );
}
