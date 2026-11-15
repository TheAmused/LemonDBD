// frontend/src/__tests__/unit/smash/candidateSpamAndValidation.test.ts
import '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, render, renderHook, fireEvent, withNextApp } from '../../helpers/dom';
import enDict from '@/locales/en';
import { CandidateTiles } from '@/components/smash-or-pass/creator/EntityEditor';
import { emptyDraftEntity, type DraftEntity } from '@/components/smash-or-pass/creator/EntityEditorParts';
import { useRosterSubmit } from '@/components/smash-or-pass/creator/useRosterSubmit';
import { freshDraft, type Draft } from '@/components/smash-or-pass/creator/SmashRosterCreatorParts';

const c = enDict.smashOrPass.creator;

describe('Candidate Spam Prevention & Validation', () => {
  describe('1. Add Candidate gating and disabled state', () => {
    it('disables Add Candidate button when canAdd is false and displays disabled hint', () => {
      let addCalled = false;
      const entities: DraftEntity[] = [
        {
          ...emptyDraftEntity('k1'),
          name: '', // incomplete name
          role: 'Survivor',
          gender: 'female',
        },
      ];

      const { wrapper } = withNextApp();
      const view = render(
        React.createElement(CandidateTiles, {
          entities,
          selectedKey: 'k1',
          onSelect: () => {},
          onRename: () => {},
          onRemove: () => {},
          onAdd: () => { addCalled = true; },
          canAdd: false,
        }),
        { wrapper }
      );

      const addBtn = view.queryByTestId('add-candidate-tile');
      assert.ok(addBtn, 'Add candidate button should be rendered');
      assert.equal(addBtn.hasAttribute('disabled') || addBtn.getAttribute('aria-disabled') === 'true', true, 'Button should be disabled or aria-disabled');

      // Attempt to click when disabled
      fireEvent.click(addBtn);
      assert.equal(addCalled, false, 'onAdd must not be called when disabled');

      // Verify tooltip or hint attribute and aria-describedby
      assert.equal(addBtn.getAttribute('aria-describedby'), 'add-candidate-disabled-hint');
      assert.ok(
        addBtn.getAttribute('data-tooltip')?.includes('Fill in name, role, and gender') ||
        addBtn.getAttribute('aria-label')?.includes('Fill in name, role, and gender') ||
        addBtn.title?.includes('Fill in name, role, and gender'),
        'Add button should indicate why it is disabled'
      );
    });

    it('enables Add Candidate button when canAdd is true and invokes onAdd on click', () => {
      let addCalled = false;
      const entities: DraftEntity[] = [
        {
          ...emptyDraftEntity('k1'),
          name: 'Meg Thomas',
          role: 'Survivor',
          gender: 'female',
        },
      ];

      const { wrapper } = withNextApp();
      const view = render(
        React.createElement(CandidateTiles, {
          entities,
          selectedKey: 'k1',
          onSelect: () => {},
          onRename: () => {},
          onRemove: () => {},
          onAdd: () => { addCalled = true; },
          canAdd: true,
        }),
        { wrapper }
      );

      const addBtn = view.getByTestId('add-candidate-tile');
      assert.ok(addBtn);
      assert.equal(addBtn.hasAttribute('disabled'), false, 'Button should not be disabled');
      assert.equal(addBtn.getAttribute('aria-describedby'), null, 'aria-describedby should not be present when enabled');

      fireEvent.click(addBtn);
      assert.equal(addCalled, true, 'onAdd should be called when clicked and canAdd is true');
    });
  });

  describe('2. useRosterSubmit validation for incomplete candidates', () => {
    it('sets submitError for incomplete candidates missing role or gender instead of silently dropping', async () => {
      const { wrapper } = withNextApp();

      const candidate1: DraftEntity = {
        ...emptyDraftEntity('cand-1'),
        name: 'Trapper',
        role: 'Killer',
        gender: 'male',
      };
      const candidate2Incomplete: DraftEntity = {
        ...emptyDraftEntity('cand-2'),
        name: 'Incomplete Candidate',
        role: '', // missing required role
        gender: 'female',
      };

      const draft: Draft = {
        ...freshDraft(),
        name: 'Valid Roster Name',
        entities: [candidate1, candidate2Incomplete],
      };

      const { result } = renderHook(
        () =>
          useRosterSubmit({
            locale: 'en',
            draft,
            official: false,
            isUserAdmin: false,
            rosterTranslations: {},
            entityTranslations: {},
            nameMissing: false,
            entitiesMissing: false,
            coverInvalid: false,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.submit();
      });

      assert.equal(
        result.current.submitError,
        'All candidates must have a name, role, and gender before saving.',
        'submitError should be set indicating incomplete candidates'
      );
    });

    it('sets submitError when a candidate has empty name instead of silently dropping it', async () => {
      const { wrapper } = withNextApp();

      const candidate1: DraftEntity = {
        ...emptyDraftEntity('cand-1'),
        name: 'Trapper',
        role: 'Killer',
        gender: 'male',
      };
      const candidate2EmptyName: DraftEntity = {
        ...emptyDraftEntity('cand-2'),
        name: '   ', // empty name
        role: 'Survivor',
        gender: 'female',
      };

      const draft: Draft = {
        ...freshDraft(),
        name: 'Valid Roster Name',
        entities: [candidate1, candidate2EmptyName],
      };

      const { result } = renderHook(
        () =>
          useRosterSubmit({
            locale: 'en',
            draft,
            official: false,
            isUserAdmin: false,
            rosterTranslations: {},
            entityTranslations: {},
            nameMissing: false,
            entitiesMissing: false,
            coverInvalid: false,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.submit();
      });

      assert.equal(
        result.current.submitError,
        'All candidates must have a name, role, and gender before saving.',
        'submitError should be set when candidate name is blank'
      );
    });

    it('sets submitError when a candidate is missing gender', async () => {
      const { wrapper } = withNextApp();

      const candidate1: DraftEntity = {
        ...emptyDraftEntity('cand-1'),
        name: 'Trapper',
        role: 'Killer',
        gender: '', // missing gender
      };

      const draft: Draft = {
        ...freshDraft(),
        name: 'Valid Roster Name',
        entities: [candidate1],
      };

      const { result } = renderHook(
        () =>
          useRosterSubmit({
            locale: 'en',
            draft,
            official: false,
            isUserAdmin: false,
            rosterTranslations: {},
            entityTranslations: {},
            nameMissing: false,
            entitiesMissing: false,
            coverInvalid: false,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.submit();
      });

      assert.equal(
        result.current.submitError,
        'All candidates must have a name, role, and gender before saving.',
        'submitError should be set when candidate gender is missing'
      );
    });
  });

  describe('3. Localization across 5 locales', () => {
    it('provides both addCandidateDisabledHint and incompleteCandidatesError in en, pl, de, es, ja', async () => {
      const locales = ['en', 'pl', 'de', 'es', 'ja'] as const;
      for (const loc of locales) {
        const mod = await import(`../../../locales/${loc}/smashOrPass.ts`);
        const creator = mod.default.creator;
        assert.ok(creator.addCandidateDisabledHint, `Missing addCandidateDisabledHint for ${loc}`);
        assert.ok(creator.incompleteCandidatesError, `Missing incompleteCandidatesError for ${loc}`);
      }
    });
  });
});
