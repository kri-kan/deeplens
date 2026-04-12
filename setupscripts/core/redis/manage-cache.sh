#!/bin/bash

# --- DeepLens Redis Manager ---
# Simple management tasks for Redis

ACTION=${1:-Ping}
DB_INDEX=${2:-0}
CONTAINER_NAME="redis"

# Colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}Redis Manager: Performing $ACTION...${NC}"

run_redis_cmd() {
    docker exec $CONTAINER_NAME redis-cli "$@"
}

case $ACTION in
    Ping)
        RES=$(run_redis_cmd ping)
        echo -e "  Response: $RES"
        if [[ "$RES" == *"PONG"* ]]; then
            echo -e "${GREEN}  [OK] Redis is alive.${NC}"
        fi
        ;;

    FlushAll)
        echo -e "${YELLOW}  Flushing ALL databases...${NC}"
        RES=$(run_redis_cmd FLUSHALL)
        echo -e "  Output: $RES"
        if [[ "$RES" == *"OK"* ]]; then
            echo -e "${GREEN}  [OK] All databases flushed.${NC}"
        fi
        ;;

    FlushDb)
        echo -e "${YELLOW}  Flushing database $DB_INDEX...${NC}"
        RES=$(run_redis_cmd -n $DB_INDEX FLUSHDB)
        echo -e "  Output: $RES"
        if [[ "$RES" == *"OK"* ]]; then
            echo -e "${GREEN}  [OK] Database $DB_INDEX flushed.${NC}"
        fi
        ;;

    *)
        echo "Usage: $0 {Ping|FlushAll|FlushDb} [db_index]"
        exit 1
        ;;
esac
