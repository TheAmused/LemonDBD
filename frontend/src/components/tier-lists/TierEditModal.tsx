'use client';
// frontend/src/components/tier-lists/TierEditModal.tsx

import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Eraser, Palette, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import type { TierDefinition } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { sanitizeImageUrl } from '@/utils/tierLists/codec';
import { HEX_COLOR_PATTERN, TIER_COLOR_TOKENS, TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import { LABEL, TOUCH_BTN, TOUCH_FIELD } from './styles';
import { TierBadge } from './TierBadge';
import { tierColorProps } from './tierColor';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { themeColor } from '@/utils/themeColor';
import { formatMessage } from '@/utils/i18nFormat';

interface TierEditModalProps {
  tier: TierDefinition | null;
  index: number;
  tierCount: number;
  onClose: () => void;
  onSave: (id: string, patch: { label: string; color: string; backgroundImage?: string }) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onClear: (id: string) => void;
  onDelete: (id: string) => void;
  onAddBelow: (index: number) => void;
  dict: Dictionary;
}

/** Edit one tier: label and color, plus the row operations (move, clear, delete, insert). */
export function TierEditModal({
  tier,
  index,
  tierCount,
  onClose,
  onSave,
  onMove,
  onClear,
  onDelete,
  onAddBelow,
  dict,
}: TierEditModalProps) {
  const t = dict.tierLists;
  const [label, setLabel] = useState<string>('');
  const [color, setColor] = useState<string>('s');
  const [backgroundImage, setBackgroundImage] = useState<string>('');

  useEffect(() => {
    if (tier) {
      setLabel(tier.label);
      setColor(tier.color);
      setBackgroundImage(tier.backgroundImage ?? '');
    }
  }, [tier]);

  if (!tier) return null;

  const trimmed = label.trim();
  const customHex = HEX_COLOR_PATTERN.test(color) ? color : themeColor('--text-muted');
  const trimmedBg = backgroundImage.trim();
  const safeBg = trimmedBg ? sanitizeImageUrl(trimmedBg) : null;
  const bgInvalid = Boolean(trimmedBg) && !safeBg;
  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      title={t.editTier}
      icon={<Palette className="h-5 w-5" aria-hidden="true" />}
      bodyClassName="p-4 sm:p-6"
      footer={
        <div className="flex w-full flex-wrap items-center justify-center gap-3">
          <Button variant="secondary" onClick={onClose} className={cn(TOUCH_BTN, 'min-h-[42px] px-5')}>
            {t.cancel}
          </Button>
          <Button
            variant="primary"
            disabled={!trimmed || bgInvalid}
            onClick={run(() => onSave(tier.id, { label: trimmed, color, backgroundImage: safeBg ?? undefined }))}
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
          if (trimmed && !bgInvalid) run(() => onSave(tier.id, { label: trimmed, color, backgroundImage: safeBg ?? undefined }))();
        }}
        className="flex flex-col gap-5"
      >
        <div className="flex items-end gap-3">
          <TierBadge
            label={trimmed || tier.label}
            color={color}
            backgroundImage={safeBg ?? undefined}
            className="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl text-2xl font-black"
            labelClassName="line-clamp-2 break-words px-1 text-center text-lg leading-tight"
          />
          <label className="min-w-0 flex-1">
            <span className={LABEL}>{t.tierLabel}</span>
            <Input
              value={label}
              maxLength={TIER_LIST_LIMITS.maxTierLabel}
              onChange={(e) => setLabel(e.target.value)}
              className={TOUCH_FIELD}
              autoFocus
            />
          </label>
        </div>

        <label>
          <span className={LABEL}>{t.tierBackgroundImage}</span>
          <Input
            value={backgroundImage}
            onChange={(e) => setBackgroundImage(e.target.value)}
            placeholder={t.tierBackgroundImagePlaceholder}
            inputMode="url"
            invalid={bgInvalid}
            className={TOUCH_FIELD}
          />
          <span className={cn('mt-1 block text-xs', bgInvalid ? 'font-semibold text-accent-red' : 'text-text-muted')}>
            {bgInvalid ? t.invalidImage : t.tierBackgroundImageHint}
          </span>
        </label>

        <fieldset>
          <legend className={cn(LABEL, 'text-center block w-full')}>{t.tierColor}</legend>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {TIER_COLOR_TOKENS.map((token) => {
              const swatch = tierColorProps(token);
              return (
                <button
                  key={token}
                  type="button"
                  onClick={() => setColor(token)}
                  aria-label={formatMessage(t.colorSwatchAria, { name: token.toUpperCase() })}
                  aria-pressed={color === token}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl border-2 cursor-pointer transition-transform hover:scale-105',
                    swatch.className,
                    color === token ? 'border-text-primary' : 'border-transparent'
                  )}
                >
                  {color === token && <Check className="h-4 w-4" aria-hidden="true" />}
                </button>
              );
            })}
            <label
              className={cn(
                'relative flex h-11 items-center gap-2 rounded-xl border-2 px-3 text-xs font-bold text-text-secondary cursor-pointer',
                HEX_COLOR_PATTERN.test(color) ? 'border-text-primary' : 'border-border-color'
              )}
            >
              <input
                type="color"
                value={customHex}
                onChange={(e) => setColor(e.target.value)}
                className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              {t.customColor}
            </label>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-2 border-t border-border-color pt-4">
          <Button variant="secondary" disabled={index === 0} onClick={run(() => onMove(tier.id, -1))} className={TOUCH_BTN}>
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
            {t.moveUp}
          </Button>
          <Button
            variant="secondary"
            disabled={index >= tierCount - 1}
            onClick={run(() => onMove(tier.id, 1))}
            className={TOUCH_BTN}
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
            {t.moveDown}
          </Button>
          <Button
            variant="secondary"
            disabled={tierCount >= TIER_LIST_LIMITS.maxTiers}
            onClick={run(() => onAddBelow(index + 1))}
            className={TOUCH_BTN}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t.addTier}
          </Button>
          <Button variant="secondary" onClick={run(() => onClear(tier.id))} className={TOUCH_BTN}>
            <Eraser className="h-4 w-4" aria-hidden="true" />
            {t.clearTier}
          </Button>
          <Button
            variant="soft"
            disabled={tierCount <= 1}
            onClick={run(() => onDelete(tier.id))}
            className={cn(TOUCH_BTN, 'col-span-2')}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t.deleteTier}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
