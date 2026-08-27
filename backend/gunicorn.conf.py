# backend/gunicorn.conf.py
import os

bind = os.getenv("GUNICORN_BIND", "0.0.0.0:5000")
workers = int(os.getenv("GUNICORN_WORKERS", "2"))
threads = int(os.getenv("GUNICORN_THREADS", "4"))
worker_class = os.getenv("GUNICORN_WORKER_CLASS", "gthread")
worker_tmp_dir = os.getenv("GUNICORN_WORKER_TMP_DIR", "/dev/shm")
timeout = int(os.getenv("GUNICORN_TIMEOUT", "60"))
keepalive = int(os.getenv("GUNICORN_KEEPALIVE", "5"))

# Memory management & Copy-on-Write sharing
preload_app = os.getenv("GUNICORN_PRELOAD", "true").lower() in ("true", "1", "yes")
max_requests = int(os.getenv("GUNICORN_MAX_REQUESTS", "1000"))
max_requests_jitter = int(os.getenv("GUNICORN_MAX_REQUESTS_JITTER", "100"))

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOGLEVEL", "info")
