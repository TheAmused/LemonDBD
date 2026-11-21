'use client';
// frontend/src/components/tier-lists/TierItemPreviewModal.tsx

import React from 'react';
import { Modal } from '@/components/common/Modal';
import { PerkDescription } from '@/components/PerkDescription';
import type { TierDefinition, TierItem } from '@/types/tierList';
import { Surface } from '@/components/common/Surface';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Img } from '@/components/common/Img';
import { tierColorProps } from './tierColor';
import { cn } from '@/utils/cn';
import { useDictionary } from '@/context/DictionaryContext';

interface TierItemPreviewModalProps {
  /** The tile that was double-clicked/double-tapped, or null to stay closed. */
  item: TierItem | null;
  tiers?: TierDefinition[];
  onMoveToTier?: (key: string, tierId: string) => void;
  onClose: () => void;
}

/**
 * Double-click (or double-tap) preview for any tier-list tile, aligned with the
 * perk/character card style across the site, with optional quick tier assignment.
 */
export function TierItemPreviewModal({ item, tiers, onMoveToTier, onClose }: TierItemPreviewModalProps) {
  const dict = useDictionary();
  if (!item) return null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      title={<span className="text-accent-red">{item.name}</span>}
      ariaLabel={item.name}
    >
      <div className="flex flex-col items-center gap-4 p-4 sm:p-6">
        {item.subtitle && (
          <Badge tone="amber" size="sm" className="max-w-full truncate">
            {item.subtitle}
          </Badge>
        )}

        {(item.fullImage ?? item.image) ? (
          <div className="flex w-full items-center justify-center">
            <Img
              src={(item.fullImage ?? item.image) as string}
              alt={item.name}
              className="h-auto max-h-vh-65 w-auto max-w-full rounded-card border border-border-color bg-bg-elevated/60 object-contain p-1 shadow-inner"
            />
          </div>
        ) : (
          <Surface tone="elevated" padding="none" className="flex h-48 w-48 sm:h-64 sm:w-64 shrink-0 items-center justify-center overflow-hidden">
            <span className="text-4xl font-black text-text-muted" aria-hidden="true">
              {item.name.slice(0, 2).toUpperCase()}
            </span>
          </Surface>
        )}

        {item.description && (
          <Surface tone="elevated" padding="none" className="w-full p-3.5 sm:p-4">
            <PerkDescription description={item.description} />
          </Surface>
        )}

        {tiers && tiers.length > 0 && onMoveToTier && (
          <div className="w-full pt-1 border-t border-border-color/70">
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
              {tiers.map((tier) => {
                const cp = tierColorProps(tier.color);
                return (
                  <Button
                    key={tier.id}
                    type="button"
                    size="sm"
                    variant="secondary"
                    aria-label={tier.label}
                    onClick={() => {
                      onMoveToTier(item.key, tier.id);
                      onClose();
                    }}
                    style={cp.style}
                    className={cn('min-w-10 border-0 font-black', cp.className)}
                  >
                    {tier.label}
                  </Button>
                );
              })}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="ml-1"
              >
                {dict.modal.close}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
