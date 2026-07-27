# Production Deployment & DevOps Guide

This document outlines the end-to-end production deployment, container orchestration, reverse proxy configuration, security hardening, and operational maintenance workflows for **LemonDBD**.

---

## Table of Contents

1. [Infrastructure Requirements](#1-infrastructure-requirements)
2. [Production Architecture](#2-production-architecture)
3. [Deployment Strategies](#3-deployment-strategies)
   * [Option A: Docker Compose Deployment (Recommended)](#option-a-docker-compose-deployment-recommended)
   * [Option B: Systemd Native Deployment (VPS Without Containers)](#option-b-systemd-native-deployment-vps-without-containers)
4. [Reverse Proxy & SSL Termination](#4-reverse-proxy--ssl-termination)
   * [Nginx Configuration](#nginx-configuration)
   * [Caddy Configuration](#caddy-configuration)
5. [Security Hardening & Best Practices](#5-security-hardening--best-practices)
6. [Persistent Storage & Data Management](#6-persistent-storage--data-management)
7. [Health Checks & Observability](#7-health-checks--observability)
8. [Automated CI/CD & Maintenance](#8-automated-cicd--maintenance)
9. [Troubleshooting Matrix](#9-troubleshooting-matrix)

---

## 1. Infrastructure Requirements

### Minimum Hardware Specifications

* **CPU**: 1 vCPU (2 vCPUs recommended for concurrent image processing during initial sync)
* **RAM**: 1 GB minimum (2 GB recommended)
* **Disk Space**: 5 GB available SSD storage (for operating system, Docker layers, static PNG icons, and JSON database)
* **Network**: Outbound HTTP/HTTPS access to `deadbydaylight.fandom.com` and Fandom static CDN endpoints (`static.wikia.nocookie.net`).

### Software Prerequisites

* **Operating System**: Linux (Ubuntu 22.04 LTS / 24.04 LTS or Debian 12 recommended)
* **Docker Engine**: Version `24.0.0+`
* **Docker Compose**: Version `v2.20.0+`
* **Reverse Proxy**: Nginx `1.24+` or Caddy `2.7+` (with Let's Encrypt / Certbot TLS support)

---

## 2. Production Architecture

In production, LemonDBD operates behind a reverse proxy (Nginx or Caddy) that handles TLS termination, HTTP/2 orchestration, static file caching, and request rate-limiting before forwarding requests to the container stack:

```text
                                [ Internet Clients ]
                                         │
                                 HTTPS (Port 443)
                                         │
                                         ▼
                               [ Nginx / Caddy Proxy ]
                               (TLS Termination & SSL)
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │                                           │
         HTTP (Port 3000)                           HTTP (Port 5000)
                   │                                           │
                   ▼                                           ▼
      ┌─────────────────────────┐                 ┌─────────────────────────┐
      │   dbd_frontend Container  │                 │   dbd_backend Container │
      │   (Next.js Standalone)  │                 │    (Flask / Gunicorn)   │
      └─────────────────────────┘                 └─────────────────────────┘
                                                               │
                                                    Local Storage Volumes
                                                    ├── /app/data/perks.json
                                                    └── /app/app/static/icons/
```

---

## 3. Deployment Strategies

### Option A: Docker Compose Deployment (Recommended)

#### Step 1: Clone Repository & Setup Structure

```bash
git clone https://github.com/your-username/LemonDBD.git /opt/lemondbd
cd /opt/lemondbd
```

#### Step 2: Configure Environment Files

Create a `.env` file in the project root:

```ini
# Production Environment Variables
FLASK_ENV=production
CORS_ORIGINS=https://lemondbd.yourdomain.com
NEXT_PUBLIC_API_URL=https://lemondbd.yourdomain.com
PORT=3000
GUNICORN_WORKERS=4
GUNICORN_TIMEOUT=120
```

#### Step 3: Configure `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: dbd_backend
    restart: unless-stopped
    ports:
      - "127.0.0.1:5000:5000"
    volumes:
      - ./backend/data:/app/data
      - ./backend/app/static/icons:/app/app/static/icons
    environment:
      - FLASK_ENV=${FLASK_ENV:-production}
      - CORS_ORIGINS=${CORS_ORIGINS:-*}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/v1/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s
    networks:
      - dbd_internal

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:5000}
    container_name: dbd_frontend
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:5000}
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - dbd_internal

networks:
  dbd_internal:
    driver: bridge
```

#### Step 4: Fix Host Volume Permissions

Ensure the directory structure exists on the host with non-root ownership matching container UID `1001`:

```bash
mkdir -p ./backend/data ./backend/app/static/icons
sudo chown -R 1001:1001 ./backend/data ./backend/app/static/icons
sudo chmod -R 755 ./backend/data ./backend/app/static/icons
```

#### Step 5: Launch Stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

### Option B: Systemd Native Deployment (VPS Without Containers)

If deploying directly on a bare Linux virtual server without Docker:

#### 1. Backend Systemd Service (`/etc/systemd/system/lemondbd-backend.service`)

```ini
[Unit]
Description=LemonDBD Flask Gunicorn Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/lemondbd/backend
Environment="PATH=/opt/lemondbd/backend/venv/bin"
Environment="FLASK_ENV=production"
Environment="CORS_ORIGINS=https://lemondbd.yourdomain.com"
ExecStart=/opt/lemondbd/backend/venv/bin/gunicorn --workers 4 --bind 127.0.0.1:5000 run:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### 2. Frontend Systemd Service (`/etc/systemd/system/lemondbd-frontend.service`)

```ini
[Unit]
Description=LemonDBD Next.js Standalone Service
After=network.target lemondbd-backend.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/lemondbd/frontend
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="NEXT_PUBLIC_API_URL=https://lemondbd.yourdomain.com"
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start services:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lemondbd-backend lemondbd-frontend
```

---

## 4. Reverse Proxy & SSL Termination

To expose the application safely over HTTPS, configure Nginx or Caddy.

### Nginx Configuration

Create `/etc/nginx/sites-available/lemondbd.conf`:

```nginx
# Rate limiting zone for API requests
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    listen 80;
    server_name lemondbd.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lemondbd.yourdomain.com;

    # SSL Certs (Managed by Certbot / Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/lemondbd.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lemondbd.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;

    # Static Icon Assets (Served directly or proxied to backend with aggressive caching)
    location /static/icons/ {
        proxy_pass http://127.0.0.1:5000/static/icons/;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Backend Flask API Proxied Routes
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend Next.js Application Routes
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site & obtain SSL certificate:

```bash
sudo ln -s /etc/nginx/sites-available/lemondbd.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d lemondbd.yourdomain.com
```

---

### Caddy Configuration

If using Caddy, create `/etc/caddy/Caddyfile`:

```caddyfile
lemondbd.yourdomain.com {
    encode gzip zstd

    # Cache static perk icons
    @icons path /static/icons/*
    handle @icons {
        reverse_proxy 127.0.0.1:5000
        header Cache-Control "public, max-age=2592000"
    }

    # Proxy REST API requests
    @api path /api/*
    handle @api {
        reverse_proxy 127.0.0.1:5000
    }

    # Proxy Next.js frontend requests
    handle {
        reverse_proxy 127.0.0.1:3000
    }
}
```

---

## 5. Security Hardening & Best Practices

1. **Non-Root Runtime Environments**:
   Both Dockerfiles execute under dedicated unprivileged non-root service accounts (`appuser` UID `1001` in Python; `nextjs` UID `1001` in Node). Never strip or bypass `USER appuser` or `USER nextjs` instructions.

2. **Strict CORS Scoping**:
   Avoid using `CORS_ORIGINS=*` in production environments. Set `CORS_ORIGINS` explicitly to your public domain name in `.env` (e.g., `https://lemondbd.yourdomain.com`).

3. **Internal Interface Binding**:
   Container ports inside `docker-compose.prod.yml` bind strictly to `127.0.0.1:5000` and `127.0.0.1:3000`. This prevents external actors from bypassing reverse proxy rules or rate limiters.

4. **Cloudflare Impersonation Rate Compliance**:
   The embedded `ScraperService` uses `asyncio.Semaphore(10)` to cap outgoing concurrent asset downloads. Do not increase this parameter beyond `15` to avoid trigger IP bans or 429 rate limit errors from Fandom's CDN network.

---

## 6. Persistent Storage & Data Management

LemonDBD stores metadata and media assets in local disk directories mounted into the backend container:

```text
/opt/lemondbd/backend/
├── data/
│   └── perks.json               <-- Extracted JSON Perks Database
└── app/static/icons/
    ├── killers/                 <-- Killer Icon Assets grouped by Killer
    └── survivors/               <-- Survivor Icon Assets grouped by Survivor
```

### Manual Backup Workflow

To backup your current perk database and downloaded icon collection:

```bash
# Create timestamped backup archive
tar -czvf lemondbd_backup_$(date +%Y%m%d).tar.gz \
  /opt/lemondbd/backend/data/perks.json \
  /opt/lemondbd/backend/app/static/icons
```

### Manual Backup Restoration

```bash
tar -xzvf lemondbd_backup_YYYYMMDD.tar.gz -C /
docker compose -f docker-compose.prod.yml restart backend
```

---

## 7. Health Checks & Observability

### Endpoint Health Auditing

The backend service exposes an isolated health monitoring route:

```bash
curl -i http://localhost:5000/api/v1/health
```

Expected HTTP Response (`200 OK`):

```json
{
  "service": "dbd-backend-api",
  "status": "healthy"
}
```

### Log Inspection Commands

Monitor real-time application logs via Docker Compose:

```bash
# Stream combined logs
docker compose -f docker-compose.prod.yml logs -f --tail=100

# Stream backend API & scraper activity
docker compose -f docker-compose.prod.yml logs -f backend

# Stream frontend server logs
docker compose -f docker-compose.prod.yml logs -f frontend
```

---

## 8. Automated CI/CD & Maintenance

### Automated GitHub Actions Deploy Pipeline (`.github/workflows/deploy.yml`)

```yaml
name: Production Deployment Pipeline

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Execute Remote SSH Deploy Commands
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.PROD_SERVER_HOST }}
          username: ${{ secrets.PROD_SERVER_USER }}
          key: ${{ secrets.PROD_SSH_PRIVATE_KEY }}
          script: |
            cd /opt/lemondbd
            git pull origin main
            docker compose -f docker-compose.prod.yml up -d --build
            docker image prune -f
```

### Periodic Automated Re-Sync Job (Crontab)

To keep perk data updated with game balance patches, schedule an automated sync job via host crontab:

```bash
# Open system crontab editor
crontab -e

# Add cron rule to trigger backend scrape task every Sunday at midnight
0 0 * * 0 curl -X POST http://localhost:5000/api/v1/scrape >> /var/log/lemondbd_cron.log 2>&1
```

---

## 9. Troubleshooting Matrix

| Symptom / Error | Root Cause | Resolution Strategy |
| --- | --- | --- |
| `HTTP 403 Forbidden` on scrape trigger | Cloudflare blocked Python TLS fingerprint | Ensure `curl_cffi` is installed with `impersonate="chrome120"` specified in `ScraperService`. |
| `PermissionDenied: [Errno 13]` when downloading icons | Host volume owned by `root` instead of container UID `1001` | Execute `sudo chown -R 1001:1001 ./backend/data ./backend/app/static/icons` on the host. |
| Icons render as broken images on Frontend | `NEXT_PUBLIC_API_URL` misconfigured or missing CORS headers | Confirm `NEXT_PUBLIC_API_URL` points to public backend URL and `CORS_ORIGINS` includes frontend domain. |
| Scraper triggers multiple times or locks up | Race condition / concurrent scraping jobs | Check `/api/v1/scrape/status`. The service utilizes a thread lock to prevent concurrent runs. |
| Next.js build fails during `docker compose` | Node memory limit exhausted during Turbopack compile | Add `ENV NODE_OPTIONS="--max-old-space-size=2048"` to `frontend/Dockerfile`. |