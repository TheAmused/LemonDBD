// frontend/scripts/update-baselines.ts
//
// Re-records the shrink-only baselines (src/__tests__/baselines/*.json) after you have FIXED
// debt, so the improvement is locked in:   npm run baselines:update
// Never use it to accept new debt: review the diff, it should only ever remove or lower entries.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const files = ['codeQualityGuards', 'i18nHygiene', 'uiGuards'].map((f) => `src/__tests__/unit/${f}.test.ts`);
const bin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
const res = spawnSync(bin, ['--test', ...files], { cwd: root, stdio: 'inherit', env: { ...process.env, UPDATE_BASELINES: '1' }, shell: process.platform === 'win32' });
process.exit(res.status ?? 1);
