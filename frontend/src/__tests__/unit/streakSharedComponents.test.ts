// frontend/src/__tests__/unit/streakSharedComponents.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Flame } from 'lucide-react';
import { selectOwnedRoster } from '@/components/streaks/useOwnedRoster';
import { buildCompletionTiles } from '@/components/streaks/ChallengeModeModal';
import {
  RulesConceptCard,
  RulesDifficultyRows,
  RulesHowItWorks,
  RulesModalFooterSections,
  STANDARD_CLARIFICATIONS_WITH_ADDONS,
  STANDARD_EXCEPTIONS,
  RULE_ADDONS_ALLOWED,
  resolveRuleEntries,
  streakCopy,
} from '@/components/streaks/RulesModalSections';
import { CHAOS_DIFFICULTY_ORDER } from '@/utils/challengeTierCompletion';
import enDict from '@/locales/en';

const el = React.createElement;

describe('selectOwnedRoster', () => {
  const all = [
    { name: 'C', is_owned: true, release_number: 3, avatar_local_path: '/c.png' },
    { name: 'A', is_owned: true, release_number: 1 },
    { name: 'B', is_owned: false, release_number: 2 },
    { name: 'Z', is_owned: true, release_number: null },
  ];

  it('returns owned characters in release order and a release index for everyone', () => {
    const { characters, releaseOrder } = selectOwnedRoster(all);
    assert.deepEqual(characters.map((c) => c.name).slice(0, 2), ['A', 'C']);
    assert.ok(characters.some((c) => c.name === 'Z'));
    assert.ok(!characters.some((c) => c.name === 'B'));
    assert.equal(releaseOrder.size, 4);
    assert.ok((releaseOrder.get('A') as number) < (releaseOrder.get('C') as number));
  });

  it('applies the roster limit but keeps characters without a release number', () => {
    const { characters } = selectOwnedRoster(all, 1);
    assert.deepEqual(characters.map((c) => c.name).sort(), ['A', 'Z']);
  });

  it('carries the avatar path through', () => {
    assert.equal(selectOwnedRoster(all).characters.find((c) => c.name === 'C')?.avatar_local_path, '/c.png');
  });
});

describe('buildCompletionTiles', () => {
  const defs = ['easy', 'medium', 'hell'].map((value) => ({ value, label: value, icon: Flame }));

  it('marks every easier tier done when a harder one is cleared and inherits its count', () => {
    const tiles = buildCompletionTiles(CHAOS_DIFFICULTY_ORDER, defs, { medium: 7 }, {});
    assert.deepEqual(tiles.map((t) => t.completed), [true, true, false]);
    assert.equal(tiles[0].completedCount, 7);
    assert.equal(tiles[1].completedCount, 7);
    assert.equal(tiles[2].completedCount, null);
    assert.deepEqual(tiles.map((t) => t.completedFull), [false, false, false]);
  });

  it('tracks full-roster completion independently of regular completion', () => {
    const tiles = buildCompletionTiles(CHAOS_DIFFICULTY_ORDER, defs, { easy: 3 }, { hell: 9 });
    assert.deepEqual(tiles.map((t) => t.completed), [true, false, false]);
    assert.deepEqual(tiles.map((t) => t.completedFull), [true, true, true]);
    assert.equal(tiles[1].completedFullCount, 9);
  });
});

describe('rules entries', () => {
  it('falls back to English defaults and honours copy overrides', () => {
    const entries = resolveRuleEntries({ excHackersLabel: 'Cheaters' }, STANDARD_EXCEPTIONS);
    assert.equal(entries.length, 3);
    assert.equal(entries[1].label, 'Cheaters');
    assert.equal(entries[0].label, 'Game cancelled');
  });

  it('picks variant wording when present and the base text otherwise', () => {
    const def = { ...RULE_ADDONS_ALLOWED, variantTextKeys: { solo: 'soloText' } };
    assert.equal(resolveRuleEntries({ soloText: 'Solo!' }, [def], 'solo')[0].text, 'Solo!');
    assert.equal(resolveRuleEntries({}, [def], 'solo')[0].text, 'All available.');
    assert.equal(resolveRuleEntries({ soloText: 'Solo!' }, [def])[0].text, 'All available.');
  });

  it('streakCopy tolerates a missing dictionary', () => {
    assert.deepEqual(streakCopy(undefined), {});
  });
});

describe('rules sections static render', () => {
  it('renders concept, how-it-works items, difficulty rows and footer sections', () => {
    const copy = streakCopy(enDict);
    const html = renderToStaticMarkup(
      el(
        'div',
        null,
        el(RulesConceptCard, { tone: 'red', title: 'Concept', text: 'Body text' }),
        el(RulesHowItWorks, { tone: 'neutral', title: 'How', items: ['one', 'two'], hint: 'hint!' }),
        el(RulesDifficultyRows, {
          alignTextRight: true,
          rows: [{ label: 'Easy', text: 'desc', badgeClassName: 'badge-x' }],
        }),
        el(RulesModalFooterSections, {
          copy,
          tone: 'red',
          exceptions: resolveRuleEntries(copy, STANDARD_EXCEPTIONS),
          clarifications: resolveRuleEntries(copy, STANDARD_CLARIFICATIONS_WITH_ADDONS),
        })
      )
    );
    assert.ok(html.includes('text-accent-red'));
    assert.ok(html.includes('marker:text-text-muted'));
    assert.ok(html.includes('hint!'));
    assert.ok(html.includes('sm:text-right'));
    assert.ok(html.includes('badge-x'));
    assert.equal((html.match(/<li>/g) || []).length, 2 + 3 + 3);
  });
});
