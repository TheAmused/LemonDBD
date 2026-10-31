'use client';
// frontend/src/components/sidebar/BugReportScreenshots.tsx
//
// The screenshot part of the bug report form: the pictures already attached on top, then a
// full-width drop area. The count and the size limit come from the admin settings (site config).

import React, { useRef, useState } from 'react';
import { ImageIcon, TrashIcon, UploadIcon } from '@/components/icons/DbdIcons';
import { Alert } from '@/components/common/Alert';
import { Button } from '@/components/common/Button';
import { IconLabel } from '@/components/common/IconLabel';
import { Img } from '@/components/common/Img';
import { Surface } from '@/components/common/Surface';
import { useDictionary } from '@/context/DictionaryContext';
import { fileToDataUrl } from '@/utils/tierLists/imageFiles';
import { formatMessage } from '@/utils/i18nFormat';
import { cn } from '@/utils/cn';

const BYTES_PER_MB = 1024 * 1024;

export interface BugReportScreenshotsProps {
  /** The attached screenshots as data URLs. */
  images: readonly string[];
  maxImages: number;
  maxBytes: number;
  /** Receives the newly read screenshots; the owner appends them (and enforces the cap). */
  onAdd: (urls: string[]) => void;
  onRemove: (index: number) => void;
  /** At least one screenshot is needed (admin setting); marks the label like a required field. */
  required?: boolean;
  disabled?: boolean;
}

export const BugReportScreenshots: React.FC<BugReportScreenshotsProps> = ({
  images,
  maxImages,
  maxBytes,
  onAdd,
  onRemove,
  required = false,
  disabled = false,
}) => {
  const t = useDictionary().sidebar;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);

  const mb = Math.max(1, Math.round(maxBytes / BYTES_PER_MB));
  const isFull = images.length >= maxImages;

  const addFiles = async (list: FileList | null) => {
    if (!list || list.length === 0 || disabled) return;
    const room = maxImages - images.length;
    const accepted: File[] = [];
    let problem: string | null = null;
    for (const file of Array.from(list)) {
      if (!file.type.startsWith('image/')) problem ??= t.bugNotImage;
      else if (file.size > maxBytes) problem ??= formatMessage(t.bugImageSizeLimit, { mb });
      else if (accepted.length >= room) problem ??= formatMessage(t.bugMaxScreenshots, { count: maxImages });
      else accepted.push(file);
    }
    setNotice(problem);
    const urls = (await Promise.all(accepted.map(fileToDataUrl))).filter((url): url is string => url !== null);
    if (urls.length > 0) onAdd(urls);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <IconLabel as="label" icon={ImageIcon} variant="heading">{t.bugScreenshotsLabel || ''}{required && <span className="text-accent-red"> *</span>}</IconLabel>
        <span className="type-micro text-text-muted">
          {images.length}/{maxImages}
        </span>
      </div>

      {images.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {images.map((imgSrc, idx) => (
            <Surface
              as="li"
              key={idx}
              tone="elevated"
              padding="none"
              className="group relative h-20 w-20 overflow-hidden shadow-sm"
            >
              <Img src={imgSrc} alt={`${t.bugScreenshotAlt} #${idx + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(idx)}
                aria-label={`${t.bugRemoveScreenshot} ${idx + 1}`}
                className="absolute inset-0 flex items-center justify-center bg-accent-red/80 text-text-inverted opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
              >
                <TrashIcon className="icon-md" aria-hidden="true" />
              </button>
            </Surface>
          ))}
        </ul>
      )}

      {!isFull && (
        <Button
          type="button"
          variant="secondary"
          dashed
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            void addFiles(e.dataTransfer.files);
          }}
          className={cn(
            'h-auto w-full flex-col gap-1.5 py-6 text-center',
            isDragging && 'border-accent-red bg-accent-red/5'
          )}
        >
          <UploadIcon className="icon-lg" aria-hidden="true" />
          <span className="type-strong-screen">{(isDragging ? t.bugDropRelease : t.bugDropImages) || ''}</span>
          <span className="type-caption-screen text-text-muted">
            {formatMessage(t.bugImageLimits, { count: maxImages, mb })}
          </span>
        </Button>
      )}

      {notice && <Alert>{notice}</Alert>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
        aria-label={t.bugUploadImage || ''}
      />
    </div>
  );
};
