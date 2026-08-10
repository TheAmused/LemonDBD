# Design Specification: Nightlight Scraper Integration

## 1. Overview & Objectives
This feature introduces [Nightlight.gg](https://nightlight.gg) as the primary data source for Dead by Daylight (DBD) perks, survivors, killers, and high-resolution assets (icons and avatars). The standard DBD Fandom Wiki will remain as a configurable secondary source and automatic fallback mechanism when Nightlight is unreachable or returns incomplete content.

### Objectives
- Create and switch to `develop` branch, then create feature branch `feature/nightlight`.
- Implement a primary `NightlightScraperDriver` targeting Nightlight's stats APIs, React Router JS chunk manifests, and perk stream pages.
- Retain the existing `WikiScraperDriver` as a fallback.
- Support toggleable configuration stored persistently in `backend/data/scraper_config.json`.
- Expose REST API endpoints for viewing and updating scraper settings.
- Build a user-facing Scraper Settings UI modal in the frontend to toggle sources and fallback rules.

---

## 2. Architecture & Data Flow

```
                                  +---------------------------------+
                                  |   Frontend (Navbar & Sidebar)   |
                                  +---------------------------------+
                                                   |
                                       HTTP REST API Requests
                                                   v
                                  +---------------------------------+
                                  |   Flask API (/api/v1/scrape)    |
                                  +---------------------------------+
                                                   |
                                                   v
                                  +---------------------------------+
                                  |         ScraperService          |
                                  |  Reads scraper_config.json      |
                                  +---------------------------------+
                                             /           \
                           source == "nightlight"      source == "wiki"
                                           /               \
                                          v                 v
                      +-----------------------+     +--------------------+
                      | NightlightScraperDriver|     | WikiScraperDriver  |
                      +-----------------------+     +--------------------+
                                  |                           |
                       Failed / Error?                        |
                        (If fallback=true)                    |
                                  |                           |
                                  +------------->------------+
```

---

## 3. Component Details

### A. Backend: Scraper Configuration (`backend/data/scraper_config.json`)
Persistent JSON schema storing configuration state:
```json
{
  "source": "nightlight",
  "fallback_to_wiki": true,
  "last_used_source": "nightlight",
  "last_run_timestamp": null
}
```

### B. Backend: Scraper Service (`backend/app/services/scraper_service.py`)
`ScraperService` is refactored into a modular pipeline containing two drivers:

1. **`NightlightScraperDriver`**:
   - **Survivor & Killer Data**: Fetches JSON payloads from `https://nightlight.gg/api/v1/stats/global/survivors` and `https://nightlight.gg/api/v1/stats/global/killers`.
   - **Perks & Character Mapping**: Fetches the active React Router JS chunk from `https://nightlight.gg/perks/list` manifest to parse perk names, role IDs, icon slugs (`https://cdn.nightlight.gg/img/perks/{slug}.png`), and character ownership maps.
   - **Perk Descriptions**: Extracts formatted HTML perk descriptions from the React Router `streamController.enqueue` payload on `https://nightlight.gg/perks/list`.
   - **Asset Downloader**: Downloads perk icons and character portraits asynchronously using `curl_cffi` AsyncSession (`impersonate="chrome120"`, `verify=False` for SSL cert chain compatibility). Saves files to `backend/app/static/icons/` and `backend/app/static/avatars/`.

2. **`WikiScraperDriver`**:
   - Preserves existing BeautifulSoup scraper logic for `https://deadbydaylight.fandom.com/wiki/Perks`, `Survivors`, `Killers`.

3. **Orchestrator & Fallback**:
   - `run_sync_pipeline(override_source=None, override_fallback=None)`:
     - Reads settings from `scraper_config.json`.
     - Executes `NightlightScraperDriver` if `source == "nightlight"`.
     - If `NightlightScraperDriver` fails and `fallback_to_wiki == True`, updates status to `falling_back_to_wiki`, logs warning, and runs `WikiScraperDriver`.
     - Saves updated stats and `last_used_source` to `scraper_config.json`.

### C. Backend API Endpoints (`backend/app/routes/perks.py`)
- `GET /api/v1/scrape/config`: Returns current `scraper_config.json` settings.
- `POST /api/v1/scrape/config`: Updates settings (`source`, `fallback_to_wiki`).
- `POST /api/v1/scrape`: Accepts optional body `{ "source": "nightlight" | "wiki", "fallback": boolean }` for one-time trigger overrides.
- `GET /api/v1/scrape/status`: Returns active scraping progress, step name, current source, and fallback status.

### D. Frontend UI Integration (`frontend/src/components/`)
1. **`ScraperConfigModal.tsx`**:
   - Modal interface allowing users to select scraper source (`Nightlight (Default)` vs `DBD Wiki (Fallback)`).
   - Toggle switch for `Automatic Fallback to DBD Wiki`.
   - Live status display of last scrape run and active source.
2. **`Navbar.tsx` & `Sidebar.tsx`**:
   - Add a Settings gear icon button next to the Sync button to open `ScraperConfigModal`.
   - Update sync status tooltip and progress text to display active source (e.g. `Nightlight: 65%`).

---

## 4. Verification Plan

### Automated Testing
- **Backend Scraper Unit Tests** (`backend/tests/test_scraper_service.py`):
  - Test `NightlightScraperDriver` parsing with mock HTML / JS chunk fixtures.
  - Test `WikiScraperDriver` parsing.
  - Test fallback trigger logic when Nightlight request fails.
  - Test configuration GET and POST endpoints in `backend/tests/test_perks_api.py`.

### Manual & E2E Verification
- Trigger sync via `POST /api/v1/scrape` with `source: "nightlight"` and verify assets and data saved into `data/perks.json` and `data/characters.json`.
- Simulate Nightlight timeout/failure and verify automatic fallback to DBD Wiki.
- Test frontend Scraper Configuration modal controls in both light and dark mode across desktop and mobile layouts.
