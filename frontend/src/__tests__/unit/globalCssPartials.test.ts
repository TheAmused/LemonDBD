// frontend/src/__tests__/unit/globalCssPartials.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { globalCssPartials, readGlobalCss } from '../../../scripts/lib/globalCss';

const appDir = path.resolve(__dirname, '../../app');
const entry = path.join(appDir, 'globals.css');
const stylesDir = path.join(appDir, 'styles');

describe('globals.css partials', () => {
  it('imports every stylesheet in app/styles, so no partial is silently dead', () => {
    const imported = new Set(globalCssPartials(entry));
    const onDisk = fs.readdirSync(stylesDir).filter((name) => name.endsWith('.css')).map((name) => path.join(stylesDir, name));
    assert.ok(onDisk.length > 0, 'expected partials in src/app/styles');
    const orphans = onDisk.filter((file) => !imported.has(file)).map((file) => path.relative(appDir, file));
    assert.deepEqual(orphans, [], 'these partials are not imported by globals.css, so their rules never ship');
  });

  it('imports only partials that exist', () => {
    for (const file of globalCssPartials(entry)) {
      assert.ok(fs.existsSync(file), `globals.css imports a missing file: ${file}`);
    }
  });

  it('inlines every relative @import and keeps the package import', () => {
    const css = readGlobalCss(entry);
    assert.match(css, /@import "tailwindcss";/, 'the Tailwind package import must stay in the entry');
    assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /@import[^;\n]*["'(]\s*\.{1,2}\//);
  });

  it('inlines the import forms CSS allows, not just a bare quoted path', () => {
    const dir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? '/tmp', 'globalcss-'));
    try {
      fs.writeFileSync(path.join(dir, 'a.css'), '.a { color: red; }\n');
      fs.writeFileSync(path.join(dir, 'b.css'), '.b { color: blue; }\n');
      fs.writeFileSync(path.join(dir, 'c.css'), '.c { color: green; }\n');
      fs.writeFileSync(
        path.join(dir, 'entry.css'),
        '@import "tailwindcss";\n@import "./a.css"; /* trailing comment */\n@import url("./b.css");\n@import \'./c.css\' layer(base);\n'
      );
      const css = readGlobalCss(path.join(dir, 'entry.css'));
      for (const rule of ['.a {', '.b {', '.c {']) assert.ok(css.includes(rule), `${rule} was not inlined`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails loudly when a relative @import cannot be inlined', () => {
    const dir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? '/tmp', 'globalcss-'));
    try {
      fs.writeFileSync(path.join(dir, 'entry.css'), '@import "./a.css";\n@media print { @import "./b.css"; }\n');
      fs.writeFileSync(path.join(dir, 'a.css'), '.a {}\n');
      assert.throws(() => readGlobalCss(path.join(dir, 'entry.css')), /could not inline/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
