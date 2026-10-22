// frontend/src/__tests__/unit/slotMachineSpin.test.ts
//
// A slot-machine spin must register the reels it waits for: without that, handleReelTransitionEnd
// ignores every landing, the tick sound never stops and the machine never leaves "spinning".
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(
  path.join(process.cwd(), 'src/components/generator/modes/slot-machine/useSlotMachine.ts'),
  'utf-8'
);
const spinReels = src.slice(src.indexOf('const spinReels ='), src.indexOf('const handleReelTransitionEnd ='));

describe('slot machine spin', () => {
  it('registers every spinning reel and the completion callback', () => {
    assert.match(spinReels, /pendingDoneRef\.current = \{ remaining: new Set\(ids\), onAllDone \}/);
  });

  it('keeps the fallback timer so it can be cleared on unmount', () => {
    assert.match(spinReels, /fallbackTimerRef\.current = setTimeout\(/);
    assert.match(src, /if \(fallbackTimerRef\.current\) clearTimeout\(fallbackTimerRef\.current\);\s*\r?\n\s*\};\s*\r?\n\s*\}, \[\]\);/);
  });
});
