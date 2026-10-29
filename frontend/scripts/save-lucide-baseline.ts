import fs from 'node:fs';
import path from 'node:path';

const frontendDir = path.resolve(__dirname, '..');
const srcDir = path.join(frontendDir, 'src');

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
const filesWithLucide: string[] = [];
const allowedIcons = new Set<string>();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(frontendDir, file).replace(/\\/g, '/');

  const importRegex = /import\s*(?:type\s*)?\{([^{}]+)\}\s*from\s*['"]lucide-react['"]/g;
  let match;
  let hasLucide = false;
  while ((match = importRegex.exec(content)) !== null) {
    hasLucide = true;
    const icons = match[1]
      .split(',')
      .map((s) => s.trim().replace(/^type\s+/, ''))
      .filter((s) => s && !s.startsWith('//'))
      .map((s) => s.split(/\s+as\s+/)[0].trim())
      .filter((s) => s && !s.includes('\n') && !s.includes(' '));

    for (const icon of icons) {
      allowedIcons.add(icon);
    }
  }

  if (hasLucide) {
    filesWithLucide.push(relPath);
  }
}

filesWithLucide.sort();
const sortedIcons = Array.from(allowedIcons).sort();

const baseline = {
  maxAllowedFiles: filesWithLucide.length,
  allowedFiles: filesWithLucide,
  allowedIcons: sortedIcons,
};

fs.writeFileSync(
  path.join(frontendDir, 'scripts', 'lucide-baseline.json'),
  JSON.stringify(baseline, null, 2),
  'utf8'
);

console.log(`Baseline created: ${filesWithLucide.length} files, ${sortedIcons.length} unique icons.`);
