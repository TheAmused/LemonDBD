// frontend/src/utils/__tests__/smashOrPass.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  CHARACTER_ROSTER,
  ALL_CHARACTER_SLUGS,
  getCharacterRosterItem,
} from '../../components/smash-or-pass/characterRoster';
import {
  getLocalizedCharacterRoster,
  ROSTER_TRANSLATIONS,
} from '../../components/smash-or-pass/rosterTranslations';
import {
  SMASH_OR_PASS_EDITIONS,
  getEdition,
} from '../../components/smash-or-pass/editionsRegistry';

test('SmashOrPass: Character Roster Integrity', async (t) => {
  await t.test('contains complete 98-character roster of all killers and survivors', () => {
    assert.strictEqual(ALL_CHARACTER_SLUGS.length, 98, 'Must have exactly 98 characters in canonical slugs');
    const rosterKeys = Object.keys(CHARACTER_ROSTER);
    assert.ok(rosterKeys.length >= 98, `Expected at least 98 roster characters, got ${rosterKeys.length}`);

    // Verify key iconic characters exist
    assert.ok(CHARACTER_ROSTER['ada_wong'], 'Ada Wong must exist');
    assert.ok(CHARACTER_ROSTER['leon_scott_kennedy'], 'Leon S. Kennedy must exist');
    assert.ok(CHARACTER_ROSTER['sable_ward'], 'Sable Ward must exist');
    assert.ok(CHARACTER_ROSTER['the_huntress'], 'The Huntress must exist');
    assert.ok(CHARACTER_ROSTER['the_executioner'], 'Pyramid Head must exist');
    assert.ok(CHARACTER_ROSTER['the_xenomorph'], 'Xenomorph must exist');
    assert.ok(CHARACTER_ROSTER['the_animatronic'], 'Springtrap must exist');
    assert.ok(CHARACTER_ROSTER['the_lich'], 'Vecna must exist');
  });

  await t.test('all characters have valid gender and role classifications', () => {
    const validRoles = new Set(['Killer', 'Survivor']);
    const validGenders = new Set(['female', 'male', 'monster_other']);

    Object.values(CHARACTER_ROSTER).forEach((char) => {
      assert.ok(validRoles.has(char.role), `Invalid role '${char.role}' on ${char.slug}`);
      assert.ok(validGenders.has(char.gender), `Invalid gender '${char.gender}' on ${char.slug}`);
      assert.ok(char.name.length > 0, `Empty name on ${char.slug}`);
      assert.ok(char.bio.length > 0, `Empty bio on ${char.slug}`);
      assert.ok(char.greenFlags.length > 0, `Empty greenFlags on ${char.slug}`);
      assert.ok(char.redFlags.length > 0, `Empty redFlags on ${char.slug}`);
    });
  });

  await t.test('gender filtering returns expected non-empty subsets', () => {
    const all = Object.values(CHARACTER_ROSTER);
    const females = all.filter((c) => c.gender === 'female');
    const males = all.filter((c) => c.gender === 'male');
    const monsters = all.filter((c) => c.gender === 'monster_other');

    assert.ok(females.length >= 25, `Expected >= 25 females, got ${females.length}`);
    assert.ok(males.length >= 40, `Expected >= 40 males, got ${males.length}`);
    assert.ok(monsters.length >= 6, `Expected >= 6 monsters, got ${monsters.length}`);
  });

  await t.test('getCharacterRosterItem handles known and unknown slugs gracefully', () => {
    const ada = getCharacterRosterItem('ada_wong');
    assert.strictEqual(ada.name, 'Ada Wong');
    assert.strictEqual(ada.role, 'Survivor');
    assert.strictEqual(ada.gender, 'female');

    const unknown = getCharacterRosterItem('some_custom_killer_99');
    assert.strictEqual(unknown.role, 'Killer');
    assert.strictEqual(unknown.gender, 'monster_other');
    assert.ok(unknown.bio.length > 0);
  });

  await t.test('getLocalizedCharacterRoster returns translated fields for Polish, Spanish, German, Japanese, and English', () => {
    // English default
    const adaEn = getLocalizedCharacterRoster('ada_wong', 'en');
    assert.strictEqual(adaEn.title, 'The Enigmatic Operative');

    // Polish translation
    const adaPl = getLocalizedCharacterRoster('ada_wong', 'pl');
    assert.strictEqual(adaPl.title, 'Enigmatyczna Agentka');
    assert.ok(adaPl.bio.includes('Tajna agentka'));

    // Spanish translation
    const adaEs = getLocalizedCharacterRoster('ada_wong', 'es');
    assert.strictEqual(adaEs.title, 'La Agente Enigmática');

    // German translation
    const adaDe = getLocalizedCharacterRoster('ada_wong', 'de');
    assert.strictEqual(adaDe.title, 'Die Rätselhafte Agentin');

    // Japanese translation
    const adaJa = getLocalizedCharacterRoster('ada_wong', 'ja');
    assert.strictEqual(adaJa.title, '謎多きスパイ');
  });

  await t.test('Multi-Edition Registry provides valid edition configurations', () => {
    const canon = getEdition('canon');
    assert.strictEqual(canon.id, 'canon');
    assert.strictEqual(canon.characters.length, 98);

    const hoy = getEdition('hooked_on_you');
    assert.strictEqual(hoy.id, 'hooked_on_you');
    assert.strictEqual(hoy.characters.length, 8);

    const legendary = getEdition('legendary_cosplay');
    assert.strictEqual(legendary.id, 'legendary_cosplay');
    assert.strictEqual(legendary.characters.length, 12);
  });
});

