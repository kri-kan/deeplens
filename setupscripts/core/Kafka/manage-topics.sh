#!/bin/bash

# --- DeepLens Kafka Topic Manager ---
# Handles topic creation, deletion, and listing

ACTION=${1:-List}
TOPIC_NAME=$2
BOOTSTRAP_SERVER=${3:-"192.168.0.170:9092,192.168.0.170:9093"}
CONTAINER_NAME="kafka-prod"
PARTITIONS=1
REPLICATION_FACTOR=1

# Colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}Kafka Manager: $ACTION topic '$TOPIC_NAME'...${NC}"

run_kafka_cmd() {
    local ARGS=$1
    docker exec $CONTAINER_NAME kafka-topics --bootstrap-server $BOOTSTRAP_SERVER $ARGS
}

topic_exists() {
    local TOPIC=$1
    run_kafka_cmd "--list" | grep -qx "$TOPIC"
}

case $ACTION in
    List)
        echo -e "${YELLOW}Topics found:${NC}"
        run_kafka_cmd "--list"
        ;;

    Create)
        if topic_exists "$TOPIC_NAME"; then
            echo -e "${GREEN}  [OK] Topic already exists.${NC}"
        else
            echo -e "${YELLOW}  Creating topic '$TOPIC_NAME'...${NC}"
            run_kafka_cmd "--create --topic $TOPIC_NAME --partitions $PARTITIONS --replication-factor $REPLICATION_FACTOR"
            echo -e "${GREEN}  [OK] Topic created.${NC}"
        fi
        ;;

    Recreate)
        if topic_exists "$TOPIC_NAME"; then
            echo -e "${YELLOW}  Deleting topic '$TOPIC_NAME'...${NC}"
            run_kafka_cmd "--delete --topic $TOPIC_NAME"
            sleep 2
        fi
        echo -e "${YELLOW}  Creating topic '$TOPIC_NAME'...${NC}"
        run_kafka_cmd "--create --topic $TOPIC_NAME --partitions $PARTITIONS --replication-factor $REPLICATION_FACTOR"
        echo -e "${GREEN}  [OK] Topic recreated.${NC}"
        ;;

    *)
        echo "Usage: $0 {List|Create|Recreate} [topic_name] [bootstrap_server]"
        exit 1
        ;;
esac
