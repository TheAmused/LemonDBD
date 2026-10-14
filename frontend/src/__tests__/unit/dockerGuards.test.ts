// frontend/src/__tests__/unit/dockerGuards.test.ts
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

describe('docker: image tags integrity', () => {
  const FORBIDDEN_TAGS = [
    /postgres:17\.11/i,
    /redis:8\.10/i,
    /umami.*:postgresql-v3\.4\.0/i,
    /pgadmin4:9\.18/i,
    /crowdsec:v1\.8\.1/i,
  ];

  it('no fictitious or non-existent image tags are configured', () => {
    const baseText = fs.readFileSync(BASE_COMPOSE, 'utf8');
    const prodText = fs.readFileSync(PROD_COMPOSE, 'utf8');
    const combined = baseText + '\n' + prodText;

    const violations: string[] = [];
    for (const pattern of FORBIDDEN_TAGS) {
      if (pattern.test(combined)) {
        violations.push(`Found forbidden fictitious image tag matching ${pattern}`);
      }
    }
    assert.deepEqual(violations, [], `Fictitious docker image tags found:\n${violations.join('\n')}`);
  });

  it('official base services pin valid Alpine/stable tags', () => {
    const baseText = fs.readFileSync(BASE_COMPOSE, 'utf8');
    // Ensure postgres is postgres:alpine
    assert.match(baseText, /image:\s+postgres:alpine/, 'postgres service must use postgres:alpine');
    // Ensure redis is redis:7-alpine
    assert.match(baseText, /image:\s+redis:7-alpine/, 'redis service must use redis:7-alpine');
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
  it('docker compose config succeeds with exit code 0 when docker is available', () => {
    try {
      execSync('docker --version', { stdio: 'ignore' });
    } catch {
      // Docker CLI not available in environment, skip execution check
      return;
    }

    const result = execSync(
      `docker compose -f "${BASE_COMPOSE}" -f "${PROD_COMPOSE}" config`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    assert.ok(result.length > 0, 'docker compose config must return non-empty validated output');
  });
});

describe('docker: guard sanity checks', () => {
  const checkForbiddenTags = (text: string) => {
    const FORBIDDEN_TAGS = [
      /postgres:17\.11/i,
      /redis:8\.10/i,
      /umami.*:postgresql-v3\.4\.0/i,
      /pgadmin4:9\.18/i,
      /crowdsec:v1\.8\.1/i,
    ];
    return FORBIDDEN_TAGS.filter((pattern) => pattern.test(text)).map((p) => p.source);
  };

  it('flags forbidden fictitious postgres and redis tags', () => {
    const mockYaml = `
services:
  db:
    image: postgres:17.11-alpine
  redis:
    image: redis:8.10-alpine
`;
    const flags = checkForbiddenTags(mockYaml);
    assert.equal(flags.length, 2);
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

