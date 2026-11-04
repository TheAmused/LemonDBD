// frontend/src/__tests__/unit/smash/rosterCarouselTwoCards.test.tsx
//
// With two rosters the other one is exactly opposite the centre. It must stay on the side it moved on,
// not jump to the left when the carousel comes to rest.
import '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { act, renderHook, waitFor } from '../../helpers/dom';
import { useRosterCarousel } from '@/components/smash-or-pass/roster-select/useRosterCarousel';
import { carouselOffset } from '@/components/smash-or-pass/roster-select/rosterDisplay';
import type { RosterItem } from '@/types/smashOrPass';

const roster = (slug: string): RosterItem => ({
  id: slug,
  slug,
  name: slug,
  description: '',
  theme_color: '#ffffff',
  category: 'custom',
  is_nsfw: false,
  is_active: true,
  is_local: true,
});

const rosters = [roster('local:a'), roster('local:b')];

describe('carouselOffset', () => {
  it('puts the opposite card on the requested side and the others where they belong', () => {
    assert.equal(carouselOffset(1, 0, 2, 1), 1);
    assert.equal(carouselOffset(1, 0, 2, -1), -1);
    assert.ok(Math.abs(carouselOffset(1, 0.4, 3, 1) - 0.6) < 1e-9);
    assert.equal(carouselOffset(2, 0, 3, 1), -1);
  });
});

describe('a carousel of two rosters', () => {
  it('opens with the other roster on the right', () => {
    localStorage.removeItem('dbd_smash_selected_roster');
    const { result } = renderHook(() =>
      useRosterCarousel({ isOpen: true, rosters, selectedRosterSlug: 'local:a', onSelectRoster: () => undefined, onClose: () => undefined })
    );
    const other = result.current.visibleCards.find((c) => c.roster.slug === 'local:b');
    assert.equal(other?.visualOffset, 1);
  });

  it('keeps the roster that came from the right on the right after going there and back', async () => {
    localStorage.removeItem('dbd_smash_selected_roster');
    const { result } = renderHook(() =>
      useRosterCarousel({ isOpen: true, rosters, selectedRosterSlug: 'local:a', onSelectRoster: () => undefined, onClose: () => undefined })
    );
    const offsetOf = (slug: string) => result.current.visibleCards.find((c) => c.roster.slug === slug)?.visualOffset;

    act(() => result.current.stepNext());
    await waitFor(() => assert.equal(offsetOf('local:b'), 0));
    assert.equal(offsetOf('local:a'), -1, 'the roster left behind sits on the left');

    act(() => result.current.stepPrev());
    await waitFor(() => assert.equal(offsetOf('local:a'), 0));
    assert.equal(offsetOf('local:b'), 1, 'and the other one is back on the right');
  });
});
