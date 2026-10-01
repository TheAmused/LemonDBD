import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChallengeShareUrl,
  decodeChallengeShare,
  encodeChallengeShare,
  readChallengeFragment,
} from '@/utils/minigames/shareLink';
import type { ChallengeDefinition } from '@/types/minigame';

const CHALLENGE: ChallengeDefinition = {
  title: 'My Fog Trial',
  description: 'Two rounds',
  game_mode: 'custom',
  rounds: [
    { round_number: 1, mode: 'realm_guesser', target_id: 1, target_type: 'realm', max_attempts: 4 },
    { round_number: 2, mode: 'classic_killer', target_id: 7, max_attempts: 6 },
  ],
};

test('a challenge survives a round trip through the URL fragment', async () => {
  const payload = await encodeChallengeShare(CHALLENGE);
  const url = buildChallengeShareUrl('https://lemon.example', payload);
  assert.ok(url.startsWith('https://lemon.example/minigames/play#c='));
  assert.ok(!url.includes('?'), 'payload must not be a query parameter (those reach the server)');

  const back = await decodeChallengeShare(readChallengeFragment(new URL(url).hash)!);
  assert.equal(back.title, 'My Fog Trial');
  assert.equal(back.rounds.length, 2);
  assert.equal(back.rounds[1].mode, 'classic_killer');
  assert.match(String(back.id), /^shared_/);
});

test('the same challenge always gets the same id', async () => {
  const a = await decodeChallengeShare(await encodeChallengeShare(CHALLENGE));
  const b = await decodeChallengeShare(await encodeChallengeShare(CHALLENGE));
  assert.equal(a.id, b.id);
});

test('garbage and unsupported modes are rejected', async () => {
  await assert.rejects(decodeChallengeShare('z.not-base64!!'));
  await assert.rejects(decodeChallengeShare('x.abc'));
  const bad = await encodeChallengeShare({
    ...CHALLENGE,
    rounds: [{ round_number: 1, mode: 'evil' as never, max_attempts: 1 }],
  });
  await assert.rejects(decodeChallengeShare(bad));
});

test('a link without a payload yields null', () => {
  assert.equal(readChallengeFragment(''), null);
  assert.equal(readChallengeFragment('#foo=bar'), null);
});
