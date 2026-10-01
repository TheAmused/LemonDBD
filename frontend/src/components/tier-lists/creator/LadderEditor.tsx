'use client';
// frontend/src/components/tier-lists/creator/LadderEditor.tsx

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, ListOrdered, Plus, X } from 'lucide-react';
import type { TierDefinition } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { HEX_COLOR_PATTERN, TIER_COLOR_TOKENS, TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import { sanitizeImageUrl, slugifyItemId, uniqueId } from '@/utils/tierLists/codec';
import { LADDER_PRESETS, type LadderPresetId } from '@/utils/tierLists/creator';
import { TierBadge } from '../TierBadge';
import { tierColorProps } from '../tierColor';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { CustomDropdown } from '@/components/common/CustomDropdown';

interface LadderEditorProps {
  tiers: TierDefinition[];
  onChange: (tiers: TierDefinition[]) => void;
  onPreset: (id: LadderPresetId) => void;
  activePreset: LadderPresetId | null;
  dict: Dictionary;
}

/** Inline tier ladder editing for the creator: presets, then label / color / order per row. */
export function LadderEditor({ tiers, onChange, onPreset, activePreset, dict }: LadderEditorProps) {
  const t = dict.tierLists;
  const c = t.creator;
  const [paletteFor, setPaletteFor] = useState<string | null>(null);
  // Free-typed background-image text per tier row, so a URL mid-typing isn't
  // clobbered by the sanitized value the moment it fails to parse yet. Keyed
  // by tier id; a row not in here just shows its saved `backgroundImage`.
  const [bgDrafts, setBgDrafts] = useState<Record<string, string>>({});

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
    if (safe) update(tier.id, { backgroundImage: safe });
    // Invalid but non-empty: leave the saved value alone (nothing to apply
    // yet) while the draft text keeps the input responsive to typing.
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= tiers.length) return;
    const next = [...tiers];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const add = () => {
    if (tiers.length >= TIER_LIST_LIMITS.maxTiers) return;
    const id = uniqueId(slugifyItemId(t.newTierLabel), new Set(tiers.map((tier) => tier.id)));
    const color = TIER_COLOR_TOKENS[Math.min(tiers.length, TIER_COLOR_TOKENS.length - 1)];
    onChange([...tiers, { id, label: t.newTierLabel, color }]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-text-secondary font-mono text-center">{c.presetsLabel}</p>
        <CustomDropdown
          value={activePreset ?? ''}
          onChange={(id) => onPreset(id as LadderPresetId)}
          options={LADDER_PRESETS.map((preset) => ({
            value: preset.id,
            label: c.presets[preset.id],
            icon: (
              <span className="flex overflow-hidden rounded-xs" aria-hidden="true">
                {preset.colors.map((color, i) => (
                  <span key={i} className={cn('h-3.5 w-2', tierColorProps(color).className)} />
                ))}
              </span>
            ),
          }))}
          label={activePreset ? undefined : c.presetsLabel}
          icon={activePreset ? undefined : <ListOrdered className="h-4 w-4" aria-hidden="true" />}
          ariaLabel={c.presetsLabel}
          buttonClassName="min-h-[40px]"
          minWidthClass="min-w-[220px]"
        />
      </div>

      <ol className="flex flex-col gap-2">
        {tiers.map((tier, index) => {
          const open = paletteFor === tier.id;
          const bgDraft = bgDrafts[tier.id] ?? tier.backgroundImage ?? '';
          const bgInvalid = Boolean(bgDraft.trim()) && !sanitizeImageUrl(bgDraft.trim());
          return (
            <li key={tier.id} className="rounded-lg border border-border-color bg-bg-surface shadow-xs overflow-hidden transition-colors">
              <div className="flex items-stretch min-h-[44px] sm:min-h-[48px]">
                {/* Tier Color & Label Badge Button */}
                <button
                  type="button"
                  onClick={() => setPaletteFor(open ? null : tier.id)}
                  aria-expanded={open}
                  aria-label={c.tierColorAria.replace('{label}', tier.label)}
                  className="relative w-16 sm:w-20 shrink-0 flex items-center justify-center cursor-pointer border-r border-border-color/80 transition-opacity hover:opacity-90"
                >
                  <TierBadge
                    label={tier.label || '?'}
                    color={tier.color}
                    backgroundImage={tier.backgroundImage}
                    className="absolute inset-0 flex items-center justify-center text-sm sm:text-base font-black"
                    labelClassName="max-w-full truncate px-1"
                  />
                </button>

                {/* Integrated Name Input */}
                <input
                  value={tier.label}
                  maxLength={TIER_LIST_LIMITS.maxTierLabel}
                  onChange={(e) => update(tier.id, { label: e.target.value })}
                  aria-label={c.tierLabelAria.replace('{index}', String(index + 1))}
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm font-bold text-text-primary focus:outline-hidden focus:bg-bg-elevated/40 transition-colors"
                />

                {/* Integrated Reorder & Delete Toolbar */}
                <div className="flex shrink-0 items-center border-l border-border-color/80 bg-bg-surface divide-x divide-border-color/60">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={c.moveTierUpAria.replace('{label}', tier.label)}
                    className="flex h-full w-9 sm:w-10 items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={index === tiers.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={c.moveTierDownAria.replace('{label}', tier.label)}
                    className="flex h-full w-9 sm:w-10 items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={tiers.length <= 1}
                    onClick={() => onChange(tiers.filter((x) => x.id !== tier.id))}
                    aria-label={c.removeTierAria.replace('{label}', tier.label)}
                    className="flex h-full w-9 sm:w-10 items-center justify-center text-text-muted hover:text-accent-red hover:bg-accent-red/10 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
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
                      <button
                        key={token}
                        type="button"
                        onClick={() => update(tier.id, { color: token })}
                        aria-label={t.colorSwatchAria.replace('{name}', token.toUpperCase())}
                        aria-pressed={active}
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-md border-2 cursor-pointer transition-transform hover:scale-105',
                          swatch.className,
                          active ? 'border-text-primary' : 'border-transparent'
                        )}
                      >
                        {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      </button>
                    );
                  })}
                  <label
                    className={cn(
                      'flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-bold text-text-secondary cursor-pointer bg-bg-surface',
                      HEX_COLOR_PATTERN.test(tier.color) ? 'border-text-primary' : 'border-border-color'
                    )}
                  >
                    <input
                      type="color"
                      value={HEX_COLOR_PATTERN.test(tier.color) ? tier.color : '#888888'}
                      onChange={(e) => update(tier.id, { color: e.target.value })}
                      className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    {t.customColor}
                  </label>
                  <label className="flex min-w-0 basis-full flex-col gap-1 mt-1">
                    <span className="text-xs font-bold text-text-secondary">{t.tierBackgroundImage}</span>
                    <Input
                      value={bgDraft}
                      onChange={(e) => setBackgroundImage(tier, e.target.value)}
                      placeholder={t.tierBackgroundImagePlaceholder}
                      inputMode="url"
                      invalid={bgInvalid}
                      className="min-h-[38px] rounded-lg bg-bg-primary"
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
          className="min-h-[40px] rounded-lg px-6"
        >
          {t.addTier}
        </Button>
      </div>
    </div>
  );
}
