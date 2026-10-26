// frontend/src/__tests__/unit/auth/altchaContract.test.ts
//
// The browser's ALTCHA solver against a challenge the backend really made. fixtures/altchaChallenge.json
// holds a challenge from AltchaService.create_challenge and the payload AltchaService.verify_solution
// accepted for it (recorded by backend/scripts/record_frontend_fixtures.py). If either side changes
// the hashing or the payload fields, the solver's answer stops matching what the server accepts.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { solveAltchaPoW, type AltchaChallenge } from '@/hooks/useAltcha';
import recorded from '../../fixtures/altchaChallenge.json';

describe('ALTCHA: solver vs backend challenge', () => {
  it('solves a backend challenge into exactly the payload the backend accepts', async () => {
    const solution = await solveAltchaPoW(recorded.challenge as AltchaChallenge);
    assert.deepEqual(solution, recorded.accepted);
  });

  it('gives up (null) when the backend number is outside maxnumber', async () => {
    const tooSmall = { ...recorded.challenge, maxnumber: recorded.accepted.number - 1 } as AltchaChallenge;
    if (tooSmall.maxnumber < 0) return; // the recorded number is 0: nothing below it to search
    assert.equal(await solveAltchaPoW(tooSmall), null);
  });
});
