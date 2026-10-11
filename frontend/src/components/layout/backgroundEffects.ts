// frontend/src/components/layout/backgroundEffects.ts
//
// THE single source of truth for which page-background effect a route gets.
// AppBackground (mounted once in the locale layout) reads this file; pages never
// mount an effect themselves.
//
// Every page is listed individually below (all 'campfire' today) so a page's background
// can be changed by editing just its line. A route not listed falls back to the default.
// To give a page its own background:
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
 *   { prefix: ['tier-lists'], effect: 'fog' }  (children such as /tier-lists/new keep their own line)
 */
export const ROUTE_BACKGROUND_EFFECTS: ReadonlyArray<{ prefix: readonly string[]; effect: BackgroundEffect }> = [
  { prefix: [], effect: 'campfire' },  // home  /
  { prefix: ['about'], effect: 'campfire' },
  { prefix: ['achievements'], effect: 'campfire' },
  { prefix: ['admin'], effect: 'campfire' },
  { prefix: ['blocked'], effect: 'campfire' },
  { prefix: ['characters'], effect: 'campfire' },  // list + [slug] detail
  { prefix: ['forbidden'], effect: 'campfire' },
  { prefix: ['maps'], effect: 'campfire' },
  { prefix: ['minigames'], effect: 'campfire' },  // hub
  { prefix: ['minigames', 'creator'], effect: 'campfire' },
  { prefix: ['minigames', 'idle'], effect: 'campfire' },
  { prefix: ['minigames', 'play'], effect: 'campfire' },
  { prefix: ['perks'], effect: 'campfire' },
  { prefix: ['privacy-policy'], effect: 'campfire' },
  { prefix: ['randomizer'], effect: 'campfire' },
  { prefix: ['reset-password'], effect: 'campfire' },
  { prefix: ['rules'], effect: 'campfire' },
  { prefix: ['terms-of-service'], effect: 'campfire' },
  { prefix: ['smash-or-pass'], effect: 'campfire' },  // hub
  { prefix: ['smash-or-pass', 'create'], effect: 'campfire' },
  { prefix: ['streaks'], effect: 'campfire' },  // hub
  { prefix: ['streaks', 'challenge'], effect: 'campfire' },
  { prefix: ['streaks', 'killer'], effect: 'campfire' },
  { prefix: ['streaks', 'killer', 'chaos-streak'], effect: 'campfire' },
  { prefix: ['streaks', 'killer', 'gauntlet-streak'], effect: 'campfire' },
  { prefix: ['streaks', 'killer', 'history-streak'], effect: 'campfire' },
  { prefix: ['streaks', 'killer', 'page-streak'], effect: 'campfire' },  // picker + [killer] run
  { prefix: ['streaks', 'survivor'], effect: 'campfire' },
  { prefix: ['streaks', 'survivor', 'gauntlet-streak'], effect: 'campfire' },
  { prefix: ['tier-lists'], effect: 'campfire' },  // list + [slug] view
  { prefix: ['tier-lists', 'custom'], effect: 'campfire' },  // custom/[id]
  { prefix: ['tier-lists', 'new'], effect: 'campfire' },
  { prefix: ['user'], effect: 'campfire' },
  { prefix: ['welcome'], effect: 'campfire' },
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
