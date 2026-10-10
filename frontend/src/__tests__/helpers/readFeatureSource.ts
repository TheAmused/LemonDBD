// frontend/src/__tests__/helpers/readFeatureSource.ts
import fs from 'node:fs';
import path from 'node:path';

/**
 * The source of a component that was split into a composition root plus a feature folder.
 *
 * Source-reading contract tests ask "does this feature do X?", wherever the code lives, so they read the
 * root file followed by every `.ts` / `.tsx` file directly inside `featureDir` (sorted, so failures are
 * stable). Anything else in the folder (subfolders, snapshots, notes) is ignored rather than crashing the read.
 */
export function readFeatureSource(rootFile: string, featureDir: string): string {
  const featureFiles = fs
    .readdirSync(featureDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .map((entry) => path.join(featureDir, entry.name))
    .sort();
  return [rootFile, ...featureFiles].map((file) => fs.readFileSync(file, 'utf-8')).join('\n');
}
