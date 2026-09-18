// frontend/src/__tests__/unit/smashOrPassNsfwGating.test.ts
//
// Coverage for real, end-to-end NSFW content gating on Smash or Pass:
// - utils/nsfwAck.ts: the acknowledgment persistence logic itself (behavioral).
// - SmashOrPassHub.tsx / RosterSelectModal.tsx: source-level regression checks
//   that the gate/badge wiring is actually present, since this repo's frontend
//   test runner (tsx --test) has no component-rendering harness -- the same
//   constraint documented in blindnessCurseTiming.test.ts and
//   chaosWheelModalCloseConsistency.test.ts earlier this session.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  hasAcknowledgedNsfwRoster,
  acknowledgeNsfwRoster,
} from '@/utils/nsfwAck';

function createMockLocalStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  };
}

function resetStorage() {
  globalThis.localStorage = createMockLocalStorage() as unknown as Storage;
}

const HUB_PATH = path.join(__dirname, '..', '..', 'components', 'smash-or-pass', 'SmashOrPassHub.tsx');
const ROSTER_MODAL_PATH = path.join(__dirname, '..', '..', 'components', 'smash-or-pass', 'RosterSelectModal.tsx');

test('nsfwAck: acknowledgment persistence behavior', async (t) => {
  await t.test('a roster with no prior acknowledgment reads as not acknowledged', () => {
    resetStorage();
    assert.strictEqual(hasAcknowledgedNsfwRoster('some_nsfw_roster'), false);
  });

  await t.test('acknowledging a roster makes it read back as acknowledged', () => {
    resetStorage();
    assert.strictEqual(hasAcknowledgedNsfwRoster('some_nsfw_roster'), false);
    acknowledgeNsfwRoster('some_nsfw_roster');
    assert.strictEqual(hasAcknowledgedNsfwRoster('some_nsfw_roster'), true);
  });

  await t.test('acknowledgment persists across separate reads (simulating re-render / reload) using the same storage', () => {
    resetStorage();
    acknowledgeNsfwRoster('legendary_characters');
    // Simulate a fresh page load: nothing but the persisted storage survives.
    assert.strictEqual(hasAcknowledgedNsfwRoster('legendary_characters'), true);
    assert.strictEqual(hasAcknowledgedNsfwRoster('legendary_characters'), true);
  });

  await t.test('acknowledgment is scoped per roster slug -- acknowledging one roster does not acknowledge another', () => {
    resetStorage();
    acknowledgeNsfwRoster('roster_a');
    assert.strictEqual(hasAcknowledgedNsfwRoster('roster_a'), true);
    assert.strictEqual(hasAcknowledgedNsfwRoster('roster_b'), false);
  });

  await t.test('a fresh mock storage (simulating a different browser/device) is not acknowledged even for a previously-acknowledged roster', () => {
    resetStorage();
    acknowledgeNsfwRoster('roster_a');
    assert.strictEqual(hasAcknowledgedNsfwRoster('roster_a'), true);

    resetStorage(); // brand new storage, nothing carried over
    assert.strictEqual(hasAcknowledgedNsfwRoster('roster_a'), false);
  });

  await t.test('empty/falsy roster slug never reads as acknowledged and never throws on ack', () => {
    resetStorage();
    assert.strictEqual(hasAcknowledgedNsfwRoster(''), false);
    assert.doesNotThrow(() => acknowledgeNsfwRoster(''));
  });

  await t.test('gracefully returns false / no-throw when localStorage access itself throws (private-browsing style)', () => {
    const throwingStorage = {
      getItem: () => { throw new Error('storage disabled'); },
      setItem: () => { throw new Error('storage disabled'); },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
    globalThis.localStorage = throwingStorage as unknown as Storage;
    assert.strictEqual(hasAcknowledgedNsfwRoster('roster_a'), false);
    assert.doesNotThrow(() => acknowledgeNsfwRoster('roster_a'));
  });
});

test('SmashOrPassHub: NSFW content gate is wired into the render tree', async (t) => {
  const src = fs.readFileSync(HUB_PATH, 'utf-8');

  await t.test('the gate is keyed off activeRoster.is_nsfw and the acknowledgment state', () => {
    assert.match(
      src,
      /activeRoster\.is_nsfw\s*&&\s*!nsfwAcknowledged/,
      'expected the main arena to branch on activeRoster.is_nsfw && !nsfwAcknowledged before showing any card content'
    );
  });

  await t.test('the gate branch appears before the loading/currentCharacter card-stack branches, not after (so it actually blocks them)', () => {
    const gateIdx = src.indexOf('activeRoster.is_nsfw && !nsfwAcknowledged');
    const loadingIdx = src.indexOf('loading ? (');
    assert.ok(gateIdx !== -1, 'gate condition not found');
    assert.ok(loadingIdx !== -1, 'loading branch not found');
    assert.ok(
      gateIdx < loadingIdx,
      'the NSFW gate must be checked before the loading/card-stack branches so it actually blocks real content, not after'
    );
  });

  await t.test('the confirm button calls the acknowledgment handler, which persists via acknowledgeNsfwRoster', () => {
    assert.match(src, /handleAcknowledgeNsfw/, 'expected a handler wired to the confirm button');
    assert.match(
      src,
      /acknowledgeNsfwRoster\(activeRoster\.slug\)/,
      'expected the handler to actually persist the acknowledgment for the current roster'
    );
    // The onClick wiring itself, not just the handler existing somewhere unused.
    assert.match(
      src,
      /onClick=\{handleAcknowledgeNsfw\}/,
      'expected the gate confirm button to be wired to handleAcknowledgeNsfw via onClick'
    );
  });

  await t.test('acknowledgment state is re-derived from storage whenever the active roster changes (not just set once on mount)', () => {
    assert.match(
      src,
      /useEffect\(\(\) => \{\s*setNsfwAcknowledged\(hasAcknowledgedNsfwRoster\(activeRoster\.slug\)\);\s*\}, \[activeRoster\.slug\]\)/,
      'expected an effect keyed on activeRoster.slug that re-reads acknowledgment from storage on roster switch'
    );
  });

  await t.test(
    'SANITY: removing the gate condition entirely would let currentCharacter render unconditionally for an NSFW roster -- prove the regex actually distinguishes gated from ungated source',
    () => {
      const ungatedSrc = src.replace(
        /\{activeRoster\.is_nsfw && !nsfwAcknowledged \? \([\s\S]*?\) : loading \? \(/,
        '{loading ? ('
      );
      assert.notStrictEqual(ungatedSrc, src, 'the replacement should have actually matched and changed something');
      assert.doesNotMatch(
        ungatedSrc,
        /activeRoster\.is_nsfw\s*&&\s*!nsfwAcknowledged/,
        'after stripping the gate, the gate condition should no longer be present -- proving the earlier assertion would fail against this broken version'
      );
    }
  );
});

test('RosterSelectModal: NSFW rosters are visually marked distinctly in the picker', async (t) => {
  const src = fs.readFileSync(ROSTER_MODAL_PATH, 'utf-8');

  await t.test('an NSFW badge is rendered conditionally on r.is_nsfw', () => {
    assert.match(
      src,
      /\{r\.is_nsfw\s*&&\s*\(/,
      'expected a conditional block gated on r.is_nsfw for the roster card'
    );
  });

  await t.test('the NSFW badge has a stable test id for the gating tests above / any future UI test to hook into', () => {
    assert.match(src, /data-testid="roster-nsfw-badge"/);
  });

  await t.test('the accessible roster label mentions NSFW for a flagged roster (not silently blended in for screen readers either)', () => {
    assert.match(src, /r\.is_nsfw \? ' \(NSFW\)' : ''/);
  });
});
