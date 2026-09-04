#!/usr/bin/env bash
set -e

echo "[init-postgres] Initializing RWA Real Estate Tokenization Database..."

# Ensure required extensions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOSQL

echo "[init-postgres] Executing schema migrations in sequential order..."

MIGRATIONS_DIR="/docker-entrypoint-initdb.d/migrations"

if [ -d "$MIGRATIONS_DIR" ]; then
    for sql_file in $(ls -1 "$MIGRATIONS_DIR"/*.sql | sort); do
        echo "[init-postgres] Applying $(basename "$sql_file")..."
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$sql_file"
    done
    echo "[init-postgres] All migrations successfully applied!"
else
    echo "[init-postgres] No migrations directory found at $MIGRATIONS_DIR"
fi
