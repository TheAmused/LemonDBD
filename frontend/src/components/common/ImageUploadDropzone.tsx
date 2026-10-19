'use client';
// frontend/src/components/common/ImageUploadDropzone.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { cn } from '@/utils/cn';
import { useDictionary } from '@/context/DictionaryContext';
import { TIER_LIST_LIMITS } from '@/utils/tierLists/constants';

/** Reads a file's raw bytes back out as a `data:...;base64,...` URL. */
async function fileToDataUrl(file: File): Promise<string | null> {
  try {
    if (typeof file.arrayBuffer === 'function') {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (typeof Buffer !== 'undefined') {
        return `data:${file.type};base64,${Buffer.from(bytes).toString('base64')}`;
      }
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return `data:${file.type};base64,${btoa(binary)}`;
    }
  } catch {
    // fallback to FileReader
  }
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }
  return null;
}

/**
 * Reads local image file, resizes raster images (png, jpeg, webp) to max 1200px width/height
 * and quality 0.85 webp/png so base64 data URL fits within 131,072 characters
 * (TIER_LIST_LIMITS.maxDataImageChars), or preserves gif if under cap. Returns data URL.
 */
export async function processImageFile(
  file: File,
  maxDimension: number = 1200,
  maxChars: number = TIER_LIST_LIMITS.maxDataImageChars
): Promise<string | null> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return null;
  }

  if (file.type === 'image/gif') {
    const url = await fileToDataUrl(file);
    return url && url.length <= maxChars ? url : null;
  }

  if (typeof createImageBitmap === 'undefined' || typeof document === 'undefined') {
    const url = await fileToDataUrl(file);
    return url && url.length <= maxChars ? url : null;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  try {
    const targetSizes = [maxDimension, 900, 600, 400];
    for (const size of targetSizes) {
      const maxSide = Math.max(bitmap.width, bitmap.height);
      const scale = Math.min(1, size / maxSide);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, width, height);

      let url = canvas.toDataURL('image/webp', 0.85);
      if (!url.startsWith('data:image/webp')) {
        url = canvas.toDataURL('image/png');
      }
      if (url.length <= maxChars) return url;
    }
    return null;
  } finally {
    if (typeof bitmap.close === 'function') {
      bitmap.close();
    }
  }
}

export interface ImageUploadDropzoneProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
  placeholder?: string;
  browseLabel?: string;
  invalid?: boolean;
  invalidMessage?: string;
  aspectRatio?: 'banner' | 'square';
  className?: string;
  disabled?: boolean;
  allowFileUpload?: boolean;
  actions?: React.ReactNode;
  emptyActions?: React.ReactNode;
  previewActions?: React.ReactNode;
  removeAriaLabel?: string;
  onPreviewClick?: () => void;
  previewOverlay?: React.ReactNode;
}

export function ImageUploadDropzone({
  value,
  onChange,
  label,
  hint,
  placeholder,
  browseLabel,
  invalid = false,
  invalidMessage,
  aspectRatio = 'banner',
  className,
  disabled = false,
  allowFileUpload = true,
  actions,
  emptyActions,
  previewActions,
  removeAriaLabel,
  onPreviewClick,
  previewOverlay,
}: ImageUploadDropzoneProps) {
  const dict = useDictionary();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>(value || '');

  useEffect(() => {
    setUrlInput(value || '');
  }, [value]);

  const commitUrl = () => {
    const trimmed = urlInput.trim();
    if (trimmed && trimmed !== (value || '').trim()) {
      onChange(trimmed);
    }
  };

  const resolvedRemoveLabel = removeAriaLabel || dict.tierLists.creator.removeImage;
  const resolvedBrowseLabel = browseLabel || dict.tierLists.creator.chooseFiles;
  const urlPlaceholder = placeholder || dict.tierLists.creator.backgroundImagePlaceholder;

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || disabled) return;
    const file = fileList[0];
    setProcessing(true);
    try {
      const dataUrl = await processImageFile(file);
      if (dataUrl) {
        onChange(dataUrl);
      }
    } finally {
      setProcessing(false);
    }
  };

  const hasValue = Boolean(value && value.trim());

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {label && (
        <span className="block type-label-sm text-text-secondary">
          {label}
        </span>
      )}

      {hasValue ? (
        <div
          onClick={onPreviewClick}
          onKeyDown={(e) => {
            if (onPreviewClick && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onPreviewClick();
            }
          }}
          tabIndex={onPreviewClick ? 0 : undefined}
          role={onPreviewClick ? 'button' : undefined}
          aria-label={onPreviewClick ? dict.tierLists.editDetails : undefined}
          className={cn(
            'relative group overflow-hidden rounded-card border border-border-color bg-bg-elevated w-full mx-auto shadow-xs',
            onPreviewClick && 'cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent-red',
            aspectRatio === 'square' ? 'aspect-square max-w-xs' : 'aspect-video max-w-md 2xl:max-w-lg',
            invalid && 'border-accent-red'
          )}
        >
          <img
            src={value}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          {previewOverlay}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
            {previewActions || actions}
            <Button
              type="button"
              variant="overlay"
              size="xs"
              icon
              pill
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              aria-label={resolvedRemoveLabel}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && allowFileUpload) setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (allowFileUpload) void handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed p-4 sm:p-6 text-center transition-colors',
            isDragging && allowFileUpload ? 'border-accent-red bg-accent-red/5' : 'border-border-color bg-bg-primary/20',
            invalid && 'border-accent-red',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-chip border border-border-color bg-bg-surface text-text-muted">
            <ImagePlus className="h-5 w-5" aria-hidden="true" />
          </span>

          {allowFileUpload ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={disabled || processing}
                loading={processing}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                <span>{resolvedBrowseLabel}</span>
              </Button>
              {emptyActions || actions}
            </div>
          ) : (emptyActions || actions) ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {emptyActions || actions}
            </div>
          ) : null}

          {allowFileUpload && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              disabled={disabled}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
          )}

          <div className="flex w-full max-w-sm items-center gap-1.5 mt-1">
            <Input
              fieldSize="sm"
              type="url"
              inputMode="url"
              disabled={disabled}
              invalid={invalid}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitUrl();
                }
              }}
              onBlur={commitUrl}
              placeholder={urlPlaceholder}
            />
            <Button
              type="button"
              variant="secondary"
              size="xs"
              disabled={disabled || !urlInput.trim()}
              onClick={commitUrl}
              className="shrink-0"
              aria-label={dict.tierLists.save}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {invalid && invalidMessage ? (
        <p role="alert" className="mt-1 type-caption font-medium text-accent-red">
          {invalidMessage}
        </p>
      ) : hint ? (
        <p className="mt-1 type-caption text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
