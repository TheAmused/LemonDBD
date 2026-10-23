'use client';
// frontend/src/components/tier-lists/TierColorPicker.tsx

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ColorSwatch } from '@/components/common/ColorSwatch';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import { Check, Pipette } from 'lucide-react';
import { cn } from '@/utils/cn';
import { HEX_COLOR_PATTERN } from '@/utils/tierLists/constants';
import { paletteColor, themeColor } from '@/utils/themeColor';
import { useDictionary } from '@/context/DictionaryContext';

import { Button } from '@/components/common/Button';
import { useOnValueChange } from '@/hooks/useOnValueChange';
interface TierColorPickerProps {
  /** A color token (`s`, `a`...) or a `#rrggbb` hex. Only hex values are shown in the picker. */
  color: string;
  onChange: (hex: string) => void;
  size?: 'sm' | 'md';
}

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

/** `#abc` -> `#aabbcc`; anything that is not a full color is rejected. */
function toHex6(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return HEX_COLOR_PATTERN.test(v) ? v : null;
}

/**
 * Custom tier color: a toggle that opens a saturation/hue picker with a hex field
 * (react-colorful), plus the browser's EyeDropper where it exists. Replaces the
 * operating system's own `<input type="color">` dialog. Changes are batched
 * so dragging does not write a new draft on every pointer move.
 */
export function TierColorPicker({ color, onChange, size = 'md' }: TierColorPickerProps) {
  const t = useDictionary().tierLists;
  const isHex = HEX_COLOR_PATTERN.test(color);
  const [open, setOpen] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>(isHex ? color : themeColor('--text-muted') || paletteColor('zinc-500'));
  const timer = useRef<number | undefined>(undefined);
  const [lastEmitted, setLastEmitted] = useState<string>(color);
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  });

  // Follow the color when something else changes it (another tier, a preset), but not our own echo.
  useOnValueChange(color, (next) => {
    if (HEX_COLOR_PATTERN.test(next) && next !== lastEmitted) setDraft(next);
  });

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const pick = (raw: string, immediate = false) => {
    const hex = toHex6(raw);
    if (!hex) return;
    setDraft(hex);
    window.clearTimeout(timer.current);
    const emit = () => {
      setLastEmitted(hex);
      onChangeRef.current(hex);
    };
    if (immediate) emit();
    else timer.current = window.setTimeout(emit, 90);
  };

  const EyeDropper =
    typeof window !== 'undefined' ? (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper : undefined;

  const sampleScreen = async () => {
    if (!EyeDropper) return;
    try {
      const { sRGBHex } = await new EyeDropper().open();
      pick(sRGBHex, true);
    } catch {
      // Dismissed with Escape.
    }
  };

  const small = size === 'sm';

  return (
    <>
      {/* Same square swatch as the preset colors. Always the rainbow, so it reads the same whether or not a custom color is set; a check marks it when one is. */}
      <ColorSwatch
        selected={isHex || open}
        size={small ? 'sm' : 'md'}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t.customColor}
        className="bg-[conic-gradient(red,yellow,lime,aqua,blue,fuchsia,red)]"
        mark={
          isHex ? (
            <span className="flex items-center justify-center rounded-full bg-bg-primary/85 p-0.5 text-text-primary" aria-hidden="true">
              <Check className={small ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            </span>
          ) : (
            <></>
          )
        }
      />

      {open && (
        <div
          className={cn(
            'flex basis-full flex-col items-center gap-3 rounded-card border border-border-color bg-bg-elevated/60 p-3',
            '[&_.react-colorful]:h-44 [&_.react-colorful]:w-full [&_.react-colorful]:max-w-64',
            '[&_.react-colorful__saturation]:rounded-card [&_.react-colorful__saturation]:border-b-0',
            '[&_.react-colorful__hue]:mt-3 [&_.react-colorful__hue]:h-4 [&_.react-colorful__hue]:rounded-full',
            '[&_.react-colorful__pointer]:h-5 [&_.react-colorful__pointer]:w-5'
          )}
        >
          <HexColorPicker color={draft} onChange={(hex) => pick(hex)} />
          <div className="flex w-full max-w-64 items-center gap-2">
            <HexColorInput
              color={draft}
              onChange={(hex) => pick(hex)}
              prefixed
              aria-label={t.customColor}
              className="min-h-11 min-w-0 flex-1 rounded-control border border-border-color bg-bg-primary px-3 text-center type-label uppercase text-text-primary focus:border-accent-red focus:outline-hidden"
            />
            {EyeDropper && (
              <Button
                type="button"
                onClick={() => void sampleScreen()}
                aria-label={t.pickFromScreen}
                variant="secondary" size="md" icon className="shrink-0"
              >
                <Pipette className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
