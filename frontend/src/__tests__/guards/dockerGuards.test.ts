// frontend/src/__tests__/guards/dockerGuards.test.ts
//
// Guards against docker compose regressions: fictitious image tags, PGDATA
// volume collisions, scheduler coupling, and compose schema invalidity.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(__dirname, '../../../../');
const BASE_COMPOSE = path.join(ROOT, 'docker-compose.base.yml');
const PROD_COMPOSE = path.join(ROOT, 'docker-compose.prod.yml');

describe('docker: compose file existence and basic structure', () => {
  it('docker-compose.base.yml and docker-compose.prod.yml exist at repository root', () => {
    assert.ok(fs.existsSync(BASE_COMPOSE), 'docker-compose.base.yml must exist at repo root');
    assert.ok(fs.existsSync(PROD_COMPOSE), 'docker-compose.prod.yml must exist at repo root');
  });
});

// Every image is pinned to a version (or a digest). A floating tag (`latest`, bare `alpine`,
// `postgresql-latest`) rebuilds into whatever was published that day: a new Postgres major that
// refuses the data directory, or a new Node/nginx under an unchanged repository.
const DOCKERFILES = ['backend/Dockerfile', 'frontend/Dockerfile', 'nginx/Dockerfile', 'docker/tunnel/Dockerfile'].map(
  (file) => path.join(ROOT, file)
);
const DEV_COMPOSE = path.join(ROOT, 'docker-compose.dev.yml');
const DEV_SERVICES_COMPOSE = path.join(ROOT, 'docker-compose.dev-services.yml');

/** Image references (compose `image:`, Dockerfile `FROM` / `COPY --from=`) that are not pinned. */
export function floatingImageRefs(text: string): string[] {
  const stages = new Set([...text.matchAll(/^\s*FROM\s+\S+\s+AS\s+(\S+)/gim)].map((m) => m[1].toLowerCase()));
  const refs = [
    ...[...text.matchAll(/^\s*(?:image:|FROM)\s+(\S+)/gim)].map((m) => m[1]),
    ...[...text.matchAll(/COPY\s+--from=(\S+)/gi)].map((m) => m[1]),
  ];
  return refs.filter((ref) => {
    if (stages.has(ref.toLowerCase())) return false; // a build stage of the same Dockerfile
    if (ref.includes('@sha256:')) return false;
    const tag = ref.includes(':') ? ref.slice(ref.lastIndexOf(':') + 1) : '';
    return !/\d/.test(tag) || /latest/i.test(tag);
  });
}

describe('docker: image tags are pinned', () => {
  it('every compose image and Dockerfile base names a version', () => {
    const files = [BASE_COMPOSE, PROD_COMPOSE, DEV_COMPOSE, DEV_SERVICES_COMPOSE, ...DOCKERFILES];
    const violations = files.flatMap((file) =>
      floatingImageRefs(fs.readFileSync(file, 'utf8')).map((ref) => `${path.relative(ROOT, file)}: ${ref}`)
    );
    assert.deepEqual(violations, [], `Unpinned images:\n${violations.join('\n')}`);
  });

  it('the postgres major matches the PGDATA directory', () => {
    const baseText = fs.readFileSync(BASE_COMPOSE, 'utf8');
    const major = baseText.match(/image:\s+postgres:(\d+)/)?.[1];
    assert.ok(major, 'postgres must be pinned to a major version');
    assert.match(baseText, new RegExp(`PGDATA:\\s+/var/lib/postgresql/${major}/docker`));
  });

  it('redis stays on the 7 line', () => {
    assert.match(fs.readFileSync(BASE_COMPOSE, 'utf8'), /image:\s+redis:7\./);
  });
});

describe('docker: postgresql data volume & PGDATA alignment', () => {
  it('postgres_data is mounted to /var/lib/postgresql and PGDATA points to subfolder', () => {
    const baseText = fs.readFileSync(BASE_COMPOSE, 'utf8');
    assert.match(
      baseText,
      /-\s+postgres_data:\/var\/lib\/postgresql(?:\s|$)/,
      'postgres_data must mount to /var/lib/postgresql'
    );
    assert.match(
      baseText,
      /PGDATA:\s+\/var\/lib\/postgresql\/18\/docker/,
      'PGDATA must explicitly point to /var/lib/postgresql/18/docker to prevent initdb collisions'
    );
  });
});

