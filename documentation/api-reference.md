# LemonDBD REST API Reference Specification

The LemonDBD Backend API is a RESTful web service built with Python 3.12, Flask, Gunicorn, and Pydantic v2. It provides structured access to Dead by Daylight perk metadata, character rosters, automated scraping synchronization jobs, and static perk icon assets.

---

## Global API Standards

### Base URL
- **Local Development:** `http://localhost:5000`
- **API Versioning Prefix:** `/api/v1`

### Data Transport & Encoding
- **Content-Type:** `application/json` (unless requesting static images)
- **Character Encoding:** `UTF-8`

### Cross-Origin Resource Sharing (CORS)
All endpoints emit explicit CORS headers supporting preflight `OPTIONS` requests from allowed origins (configured via the `CORS_ORIGINS` environment variable):

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept
Access-Control-Allow-Credentials: true
```

---

## API Endpoints Overview

| Method | Endpoint Path | Description | Access Level |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | Service health & status check | Public |
| `GET` | `/api/v1/perks` | Paginated list of perks with search, filtering & sorting | Public |
| `GET` | `/api/v1/perks/<identifier>` | Get metadata for a single perk by name or slug | Public |
| `GET` | `/api/v1/survivors` | List all unique Survivor character names | Public |
| `GET` | `/api/v1/killers` | List all unique Killer character names | Public |
| `POST` | `/api/v1/scrape` | Trigger an asynchronous background scrape sync | Public |
| `GET` | `/api/v1/scrape/status` | Get real-time progress of the active scrape task | Public |
| `GET` | `/static/icons/<path:filename>` | Serves local perk icon PNG images | Public |

---

## Detailed Endpoint Specifications

### 1. Health Check

#### `GET /api/v1/health`

Returns the operational health status of the backend API service.

* **Request Headers:** None
* **Response Content-Type:** `application/json`

#### Response (`200 OK`)

```json
{
  "service": "dbd-backend-api",
  "status": "healthy"
}
```

#### Example Usage (`curl`)

```bash
curl -X GET http://localhost:5000/api/v1/health
```

---

### 2. List & Query Perks

#### `GET /api/v1/perks`

Retrieves a paginated list of perks supporting text search, role filtering, character filtering, and sorting.

#### Query Parameters

| Parameter | Type | Default | Constraints / Allowed Values | Description |
| --- | --- | --- | --- | --- |
| `category` | `string` | `"all"` | `"Survivor"`, `"Killer"`, `"all"` | Filter perks by character role |
| `character` | `string` | `"all"` | Character Name, `"General"`, `"all"` | Filter perks by associated character |
| `search` | `string` | `""` | Any string | Case-insensitive search on title and description |
| `sort_by` | `string` | `"name"` | `"name"`, `"character"`, `"category"` | Target field for server-side sorting |
| `order` | `string` | `"asc"` | `"asc"`, `"desc"` | Sort direction |
| `page` | `integer` | `1` | `>= 1` | Page index number |
| `limit` | `integer` | `50` | `1 <= limit <= 200` | Number of results per page |

#### Response (`200 OK`)

```json
{
  "data": [
    {
      "name": "Sprint Burst",
      "character": "Meg Thomas",
      "category": "Survivor",
      "description": "Starting to run, break into a sprint at **150 %** of your normal running speed for a maximum of **3 seconds**.\nCauses the **Exhausted** Status Effect for **60**/**50**/**40** **seconds**.",
      "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/e/e1/IconPerks_sprintBurst.png/revision/latest",
      "icon_local_path": "icons/survivors/Meg Thomas/sprint_burst.png"
    },
    {
      "name": "Self-Care",
      "character": "Claudette Morel",
      "category": "Survivor",
      "description": "Unlocks the ability to heal yourself without a **Med-Kit** at **25**/**30**/**35** **%** of the normal Healing speed.",
      "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/1/11/IconPerks_selfCare.png/revision/latest",
      "icon_local_path": "icons/survivors/Claudette Morel/self_care.png"
    }
  ],
  "filters": {
    "category": "Survivor",
    "character": "all",
    "order": "asc",
    "search": "heal",
    "sort_by": "name"
  },
  "pagination": {
    "has_next": true,
    "has_prev": false,
    "limit": 50,
    "page": 1,
    "total": 18,
    "total_pages": 1
  }
}
```

#### Example Usage (`curl`)

```bash
curl -X GET "http://localhost:5000/api/v1/perks?category=Survivor&search=sprint&sort_by=name&order=asc&page=1&limit=20"
```

---

### 3. Get Single Perk Details

#### `GET /api/v1/perks/<identifier>`

Fetches metadata for a single perk using either its exact title (e.g. `"Sprint Burst"`) or its normalized URL slug (e.g. `"sprint_burst"`).

#### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `identifier` | `string` | **Yes** | Perk name or slugified string (case-insensitive) |

#### Response (`200 OK`)

```json
{
  "data": {
    "name": "Sprint Burst",
    "character": "Meg Thomas",
    "category": "Survivor",
    "description": "Starting to run, break into a sprint at **150 %** of your normal running speed for a maximum of **3 seconds**.\nCauses the **Exhausted** Status Effect for **60**/**50**/**40** **seconds**.",
    "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/e/e1/IconPerks_sprintBurst.png/revision/latest",
    "icon_local_path": "icons/survivors/Meg Thomas/sprint_burst.png"
  }
}
```

#### Response (`404 Not Found`)

```json
{
  "error": "Perk not found",
  "status": 404
}
```

#### Example Usage (`curl`)

```bash
curl -X GET http://localhost:5000/api/v1/perks/sprint_burst
```

---

### 4. List Survivor Characters

#### `GET /api/v1/survivors`

Retrieves an alphabetically sorted array of all unique Survivor character names associated with character-specific perks.

* **Request Headers:** None
* **Response Content-Type:** `application/json`

#### Response (`200 OK`)

```json
{
  "count": 42,
  "data": [
    "Ada Wong",
    "Alan Wake",
    "Ash Williams",
    "Cheryl Mason",
    "Claudette Morel",
    "Dwight Fairfield",
    "Feng Min",
    "Kate Denson",
    "Meg Thomas",
    "Nea Karlsson"
  ]
}
```

#### Example Usage (`curl`)

```bash
curl -X GET http://localhost:5000/api/v1/survivors
```

---

### 5. List Killer Characters

#### `GET /api/v1/killers`

Retrieves an alphabetically sorted array of all unique Killer character names associated with character-specific perks.

* **Request Headers:** None
* **Response Content-Type:** `application/json`

#### Response (`200 OK`)

```json
{
  "count": 36,
  "data": [
    "The Artist",
    "The Blight",
    "The Cannibal",
    "The Doctor",
    "The Executioner",
    "The Huntress",
    "The Nightmare",
    "The Nurse",
    "The Shape",
    "The Trapper"
  ]
}
```

#### Example Usage (`curl`)

```bash
curl -X GET http://localhost:5000/api/v1/killers
```

---

### 6. Trigger Wiki Scrape Job

#### `POST /api/v1/scrape`

Spawns a background thread that executes the full scraping synchronization pipeline (`ScraperService`). The request returns immediately while downloading and parsing continue asynchronously in the background.

* **Request Headers:** None
* **Request Body:** Empty

#### Response (`202 Accepted`) — Scrape Initiated

```json
{
  "message": "Scrape task initiated successfully in background"
}
```

#### Response (`409 Conflict`) — Scrape Already In Progress

```json
{
  "message": "Scrape task is already in progress",
  "status": {
    "current_step": "downloading_icons",
    "error": null,
    "is_running": true,
    "last_run": null,
    "progress": 45,
    "total": 280
  }
}
```

#### Example Usage (`curl`)

```bash
curl -X POST http://localhost:5000/api/v1/scrape
```

---

### 7. Get Scraper Job Status

#### `GET /api/v1/scrape/status`

Queries the real-time progress state of the active background scraping thread. Used by frontend interfaces to display progress percentages and status messages.

* **Request Headers:** None
* **Response Content-Type:** `application/json`

#### Status Values for `current_step`

* `"idle"`: Scraper has not run yet.
* `"fetching_wiki"`: Fetching page HTML with `curl_cffi` TLS impersonation.
* `"parsing_perks"`: Parsing DOM elements with `BeautifulSoup4`.
* `"downloading_icons"`: Downloading icon assets asynchronously with `httpx`/`asyncio`.
* `"completed"`: Synchronization completed successfully.
* `"failed"`: Pipeline encountered an error during execution.

#### Response (`200 OK`) — Running

```json
{
  "current_step": "downloading_icons",
  "error": null,
  "is_running": true,
  "last_run": "2026-07-27T10:15:30.123456",
  "progress": 142,
  "total": 280
}
```

#### Response (`200 OK`) — Completed

```json
{
  "current_step": "completed",
  "error": null,
  "is_running": false,
  "last_run": "2026-07-27T10:17:42.987654",
  "progress": 280,
  "total": 280
}
```

#### Example Usage (`curl`)

```bash
curl -X GET http://localhost:5000/api/v1/scrape/status
```

---

### 8. Serve Static Perk Icons

#### `GET /static/icons/<path:filename>`

Serves cached local PNG icon files directly from disk storage with public HTTP caching headers.

#### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `filename` | `string` | **Yes** | Relative path under static storage (e.g., `icons/survivors/Meg Thomas/sprint_burst.png`) |

#### Response Headers (`200 OK`)

```http
Content-Type: image/png
Cache-Control: public, max-age=86400
Access-Control-Allow-Origin: *
```

#### Example Usage (`curl`)

```bash
curl -I http://localhost:5000/static/icons/survivors/Meg%20Thomas/sprint_burst.png
```

---

## Data Models & Validation Schemas

### Pydantic Perk Schema (`PerkModel`)

```python
class PerkModel(BaseModel):
    name: str            # Full title of the perk
    character: str       # Associated character name or 'General'
    category: str        # 'Survivor' or 'Killer'
    description: str     # Markdown-formatted description text
    icon_url: str        # High-res remote Fandom CDN URL
    icon_local_path: str # Relative local static path for serving
```

---

## Error Handling Standards

All API errors return standardized JSON bodies paired with appropriate HTTP status codes:

#### Common HTTP Status Codes

* `200 OK`: Successful request.
* `202 Accepted`: Asynchronous job queued/started.
* `404 Not Found`: Resource or endpoint does not exist.
* `405 Method Not Allowed`: HTTP method invalid for the target path.
* `409 Conflict`: Request conflicts with current resource state (e.g. duplicate job trigger).
* `500 Internal Server Error`: Server exception during request processing.

#### Standard Error Response Body

```json
{
  "error": "Error description string",
  "status": 404
}
```
