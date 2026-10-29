import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../..');
const frontendDir = path.join(repoRoot, 'frontend');
const srcDir = path.join(frontendDir, 'src');
const additionsDir = path.join(repoRoot, 'additions');

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

interface ImportRecord {
  file: string;
  line: number;
  icons: string[];
  raw: string;
}

const files = findFiles(srcDir);
const iconUsage: Record<string, number> = {};
const iconLocations: Record<string, string[]> = {};
const fileUsage: ImportRecord[] = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(frontendDir, file).replace(/\\/g, '/');

  const importRegex = /import\s*(?:type\s*)?\{([^{}]+)\}\s*from\s*['"]lucide-react['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const rawMatch = match[0];
    const rawImports = match[1];
    const upToMatch = content.slice(0, match.index);
    const lineNumber = upToMatch.split('\n').length;

    const icons = rawImports
      .split(',')
      .map((s) => s.trim().replace(/^type\s+/, ''))
      .filter((s) => s && !s.startsWith('//'))
      .map((s) => s.split(/\s+as\s+/)[0].trim())
      .filter((s) => s && !s.includes('\n') && !s.includes(' '));

    fileUsage.push({
      file: relPath,
      line: lineNumber,
      icons,
      raw: rawMatch.replace(/\s+/g, ' ').trim(),
    });

    for (const icon of icons) {
      iconUsage[icon] = (iconUsage[icon] || 0) + 1;
      if (!iconLocations[icon]) iconLocations[icon] = [];
      iconLocations[icon].push(`${relPath}:${lineNumber}`);
    }
  }
}

// Group files by module/section
const groups: Record<string, ImportRecord[]> = {};
for (const item of fileUsage) {
  let group = 'Other';
  if (item.file.startsWith('src/components/admin/')) group = 'Admin Components';
  else if (item.file.startsWith('src/components/streaks/')) group = 'Streaks & Challenges';
  else if (item.file.startsWith('src/components/tier-lists/')) group = 'Tier Lists';
  else if (item.file.startsWith('src/components/user/')) group = 'User Profile & Settings';
  else if (item.file.startsWith('src/components/character-detail/')) group = 'Character Detail';
  else if (item.file.startsWith('src/components/characters/')) group = 'Characters';
  else if (item.file.startsWith('src/components/common/')) group = 'Common / Shared Primitives';
  else if (item.file.startsWith('src/components/sidebar/')) group = 'Sidebar & Navigation';
  else if (item.file.startsWith('src/components/smash-or-pass/')) group = 'Smash or Pass';
  else if (item.file.startsWith('src/components/maps/')) group = 'Maps';
  else if (item.file.startsWith('src/components/generator/')) group = 'Randomizer / Generator';
  else if (item.file.startsWith('src/components/minigames/')) group = 'Mini-games';
  else if (item.file.startsWith('src/components/perks/')) group = 'Perks';
  else if (item.file.startsWith('src/components/auth/')) group = 'Auth';
  else if (item.file.startsWith('src/components/changelog/')) group = 'Changelog';
  else if (item.file.startsWith('src/components/')) group = 'Root Components';
  else if (item.file.startsWith('src/app/')) group = 'App Router Pages';
  else if (item.file.startsWith('src/__tests__/')) group = 'Tests';

  if (!groups[group]) groups[group] = [];
  groups[group].push(item);
}

// Build Markdown
let md = `# Current Installments of Lucide Icons in LemonDBD Frontend

> **WARNING TO ALL AI ASSISTANTS (Claude, Gemini, ChatGPT, etc.):**
> **DO NOT INTRODUCE NEW LUCIDE ICONS TO THIS REPOSITORY.**
> We are actively phasing out and quarantining \`lucide-react\`.
> Prefer custom Dead by Daylight SVG icons located in \`src/components/icons/DbdIcons.tsx\`
> or dedicated feature icons (e.g. \`components/icons/smash/\`).
> Any new Lucide icon imports will fail the build guard and CI checks.

---

## Executive Summary

- **Total Files with Lucide Icons**: ${new Set(fileUsage.map((f) => f.file)).size}
- **Total Import Statements**: ${fileUsage.length}
- **Total Unique Lucide Icons Used**: ${Object.keys(iconUsage).length}
- **Total Icon Usages across codebase**: ${Object.values(iconUsage).reduce((a, b) => a + b, 0)}

---

## Frequency Ranking (All Unique Icons)

| Icon Name | Occurrences | Sample Locations |
| :--- | :---: | :--- |
`;

const sortedIcons = Object.entries(iconUsage).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
for (const [icon, count] of sortedIcons) {
  const samples = (iconLocations[icon] || []).slice(0, 3).map((l) => `\`${l}\``).join(', ');
  const more = (iconLocations[icon] || []).length > 3 ? ` *(+${iconLocations[icon].length - 3} more)*` : '';
  md += `| \`${icon}\` | ${count} | ${samples}${more} |\n`;
}

md += `\n---\n\n## Complete Installment Manifest by Section\n\n`;

const sortedGroupNames = Object.keys(groups).sort();
for (const groupName of sortedGroupNames) {
  const records = groups[groupName];
  md += `### ${groupName} (${records.length} files)\n\n`;
  md += `| File Path | Line | Imported Icons |\n`;
  md += `| :--- | :---: | :--- |\n`;

  records.sort((a, b) => a.file.localeCompare(b.file));
  for (const rec of records) {
    const iconTags = rec.icons.map((i) => `\`${i}\``).join(', ');
    md += `| \`${rec.file}\` | ${rec.line} | ${iconTags} |\n`;
  }
  md += `\n`;
}

fs.writeFileSync(path.join(additionsDir, 'lucide-icons.md'), md, 'utf8');
console.log('Successfully wrote additions/lucide-icons.md');
