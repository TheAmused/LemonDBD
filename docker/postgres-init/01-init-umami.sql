-- docker/postgres-init/01-init-umami.sql
-- 01-init-umami.sql
-- Automatically executed by the official PostgreSQL container on first startup.
-- Ensures the dedicated 'umami' database exists for Umami analytics.

SELECT 'CREATE DATABASE umami'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'umami')\gexec

