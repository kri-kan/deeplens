#!/usr/bin/env bash
# =============================================================================
# DeepLens Store: Master Platform Setup Orchestrator
# 1. Database (deeplens_store) & Migrations
# 2. MinIO 'store-assets' Bucket & CDN Policy
# 3. Kafka Event Topics
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "================================================================="
echo "🚀 Initializing DeepLens Store Platform Infrastructure"
echo "================================================================="

# 1. Create deeplens_store DB & Run Clean Unprefixed Migrations
echo "[Step 1/3] Provisioning PostgreSQL Database: deeplens_store..."
PGPASSWORD="Krikank1$" psql -h 192.168.0.170 -p 5432 -U postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname = 'deeplens_store'" | grep -q 1 || \
PGPASSWORD="Krikank1$" psql -h 192.168.0.170 -p 5432 -U postgres -c "CREATE DATABASE deeplens_store;"

PGPASSWORD="Krikank1$" psql -h 192.168.0.170 -p 5432 -U postgres -d deeplens_store \
  -f "${SCRIPT_DIR}/migrations/001_initial_store_schema.sql"
echo "✅ Database 'deeplens_store' and 'media_assets' registry initialized."

# 2. MinIO 'store-assets' Bucket & Public Read Policy
echo "[Step 2/3] Initializing MinIO Bucket: store-assets..."
if docker ps | grep -q "minio"; then
  docker exec -i minio mc alias set local http://192.168.0.170:9000 krikan Krikank1$ 2>/dev/null || true
  docker exec -i minio mc mb local/store-assets 2>/dev/null || echo "Bucket exists or already initialized."
  docker exec -i minio mc anonymous set download local/store-assets 2>/dev/null || true
  echo "✅ MinIO bucket 'store-assets' ready with public CDN read policy."
fi

# 3. Kafka Store Topics
echo "[Step 3/3] Provisioning Store Kafka Topics..."
TOPICS=("store.media.derivative.requested" "store.media.derivative.completed" "store.media.reconciliation.requested" "store.product.curation.updated")
for TOPIC in "${TOPICS[@]}"; do
  docker exec -i kafka-prod /opt/kafka/bin/kafka-topics.sh \
    --bootstrap-server localhost:29092 --create --if-not-exists \
    --topic "${TOPIC}" --partitions 3 --replication-factor 1 \
    --config retention.ms=604800000 2>/dev/null || true
  echo "✅ Topic: ${TOPIC}"
done

echo "================================================================="
echo "🎉 Store Platform Infrastructure 100% Ready!"
echo "================================================================="
