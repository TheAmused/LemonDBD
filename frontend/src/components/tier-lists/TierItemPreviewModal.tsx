'use client';
// frontend/src/components/tier-lists/TierItemPreviewModal.tsx

import React from 'react';
import { Modal } from '@/components/common/Modal';
import { PerkDescription } from '@/components/PerkDescription';
import type { TierItem } from '@/types/tierList';

interface TierItemPreviewModalProps {
  /** The tile that was double-clicked/double-tapped, or null to stay closed. */
  item: TierItem | null;
  onClose: () => void;
}

/**
 * Double-click (or double-tap) preview for any tier-list tile: a bigger
 * picture and the name for a survivor/killer/map/custom item, plus the
 * description underneath for perks -- the one kind `perksToItems` already
 * attaches one to. Built on the same `Modal` chrome and `PerkDescription`
 * renderer the rest of the site uses instead of a bespoke lightbox, so
 * every item kind gets a rich preview without a perk-specific, character-
 * specific and map-specific modal each duplicating the same layout.
 */
export function TierItemPreviewModal({ item, onClose }: TierItemPreviewModalProps) {
  if (!item) return null;

  return (
    <Modal isOpen onClose={onClose} size="md" title={item.name} subtitle={item.subtitle} centerTitle>
      <div className="flex flex-col items-center gap-4 p-5 sm:p-6">
        <div className="flex h-40 w-40 sm:h-52 sm:w-52 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border-color bg-bg-elevated">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- images are unoptimized app-wide and may be user-supplied URLs
            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl font-black text-text-muted" aria-hidden="true">
              {item.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        {item.description && (
          <PerkDescription description={item.description} perkName={item.name} />
        )}
      </div>
    </Modal>
  );
}
