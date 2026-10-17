'use client';
// frontend/src/components/tier-lists/creator/LadderEditor.tsx

import React, { useRef, useState } from 'react';
import { GripVertical, ListOrdered, Plus, X } from 'lucide-react';
import type { TierDefinition } from '@/types/tierList';
import { cn } from '@/utils/cn';
import { TIER_COLOR_TOKENS, TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import { sanitizeImageUrl, slugifyItemId, uniqueId } from '@/utils/tierLists/codec';
import { LADDER_PRESETS, type LadderPresetId } from '@/utils/tierLists/creator';
import { TierBadge } from '../TierBadge';
import { tierColorProps } from '../tierColor';
import { TierColorPicker } from '../TierColorPicker';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";
import { ToggleChip } from '@/components/common/ToggleChip';
import { ColorSwatch } from '@/components/common/ColorSwatch';
import { useDragReorder } from '@/hooks/useDragReorder';

function PresetSwatch({ colors }: { colors: readonly string[] }) {
  return (
    <span className="flex overflow-hidden rounded-chip" aria-hidden="true">
      {colors.map((color, i) => (
        <span key={i} className={cn('h-3.5 w-2', tierColorProps(color).className)} />
      ))}
    </span>
  );
}

interface LadderEditorProps {
  tiers: TierDefinition[];
  onChange: (tiers: TierDefinition[]) => void;
  onPreset: (id: LadderPresetId) => void;
  activePreset: LadderPresetId | null;
}

/** Inline tier ladder editing for the creator: presets, then label / color / drag-order per row. */
export function LadderEditor({ tiers, onChange, onPreset, activePreset }: LadderEditorProps) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const c = t.creator;
  const [paletteFor, setPaletteFor] = useState<string | null>(null);
  const [bgDrafts, setBgDrafts] = useState<Record<string, string>>({});
  const tiersRef = useRef(tiers);
  tiersRef.current = tiers;

  const update = (id: string, patch: Partial<TierDefinition>) =>
    onChange(tiers.map((tier) => (tier.id === id ? { ...tier, ...patch } : tier)));

  const setBackgroundImage = (tier: TierDefinition, raw: string) => {
    setBgDrafts((d) => ({ ...d, [tier.id]: raw }));
    const trimmed = raw.trim();
    if (!trimmed) {
      update(tier.id, { backgroundImage: undefined });
      return;
    }
    const safe = sanitizeImageUrl(trimmed);
    update(tier.id, { backgroundImage: safe ?? undefined });
  };

  const moveById = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const current = tiersRef.current;
    const oldIndex = current.findIndex((tier) => tier.id === fromId);
    const newIndex = current.findIndex((tier) => tier.id === toId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    const next = [...current];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    tiersRef.current = next;
    onChange(next);
  };

  const drag = useDragReorder<string>({ onMove: moveById });

  const add = () => {
    if (tiers.length >= TIER_LIST_LIMITS.maxTiers) return;
    const id = uniqueId(slugifyItemId(t.newTierLabel), new Set(tiers.map((tier) => tier.id)));
    const color = TIER_COLOR_TOKENS[Math.min(tiers.length, TIER_COLOR_TOKENS.length - 1)];
    onChange([...tiers, { id, label: t.newTierLabel, color }]);
    setPaletteFor(id);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Phones: the label and a dropdown share one row. Wide screens: the label above every preset. */}
      <div className="flex items-center justify-center gap-2.5 sm:flex-col sm:gap-0">
        <p className="type-label-sm text-text-secondary text-center sm:mb-2">{c.presetsLabel}</p>
        <div className="sm:hidden">
          <CustomDropdown
            value={activePreset ?? ''}
            onChange={(id) => onPreset(id as LadderPresetId)}
            options={LADDER_PRESETS.map((preset) => ({ value: preset.id, label: c.presets[preset.id], icon: <PresetSwatch colors={preset.colors} /> }))}
            label={activePreset ? undefined : '—'}
            icon={activePreset ? undefined : <ListOrdered className="h-4 w-4" aria-hidden="true" />}
            ariaLabel={c.presetsLabel}
            buttonClassName="min-h-10"
            minWidthClass="min-w-[220px]"
          />
        </div>
        <div className="hidden sm:flex flex-wrap justify-center gap-2">
          {LADDER_PRESETS.map((preset) => (
            <ToggleChip pressed={activePreset === preset.id} size="md"
              key={preset.id}
              onClick={() => onPreset(preset.id)}
            >
              <PresetSwatch colors={preset.colors} />
              {c.presets[preset.id]}
            </ToggleChip>
          ))}
        </div>
      </div>

      <ol className="flex flex-col gap-2">
        {tiers.map((tier, index) => {
          const open = paletteFor === tier.id;
          const bgDraft = bgDrafts[tier.id] ?? tier.backgroundImage ?? '';
          const bgInvalid = Boolean(bgDraft.trim()) && !sanitizeImageUrl(bgDraft.trim());
          const isDragging = drag.draggingId === tier.id;
          return (
            <li
              key={tier.id}
              ref={drag.rowRef(tier.id)}
              className={cn(
                'rounded-chip border border-border-color bg-bg-surface shadow-xs overflow-hidden transition-colors',
                isDragging && 'z-20 relative border-accent-amber opacity-90'
              )}
            >
              <div className="flex items-stretch min-h-11 sm:min-h-12">
                {/* Drag Handle */}
                <button
                  type="button"
                  {...drag.handleProps(tier.id)}
                  aria-label={formatMessage(t.tierAria, { label: tier.label })}
                  className="pointer-coarse:min-h-11 pointer-coarse:min-w-11 flex w-9 sm:w-10 shrink-0 items-center justify-center border-r border-border-color/80 text-text-muted hover:text-text-primary hover:bg-bg-elevated cursor-grab active:cursor-grabbing touch-none select-none transition-colors"
                >
                  <GripVertical className="h-4 w-4" aria-hidden="true" />
                </button>

                {/* Tier Color & Label Badge Button */}
                <button
                  type="button"
                  onClick={() => setPaletteFor(open ? null : tier.id)}
                  aria-expanded={open}
                  aria-label={formatMessage(c.tierColorAria, { label: tier.label })}
                  className="relative w-16 sm:w-20 shrink-0 flex items-center justify-center cursor-pointer border-r border-border-color/80 transition-opacity hover:opacity-90"
                >
                  <TierBadge
                    label={tier.label || '?'}
                    color={tier.color}
                    backgroundImage={tier.backgroundImage}
                    className="absolute inset-0 flex items-center justify-center text-sm sm:text-base font-black p-1"
                    labelClassName="px-0.5 leading-tight"
                  />
                </button>

                {/* Integrated Name Input */}
                <input
                  value={tier.label}
                  maxLength={TIER_LIST_LIMITS.maxTierLabel}
                  onChange={(e) => update(tier.id, { label: e.target.value })}
                  aria-label={formatMessage(c.tierLabelAria, { index: index + 1 })}
                  className="min-w-0 flex-1 bg-transparent px-3 type-card-title text-text-primary focus:outline-hidden focus:bg-bg-elevated/40 transition-colors"
                />

                {/* Delete Button */}
                <div className="flex shrink-0 items-center border-l border-border-color/80 bg-bg-surface">
                  <button
                    type="button"
                    disabled={tiers.length <= 1}
                    onClick={() => onChange(tiers.filter((x) => x.id !== tier.id))}
                    aria-label={formatMessage(c.removeTierAria, { label: tier.label })}
                    className="pointer-coarse:min-h-11 pointer-coarse:min-w-11 flex h-full w-9 sm:w-10 items-center justify-center text-text-muted hover:text-accent-red hover:bg-accent-red/10 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Expandable Palette Drawer */}
              {open && (
                <div className="p-3 border-t border-border-color/80 bg-bg-elevated/50 flex flex-wrap items-center justify-center gap-2">
                  {TIER_COLOR_TOKENS.map((token) => {
                    const swatch = tierColorProps(token);
                    const active = tier.color === token;
                    return (
                      <ColorSwatch selected={active} size="sm" className={swatch.className}
                        key={token}
                       
                        onClick={() => update(tier.id, { color: token })}
                        aria-label={formatMessage(t.colorSwatchAria, { name: token.toUpperCase() })}>
                      </ColorSwatch>
                    );
                  })}
                  <TierColorPicker size="sm" color={tier.color} onChange={(hex) => update(tier.id, { color: hex })} />
                  <label className="flex min-w-0 basis-full flex-col gap-1 mt-1">
                    <span className="type-strong text-text-secondary">{t.tierBackgroundImage}</span>
                    <Input
                      value={bgDraft}
                      onChange={(e) => setBackgroundImage(tier, e.target.value)}
                      placeholder={t.tierBackgroundImagePlaceholder}
                      inputMode="url"
                      invalid={bgInvalid}
                      className="min-h-[38px] bg-bg-primary"
                    />
                    <span className={cn('text-xs', bgInvalid ? 'font-semibold text-accent-red' : 'text-text-muted')}>
                      {bgInvalid ? t.invalidImage : t.tierBackgroundImageHint}
                    </span>
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex justify-center w-full">
        <Button
          variant="secondary"
          onClick={add}
          disabled={tiers.length >= TIER_LIST_LIMITS.maxTiers}
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          className="min-h-10 px-6"
        >
          {t.addTier}
        </Button>
      </div>
    </div>
  );
}
