// frontend/src/__tests__/unit/tier-lists/tierListCreatorTouchGate.test.tsx
//
// The tier list creator is desktop only: on a phone or tablet its URL sends the visitor back to the
// tier list hub instead of opening the editor.
import { render, routeFetch, withAppProviders } from '../../helpers/dom';
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { TierListCreator } from '@/components/tier-lists/creator/TierListCreator';
import { CREATOR_ENTRY_HIDDEN, CREATOR_MIN_WIDTH } from '@/components/tier-lists/styles';

function stubViewport(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide && query.includes('min-width'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

let api: ReturnType<typeof routeFetch>;
beforeEach(() => {
  api = routeFetch({ '/auth/me': { body: { authenticated: false } }, '/site-config': { body: {} } });
});
afterEach(() => api.restore());

describe('tier list creator on touch-sized screens', () => {
  it('hides its entry points and gates its URL at the same width (Tailwind lg is 1024px)', () => {
    assert.equal(CREATOR_ENTRY_HIDDEN, 'max-lg:hidden');
    assert.equal(CREATOR_MIN_WIDTH, '(min-width: 1024px)');
  });

  it('redirects to the hub and renders nothing below 1024px', () => {
    stubViewport(false);
    const app = withAppProviders({ pathname: '/en/tier-lists/new' });
    const { container } = render(<TierListCreator locale="en" />, { wrapper: app.wrapper });
    assert.deepEqual(app.router.pushes, ['/en/tier-lists']);
    assert.equal(container.innerHTML, '');
  });
});
