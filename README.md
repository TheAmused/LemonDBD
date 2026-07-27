# LemonDBD — Dead by Daylight Perk Vault & Explorer

LemonDBD is a modern, containerized full-stack web application that automatically scrapes, parses, catalogs, and displays Survivor and Killer perks from the Dead by Daylight Fandom wiki.

Built with a modular monorepo architecture, LemonDBD features an anti-bot scraper utilizing TLS browser impersonation, a thread-safe Python Flask REST API with Pydantic validation, and a Next.js 16 (App Router) frontend with full internationalization (`en`, `es`, `pl`), Tailwind CSS v4, dark mode, and real-time synchronization tracking.

---

## 🌟 Key Features

- **Automated Anti-Bot Web Scraper**: Bypasses Cloudflare protection using `curl_cffi` socket-level TLS impersonation (`chrome120`). Extracts perk metadata, converts HTML formatting into clean Markdown, and downloads high-resolution PNG icon assets concurrently via `asyncio`.
- **High-Performance REST API**: Built on Python 3.12, Flask 3.1, and Gunicorn 23. Features Pydantic v2 model validation, multi-field server-side sorting (`name`, `character`, `category`), filtering, and paginated responses.
- **Thread-Safe Background Sync**: Automatically triggers an initial scrape on container startup if data is missing. Sync jobs can also be dispatched asynchronously via API (`POST /api/v1/scrape`), CLI (`flask scrape`), or directly through the Next.js UI without blocking HTTP workers.
- **Next.js 16 + React 19 Frontend**: Utilizes Next.js App Router, Tailwind CSS v4 (`@tailwindcss/postcss`), Lucide icons, glassmorphism cards, dynamic URL filter sync, and `next-themes` dark mode support.
- **Full i18n Localization**: Middleware-assisted subpath routing supporting English (`/en`), Spanish (`/es`), and Polish (`/pl`).
- **Zero-Configuration Containerization**: Orchestrated using Docker Compose with multi-stage slim builds (`python:3.12-slim` & `node:22-alpine`), volume persistence for icons and JSON records, health checks, and non-root execution.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | Python 3.12+, Flask 3.1, Gunicorn 23, Pydantic v2, `flask-cors` |
| **Scraper** | `curl_cffi` (Chrome 120 TLS impersonation), BeautifulSoup4, `tqdm.asyncio` |
| **Frontend** | Next.js 16.2 (App Router), React 19, TypeScript 5, Tailwind CSS v4 (`@tailwindcss/postcss`), `next-themes`, Lucide React |
| **DevOps & Infra** | Docker (Multi-stage `python:3.12-slim` & `node:22-alpine`), Docker Compose |

---

## 📂 Project Structure

```text
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory, CORS & startup hook
│   │   ├── routes/              # REST Endpoints blueprint
│   │   ├── services/            # PerkService & ScraperService logic
│   │   └── static/icons/        # Local icon storage directory
│   ├── data/
│   │   └── perks.json           # Scraped perk JSON dataset
│   ├── requirements.txt
│   ├── run.py                   # Flask entrypoint & manual CLI runner
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js 16 App Router & globals.css
│   │   ├── components/          # Navbar, PerkCard, PerkFilters, PerkModal, Pagination
│   │   ├── i18n/                # Locale config and dictionary loaders
│   │   ├── locales/             # en.json, es.json, pl.json
│   │   └── middleware.ts        # Locale detection & routing middleware
│   ├── next.config.ts
│   ├── package.json
│   └── Dockerfile
├── documentation/               # In-depth technical guides
│   ├── architecture.md
│   ├── api-reference.md
│   ├── scraper.md
│   └── deployment.md
├── docker-compose.yml
└── README.md
```

## 🚀 Quick Start (Docker Compose)

Docker Compose orchestrates the entire application. On initial launch, if `./backend/data/perks.json` is missing or empty, the backend automatically triggers a background scrape job to fetch the latest wiki data.

```bash
# 1. Clone the repository
git clone https://github.com/your-username/LemonDBD.git
cd LemonDBD

# 2. Build and launch containers
docker-compose up --build -d
```

### Endpoints:

- **Frontend Dashboard**: <http://localhost:3000> (Auto-redirects to preferred browser locale, e.g., `/en`, `/pl`)
- **Backend Health Check**: <http://localhost:5000/api/v1/health>
- **Perks API Endpoint**: <http://localhost:5000/api/v1/perks?limit=24&page=1>

---

## 💻 Local Development Setup

### Backend Setup (Flask API)

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows (PowerShell):
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run initial manual scrape (Optional)
python run.py --scrape

# Start Flask development server
python run.py
```

### Frontend Setup (Next.js 16)

```bash
cd frontend

# Install Node dependencies
npm install

# Run Next.js development server
npm run dev
```

The frontend development server will start at `http://localhost:3000`.

---

## 📡 API Overview

- `GET /api/v1/health` — Service health status
- `GET /api/v1/perks` — List perks with support for `category`, `character`, `search`, `sort_by`, `order`, `page`, and `limit`
- `GET /api/v1/perks/<identifier>` — Single perk inspection
- `GET /api/v1/survivors` — List unique Survivor character names
- `GET /api/v1/killers` — List unique Killer character names
- `POST /api/v1/scrape` — Dispatch non-blocking background scraper job
- `GET /api/v1/scrape/status` — Live background scraper progress endpoint

For detailed parameters, schemas, and examples, see [`documentation/api-reference.md`](./documentation/api-reference.md).

---

## 📖 Extended Documentation

- **[Architecture Guide](./documentation/architecture.md)** — System layout, monorepo boundaries, and design patterns.
- **[API Reference](./documentation/api-reference.md)** — REST endpoint specifications, JSON schemas, and query options.
- **[Scraper Engineering](./documentation/scraper.md)** — Cloudflare TLS impersonation and asynchronous download pipeline.
- **[Deployment & DevOps](./documentation/deployment.md)** — Multi-stage Docker builds, volume security, and troubleshooting.
