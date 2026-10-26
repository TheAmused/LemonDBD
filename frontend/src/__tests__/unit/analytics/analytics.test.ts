// frontend/src/__tests__/unit/analytics/analytics.test.ts
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { contactPageFromPath, createDeduper, flushQueuedEvents, trackEvent, trackOnce } from '@/utils/analytics';

type Call = { name: string; data: unknown };
const g = globalThis as { window?: unknown; localStorage?: unknown };

function installUmami(calls: Call[]): void {
  g.window = { umami: { track: (name: string, data?: unknown) => calls.push({ name, data }) } };
}

function installStorage(): Map<string, string> {
  const store = new Map<string, string>();
  g.localStorage = {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  return store;
}

describe('trackEvent', () => {
  beforeEach(() => {
    delete g.window;
    delete g.localStorage;
  });
  afterEach(() => {
    delete g.window;
    delete g.localStorage;
  });

  it('is a silent no-op without a window (SSR)', () => {
    assert.equal(trackEvent('avatar_upload'), false);
  });

  it('is a silent no-op when the Umami script is not loaded', () => {
    g.window = {};
    assert.equal(trackEvent('avatar_upload'), false);
  });

  it('hands the name and props to umami.track', () => {
    const calls: Call[] = [];
    installUmami(calls);
    assert.equal(trackEvent('smash_vote', { vote: 'smash', roster: 'canon' }), true);
    assert.deepEqual(calls, [{ name: 'smash_vote', data: { vote: 'smash', roster: 'canon' } }]);
  });

  it('swallows an error thrown by umami.track', () => {
    g.window = {
      umami: {
        track: () => {
          throw new Error('boom');
        },
      },
    };
    assert.equal(trackEvent('avatar_upload'), false);
  });
});

describe('trackOnce', () => {
  beforeEach(() => {
    delete g.window;
    delete g.localStorage;
  });
  afterEach(() => {
    delete g.window;
    delete g.localStorage;
  });

  it('sends once and remembers it', () => {
    const calls: Call[] = [];
    installUmami(calls);
    installStorage();
    assert.equal(trackOnce('k1', 'showcase_complete', { role: 'killer' }), true);
    assert.equal(trackOnce('k1', 'showcase_complete', { role: 'killer' }), false);
    assert.equal(calls.length, 1);
  });

  it('does not burn the flag when Umami is not loaded yet', () => {
    const store = installStorage();
    assert.equal(trackOnce('k2', 'showcase_complete', { role: 'survivor' }), false);
    assert.equal(store.has('k2'), false);
    const calls: Call[] = [];
    installUmami(calls);
    assert.equal(trackOnce('k2', 'showcase_complete', { role: 'survivor' }), true);
    assert.equal(calls.length, 1);
  });
});

describe('createDeduper', () => {
  it('lets the first call through and blocks calls inside the window', () => {
    let t = 1000;
    const allow = createDeduper(1500, () => t);
    assert.equal(allow(), true);
    t = 2000;
    assert.equal(allow(), false);
    t = 2600;
    assert.equal(allow(), true);
  });
});

describe('contactPageFromPath', () => {
  it('maps the four pages that render ContactLinks', () => {
    assert.equal(contactPageFromPath('/en/about'), 'about');
    assert.equal(contactPageFromPath('/pl/privacy-policy'), 'privacy-policy');
    assert.equal(contactPageFromPath('/de/terms-of-service'), 'terms-of-service');
    assert.equal(contactPageFromPath('/ja/rules'), 'rules');
  });

  it('falls back to other', () => {
    assert.equal(contactPageFromPath('/en/maps'), 'other');
    assert.equal(contactPageFromPath(null), 'other');
    assert.equal(contactPageFromPath(''), 'other');
  });
});

describe('events fired before the Umami script has loaded', () => {
  beforeEach(() => {
    // Drain anything an earlier test left in the module level queue.
    g.window = { umami: { track: () => undefined } };
    flushQueuedEvents();
    delete g.window;
    delete g.localStorage;
  });
  afterEach(() => {
    delete g.window;
    delete g.localStorage;
  });

  it('are queued and sent in order once the script is there', () => {
    g.window = {};
    assert.equal(trackEvent('avatar_upload'), false);
    assert.equal(trackEvent('smash_vote', { vote: 'pass', roster: 'canon' }), false);
    const calls: Call[] = [];
    installUmami(calls);
    assert.equal(flushQueuedEvents(), 2);
    assert.deepEqual(
      calls.map((c) => c.name),
      ['avatar_upload', 'smash_vote']
    );
    assert.equal(flushQueuedEvents(), 0);
  });

  it('are not queued on the server', () => {
    assert.equal(trackEvent('avatar_upload'), false);
    const calls: Call[] = [];
    installUmami(calls);
    assert.equal(flushQueuedEvents(), 0);
    assert.equal(calls.length, 0);
  });

  it('keep at most 20 events', () => {
    g.window = {};
    for (let i = 0; i < 25; i++) trackEvent('avatar_upload');
    const calls: Call[] = [];
    installUmami(calls);
    assert.equal(flushQueuedEvents(), 20);
    assert.equal(calls.length, 20);
  });

  it('are not queued by trackOnce, which retries on its own later', () => {
    g.window = {};
    installStorage();
    assert.equal(trackOnce('k3', 'showcase_complete', { role: 'killer' }), false);
    const calls: Call[] = [];
    installUmami(calls);
    assert.equal(flushQueuedEvents(), 0);
  });

  it('flush does nothing while the script is still missing', () => {
    g.window = {};
    trackEvent('avatar_upload');
    assert.equal(flushQueuedEvents(), 0);
    const calls: Call[] = [];
    installUmami(calls);
    assert.equal(flushQueuedEvents(), 1);
  });
});
