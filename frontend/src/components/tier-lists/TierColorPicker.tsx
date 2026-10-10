'use client';
// frontend/src/components/tier-lists/TierColorPicker.tsx

import React, { useEffect, useRef, useState } from 'react';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import { Check, Pipette } from 'lucide-react';
import { cn } from '@/utils/cn';
import { HEX_COLOR_PATTERN } from '@/utils/tierLists/constants';
import { themeColor } from '@/utils/themeColor';
import { useDictionary } from '@/context/DictionaryContext';

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
  const [draft, setDraft] = useState<string>(isHex ? color : themeColor('--text-muted') || '#808080');
  const timer = useRef<number | undefined>(undefined);
  const lastEmitted = useRef<string>(color);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Follow the color when something else changes it (another tier, a preset), but not our own echo.
  useEffect(() => {
    if (HEX_COLOR_PATTERN.test(color) && color !== lastEmitted.current) setDraft(color);
  }, [color]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const pick = (raw: string, immediate = false) => {
    const hex = toHex6(raw);
    if (!hex) return;
    setDraft(hex);
    window.clearTimeout(timer.current);
    const emit = () => {
      lastEmitted.current = hex;
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
      {/* Same square swatch as the preset colors: the chosen custom color, or a rainbow until one is picked. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t.customColor}
        aria-pressed={isHex}
        className={cn(
          'flex items-center justify-center border-2 cursor-pointer transition-transform hover:scale-105',
          small ? 'h-7 w-7 rounded-md pointer-coarse:min-h-11 pointer-coarse:min-w-11' : 'h-11 w-11 rounded-xl',
          !isHex && 'bg-[conic-gradient(red,yellow,lime,aqua,blue,fuchsia,red)]',
          isHex || open ? 'border-text-primary' : 'border-transparent'
        )}
        style={isHex ? { backgroundColor: color } : undefined}
      >
        {isHex && <Check className={small ? 'h-3.5 w-3.5 text-text-primary drop-shadow-sm' : 'h-4 w-4 text-text-primary drop-shadow-sm'} aria-hidden="true" />}
      </button>

      {open && (
        <div
          className={cn(
            'flex basis-full flex-col items-center gap-3 rounded-2xl border border-border-color bg-bg-elevated/60 p-3',
            '[&_.react-colorful]:h-44 [&_.react-colorful]:w-full [&_.react-colorful]:max-w-[16rem]',
            '[&_.react-colorful__saturation]:rounded-xl [&_.react-colorful__saturation]:border-b-0',
            '[&_.react-colorful__hue]:mt-3 [&_.react-colorful__hue]:h-4 [&_.react-colorful__hue]:rounded-full',
            '[&_.react-colorful__pointer]:h-5 [&_.react-colorful__pointer]:w-5'
          )}
        >
          <HexColorPicker color={draft} onChange={(hex) => pick(hex)} />
          <div className="flex w-full max-w-[16rem] items-center gap-2">
            <HexColorInput
              color={draft}
              onChange={(hex) => pick(hex)}
              prefixed
              aria-label={t.customColor}
              className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-border-color bg-bg-primary px-3 text-center type-label uppercase text-text-primary focus:border-accent-red focus:outline-hidden"
            />
            {EyeDropper && (
              <button
                type="button"
                onClick={() => void sampleScreen()}
                aria-label={t.pickFromScreen}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border-color bg-bg-surface text-text-secondary hover:text-accent-red cursor-pointer transition-colors"
              >
                <Pipette className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
