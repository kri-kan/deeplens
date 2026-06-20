#!/bin/bash

# Navigate to the project root directory
SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR/.." || exit 1

ENV_FILE="setupscripts/.env"
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
fi

DB_HOST=${INFRA_IP:-192.168.0.170}
DB_USER="postgres"
DB_PASS=${PGADMIN_DEFAULT_PASSWORD:-Krikank1$}

PLATFORM_DB="deeplens_platform"
PLATFORM_OUT="setupscripts/application/deeplens-core/deeplens_platform.sql"

IDENTITY_DB="nextgen_identity"
IDENTITY_OUT="setupscripts/application/identity/nextgen_identity.sql"

echo "Starting database backup from $DB_HOST using Postgres 18 Docker image..."

# Backup deeplens_platform
echo "Backing up $PLATFORM_DB..."
docker run --rm -e PGPASSWORD="$DB_PASS" postgres:18 \
    pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$PLATFORM_DB" > "$PLATFORM_OUT"

if [ $? -eq 0 ]; then
    echo "✔ Successfully backed up $PLATFORM_DB to $PLATFORM_OUT ($(du -h $PLATFORM_OUT | cut -f1))"
else
    echo "❌ Failed to backup $PLATFORM_DB"
fi

# Backup nextgen_identity
echo "Backing up $IDENTITY_DB..."
docker run --rm -e PGPASSWORD="$DB_PASS" postgres:18 \
    pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$IDENTITY_DB" > "$IDENTITY_OUT"

if [ $? -eq 0 ]; then
    echo "✔ Successfully backed up $IDENTITY_DB to $IDENTITY_OUT ($(du -h $IDENTITY_OUT | cut -f1))"
else
    echo "❌ Failed to backup $IDENTITY_DB"
fi

echo "Backup process completed."
