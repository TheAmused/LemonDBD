# LemonDBD

LemonDBD is a Dead by Daylight companion site: a perk and character catalogue, loadout randomizer,
streak challenges, tier lists, Smash or Pass, minigames and a full admin panel. It is a Flask API
on PostgreSQL and Redis with a Next.js front end, served behind nginx and run with Docker Compose.

## Features

| Area | Route | What it does |
| :--- | :--- | :--- |
| Perks | `/[locale]/perks` | Searchable perk catalogue with filters, owned-perk tracking and stats |
| Characters | `/[locale]/characters` | Survivors and Killers, with ownership (DLC) tracking |
| Randomizer | `/[locale]/randomizer` | Random perk / add-on loadouts with no-repeat pools |
| Maps | `/[locale]/maps` | Realm and map explorer with voice search |
| Streaks | `/[locale]/streaks` | Gauntlet, Chaos, History and page streak challenges, with a scoreboard screenshot check (OCR) |
| Tier lists | `/[locale]/tier-lists` | Create, share (signed links), compare and vote on tier lists |
| Smash or Pass | `/[locale]/smash-or-pass` | Swipe voting with leaderboards, custom rosters and effect preferences |
| Minigames | `/[locale]/minigames` | Daily fog trial, idle game, six guessers and a challenge creator |
| Achievements | `/[locale]/achievements` | Account achievements |
| Account | `/[locale]/user` | Profile, e-mail verification, two-factor sign-in, data export, sign out everywhere, account deletion |
| Admin | `/[locale]/admin` | Users, warnings and bans, content moderation, bug reports, runtime settings, database import/export |

The site is translated into English, Polish, Spanish, German and Japanese (`/en`, `/pl`, `/es`,
`/de`, `/ja`). Analytics are self-hosted with Umami.

## Stack

| Layer | Technology |
| :--- | :--- |
| Backend | Python 3.14, Flask 3, SQLAlchemy 2, Pydantic 2, Gunicorn, Alembic migrations |
| Data | PostgreSQL 18, Redis 7 (cache and a separate instance for rate limits) |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Edge | nginx (TLS, security headers, rate limits), CrowdSec in production, optional Cloudflare tunnel in development |
| Tooling | pytest, node:test via tsx, oxlint, k6 for load tests, GitHub Actions CI |

## Running it

You need Docker with Compose v2. Python 3.14 and Node 24 are only needed to run the tests or the
apps outside Docker.

### Development

```bash
git clone <your fork or this repository's URL> LemonDBD
cd LemonDBD
cp .env.example .env.dev      # development settings, read by the containers
cp .env.example .env          # the pointer file compose reads first (ENV_FILE / COMPOSE_TARGET)
./up.sh                       # or: docker compose up -d --build --wait   (Windows: ./up.ps1)
```

Then open `http://localhost` (or `https://localhost`, with the self-signed certificate nginx
generates). The API answers on `/api/v1/health`, and in development the backend is also published
on `http://127.0.0.1:5000`. Umami is on `https://localhost:8117` and pgAdmin on
`https://localhost:5050`.

With `FLASK_ENV=development` the sign-in dialog offers demo accounts and the secret checks are
relaxed; never use that value outside your own machine.

### Production

```bash
cp .env.prod.example .env.prod   # then fill in every value marked REQUIRED; chmod 600 .env.prod
```

Point `.env` at it (`ENV_FILE=.env.prod`, `COMPOSE_TARGET=docker-compose.prod.yml`) and start the
stack. Generate secrets with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"                               # SECRET_KEY, JWT_SECRET_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"  # TWO_FACTOR_ENCRYPTION_KEY
```

The backend refuses to start with an empty or publicly known `SECRET_KEY`, `JWT_SECRET_KEY` or
`TWO_FACTOR_ENCRYPTION_KEY`, or with `CORS_ORIGINS=*`; compose refuses to start without the
database, Umami and pgAdmin passwords. In production also set `SESSION_COOKIE_SECURE=true` and
`NEXT_PUBLIC_SITE_URL` (canonical links, sitemap and link previews use it), and put a real
certificate (or Cloudflare) in front of nginx.

Every variable is documented in [`.env.example`](./.env.example).

## Tests

```bash
# Backend (from backend/; unit tests use in-memory SQLite, no services needed)
python -m pip install --require-hashes -r requirements.lock -r requirements-dev.txt
python -m pytest tests/unit -q

# Frontend (from frontend/)
npm ci
npx tsc --noEmit -p .
npm run lint
npm run check            # i18n, style and structure guards
npm run test:unit
npm run build

# Everything, including the live suites against a running stack
python run_tests.py --help
./up.sh --strict         # fresh build, then the live and workflow suites
./up.sh --perf smoke     # k6 load tests (needs k6 on PATH)
```

CI ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) runs the backend unit tests and the
frontend type-check, lint, guards, unit tests and production build on every push and pull request.

## Project layout

```
backend/     Flask app (app/routes, app/services, app/models, app/schemas), migrations, tests
frontend/    Next.js app (src/app/[locale], src/components, src/locales), tests
nginx/       reverse proxy config and security headers
docker/      tunnel notifier, CrowdSec, pgAdmin and Postgres init
k6/          load-test scenarios and suites
docs/        feature plan and design notes
```

## Updating dependencies

Python dependencies are pinned with hashes in `backend/requirements.lock`. After changing
`backend/requirements.txt`, regenerate it with:

```bash
uv pip compile backend/requirements.txt --universal --python-version 3.14 --generate-hashes -o backend/requirements.lock
```

Dependabot opens weekly pull requests for pip, npm, Docker images and GitHub Actions.
