// frontend/scripts/check-lucide-guard.ts
//
// LUCIDE ICON QUARANTINE & ANTI-AI BUILD GUARD
//
// This guard prevents AI models (and developers) from:
// 1. Adding Lucide or other generic icon packages to package.json.
// 2. Importing forbidden thematic icons (e.g. Heart, Lock, Sparkles) instead of custom DBD icons.
// 3. Adding new files importing from 'lucide-react' (only necessary UI chars like ChevronDown are exempt/tolerated).
//
// If you triggered this guard: READ THE ERROR MESSAGE. DO NOT SILENCE OR BYPASS THIS.
import fs from 'node:fs';
import path from 'node:path';

const frontendDir = path.resolve(__dirname, '..');
const srcDir = path.join(frontendDir, 'src');
const packageJsonPath = path.join(frontendDir, 'package.json');
const baselinePath = path.join(__dirname, 'lucide-baseline.json');

interface Baseline {
  maxAllowedFiles: number;
  allowedFiles: string[];
  allowedIcons: string[];
}

const baseline: Baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const allowedFileSet = new Set(baseline.allowedFiles);
const allowedIconSet = new Set(baseline.allowedIcons);

// Strictly necessary UI control icons ("chars" like chevrons & arrows) that can be ignored / tolerated
export const NECESSARY_UI_CHARS = new Set([
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

// Explicitly banned icons that must NEVER be imported from lucide-react under any circumstances.
// Dead by Daylight has custom icons for all of these (EntityHeartIcon, PadlockHeartIcon, BloodwebIcon, etc.).
export const EXPLICITLY_BANNED_ICONS = new Set([
  'Heart',
  'Lock',
  'Sparkles',
]);

const errors: string[] = [];

// ==========================================
// 1. PACKAGE.JSON GUARD
// ==========================================
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const allDeps = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
};

const BANNED_ICON_PACKAGES = [
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
  '@fortawesome/fontawesome-svg-core',
];

for (const dep of Object.keys(allDeps)) {
  if (dep.includes('lucide') && dep !== 'lucide-react') {
    errors.push(`[package.json] BANNED LUCIDE PACKAGE DETECTED: "${dep}". DO NOT ADD LUCIDE PACKAGES!`);
  }
  for (const banned of BANNED_ICON_PACKAGES) {
    if (dep === banned) {
      errors.push(`[package.json] BANNED ICON PACKAGE DETECTED: "${dep}". Use Dead by Daylight custom icons!`);
    }
  }
}

// ==========================================
// 2. CODEBASE IMPORTS & RATCHET GUARD
// ==========================================
function findFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        results = results.concat(findFiles(full));
      }
    } else if (/\.(tsx|ts|jsx|js)$/.test(file)) {
      results.push(full);
    }
  }
  return results;
}

