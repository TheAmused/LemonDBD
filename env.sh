#!/usr/bin/env bash
# env.sh - switch the active .env between development and production templates.
#
# Usage:
#   ./env.sh dev    # copy .env.development -> .env
#   ./env.sh prod   # copy .env.production  -> .env
#
# The active .env is what docker-compose.yml, up.sh, and up.ps1 all read.
# Your previous .env (if any) is backed up to .env.bak first, so switching
# back and forth never silently loses edits you made directly to .env.
set -eo pipefail

MODE="$1"
case "$MODE" in
  dev|development)
    SRC=".env.development"
    ;;
  prod|production)
    SRC=".env.production"
    ;;
  *)
    echo "Usage: $0 <dev|prod>"
    exit 1
    ;;
esac

if [ ! -f "$SRC" ]; then
  echo "Missing $SRC" >&2
  exit 1
fi

if [ -f .env ]; then
  cp .env .env.bak
  echo "Backed up existing .env -> .env.bak"
fi

cp "$SRC" .env
echo "Active .env is now $SRC"
