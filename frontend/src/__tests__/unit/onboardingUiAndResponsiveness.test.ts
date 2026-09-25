// frontend/src/__tests__/unit/onboardingUiAndResponsiveness.test.ts
import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('CharacterOnboardingWizard UI & Responsiveness', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/components/onboarding/CharacterOnboardingWizard.tsx'),
    'utf-8'
  );

  it('enforces a minimum of 3 columns on mobile (never 1 or 2 single columns)', () => {
    assert.ok(
      source.includes('grid-cols-3 gap-1.5 sm:gap-2.5 md:gap-3') &&
        !source.includes('grid-cols-2 gap-2 sm:gap-3') &&
        !source.includes('grid-cols-1 sm:grid-cols-2'),
      'Chapter grid must use grid-cols-3 on mobile rather than 1 or 2'
    );
    assert.ok(
      source.includes('useResponsiveGridColumns(CHAPTER_GRID_BREAKPOINTS, 3)'),
      'useResponsiveGridColumns fallback for mobile must be 3 columns'
    );
  });

  it('unifies the header, legend, and DLC sections with horizontal dividers', () => {
    assert.ok(
      source.includes('border-t border-border-color'),
      'Must contain divider styling between sections'
    );
  });

  it('positions legend labels underneath character portraits in vertical stacks', () => {
    assert.ok(
      source.includes('flex flex-col items-center text-center gap-2'),
      'Legend items must stack the preview portrait and status text vertically'
    );
  });

  it('integrates onboardingStorage draft loading, saving, and clearing', () => {
    assert.ok(
      source.includes('loadOnboardingDraft'),
      'Must load existing draft from onboardingStorage'
    );
    assert.ok(
      source.includes('saveOnboardingDraft'),
      'Must auto-save draft to onboardingStorage on updates'
    );
    assert.ok(
      source.includes('clearOnboardingDraft'),
      'Must clear draft from onboardingStorage upon completion or skip'
    );
  });
});
