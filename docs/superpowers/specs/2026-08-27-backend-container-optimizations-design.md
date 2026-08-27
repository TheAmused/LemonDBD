# System Design Specification: Backend Flask API Container Optimizations

**Date:** 2026-08-27  
**Project:** LemonDBD  
**Branch:** `feature/backend-container-optimizations`  

---

## 1. Overview & Objectives

Optimize the backend Flask API Docker container across runtime execution, JSON serialization, database connection pooling, memory efficiency, and scheduled job coordination without introducing breaking changes or external paid dependencies.

### Key Goals:
1. **High-Performance JSON Serialization (`orjson`)**: Replace standard CPython `json` with Rust-backed `orjson`, achieving 3x-10x faster serialization on data-heavy endpoints.
2. **Gunicorn Threaded Worker Concurrency (`gthread`)**: Switch from 4 heavy `sync` workers to `2 workers × 4 threads` on `gthread` with `/dev/shm` heartbeat tmpfs, `--preload`, and automatic request recycling.
3. **Database Connection Pool Tuning (`SQLAlchemy 2.0`)**: Configure tuned connection pooling (`pool_size=10`, `max_overflow=20`, `pool_recycle=300`, `pool_timeout=30`, `pool_pre_ping=True`).
4. **Scheduler Concurrency Deduplication**: Ensure `BackgroundScheduler` does not duplicate jobs across multiple worker processes.

---

## 2. Architecture & Components

### 2.1 ORJSONProvider (`backend/app/core/json_provider.py`)
```python
from flask.json.provider import DefaultJSONProvider
import orjson

class ORJSONProvider(DefaultJSONProvider):
    def dumps(self, obj, **kwargs):
        return orjson.dumps(
            obj,
            option=orjson.OPT_NON_STR_KEYS | orjson.OPT_SERIALIZE_NUMPY | orjson.OPT_SERIALIZE_DATACLASS
        ).decode('utf-8')

    def loads(self, s, **kwargs):
        return orjson.loads(s)
```

### 2.2 Gunicorn Configuration (`backend/gunicorn.conf.py`)
- `bind = "0.0.0.0:5000"`
- `workers = int(os.getenv("GUNICORN_WORKERS", 2))`
- `threads = int(os.getenv("GUNICORN_THREADS", 4))`
- `worker_class = "gthread"`
- `worker_tmp_dir = "/dev/shm"`
- `preload_app = True`
- `max_requests = 1000`
- `max_requests_jitter = 100`
- `timeout = 60`
- `keepalive = 5`

### 2.3 Database Engine Pool Options (`backend/app/core/config.py`)
```python
SQLALCHEMY_ENGINE_OPTIONS = {
    "pool_pre_ping": True,
    "pool_size": int(os.getenv("DB_POOL_SIZE", "10")),
    "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "20")),
    "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "300")),
    "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
}
```

---

## 3. Testing & Verification Plan
- Unit tests for `ORJSONProvider`: serialization performance, custom date/UUID support, unicode strings, edge cases.
- Unit tests for `SQLALCHEMY_ENGINE_OPTIONS` database connection pool configuration.
- Unit tests for `gunicorn.conf.py` settings and environment variable overrides.
- Docker build test with `gunicorn --check-config`.
