# Monorepo Architecture & System Blueprint

LemonDBD is an enterprise-grade, containerized full-stack monorepo application engineered to scrape, process, store, and present Dead by Daylight perk metadata and asset icons. 

The architecture strictly decouples the data ingestion and REST API delivery layer (Python 3.12 / Flask / Gunicorn) from the presentation and user-interaction engine (Next.js 16 / React 19 / Tailwind CSS v4).

---

## 1. Monorepo Structural Blueprint

```text
LemonDBD/
├── backend/                        # Python 3.12 WSGI Microservice
│   ├── app/
│   │   ├── __init__.py             # Flask App Factory, CORS, startup hooks
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   └── perks.py            # REST Blueprints & status endpoints
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── perk_service.py     # Thread-safe DAO, validation, sorting/filtering
│   │   │   └── scraper_service.py  # TLS impersonation, async worker, thread state
│   │   └── static/
│   │       └── icons/              # Local PNG image asset storage
│   ├── data/
│   │   └── perks.json              # Canonical metadata repository
│   ├── requirements.txt            # Locked backend dependencies
│   ├── run.py                      # Application entrypoint & CLI executor
│   └── Dockerfile                  # Multi-stage python:3.12-slim container build
├── frontend/                       # Next.js 16 Standalone Web App
│   ├── src/
│   │   ├── app/                    # App Router dynamic subpath hierarchy
│   │   │   ├── [locale]/           # Dynamic i18n route segment ([en], [es], [pl])
│   │   │   │   ├── layout.tsx      # Root provider wrapper & navbar placement
│   │   │   │   └── page.tsx        # Dashboard page component (state & fetch)
│   │   │   └── globals.css         # Tailwind v4 engine & custom DBD theme rules
│   │   ├── components/             # Atomic & composite client UI elements
│   │   │   ├── Navbar.tsx          # Top bar, sync status polling, locale/theme toggles
│   │   │   ├── PerkCard.tsx        # Card renderer (grid/list modes)
│   │   │   ├── PerkFilters.tsx     # Role, character, search, sort, & order controls
│   │   │   ├── PerkModal.tsx       # Markdown description inspector modal
│   │   │   ├── Pagination.tsx      # Pagination & limit selector controls
│   │   │   └── ThemeProvider.tsx   # next-themes color mode wrapper
│   │   ├── i18n/                   # Dictionary loaders & locale definitions
│   │   ├── locales/                # JSON translation files (en.json, es.json, pl.json)
│   │   └── middleware.ts           # Automatic subpath locale detection & rewrite
│   ├── next.config.ts              # Standalone build & image optimization config
│   ├── package.json                # Dependencies & override resolutions
│   ├── postcss.config.mjs          # Tailwind v4 PostCSS driver
│   ├── tsconfig.json               # Strict TypeScript config
│   └── Dockerfile                  # Multi-stage node:22-alpine container build
├── documentation/                  # Deep-dive architectural & operational guides
│   ├── architecture.md             # High-level system architecture (This file)
│   ├── api-reference.md            # REST API specs and schemas
│   ├── scraper.md                  # Anti-bot TLS bypass & concurrency engine
│   └── deployment.md               # Container orchestration & DevOps operations
├── docker-compose.yml              # Multi-container network & volume orchestrator
└── README.md                       # Quick start & high-level overview
```

---

## 2. High-Level Component Topology

