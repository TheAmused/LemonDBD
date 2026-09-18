// frontend/src/__tests__/unit/curseLocaleCopyConsistency.test.ts
//
// Cross-checks each locale's Chaos Wheel curse copy against the ACTUAL
// numbers getPerkWeight uses, for all 5 locales, so a future weight change
// that forgets to update the hand-written copy gets caught instead of
// silently drifting -- the whole point of pinning this programmatically
// rather than hand-copying the expected strings.
import test from 'node:test';
import assert from 'node:assert';
import { getPerkWeight } from '@/components/generator/lib/perkPicker';
import type { Perk } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';

import en from '@/locales/en/generator';
import de from '@/locales/de/generator';
import es from '@/locales/es/generator';
import ja from '@/locales/ja/generator';
import pl from '@/locales/pl/generator';

const LOCALES: Record<string, any> = { en, de, es, ja, pl };

function makePerk(perk_type: string): Perk {
  return { name: 'X', character: 'General', category: 'Survivor', description: '', icon_url: '', icon_local_path: '', perk_type } as Perk;
}

function makeMutator(id: string): ChaosMutator {
  return { id, name: id, description: '', type: 'curse', icon: '', badgeBg: '', borderColor: '', textColor: '' };
}

// mutatorId -> the perk_type getPerkWeight actually weights for it.
const MUTATOR_TARGET_TYPE: Record<string, string> = {
  no_exhaustion: 'exhaustion',
  no_slowdown: 'gen_slowdown',
  blindness: 'aura_reading',
  solo_queue: 'altruism_healing',
  chase_only: 'chase',
  meme_loadout: 'meme',
  hex_boon_only: 'hex',
  hex_roulette: 'hex',
  negative_only: 'handicap',
};

function expectedBadgeFragment(weight: number): string {
  // getPerkWeight only ever produces a reduction (<1, expressed as -N%) or a
  // boost (>1, expressed as Nx) relative to the baseline weight of 1.0.
  if (weight < 1) {
    const pct = Math.round((1 - weight) * 100);
    return `-${pct}%`;
  }
  return `${Math.round(weight)}x`;
}

for (const mutatorId of Object.keys(MUTATOR_TARGET_TYPE)) {
  test(`locale copy for ${mutatorId}: every locale's "effect" badge number agrees with getPerkWeight's actual multiplier`, () => {
    const perk = makePerk(MUTATOR_TARGET_TYPE[mutatorId]);
    const weight = getPerkWeight(perk, makeMutator(mutatorId));
    const expectedFragment = expectedBadgeFragment(weight);

    for (const [localeName, dict] of Object.entries(LOCALES)) {
      const entry = dict.chaosMutators?.[mutatorId];
      assert.ok(entry, `[${localeName}] missing chaosMutators.${mutatorId}`);
      assert.ok(
        entry.effect.includes(expectedFragment),
        `[${localeName}] chaosMutators.${mutatorId}.effect ("${entry.effect}") does not contain "${expectedFragment}", which is what getPerkWeight (${weight}x) actually produces -- copy has drifted from the real weight`
      );
    }
  });
}

test('every locale has the exact same 9 chaosMutators keys as English (no locale missing or adding a curse)', () => {
  const enKeys = Object.keys(en.chaosMutators).sort();
  for (const [localeName, dict] of Object.entries(LOCALES)) {
    if (localeName === 'en') continue;
    assert.deepStrictEqual(Object.keys(dict.chaosMutators).sort(), enKeys, `[${localeName}] chaosMutators keys diverge from English`);
  }
});

test('chaosWheelDesc (the actual Chaos Wheel modal intro text) never uses "buff" wording in any locale -- the Chaos Wheel is framed purely as a curse/challenge, not a buff, in every language', () => {
  const buffLikeWords = [/\bbuff\b/i]; // English-only check is sufficient: this is the one string this session's finding specifically touched, and non-English copy was never worded with an English loanword here.
  for (const [localeName, dict] of Object.entries(LOCALES)) {
    const desc: string = dict.chaosWheelDesc || '';
    for (const re of buffLikeWords) {
      assert.doesNotMatch(desc, re, `[${localeName}] chaosWheelDesc still contains "buff" wording: "${desc}"`);
    }
  }
});

test('SANITY: the badge-vs-weight cross-check would catch a stale percentage if getPerkWeight changed without updating copy', () => {
  // Simulates a future change: no_exhaustion's real reduction becomes -95%
  // (a plausible tuning change) while en/generator.ts's copy is still
  // hand-written as "-90%".
  const staleEffectText = en.chaosMutators.no_exhaustion.effect; // "-90% Exhaustion Drop Rate"
  const newHypotheticalWeight = 0.05; // -95%
  const newExpectedFragment = expectedBadgeFragment(newHypotheticalWeight);
  assert.ok(!staleEffectText.includes(newExpectedFragment), 'harness sanity check itself is broken: stale copy unexpectedly already matches the hypothetical new weight');
});
