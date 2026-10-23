# backend/Dockerfile
# Stage 1: Build & Dependency Isolation
# Debian release pinned too (trixie), so a rebuild never silently switches the OS under the app.
FROM python:3.14-slim-trixie AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Exact versions with hashes (requirements.lock is generated from requirements.txt): every build
# installs the same, reviewed packages, and a tampered or swapped file on PyPI fails the build.
COPY requirements.lock .
RUN pip install --no-cache-dir --user --require-hashes -r requirements.lock
COPY requirements-ocr.txt .
# rapidocr-onnxruntime declares Requires-Python <3.13 but is pure Python and runs on 3.14
# (checked); its dependencies are installed above, hence --no-deps. The import is a build-time smoke test.
RUN pip install --no-cache-dir --user --no-deps --ignore-requires-python --require-hashes -r requirements-ocr.txt \
    && python -c "import rapidocr_onnxruntime"

# Stage 2: Final Runtime Container
FROM python:3.14-slim-trixie AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PATH="/home/appuser/.local/bin:${PATH}"

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1001 appuser

COPY --from=builder /root/.local /home/appuser/.local
COPY --chown=appuser:appuser . .

RUN mkdir -p /app/data /app/app/static/icons && chown -R appuser:appuser /app
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

USER appuser

EXPOSE 5000

# Applies pending Alembic migrations on every container start, then execs
# the real command below (or whatever `docker compose run` overrides it with).
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "-c", "gunicorn.conf.py", "run:app"]