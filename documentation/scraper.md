# Technical Specification: Scraper Engine & Ingestion Pipeline

The LemonDBD Scraper Engine (`ScraperService`) is an automated, thread-safe ingestion pipeline engineered to extract, normalize, and store Survivor and Killer perk metadata and high-resolution icon assets from the [Dead by Daylight Fandom Wiki](https://deadbydaylight.fandom.com/wiki/Perks).

This document provides a technical specification of the scraper's architecture, anti-bot evasion strategies, DOM parsing algorithms, asynchronous download pipeline, and state management mechanisms.

---

## 1. Engine Overview & Data Flow

```text
                               +--------------------------------------------+
                               |     Dead by Daylight Fandom Wiki Page      |
                               +--------------------------------------------+
                                                     |
                                                     | HTTP GET (TLS Chrome 120 Impersonation)
                                                     v
                               +--------------------------------------------+
                               |              ScraperService                |
                               +--------------------------------------------+
                                                     |
                                 +-------------------+-------------------+
                                 |                                       |
                                 v                                       v
                   +---------------------------+           +---------------------------+
                   |  HTML Parsing & DOM Map   |           |  Icon Download Pipeline   |
                   |     (BeautifulSoup4)      |           | (AsyncSession + Semaphore)|
                   +---------------------------+           +---------------------------+
                                 |                                       |
                                 v                                       v
                   +---------------------------+           +---------------------------+
                   | Markdown Formatting &     |           | Organized Disk Hierarchy  |
                   | Data Normalization        |           | (app/static/icons/*/*.png)|
                   +---------------------------+           +---------------------------+
                                 |                                       |
                                 +-------------------+-------------------+
                                                     |
                                                     v
                               +--------------------------------------------+
                               |       JSON Storage & Memory Reload         |
                               |    (data/perks.json & PerkService)         |
                               +--------------------------------------------+
```

---

## 2. Anti-Bot Defense & TLS Impersonation

### The Challenge: Cloudflare 403 Forbidden

The target Fandom wiki sits behind Cloudflare's Web Application Firewall (WAF). Cloudflare inspects incoming HTTP requests beyond standard `User-Agent` headers. Standard Python HTTP clients (`requests`, `urllib`, `httpx`, `aiohttp`) open TCP/TLS connections using standard OpenSSL signatures. Cloudflare identifies these TLS fingerprints (JA3/JA4 signatures, Cipher Suites order, HTTP/2 SETTINGS frames) and blocks requests instantly with a `403 Forbidden` response.

### The Solution: `curl_cffi` Socket-Level Impersonation

Instead of introducing memory-heavy browser automation engines (such as Playwright or Selenium), LemonDBD uses **`curl_cffi`**, a Python binding for `curl-impersonate`.

`curl_cffi` negotiates the TLS handshake directly at the C layer using the exact TLS extension order, elliptic curves, signature algorithms, and HTTP/2 frame parameters of a modern web browser.

```python
# Engine Configuration
TARGET_URL = "https://deadbydaylight.fandom.com/wiki/Perks"
IMPERSONATE_BROWSER = "chrome120"
REQUEST_TIMEOUT = 25
```

By specifying `impersonate="chrome120"`, `curl_cffi` bypasses Cloudflare's TLS fingerprinting checks without executing JavaScript or rendering full DOM trees.

---

## 3. DOM Parsing & Data Normalization

The parsing layer uses `BeautifulSoup4` to scan HTML structure and extract structured records.

### 3.1 Category Context Tracking

The wiki page hosts both Survivor and Killer perks on a single page. Because table markup is identical for both roles, the parser maintains contextual state by tracking heading elements (`<h1>` through `<h4>`) prior to each table:

```python
content_area = soup.find("div", class_="mw-parser-output") or soup

for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
    if element.name in ["h1", "h2", "h3", "h4"]:
        header_text = element.get_text().lower()
        if "survivor" in header_text:
            current_category = "Survivor"
        elif "killer" in header_text:
            current_category = "Killer"
            
    elif element.name == "table" and "wikitable" in element.get("class", []):
        if not current_category:
            continue  # Ignore tables before category header context is set
        # Process table rows...
```

### 3.2 Table Schema Extraction

Each perk row (`<tr>`) within a `.wikitable` is mapped according to column index:

| Column | Content | Target Entity |
| :--- | :--- | :--- |
| **0** | `<img>` tag | Icon source URL (`icon_url`) |
| **1** | Link or text | Perk Title (`name`) |
| **2** | Formatted HTML | Detailed Description (`description`) |
| **3** | Text | Character Owner / `"General"` (`character`) |

### 3.3 HTML to Markdown Conversion

To preserve game mechanics readability (such as bolded percentage numbers and bulleted conditions) while stripping noisy HTML markup, description cells pass through a formatting pipeline:

```python
@staticmethod
def format_description(desc_cell: Tag) -> str:
    if not desc_cell:
        return ""
    cell_copy = BeautifulSoup(str(desc_cell), "html.parser")
    
    # 1. Preserve bolding
    for bold in cell_copy.find_all(["b", "strong"]):
        bold.replace_with(f"**{bold.get_text().strip()}**")
        
    # 2. Preserve italics
    for italic in cell_copy.find_all(["i", "em"]):
        italic.replace_with(f"*{italic.get_text().strip()}*")
        
    # 3. Convert list items to markdown bullets
    for li in cell_copy.find_all("li"):
        li.replace_with(f"\n* {li.get_text().strip()}")
        
    # 4. Convert line breaks
    for br in cell_copy.find_all("br"):
        br.replace_with("\n")
        
    lines = [line.strip() for line in cell_copy.get_text().splitlines()]
    return "\n".join(line for line in lines if line)
```

### 3.4 Filename Sanitization & High-Resolution Icon Extraction

Fandom CDN images are served with lazy-loading parameters and downscaling path segments (e.g., `/scale-to-width-down/256`). The engine normalizes these URLs to extract raw, uncompressed source images:

```python
@staticmethod
def extract_high_res_icon_url(img_tag: Optional[Tag]) -> str:
    if not img_tag:
        return ""
    raw_url = img_tag.get("data-src") or img_tag.get("src") or ""
    if not raw_url:
        return ""
        
    # Strip Fandom CDN scaling segments
    high_res_url = re.sub(r"/scale-to-width-down/\d+", "", raw_url)
    
    # Normalize revision query parameters
    if "/revision/latest" in high_res_url:
        high_res_url = high_res_url.split("/revision/latest")[0] + "/revision/latest"
        
    return high_res_url
```

Perk and character names are sanitized to prevent filesystem collisions and path traversal issues:

```python
@staticmethod
def sanitize_filename(name: str) -> str:
    clean_str = name.lower().strip()
    clean_str = re.sub(r"[\s\-/]+", "_", clean_str)
    clean_str = re.sub(r'[\\/*?:"<>|]', "", clean_str)
    clean_str = re.sub(r"_+", "_", clean_str)
    return clean_str.strip("_")
```

---

## 4. Asynchronous Asset Download Engine

Once perk metadata is extracted, the scraper switches to asynchronous image downloading using `curl_cffi.requests.AsyncSession` and Python's `asyncio` event loop.

### Concurrency Control & Rate Limiting

To prevent CDN rate limiting (`HTTP 429 Too Many Requests`) or TCP socket exhaustion, downloads are bounded using an `asyncio.Semaphore`:

```python
MAX_CONCURRENT_DOWNLOADS = 10

async def _download_icon(
    self,
    client: AsyncSession,
    semaphore: asyncio.Semaphore,
    icon_url: str,
    relative_path: str,
) -> None:
    if not icon_url:
        return

    destination = self.static_dir / relative_path
    
    # Skip download if asset already exists on disk
    if destination.exists():
        with self._lock:
            self._status["progress"] += 1
        return

    destination.parent.mkdir(parents=True, exist_ok=True)

    async with semaphore:
        try:
            response = await client.get(icon_url, timeout=self.REQUEST_TIMEOUT)
            response.raise_for_status()
            destination.write_bytes(response.content)
        except Exception as err:
            logger.error(f"Download failed [{icon_url}]: {err}")
        finally:
            with self._lock:
                self._status["progress"] += 1
```

---

## 5. Directory & File System Layout

Downloaded icon assets are organized into role- and character-specific subdirectories under `backend/app/static/`:

```text
backend/
├── data/
│   └── perks.json                      # Full extracted JSON metadata
└── app/
    └── static/
        └── icons/
            ├── killers/
            │   ├── General/
            │   │   ├── bitter_murmur.png
            │   │   └── sloppy_butcher.png
            │   ├── The Trapper/
            │   │   ├── agitation.png
            │   │   └── brutal_strength.png
            │   └── The Huntress/
            │       └── beast_of_prey.png
            └── survivors/
                ├── General/
                │   ├── deja_vu.png
                │   └── resilience.png
                └── Meg Thomas/
                    ├── adrenaline.png
                    └── sprint_burst.png
```

---

## 6. Thread-Safe State Management & API Integration

### 6.1 State Schema

The scraper exposes live operational metrics using class-level state guarded by a reentrant thread lock (`threading.Lock`):

```python
_lock = threading.Lock()
_status = {
    "is_running": False,
    "progress": 0,
    "total": 0,
    "current_step": "idle",  # 'fetching_wiki' | 'parsing_perks' | 'downloading_icons' | 'completed' | 'failed'
    "last_run": None,        # ISO 8601 Timestamp
    "error": None,
}
```

### 6.2 Non-Blocking Background Execution

When triggered via the REST API (`POST /api/v1/scrape`), the route spawns a background thread. This keeps Gunicorn workers available to handle incoming HTTP requests without blocking on long IO operations:

```python
def _run_background_scrape():
    scraper = ScraperService()
    scraper.run_sync_pipeline()
    perk_service.reload_data()  # Flush and reload in-memory API cache

@perks_bp.route("/api/v1/scrape", methods=["POST"])
def trigger_scrape():
    status = ScraperService.get_status()
    if status["is_running"]:
        return jsonify({"message": "Scrape task is already in progress", "status": status}), 409

    thread = threading.Thread(target=_run_background_scrape, daemon=True)
    thread.start()

    return jsonify({"message": "Scrape task initiated successfully in background"}), 202
```

---

## 7. Error Handling & Edge Case Protection

| Edge Case / Failure Scenario | Prevention / Resolution Mechanism |
| :--- | :--- |
| **Cloudflare WAF Block (`403 Forbidden`)** | `curl_cffi` TLS browser fingerprinting (`chrome120`). |
| **Gunicorn Worker Timeout** | Long-running execution pushed to daemon thread (`threading.Thread`). |
| **Wiki Structure Restructuring** | Header context checking falls back to scanning `.wikitable` elements safely. |
| **Missing Image Tags / Lazy Loading** | Dual source checking (`data-src` attribute fallback to `src`). |
| **Missing Target Directories** | Automatic `pathlib.Path.mkdir(parents=True, exist_ok=True)` invocation before write. |
| **Repeated Execution Overhead** | Disk existence checks (`destination.exists()`) skip already cached PNG assets. |
