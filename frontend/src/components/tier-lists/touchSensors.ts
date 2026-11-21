// frontend/src/components/tier-lists/touchSensors.ts
//
// Touch dragging split by container:
// - Tier rows scroll vertically with the page (`touch-pan-y`): SidewaysPointerSensor
//   picks up a tile on a sideways swipe with zero hold delay.
// - Sticky unranked tray scrolls internally (`touch-pan-y`): TrayTouchSensor uses
//   dnd-kit's TouchSensor (with touchmove preventDefault once lifted) so a short
//   hold (~140ms) lets you drag straight UP into any tier without browser cancel.

import { PointerSensor, TouchSensor } from '@dnd-kit/core';

const TRAY_SELECTOR = '[data-sticky-tray="true"]';

/** Touch / pen drags in tier rows: sideways swipe picks the tile up immediately. */
export class SidewaysPointerSensor extends PointerSensor {
  static activators: typeof PointerSensor.activators = [
    {
      eventName: 'onPointerDown',
      handler: ({ nativeEvent: event }, options) => {
        if (event.pointerType === 'mouse' || !event.isPrimary || event.button !== 0) return false;
        const target = event.target as HTMLElement | null;
        if (target?.closest(TRAY_SELECTOR)) return false;
        options.onActivation?.({ event });
        return true;
      },
    },
  ];
}

/** Touch drags inside the sticky unranked tray: press-and-hold (~140ms) lifts for dragging UP into tiers. */
export class TrayTouchSensor extends TouchSensor {
  static activators: typeof TouchSensor.activators = [
    {
      eventName: 'onTouchStart',
      handler: ({ nativeEvent: event }, options) => {
        if (event.touches.length > 1) return false;
        const target = event.target as HTMLElement | null;
        if (!target?.closest(TRAY_SELECTOR)) return false;
        options.onActivation?.({ event });
        return true;
      },
    },
  ];
}
