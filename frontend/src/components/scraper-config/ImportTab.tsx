'use client';
// frontend/src/components/scraper-config/ImportTab.tsx
import React from 'react';
import { FileJson, RotateCcw, ShieldCheck, Upload, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';
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
        role="button"
        tabIndex={0}
        aria-label={dict.admin.clickOrDragBackup}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center group select-none ${
          isDragging
            ? 'border-accent-green bg-accent-green/20 ring-4 ring-accent-green/30 scale-[1.01] shadow-xl'
            : 'border-border-color bg-bg-primary hover:border-accent-green hover:bg-bg-elevated/40'
        }`}
      >
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all mb-2 ${
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
              <p className="type-strong text-text-primary max-w-[280px] sm:max-w-md truncate" {...tip(importFile.name, undefined, 'default')}>
                {importFile.name}
              </p>
              <Button
                icon
                size="xs"
                variant="ghost"
                onClick={handleClearFile}
                className="rounded-full"
                {...tip(dict.admin.removeFile, undefined, 'action')}
                aria-label={dict.admin.removeFile}
              >
                <X className="h-3.5 w-3.5" />
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
          <div
            onClick={() => setImportMode('merge')}
            className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
              importMode === 'merge'
                ? 'border-accent-green/50 bg-accent-green/10 text-accent-green'
                : 'border-border-color bg-bg-primary'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-accent-green mt-0.5 shrink-0" />
            <div>
              <p className="type-strong">{dict.admin.mergeUpdate}</p>
              <p className="type-micro text-text-muted">{dict.admin.mergeUpdateDesc}</p>
            </div>
          </div>

          <div
            onClick={() => setImportMode('replace')}
            className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
              importMode === 'replace'
                ? 'border-accent-amber/50 bg-accent-amber/10 text-accent-amber'
                : 'border-border-color bg-bg-primary'
            }`}
          >
            <RotateCcw className="h-4 w-4 text-accent-amber mt-0.5 shrink-0" />
            <div>
              <p className="type-strong">{dict.admin.wipeReplace}</p>
              <p className="type-micro text-text-muted">{dict.admin.wipeReplaceDesc}</p>
            </div>
          </div>
        </div>
      </div>

      {importSummary && (
        <div className="rounded-xl border border-border-color bg-bg-primary p-3 max-h-36 overflow-y-auto space-y-1.5">
          <span className="type-label-xs text-text-muted">
            {dict.admin.importResultsBreakdown}
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
            {Object.entries(importSummary).map(([key, counts]) => (
              <div key={key} className="rounded-lg bg-bg-surface p-1.5 border border-border-color">
                <p className="type-strong-2xs text-text-muted capitalize">{key}</p>
                <p className="type-strong text-accent-green">
                  {dict.admin.createdCountPrefix}
                  {counts.created}{' '}
                  <span className="text-text-muted font-normal">
                    ({counts.updated} {dict.admin.updatedCountSuffix})
                  </span>
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
          leftIcon={<Upload className="h-3.5 w-3.5" />}
        >
          <span>
            {isImporting ? dict.admin.importingStatus : dict.admin.executeImport}
          </span>
        </Button>
      </div>
    </div>
  );
}
