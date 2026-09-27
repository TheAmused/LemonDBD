'use client';
// frontend/src/components/tier-lists/creator/LadderEditor.tsx

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import type { TierDefinition } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { HEX_COLOR_PATTERN, TIER_COLOR_TOKENS, TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import { sanitizeImageUrl, slugifyItemId, uniqueId } from '@/utils/tierLists/codec';
import { LADDER_PRESETS, type LadderPresetId } from '@/utils/tierLists/creator';
import { TierBadge } from '../TierBadge';
import { tierColorProps } from '../tierColor';
import { BTN_SECONDARY, FIELD } from '../styles';

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
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-text-secondary">{c.presetsLabel}</p>
        <div className="flex flex-wrap gap-2">
          {LADDER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPreset(preset.id)}
              aria-pressed={activePreset === preset.id}
              className={cn(
                'inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors cursor-pointer',
                activePreset === preset.id
                  ? 'border-accent-red bg-accent-red/10 text-accent-red'
                  : 'border-border-color bg-bg-surface text-text-primary hover:bg-bg-elevated'
              )}
            >
              <span className="flex overflow-hidden rounded-md" aria-hidden="true">
                {preset.colors.map((color, i) => (
                  <span key={i} className={cn('h-4 w-2.5', tierColorProps(color).className)} />
                ))}
              </span>
              {c.presets[preset.id]}
            </button>
          ))}
        </div>
      </div>

      <ol className="flex flex-col gap-2">
        {tiers.map((tier, index) => {
          const open = paletteFor === tier.id;
          const bgDraft = bgDrafts[tier.id] ?? tier.backgroundImage ?? '';
          const bgInvalid = Boolean(bgDraft.trim()) && !sanitizeImageUrl(bgDraft.trim());
          return (
            <li key={tier.id} className="rounded-2xl border border-border-color bg-bg-surface p-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaletteFor(open ? null : tier.id)}
                  aria-expanded={open}
                  aria-label={c.tierColorAria.replace('{label}', tier.label)}
                  className="relative h-11 w-14 shrink-0 overflow-hidden rounded-xl cursor-pointer"
                >
                  <TierBadge
                    label={tier.label || '?'}
                    color={tier.color}
                    backgroundImage={tier.backgroundImage}
                    className="flex h-full w-full items-center justify-center text-base font-black"
                    labelClassName="max-w-full truncate px-1"
                  />
                </button>
                <input
                  value={tier.label}
                  maxLength={TIER_LIST_LIMITS.maxTierLabel}
                  onChange={(e) => update(tier.id, { label: e.target.value })}
                  aria-label={c.tierLabelAria.replace('{index}', String(index + 1))}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-border-color bg-bg-primary px-3 text-sm font-bold text-text-primary focus:border-accent-red focus:outline-none"
                />
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={c.moveTierUpAria.replace('{label}', tier.label)}
                    className="flex h-11 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-elevated hover:text-text-primary disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={index === tiers.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={c.moveTierDownAria.replace('{label}', tier.label)}
                    className="flex h-11 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-elevated hover:text-text-primary disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={tiers.length <= 1}
                    onClick={() => onChange(tiers.filter((x) => x.id !== tier.id))}
                    aria-label={c.removeTierAria.replace('{label}', tier.label)}
                    className="flex h-11 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-accent-red/10 hover:text-accent-red disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {open && (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-2">
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
                          'flex h-11 w-11 items-center justify-center rounded-xl border-2 cursor-pointer',
                          swatch.className,
                          active ? 'border-text-primary' : 'border-transparent'
                        )}
                      >
                        {active && <Check className="h-4 w-4" aria-hidden="true" />}
                      </button>
                    );
                  })}
                  <label
                    className={cn(
                      'flex h-11 items-center gap-2 rounded-xl border-2 px-3 text-xs font-bold text-text-secondary cursor-pointer',
                      HEX_COLOR_PATTERN.test(tier.color) ? 'border-text-primary' : 'border-border-color'
                    )}
                  >
                    <input
                      type="color"
                      value={HEX_COLOR_PATTERN.test(tier.color) ? tier.color : '#888888'}
                      onChange={(e) => update(tier.id, { color: e.target.value })}
                      className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    {t.customColor}
                  </label>
                  <label className="flex min-w-0 basis-full flex-col gap-1">
                    <span className="text-xs font-bold text-text-secondary">{t.tierBackgroundImage}</span>
                    <input
                      value={bgDraft}
                      onChange={(e) => setBackgroundImage(tier, e.target.value)}
                      placeholder={t.tierBackgroundImagePlaceholder}
                      inputMode="url"
                      aria-invalid={bgInvalid}
                      className={cn(FIELD, bgInvalid && 'border-accent-red')}
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

      <button
        type="button"
        onClick={add}
        disabled={tiers.length >= TIER_LIST_LIMITS.maxTiers}
        className={cn(BTN_SECONDARY, 'w-full border-dashed')}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {t.addTier}
      </button>
    </div>
  );
}
