// frontend/src/__tests__/unit/clipboard.test.ts
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import { copyTextWithFallback } from '@/utils/clipboard';

const g = globalThis as any;
const origDocument = g.document;
const nav = globalThis.navigator;
const origClipboard = (nav as any)?.clipboard;

function setClipboard(value: unknown) {
  Object.defineProperty(nav, 'clipboard', { value, configurable: true });
}

describe('copyTextWithFallback (pure paths)', () => {
  afterEach(() => {
    g.document = origDocument;
    setClipboard(origClipboard);
  });

  it('uses navigator.clipboard when it succeeds', async () => {
    let written = '';
    setClipboard({ writeText: async (s: string) => void (written = s) });
    assert.strictEqual(await copyTextWithFallback('hello'), true);
    assert.strictEqual(written, 'hello');
  });

  it('returns false when the API fails and there is no DOM', async () => {
    const warn = console.warn;
    console.warn = () => {};
    try {
      g.document = undefined;
      setClipboard({
        writeText: async () => {
          throw new Error('denied');
        },
      });
      assert.strictEqual(await copyTextWithFallback('x'), false);
    } finally {
      console.warn = warn;
    }
  });

  it('returns false when neither API nor DOM exist', async () => {
    g.document = undefined;
    setClipboard(undefined);
    assert.strictEqual(await copyTextWithFallback('x'), false);
  });
});
