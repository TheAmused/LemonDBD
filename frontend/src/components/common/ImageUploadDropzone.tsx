'use client';
// frontend/src/components/common/ImageUploadDropzone.tsx

import React, { useRef, useState } from 'react';
import { Check, ImagePlus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { cn } from '@/utils/cn';
import { useDictionary } from '@/context/DictionaryContext';
import { Img } from '@/components/common/Img';
import { useOnValueChange } from '@/hooks/useOnValueChange';
import { formatMessage } from '@/utils/i18nFormat';
import { IMAGE_SIZE_PRESETS, MAX_DATA_IMAGE_CHARS, resizeImageToDataUrl } from '@/utils/imageResize';

/**
 * Reads local image file, resizes raster images (png, jpeg, webp) to max 800px width/height
 * (with `[800, 600, 400]` banner fallback tiers) so base64 data URL fits within 131,072 characters
 * (`MAX_DATA_IMAGE_CHARS`), or preserves gif if under cap. Returns data URL.
 */
export async function processImageFile(
  file: File,
  maxDimension: number = IMAGE_SIZE_PRESETS.banner[0],
  maxChars: number = MAX_DATA_IMAGE_CHARS,
): Promise<string | null> {
  const sizes =
    maxDimension === IMAGE_SIZE_PRESETS.banner[0]
      ? IMAGE_SIZE_PRESETS.banner
      : [maxDimension, ...IMAGE_SIZE_PRESETS.banner.filter((size) => size < maxDimension)];
  return resizeImageToDataUrl(file, sizes, maxChars);
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState<string>(value || '');

  useOnValueChange(value, (next) => {
    setUrlInput(next || '');
    setUploadError(null);
  });

  const commitUrl = () => {
    const trimmed = urlInput.trim();
    if (trimmed && trimmed !== (value || '').trim()) {
      setUploadError(null);
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
    setUploadError(null);
    try {
      const dataUrl = await processImageFile(file);
      if (dataUrl) {
        onChange(dataUrl);
      } else {
        setUploadError(formatMessage(dict.tierLists.creator.uploadSkipped, { count: 1 }));
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
          className={cn(
            'relative group overflow-hidden rounded-card border border-border-color bg-bg-elevated w-full mx-auto shadow-xs',
            aspectRatio === 'square' ? 'aspect-square max-w-xs' : 'aspect-video max-w-md 2xl:max-w-lg',
            invalid && 'border-accent-red'
          )}
        >
          <Img
            src={value}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          {/* The preview opens the editor; the remove button sits above this layer. */}
          {onPreviewClick && (
            <button
              type="button"
              onClick={onPreviewClick}
              aria-label={dict.tierLists.editDetails}
              className="absolute inset-0 cursor-pointer rounded-card focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent-red"
            />
          )}
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
              onClick={() => onChange('')}
              aria-label={resolvedRemoveLabel}
            >
              <Trash2 />
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
            <ImagePlus className="icon-lg" aria-hidden="true" />
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
                <Upload className="icon-md" />
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
              <Check />
            </Button>
          </div>
        </div>
      )}

      {invalid && invalidMessage ? (
        <p role="alert" className="mt-1 type-caption font-medium text-accent-red">
          {invalidMessage}
        </p>
      ) : uploadError ? (
        <p role="alert" className="mt-1 type-caption font-medium text-accent-red">
          {uploadError}
        </p>
      ) : hint ? (
        <p className="mt-1 type-caption text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