test('SmashOrPass: API Service Layer & Types', async (t) => {
  const {
    getSessionId,
    fetchRosters,
    fetchRosterFeed,
    castVote,
    fetchLeaderboard,
    resetSessionVotes,
    resetUserVotes,
    fetchDynamicTranslations,
  } = await import('../../services/smashApi');

  await t.test('getSessionId returns valid session identifier', () => {
    const id = getSessionId();
    assert.ok(typeof id === 'string');
    assert.ok(id.length > 0);
  });

  await t.test('fetchRosters sends request and returns roster array', async () => {
    const originalFetch = globalThis.fetch;
    const mockRosters = [
      {
        id: 'r-1',
        slug: 'canon',
        name_i18n_key: 'smashOrPass.rosters.canon.name',
        description_i18n_key: 'smashOrPass.rosters.canon.desc',
        theme_color: '#ff0055',
        category: 'DBD Canon',
        is_nsfw: false,
        is_active: true,
        entity_count: 98,
        total_votes: 120,
      },
    ];

    globalThis.fetch = async (url: any, opts: any) => {
      assert.ok(String(url).includes('/api/v1/smash-or-pass/rosters'));
      return {
        ok: true,
        json: async () => ({ data: mockRosters, count: 1 }),
      } as any;
    };

    try {
      const rosters = await fetchRosters(true);
      assert.strictEqual(rosters.length, 1);
      assert.strictEqual(rosters[0].slug, 'canon');
      assert.strictEqual(rosters[0].entity_count, 98);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('fetchRosterFeed queries feed with session header', async () => {
    const originalFetch = globalThis.fetch;
    const mockFeed = {
      roster: { id: 'r-1', slug: 'canon' },
      entities: [
        {
          id: 'e-1',
          roster_id: 'r-1',
          slug: 'ada_wong',
          name: 'Ada Wong',
          role: 'Survivor',
          gender: 'female',
          metadata: { chaos_score: 75, danger_level: 'Moderate' },
        },
      ],
      total_remaining: 97,
    };

    globalThis.fetch = async (url: any, opts: any) => {
      assert.ok(String(url).includes('/api/v1/smash-or-pass/rosters/canon/feed'));
      assert.ok(opts.headers['X-Session-ID']);
      return {
        ok: true,
        json: async () => ({ data: mockFeed }),
      } as any;
    };

    try {
      const feed = await fetchRosterFeed('canon', { role: 'Survivor', limit: 20 });
      assert.strictEqual(feed.total_remaining, 97);
      assert.strictEqual(feed.entities.length, 1);
      assert.strictEqual(feed.entities[0].name, 'Ada Wong');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('castVote posts vote and returns result', async () => {
    const originalFetch = globalThis.fetch;
    const mockVoteResult = {
      id: 'e-1',
      slug: 'ada_wong',
      name: 'Ada Wong',
      role: 'Survivor',
      gender: 'female',
      smash_count: 5,
      pass_count: 1,
      total_votes: 6,
      smash_rate: 83.3,
    };

    globalThis.fetch = async (url: any, opts: any) => {
      assert.ok(String(url).includes('/api/v1/smash-or-pass/vote'));
      assert.strictEqual(opts.method, 'POST');
      const body = JSON.parse(opts.body);
      assert.strictEqual(body.entity_id, 'e-1');
      assert.strictEqual(body.vote_type, 'smash');
      return {
        ok: true,
        json: async () => ({ data: mockVoteResult, status: 'success' }),
      } as any;
    };

    try {
      const res = await castVote('e-1', 'smash', 'ada_wong');
      assert.strictEqual(res.status, 'success');
      assert.strictEqual(res.data.smash_count, 5);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('fetchLeaderboard returns ranked items', async () => {
    const originalFetch = globalThis.fetch;
    const mockLeaderboard = [
      {
        id: 'e-1',
        slug: 'ada_wong',
        name: 'Ada Wong',
        role: 'Survivor',
        gender: 'female',
        tier: 'God Tier',
        rank: 1,
        smash_rate: 92.5,
      },
    ];

    globalThis.fetch = async (url: any, opts: any) => {
      assert.ok(String(url).includes('/api/v1/smash-or-pass/rosters/canon/leaderboard'));
      return {
        ok: true,
        json: async () => ({ data: mockLeaderboard, count: 1, roster: 'canon' }),
      } as any;
    };

    try {
      const leaderboard = await fetchLeaderboard('canon', { sortBy: 'smash_rate' });
      assert.strictEqual(leaderboard.length, 1);
      assert.strictEqual(leaderboard[0].tier, 'God Tier');
      assert.strictEqual(leaderboard[0].rank, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('resetSessionVotes and resetUserVotes handle reset endpoints', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: any, opts: any) => {
      return {
        ok: true,
        json: async () => ({ status: 'success', reset_count: 5 }),
      } as any;
    };

    try {
      const sessionReset = await resetSessionVotes('canon');
      assert.strictEqual(sessionReset.reset_count, 5);
      const userReset = await resetUserVotes('canon');
      assert.strictEqual(userReset.reset_count, 5);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('fetchDynamicTranslations fetches remote localization map', async () => {
    const originalFetch = globalThis.fetch;
    const mockDict = {
      'smashOrPass.ui.smash': 'Smash',
      'smashOrPass.ui.pass': 'Pass',
    };

    globalThis.fetch = async (url: any, opts: any) => {
      assert.ok(String(url).includes('/api/v1/smash-or-pass/translations?locale=en'));
      return {
        ok: true,
        json: async () => ({ data: mockDict, locale: 'en' }),
      } as any;
    };

    try {
      const translations = await fetchDynamicTranslations('en');
      assert.strictEqual(translations['smashOrPass.ui.smash'], 'Smash');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test('SmashOrPass: Multi-Locale i18n Key Synchronization', async (t) => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const locales = ['en', 'es', 'de', 'ja', 'pl'];
  const dictionaries: Record<string, any> = {};

  for (const loc of locales) {
    const p = path.resolve(process.cwd(), `src/locales/${loc}.json`);
    const raw = fs.readFileSync(p, 'utf-8');
    dictionaries[loc] = JSON.parse(raw);
  }

  await t.test('all 5 locale files have complete smashOrPass sections and required keys', () => {
    const requiredTopKeys = [
      'title',
      'subtitle',
      'smash',
      'pass',
      'superSmash',
      'leaderboard',
      'stats',
      'reset',
      'keybindings',
      'hint',
      'godTier',
      'fatalAttraction',
      'friendzone',
      'eldritchVoid',
      'chaosRating',
      'dangerLevel',
      'archetype',
      'compatibilityScore',
      'communitySmashRate',
      'totalVotes',
      'traits',
      'all',
      'allRoles',
      'survivors',
      'killers',
      'allGenders',
      'female',
      'femaleOnly',
      'male',
      'maleOnly',
      'monsters',
    ];

    const requiredRosters = ['canon', 'hoy', 'legendary', 'cyberpunk', 'anime', 'gothic'];

    for (const loc of locales) {
      const sop = dictionaries[loc].smashOrPass;
      assert.ok(sop, `Locale ${loc} missing smashOrPass section`);

      for (const key of requiredTopKeys) {
        assert.ok(sop[key], `Locale ${loc} missing top-level key '${key}'`);
      }

      assert.ok(sop.rosters, `Locale ${loc} missing 'rosters' section`);
      for (const r of requiredRosters) {
        assert.ok(sop.rosters[r], `Locale ${loc} missing roster '${r}'`);
        assert.ok(sop.rosters[r].name, `Locale ${loc} missing roster '${r}.name'`);
        assert.ok(sop.rosters[r].desc, `Locale ${loc} missing roster '${r}.desc'`);
      }

      assert.ok(sop.controls, `Locale ${loc} missing 'controls' section`);
      assert.ok(sop.tiers, `Locale ${loc} missing 'tiers' section`);
      assert.ok(sop.modals, `Locale ${loc} missing 'modals' section`);
      assert.ok(sop.notifications, `Locale ${loc} missing 'notifications' section`);
      assert.ok(sop.empty, `Locale ${loc} missing 'empty' section`);
    }
  });
});
