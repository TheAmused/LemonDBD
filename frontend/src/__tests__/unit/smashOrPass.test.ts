// frontend/src/__tests__/unit/smashOrPass.test.ts
// frontend/src/utils/__tests__/smashOrPass.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { SmashSounds } from '@/utils/../components/smash-or-pass/SmashSoundEffects';
import { localizedProfile } from '../../utils/entityProfile';
import type { EntityMetadata, EntityItem, RosterItem } from '../../types/smashOrPass';
import {
  cleanWatermark,
  sampleFlags,
  resolveWatermarks,
} from '../../utils/smashWatermarks';

test('SmashOrPass: Types & Roster/Entity Contracts', async (t) => {
  await t.test('RosterItem uses direct name and description without name_i18n_key', () => {
    const roster: RosterItem = {
      id: 'canon',
      slug: 'canon',
      name: 'Dead by Daylight: Fog Canon',
      description: 'Official 98 Characters',
      theme_color: '#ff0055',
      category: 'DBD Canon',
      is_nsfw: false,
      is_active: true,
      entity_count: 98,
    };
    assert.strictEqual(roster.name, 'Dead by Daylight: Fog Canon');
    assert.strictEqual(roster.description, 'Official 98 Characters');
    assert.strictEqual('name_i18n_key' in roster, false);
    assert.strictEqual('description_i18n_key' in roster, false);
  });

  await t.test('EntityItem supports dual-identity watermarks and real_name', () => {
    const entity: EntityItem = {
      id: 'e-onryo',
      roster_id: 'canon',
      slug: 'the_onryo',
      name: 'The Onryō',
      real_name: 'Sadako Yamamura',
      watermark_left: 'THE ONRYŌ',
      watermark_right: 'SADAKO',
      role: 'Killer',
      gender: 'female',
    };
    assert.strictEqual(entity.real_name, 'Sadako Yamamura');
    assert.strictEqual(entity.watermark_left, 'THE ONRYŌ');
    assert.strictEqual(entity.watermark_right, 'SADAKO');
  });
});


test('SmashOrPass: Tier Classification & Calculations', async (t) => {
  await t.test('calculates correct tier bands for smash rates', () => {
    const getTier = (rate: number) => {
      if (rate >= 85) return 'God Tier';
      if (rate >= 65) return 'Fatal Attraction';
      if (rate >= 40) return 'Friendzone';
      return 'Eldritch Void';
    };

    assert.strictEqual(getTier(95), 'God Tier');
    assert.strictEqual(getTier(85), 'God Tier');
    assert.strictEqual(getTier(75), 'Fatal Attraction');
    assert.strictEqual(getTier(65), 'Fatal Attraction');
    assert.strictEqual(getTier(50), 'Friendzone');
    assert.strictEqual(getTier(40), 'Friendzone');
    assert.strictEqual(getTier(30), 'Eldritch Void');
    assert.strictEqual(getTier(0), 'Eldritch Void');
  });

  await t.test('handles edge case zero votes without NaN', () => {
    const totalVotes = 0;
    const smashCount = 0;
    const rate = totalVotes > 0 ? (smashCount / totalVotes) * 100 : 50;
    assert.strictEqual(rate, 50);
  });
});


test('SmashOrPass: Localized Profile Resolution', async (t) => {
  const meta: EntityMetadata = {
    archetype: 'The Brooding Beach Jock',
    bio: 'Sun, sand, and unresolved issues.',
    tagline: 'He will carry you off the beach. Eventually.',
    quote: '"Plants do not judge."',
    meme: 'brooding_jock.gif',
    turn_on: 'Someone who can keep up',
    dealbreaker: 'Sunscreen refusers',
    dating_vibe: 'Warm outside, storm inside',
    red_flags: ['Emotionally unavailable before noon'],
    green_flags: ['Loyal', 'Strong swimmer'],
    // A locale only carries the fields that actually DIFFER from English.
    translations: {
      pl: { quote: '„Rośliny cię nie oceniają.”', red_flags: ['Niedostępny emocjonalnie'] },
    },
  };

  await t.test('returns the English profile verbatim for en', () => {
    const profile = localizedProfile(meta, 'en');
    assert.strictEqual(profile.quote, '"Plants do not judge."');
    assert.deepStrictEqual(profile.green_flags, ['Loyal', 'Strong swimmer']);
  });

  await t.test('overlays only the fields the locale actually overrides', () => {
    const profile = localizedProfile(meta, 'pl');
    assert.strictEqual(profile.quote, '„Rośliny cię nie oceniają.”');
    assert.deepStrictEqual(profile.red_flags, ['Niedostępny emocjonalnie']);
    // Absent in translations.pl, so it falls back to English — the only fallback left.
    assert.strictEqual(profile.bio, 'Sun, sand, and unresolved issues.');
    assert.deepStrictEqual(profile.green_flags, ['Loyal', 'Strong swimmer']);
  });

  await t.test('falls back to English for a locale with no overrides at all', () => {
    const profile = localizedProfile(meta, 'ja');
    assert.strictEqual(profile.quote, '"Plants do not judge."');
    assert.strictEqual(profile.archetype, 'The Brooding Beach Jock');
  });

  await t.test('returns a fully populated profile for missing metadata', () => {
    const profile = localizedProfile(undefined, 'de');
    assert.strictEqual(profile.bio, '');
    assert.deepStrictEqual(profile.red_flags, []);
  });
});


