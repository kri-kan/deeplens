#!/bin/bash

# --- DeepLens Postgres Manager ---
# Handles database initialization, schema resets, and schema application

ACTION=${1:-Reset}
DATABASE_NAME=${2:-whatsapp_vayyari_data}
CONTAINER_NAME="krikanpg"
DB_USER="krikan"
DB_PASS="Krikank1$"
DDL_PATH="./ddl"

# Colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}Postgres Manager: Performing $ACTION on '$DATABASE_NAME'...${NC}"

run_psql_cmd() {
    local CMD=$1
    local TARGET_DB=$2
    docker exec -e PGPASSWORD=$DB_PASS $CONTAINER_NAME psql -U $DB_USER -d $TARGET_DB -c "$CMD"
}

run_psql_file() {
    local FILE_PATH=$1
    local TARGET_DB=$2
    # Copy file to container and execute
    docker cp "$DDL_PATH/$FILE_PATH" $CONTAINER_NAME:/tmp/setup.sql
    docker exec -e PGPASSWORD=$DB_PASS $CONTAINER_NAME psql -U $DB_USER -d $TARGET_DB -f /tmp/setup.sql
}

case $ACTION in
    Drop)
        echo -e "${YELLOW}  Dropping public schema...${NC}"
        run_psql_cmd "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" $DATABASE_NAME
        echo -e "${GREEN}  [OK] Schema dropped.${NC}"
        ;;

    Init)
        echo -e "${YELLOW}  Database initialized.${NC}"
        ;;

    Reset)
        # Check if DB exists
        EXISTS=$(docker exec -e PGPASSWORD=$DB_PASS $CONTAINER_NAME psql -U $DB_USER -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DATABASE_NAME'")
        
        if [ "$EXISTS" != "1" ]; then
            echo -e "${YELLOW}  Database '$DATABASE_NAME' does not exist. Creating...${NC}"
            run_psql_cmd "CREATE DATABASE \"$DATABASE_NAME\";" "postgres"
        else
            echo -e "${YELLOW}  Dropping existing schema...${NC}"
            run_psql_cmd "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" $DATABASE_NAME
        fi

        echo -e "${YELLOW}  Applying fresh schema...${NC}"
        run_psql_file "setup.sql" $DATABASE_NAME
        echo -e "${GREEN}  [OK] Database successfully reset.${NC}"
        ;;

    *)
        echo "Usage: $0 {Reset|Init|Drop} [database_name]"
        exit 1
        ;;
esac
