// frontend/src/components/tier-lists/touchSensors.ts
//
// Two touch behaviours for one board:
//
//  * Pool tiles (the unranked strip scrolls sideways on touch screens, see
//    TierPool): a vertical drag picks the tile up right away -- no hold -- and a
//    sideways swipe scrolls the strip, because the tiles only claim `pan-x`.
//  * Tier-row tiles: the rows area scrolls vertically, so a short hold picks a
//    tile up instead, and a swipe still scrolls.
//
// Mouse and keyboard stay on dnd-kit's MouseSensor / KeyboardSensor.

import { PointerSensor, TouchSensor } from '@dnd-kit/core';

const inPool = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest('[data-tier-pool]') !== null;

/** Touch / pen drags that start on a pool tile. */
export class PoolPointerSensor extends PointerSensor {
  static activators: typeof PointerSensor.activators = [
    {
      eventName: 'onPointerDown',
      handler: ({ nativeEvent: event }, { onActivation }) => {
        if (event.pointerType === 'mouse' || !event.isPrimary || event.button !== 0 || !inPool(event.target)) {
          return false;
        }
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

/** Hold-to-drag for touches that start anywhere except the pool. */
export class RowTouchSensor extends TouchSensor {
  static activators: typeof TouchSensor.activators = [
    {
      eventName: 'onTouchStart',
      handler: ({ nativeEvent: event }, { onActivation }) => {
        if (event.touches.length > 1 || inPool(event.target)) return false;
        onActivation?.({ event });
        return true;
      },
    },
  ];
}
