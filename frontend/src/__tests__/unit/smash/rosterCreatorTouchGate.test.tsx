// frontend/src/__tests__/unit/smash/rosterCreatorTouchGate.test.tsx
//
// The roster creator is desktop only: on a phone or tablet its URL sends the visitor back to the
// Smash or Pass hub instead of opening the editor.
import { render, withNextApp } from '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { SmashRosterCreateClient } from '@/components/smash-or-pass/creator/SmashRosterCreateClient';

function stubViewport(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide && query.includes('min-width'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

describe('roster creator on touch-sized screens', () => {
  it('redirects to the hub and renders nothing below 1024px', () => {
    stubViewport(false);
    const app = withNextApp({ pathname: '/en/smash-or-pass/create' });
    const { container } = render(<SmashRosterCreateClient />, { wrapper: app.wrapper });
    assert.deepEqual(app.router.pushes, ['/en/smash-or-pass']);
    assert.equal(container.innerHTML, '');
  });
});
