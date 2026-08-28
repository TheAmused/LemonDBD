#!/bin/sh
set -e

echo "=================================================="
echo " [Gate 1] Running Backend Unit Tests (SQLite Memory) "
echo "=================================================="

# Run pytest strictly on the unit tests
pytest tests/unit -v --tb=short

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -ne 0 ]; then
    echo "❌ FATAL: Backend unit tests failed! Aborting startup." >&2
    exit 1
fi

echo "✅ Unit tests passed. Starting Gunicorn..."
exec "$@"