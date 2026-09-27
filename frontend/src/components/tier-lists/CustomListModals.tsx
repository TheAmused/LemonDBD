'use client';
// frontend/src/components/tier-lists/CustomListModals.tsx

import React, { useEffect, useState } from 'react';
import { Check, ImagePlus, Pencil } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import type { Dictionary } from '@/locales/types';
import { sanitizeImageUrl } from '@/utils/tierLists/codec';
import { TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD, LABEL } from './styles';

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (item: { name: string; image?: string }) => void;
  dict: Dictionary;
}

/** Adds one item to a custom list: a name and an optional (validated) image URL. */
export function AddItemModal({ open, onClose, onAdd, dict }: AddItemModalProps) {
  const t = dict.tierLists;
  const [name, setName] = useState<string>('');
  const [image, setImage] = useState<string>('');
  const [touched, setTouched] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setName('');
      setImage('');
      setTouched(false);
    }
  }, [open]);

  const trimmedName = name.trim();
  const trimmedImage = image.trim();
  const safeImage = trimmedImage ? sanitizeImageUrl(trimmedImage) : null;
  const imageInvalid = Boolean(trimmedImage) && !safeImage;
  const canSubmit = Boolean(trimmedName) && !imageInvalid;

  const submit = () => {
    setTouched(true);
    if (!canSubmit) return;
    onAdd(safeImage ? { name: trimmedName, image: safeImage } : { name: trimmedName });
    onClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="md"
      title={t.addItemTitle}
      icon={<ImagePlus className="h-5 w-5" aria-hidden="true" />}
      bodyClassName="p-4 sm:p-6 font-sans"
      footer={
        <div className="flex w-full justify-end gap-2">
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            {t.cancel}
          </button>
          <button type="button" onClick={submit} disabled={touched && !canSubmit} className={BTN_PRIMARY}>
            <Check className="h-4 w-4" aria-hidden="true" />
            {t.addItem}
          </button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <label>
          <span className={LABEL}>{t.itemName}</span>
          <input
            value={name}
            maxLength={TIER_LIST_LIMITS.maxItemName}
            onChange={(e) => setName(e.target.value)}
            className={FIELD}
            autoFocus
            aria-invalid={touched && !trimmedName}
          />
          {touched && !trimmedName && (
            <span role="alert" className="mt-1 block text-xs font-semibold text-accent-red">
              {t.itemNameRequired}
            </span>
          )}
        </label>
        <label>
          <span className={LABEL}>{t.itemImage}</span>
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder={t.itemImagePlaceholder}
            inputMode="url"
            className={FIELD}
            aria-invalid={imageInvalid}
          />
          <span className={imageInvalid ? 'mt-1 block text-xs font-semibold text-accent-red' : 'mt-1 block text-xs text-text-muted'}>
            {imageInvalid ? t.invalidImage : t.itemImageHint}
          </span>
        </label>
        {safeImage && (
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border-color bg-bg-elevated">
            {/* eslint-disable-next-line @next/next/no-img-element -- live preview of a user-supplied URL */}
            <img src={safeImage} alt="" referrerPolicy="no-referrer" className="h-full w-full object-contain" />
          </div>
        )}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}

interface ListDetailsModalProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onSave: (details: { title: string; description: string }) => void;
  dict: Dictionary;
}

/** Renames a custom list and edits its description. */
export function ListDetailsModal({ open, title, description, onClose, onSave, dict }: ListDetailsModalProps) {
  const t = dict.tierLists;
  const [draftTitle, setDraftTitle] = useState<string>(title);
  const [draftDescription, setDraftDescription] = useState<string>(description);

  useEffect(() => {
    if (open) {
      setDraftTitle(title);
      setDraftDescription(description);
    }
  }, [open, title, description]);

  const save = () => {
    onSave({ title: draftTitle.trim(), description: draftDescription.trim() });
    onClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="md"
      title={t.detailsTitle}
      icon={<Pencil className="h-5 w-5" aria-hidden="true" />}
      bodyClassName="p-4 sm:p-6 font-sans"
      footer={
        <div className="flex w-full justify-end gap-2">
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            {t.cancel}
          </button>
          <button type="button" onClick={save} className={BTN_PRIMARY}>
            <Check className="h-4 w-4" aria-hidden="true" />
            {t.save}
          </button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col gap-4"
      >
        <label>
          <span className={LABEL}>{t.listTitle}</span>
          <input
            value={draftTitle}
            maxLength={TIER_LIST_LIMITS.maxTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder={t.untitled}
            className={FIELD}
            autoFocus
          />
        </label>
        <label>
          <span className={LABEL}>{t.listDescription}</span>
          <textarea
            value={draftDescription}
            maxLength={TIER_LIST_LIMITS.maxDescription}
            onChange={(e) => setDraftDescription(e.target.value)}
            rows={3}
            className={`${FIELD} py-2`}
          />
        </label>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
