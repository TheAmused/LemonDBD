// frontend/src/components/tier-lists/touchSensors.ts
//
// Touch dragging inside areas that scroll vertically (the tier rows and the pool).
//
// Tiles claim only vertical panning (`touch-action: pan-y`), so a vertical swipe
// scrolls the area, and a horizontal one is left to us: a few pixels sideways
// pick the tile up at once, no hold needed. (A hold -- the plain TouchSensor --
// stays available as a second way in.) Mouse and keyboard use dnd-kit's own
// sensors.

import { PointerSensor } from '@dnd-kit/core';

/** Touch / pen drags: activates once the pointer has moved sideways. */
export class SidewaysPointerSensor extends PointerSensor {
  static activators: typeof PointerSensor.activators = [
    {
      eventName: 'onPointerDown',
      handler: ({ nativeEvent: event }, { onActivation }) => {
        if (event.pointerType === 'mouse' || !event.isPrimary || event.button !== 0) return false;
        onActivation?.({ event });
        return true;
      },
    },
  ];
}
