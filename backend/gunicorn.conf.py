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


def post_fork(server, worker):
    """With preload_app=True, create_app() (and the SQLAlchemy engine/pool it
    builds) runs once in the master process *before* gunicorn forks the
    worker processes. Every forked worker then inherits that same engine
    object -- including any DB connections it had already opened pre-fork --
    via copy-on-write. Multiple worker *processes* end up sharing the same
    underlying TCP socket to Postgres, and as soon as two of them try to use
    "their" connection at the same time the wire protocol gets scrambled:
    "server closed the connection unexpectedly", "consuming input failed",
    and psycopg's "connection in transaction status INTRANS" pre-ping
    failure are all symptoms of this, and it explains why unrelated worker
    *processes* were seen failing at the same instant -- they weren't
    unrelated, they were fighting over an inherited connection.

    The fix (straight from SQLAlchemy's own docs on pooling with os.fork()):
    dispose of the inherited pool right after each fork, before the worker
    serves any request, so every worker lazily builds its own fresh
    connections instead of reusing the master's. close=False avoids
    physically closing the inherited sockets (which could yank a connection
    out from under a sibling worker or the master); it just stops this
    worker's pool from handing them out again.
    """
    try:
        from app.core.extensions import db
        from run import app as flask_app

        with flask_app.app_context():
            db.engine.dispose(close=False)
    except Exception:
        pass
