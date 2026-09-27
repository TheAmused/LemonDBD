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
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      // `title`/`subtitle` take a ReactNode, so the accent colors below are
      // just a styled span passed straight through -- no change to `Modal`
      // itself. `title` no longer being a plain string means Modal's own
      // `aria-label` fallback (`typeof title === 'string'`) won't fire, so
      // the accessible name is set explicitly here instead.
      title={<span className="text-accent-red">{item.name}</span>}
      subtitle={item.subtitle ? <span className="text-accent-amber">{item.subtitle}</span> : undefined}
      ariaLabel={item.name}
      centerTitle
    >
      <div className="flex flex-col items-center gap-4 p-5 sm:p-6">
        {item.image ? (
          // Sized by the image's own intrinsic ratio, not forced into a
          // fixed square -- a tall character portrait and a wide map photo
          // should each keep their real shape. `max-h`/`max-w` (not fixed
          // `h`/`w`) cap it so a large source image never overflows the
          // modal or viewport, while `w-auto h-auto` let it shrink no
          // further than the image and its container actually need.
          <div className="flex w-full items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- images are unoptimized app-wide and may be user-supplied URLs of unknown, varied aspect ratio */}
            <img
              src={item.image}
              alt={item.name}
              className="h-auto max-h-[65vh] w-auto max-w-full rounded-2xl border border-border-color bg-bg-elevated object-contain"
            />
          </div>
        ) : (
          <div className="flex h-48 w-48 sm:h-64 sm:w-64 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border-color bg-bg-elevated">
            <span className="text-4xl font-black text-text-muted" aria-hidden="true">
              {item.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        {item.description && (
          <PerkDescription description={item.description} perkName={item.name} />
        )}
      </div>
    </Modal>
  );
}
