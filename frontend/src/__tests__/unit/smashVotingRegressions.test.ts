// frontend/src/__tests__/unit/smashVotingRegressions.test.ts
// Source-level guards (no component harness here) for 2026-10-19 review M3/M4/L15.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const HUB = path.join(__dirname, '..', '..', 'components', 'smash-or-pass', 'hub');
const read = (name: string) => fs.readFileSync(path.join(HUB, name), 'utf-8');

test('a cancelled card exit releases the vote guard (no lock until reload)', () => {
  const src = read('useSmashVoting.ts');
  assert.match(src, /useEffect\(\(\) => \{\s*if \(!isExiting\) voteInProgressRef\.current = false;\s*\}, \[isExiting\]\);/);
});

test('a vote sync for a roster the viewer already left never replaces the history', () => {
  const src = read('useSmashVotes.ts');
  const guard = src.indexOf('if (isStale()) return;');
  const write = src.indexOf('setVoteHistory(currentVotes);');
  assert.ok(guard !== -1 && write !== -1 && guard < write, 'stale check must come before the history is replaced');
  assert.match(src, /activeRosterRef\.current !== rosterSlug/);
});

test('a failed backend reset keeps the local history (it would come back on the next sync)', () => {
  const src = read('useSmashVotes.ts');
  assert.match(src, /Promise\.allSettled\(resets\)/);
  const bail = src.indexOf('return false;');
  const clear = src.indexOf('clearStoredVotes(selectedRosterSlug);');
  assert.ok(bail !== -1 && bail < clear);
});
