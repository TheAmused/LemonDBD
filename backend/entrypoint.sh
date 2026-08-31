#!/bin/sh
# backend/entrypoint.sh
#
# Runs on every container start (docker-compose up, a bare `docker run`, or a
# one-off `docker compose run backend ...`): syncs the database schema before
# handing off to the real command. See scripts/sync_db_schema.py for why this
# is a stamp-or-upgrade decision rather than a plain `flask db upgrade` --
# this app's schema was originally built via db.create_all(), so blindly
# replaying the full Alembic history against a fresh or pre-Alembic database
# fails (columns/tables that create_all() already made "already exist").
set -e

export FLASK_APP="${FLASK_APP:-run.py}"

echo "[entrypoint] Syncing database schema..."

attempt=1
max_attempts=10
until python3 scripts/sync_db_schema.py; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "[entrypoint] database schema sync failed after ${max_attempts} attempts -- giving up." >&2
    exit 1
  fi
  echo "[entrypoint] schema sync attempt ${attempt} failed (database not ready yet?), retrying in 3s..."
  attempt=$((attempt + 1))
  sleep 3
done

echo "[entrypoint] Database schema is up to date."
echo "[entrypoint] Starting: $*"
exec "$@"
