import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Page Root Theme Wrapper Consistency', () => {
  const routes = [
    'admin/page.tsx',
    'page.tsx',
    'perks/page.tsx',
    'characters/page.tsx',
    'characters/[slug]/page.tsx',
    'randomizer/page.tsx',
    'smash-or-pass/page.tsx',
    'user/page.tsx',
  ];

  for (const relPath of routes) {
    it(`${relPath} does not have hardcoded bg-[#070b12] without dark: variant`, () => {
      const fullPath = path.resolve(__dirname, '../../app/[locale]', relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      assert.ok(
        !content.includes('className="min-h-screen bg-[#070b12] text-slate-100') &&
        !content.includes('className="h-dvh overflow-hidden bg-[#070b12] text-slate-100'),
        `${relPath} still has raw hardcoded bg-[#070b12] text-slate-100`
      );
      assert.ok(
        content.includes('dark:bg-slate-950') && content.includes('dark:text-slate-100'),
        `${relPath} must include dark:bg-slate-950 dark:text-slate-100`
      );
    });
  }
});
