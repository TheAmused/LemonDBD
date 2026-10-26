// frontend/src/__tests__/guards/lintGuards.test.ts
//
// Linting is a gate, not a suggestion: `npm run build` runs the lint first and stops on any
// error or warning, and nothing may switch the lint off (no suppression comments, no rule set
// to off). The only exception is the image component's bare <img>.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findLintSuppressions } from '../../../scripts/check-lint-suppressions';

const ROOT = path.resolve(__dirname, '../../..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> };

/** Built from pieces so this file does not trip the guard it tests. */
const directive = (tool: string, kind: string) => `${tool}-${kind}`;

function withProject(files: Record<string, string>, run: (root: string) => void) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-guard-'));
  try {
    for (const [name, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
      fs.writeFileSync(path.join(root, name), text);
    }
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const CLEAN_CONFIG = JSON.stringify({ options: { denyWarnings: true }, rules: { 'react/jsx-key': 'error' } });

describe('lint gate: the build stops on lint problems', () => {
  // The suppression scan itself is the "the project has none" test below, which every unit-test run
  // executes; prebuild only needs the lint, so nothing runs twice.
  it('prebuild runs the lint, so `npm run build` stops on any lint error or warning', () => {
    assert.equal((pkg.scripts.prebuild ?? '').trim(), 'npm run lint');
  });

  it('the lint is the plain oxlint run: warnings are not silenced or tolerated', () => {
    const lint = pkg.scripts.lint ?? '';
    assert.match(lint, /^oxlint\b/);
    assert.doesNotMatch(lint, /--(quiet|silent|max-warnings|allow|disable)|\s-A\b|\|\||;/);
  });

  it('oxlint treats warnings as failures', () => {
    const text = fs.readFileSync(path.join(ROOT, '.oxlintrc.json'), 'utf8');
    assert.match(text, /"denyWarnings"\s*:\s*true/);
  });

  it('the build itself cannot skip lint or type errors', () => {
    assert.doesNotMatch(pkg.scripts.build ?? '', /--no-lint|--experimental-build-mode/);
    const nextConfig = fs.readFileSync(path.join(ROOT, 'next.config.ts'), 'utf8');
    assert.doesNotMatch(nextConfig, /ignoreDuringBuilds|ignoreBuildErrors/);
  });

  it('the guards run with the rest of the guard suite', () => {
    // test:guards runs every file in this folder, so being here is being in the suite.
    assert.match(pkg.scripts['test:guards'] ?? '', /src\/__tests__\/guards\/\*\.test\.ts/);
    assert.ok(fs.existsSync(path.join(ROOT, 'src/__tests__/guards/lintGuards.test.ts')));
  });
});

describe('lint suppressions: nothing switches the lint off', () => {
  it('the project has none', () => {
    const found = findLintSuppressions(ROOT);
    assert.deepEqual(found, [], `Linting is switched off:\n${found.join('\n')}`);
  });

  it('flags a suppression comment', () => {
    for (const tool of ['oxlint', 'eslint']) {
      withProject(
        { '.oxlintrc.json': CLEAN_CONFIG, 'src/a.ts': `// ${directive(tool, 'disable-next-line')} no-console\nconsole.log(1);\n` },
        (root) => assert.equal(findLintSuppressions(root).length, 1),
      );
    }
  });

  it('flags a block suppression comment', () => {
    withProject(
      { '.oxlintrc.json': CLEAN_CONFIG, 'src/a.tsx': `/* ${directive('eslint', 'disable')} */\nexport {};\n` },
      (root) => assert.equal(findLintSuppressions(root).length, 1),
    );
  });

  it('flags a rule turned off, in the rules and in an override', () => {
    withProject({ '.oxlintrc.json': JSON.stringify({ options: { denyWarnings: true }, rules: { 'react/jsx-key': 'off' } }) }, (root) =>
      assert.equal(findLintSuppressions(root).length, 1),
    );
    withProject(
      {
        '.oxlintrc.json': JSON.stringify({
          options: { denyWarnings: true },
          overrides: [{ files: ['src/x.ts'], rules: { 'no-console': 'off' } }],
        }),
      },
      (root) => assert.equal(findLintSuppressions(root).length, 1),
    );
  });

  it('allows only the image component to turn off the <img> rule', () => {
    const override = (files: string[]) =>
      JSON.stringify({ options: { denyWarnings: true }, overrides: [{ files, rules: { 'nextjs/no-img-element': 'off' } }] });
    withProject({ '.oxlintrc.json': override(['src/components/common/Img.tsx']) }, (root) =>
      assert.deepEqual(findLintSuppressions(root), []),
    );
    withProject({ '.oxlintrc.json': override(['src/components/Other.tsx']) }, (root) => assert.equal(findLintSuppressions(root).length, 1));
    withProject({ '.oxlintrc.json': override(['src/components/common/Img.tsx', 'src/components/Other.tsx']) }, (root) =>
      assert.equal(findLintSuppressions(root).length, 1),
    );
  });

  it('allows the two custom ARIA widgets to turn off prefer-tag-over-role, and nothing else', () => {
    const override = (files: string[], rule = 'jsx-a11y/prefer-tag-over-role') =>
      JSON.stringify({ options: { denyWarnings: true }, overrides: [{ files, rules: { [rule]: 'off' } }] });
    const widgets = ['src/components/minigames/CharacterAutocomplete.tsx', 'src/components/common/RichTextEditor.tsx'];
    withProject({ '.oxlintrc.json': override(widgets) }, (root) => assert.deepEqual(findLintSuppressions(root), []));
    withProject({ '.oxlintrc.json': override([...widgets, 'src/components/Other.tsx']) }, (root) =>
      assert.equal(findLintSuppressions(root).length, 1),
    );
    withProject({ '.oxlintrc.json': override(widgets, 'jsx-a11y/alt-text') }, (root) => assert.equal(findLintSuppressions(root).length, 1));
  });

  it('flags extra ignored paths and a config that lets warnings through', () => {
    withProject({ '.oxlintrc.json': JSON.stringify({ options: { denyWarnings: true }, ignorePatterns: ['src/legacy/**'] }) }, (root) =>
      assert.equal(findLintSuppressions(root).length, 1),
    );
    withProject({ '.oxlintrc.json': JSON.stringify({ rules: {} }) }, (root) => assert.equal(findLintSuppressions(root).length, 1));
  });

  it('reads the commented, trailing-comma config format', () => {
    withProject(
      { '.oxlintrc.json': '{\n  // note\n  "options": { "denyWarnings": true, },\n  "rules": { "a/b": "error", /* x */ },\n}' },
      (root) => assert.deepEqual(findLintSuppressions(root), []),
    );
  });
});
