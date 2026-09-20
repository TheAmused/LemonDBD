// frontend/src/__tests__/unit/chaosWheelModalCloseConsistency.test.ts
//
// Regression guard for ChaosWheelModal.tsx: the backdrop click and the X
// button must both close the modal identically (call the same onClose
// prop), the in-panel "Close" button and effect-pill explanation text were
// intentionally removed from the spin-result card (clearing a curse is the
// only action left there -- the X/backdrop already close the modal), and
// there must be exactly one spin action ("Spin Chaos Wheel!"), not a
// separate "Spin Again" that re-spins a different way. No DOM/component
// render harness exists in this repo's test setup, so this is verified at
// the source level -- directly checking the wiring, which is the actual
// thing that was found to be inconsistent, not incidental markup.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const MODAL_PATH = path.resolve(__dirname, '../../components/ChaosWheelModal.tsx');
const src = fs.readFileSync(MODAL_PATH, 'utf-8');

test('backdrop click closes the modal via onClose', () => {
  assert.match(
    src,
    /aria-labelledby="chaos-modal-title"[\s\S]{0,120}onClick=\{onClose\}/,
    'the modal backdrop is no longer wired to call onClose directly on click'
  );
});

test('the X button closes the modal via onClose', () => {
  const xButtonBlock = src.match(/<button[\s\S]{0,80}onClick=\{onClose\}[\s\S]{0,120}aria-label=\{dict\?\.modal\?\.close\}/);
  assert.ok(xButtonBlock, 'the X (close) button is no longer wired to call onClose directly');
});

test('the in-panel "Close" button (chaosApplyAndClose) was removed from the spin-result card', () => {
  assert.doesNotMatch(
    src,
    /chaosApplyAndClose/,
    'a "Close" button referencing chaosApplyAndClose reappeared in the result card -- it was intentionally removed since the X/backdrop already close the modal'
  );
});

test('the effect-pill explanation text (locWon.effect) was removed from the spin-result card', () => {
  assert.doesNotMatch(
    src,
    /locWon\.effect/,
    'the effect pill reappeared in the result card -- it was intentionally removed'
  );
});

test('onClose is called by exactly two distinct UI affordances (backdrop, X) -- not more, not fewer, and none of them call a different function', () => {
  const onCloseCallSites = (src.match(/onClick=\{onClose\}/g) || []).length;
  assert.strictEqual(onCloseCallSites, 2, `expected exactly 2 onClick={onClose} call sites (backdrop, X button), found ${onCloseCallSites}`);
});

test('there is exactly ONE spin action ("Spin Chaos Wheel!" / spinChaosWheel) -- no separate "Spin Again" that re-spins through a different code path', () => {
  const spinChaosWheelCallSites = (src.match(/onClick=\{spinChaosWheel\}/g) || []).length;
  assert.strictEqual(spinChaosWheelCallSites, 1, `expected exactly 1 button wired to spinChaosWheel, found ${spinChaosWheelCallSites}`);

  // The old chaosSpinAgain locale string may still exist as dead translation
  // data, but it must not be wired to any onClick in this component anymore.
  assert.doesNotMatch(
    src,
    /onClick=\{[^}]*[Ss]pinAgain[^}]*\}/,
    'found a button still wired to a "Spin Again"-style handler -- the duplicate spin-again action regressed'
  );
});

test('SANITY: the call-site-count assertion would catch a close affordance being wired to a different handler (proves it is not vacuous)', () => {
  const lastIdx = src.lastIndexOf('onClick={onClose}');
  assert.ok(lastIdx !== -1);
  const corrupted = src.slice(0, lastIdx) + 'onClick={() => {}}' + src.slice(lastIdx + 'onClick={onClose}'.length);
  const corruptedCallSites = (corrupted.match(/onClick=\{onClose\}/g) || []).length;
  assert.strictEqual(corruptedCallSites, 1);
  assert.notStrictEqual(corruptedCallSites, 2, 'the exactly-2 assertion would NOT have caught a close affordance wired to a different handler -- test is vacuous');
});
