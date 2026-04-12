#!/bin/bash
# --- DeepLens Service Orchestrator (Linux) ---
# Unified stack manager for Linux environments.
 
ACTION=${1:-"status"}
SERVICE=$2
PROJECT_NAME="deeplens-stack"
 
# Colors for output
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
 
echo -e "${CYAN}--- DeepLens Service Orchestrator ---${NC}"
if [ ! -z "$SERVICE" ]; then
    echo -e "Target: $SERVICE"
fi
 
case $ACTION in
    setup-network)
        echo -e "${YELLOW}Creating unified 'deeplens-network'...${NC}"
        docker network inspect deeplens-network >/dev/null 2>&1 || \
        docker network create deeplens-network
        echo -e "${GREEN}[OK] Network verified.${NC}"
        ;;
 
    start)
        echo -e "${YELLOW}Validating network...${NC}"
        $0 setup-network > /dev/null
        
        echo -e "${YELLOW}Bringing up service(s)...${NC}"
        docker compose -p $PROJECT_NAME up -d $SERVICE
        echo -e "${GREEN}[OK] Start command issued.${NC}"
        ;;
 
    stop)
        if [ ! -z "$SERVICE" ]; then
            echo -e "${YELLOW}Stopping service '$SERVICE'...${NC}"
            docker compose -p $PROJECT_NAME stop $SERVICE
            echo -e "${GREEN}[OK] Service stopped.${NC}"
        else
            echo -e "${YELLOW}Tearing down ENTIRE stack...${NC}"
            docker compose -p $PROJECT_NAME down
            echo -e "${GREEN}[OK] Stack stopped.${NC}"
        fi
        ;;
 
    status)
        echo -e "Service Status:"
        docker compose -p $PROJECT_NAME ps $SERVICE
        ;;
 
    logs)
        docker compose -p $ProjectName logs -f --tail 100 $SERVICE
        ;;
 
    clean)
        echo -e "${YELLOW}Pruning unused docker objects...${NC}"
        docker system prune -f
        echo -e "${GREEN}[OK] Cleanup complete.${NC}"
        ;;
 
    *)
        echo -e "${RED}Usage: $0 {start|stop|status|clean|logs|setup-network} [service_name]${NC}"
        exit 1
        ;;
esac