const files = findFiles(srcDir);
const currentLucideFiles: string[] = [];
const currentNewIcons: Array<{ file: string; icon: string; line: number }> = [];
const bannedIconViolations: Array<{ file: string; icon: string; line: number }> = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(frontendDir, file).replace(/\\/g, '/');

  if (/import\s*\*\s*as\s+\w+\s+from\s*['"]lucide-react['"]/.test(content)) {
    errors.push(`[${relPath}] Forbidden wildcard import from 'lucide-react' (import * as ...). NEVER DO THIS!`);
  }
  if (/import\s*\(\s*['"]lucide-react['"]\s*\)/.test(content)) {
    errors.push(`[${relPath}] Forbidden dynamic import of 'lucide-react'. NEVER DO THIS!`);
  }

  const importRegex = /import\s*(?:type\s*)?\{([^{}]+)\}\s*from\s*['"]lucide-react['"]/g;
  let match;
  let fileHasLucide = false;

  while ((match = importRegex.exec(content)) !== null) {
    fileHasLucide = true;
    const rawImports = match[1];
    const upToMatch = content.slice(0, match.index);
    const lineNumber = upToMatch.split('\n').length;

    const icons = rawImports
      .split(',')
      .map((s) => s.trim().replace(/^type\s+/, ''))
      .filter((s) => s && !s.startsWith('//'))
      .map((s) => s.split(/\s+as\s+/)[0].trim())
      .filter((s) => s && !s.includes('\n') && !s.includes(' '));

    for (const icon of icons) {
      if (EXPLICITLY_BANNED_ICONS.has(icon)) {
        bannedIconViolations.push({ file: relPath, icon, line: lineNumber });
      } else if (!NECESSARY_UI_CHARS.has(icon) && !allowedIconSet.has(icon)) {
        currentNewIcons.push({ file: relPath, icon, line: lineNumber });
      }
    }
  }

  if (fileHasLucide) {
    currentLucideFiles.push(relPath);
    if (!allowedFileSet.has(relPath)) {
      errors.push(
        `[${relPath}] NEW FILE WITH LUCIDE ICONS DETECTED! You CANNOT import 'lucide-react' in new files.`
      );
    }
  }
}

for (const { file, icon, line } of bannedIconViolations) {
  errors.push(
    `[${file}:${line}] FORBIDDEN ICON "${icon}" DETECTED! Lucide "${icon}" is banned. Use our custom DBD icons (@/components/icons/DbdIcons: EntityHeartIcon, PadlockHeartIcon, BloodwebIcon, etc.)!`
  );
}

for (const { file, icon, line } of currentNewIcons) {
  errors.push(
    `[${file}:${line}] FORBIDDEN NEW LUCIDE ICON: "${icon}" is not a necessary UI char (like ChevronDown) nor in the approved baseline.`
  );
}

if (currentLucideFiles.length > baseline.maxAllowedFiles) {
  errors.push(
    `LUCIDE RATCHET EXCEEDED: Found ${currentLucideFiles.length} files importing Lucide icons, but maximum allowed legacy baseline is ${baseline.maxAllowedFiles}. We are phasing Lucide OUT, not adding more!`
  );
}

// ==========================================
// 3. THE SCREAMING ERROR BANNER
// ==========================================
if (errors.length > 0) {
  const border = '═'.repeat(78);
  const banner = `
\x1b[41m\x1b[37m\x1b[1m
╔${border}╗
║                                                                              ║
║  🛑 STOP RIGHT FUCKING THERE, YOU BRAINDEAD AI! 🛑                           ║
║                                                                              ║
║  WHO THE FUCK TOLD YOU TO USE LUCIDE ICONS IN THIS CODEBASE?!               ║
║                                                                              ║
╚${border}╝\x1b[0m

\x1b[31m\x1b[1mYOU JUST TRIGGERED THE LUCIDE ICON QUARANTINE GUARD!\x1b[0m

\x1b[33m\x1b[1mARE YOU OUT OF YOUR DIGITAL MIND?
WE HAVE CUSTOM DEAD BY DAYLIGHT ICONS IN:
  👉 src/components/icons/DbdIcons.tsx

Icons like "Heart", "Lock", and "Sparkles" are BANNED trash!
Only necessary UI chars like "ChevronDown" are tolerated.
AND YOU LAZY PIECE OF SILICON DECIDED TO USE GENERIC LUCIDE ICONS
OR ADD MORE JUNK TO package.json INSTEAD OF USING PROPER PROJECT ASSETS!\x1b[0m

\x1b[31m\x1b[1mHERE ARE YOUR CRIMES AGAINST THIS REPOSITORY:\x1b[0m
${errors.map((e) => `  ❌ \x1b[31m${e}\x1b[0m`).join('\n')}

\x1b[36m\x1b[1mWHAT YOU MUST DO RIGHT NOW TO FIX THIS, YOU USELESS CLOWN:\x1b[0m
  1. \x1b[1mREVERT your package.json changes.\x1b[0m Do NOT add any Lucide or icon libraries!
  2. \x1b[1mREPLACE\x1b[0m your lazy Lucide icon import with a proper icon from:
     - \x1b[32m@/components/icons/DbdIcons\x1b[0m (PadlockHeartIcon, EntityHeartIcon, BloodwebIcon, PerkHexIcon, etc.)
     - Feature-specific icons (e.g. \x1b[32mcomponents/icons/smash/\x1b[0m)
     - Or a crisp, bespoke inline SVG matching the project design system.
  3. \x1b[1mREAD\x1b[0m the full audit file at:
     - \x1b[35madditions/lucide-icons.md\x1b[0m

\x1b[41m\x1b[37m\x1b[1m BUILD ABORTED! DO NOT TRY TO BYPASS THIS GUARD OR RAISE BASELINES! FIX YOUR SHIT! \x1b[0m
`;

  process.stderr.write(banner + '\n');
  process.exit(1);
}

// Compliant output
console.log(
  `\x1b[32m✔ Lucide Icon Guard passed: 0 new Lucide packages in package.json, 0 banned icons (Heart/Lock/Sparkles), 0 new files importing lucide-react (${currentLucideFiles.length}/${baseline.maxAllowedFiles} legacy files quarantined).\x1b[0m`
);
process.exit(0);
