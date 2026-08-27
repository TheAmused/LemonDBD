// frontend/src/__tests__/unit/altcha.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { sha256Hex, solveAltchaPoW, type AltchaChallenge } from '@/hooks/useAltcha';

describe('ALTCHA Proof-of-Work Engine', () => {
  it('sha256Hex computes accurate hexadecimal SHA-256 digest matching Node crypto', async () => {
    const testCases = [
      'hello world',
      'salt1234567890',
      'deadbydaylight_entity_anti_bot',
      '',
    ];

    for (const text of testCases) {
      const expected = crypto.createHash('sha256').update(text).digest('hex');
      const actual = await sha256Hex(text);
      assert.strictEqual(actual, expected, `Hash mismatch for input "${text}"`);
    }
  });

  it('solveAltchaPoW solves SHA-256 challenge within max number bound', async () => {
    const salt = 'random_salt_abc123';
    const secretNum = 42;
    const targetHash = crypto.createHash('sha256').update(`${salt}${secretNum}`).digest('hex');

    const challenge: AltchaChallenge = {
      algorithm: 'SHA-256',
      challenge: targetHash,
      salt: salt,
      maxnumber: 1000,
      signature: 'test_signature_hmac_123',
      expires: Date.now() + 60000,
    };

    const solution = await solveAltchaPoW(challenge, 500);
    assert.ok(solution !== null, 'Solution should not be null');
    assert.strictEqual(solution.number, 42);
    assert.strictEqual(solution.challenge, targetHash);
    assert.strictEqual(solution.salt, salt);
    assert.strictEqual(solution.algorithm, 'SHA-256');
    assert.strictEqual(solution.signature, 'test_signature_hmac_123');
    assert.strictEqual(solution.expires, challenge.expires);

    // Verify cryptographic equation: SHA256(salt + number) == challenge
    const checkHash = crypto.createHash('sha256').update(`${solution.salt}${solution.number}`).digest('hex');
    assert.strictEqual(checkHash, challenge.challenge);
  });

  it('solveAltchaPoW solves edge case where secret number is 0', async () => {
    const salt = 'zero_boundary_salt';
    const secretNum = 0;
    const targetHash = crypto.createHash('sha256').update(`${salt}${secretNum}`).digest('hex');

    const challenge: AltchaChallenge = {
      algorithm: 'SHA-256',
      challenge: targetHash,
      salt: salt,
      maxnumber: 500,
      signature: 'test_sig_0',
      expires: Date.now() + 60000,
    };

    const solution = await solveAltchaPoW(challenge, 100);
    assert.ok(solution !== null);
    assert.strictEqual(solution.number, 0);
  });

  it('solveAltchaPoW solves multi-batch iterations without blocking', async () => {
    const salt = 'multibatch_salt';
    const secretNum = 2750;
    const targetHash = crypto.createHash('sha256').update(`${salt}${secretNum}`).digest('hex');

    const challenge: AltchaChallenge = {
      algorithm: 'SHA-256',
      challenge: targetHash,
      salt: salt,
      maxnumber: 5000,
      signature: 'test_sig_multi',
      expires: Date.now() + 60000,
    };

    // Use small batch size of 500 to force ~6 batch iterations with yield
    const solution = await solveAltchaPoW(challenge, 500);
    assert.ok(solution !== null);
    assert.strictEqual(solution.number, 2750);
  });

  it('solveAltchaPoW returns null if secret number exceeds maxnumber bound', async () => {
    const salt = 'unsolvable_salt';
    const secretNum = 99999;
    const targetHash = crypto.createHash('sha256').update(`${salt}${secretNum}`).digest('hex');

    const challenge: AltchaChallenge = {
      algorithm: 'SHA-256',
      challenge: targetHash,
      salt: salt,
      maxnumber: 500, // Bound is smaller than 99999
      signature: 'test_sig_bound',
      expires: Date.now() + 60000,
    };

    const solution = await solveAltchaPoW(challenge, 100);
    assert.strictEqual(solution, null);
  });
});
