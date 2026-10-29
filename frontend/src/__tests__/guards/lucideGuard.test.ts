// frontend/src/__tests__/guards/lucideGuard.test.ts
//
// Guard against Lucide icons spreading further in LemonDBD.
// Every new feature and component MUST use custom DBD icons from
// components/icons/DbdIcons or bespoke SVGs. Lucide icons are strictly quarantined.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND = path.resolve(__dirname, '../../..');
const SRC = path.join(FRONTEND, 'src');
const BASELINE_PATH = path.join(FRONTEND, 'scripts', 'lucide-baseline.json');

interface Baseline {
  maxAllowedFiles: number;
  allowedFiles: string[];
  allowedIcons: string[];
}

function findFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '__tests__') {
        results = results.concat(findFiles(full));
      }
    } else if (/\.(tsx|ts|jsx|js)$/.test(file)) {
      results.push(full);
    }
  }
  return results;
}

const NECESSARY_UI_CHARS = new Set([
  'ChevronDown',
  'ChevronUp',
  'ChevronLeft',
  'ChevronRight',
  'ChevronsLeft',
  'ChevronsRight',
  'ChevronsUpDown',
  'ChevronFirst',
  'ChevronLast',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'ArrowUpDown',
  'ArrowDownUp',
  'ArrowDownAZ',
  'ArrowDownToLine',
  'X',
  'Menu',
  'Minus',
  'Maximize2',
  'Minimize2',
  'LucideIcon',
]);

const BANNED_THEMATIC_ICONS = new Set([
  'Heart',
  'Lock',
  'Sparkles',
]);

describe('lucide quarantine guards', () => {
  it('package.json contains no generic icon packages and no new lucide packages', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(FRONTEND, 'package.json'), 'utf8'));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    const BANNED = [
      'lucide',
      '@lucide/lab',
      '@lucide/react',
      'react-icons',
      '@heroicons/react',
      '@heroicons/vue',
      'feather-icons',
      '@tabler/icons',
      '@tabler/icons-react',
      'ionicons',
      '@fortawesome/react-fontawesome',
    ];

    for (const dep of Object.keys(allDeps)) {
      if (dep.includes('lucide') && dep !== 'lucide-react') {
        assert.fail(`Forbidden lucide package in package.json: "${dep}". DO NOT ADD LUCIDE!`);
      }
      if (BANNED.includes(dep)) {
        assert.fail(`Forbidden icon package in package.json: "${dep}". Use Dead by Daylight custom icons!`);
      }
    }
  });

  it('no banned thematic icons (Heart, Lock, Sparkles) are imported anywhere', () => {
    const files = findFiles(SRC);
    const offenders: Array<{ file: string; icon: string }> = [];
    const importRegex = /import\s*(?:type\s*)?\{([^{}]+)\}\s*from\s*['"]lucide-react['"]/g;

    for (const file of files) {
      const rel = path.relative(FRONTEND, file).replace(/\\/g, '/');
      const text = fs.readFileSync(file, 'utf8');
      let match;
      while ((match = importRegex.exec(text)) !== null) {
        const icons = match[1]
          .split(',')
          .map((s) => s.trim().replace(/^type\s+/, ''))
          .filter((s) => s && !s.startsWith('//'))
          .map((s) => s.split(/\s+as\s+/)[0].trim())
          .filter((s) => s && !s.includes('\n') && !s.includes(' '));

        for (const icon of icons) {
          if (BANNED_THEMATIC_ICONS.has(icon)) {
            offenders.push({ file: rel, icon });
          }
        }
      }
    }

    assert.deepEqual(
      offenders,
      [],
      `\n🚨 BANNED ICONS DETECTED! Replace with @/components/icons/DbdIcons:\n${offenders
        .map((o) => `${o.file}: ${o.icon}`)
        .join('\n')}`
    );
  });

  it('no new files import from lucide-react beyond the quarantined legacy baseline', () => {
    const baseline: Baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    const allowed = new Set(baseline.allowedFiles);

    const files = findFiles(SRC);
    const offenders: string[] = [];

    for (const file of files) {
      const rel = path.relative(FRONTEND, file).replace(/\\/g, '/');
      const text = fs.readFileSync(file, 'utf8');
      if (/import\s*(?:type\s*)?\{[^{}]+\}\s*from\s*['"]lucide-react['"]/.test(text)) {
        if (!allowed.has(rel)) {
          offenders.push(rel);
        }
      }
    }

    assert.deepEqual(
      offenders,
      [],
      `\n🚨 STOP! You imported lucide-react in new files! Use @/components/icons/DbdIcons or bespoke SVGs:\n${offenders.join(
        '\n'
      )}`
    );
  });

  it('no new non-char lucide icons beyond the approved baseline are used', () => {
    const baseline: Baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    const allowedIcons = new Set(baseline.allowedIcons);

    const files = findFiles(SRC);
    const newIcons: Array<{ file: string; icon: string }> = [];
    const importRegex = /import\s*(?:type\s*)?\{([^{}]+)\}\s*from\s*['"]lucide-react['"]/g;

    for (const file of files) {
      const rel = path.relative(FRONTEND, file).replace(/\\/g, '/');
      const text = fs.readFileSync(file, 'utf8');
      let match;
      while ((match = importRegex.exec(text)) !== null) {
        const icons = match[1]
          .split(',')
          .map((s) => s.trim().replace(/^type\s+/, ''))
          .filter((s) => s && !s.startsWith('//'))
          .map((s) => s.split(/\s+as\s+/)[0].trim())
          .filter((s) => s && !s.includes('\n') && !s.includes(' '));

        for (const icon of icons) {
          if (!NECESSARY_UI_CHARS.has(icon) && !allowedIcons.has(icon)) {
            newIcons.push({ file: rel, icon });
          }
        }
      }
    }

    assert.deepEqual(
      newIcons,
      [],
      `\n🚨 FORBIDDEN LUCIDE ICONS! These icons are not approved in the legacy baseline:\n${newIcons
        .map((n) => `${n.file}: ${n.icon}`)
        .join('\n')}`
    );
  });

  it('no wildcard or dynamic imports of lucide-react exist anywhere', () => {
    const files = findFiles(SRC);
    const bad: string[] = [];

    for (const file of files) {
      const rel = path.relative(FRONTEND, file).replace(/\\/g, '/');
      const text = fs.readFileSync(file, 'utf8');
      if (/import\s*\*\s*as\s+\w+\s+from\s*['"]lucide-react['"]/.test(text)) {
        bad.push(`${rel}: wildcard import`);
      }
      if (/import\s*\(\s*['"]lucide-react['"]\s*\)/.test(text)) {
        bad.push(`${rel}: dynamic import`);
      }
    }

    assert.deepEqual(bad, [], `Forbidden lucide-react import forms:\n${bad.join('\n')}`);
  });
});
