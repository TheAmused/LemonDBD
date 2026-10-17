// frontend/src/__tests__/unit/externalToolPorts.test.ts
//
// The default ports of the side tools (constants/externalTools.ts) are the ports nginx listens on.
// They live in two languages, so this test is what keeps them one fact.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EXTERNAL_TOOL_PORTS } from '@/constants/externalTools';

const NGINX_CONF = path.resolve(__dirname, '../../../../nginx/default.conf');

describe('external tool ports', () => {
  const conf = fs.existsSync(NGINX_CONF) ? fs.readFileSync(NGINX_CONF, 'utf8') : null;

  for (const [tool, port] of Object.entries(EXTERNAL_TOOL_PORTS)) {
    it(`nginx listens on the ${tool} port ${port}`, { skip: conf === null ? 'nginx/default.conf not present' : false }, () => {
      assert.match(conf as string, new RegExp(`listen\\s+${port}\\s+ssl`));
    });
  }
});
