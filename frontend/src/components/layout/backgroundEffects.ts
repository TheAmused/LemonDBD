// frontend/src/components/layout/backgroundEffects.ts
//
// THE single source of truth for which page-background effect a route gets.
// AppBackground (mounted once in the locale layout) reads this file; pages never
// mount an effect themselves.
//
// Today every page uses the default, 'campfire'. To give a page its own background:
//   1. build the effect component (a client component that fills its parent);
//   2. add its name to BackgroundEffect and to BACKGROUND_EFFECT_COMPONENTS in
//      AppBackground.tsx;
//   3. add a rule to ROUTE_BACKGROUND_EFFECTS below.
// Nothing else (pages, PageShell, layouts) needs to change.

export type BackgroundEffect = 'campfire';

/** Used by every route that matches no rule below. */
export const DEFAULT_BACKGROUND_EFFECT: BackgroundEffect = 'campfire';

/**
 * Per-route overrides. The longest matching path-segment prefix wins (locale already
 * stripped); `[]` matches the home page only. Example:
 *   { prefix: ['tier-lists'], effect: 'fog' }
 */
export const ROUTE_BACKGROUND_EFFECTS: ReadonlyArray<{ prefix: readonly string[]; effect: BackgroundEffect }> = [];

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
