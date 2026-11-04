// frontend/src/__tests__/unit/smash/rosterModalClose.test.tsx
import '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, routeFetch, withAppProviders } from '../../helpers/dom';
import enDict from '@/locales/en';
import { RosterSelectModal } from '@/components/smash-or-pass/RosterSelectModal';
import type { RosterItem } from '@/types/smashOrPass';

const roster = (slug: string): RosterItem => ({
  id: slug,
  slug,
  name: slug,
  description: '',
  theme_color: '#ffffff',
  category: 'official',
  is_nsfw: false,
  is_active: true,
});

describe('closing the roster picker', () => {
  it('only closes it: the X button does not choose the roster the carousel is centred on', () => {
    const api = routeFetch({ '/auth/me': { body: { authenticated: false } }, '/site-config': { body: {} } });
    localStorage.removeItem('dbd_smash_selected_roster');
    const chosen: string[] = [];
    let closed = 0;
    const view = render(
      <RosterSelectModal
        isOpen
        onClose={() => closed++}
        rosters={[roster('canon'), roster('other')]}
        selectedRosterSlug="canon"
        onSelectRoster={(slug) => chosen.push(slug)}
      />,
      { wrapper: withAppProviders().wrapper }
    );
    fireEvent.click(view.getAllByLabelText(enDict.pagination.next)[0]);
    fireEvent.click(view.getAllByLabelText(enDict.modal.close)[0]);
    api.restore();
    assert.equal(closed, 1);
    assert.deepEqual(chosen, []);
    assert.equal(localStorage.getItem('dbd_smash_selected_roster'), null);
  });
});
