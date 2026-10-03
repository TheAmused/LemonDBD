// frontend/src/components/layout/backgroundEffects.ts
//
// THE single source of truth for which page-background effect each route gets.
// AppBackground (mounted once in the locale layout) reads this table; pages never
// mount an effect themselves. To change a page's effect, edit ROUTE_BACKGROUND_EFFECTS.

export type BackgroundEffect = 'embers' | 'campfire' | 'fog';

/** Routes that match no rule below. */
export const DEFAULT_BACKGROUND_EFFECT: BackgroundEffect = 'embers';

/**
 * Longest matching path-segment prefix wins (locale already stripped).
 * `[]` is the home page and only matches the home page itself.
 */
export const ROUTE_BACKGROUND_EFFECTS: ReadonlyArray<{ prefix: readonly string[]; effect: BackgroundEffect }> = [
  { prefix: [], effect: 'fog' },
  { prefix: ['about'], effect: 'campfire' },
  { prefix: ['characters'], effect: 'campfire' },
  { prefix: ['maps'], effect: 'campfire' },
  { prefix: ['minigames'], effect: 'campfire' },
  { prefix: ['perks'], effect: 'campfire' },
  { prefix: ['privacy-policy'], effect: 'campfire' },
  { prefix: ['randomizer'], effect: 'campfire' },
  { prefix: ['smash-or-pass', 'create'], effect: 'campfire' },
  { prefix: ['tier-lists'], effect: 'campfire' },
  { prefix: ['user'], effect: 'campfire' },
];

export function backgroundEffectForSegments(segments: readonly string[]): BackgroundEffect {
  let best: BackgroundEffect = DEFAULT_BACKGROUND_EFFECT;
  let bestLen = -1;
  for (const { prefix, effect } of ROUTE_BACKGROUND_EFFECTS) {
    const matches =
      prefix.length === 0
        ? segments.length === 0
        : prefix.length <= segments.length && prefix.every((s, i) => segments[i] === s);
    if (matches && prefix.length > bestLen) {
      best = effect;
      bestLen = prefix.length;
    }
  }
  return best;
}