test('SmashOrPass: Sound Effects & Web Audio Synthesizer', async (t) => {
  await t.test('SmashSounds methods can be invoked safely in test environment', () => {
    assert.doesNotThrow(() => SmashSounds.playSmashSound());
    assert.doesNotThrow(() => SmashSounds.playPassSound());
    assert.doesNotThrow(() => SmashSounds.playFlipSound());
    assert.doesNotThrow(() => SmashSounds.playHeartbeat(1.0));
    assert.doesNotThrow(() => SmashSounds.playHoverTick());
    assert.doesNotThrow(() => SmashSounds.playSensualHover());
    assert.doesNotThrow(() => SmashSounds.playSadHover());
    assert.doesNotThrow(() => SmashSounds.playCardGrabSound());
  });

  await t.test('SmashSounds mute state toggles correctly', () => {
    const initial = SmashSounds.getIsMuted();
    const toggled = SmashSounds.toggleMute();
    assert.strictEqual(toggled, !initial);
    SmashSounds.toggleMute(); // restore
  });

  await t.test('SmashSounds BGM controls can be invoked without throw', () => {
    assert.doesNotThrow(() => SmashSounds.startBgm());
    assert.doesNotThrow(() => SmashSounds.stopBgm());
    assert.doesNotThrow(() => SmashSounds.toggleBgm());
    SmashSounds.stopBgm();
  });
});


test('SmashOrPass: Roster Carousel Navigation & Normalization', async (t) => {
  const normalizeIndex = (idx: number, N: number): number => {
    if (N === 0) return 0;
    return ((Math.round(idx) % N) + N) % N;
  };

  const stepPrev = (current: number): number => Math.round(current) - 1;
  const stepNext = (current: number): number => Math.round(current) + 1;

  await t.test('steps left and right accurately with wrap-around normalization', () => {
    const N = 6;
    let center = 0;

    // Step Left from 0 -> -1 -> normalized to 5
    center = stepPrev(center);
    assert.strictEqual(center, -1);
    assert.strictEqual(normalizeIndex(center, N), 5);

    // Step Left again -> -2 -> normalized to 4
    center = stepPrev(center);
    assert.strictEqual(center, -2);
    assert.strictEqual(normalizeIndex(center, N), 4);

    // Step Right -> -1 -> normalized to 5
    center = stepNext(center);
    assert.strictEqual(center, -1);
    assert.strictEqual(normalizeIndex(center, N), 5);

    // Step Right -> 0 -> normalized to 0
    center = stepNext(center);
    assert.strictEqual(center, 0);
    assert.strictEqual(normalizeIndex(center, N), 0);

    // Step Right -> 1 -> normalized to 1
    center = stepNext(center);
    assert.strictEqual(center, 1);
    assert.strictEqual(normalizeIndex(center, N), 1);
  });

  await t.test('rounds fractional drag positions before stepping', () => {
    assert.strictEqual(stepPrev(1.4), 0);
    assert.strictEqual(stepNext(1.4), 2);
    assert.strictEqual(stepPrev(-0.8), -2);
    assert.strictEqual(stepNext(-0.8), 0);
  });

  await t.test('calculates continuous shortest signed angular differences in 3D modulo ring', () => {
    const N = 6;
    const calcDiff = (i: number, visualIndex: number) => {
      return ((i - visualIndex) % N + N * 1.5) % N - (N / 2);
    };

    // When visualIndex is 0:
    assert.strictEqual(calcDiff(0, 0), 0);
    assert.strictEqual(calcDiff(1, 0), 1);
    assert.strictEqual(calcDiff(2, 0), 2);
    assert.strictEqual(calcDiff(5, 0), -1);
    assert.strictEqual(calcDiff(4, 0), -2);

    // When visualIndex is continuously interpolating 0.5:
    assert.strictEqual(calcDiff(0, 0.5), -0.5);
    assert.strictEqual(calcDiff(1, 0.5), 0.5);
    assert.strictEqual(calcDiff(5, 0.5), -1.5);
  });
});


