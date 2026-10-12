// frontend/src/__tests__/unit/smashIconGuards.test.ts
//
// Smash or Pass has its own icon set (components/icons/smash/). The generic lucide "Sparkles"
// glyph is what every other page uses for "magic"; it must not creep back into this feature.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from '../helpers/sourceGraph';

const SMASH_DIR = 'components/smash-or-pass/';

/** The archetype builder lets a player PICK "sparkles" as the icon of a custom archetype. */
const ALLOWED = new Set(['components/smash-or-pass/creator/RomanceArchetypeBuilder.tsx']);

describe('smash or pass: icons', () => {
  it('no lucide Sparkles import under components/smash-or-pass/ (except the archetype icon picker)', () => {
    const offenders = loadModules()
      .filter((m) => m.file.startsWith(SMASH_DIR) && !ALLOWED.has(m.file))
      .filter((m) => /import\s*\{[^}]*\bSparkles\b[^}]*\}\s*from\s*['"]lucide-react['"]/.test(m.text))
      .map((m) => m.file);
    assert.deepEqual(offenders, [], `Use an icon from components/icons/DbdIcons or no icon at all:\n${offenders.join('\n')}`);
  });
});