```text
                               +---------------------------------------+
                               |     Dead by Daylight Fandom Wiki      |
                               +---------------------------------------+
                                                   |
                                                   | HTTP GET (Chrome 120 TLS Impersonation)
                                                   v
+---------------------------------------------------------------------------------------------------+
| BACKEND CONTAINER (dbd_backend:5000)                                                              |
|                                                                                                   |
|  +------------------------+      +--------------------------+      +---------------------------+  |
|  |     ScraperService     | ---> |  Data Persistence Layer  | ---> |        PerkService        |  |
|  | (curl_cffi + Asyncio)  |      |  (data/perks.json &      |      |  (In-Memory Cache,        |  |
|  +------------------------+      |   static/icons/*)        |      |   Pydantic Validation,    |  |
|              ^                   +--------------------------+      |   Sorting & Pagination)   |  |
|              |                                                     +---------------------------+  |
|              | Background Thread Spawn                                           |                |
|  +-------------------------------------------------------------------+           |                |
|  |                      Flask REST API Blueprints                    | <---------+                |
|  +-------------------------------------------------------------------+                            |
+---------------------------------------------------------------------------------------------------+
                                                   ^
                                                   | CORS REST Calls / Static PNG Asset Requests
                                                   v
+---------------------------------------------------------------------------------------------------+
| FRONTEND CONTAINER (dbd_frontend:3000)                                                            |
|                                                                                                   |
|  +---------------------+    +--------------------+    +------------------+    +----------------+  |
|  |  i18n Middleware    | -> |   Dashboard Page   | -> | PerkFilters &    | -> | PerkModal      |  |
|  | (en/es/pl Routing)  |    |  (State & Fetch)   |    | Layout Toggle    |    | (Markdown UI)  |  |
|  +---------------------+    +--------------------+    +------------------+    +----------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Data Flow & Execution Sequences

### A. Initial Cold Boot Data Ingestion Flow

When the backend container boots up, `create_app()` inspects the canonical `perks.json` store. If missing or unpopulated, it spawns an asynchronous background thread without delaying HTTP socket binding.

```text
[App Boot] ---> Inspects /app/data/perks.json
                  |
                  +---> File Exists & Populated ---> Load PerkService Cache ---> Ready
                  |
                  +---> File Missing or Empty   ---> Spawn Background Thread
                                                             |
                                                             v
                                                  ScraperService.run_sync_pipeline()
                                                             |
                                                             +---> Fetch Wiki HTML (curl_cffi)
                                                             +---> Parse DOM & Clean Markdown
                                                             +---> Write /app/data/perks.json
                                                             +---> Download Icons (asyncio)
                                                             +---> PerkService.reload_data()
```

---

### B. Client Sync Trigger Sequence

Users can manually trigger a full synchronization from the top navigation bar. The request is handled non-blockingly using thread delegation and status polling.

```text
[User / Next.js Client]           [Flask REST Router]             [Scraper Thread]           [Fandom Wiki]
          |                               |                              |                         |
          |--- POST /api/v1/scrape ------>|                              |                         |
          |                               |-- Spawns Thread ------------>|                         |
          |<-- 202 Accepted --------------|                              |                         |
          |                               |                              |--- Fetch HTML --------->|
          |                               |                              |<-- DOM Tree ------------|
          |--- GET /api/v1/scrape/status->|                              |                         |
          |<-- 200 OK (Progress: 35%) ----|                              |--- Download Icons ----->|
          |                               |                              |<-- PNG Data ------------|
          |--- GET /api/v1/scrape/status->|                              |                         |
          |<-- 200 OK (Status: Complete) -|                              |                         |
          |                               |                              |-- Reload Cache -------->|
          |--- GET /api/v1/perks -------->|                              |                         |
          |<-- 200 OK (Updated Dataset) --|                              |                         |
```

---

## 4. Backend Service Architecture

### A. Thread Safety & Synchronization

The `ScraperService` uses a class-level reentrant lock (`threading.Lock`) to safeguard internal progress counters accessed simultaneously by the background scraper thread and incoming HTTP status pollers:

```python
class ScraperService:
    _lock = threading.Lock()
    _status = {
        "is_running": False,
        "progress": 0,
        "total": 0,
        "current_step": "idle",
        "last_run": None,
        "error": None,
    }

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        with cls._lock:
            return cls._status.copy()
```

### B. Pydantic v2 Schema Validation

Incoming or reloaded data passes through strict validation models before entering the in-memory array:

```python
class PerkModel(BaseModel):
    name: str = Field(..., description="Full perk title")
    character: str = Field(..., description="Associated character name or 'General'")
    category: str = Field(..., description="'Survivor' or 'Killer'")
    description: str = Field(..., description="Markdown formatted description")
    icon_url: str = Field(..., description="Remote CDN source URL")
    icon_local_path: str = Field(..., description="Relative local static path")
