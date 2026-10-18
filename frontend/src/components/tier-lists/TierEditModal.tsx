'use client';
// frontend/src/components/tier-lists/TierEditModal.tsx

import React, { useEffect, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import type { TierDefinition } from '@/types/tierList';
import { cn } from '@/utils/cn';
import { sanitizeImageUrl } from '@/utils/tierLists/codec';
import { TIER_COLOR_TOKENS, TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import { LABEL, TOUCH_BTN, TOUCH_FIELD } from './styles';
import { TierBadge } from './TierBadge';
import { tierColorProps } from './tierColor';
import { TierColorPicker } from './TierColorPicker';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";
import { ColorSwatch } from '@/components/common/ColorSwatch';

interface TierEditModalProps {
  mode?: 'edit' | 'add';
  tier: TierDefinition | null;
  defaultColor?: string;
  tierCount: number;
  onClose: () => void;
  onSave: (id: string, patch: { label: string; color: string; backgroundImage?: string }) => void;
  onCreate?: (patch: { label: string; color: string; backgroundImage?: string }) => void;
  onDelete: (id: string) => void;
}

/** Edit one tier or create a new one: label, color, and tier image, plus delete when editing. */
export function TierEditModal({
  mode = 'edit',
  tier,
  defaultColor = 's',
  tierCount,
  onClose,
  onSave,
  onCreate,
  onDelete,
}: TierEditModalProps) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const [label, setLabel] = useState<string>('');
  const [color, setColor] = useState<string>('s');
  const [backgroundImage, setBackgroundImage] = useState<string>('');

  const isOpen = mode === 'add' || tier !== null;

  useEffect(() => {
    if (mode === 'add') {
      setLabel(t.newTierLabel);
      setColor(defaultColor);
      setBackgroundImage('');
    } else if (tier) {
      setLabel(tier.label);
      setColor(tier.color);
      setBackgroundImage(tier.backgroundImage ?? '');
    }
  }, [mode, tier, defaultColor, t.newTierLabel]);

  if (!isOpen) return null;

  const trimmed = label.trim();
  const trimmedBg = backgroundImage.trim();
  const safeBg = trimmedBg ? sanitizeImageUrl(trimmedBg) : null;
  const bgInvalid = Boolean(trimmedBg) && !safeBg;
  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  const handleSubmit = () => {
    if (!trimmed || bgInvalid) return;
    if (mode === 'add') {
      onCreate?.({ label: trimmed, color, backgroundImage: safeBg ?? undefined });
    } else if (tier) {
      onSave(tier.id, { label: trimmed, color, backgroundImage: safeBg ?? undefined });
    }
    onClose();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      title={mode === 'add' ? t.addTier : t.editTier}
      bodyClassName="p-4 sm:p-6"
      footer={
        <div className="flex w-full flex-wrap items-center justify-center gap-3">
          <Button
            variant="primary"
            disabled={!trimmed || bgInvalid}
            onClick={handleSubmit}
            leftIcon={mode === 'add' ? <Plus className="h-4 w-4" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            className={cn(TOUCH_BTN, 'min-h-hit px-6')}
          >
            {mode === 'add' ? t.addTier : t.save}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="flex flex-col gap-5"
      >
        <div className="flex items-end gap-3">
          <TierBadge
            label={trimmed || tier?.label || t.newTierLabel}
            color={color}
            backgroundImage={safeBg ?? undefined}
            className="flex h-16 w-20 shrink-0 items-center justify-center rounded-control text-2xl font-black p-2"
            labelClassName="px-1 text-center text-lg leading-tight"
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
                <ColorSwatch selected={color === token} className={swatch.className}
                  key={token}
                 
                  onClick={() => setColor(token)}
                  aria-label={formatMessage(t.colorSwatchAria, { name: token.toUpperCase() })}>
                </ColorSwatch>
              );
            })}
            <TierColorPicker color={color} onChange={setColor} />
          </div>
        </fieldset>

        {mode === 'edit' && tier && (
          <div className="flex justify-center border-t border-border-color pt-4">
            <Button
              variant="soft"
              disabled={tierCount <= 1}
              onClick={run(() => onDelete(tier.id))}
              className={TOUCH_BTN}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t.deleteTier}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
}
