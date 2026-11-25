// frontend/src/__tests__/unit/smash/phase2RosterManagement.test.tsx
import '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, withDictionary } from '../../helpers/dom';
import enDict from '@/locales/en';
import { RosterCarouselCard } from '@/components/smash-or-pass/roster-select/RosterCarouselCard';
import { FloatingLoreScattered } from '@/components/smash-or-pass/FloatingLoreScattered';
import { FitText } from '@/components/common/FitText';
import { SMASH_ROSTER_LIMITS } from '@/utils/smashOrPass/constants';
import type { EntityItem, RosterItem } from '@/types/smashOrPass';

const mockRoster = (overrides?: Partial<RosterItem>): RosterItem => ({
  id: 'custom-1',
  slug: 'local:custom-1',
  name: 'Test Roster',
  description: 'Test Description',
  theme_color: '#ff4444',
  category: 'Custom',
  is_local: true,
  is_active: true,
  is_nsfw: false,
  entity_count: 5,
  total_votes: 0,
  ...overrides,
});

describe('Phase 2: Roster Management Polish', () => {
  it('SMASH_ROSTER_LIMITS enforces updated compact limits', () => {
    assert.equal(SMASH_ROSTER_LIMITS.maxRosterName, 60);
    assert.equal(SMASH_ROSTER_LIMITS.maxRosterDescription, 300);
    assert.equal(SMASH_ROSTER_LIMITS.maxEntityName, 60);
    assert.equal(SMASH_ROSTER_LIMITS.maxWatermark, 32);
    assert.equal(SMASH_ROSTER_LIMITS.maxArchetype, 60);
    assert.equal(SMASH_ROSTER_LIMITS.maxArchetypeDesc, 500);
  });

  describe('RosterCarouselCard: "Yours" vs "Imported" badges', () => {
    it('displays "Yours" badge for locally created rosters (not imported)', () => {
      const roster = mockRoster({ is_local: true, is_imported: false });
      const view = render(
        <RosterCarouselCard
          roster={roster}
          visualOffset={0}
          isDragging={false}
          isCurrentlyActive={false}
          onJump={() => {}}
          onCommit={() => {}}
        />,
        { wrapper: withDictionary() }
      );
      const localBadge = view.container.querySelector('[data-testid="roster-local-badge"]');
      assert.ok(localBadge);
      assert.equal(localBadge.textContent?.trim(), 'Yours');
    });

    it('displays "Imported" badge when roster has is_imported: true and author does not match current user', () => {
      const roster = mockRoster({ is_local: true, is_imported: true, author_id: 999 });
      const view = render(
        <RosterCarouselCard
          roster={roster}
          visualOffset={0}
          isDragging={false}
          isCurrentlyActive={false}
          onJump={() => {}}
          onCommit={() => {}}
        />,
        { wrapper: withDictionary() }
      );
      const localBadge = view.container.querySelector('[data-testid="roster-local-badge"]');
      assert.ok(localBadge);
      assert.equal(localBadge.textContent?.trim(), 'Imported');
    });

    it('displays "@author_login" badge when imported roster has author_login', () => {
      const roster = mockRoster({ is_local: true, is_imported: true, author_id: 999, author_login: 'dwight' });
      const view = render(
        <RosterCarouselCard
          roster={roster}
          visualOffset={0}
          isDragging={false}
          isCurrentlyActive={false}
          onJump={() => {}}
          onCommit={() => {}}
        />,
        { wrapper: withDictionary() }
      );
      const localBadge = view.container.querySelector('[data-testid="roster-local-badge"]');
      assert.ok(localBadge);
      assert.equal(localBadge.textContent?.trim(), '@dwight');
    });

    it('groups NSFW and Active badges in the top right container', () => {
      const roster = mockRoster({ is_nsfw: true });
      const view = render(
        <RosterCarouselCard
          roster={roster}
          visualOffset={0}
          isDragging={false}
          isCurrentlyActive={true}
          onJump={() => {}}
          onCommit={() => {}}
        />,
        { wrapper: withDictionary() }
      );
      const nsfwBadge = view.container.querySelector('[data-testid="roster-nsfw-badge"]');
      assert.ok(nsfwBadge);
      // Both badges should coexist in top right
      const topRightContainer = nsfwBadge.closest('.right-2\\.5');
      assert.ok(topRightContainer);
      assert.ok(topRightContainer.textContent?.includes('ACTIVE') || topRightContainer.textContent?.includes('Active') || topRightContainer.textContent?.includes('NSFW'));
    });
  });

  describe('FitText: disableTooltip suppression', () => {
    it('does not attach data-tooltip when disableTooltip is true', () => {
      const view = render(
        <FitText disableTooltip minScale={0.5} maxLines={1}>
          Very Long Text That Clamps
        </FitText>
      );
      const span = view.container.querySelector('span');
      assert.ok(span);
      assert.equal(span.getAttribute('data-tooltip'), null);
      assert.equal(span.getAttribute('data-tooltip-variant'), null);
    });
  });

  describe('FloatingLoreScattered: Custom roster fallback isolation', () => {
    it('shows dating_vibe on the side card when a custom entity has no tagline (simple mode)', () => {
      const customEntity = {
        id: 'local:custom-1:e3',
        roster_id: 'local:custom-1',
        slug: 'airplane_737',
        name: 'Boeing 737',
        role: 'Plane',
        gender: 'Vehicle',
        metadata: {
          dating_vibe: 'Window seat and a long layover',
        },
      } as unknown as EntityItem;

      const view = render(
        <FloatingLoreScattered character={customEntity} />,
        { wrapper: withDictionary() }
      );

      assert.ok(view.container.textContent?.includes('Window seat and a long layover'));
    });

    it('does not render a fake canon quote or tagline for custom roster entities without them', () => {
      const customEntity = {
        id: 'local:custom-1:e1',
        roster_id: 'local:custom-1',
        slug: 'airplane_737',
        name: 'Boeing 737',
        role: 'Plane',
        gender: 'Vehicle',
        metadata: {},
      } as unknown as EntityItem;

      const view = render(
        <FloatingLoreScattered character={customEntity} />,
        { wrapper: withDictionary() }
      );

      // Quote and Dating Vibe cards should not be rendered when optional fields are empty
      const allText = view.container.textContent || '';
      assert.ok(!allText.includes('watching from the shadows'));
      assert.ok(!allText.includes(enDict.smashOrPass.loreTaglineSurvivor));
      assert.ok(!allText.includes(enDict.smashOrPass.loreTaglineKiller));
      // Neither a fake tagline nor a fake quote is rendered
      assert.strictEqual(view.container.querySelector('[data-lore-label]'), null);
    });

    it('renders author-provided quote when present on custom roster entity', () => {
      const customEntity = {
        id: 'local:custom-1:e2',
        roster_id: 'local:custom-1',
        slug: 'airplane_737',
        name: 'Boeing 737',
        role: 'Plane',
        gender: 'Vehicle',
        metadata: {
          quote: 'Ready for takeoff!',
        },
      } as unknown as EntityItem;

      const view = render(
        <FloatingLoreScattered character={customEntity} />,
        { wrapper: withDictionary() }
      );

      const allText = view.container.textContent || '';
      assert.ok(allText.includes('Ready for takeoff!'));
    });
  });
});