```

### C. Filtering, Multi-Field Sorting & Pagination Engine

The `PerkService` performs server-side processing over memory cache slices to ensure sub-millisecond response times:

| Parameter | Type | Validation / Behavior | Default |
| --- | --- | --- | --- |
| `category` | String | Case-insensitive match against `"Survivor"` or `"Killer"` | `"all"` |
| `character` | String | Match against Survivor/Killer name or `"General"` | `"all"` |
| `search` | String | Substring match against `name` OR `description` | `""` |
| `sort_by` | String | Allowed values: `"name"`, `"character"`, `"category"` | `"name"` |
| `order` | String | `"asc"` or `"desc"` | `"asc"` |
| `page` | Integer | Min value: $1$ | `1` |
| `limit` | Integer | Clamped range: $1 \le \text{limit} \le 200$ | `50` |

---

## 5. Frontend Presentation Architecture

### A. Next.js 16 App Router & i18n Subpath Routing

Locale detection is enforced at the network edge via `frontend/src/middleware.ts`.

1. **Path Resolution**: Requests to `/` are inspected for the `Accept-Language` header.
2. **Subpath Redirect**: Users are redirected to `/[locale]/` (`/en`, `/es`, or `/pl`).
3. **Dictionary Injection**: Page layouts dynamically import JSON translation files from `frontend/src/locales/` during rendering.

### B. Styling & Design Token Architecture

The visual system uses **Tailwind CSS v4** configured with CSS-first directives (`@import "tailwindcss";`) and CSS variables for dark/light transitions:

```css
@import "tailwindcss";

@layer base {
  :root {
    --bg-primary: #f8fafc;
    --bg-surface: #ffffff;
    --border-color: #e2e8f0;
  }

  .dark {
    --bg-primary: #030712;
    --bg-surface: #0b0f19;
    --border-color: #1f293d;
  }

  body {
    background-color: var(--bg-primary);
    @apply text-slate-900 dark:text-slate-100 transition-colors duration-300;
  }
}
```

---

## 6. Container & Volume Architecture

```text
+---------------------------------------------------------------------------------+
| HOST SYSTEM DISK                                                                |
|                                                                                 |
|  ./backend/data/ --------------------------------+                              |
|                                                  | Mount Volume                 |
|  ./backend/app/static/icons/ ----------------+   |                              |
|                                              |   | Mount Volume                 |
+----------------------------------------------|---|------------------------------+
                                               |   |
                                               v   v
+---------------------------------------------------------------------------------+
| dbd_backend CONTAINER                                                           |
|                                                                                 |
|  /app/data/perks.json <----------------------+                                  |
|  /app/app/static/icons/* <-------------------+                                  |
+---------------------------------------------------------------------------------+
```

### Persistence Isolation

* **Metadata Vault**: `./backend/data/perks.json` is preserved across container rebuilds.
* **Asset Cache**: `./backend/app/static/icons/` stores PNG assets organized by role and character subfolders (`icons/survivors/{Character}/{perk}.png` and `icons/killers/{Character}/{perk}.png`).

---

## 7. Security, CORS Policy & Operational Reliability

1. **Cross-Origin Resource Sharing (CORS)**:
   * Configured at both the `flask-cors` extension layer and in an explicit `@app.after_request` fallback hook.
   * Preflight `OPTIONS` requests are caught globally to prevent browser cross-origin blocks.

2. **Non-Root Execution Context**:
   * Backend Docker container executes under standard unprivileged user `appuser` (UID `1001`).
   * Frontend Docker container executes under Node unprivileged user `nextjs` (UID `1001`).

3. **Container Health Checking**:
   * `dbd_backend` exposes `/api/v1/health` polled every 10 seconds.
   * `dbd_frontend` startup is gated behind the `service_healthy` status of the backend.