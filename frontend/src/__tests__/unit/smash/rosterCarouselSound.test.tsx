// frontend/src/__tests__/unit/smash/rosterCarouselSound.test.tsx
//
// One step of the roster carousel is one tick, as a drag past one roster is (the arrows used to add a
// second tick of their own on top of the one the animation plays).
import '../../helpers/dom';
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { act, renderHook, waitFor } from '../../helpers/dom';
import { useRosterCarousel } from '@/components/smash-or-pass/roster-select/useRosterCarousel';
import { SmashSounds } from '@/components/smash-or-pass/SmashSoundEffects';
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

const original = SmashSounds.playHoverTick;
afterEach(() => {
  SmashSounds.playHoverTick = original;
});

function mountCarousel(slugs: string[]) {
  localStorage.removeItem('dbd_smash_selected_roster');
  const rosters = slugs.map(roster); // one list, as the page passes one: a new one each render re-centres the carousel
  return renderHook(() =>
    useRosterCarousel({
      isOpen: true,
      rosters,
      selectedRosterSlug: slugs[0],
      onSelectRoster: () => undefined,
      onClose: () => undefined,
    })
  );
}

describe('the roster carousel ticks', () => {
  for (const [name, step] of [
    ['next arrow', 'stepNext'],
    ['previous arrow', 'stepPrev'],
  ] as const) {
    it(`once for the ${name}`, async () => {
      let ticks = 0;
      SmashSounds.playHoverTick = () => void ticks++;
      const { result } = mountCarousel(['local:a', 'local:b', 'local:c']);
      act(() => result.current[step]());
      await waitFor(() => assert.equal(result.current.visibleCards.some((c) => c.visualOffset === 0 && c.roster.slug !== 'local:a'), true));
      assert.equal(ticks, 1);
    });
  }

  it('once for a jump to a neighbouring roster', async () => {
    let ticks = 0;
    SmashSounds.playHoverTick = () => void ticks++;
    const { result } = mountCarousel(['local:a', 'local:b', 'local:c']);
    act(() => result.current.jumpBy(1));
    await waitFor(() => assert.equal(result.current.visibleCards.find((c) => c.roster.slug === 'local:b')?.visualOffset, 0));
    assert.equal(ticks, 1);
  });
});
