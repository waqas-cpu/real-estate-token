#!/usr/bin/env bash
# ============================================================
# RWA Platform Database Migration CLI
# Applies migrations from supabase/migrations/ in sequence
# ============================================================
set -euo pipefail

DB_URL="${DATABASE_URL:-postgresql://${POSTGRES_USER:-rwa_user}:${POSTGRES_PASSWORD:-rwa_secure_password}@${POSTGRES_HOST:-localhost}:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-rwa_platform}}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-./supabase/migrations}"

echo "============================================================"
echo " RWA Platform: Applying Database Migrations"
echo " Target Directory: $MIGRATIONS_DIR"
echo "============================================================"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Error: Migrations directory $MIGRATIONS_DIR does not exist!"
  exit 1
fi

# Ensure tracking table exists
psql "$DB_URL" -v ON_ERROR_STOP=1 <<-EOSQL
  CREATE TABLE IF NOT EXISTS _schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
EOSQL

APPLIED_COUNT=0
SKIPPED_COUNT=0

for sql_file in $(ls -1 "$MIGRATIONS_DIR"/*.sql | sort); do
  FILENAME=$(basename "$sql_file")
  
  # Check if already applied
  IS_APPLIED=$(psql "$DB_URL" -t -A -c "SELECT COUNT(*) FROM _schema_migrations WHERE version = '$FILENAME';")
  
  if [ "$IS_APPLIED" -eq 0 ]; then
    echo "[Migrate] Applying $FILENAME..."
    psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$sql_file"
    psql "$DB_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO _schema_migrations (version) VALUES ('$FILENAME');"
    APPLIED_COUNT=$((APPLIED_COUNT + 1))
    echo "[Migrate] Successfully applied $FILENAME"
  else
    echo "[Migrate] Skipping already applied migration: $FILENAME"
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
  fi
done

echo "============================================================"
echo " Migrations Finished: $APPLIED_COUNT applied, $SKIPPED_COUNT skipped."
echo "============================================================"
