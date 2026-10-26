// frontend/src/__tests__/guards/pageShell.test.ts
//
// One shell and one background for every page: the locale layout mounts AppShell and AppBackground
// once, nothing else renders a sidebar or a background effect, and page wrappers use theme tokens.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SHELL_OUTER_CLASSNAME, ROUTE_SHELLS } from '@/components/layout/shellRoutes';

const SRC = path.resolve(__dirname, '../..');

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []
  );

const rel = (file: string) => path.relative(SRC, file).replace(/\\/g, '/');

describe('Page shell: one persistent sidebar + <main>, theme tokens only', () => {
  it("the shell's default outer wrapper uses theme tokens (they track all 3 site themes), not hardcoded slate colors", () => {
    assert.ok(DEFAULT_SHELL_OUTER_CLASSNAME.includes('text-text-primary'));
    assert.ok(!DEFAULT_SHELL_OUTER_CLASSNAME.includes('slate'));
  });

  it('every outer wrapper override in the route table also uses the text-text-primary token', () => {
    for (const { prefix, shell } of ROUTE_SHELLS) {
      if (shell && shell.outerClassName) {
        assert.ok(shell.outerClassName.includes('text-text-primary'), `/${prefix.join('/')} outerClassName must use text-text-primary`);
        assert.ok(!shell.outerClassName.includes('slate'), `/${prefix.join('/')} outerClassName must not use slate colors`);
      }
    }
  });

  it('no page, loading state or component paints a raw hex page background or a hardcoded slate one', () => {
    for (const file of walk(path.join(SRC, 'app/[locale]'))) {
      const content = fs.readFileSync(file, 'utf-8');
      assert.ok(!content.includes('bg-[#070b12]'), `${rel(file)} contains raw hardcoded bg-[#070b12]`);
      assert.ok(!/\bbg-slate-(50|950)\b/.test(content), `${rel(file)} hardcodes a slate page background`);
    }
  });

  it('the shell paints no background colour of its own and mounts no effects (AppBackground in the layout does)', () => {
    assert.ok(!/\bbg-bg-primary\b/.test(DEFAULT_SHELL_OUTER_CLASSNAME));
    for (const f of ['components/layout/AppShell.tsx', 'components/layout/shellRoutes.ts']) {
      assert.ok(!fs.readFileSync(path.join(SRC, f), 'utf-8').includes('decoration'), f);
    }
  });

  it('the locale layout mounts <AppShell> once, around the pages', () => {
    const layout = fs.readFileSync(path.join(SRC, 'app/[locale]/layout.tsx'), 'utf-8');
    assert.ok(layout.includes('<AppShell>{children}</AppShell>'));
  });

  it('only AppShell renders the Sidebar: no page, loading state or layout builds a second shell', () => {
    for (const file of walk(SRC)) {
      if (file.includes('__tests__')) continue;
      const content = fs.readFileSync(file, 'utf-8');
      if (rel(file) === 'components/layout/AppShell.tsx') {
        assert.ok(/<Sidebar\b/.test(content));
        continue;
      }
      assert.ok(!/<Sidebar\b/.test(content), `${rel(file)} renders its own <Sidebar>; the shell comes from AppShell`);
      assert.ok(!/<PageShell\b|PageShellFallback/.test(content), `${rel(file)} still uses the removed PageShell`);
      if (file.endsWith('.tsx') && rel(file) !== 'components/Sidebar.tsx') {
        assert.ok(!content.includes('lemon-shell-aside'), `${rel(file)} fakes a sidebar slot (lemon-shell-aside)`);
      }
    }
  });

  it('route loading states render content only, inside the persistent <main>', () => {
    const loadings = walk(path.join(SRC, 'app/[locale]')).filter((f) => f.endsWith('loading.tsx'));
    assert.ok(loadings.length > 0);
    for (const file of loadings) {
      const content = fs.readFileSync(file, 'utf-8').replace(/\/\/.*$/gm, '');
      assert.ok(!/<main\b/.test(content), `${rel(file)} renders its own <main>`);
      assert.ok(!/min-h-screen/.test(content), `${rel(file)} sizes itself to the whole screen`);
    }
  });

});

describe('Page background: one source of truth', () => {
  it('only AppBackground mounts a background effect, and the locale layout mounts it', () => {
    for (const file of walk(SRC)) {
      if (file.endsWith('AppBackground.tsx') || !/\.tsx$/.test(file)) continue;
      const content = fs.readFileSync(file, 'utf-8');
      assert.ok(!/<CampfireParticles\b/.test(content), `${file} mounts its own background effect`);
    }
    const layout = fs.readFileSync(path.resolve(SRC, 'app/[locale]/layout.tsx'), 'utf-8');
    assert.ok(layout.includes('<AppBackground />'));
  });
});
