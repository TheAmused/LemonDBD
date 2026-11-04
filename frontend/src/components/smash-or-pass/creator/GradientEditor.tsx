'use client';
// frontend/src/components/smash-or-pass/creator/GradientEditor.tsx
// The custom badge gradient: the badge itself as a wide preview with a handle on each end (filled with
// that end's colour), the hex codes beneath, a swap button, and one picker for the handle you picked.

import { useState } from 'react';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import { Button } from '@/components/common/Button';
import { useDictionary } from '@/context/DictionaryContext';
import { cn } from '@/utils/cn';
import { badgeGradientProps, encodeCustomGradient, type CustomGradient } from '@/utils/smashOrPass/badgeGradient';

type End = 'from' | 'to';

interface GradientEditorProps {
  value: CustomGradient;
  onChange: (gradient: CustomGradient) => void;
  /** The text shown on the preview badge. */
  title: string;
}

export function GradientEditor({ value, onChange, title }: GradientEditorProps) {
  const dict = useDictionary();
  const ab = dict.smashOrPass.archetypeBuilder;
  const [active, setActive] = useState<End>('from');

  const labels: Record<End, string> = { from: ab.gradientFrom, to: ab.gradientTo };
  const pick = (hex: string) => onChange({ ...value, [active]: hex.toLowerCase() });
  const preview = badgeGradientProps(encodeCustomGradient(value));

  const handle = (end: End, position: string) => (
    <button
      type="button"
      onClick={() => setActive(end)}
      aria-pressed={active === end}
      aria-label={`${labels[end]} ${value[end]}`}
      style={{ backgroundColor: value[end] }}
      className={cn(
        'absolute top-1/2 h-9 w-9 -translate-y-1/2 cursor-pointer rounded-full border-2 shadow-lg transition-transform hover:scale-110',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red',
        position,
        active === end ? 'scale-110 border-text-primary ring-2 ring-text-primary/40' : 'border-text-primary/60'
      )}
    />
  );

  const code = (end: End, align: string) => (
    <button
      type="button"
      onClick={() => setActive(end)}
      className={cn(
        'flex cursor-pointer flex-col gap-0.5 rounded-control px-2 py-1 transition-colors hover:bg-bg-elevated',
        align,
        active === end ? 'text-text-primary' : 'text-text-muted'
      )}
    >
      <span className="type-label-2xs">{labels[end]}</span>
      <span className="type-label-sm uppercase">{value[end]}</span>
    </button>
  );

  return (
    <div className="space-y-2">
      <div
        className="relative flex h-16 items-center justify-center rounded-card border border-border-color px-14"
        style={preview.style}
      >
        {handle('from', 'left-3')}
        <span className="type-strong truncate text-text-inverted drop-shadow">{title}</span>
        {handle('to', 'right-3')}
      </div>

      <div className="flex items-center justify-between gap-2">
        {code('from', 'items-start')}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon
          onClick={() => onChange({ from: value.to, to: value.from })}
          aria-label={ab.gradientSwap}
        >
          <span aria-hidden="true" className="text-base leading-none">⇄</span>
        </Button>
        {code('to', 'items-end')}
      </div>

      <div
        className={cn(
          'mx-auto flex flex-col items-center gap-3 rounded-card border border-border-color bg-bg-elevated/60 p-3',
          '[&_.react-colorful]:h-40 [&_.react-colorful]:w-full [&_.react-colorful]:max-w-72',
          '[&_.react-colorful__saturation]:rounded-card [&_.react-colorful__saturation]:border-b-0',
          '[&_.react-colorful__hue]:mt-3 [&_.react-colorful__hue]:h-4 [&_.react-colorful__hue]:rounded-full',
          '[&_.react-colorful__pointer]:h-5 [&_.react-colorful__pointer]:w-5'
        )}
      >
        <HexColorPicker color={value[active]} onChange={pick} />
        <HexColorInput
          color={value[active]}
          onChange={pick}
          prefixed
          aria-label={labels[active]}
          className="min-h-11 w-full max-w-72 min-w-0 rounded-control border border-border-color bg-bg-primary px-3 text-center type-label uppercase text-text-primary focus:border-accent-red focus:outline-hidden"
        />
      </div>
    </div>
  );
}