describe('docker: decoupled background scheduler', () => {
  it('scheduler runs as a dedicated decoupled container service', () => {
    const baseText = fs.readFileSync(BASE_COMPOSE, 'utf8');
    assert.match(baseText, /container_name:\s+dbd_scheduler/, 'dbd_scheduler container must be defined');
    assert.match(
      baseText,
      /run_scheduler\.py/,
      'scheduler service must invoke run_scheduler.py independently of gunicorn workers'
    );
  });
});

describe('docker: service healthchecks', () => {
  it('core services define functional healthchecks', () => {
    const baseText = fs.readFileSync(BASE_COMPOSE, 'utf8');
    assert.match(baseText, /pg_isready/, 'db service must have a pg_isready healthcheck');
    assert.match(baseText, /redis-cli.*ping/, 'redis service must have a redis-cli ping healthcheck');
    assert.match(baseText, /\/api\/(v1\/)?health/, 'backend service must have an /api/v1/health endpoint healthcheck');
  });
});

describe('docker: compose config validation', () => {
  it('docker compose config succeeds with exit code 0 when docker is available', (t) => {
    try {
      execSync('docker --version', { stdio: 'ignore' });
    } catch {
      // Docker CLI not available in environment, skip execution check
      t.skip('docker CLI not available');
      return;
    }
    // Production runs as `docker compose -f docker-compose.prod.yml`, whose include reads
    // .env.prod (it holds the required passwords). Without that file there is nothing to check.
    if (!fs.existsSync(path.join(ROOT, '.env.prod'))) {
      t.skip('.env.prod not present');
      return;
    }

    const result = execSync(
      `docker compose -f "${PROD_COMPOSE}" config`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    assert.ok(result.length > 0, 'docker compose config must return non-empty validated output');
  });
});

describe('docker: guard sanity checks', () => {
  it('flags floating image tags and accepts pinned ones', () => {
    const mockYaml = `
services:
  db:
    image: postgres:alpine
  cache:
    image: redis:latest
  analytics:
    image: ghcr.io/umami-software/umami:postgresql-latest
  pinned:
    image: postgres:18-alpine3.24
  digest:
    image: nginx@sha256:0123456789abcdef
`;
    assert.deepEqual(floatingImageRefs(mockYaml), [
      'postgres:alpine',
      'redis:latest',
      'ghcr.io/umami-software/umami:postgresql-latest',
    ]);
    const dockerfile = 'FROM node:24-alpine3.24 AS base\nFROM base AS deps\nCOPY --from=deps /a /b\nCOPY --from=cloudflare/cloudflared:latest /x /y\n';
    assert.deepEqual(floatingImageRefs(dockerfile), ['cloudflare/cloudflared:latest']);
  });

  it('flags unaligned PGDATA path', () => {
    const mockYaml = `
services:
  db:
    volumes:
      - postgres_data:/var/lib/postgresql/data
`;
    assert.equal(/-\s+postgres_data:\/var\/lib\/postgresql(?:\s|$)/.test(mockYaml), false);
  });

  it('flags missing healthchecks', () => {
    const mockYaml = `
services:
  db:
    image: postgres:alpine
`;
    assert.equal(/pg_isready/.test(mockYaml), false);
  });
});


describe('docker: pgAdmin is never an open database console', () => {
  const baseText = fs.readFileSync(BASE_COMPOSE, 'utf8');

  it('runs in server mode (desktop mode has no login)', () => {
    assert.match(baseText, /PGADMIN_CONFIG_SERVER_MODE:\s*'True'/);
    assert.doesNotMatch(baseText, /PGADMIN_CONFIG_ENHANCED_COOKIE_PROTECTION:\s*'False'/);
  });

  it('publishes its port on loopback by default', () => {
    assert.match(baseText, /"\$\{PGADMIN_BIND:-127\.0\.0\.1\}:\$\{PGADMIN_PORT:-5050\}:5050"/);
    assert.doesNotMatch(baseText, /^\s*-\s*"\$\{PGADMIN_PORT:-5050\}:5050"/m);
  });
});
