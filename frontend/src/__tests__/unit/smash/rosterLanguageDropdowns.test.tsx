// frontend/src/__tests__/unit/smash/rosterLanguageDropdowns.test.tsx
import '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, withDictionary, act } from '../../helpers/dom';
import enDict from '@/locales/en';
import { CandidateFormInputs, emptyDraftEntity } from '@/components/smash-or-pass/creator/EntityEditor';
import { RosterBasicsSection } from '@/components/smash-or-pass/creator/RosterBasicsSection';
import { freshDraft, type Draft, type RosterTranslations } from '@/components/smash-or-pass/creator/SmashRosterCreatorParts';
import type { DraftEntity, EntityTranslationDraft } from '@/components/smash-or-pass/creator/EntityEditorParts';

const c = enDict.smashOrPass.creator;

describe('Smash Roster Creator Unified Language Dropdowns', () => {
  describe('CandidateFormInputs (EntityEditor)', () => {
    it('when locale is en, displays base entity values and typing updates base entity via onChange', () => {
      const patches: Array<Partial<DraftEntity>> = [];
      const translationChanges: Array<{ locale: string; field: string; value: string }> = [];

      const entity: DraftEntity = {
        ...emptyDraftEntity('c-1'),
        name: 'Meg Thomas',
        archetype: 'Energetic Athlete',
        bio: 'Always on the run from dangers.',
      };

      const view = render(
        <CandidateFormInputs
          entity={entity}
          index={0}
          onChange={(patch) => patches.push(patch)}
          onRemove={() => {}}
          showTranslations={false}
          translations={{}}
          onTranslationChange={(locale, field, value) => {
            translationChanges.push({ locale, field, value });
          }}
          locale="en"
        />,
        { wrapper: withDictionary() }
      );

      // Verify language dropdown trigger shows base language label
      const langDropdown = view.getByRole('button', { name: c.editingLanguageLabel });
      assert.ok(langDropdown, 'Language dropdown trigger should be present');
      assert.ok(langDropdown.textContent?.includes(c.baseLanguageLabel));

      // Name input displays base entity name
      const nameLabel = view.getByText(c.entityNameLabel);
      const nameInput = nameLabel.closest('label')?.querySelector('input');
      assert.ok(nameInput, 'Name input should be found');
      assert.equal(nameInput.value, 'Meg Thomas');

      // Archetype input displays base archetype
      const archetypeLabel = view.getByText(c.entityArchetypeLabel);
      const archetypeInput = archetypeLabel.closest('label')?.querySelector('input');
      assert.ok(archetypeInput, 'Archetype input should be found');
      assert.equal(archetypeInput.value, 'Energetic Athlete');

      // Typing into name input triggers onChange with partial patch
      fireEvent.change(nameInput, { target: { value: 'Meg Thomas (Sprint Burst)' } });
      assert.deepEqual(patches[patches.length - 1], { name: 'Meg Thomas (Sprint Burst)' });
      assert.equal(translationChanges.length, 0, 'No translation change should fire when activeLocale is en');

      // Typing into archetype input triggers onChange
      fireEvent.change(archetypeInput, { target: { value: 'Lead Sprinter' } });
      assert.deepEqual(patches[patches.length - 1], { archetype: 'Lead Sprinter' });
      assert.equal(translationChanges.length, 0, 'No translation change should fire when activeLocale is en');
    });

    it('when switching locale to pl, falls back to English values as placeholders when untranslated, and typing invokes onTranslationChange', () => {
      const patches: Array<Partial<DraftEntity>> = [];
      const translationChanges: Array<{ locale: string; field: string; value: string }> = [];

      const entity: DraftEntity = {
        ...emptyDraftEntity('c-1'),
        name: 'Claudette Morel',
        archetype: 'Botanist',
        bio: 'Studying flora in the fog.',
      };

      const view = render(
        <CandidateFormInputs
          entity={entity}
          index={0}
          onChange={(patch) => patches.push(patch)}
          onRemove={() => {}}
          showTranslations={false}
          translations={{}}
          onTranslationChange={(locale, field, value) => {
            translationChanges.push({ locale, field, value });
          }}
          locale="en"
        />,
        { wrapper: withDictionary() }
      );

      // Open language dropdown and select Polish
      const langDropdown = view.getByRole('button', { name: c.editingLanguageLabel });
      fireEvent.click(langDropdown);

      const polishOption = view.getByText('Polski (PL)');
      assert.ok(polishOption, 'Polski (PL) option should be visible in dropdown menu');
      fireEvent.click(polishOption);

      // Inputs should have empty value and English fallback as placeholder
      const nameLabel = view.getByText(c.entityNameLabel);
      const nameInput = nameLabel.closest('label')?.querySelector('input');
      assert.ok(nameInput);
      assert.equal(nameInput.value, '', 'Polish name translation is not yet set');
      assert.equal(nameInput.placeholder, 'Claudette Morel', 'Fallback placeholder should be the English name');

      const archetypeLabel = view.getByText(c.entityArchetypeLabel);
      const archetypeInput = archetypeLabel.closest('label')?.querySelector('input');
      assert.ok(archetypeInput);
      assert.equal(archetypeInput.value, '', 'Polish archetype translation is not yet set');
      assert.equal(archetypeInput.placeholder, 'Botanist', 'Fallback placeholder should be the English archetype');

      // Typing into name input invokes onTranslationChange with Polish locale
      fireEvent.change(nameInput, { target: { value: 'Klaudia Morel' } });
      assert.deepEqual(translationChanges[translationChanges.length - 1], {
        locale: 'pl',
        field: 'name',
        value: 'Klaudia Morel',
      });
      assert.equal(patches.length, 0, 'onChange should not be called when editing non-English locale');

      // Typing into archetype input invokes onTranslationChange
      fireEvent.change(archetypeInput, { target: { value: 'Botaniczka' } });
      assert.deepEqual(translationChanges[translationChanges.length - 1], {
        locale: 'pl',
        field: 'archetype',
        value: 'Botaniczka',
      });
      assert.equal(patches.length, 0, 'onChange should not be called when editing non-English locale');
    });

    it('when switching locale to pl, displays existing Polish translations', () => {
      const entity: DraftEntity = {
        ...emptyDraftEntity('c-1'),
        name: 'Dwight Fairfield',
        archetype: 'Nervous Leader',
      };

      const translations: Record<string, EntityTranslationDraft> = {
        pl: {
          name: 'Dawid Fairfield',
          archetype: 'Nerwowy Przywódca',
        },
      };

      const view = render(
        <CandidateFormInputs
          entity={entity}
          index={0}
          onChange={() => {}}
          onRemove={() => {}}
          showTranslations={false}
          translations={translations}
          onTranslationChange={() => {}}
          locale="en"
        />,
        { wrapper: withDictionary() }
      );

      // Switch to Polish
      fireEvent.click(view.getByRole('button', { name: c.editingLanguageLabel }));
      fireEvent.click(view.getByText('Polski (PL)'));

      // Inputs should display the Polish translations
      const nameInput = view.getByText(c.entityNameLabel).closest('label')?.querySelector('input');
      assert.equal(nameInput?.value, 'Dawid Fairfield');

      const archetypeInput = view.getByText(c.entityArchetypeLabel).closest('label')?.querySelector('input');
      assert.equal(archetypeInput?.value, 'Nerwowy Przywódca');
    });
  });

  describe('RosterBasicsSection', () => {
    const createBaseProps = () => {
      const draft: Draft = {
        ...freshDraft(),
        name: 'Dead by Daylight Originals',
        description: 'Iconic survivors and killers from the realm.',
      };

      return {
        draft,
        patch: () => {},
        attempted: false,
        nameMissing: false,
        coverInvalid: false,
        isUserAdmin: false,
        official: false,
        onOfficialChange: () => {},
        onOpenCrop: () => {},
      };
    };

    it('when locale is en, displays draft values and typing updates draft via patch', async () => {
      const patches: Array<Partial<Draft>> = [];
      const rosterTranslationChanges: Array<{ locale: string; field: string; value: string }> = [];

      const baseProps = createBaseProps();

      let view!: ReturnType<typeof render>;
      await act(async () => {
        view = render(
          <RosterBasicsSection
            {...baseProps}
            patch={(next) => patches.push(next)}
            onRosterTranslationChange={(locale, field, value) => {
              rosterTranslationChanges.push({ locale, field, value });
            }}
          />,
          { wrapper: withDictionary() }
        );
      });

      // Verify language dropdown trigger shows base language label
      const langDropdown = view.getByRole('button', { name: c.editingLanguageLabel });
      assert.ok(langDropdown);
      assert.ok(langDropdown.textContent?.includes(c.baseLanguageLabel));

      // Name input displays draft name
      const nameInput = view.getByText(c.nameLabel).closest('label')?.querySelector('input');
      assert.ok(nameInput);
      assert.equal(nameInput.value, 'Dead by Daylight Originals');

      // Description textarea displays draft description
      const descTextarea = view.getByText(c.descriptionLabel).closest('label')?.querySelector('textarea');
      assert.ok(descTextarea);
      assert.equal(descTextarea.value, 'Iconic survivors and killers from the realm.');

      // Typing into name input invokes patch
      fireEvent.change(nameInput, { target: { value: 'Dead by Daylight All-Stars' } });
      assert.deepEqual(patches[patches.length - 1], { name: 'Dead by Daylight All-Stars' });
      assert.equal(rosterTranslationChanges.length, 0, 'No translation change should fire when activeLocale is en');

      // Typing into description textarea invokes patch
      fireEvent.change(descTextarea, { target: { value: 'Updated roster description' } });
      assert.deepEqual(patches[patches.length - 1], { description: 'Updated roster description' });
      assert.equal(rosterTranslationChanges.length, 0, 'No translation change should fire when activeLocale is en');
    });

    it('when switching locale to pl, falls back to English draft values as placeholder when untranslated, and typing invokes onRosterTranslationChange', async () => {
      const patches: Array<Partial<Draft>> = [];
      const rosterTranslationChanges: Array<{ locale: string; field: string; value: string }> = [];

      const baseProps = createBaseProps();

      let view!: ReturnType<typeof render>;
      await act(async () => {
        view = render(
          <RosterBasicsSection
            {...baseProps}
            patch={(next) => patches.push(next)}
            rosterTranslations={{}}
            onRosterTranslationChange={(locale, field, value) => {
              rosterTranslationChanges.push({ locale, field, value });
            }}
          />,
          { wrapper: withDictionary() }
        );
      });

      // Open language dropdown and select Polish
      fireEvent.click(view.getByRole('button', { name: c.editingLanguageLabel }));
      fireEvent.click(view.getByText('Polski (PL)'));

      // Name input shows empty value with English fallback placeholder
      const nameInput = view.getByText(c.nameLabel).closest('label')?.querySelector('input');
      assert.ok(nameInput);
      assert.equal(nameInput.value, '', 'Polish name translation is not yet set');
      assert.equal(nameInput.placeholder, 'Dead by Daylight Originals', 'Placeholder should fall back to English draft name');

      // Description textarea shows empty value with English fallback placeholder
      const descTextarea = view.getByText(c.descriptionLabel).closest('label')?.querySelector('textarea');
      assert.ok(descTextarea);
      assert.equal(descTextarea.value, '', 'Polish description translation is not yet set');
      assert.equal(descTextarea.placeholder, 'Iconic survivors and killers from the realm.', 'Placeholder should fall back to English draft description');

      // Typing into name invokes onRosterTranslationChange
      fireEvent.change(nameInput, { target: { value: 'Oryginały Dead by Daylight' } });
      assert.deepEqual(rosterTranslationChanges[rosterTranslationChanges.length - 1], {
        locale: 'pl',
        field: 'name',
        value: 'Oryginały Dead by Daylight',
      });
      assert.equal(patches.length, 0, 'patch should not be called when editing non-English locale');

      // Typing into description invokes onRosterTranslationChange
      fireEvent.change(descTextarea, { target: { value: 'Kultowi ocalali i zabójcy z mgły.' } });
      assert.deepEqual(rosterTranslationChanges[rosterTranslationChanges.length - 1], {
        locale: 'pl',
        field: 'description',
        value: 'Kultowi ocalali i zabójcy z mgły.',
      });
      assert.equal(patches.length, 0, 'patch should not be called when editing non-English locale');
    });

    it('when switching locale to pl, displays existing Polish translations', async () => {
      const baseProps = createBaseProps();

      const rosterTranslations: RosterTranslations = {
        pl: {
          name: 'Oryginały DBD',
          description: 'Polski opis rosteru.',
        },
      };

      let view!: ReturnType<typeof render>;
      await act(async () => {
        view = render(
          <RosterBasicsSection
            {...baseProps}
            rosterTranslations={rosterTranslations}
            onRosterTranslationChange={() => {}}
          />,
          { wrapper: withDictionary() }
        );
      });

      // Switch to Polish
      fireEvent.click(view.getByRole('button', { name: c.editingLanguageLabel }));
      fireEvent.click(view.getByText('Polski (PL)'));

      const nameInput = view.getByText(c.nameLabel).closest('label')?.querySelector('input');
      assert.equal(nameInput?.value, 'Oryginały DBD');

      const descTextarea = view.getByText(c.descriptionLabel).closest('label')?.querySelector('textarea');
      assert.equal(descTextarea?.value, 'Polski opis rosteru.');
    });
  });
});