test('SmashOrPass: Dynamic Flag Sampling Logic', async (t) => {
  await t.test('keeps all flags when pool length <= 3', () => {
    const emptyPool: string[] = [];
    assert.deepStrictEqual(sampleFlags(emptyPool), []);

    const singlePool = ['Flag 1'];
    assert.deepStrictEqual(sampleFlags(singlePool), ['Flag 1']);

    const twoPool = ['Flag 1', 'Flag 2'];
    assert.deepStrictEqual(sampleFlags(twoPool), ['Flag 1', 'Flag 2']);

    const threePool = ['Flag 1', 'Flag 2', 'Flag 3'];
    assert.deepStrictEqual(sampleFlags(threePool), ['Flag 1', 'Flag 2', 'Flag 3']);
  });

  await t.test('samples 2 to 3 items when pool length > 3', () => {
    const fivePool = ['Flag 1', 'Flag 2', 'Flag 3', 'Flag 4', 'Flag 5'];
    for (let i = 0; i < 20; i++) {
      const sampled = sampleFlags(fivePool);
      assert.ok(sampled.length === 2 || sampled.length === 3, `Sampled length ${sampled.length} should be 2 or 3`);
      for (const flag of sampled) {
        assert.ok(fivePool.includes(flag), `Sampled flag ${flag} must be from original pool`);
      }
      // Ensure all items in sample are unique
      const uniqueSet = new Set(sampled);
      assert.strictEqual(uniqueSet.size, sampled.length, 'Sampled items must be unique');
    }
  });
});


test('SmashOrPass: Dual-Identity Watermarks & Clamping Helper', async (t) => {
  await t.test('cleans parentheses and quotes from watermarks', () => {
    assert.strictEqual(cleanWatermark('The Shape ("Michael Myers")'), 'The Shape Michael Myers');
    assert.strictEqual(cleanWatermark('Sadako (Yamamura)'), 'Sadako Yamamura');
  });

  await t.test('fits long watermarks with FitText instead of fixed size tiers', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../../components/smash-or-pass/FloatingLoreScattered.tsx', import.meta.url), 'utf8');
    assert.match(src, /<FitText[\s\S]*?maxLines=\{[2-4]\}/);
    assert.match(src, /wrapFirst/);
    assert.match(src, /text-center/);
    assert.doesNotMatch(src, /whitespace-nowrap/);
  });

  await t.test('uses explicit watermark_left and watermark_right when provided', () => {
    const entity: EntityItem = {
      id: 'e-1',
      roster_id: 'r-1',
      slug: 'the_onryo',
      name: 'The Onryō',
      real_name: 'Sadako Yamamura',
      watermark_left: 'THE ONRYŌ',
      watermark_right: 'SADAKO',
      role: 'Killer',
      gender: 'female',
    };
    const { leftWatermark, rightWatermark } = resolveWatermarks(entity);
    assert.strictEqual(leftWatermark, 'THE ONRYŌ');
    assert.strictEqual(rightWatermark, 'SADAKO');
  });

  await t.test('falls back gracefully for survivor and killer without explicit watermarks', () => {
    const survivor: EntityItem = {
      id: 'e-2',
      roster_id: 'r-1',
      slug: 'dwight_fairfield',
      name: 'Dwight Fairfield',
      role: 'Survivor',
      gender: 'male',
    };
    const resSurv = resolveWatermarks(survivor);
    assert.strictEqual(resSurv.leftWatermark, 'Dwight');
    assert.strictEqual(resSurv.rightWatermark, 'Fairfield');

    const killer: EntityItem = {
      id: 'e-3',
      roster_id: 'r-1',
      slug: 'the_trapper',
      name: 'The Trapper',
      real_name: 'Evan MacMillan',
      role: 'Killer',
      gender: 'male',
    };
    const resKiller = resolveWatermarks(killer);
    assert.strictEqual(resKiller.leftWatermark, 'The Trapper');
    assert.strictEqual(resKiller.rightWatermark, 'Evan MacMillan');
  });

  await t.test('ensures neither side is ever empty', () => {
    const fallbackKiller: EntityItem = {
      id: 'e-4',
      roster_id: 'r-1',
      slug: 'unknown_killer',
      name: '',
      role: 'Killer',
      gender: 'all',
    };
    const resEmpty = resolveWatermarks(fallbackKiller);
    assert.strictEqual(resEmpty.leftWatermark, 'KILLER');
    assert.strictEqual(resEmpty.rightWatermark, 'KILLER');
  });
});
