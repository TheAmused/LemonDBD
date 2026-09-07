// frontend/src/__tests__/unit/pageThemeRoots.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Page Root Theme Wrapper Consistency', () => {
  // These pages render their shell through the shared <PageShell> component
  // (frontend/src/components/layout/PageShell.tsx), whose default outer
  // wrapper uses the theme-token classes `bg-bg-primary`/`text-text-primary`
  // -- which track all 3 site themes (light, light-lemon, dark) -- instead of
  // the old per-page `bg-slate-50 dark:bg-slate-950` pattern, which silently
  // broke the light-lemon theme on every page still using it.
  const shellPageRoutes = [
    'admin/page.tsx',
    'page.tsx',
    'perks/page.tsx',
    'characters/page.tsx',
    'characters/[slug]/page.tsx',
    'characters/guesser/page.tsx',
    'randomizer/page.tsx',
    'smash-or-pass/page.tsx',
    'user/page.tsx',
    'builds/page.tsx',
    'custom-perks/page.tsx',
    'draft/page.tsx',
    'killer-calculator/page.tsx',
    'maps/page.tsx',
    'quests/page.tsx',
    'swf/page.tsx',
  ];

  for (const relPath of shellPageRoutes) {
    it(`${relPath} renders its shell via <PageShell> with theme-token colors, not a raw hex background`, () => {
      const fullPath = path.resolve(__dirname, '../../app/[locale]', relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      assert.ok(!content.includes('bg-[#070b12]'), `${relPath} still contains raw hardcoded bg-[#070b12]`);
      assert.ok(content.includes('<PageShell'), `${relPath} must render through the shared <PageShell> component`);
      // A page may override PageShell's default outer wrapper (e.g. for a
      // decoration slot) -- when it does, the override must still use the
      // theme tokens rather than reintroducing hardcoded slate colors.
      const outerOverrideMatch = content.match(/outerClassName=["'`]([^"'`]+)["'`]/);
      if (outerOverrideMatch) {
        assert.ok(
          outerOverrideMatch[1].includes('bg-bg-primary') && outerOverrideMatch[1].includes('text-text-primary'),
          `${relPath}'s outerClassName override must use bg-bg-primary/text-text-primary, not hardcoded slate colors`
        );
      }
    });
  }

  it("PageShell's own default outer wrapper uses theme tokens, not hardcoded slate colors", () => {
    // The assertions above only catch a page's own outerClassName override --
    // 13 of the 16 shell pages pass none and rely entirely on this default,
    // so it's the actual source of truth for the light-lemon theme fix.
    const shellPath = path.resolve(__dirname, '../../components/layout/PageShell.tsx');
    const content = fs.readFileSync(shellPath, 'utf-8');
    const defaultMatch = content.match(/DEFAULT_OUTER_CLASSNAME\s*=\s*\n?\s*['"`]([^'"`]+)['"`]/);
    assert.ok(defaultMatch, 'Could not find DEFAULT_OUTER_CLASSNAME in PageShell.tsx');
    const defaultClassName = defaultMatch![1];
    assert.ok(
      defaultClassName.includes('bg-bg-primary') && defaultClassName.includes('text-text-primary'),
      `PageShell's DEFAULT_OUTER_CLASSNAME must use bg-bg-primary/text-text-primary, not hardcoded slate colors: "${defaultClassName}"`
    );
    assert.ok(
      !defaultClassName.includes('slate'),
      `PageShell's DEFAULT_OUTER_CLASSNAME must not reintroduce hardcoded slate colors: "${defaultClassName}"`
    );
  });

  // These loading skeletons render independently of <PageShell> (no sidebar
  // props to thread through a Suspense fallback) and still use the older
  // slate-based pattern -- unchanged by the PageShell migration, so they keep
  // the original literal-class check.
  const legacySlateRoutes = [
    'characters/loading.tsx',
    'characters/[slug]/loading.tsx',
    'smash-or-pass/loading.tsx',
  ];

  for (const relPath of legacySlateRoutes) {
    it(`${relPath} does not have hardcoded bg-[#070b12] without dark: variant`, () => {
      const fullPath = path.resolve(__dirname, '../../app/[locale]', relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      assert.ok(!content.includes('bg-[#070b12]'), `${relPath} still contains raw hardcoded bg-[#070b12]`);
      assert.ok(
        content.includes('dark:bg-slate-950') && content.includes('dark:text-slate-100'),
        `${relPath} must include dark:bg-slate-950 dark:text-slate-100`
      );
    });
  }

  // These route-level loading.tsx files (and the maps/perks/randomizer
  // page.tsx Suspense fallbacks above) render before PageShell/Sidebar ever
  // mount, so they render through PageShellFallback -- PageShell's
  // pre-hydration twin -- rather than <PageShell> itself.
  const pageShellFallbackRoutes = ['maps/loading.tsx', 'perks/loading.tsx', 'randomizer/loading.tsx'];

  for (const relPath of pageShellFallbackRoutes) {
    it(`${relPath} renders through the shared <PageShellFallback>, not a raw hex background`, () => {
      const fullPath = path.resolve(__dirname, '../../app/[locale]', relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      assert.ok(!content.includes('bg-[#070b12]'), `${relPath} still contains raw hardcoded bg-[#070b12]`);
      assert.ok(
        !content.includes('bg-slate-50') && !content.includes('dark:bg-slate-950'),
        `${relPath} must not reintroduce the hardcoded slate background PageShellFallback replaced`
      );
      assert.ok(
        content.includes('<PageShellFallback'),
        `${relPath} must render through the shared <PageShellFallback> component`
      );
    });
  }
});
