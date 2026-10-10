// frontend/src/components/scraper-config/useImportTab.ts
import React, { useRef, useState } from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { authHeaders, getAuthToken, getErrorMessage } from '@/utils/api';

/** Staging a JSON backup (file picker or drag-and-drop) and importing it in merge or replace mode. */
export function useImportTab(onPurgeSuccess?: () => void) {
  const dict = useDictionary();
  const apiBase = getBackendBaseUrl();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<Record<string, { created: number; updated: number }> | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragCounterRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processSelectedFile = (file: File) => {
    const isJsonExt = file.name.toLowerCase().endsWith('.json');
    const isJsonMime = file.type === 'application/json' || file.type === 'text/json';
    if (!isJsonExt && !isJsonMime) {
      setImportError(dict.admin.invalidJsonFile);
      setImportFile(null);
      setImportJsonText('');
      return;
    }

    setImportFile(file);
    setImportError(null);
    setImportSuccess(null);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error('Invalid JSON structure: expected an object.');
        }
        setImportJsonText(text);
      } catch (jsonErr) {
        setImportError(getErrorMessage(jsonErr, dict.admin.invalidJsonFile));
        setImportFile(null);
        setImportJsonText('');
      }
    };
    reader.onerror = () => {
      setImportError(dict.admin.networkError);
      setImportFile(null);
      setImportJsonText('');
    };
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
    setImportJsonText('');
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
    if (!importFile && !importJsonText) {
      setImportError('Please select a valid JSON file.');
      return;
    }

    if (importMode === 'replace') {
      setShowReplaceConfirm(true);
      return;
    }

    runImport();
  };

  const runImport = async () => {
    setShowReplaceConfirm(false);
    const token = getAuthToken();
    if (!token) {
      setImportError(dict.admin.tokenNotFound);
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);
    setImportSummary(null);

    try {
      let parsedPayload: { data?: unknown };
      try {
        parsedPayload = JSON.parse(importJsonText);
      } catch {
        throw new Error('Unable to parse JSON file.');
      }

      const res = await fetch(`${apiBase}/api/v1/admin/database/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify({
          mode: importMode,
          data: parsedPayload.data || parsedPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Import failed.');
      }

      setImportSuccess(data.message || 'Database imported successfully.');
      setImportSummary(data.summary || null);

      if (onPurgeSuccess) {
        await onPurgeSuccess();
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, dict.admin.networkError);
      setImportError(msg);
    } finally {
      setIsImporting(false);
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
