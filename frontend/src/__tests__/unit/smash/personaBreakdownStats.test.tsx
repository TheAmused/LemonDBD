// frontend/src/__tests__/unit/smash/personaBreakdownStats.test.tsx
import '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, withDictionary } from '../../helpers/dom';
import enDict from '@/locales/en';
import { PersonaBreakdown } from '@/components/smash-or-pass/persona/PersonaBreakdown';
import type { RomancePersonaResult } from '@/utils/smashPersona';

const text = enDict.smashOrPass;

const samplePersona: RomancePersonaResult = {
  archKey: 'fogRomantic',
  title: 'Hopeless Romantic',
  subtitle: 'A lover of all things Fog',
  description: 'You fall easily and hard.',
  badgeColor: 'from-accent-red to-accent-green',
  borderColor: 'border-border-color',
  killerAffinity: 40,
  survivorAffinity: 60,
  smashRate: 75,
  totalVotes: 20,
  totalSmashes: 15,
  smashedSurvivors: 9,
  smashedKillers: 6,
  favoriteChar: {
    name: 'Feng Min',
    slug: 'feng-min',
    role: 'survivor',
  },
};

describe('PersonaBreakdown stats and role affinity', () => {
  it('renders top 3-column metrics with Total Smashes and does not render firstSmash', () => {
    const view = render(
      <PersonaBreakdown
        persona={samplePersona}
        isSharedView={false}
        onShare={() => {}}
        onClose={() => {}}
      />,
      { wrapper: withDictionary() }
    );

    // Total Evaluated
    assert.ok(view.getByText(text.totalEvaluated));
    assert.ok(view.getByText('20'));

    // Total Smashes metric should be present
    const totalSmashesLabel = text.statsDetail.totalSmashes ?? text.statsDetail.smashCount;
    assert.ok(view.getByText(totalSmashesLabel));
    assert.ok(view.getByText('15'));

    // Smash Rate metric
    assert.ok(view.getByText(text.statsDetail.smashRate));
    assert.ok(view.getByText(`75${text.percentSign}`));

    // Old firstSmash metric should NOT be rendered
    assert.equal(view.queryByText(text.statsDetail.firstSmash), null);
    assert.equal(view.queryByText('Feng Min'), null);
  });

  it('renders Survivors and Killers role affinity section with cleanly separated counts and percentages', () => {
    const view = render(
      <PersonaBreakdown
        persona={samplePersona}
        isSharedView={false}
        onShare={() => {}}
        onClose={() => {}}
      />,
      { wrapper: withDictionary() }
    );

    // Role affinity header
    assert.ok(view.getByText(text.roleAffinity));

    // Survivors label, count, percentage
    assert.ok(view.getByText(text.filters.survivors));
    assert.ok(view.getByText('9'));
    assert.ok(view.getByText(`(60${text.percentSign})`));

    // Killers label, count, percentage
    assert.ok(view.getByText(text.filters.killers));
    assert.ok(view.getByText('6'));
    assert.ok(view.getByText(`(40${text.percentSign})`));
  });

  it('gracefully handles shared persona without raw counts by calculating total smashes and omitting false 0 for survivor/killer counts', () => {
    const sharedPersona: RomancePersonaResult = {
      archKey: 'fogRomantic',
      title: 'Hopeless Romantic',
      subtitle: 'A lover of all things Fog',
      description: 'You fall easily and hard.',
      badgeColor: 'from-accent-red to-accent-green',
      borderColor: 'border-border-color',
      killerAffinity: 40,
      survivorAffinity: 60,
      smashRate: 75,
      totalVotes: 20,
      favoriteChar: null,
    };

    const view = render(
      <PersonaBreakdown
        persona={sharedPersona}
        isSharedView={true}
        onShare={() => {}}
        onClose={() => {}}
      />,
      { wrapper: withDictionary() }
    );

    // Calculated fallback total smashes: round((75 / 100) * 20) = 15
    const totalSmashesLabel = text.statsDetail.totalSmashes ?? text.statsDetail.smashCount;
    assert.ok(view.getByText(totalSmashesLabel));
    assert.ok(view.getByText('15'));

    // Percentages are displayed
    assert.ok(view.getByText(`(60${text.percentSign})`));
    assert.ok(view.getByText(`(40${text.percentSign})`));

    // False 0 counts should NOT be rendered for survivor/killer counts
    assert.equal(view.queryByText('0'), null);
  });
});
