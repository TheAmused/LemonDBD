'use client';
// frontend/src/components/scraper-config/ImportTab.tsx
import React from 'react';
import { FileJson, RotateCcw, ShieldCheck, Upload, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import { StatusBanner } from './StatusBanner';
import type { useImportTab } from './useImportTab';

export function ImportTab({ tab }: { tab: ReturnType<typeof useImportTab> }) {
  const dict = useDictionary();
  const {
    importFile,
    importMode,
    setImportMode,
    isImporting,
    importError,
    importSuccess,
    importSummary,
    isDragging,
    fileInputRef,
    handleFileChange,
    handleClearFile,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleExecuteImport,
  } = tab;

  return (
    <div className="space-y-4">
      {importError && <StatusBanner tone="error" message={importError} />}
      {importSuccess && <StatusBanner tone="success" message={importSuccess} />}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json,application/json"
        className="hidden"
      />

      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-6 rounded-card border-2 border-dashed transition-all cursor-pointer text-center group select-none ${
          isDragging
            ? 'border-accent-green bg-accent-green/20 ring-4 ring-accent-green/30 scale-[1.01] shadow-xl'
            : 'border-border-color bg-bg-primary hover:border-accent-green hover:bg-bg-elevated/40'
        }`}
      >
        {/* Clicking anywhere in the drop zone picks a file: an overlay button, so the "remove file"
            button inside the zone stays its own control (it sits above the overlay). */}
        <button
          type="button"
          aria-label={dict.admin.clickOrDragBackup}
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 cursor-pointer rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green"
        />
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-card transition-all mb-2 ${
            isDragging
              ? 'bg-accent-green/25 text-accent-green scale-125 ring-2 ring-accent-green/40 animate-pulse'
              : 'bg-accent-green/10 text-accent-green group-hover:scale-110'
          }`}
        >
          <FileJson className="h-7 w-7" />
        </div>

        {isDragging ? (
          <div>
            <p className="type-card-title text-accent-green animate-bounce">
              {dict.admin.dropFilePrompt}
            </p>
          </div>
        ) : importFile ? (
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <p className="type-strong text-text-primary max-w-70 sm:max-w-md truncate" {...tip(importFile.name, undefined, 'default')}>
                {importFile.name}
              </p>
              <Button
                icon
                size="xs"
                variant="ghost"
                onClick={handleClearFile}
                pill
                className="relative z-10"
                {...tip(dict.admin.removeFile, undefined, 'action')}
                aria-label={dict.admin.removeFile}
              >
                <X />
              </Button>
            </div>
            <p className="type-strong-xs text-accent-green">
              {(importFile.size / 1024).toFixed(1)} {dict.admin.kbReadySuffix}
            </p>
            <p className="type-micro text-text-muted hover:text-text-secondary transition-colors">
              {dict.admin.changeFile}
            </p>
          </div>
        ) : (
          <div>
            <p className="type-strong text-text-secondary">
              {dict.admin.clickOrDragBackupPrefix}{' '}
              <span className="text-accent-green font-black">.json</span>{' '}
              {dict.admin.clickOrDragBackupSuffix}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <span className="type-label-xs text-text-secondary">
          {dict.admin.chooseImportStrategy}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label
            className={`flex items-start gap-2.5 p-3 rounded-card border cursor-pointer transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-red ${
              importMode === 'merge'
                ? 'border-accent-green/50 bg-accent-green/10 text-accent-green'
                : 'border-border-color bg-bg-primary'
            }`}
          >
            <input
              type="radio"
              name="import-mode"
              value="merge"
              checked={importMode === 'merge'}
              onChange={() => setImportMode('merge')}
              className="sr-only"
            />
            <ShieldCheck className="icon-md text-accent-green mt-0.5 shrink-0" />
            <span>
              <span className="block type-strong">{dict.admin.mergeUpdate}</span>
              <span className="block type-micro text-text-muted">{dict.admin.mergeUpdateDesc}</span>
            </span>
          </label>

          <label
            className={`flex items-start gap-2.5 p-3 rounded-card border cursor-pointer transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-red ${
              importMode === 'replace'
                ? 'border-accent-amber/50 bg-accent-amber/10 text-accent-amber'
                : 'border-border-color bg-bg-primary'
            }`}
          >
            <input
              type="radio"
              name="import-mode"
              value="replace"
              checked={importMode === 'replace'}
              onChange={() => setImportMode('replace')}
              className="sr-only"
            />
            <RotateCcw className="icon-md text-accent-amber mt-0.5 shrink-0" />
            <span>
              <span className="block type-strong">{dict.admin.wipeReplace}</span>
              <span className="block type-micro text-text-muted">{dict.admin.wipeReplaceDesc}</span>
            </span>
          </label>
        </div>
      </div>

      {importSummary && (
        <div className="rounded-card border border-border-color bg-bg-primary p-3 max-h-36 overflow-y-auto space-y-1.5">
          <span className="type-label-xs text-text-muted">
            {dict.admin.importResultsBreakdown}
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
            {Object.entries(importSummary).map(([key, counts]) => (
              <div key={key} className="rounded-chip bg-bg-surface p-1.5 border border-border-color">
                <p className="type-strong-2xs text-text-muted capitalize">{key}</p>
                <p className="type-strong text-accent-green">
                  {dict.admin.createdCountPrefix}
                  {counts.created}{' '}
                  <span className="text-text-muted font-normal">
                    ({counts.updated} {dict.admin.updatedCountSuffix}
                  </span>
                  {counts.skipped ? (
                    <span className="block type-micro text-accent-amber">{formatMessage(dict.admin.skippedCount, { count: counts.skipped })}</span>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end pt-3">
        <Button
          variant="success"
          size="sm"
          onClick={handleExecuteImport}
          loading={isImporting}
          disabled={!importFile}
          leftIcon={<Upload className="icon-sm" />}
        >
          <span>
            {isImporting ? dict.admin.importingStatus : dict.admin.executeImport}
          </span>
        </Button>
      </div>
    </div>
  );
}
