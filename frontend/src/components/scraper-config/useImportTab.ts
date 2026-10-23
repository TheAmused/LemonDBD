'use client';
// frontend/src/components/scraper-config/useImportTab.ts
import React, { useRef, useState } from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { authFetch, getErrorMessage } from '@/utils/api';
import { EMPTY_REAUTH, reauthBody } from '@/components/admin/ReauthFields';
import type { Reauth } from '@/types/admin';
import { backupErrorMessage } from './backupErrors';

/** Staging a JSON backup (file picker or drag-and-drop) and importing it in merge or replace mode. */
export function useImportTab(onPurgeSuccess?: () => void | Promise<void>) {
  const dict = useDictionary();
  const apiBase = getBackendBaseUrl();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<Record<string, { created: number; updated: number; skipped?: number }> | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState<boolean>(false);
  const [reauth, setReauth] = useState<Reauth>(EMPTY_REAUTH);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragCounterRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const rejectFile = (message: string) => {
    setImportError(message);
    setImportFile(null);
  };

  const processSelectedFile = (file: File) => {
    const isJsonExt = file.name.toLowerCase().endsWith('.json');
    const isJsonMime = file.type === 'application/json' || file.type === 'text/json';
    if (!isJsonExt && !isJsonMime) {
      rejectFile(dict.admin.invalidJsonFile);
      return;
    }

    setImportFile(file);
    setImportError(null);
    setImportSuccess(null);
    setImportSummary(null);

    // Checked here so a broken file is caught before the upload; the file itself is what gets sent.
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result;
        if (typeof raw !== 'string') throw new Error(dict.admin.invalidJsonFile);
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error(dict.admin.invalidJsonFile);
        }
      } catch (jsonErr) {
        rejectFile(getErrorMessage(jsonErr, dict.admin.invalidJsonFile));
      }
    };
    reader.onerror = () => rejectFile(dict.admin.networkError);
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
    e.target.value = '';
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImportFile(null);
    setImportError(null);
    setImportSuccess(null);
    setImportSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleExecuteImport = () => {
    if (!importFile) {
      setImportError(dict.admin.invalidJsonFile);
      return;
    }
    // Every import is confirmed: it can rewrite accounts, so the server asks for the admin's password.
    setReauth(EMPTY_REAUTH);
    setShowReplaceConfirm(true);
  };

  const runImport = async () => {
    if (!importFile) return;
    setShowReplaceConfirm(false);
    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);
    setImportSummary(null);

    try {
      // The file goes up as it is (multipart): a backup with its images is far too big to read into
      // a string and serialise a second time.
      const form = new FormData();
      form.append('file', importFile, importFile.name);
      form.append('mode', importMode);
      for (const [key, value] of Object.entries(reauthBody(reauth))) form.append(key, value);

      const res = await authFetch(`${apiBase}/api/v1/admin/database/import`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(await backupErrorMessage(res, dict.admin.importFailed, dict));
      const data = (await res.json()) as { summary?: Record<string, { created: number; updated: number; skipped?: number }> };

      setImportSuccess(dict.admin.importDone);
      setImportSummary(data.summary || null);

      if (onPurgeSuccess) {
        await onPurgeSuccess();
      }
    } catch (err: unknown) {
      setImportError(getErrorMessage(err, dict.admin.networkError));
    } finally {
      setIsImporting(false);
      setReauth(EMPTY_REAUTH);
    }
  };

  return {
    importFile,
    importMode,
    setImportMode,
    isImporting,
    importError,
    importSuccess,
    importSummary,
    showReplaceConfirm,
    setShowReplaceConfirm,
    reauth,
    setReauth,
    isDragging,
    fileInputRef,
    handleFileChange,
    handleClearFile,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleExecuteImport,
    runImport,
  };
}
