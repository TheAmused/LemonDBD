// frontend/src/__tests__/guards/dependencyGuards.test.ts
//
// Every production dependency is imported somewhere. Unused ones still get installed in the Docker
// build (with their install scripts), need security overrides of their own and widen the supply
// chain: tsparticles x3, lottie-web and @xenova/transformers (~226 MB) were all never imported.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND = path.resolve(__dirname, '../../..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : sourceFiles(full);
    return /\.(ts|tsx|mjs|js)$/.test(entry.name) ? [full] : [];
  });
}

describe('dependencies', () => {
  it('every production dependency is imported by the app, its scripts or its config', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(FRONTEND, 'package.json'), 'utf8'));
    const files = [
      ...sourceFiles(path.join(FRONTEND, 'src')),
      ...sourceFiles(path.join(FRONTEND, 'scripts')),
      path.join(FRONTEND, 'next.config.ts'),
    ];
    const code = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    const unused = Object.keys(pkg.dependencies).filter((name) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
      return !new RegExp(`(?:from\\s+|import\\s*\\(\\s*|require\\(\\s*|import\\s+)['"]${escaped}(?:/[^'"]*)?['"]`).test(code);
    });
    assert.deepEqual(unused, [], `Declared but never imported (remove them): ${unused.join(', ')}`);
  });
});
