# backend/Dockerfile
# Stage 1: Build & Dependency Isolation
FROM python:3.14-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt
COPY requirements-ocr.txt .
# rapidocr-onnxruntime declares Requires-Python <3.13 but is pure Python and runs on 3.14
# (checked); its dependencies are installed above, hence --no-deps. The import is a build-time smoke test.
RUN pip install --no-cache-dir --user --no-deps --ignore-requires-python -r requirements-ocr.txt \
    && python -c "import rapidocr_onnxruntime"

# Stage 2: Final Runtime Container
FROM python:3.14-slim AS runner

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