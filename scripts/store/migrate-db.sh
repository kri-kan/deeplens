#!/usr/bin/env bash
# =============================================================================
# DeepLens Store: Database Schema Migration Runner
# Executes PostgreSQL migrations for Store carts, wishlists, products & curation.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

PG_HOST="${PGHOST:-localhost}"
PG_PORT="${PGPORT:-6432}"
PG_USER="${PGUSER:-postgres}"
PG_DB="${PGDATABASE:-deeplens_platform}"
PGPASSWORD="${PGPASSWORD:-Krikank1$}"
export PGPASSWORD

echo "================================================================="
echo "🗄️  Running DeepLens Store PostgreSQL Database Migrations"
echo "Target: ${PG_USER}@${PG_HOST}:${PG_PORT}/${PG_DB}"
echo "================================================================="

MIGRATIONS=(
  "${ROOT_DIR}/setupscripts/migrations/020_store_beta_carts_and_wishlists.sql"
  "${ROOT_DIR}/setupscripts/migrations/021_store_curation_and_admin.sql"
)

for MIGRATION_FILE in "${MIGRATIONS[@]}"; do
  if [ ! -f "${MIGRATION_FILE}" ]; then
    echo "❌ Error: Migration file ${MIGRATION_FILE} not found."
    continue
  fi

  echo "Applying: $(basename "${MIGRATION_FILE}")..."
  if docker ps | grep -q "krikanpg"; then
    docker exec -i krikanpg psql -U postgres -d deeplens_platform < "${MIGRATION_FILE}"
    echo "✅ $(basename "${MIGRATION_FILE}") applied via Docker container (krikanpg)."
  elif command -v psql &> /dev/null; then
    psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -d "${PG_DB}" -f "${MIGRATION_FILE}"
    echo "✅ $(basename "${MIGRATION_FILE}") applied via psql CLI."
  else
    echo "⚠️  Unable to apply $(basename "${MIGRATION_FILE}") automatically."
  fi
done

echo "================================================================="
echo "🎉 Store Database Migrations Complete!"
echo "================================================================="
