#!/bin/bash

# --- DeepLens MinIO Manager ---
# Handles bucket creation and cleanup using 'mc'

ACTION=${1:-List}
BUCKET_NAME=${2:-"vayyari-assets"}
CONTAINER_NAME="minio"
MINIO_URL="http://localhost:9000"
MINIO_USER="krikan"
MINIO_PASS="Krikank1$"

# Colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}MinIO Manager: Performing $ACTION on bucket '$BUCKET_NAME'...${NC}"

run_mc_cmd() {
    local CMD=$1
    local SETUP_ALIAS="mc alias set local $MINIO_URL $MINIO_USER $MINIO_PASS > /dev/null 2>&1"
    docker exec $CONTAINER_NAME sh -c "$SETUP_ALIAS && mc $CMD"
}

case $ACTION in
    List)
        echo -e "${YELLOW}  Listing objects...${NC}"
        run_mc_cmd "ls --recursive local/$BUCKET_NAME"
        ;;

    Clean)
        echo -e "${YELLOW}  Recreating bucket (Nuke & Pave)...${NC}"
        run_mc_cmd "rb --force local/$BUCKET_NAME"
        run_mc_cmd "mb local/$BUCKET_NAME"
        echo -e "${GREEN}  [OK] Bucket cleaned.${NC}"
        ;;

    *)
        echo "Usage: $0 {List|Clean} [bucket_name]"
        exit 1
        ;;
esac
