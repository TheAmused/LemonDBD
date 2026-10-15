'use client';
// frontend/src/components/maps/voice/VoiceVariantPills.tsx

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';

import { Button } from '@/components/common/Button';
interface VoiceVariantPillsProps {
  variants: string[];
  onSelect: (variant: string) => void;
}

/** Clickable alternatives shown when a spoken map name matched several variants. */
export function VoiceVariantPills({ variants, onSelect }: VoiceVariantPillsProps) {
  const dict = useDictionary();

  return (
    <div className="relative z-10 mt-2.5 rounded-card border border-border-color bg-bg-elevated p-2.5 backdrop-blur-sm flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 type-strong text-text-secondary">
        <span>{dict.maps.variants}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {variants.map((variant) => (
          <Button
            key={variant}
            type="button"
            onClick={() => onSelect(variant)}
            variant="secondary" size="xs"
          >
            <span>{variant}</span>
            <ArrowRight className="h-3 w-3 text-accent-red" aria-hidden="true" />
          </Button>
        ))}
      </div>
    </div>
  );
}
