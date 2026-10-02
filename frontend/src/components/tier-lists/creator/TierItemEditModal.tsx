'use client';
// frontend/src/components/tier-lists/creator/TierItemEditModal.tsx

import React, { useEffect, useState } from 'react';
import { Check, Image as ImageIcon, ImageOff, Pencil } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import type { TierListDocumentItem } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { sanitizeImageUrl } from '@/utils/tierLists/codec';
import { TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import { TierItemTile } from '../TierItemTile';
import { LABEL, TOUCH_BTN, TOUCH_FIELD } from '../styles';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';

interface TierItemEditModalProps {
  item: TierListDocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, patch: { name: string; image?: string }) => void;
  dict: Dictionary;
}

/** Modal to edit both the item's name and image URL / avatar with live preview and validation. */
export function TierItemEditModal({ item, isOpen, onClose, onSave, dict }: TierItemEditModalProps) {
  const t = dict.tierLists;
  const c = t.creator;

  const [name, setName] = useState<string>(item?.name ?? '');
  const [imageUrl, setImageUrl] = useState<string>(item?.image ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setImageUrl(item.image ?? '');
      setError(null);
    }
  }, [item?.id, item?.name, item?.image]);

  if (!isOpen || !item) return null;

  const trimmedName = name.trim();
  const trimmedUrl = imageUrl.trim();
  const safeImage = trimmedUrl ? sanitizeImageUrl(trimmedUrl) : null;
  const urlInvalid = Boolean(trimmedUrl) && !safeImage;
  const nameInvalid = !trimmedName;

  const handleSave = () => {
    if (nameInvalid) {
      setError(t.itemNameRequired);
      return;
    }
    if (urlInvalid) {
      setError(t.invalidImage);
      return;
    }
    onSave(item.id, {
      name: trimmedName,
      ...(safeImage ? { image: safeImage } : {}),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={c.editItem}
      icon={<Pencil className="h-5 w-5" aria-hidden="true" />}
      bodyClassName="p-4 sm:p-6"
      footer={
        <div className="flex w-full items-center justify-center gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className={cn(TOUCH_BTN, 'min-h-[42px] px-5')}>
            {t.cancel}
          </Button>
          <Button
            variant="primary"
            disabled={nameInvalid || urlInvalid}
            onClick={handleSave}
            leftIcon={<Check className="h-4 w-4" aria-hidden="true" />}
            className={cn(TOUCH_BTN, 'min-h-[42px] px-6')}
          >
            {t.save}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="flex flex-col gap-4"
      >
        {/* Centered Live Preview Showcase */}
        <div className="flex flex-col items-center justify-center p-5 rounded-xl border border-border-color bg-bg-primary/40 text-center">
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-xl border-2 border-border-color bg-bg-elevated shadow-md flex items-center justify-center transition-all">
            {safeImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={safeImage}
                alt={trimmedName || item.name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl sm:text-3xl font-black text-text-muted select-none">
                {(trimmedName || item.name || '?').slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <h3 className="mt-3 max-w-xs truncate text-base sm:text-lg font-black text-text-primary">
            {trimmedName || item.name || '?'}
          </h3>
          <span className="type-label-2xs text-text-muted">
            {c.previewHeading}
          </span>

          {safeImage && (
            <Button
              variant="soft"
              size="sm"
              onClick={() => {
                setImageUrl('');
                if (error === t.invalidImage) setError(null);
              }}
              leftIcon={<ImageOff className="h-3.5 w-3.5" aria-hidden="true" />}
              className="mt-2.5 min-h-[32px]"
            >
              {c.removeImage}
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>{t.itemName}</span>
            <Input
              type="text"
              value={name}
              maxLength={TIER_LIST_LIMITS.maxItemName}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t.itemName}
              invalid={nameInvalid}
              className={TOUCH_FIELD}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>{t.itemImage}</span>
            <Input
              type="url"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t.itemImagePlaceholder}
              inputMode="url"
              invalid={urlInvalid}
              className={TOUCH_FIELD}
            />
            <span
              className={cn(
                'text-xs',
                urlInvalid ? 'font-semibold text-accent-red' : 'text-text-muted'
              )}
            >
              {urlInvalid ? t.invalidImage : t.itemImageHint}
            </span>
          </label>

          {error && (
            <p role="alert" className="type-strong text-accent-red">
              {error}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
