'use client';
// frontend/src/components/tier-lists/TierEditModal.tsx

import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Eraser, Palette, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import type { TierDefinition } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { HEX_COLOR_PATTERN, TIER_COLOR_TOKENS, TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import { BTN_DANGER_GHOST, BTN_PRIMARY, BTN_SECONDARY, FIELD, LABEL } from './styles';
import { tierColorProps } from './tierColor';

interface TierEditModalProps {
  tier: TierDefinition | null;
  index: number;
  tierCount: number;
  onClose: () => void;
  onSave: (id: string, patch: { label: string; color: string }) => void;
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

  useEffect(() => {
    if (tier) {
      setLabel(tier.label);
      setColor(tier.color);
    }
  }, [tier]);

  if (!tier) return null;

  const trimmed = label.trim();
  const customHex = HEX_COLOR_PATTERN.test(color) ? color : '#888888';
  const preview = tierColorProps(color);
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
      bodyClassName="p-4 sm:p-6 font-sans"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            {t.cancel}
          </button>
          <button
            type="button"
            disabled={!trimmed}
            onClick={run(() => onSave(tier.id, { label: trimmed, color }))}
            className={BTN_PRIMARY}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {t.save}
          </button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) run(() => onSave(tier.id, { label: trimmed, color }))();
        }}
        className="flex flex-col gap-5"
      >
        <div className="flex items-end gap-3">
          <div
            className={cn('flex h-16 w-20 shrink-0 items-center justify-center rounded-xl text-2xl font-black', preview.className)}
            style={preview.style}
            aria-hidden="true"
          >
            <span className="line-clamp-2 break-words px-1 text-center text-lg leading-tight">{trimmed || tier.label}</span>
          </div>
          <label className="min-w-0 flex-1">
            <span className={LABEL}>{t.tierLabel}</span>
            <input
              value={label}
              maxLength={TIER_LIST_LIMITS.maxTierLabel}
              onChange={(e) => setLabel(e.target.value)}
              className={FIELD}
              autoFocus
            />
          </label>
        </div>

        <fieldset>
          <legend className={LABEL}>{t.tierColor}</legend>
          <div className="flex flex-wrap items-center gap-2">
            {TIER_COLOR_TOKENS.map((token) => {
              const swatch = tierColorProps(token);
              return (
                <button
                  key={token}
                  type="button"
                  onClick={() => setColor(token)}
                  aria-label={t.colorSwatchAria.replace('{name}', token.toUpperCase())}
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
          <button type="button" disabled={index === 0} onClick={run(() => onMove(tier.id, -1))} className={BTN_SECONDARY}>
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
            {t.moveUp}
          </button>
          <button
            type="button"
            disabled={index >= tierCount - 1}
            onClick={run(() => onMove(tier.id, 1))}
            className={BTN_SECONDARY}
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
            {t.moveDown}
          </button>
          <button
            type="button"
            disabled={tierCount >= TIER_LIST_LIMITS.maxTiers}
            onClick={run(() => onAddBelow(index + 1))}
            className={BTN_SECONDARY}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t.addTier}
          </button>
          <button type="button" onClick={run(() => onClear(tier.id))} className={BTN_SECONDARY}>
            <Eraser className="h-4 w-4" aria-hidden="true" />
            {t.clearTier}
          </button>
          <button
            type="button"
            disabled={tierCount <= 1}
            onClick={run(() => onDelete(tier.id))}
            className={cn(BTN_DANGER_GHOST, 'col-span-2')}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t.deleteTier}
          </button>
        </div>
      </form>
    </Modal>
  );
}
